/**
 * Homologação do Pix do Mercado Pago com a CONTA DE TESTE do lojista (N2). NÃO roda no CI e não usa dinheiro real.
 *
 * Sobe uma API local descartável (PGlite em memória, rotas /dev, cobrança desativada) com o cliente REAL da Orders API,
 * conecta uma loja nova com o Access Token de teste, cria uma cobrança Pix com `payer.first_name = "APRO"` (a conta de
 * teste aprova sozinha), acompanha só pela nossa API (caminho da conciliação, sem webhook) até `paga`, sincroniza a
 * venda com esse pagamento e confere a venda gravada com provedor `mercadopago` e a cobrança vinculada.
 *
 * Uso (PowerShell):  $env:MP_TESTE_ACCESS_TOKEN = "<token de teste>"; node --import tsx scripts/homologar-mercadopago-pix.mts
 * Opcional: PDV_MP_PAYER_EMAIL (padrão: o e-mail de exemplo da documentação, test_payer@example.com),
 *           MP_TESTE_ESPERA_MS (padrão 300000) e MP_TESTE_VALOR_CENTAVOS (padrão 100 = R$ 1,00, só simbólico na conta de teste).
 *
 * O token nunca é impresso nem gravado em claro; a evidência em builds/ não leva token, segredo nem QR.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { criarBillingDesativado } from '../apps/api/src/billing';
import { abrirPglite } from '../apps/api/src/db/conexao';
import { cobrancasPagamento, eventosCobrancaPagamento, pagamentosVenda } from '../apps/api/src/db/schema';
import { criarCifradorPagamentos } from '../apps/api/src/pagamentos/cifrador';
import { criarProvedorMercadoPago } from '../apps/api/src/pagamentos/mercadoPago';
import { RelogioDeDesenvolvimento } from '../apps/api/src/relogio-dev';
import { criarApp } from '../apps/api/src/servidor';

const token = process.env.MP_TESTE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('ERRO: defina MP_TESTE_ACCESS_TOKEN com o Access Token de TESTE da aplicação do Mercado Pago (Suas integrações > Credenciais de teste). Nada foi executado.');
  process.exit(2);
}
if (process.env.NODE_ENV === 'production') {
  console.error('ERRO: esta homologação não roda com NODE_ENV=production.');
  process.exit(2);
}

const ESPERA_MS = Number(process.env.MP_TESTE_ESPERA_MS ?? 300_000);
const VALOR = Number(process.env.MP_TESTE_VALOR_CENTAVOS ?? 100);
const PAGADOR = process.env.PDV_MP_PAYER_EMAIL?.trim() || 'test_payer@example.com';
const inicio = new Date();
const etapas: { etapa: string; resultado: string; em: string }[] = [];
const registrar = (etapa: string, resultado: string) => {
  etapas.push({ etapa, resultado, em: new Date().toISOString() });
  console.log(`${resultado === 'ok' ? 'PASS' : 'INFO'} ${etapa}${resultado === 'ok' ? '' : `: ${resultado}`}`);
};

const conexao = await abrirPglite();
const app = await criarApp({
  db: conexao.db, relogio: new RelogioDeDesenvolvimento(), billing: criarBillingDesativado(), cobrancaDesativada: true, fontesEan: [], logger: false,
  emissaoCodigo: { modo: 'desenvolvimento' },
  pagamentos: {
    cifrador: criarCifradorPagamentos(randomBytes(32).toString('base64')),
    mercadoPago: criarProvedorMercadoPago(),
    pagadorEmail: PAGADOR,
    pagadorPrimeiroNome: 'APRO',
  },
});
await app.listen({ port: 0, host: '127.0.0.1' });
const endereco = app.server.address();
if (!endereco || typeof endereco === 'string') throw new Error('Porta indisponível.');
const base = `http://127.0.0.1:${endereco.port}`;

let sessao = '';
async function api(metodo: string, caminho: string, corpo?: unknown): Promise<{ status: number; corpo: any }> {
  const res = await fetch(base + caminho, {
    method: metodo,
    headers: { ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }), ...(sessao ? { Authorization: `Bearer ${sessao}` } : {}) },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });
  const texto = await res.text();
  return { status: res.status, corpo: texto ? JSON.parse(texto) : undefined };
}

let resultado: 'aprovado' | 'falhou' | 'credencial_de_teste_recusada' | 'tempo_esgotado' = 'falhou';
let detalhe = '';
let cobrancaId: string | null = null;
let estadosObservados: string[] = [];
let pedidoProvedorId: string | null = null;
let segundosAtePaga: number | null = null;
try {
  const aparelhoId = randomUUID();
  const conta = await api('POST', '/contas', { email: `homologacao-pix-${Date.now()}@exemplo.com.br`, nomeResponsavel: 'Homologação N2', nomeLoja: 'Loja teste Pix N2', documento: '900' + String(Date.now()).slice(-8), aparelhoId, aparelhoNome: 'Homologação N2' });
  if (conta.status !== 201) throw new Error(`Cadastro local falhou (HTTP ${conta.status}).`);
  sessao = conta.corpo.token;
  registrar('Loja local nova', 'ok');

  const conectada = await api('PUT', '/pagamentos/mercadopago/conexao', { accessToken: token });
  if (conectada.status === 400) { resultado = 'credencial_de_teste_recusada'; throw new Error('O Mercado Pago recusou o token (HTTP 401/403 em /users/me).'); }
  if (conectada.status !== 201) throw new Error(`Conexão falhou (HTTP ${conectada.status}, ${conectada.corpo?.erro}).`);
  registrar('Conexão com o token de teste (cifrado no banco local)', 'ok');

  const vendaId = randomUUID();
  const pagamentoId = randomUUID();
  const criada = await api('POST', '/pagamentos/cobrancas', { vendaId, pagamentoId, valorCentavos: VALOR });
  cobrancaId = pagamentoId;
  const [linha] = await conexao.db.select().from(cobrancasPagamento).where(eq(cobrancasPagamento.id, pagamentoId));
  pedidoProvedorId = linha?.pedidoProvedorId ?? null;
  if (criada.corpo?.estado !== 'aguardando') {
    const erro = linha?.ultimoErro ?? `HTTP ${criada.status} ${criada.corpo?.erro ?? ''}`;
    if (/credencial_invalida/.test(erro)) resultado = 'credencial_de_teste_recusada';
    throw new Error(`Cobrança não ficou aguardando (${criada.corpo?.estado ?? 'sem estado'}; ${erro}).`);
  }
  registrar('Order Pix criada (QR recebido, não gravado na evidência)', criada.corpo.pix?.qrCode ? 'ok' : 'sem QR na resposta');
  estadosObservados.push('aguardando');

  // Repetir o mesmo pedido devolve a mesma cobrança (idempotência local; a chave do provedor é a mesma).
  const repetida = await api('POST', '/pagamentos/cobrancas', { vendaId, pagamentoId, valorCentavos: VALOR });
  registrar('Reenvio idempotente', repetida.status === 200 && repetida.corpo.id === pagamentoId ? 'ok' : `HTTP ${repetida.status}`);

  const limite = Date.now() + ESPERA_MS;
  let estado = 'aguardando';
  while (Date.now() < limite && estado === 'aguardando') {
    await new Promise((ok) => setTimeout(ok, 5000));
    const r = await api('GET', `/pagamentos/cobrancas/${pagamentoId}`);
    estado = r.corpo?.estado ?? `HTTP ${r.status}`;
    if (estadosObservados.at(-1) !== estado) estadosObservados.push(estado);
  }
  const falhasConsulta = (await conexao.db.select().from(eventosCobrancaPagamento).where(eq(eventosCobrancaPagamento.cobrancaId, pagamentoId)))
    .filter((e) => e.tipo === 'falha_consulta').map((e) => e.dados);
  if (falhasConsulta.some((d) => d.tipo === 'credencial_invalida')) {
    // Nota conflitante da documentação: credenciais de teste podem receber 401 invalid_credentials no GET da order.
    resultado = 'credencial_de_teste_recusada';
    throw new Error('O GET /v1/orders/{id} respondeu 401/403 com o token de teste (possível "invalid_credentials"). A confirmação exige usuário de teste com credencial de produção.');
  }
  if (estado !== 'paga') {
    resultado = estado === 'aguardando' ? 'tempo_esgotado' : 'falhou';
    throw new Error(`A cobrança terminou em "${estado}" (falhas de consulta: ${JSON.stringify(falhasConsulta)}).`);
  }
  segundosAtePaga = Math.round((Date.now() - inicio.getTime()) / 1000);
  registrar('Confirmada pela consulta autenticada (sem webhook)', 'ok');

  const agora = new Date().toISOString();
  const venda = {
    id: vendaId, lojaId: conta.corpo.lojaId, aparelhoId, operadorId: conta.corpo.operadorId,
    itens: [{ id: randomUUID(), produtoId: null, descricao: 'Item homologação Pix', precoUnitarioCentavos: VALOR, quantidadeMilesimos: 1000, totalCentavos: VALOR }],
    pagamentos: [{ id: pagamentoId, meio: 'pix', provedor: 'mercadopago', valorCentavos: VALOR, trocoCentavos: 0 }],
    totalCentavos: VALOR, status: 'concluida', criadaEm: agora,
  };
  const push = await api('POST', '/sync/push', { aparelhoId, mutacoes: [{ id: randomUUID(), criadaEm: agora, entidade: 'venda', operacao: 'upsert', dados: venda }] });
  if (push.status !== 200 || push.corpo.rejeitadas.length) throw new Error(`Venda recusada: ${JSON.stringify(push.corpo?.rejeitadas ?? push.status)}`);
  const [pagamento] = await conexao.db.select().from(pagamentosVenda).where(eq(pagamentosVenda.id, pagamentoId));
  const [vinculada] = await conexao.db.select().from(cobrancasPagamento).where(eq(cobrancasPagamento.id, pagamentoId));
  if (pagamento?.provedor !== 'mercadopago' || pagamento.vendaId !== vendaId || !vinculada?.vinculadaEm) throw new Error('Venda gravada sem o vínculo esperado.');
  registrar('Venda sincronizada com provedor mercadopago e cobrança vinculada', 'ok');
  resultado = 'aprovado';
} catch (erro) {
  detalhe = erro instanceof Error ? erro.message.split(token).join('[token]') : 'Falha desconhecida.';
  console.error(`FALHA: ${detalhe}`);
} finally {
  const evidencia = {
    executadoEm: inicio.toISOString(),
    concluidoEm: new Date().toISOString(),
    ambiente: 'API local (PGlite em memória) + Orders API do Mercado Pago com credencial de TESTE',
    tipoEvidencia: 'HTTP real contra o sandbox do provedor; sem webhook (confirmação pela consulta)',
    resultado,
    detalhe: detalhe || null,
    valorCentavos: VALOR,
    pagadorPrimeiroNome: 'APRO',
    pagadorEmailPadraoDaDocumentacao: PAGADOR === 'test_payer@example.com',
    cobrancaId,
    pedidoProvedorId,
    estadosObservados,
    segundosAtePaga,
    etapas,
  };
  await mkdir(new URL('../builds/', import.meta.url), { recursive: true });
  await writeFile(new URL('../builds/n2-mercadopago-pix-homologacao.json', import.meta.url), JSON.stringify(evidencia, null, 2) + '\n');
  console.log(JSON.stringify(evidencia, null, 2));
  await app.close();
  await conexao.fechar();
  process.exit(resultado === 'aprovado' ? 0 : 1);
}
