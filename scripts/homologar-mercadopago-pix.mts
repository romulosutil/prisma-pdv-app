/**
 * Homologação do Pix do Mercado Pago com a CONTA DE TESTE do lojista (N2). NÃO roda no CI e não usa dinheiro real.
 *
 * Sobe uma API local descartável (PGlite em memória, rotas /dev, cobrança desativada) com o cliente REAL da Orders API,
 * conecta uma loja nova com o Access Token de teste, cria uma cobrança Pix com `payer.first_name = "APRO"` (a conta de
 * teste aprova sozinha), acompanha só pela nossa API (caminho da conciliação, sem webhook) até `paga`, sincroniza a
 * venda com esse pagamento e confere a venda gravada com provedor `mercadopago` e a cobrança vinculada.
 *
 * Dois modos:
 * - TOKEN (avançado): $env:MP_TESTE_ACCESS_TOKEN = "<token de teste>"; node --import tsx scripts/homologar-mercadopago-pix.mts
 * - OAUTH (padrão do produto): com PDV_MP_CLIENT_ID, PDV_MP_CLIENT_SECRET e PDV_MP_REDIRECT_URI da aplicação da plataforma
 *   (opcional PDV_MP_OAUTH_TEST_TOKEN=true e PDV_MP_OAUTH_PKCE). O script imprime a URL de autorização; abra-a no navegador
 *   com o VENDEDOR DE TESTE logado. O Mercado Pago redireciona para PDV_MP_REDIRECT_URI, que precisa ser uma URL https pública
 *   apontando para esta API local (túnel para 127.0.0.1:PDV_HOMOLOG_PORTA, padrão 3334, com o caminho
 *   /pagamentos/mercadopago/oauth/retorno) ou ser feito depois do deploy. Se as duas configurações existirem, vale o OAuth.
 * Opcional: PDV_MP_PAYER_EMAIL (padrão: o e-mail de exemplo da documentação, test_payer@example.com),
 *           MP_TESTE_ESPERA_MS (padrão 300000), MP_TESTE_VALOR_CENTAVOS (padrão 100 = R$ 1,00, só simbólico na conta de teste)
 *           e MP_TESTE_ESPERA_OAUTH_MS (padrão 600000).
 * - HOMOLOGAÇÃO: acrescente --remoto e use MP_TESTE_ACCESS_TOKEN, MP_TESTE_PDV_EMAIL,
 *   MP_TESTE_PDV_APARELHO, MP_TESTE_PDV_DESAFIO e MP_TESTE_PDV_CODIGO. A prova de cadastro deve ser
 *   solicitada pela rota normal de homologação para o mesmo e-mail e aparelho. Use uma caixa de teste.
 *
 * Tokens e segredos nunca são impressos nem gravados em claro; a evidência em builds/ não leva token, segredo, state nem QR.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { CobrancaPixSchema, SessaoSchema, SyncPullResSchema, SyncPushResSchema, type Mutacao, type Venda } from '@pdv/shared';
import { criarBillingDesativado } from '../apps/api/src/billing';
import { lerConfiguracaoOAuthMercadoPago } from '../apps/api/src/configuracao';
import { abrirPglite } from '../apps/api/src/db/conexao';
import { cobrancasPagamento, eventosCobrancaPagamento } from '../apps/api/src/db/schema';
import { criarCifradorPagamentos } from '../apps/api/src/pagamentos/cifrador';
import { criarProvedorMercadoPago } from '../apps/api/src/pagamentos/mercadoPago';
import { RelogioDeDesenvolvimento } from '../apps/api/src/relogio-dev';
import { criarApp } from '../apps/api/src/servidor';

const remoto = process.argv.includes('--remoto');
const origemHomologacao = 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host';
let oauth: ReturnType<typeof lerConfiguracaoOAuthMercadoPago> = null;
try { if (!remoto) oauth = lerConfiguracaoOAuthMercadoPago(process.env); } catch (erro) {
  console.error(`ERRO: ${(erro as Error).message} Nada foi executado.`);
  process.exit(2);
}
const token = process.env.MP_TESTE_ACCESS_TOKEN?.trim() || '';
const modo: 'oauth' | 'token' = oauth ? 'oauth' : 'token';
if (!oauth && !token) {
  console.error('ERRO: defina MP_TESTE_ACCESS_TOKEN (modo token) ou PDV_MP_CLIENT_ID, PDV_MP_CLIENT_SECRET e PDV_MP_REDIRECT_URI (modo OAuth). Nada foi executado.');
  process.exit(2);
}
if (process.env.NODE_ENV === 'production') {
  console.error('ERRO: esta homologação não roda com NODE_ENV=production.');
  process.exit(2);
}

const prova = remoto ? {
  email: process.env.MP_TESTE_PDV_EMAIL?.trim(),
  aparelhoId: process.env.MP_TESTE_PDV_APARELHO?.trim(),
  desafioCadastroId: process.env.MP_TESTE_PDV_DESAFIO?.trim(),
  codigoCadastro: process.env.MP_TESTE_PDV_CODIGO?.trim(),
} : null;
if (prova && (!prova.email || !prova.aparelhoId || !prova.desafioCadastroId || !/^\d{6}$/.test(prova.codigoCadastro ?? ''))) {
  console.error('ERRO: falta a prova de cadastro da loja de teste da homologação. Nada foi executado.');
  process.exit(2);
}

const ESPERA_MS = Number(process.env.MP_TESTE_ESPERA_MS ?? 300_000);
const ESPERA_OAUTH_MS = Number(process.env.MP_TESTE_ESPERA_OAUTH_MS ?? 600_000);
const PORTA = modo === 'oauth' ? Number(process.env.PDV_HOMOLOG_PORTA ?? 3334) : 0;
const VALOR = Number(process.env.MP_TESTE_VALOR_CENTAVOS ?? (remoto ? 5000 : 100));
const PAGADOR = process.env.PDV_MP_PAYER_EMAIL?.trim() || 'test_payer@example.com';
const inicio = new Date();
const etapas: { etapa: string; resultado: string; em: string }[] = [];
const registrar = (etapa: string, resultado: string) => {
  etapas.push({ etapa, resultado, em: new Date().toISOString() });
  console.log(`${resultado === 'ok' ? 'PASS' : 'INFO'} ${etapa}${resultado === 'ok' ? '' : `: ${resultado}`}`);
};

const conexao = remoto ? null : await abrirPglite();
const app = conexao ? await criarApp({
  db: conexao.db, relogio: new RelogioDeDesenvolvimento(), billing: criarBillingDesativado(), cobrancaDesativada: true, fontesEan: [], logger: false,
  emissaoCodigo: { modo: 'desenvolvimento' },
  pagamentos: {
    cifrador: criarCifradorPagamentos(randomBytes(32).toString('base64')),
    mercadoPago: criarProvedorMercadoPago(),
    pagadorEmail: PAGADOR,
    pagadorPrimeiroNome: 'APRO',
    oauth,
  },
}) : null;
let base = origemHomologacao;
if (app) {
  await app.listen({ port: PORTA, host: '127.0.0.1' });
  const endereco = app.server.address();
  if (!endereco || typeof endereco === 'string') throw new Error('Porta indisponível.');
  base = `http://127.0.0.1:${endereco.port}`;
}

let sessao = '';
async function api(metodo: string, caminho: string, corpo?: unknown): Promise<{ status: number; corpo: any }> {
  const res = await fetch(base + caminho, {
    method: metodo,
    signal: AbortSignal.timeout(15_000),
    headers: { ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }), ...(sessao ? { Authorization: `Bearer ${sessao}` } : {}) },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });
  const texto = await res.text();
  return { status: res.status, corpo: texto ? JSON.parse(texto) : undefined };
}

let resultado: 'aprovado' | 'falhou' | 'credencial_de_teste_recusada' | 'tempo_esgotado' | 'autorizacao_nao_concluida' = 'falhou';
let detalhe = '';
let cobrancaId: string | null = null;
let estadosObservados: string[] = [];
let pedidoProvedorId: string | null = null;
let segundosAtePaga: number | null = null;
try {
  const aparelhoId = prova?.aparelhoId ?? randomUUID();
  const documento = '900' + String(Date.now()).slice(-8);
  if (prova) {
    const verificacao = await api('POST', '/auth/cadastro/verificar', { ...prova, documento });
    if (verificacao.status !== 204) throw new Error(`Verificação de cadastro falhou (HTTP ${verificacao.status}, ${verificacao.corpo?.erro ?? 'sem codigo'}).`);
  }
  const conta = await api('POST', '/contas', { ...prova, email: prova?.email ?? `homologacao-pix-${Date.now()}@exemplo.com.br`, nomeResponsavel: 'Homologação N2', nomeLoja: 'Loja teste Pix N2', documento, aparelhoId, aparelhoNome: 'Homologação N2' });
  if (conta.status !== 201) throw new Error(`Cadastro da loja de teste falhou (HTTP ${conta.status}).`);
  const sessaoPdv = SessaoSchema.parse(conta.corpo);
  sessao = sessaoPdv.token;
  registrar('Loja de teste nova', 'ok');

  if (modo === 'oauth') {
    const inicioOAuth = await api('POST', '/pagamentos/mercadopago/oauth/inicio');
    if (inicioOAuth.status !== 201) throw new Error(`Início do OAuth falhou (HTTP ${inicioOAuth.status}, ${inicioOAuth.corpo?.erro}).`);
    // A URL leva um `state` de uso único (não é credencial); só aparece no terminal, nunca na evidência.
    console.log('\nAbra no navegador, logado com o VENDEDOR DE TESTE do Mercado Pago, e autorize:\n' + inicioOAuth.corpo.url + '\n');
    console.log(`Aguardando o retorno em ${oauth!.redirectUri} (túnel para ${base}) por até ${Math.round(ESPERA_OAUTH_MS / 60000)} min...`);
    const limiteOAuth = Date.now() + ESPERA_OAUTH_MS;
    let conectadaOAuth = false;
    while (Date.now() < limiteOAuth && !conectadaOAuth) {
      await new Promise((ok) => setTimeout(ok, 3000));
      const estado = await api('GET', '/pagamentos/mercadopago/conexao');
      conectadaOAuth = estado.corpo?.conectada === true && estado.corpo?.modo === 'oauth';
    }
    if (!conectadaOAuth) { resultado = 'autorizacao_nao_concluida'; throw new Error('O retorno do OAuth não chegou ou foi recusado (confira o túnel, a redirect URI registrada e o PKCE da aplicação).'); }
    registrar('Conexão por OAuth com o vendedor de teste (tokens cifrados no banco local)', 'ok');
  } else {
    const conectada = await api('PUT', '/pagamentos/mercadopago/conexao', { accessToken: token });
    if (conectada.status === 400) { resultado = 'credencial_de_teste_recusada'; throw new Error('O Mercado Pago recusou o token (HTTP 401/403 em /users/me).'); }
    if (conectada.status !== 201) throw new Error(`Conexão falhou (HTTP ${conectada.status}, ${conectada.corpo?.erro}).`);
    registrar('Conexão com o token de teste aceita pela API', 'ok');
  }

  const vendaId = randomUUID();
  const pagamentoId = randomUUID();
  const criada = await api('POST', '/pagamentos/cobrancas', { vendaId, pagamentoId, valorCentavos: VALOR });
  cobrancaId = pagamentoId;
  const [linha] = conexao ? await conexao.db.select().from(cobrancasPagamento).where(eq(cobrancasPagamento.id, pagamentoId)) : [];
  pedidoProvedorId = linha?.pedidoProvedorId ?? null;
  if (criada.corpo?.estado !== 'aguardando') {
    const erro = linha?.ultimoErro ?? `HTTP ${criada.status} ${criada.corpo?.erro ?? ''}`;
    if (/credencial_invalida|reautorizacao/.test(erro)) resultado = 'credencial_de_teste_recusada';
    throw new Error(`Cobrança não ficou aguardando (${criada.corpo?.estado ?? 'sem estado'}; ${erro}).`);
  }
  if (criada.status !== 201 || !CobrancaPixSchema.parse(criada.corpo).pix?.qrCode) throw new Error('A order de teste não retornou QR.');
  registrar('Order Pix criada (QR recebido, não gravado na evidência)', 'ok');
  estadosObservados.push('aguardando');

  // Repetir o mesmo pedido devolve a mesma cobrança (idempotência local; a chave do provedor é a mesma).
  const repetida = await api('POST', '/pagamentos/cobrancas', { vendaId, pagamentoId, valorCentavos: VALOR });
  if (repetida.status !== 200 || repetida.corpo?.id !== pagamentoId) throw new Error(`Reenvio da cobrança não foi idempotente (HTTP ${repetida.status}).`);
  registrar('Reenvio idempotente', 'ok');

  const limite = Date.now() + ESPERA_MS;
  let estado = 'aguardando';
  while (Date.now() < limite && estado === 'aguardando') {
    await new Promise((ok) => setTimeout(ok, 5000));
    const r = await api('GET', `/pagamentos/cobrancas/${pagamentoId}`);
    estado = r.corpo?.estado ?? `HTTP ${r.status}`;
    if (estadosObservados.at(-1) !== estado) estadosObservados.push(estado);
  }
  const falhasConsulta = (conexao ? await conexao.db.select().from(eventosCobrancaPagamento).where(eq(eventosCobrancaPagamento.cobrancaId, pagamentoId)) : [])
    .filter((e) => e.tipo === 'falha_consulta').map((e) => e.dados);
  if (falhasConsulta.some((d) => d.tipo === 'credencial_invalida' || d.tipo === 'reautorizacao_necessaria')) {
    // Nota conflitante da documentação: credenciais de teste podem receber 401 invalid_credentials no GET da order.
    resultado = 'credencial_de_teste_recusada';
    throw new Error('O GET /v1/orders/{id} respondeu 401/403 com o token de teste (possível "invalid_credentials"). A confirmação exige usuário de teste com credencial de produção.');
  }
  if (estado !== 'paga') {
    // No OAuth, "APRO aprova sozinho com token de vendedor de teste" é NÃO VERIFICADO: o tempo esgotado é um resultado próprio.
    resultado = estado === 'aguardando' ? 'tempo_esgotado' : 'falhou';
    throw new Error(`A cobrança terminou em "${estado}" (falhas de consulta: ${JSON.stringify(falhasConsulta)}).`);
  }
  segundosAtePaga = Math.round((Date.now() - inicio.getTime()) / 1000);
  registrar('Confirmada pela consulta autenticada (sem webhook)', 'ok');

  const agora = new Date().toISOString();
  const venda: Venda = {
    id: vendaId, lojaId: sessaoPdv.lojaId, aparelhoId, operadorId: sessaoPdv.operadorId,
    itens: [{ id: randomUUID(), produtoId: null, descricao: 'Item homologação Pix', precoUnitarioCentavos: VALOR, quantidadeMilesimos: 1000, totalCentavos: VALOR }],
    pagamentos: [{ id: pagamentoId, meio: 'pix', provedor: 'mercadopago', confirmacao: 'integrado', valorCentavos: VALOR, trocoCentavos: 0 }],
    totalCentavos: VALOR, status: 'concluida', criadaEm: agora,
  };
  const mutacao: Mutacao = { id: randomUUID(), criadaEm: agora, entidade: 'venda', operacao: 'upsert', dados: venda };
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const push = await api('POST', '/sync/push', { aparelhoId, mutacoes: [mutacao] });
    const aceitas = push.status === 200 ? SyncPushResSchema.parse(push.corpo) : null;
    if (aceitas?.aceitas[0] !== mutacao.id || aceitas.rejeitadas.length) throw new Error('O servidor não aceitou a venda de teste.');
  }
  const pull = await api('GET', '/sync/pull?desde=0');
  const vendas = pull.status === 200 ? SyncPullResSchema.parse(pull.corpo).mudancas.filter((m) => m.entidade === 'venda' && m.operacao === 'upsert') : [];
  const recebida = vendas[0];
  const pagamento = recebida?.dados.pagamentos[0];
  const vinculo = await api('GET', `/pagamentos/cobrancas/${pagamentoId}`);
  const vinculada = vinculo.status === 200 ? CobrancaPixSchema.parse(vinculo.corpo) : null;
  if (vendas.length !== 1 || recebida?.dados.id !== vendaId || pagamento?.id !== pagamentoId || pagamento.provedor !== 'mercadopago' ||
      pagamento.confirmacao !== 'integrado' || pagamento.valorCentavos !== VALOR || !vinculada?.vinculadaEm || vinculada.valorPagoCentavos !== VALOR) {
    throw new Error('Venda sincronizada sem o vínculo, meio ou valor esperado.');
  }
  registrar('Venda sincronizada com provedor mercadopago e cobrança vinculada', 'ok');
  resultado = 'aprovado';
} catch (erro) {
  detalhe = erro instanceof Error ? (token ? erro.message.split(token).join('[token]') : erro.message) : 'Falha desconhecida.';
  console.error(`FALHA: ${detalhe}`);
} finally {
  const evidencia = {
    executadoEm: inicio.toISOString(),
    concluidoEm: new Date().toISOString(),
    ambiente: remoto ? `${origemHomologacao} + Orders API do Mercado Pago com credencial de TESTE` : 'API local (PGlite em memória) + Orders API do Mercado Pago com credencial de TESTE',
    modo,
    oauthTestToken: oauth?.testToken ?? null,
    oauthPkce: oauth?.pkce ?? null,
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
  if (sessao) await api('POST', '/auth/logout').catch(() => undefined);
  await app?.close();
  await conexao?.fechar();
  process.exit(resultado === 'aprovado' ? 0 : 1);
}
