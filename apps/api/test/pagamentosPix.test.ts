import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { gerarId, type CobrancaPix, type Mutacao, type Sessao, type Venda } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import * as schema from '../src/db/schema';
import type { ConfigPagamentos } from '../src/deps';
import { agendarConciliacaoPix } from '../src/jobsPagamentos';
import { assinarManifesto, manifestoAssinatura } from '../src/pagamentos/assinaturaWebhook';
import { criarCifradorPagamentos } from '../src/pagamentos/cifrador';
import { ErroApi } from '../src/erros';
import { ErroProvedorMp, lerPedido } from '../src/pagamentos/mercadoPago';
import { ambientePix, aplicarPedido, conciliarCobrancasPix, violacaoUnica } from '../src/servicos/cobrancasPix';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, mutacao, NUMEROS, venda, type Ambiente } from './ajuda';
import { ProvedorMercadoPagoSimulado } from './provedorMercadoPagoSimulado';

// Credenciais fictícias: não têm o formato das do Mercado Pago (APP_USR-...).
const TOKEN_A = 'TESTE-SIMULADO-TOKEN-LOJA-A-0001';
const TOKEN_B = 'TESTE-SIMULADO-TOKEN-LOJA-B-0002';
const SEGREDO_A = 'segredo-simulado-webhook-a';
const SEGREDO_B = 'segredo-simulado-webhook-b';
const CHAVE = randomBytes(32).toString('base64');

type Conta = Awaited<ReturnType<typeof contaEmTeste>>;

let banco: Conexao;
let amb: Ambiente;
let sim: ProvedorMercadoPagoSimulado;
let config: ConfigPagamentos;

beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => {
  sim = new ProvedorMercadoPagoSimulado();
  sim.tokensValidos.add(TOKEN_A).add(TOKEN_B);
  config = { cifrador: criarCifradorPagamentos(CHAVE), mercadoPago: sim, pagadorEmail: 'pagador@exemplo.com.br' };
  amb = await criarAmbiente(banco, undefined, [], undefined, { pagamentos: config });
});
afterEach(async () => { await amb.fechar(); });

const pix = () => ambientePix({ db: amb.db, relogio: amb.relogio, pagamentos: config });
const avancarMs = (ms: number) => amb.relogio.definir(new Date(amb.relogio.agora().getTime() + ms));

async function conectar(conta: { token: string }, accessToken = TOKEN_A, segredoWebhook: string | null = SEGREDO_A) {
  const r = await chamar(amb, 'PUT', '/pagamentos/mercadopago/conexao', { token: conta.token, corpo: { accessToken, ...(segredoWebhook ? { segredoWebhook } : {}) } });
  expect([200, 201], JSON.stringify(r.corpo)).toContain(r.status);
  return String(r.corpo.webhookPath).split('/').pop()!;
}

async function cobrar(conta: { token: string }, dados: { vendaId?: string; pagamentoId?: string; valorCentavos?: number } = {}) {
  const corpo = { vendaId: dados.vendaId ?? gerarId(), pagamentoId: dados.pagamentoId ?? gerarId(), valorCentavos: dados.valorCentavos ?? 700 };
  const r = await chamar<CobrancaPix & { erro?: string }>(amb, 'POST', '/pagamentos/cobrancas', { token: conta.token, corpo });
  return { ...r, pedido: corpo };
}

const consultar = (conta: { token: string }, id: string) => chamar<CobrancaPix & { erro?: string }>(amb, 'GET', `/pagamentos/cobrancas/${id}`, { token: conta.token });
const cancelar = (conta: { token: string }, id: string) => chamar<CobrancaPix & { erro?: string }>(amb, 'POST', `/pagamentos/cobrancas/${id}/cancelar`, { token: conta.token });
const linha = async (id: string) => (await amb.db.select().from(schema.cobrancasPagamento).where(eq(schema.cobrancasPagamento.id, id)))[0]!;
const eventos = async (id: string) => amb.db.select().from(schema.eventosCobrancaPagamento).where(eq(schema.eventosCobrancaPagamento.cobrancaId, id)).orderBy(asc(schema.eventosCobrancaPagamento.criadoEm));
const orderDe = (pagamentoId: string) => sim.idDaChave(`pdv-pix-${pagamentoId}`);
const consultasAoProvedor = () => sim.chamadas.filter((c) => c.operacao === 'consultar').length;

/** Por padrão anda 3 s antes (limite de consultas por cobrança); `semAvancar` simula avisos em rajada. */
async function avisar(publicoId: string, dataId: string | undefined, segredo: string | null, opcoes: { assinatura?: string | null; requestId?: string; semAvancar?: boolean } = {}) {
  if (!opcoes.semAvancar) avancarMs(3000);
  const requestId = opcoes.requestId ?? gerarId();
  const ts = String(amb.relogio.agora().getTime());
  const assinatura = opcoes.assinatura === undefined
    ? (segredo ? `ts=${ts},v1=${assinarManifesto(manifestoAssinatura(dataId, requestId, ts), segredo)}` : null)
    : opcoes.assinatura;
  const res = await amb.app.inject({
    method: 'POST',
    url: `/webhooks/pdv-mercadopago/${publicoId}?${dataId ? `data.id=${dataId}&` : ''}type=order`,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId, ...(assinatura ? { 'x-signature': assinatura } : {}) },
    // O corpo afirma "processed" mesmo quando não é: a API nunca confia nele.
    payload: { action: 'order.processed', type: 'order', live_mode: false, data: { id: dataId, status: 'processed', status_detail: 'accredited' } },
  });
  return { status: res.statusCode, corpo: res.json() };
}

function vendaPix(conta: Conta, pagamentoId: string, extras: Partial<Venda> = {}, valorCentavos = 700): Mutacao {
  const v = venda(conta, { pagamentos: [{ id: pagamentoId, meio: 'pix', provedor: 'mercadopago', valorCentavos, trocoCentavos: 0 }], ...extras });
  return mutacao('venda', v);
}

async function convidarOperador(dono: Conta, email = 'operadora@exemplo.com.br'): Promise<Sessao> {
  const convite = await chamar(amb, 'POST', '/equipe/convites', { token: dono.token, corpo: { email, nome: 'Operadora', papel: 'operador' } });
  expect(convite.status, JSON.stringify(convite.corpo)).toBe(201);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email } })).corpo.codigo;
  const login = await chamar<Sessao>(amb, 'POST', '/auth/login', { corpo: { email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Celular da operadora', operadorId: convite.corpo.operadorId, aceitarConvite: true } });
  expect(login.status, JSON.stringify(login.corpo)).toBe(200);
  return login.corpo;
}

describe('disponibilidade e conexão', () => {
  it('sem PDV_PAGAMENTOS_CHAVE a API sobe e as rotas de pagamento respondem 503', async () => {
    const semChave = await criarAmbiente(banco, undefined, [], undefined, { pagamentos: { ...config, cifrador: null } });
    try {
      const dono = await contaEmTeste(semChave, 'pro');
      for (const [metodo, url] of [['GET', '/pagamentos/mercadopago/conexao'], ['PUT', '/pagamentos/mercadopago/conexao'], ['POST', '/pagamentos/cobrancas'], ['GET', `/pagamentos/cobrancas/${gerarId()}`]] as const) {
        const r = await chamar(semChave, metodo, url, { token: dono.token, corpo: metodo === 'GET' ? undefined : { accessToken: TOKEN_A, vendaId: gerarId(), pagamentoId: gerarId(), valorCentavos: 1 } });
        expect(r.status, url).toBe(503);
        expect(r.corpo.erro).toBe('pagamentos_indisponiveis');
      }
      const aviso = await semChave.app.inject({ method: 'POST', url: `/webhooks/pdv-mercadopago/${'a'.repeat(43)}`, payload: {} });
      expect(aviso.statusCode).toBe(503);
    } finally { await semChave.fechar(); }
    const semConfig = await criarAmbiente(banco);
    try {
      const dono = await contaEmTeste(semConfig, 'pro');
      expect((await chamar(semConfig, 'GET', '/pagamentos/mercadopago/conexao', { token: dono.token })).status).toBe(503);
    } finally { await semConfig.fechar(); }
  });

  it('só o dono conecta; credencial fica cifrada, nunca volta na resposta e some ao desconectar', async () => {
    const dono = await contaEmTeste(amb, 'pro');
    const operadora = await convidarOperador(dono);
    for (const metodo of ['GET', 'PUT', 'DELETE'] as const) {
      const r = await chamar(amb, metodo, '/pagamentos/mercadopago/conexao', { token: operadora.token, corpo: metodo === 'PUT' ? { accessToken: TOKEN_A } : undefined });
      expect(r.status, metodo).toBe(403);
    }
    expect((await chamar(amb, 'GET', '/pagamentos/cobrancas', { token: operadora.token })).status).toBe(403);

    expect((await chamar(amb, 'GET', '/pagamentos/mercadopago/conexao', { token: dono.token })).corpo).toEqual({ conectada: false, modo: null, reautorizacaoNecessaria: false, webhookPath: null, temSegredoWebhook: false, conectadaEm: null, atualizadaEm: null });
    const recusada = await chamar(amb, 'PUT', '/pagamentos/mercadopago/conexao', { token: dono.token, corpo: { accessToken: 'TESTE-SIMULADO-TOKEN-INVALIDO' } });
    expect(recusada.status).toBe(400);
    expect(recusada.corpo.erro).toBe('credencial_invalida');

    const criada = await chamar(amb, 'PUT', '/pagamentos/mercadopago/conexao', { token: dono.token, corpo: { accessToken: TOKEN_A } });
    expect(criada.status).toBe(201);
    expect(criada.corpo).toMatchObject({ conectada: true, temSegredoWebhook: false });
    expect(criada.corpo.webhookPath).toMatch(/^\/webhooks\/pdv-mercadopago\/[A-Za-z0-9_-]{43}$/);
    const trocada = await chamar(amb, 'PUT', '/pagamentos/mercadopago/conexao', { token: dono.token, corpo: { accessToken: TOKEN_B, segredoWebhook: SEGREDO_A } });
    expect(trocada.status).toBe(200);
    expect(trocada.corpo).toMatchObject({ conectada: true, temSegredoWebhook: true, webhookPath: criada.corpo.webhookPath });
    for (const r of [criada, trocada, await chamar(amb, 'GET', '/pagamentos/mercadopago/conexao', { token: dono.token })]) {
      expect(JSON.stringify(r.corpo)).not.toMatch(/TESTE-SIMULADO|segredo-simulado/);
    }

    const [salva] = await amb.db.select().from(schema.conexoesPagamento);
    const bruto = JSON.stringify(salva);
    expect(bruto).not.toContain(TOKEN_A);
    expect(bruto).not.toContain(TOKEN_B);
    expect(bruto).not.toContain(SEGREDO_A);
    expect(salva!.tokenEnvelope).toMatchObject({ versao: 1 });
    // O envelope é amarrado à loja/conexão/campo: trocar o contexto não decifra.
    expect(config.cifrador!.decifrar(salva!.tokenEnvelope, { lojaId: dono.lojaId, conexaoId: salva!.id, campo: 'token' })).toBe(TOKEN_B);
    expect(() => config.cifrador!.decifrar(salva!.tokenEnvelope, { lojaId: dono.lojaId, conexaoId: salva!.id, campo: 'segredo_webhook' })).toThrow('Credencial de pagamento indisponível.');
    expect(() => config.cifrador!.decifrar(salva!.tokenEnvelope, { lojaId: gerarId(), conexaoId: salva!.id, campo: 'token' })).toThrow();

    expect((await cobrar(operadora)).status).toBe(201);
    expect((await chamar(amb, 'DELETE', '/pagamentos/mercadopago/conexao', { token: dono.token })).status).toBe(204);
    expect((await chamar(amb, 'GET', '/pagamentos/mercadopago/conexao', { token: dono.token })).corpo.conectada).toBe(false);
    const [desligada] = await amb.db.select().from(schema.conexoesPagamento);
    expect(desligada).toMatchObject({ ativa: false, tokenEnvelope: null, segredoWebhookEnvelope: null });
    expect(await amb.db.$count(schema.cobrancasPagamento)).toBe(1);
    const semConexao = await cobrar(operadora);
    expect(semConexao.status).toBe(409);
    expect(semConexao.corpo.erro).toBe('mercadopago_nao_conectado');
  });
});

describe('criação da cobrança', () => {
  it('cria a order Pix com chave determinística e devolve a mesma cobrança no reenvio; dados diferentes dão 409', async () => {
    const dono = await contaEmTeste(amb);
    await conectar(dono);
    const r = await cobrar(dono);
    expect(r.status).toBe(201);
    expect(r.corpo).toMatchObject({ id: r.pedido.pagamentoId, vendaId: r.pedido.vendaId, estado: 'aguardando', valorCentavos: 700, valorPagoCentavos: null });
    expect(r.corpo.pix?.qrCode).toMatch(/^00020126SIMULADO/);
    expect(r.corpo.expiraEm).not.toBeNull();
    const order = sim.orders.get(orderDe(r.pedido.pagamentoId))!;
    expect(order.entrada).toEqual({ valorCentavos: 700, referenciaExterna: r.pedido.pagamentoId, expiracao: 'PT30M', pagadorEmail: 'pagador@exemplo.com.br', pagadorPrimeiroNome: null });
    expect(order.chave).toBe(`pdv-pix-${r.pedido.pagamentoId}`);
    expect(order.chave.length).toBeLessThanOrEqual(64);

    const repetida = await cobrar(dono, r.pedido);
    expect(repetida.status).toBe(200);
    expect(repetida.corpo.id).toBe(r.corpo.id);
    expect(sim.chamadas.filter((c) => c.operacao === 'criar')).toHaveLength(1);
    for (const outro of [{ ...r.pedido, valorCentavos: 701 }, { ...r.pedido, vendaId: gerarId() }]) {
      const conflito = await cobrar(dono, outro);
      expect(conflito.status).toBe(409);
      expect(conflito.corpo.erro).toBe('cobranca_conflitante');
    }
    const outraLoja = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
    await conectar(outraLoja, TOKEN_B, SEGREDO_B);
    expect((await cobrar(outraLoja, r.pedido)).status).toBe(409);
    expect(sim.orders.size).toBe(1);
  });

  it('falha do provedor deixa erro_provedor; a nova tentativa reusa a chave e nunca cria duas orders', async () => {
    const dono = await contaEmTeste(amb);
    await conectar(dono);
    sim.falharProxima('criar');
    const primeira = await cobrar(dono);
    expect(primeira.status).toBe(201);
    expect(primeira.corpo).toMatchObject({ estado: 'erro_provedor', pix: null });
    expect((await linha(primeira.corpo.id)).ultimoErro).toBe('indisponivel:internal_error');
    expect(sim.orders.size).toBe(0);

    // A order nasce no provedor e a resposta se perde (timeout): a repetição recupera a mesma order.
    sim.falharProxima('criar', new ErroProvedorMp('indisponivel'), true);
    expect((await cobrar(dono, primeira.pedido)).corpo.estado).toBe('erro_provedor');
    expect(sim.orders.size).toBe(1);
    const terceira = await cobrar(dono, primeira.pedido);
    expect(terceira.status).toBe(200);
    expect(terceira.corpo.estado).toBe('aguardando');
    expect(sim.orders.size).toBe(1);
    expect(new Set(sim.chamadas.filter((c) => c.operacao === 'criar').map((c) => c.chave))).toEqual(new Set([`pdv-pix-${primeira.pedido.pagamentoId}`]));
    const salva = await linha(primeira.corpo.id);
    expect(salva).toMatchObject({ tentativas: 3, pedidoProvedorId: orderDe(primeira.pedido.pagamentoId), leaseAte: null, ultimoErro: null });
    expect((await eventos(salva.id)).map((e) => e.tipo).sort()).toEqual(['criada', 'falha_criacao', 'falha_criacao', 'pedido_criado']);
  });

  it('exige sessão, valor positivo, conexão da loja e e-mail do pagador configurado', async () => {
    const dono = await contaEmTeste(amb);
    expect((await cobrar(dono)).corpo.erro).toBe('mercadopago_nao_conectado');
    await conectar(dono);
    expect((await chamar(amb, 'POST', '/pagamentos/cobrancas', { token: dono.token, corpo: { vendaId: gerarId(), pagamentoId: gerarId(), valorCentavos: 0 } })).status).toBe(400);
    expect((await chamar(amb, 'POST', '/pagamentos/cobrancas', { corpo: { vendaId: gerarId(), pagamentoId: gerarId(), valorCentavos: 700 } })).status).toBe(401);
    // Novo ambiente (zera o banco): servidor sem PDV_MP_PAYER_EMAIL.
    const semPagador = await criarAmbiente(banco, undefined, [], undefined, { pagamentos: { ...config, pagadorEmail: null } });
    try {
      const outra = await contaEmTeste(semPagador);
      await chamar(semPagador, 'PUT', '/pagamentos/mercadopago/conexao', { token: outra.token, corpo: { accessToken: TOKEN_A } });
      const r = await chamar(semPagador, 'POST', '/pagamentos/cobrancas', { token: outra.token, corpo: { vendaId: gerarId(), pagamentoId: gerarId(), valorCentavos: 700 } });
      expect(r.status).toBe(503);
      expect(r.corpo.erro).toBe('pagador_nao_configurado');
    } finally { await semPagador.fechar(); }
  });
});

describe('webhook e confirmação', () => {
  it('confirma só pela consulta autenticada; recusa assinatura inválida, ausente ou conexão sem segredo', async () => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono);
    const { corpo } = await cobrar(dono);
    const order = orderDe(corpo.id);

    // Assinatura válida, mas o provedor ainda não recebeu: o corpo do aviso ("processed") é ignorado.
    expect((await avisar(publico, order, SEGREDO_A)).status).toBe(200);
    expect((await linha(corpo.id)).estado).toBe('aguardando');

    sim.aprovar(order);
    expect((await avisar(publico, order, 'segredo-errado-simulado')).status).toBe(401);
    expect((await avisar(publico, order, SEGREDO_A, { assinatura: null })).status).toBe(401);
    expect((await avisar(publico, order, SEGREDO_A, { assinatura: 'ts=1,v1=abc' })).status).toBe(401);
    expect((await avisar('x'.repeat(43), order, SEGREDO_A)).status).toBe(401);
    expect((await linha(corpo.id)).estado).toBe('aguardando');

    // data.id em maiúsculas na query: o manifesto usa minúsculas, como a documentação pede.
    const ok = await avisar(publico, order, SEGREDO_A);
    expect(ok).toEqual({ status: 200, corpo: { recebido: true } });
    expect(await linha(corpo.id)).toMatchObject({ estado: 'paga', valorPagoCentavos: 700, statusProvedor: 'processed', detalheProvedor: 'accredited' });
    expect((await consultar(dono, corpo.id)).corpo).toMatchObject({ estado: 'paga', pix: null, pagaEm: amb.relogio.agora().toISOString() });

    // Order desconhecida com assinatura válida: 200 sem consultar nada.
    const antes = consultasAoProvedor();
    expect((await avisar(publico, 'ORD01DESCONHECIDA', SEGREDO_A)).status).toBe(200);
    expect((await avisar(publico, undefined, SEGREDO_A)).status).toBe(200);
    expect(consultasAoProvedor()).toBe(antes);
  });

  it('conexão sem assinatura secreta recusa todo aviso; a conciliação continua confirmando', async () => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono, TOKEN_A, null);
    const { corpo } = await cobrar(dono);
    sim.aprovar(orderDe(corpo.id));
    expect((await avisar(publico, orderDe(corpo.id), SEGREDO_A)).status).toBe(401);
    avancarMs(31_000);
    expect(await conciliarCobrancasPix(pix())).toEqual({ consultadas: 1, confirmadas: 1, encerradas: 0, falhas: 0 });
    expect((await linha(corpo.id)).estado).toBe('paga');
  });

  it('aviso duplicado confirma uma vez e aviso fora de ordem não faz regredir', async () => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono);
    const { corpo } = await cobrar(dono);
    const order = orderDe(corpo.id);
    sim.aprovar(order);
    const requestId = gerarId();
    expect((await avisar(publico, order, SEGREDO_A, { requestId })).status).toBe(200);
    const pagaEm = (await linha(corpo.id)).pagaEm;
    avancarMs(60_000);
    expect((await avisar(publico, order, SEGREDO_A, { requestId })).status).toBe(200);
    expect((await linha(corpo.id)).pagaEm).toEqual(pagaEm);
    for (const [status, detalhe] of [['action_required', 'waiting_transfer'], ['canceled', 'expired'], ['failed', 'failed'], ['processed', 'accredited']]) {
      sim.definir(order, status!, detalhe!);
      expect((await avisar(publico, order, SEGREDO_A)).status).toBe(200);
      expect((await linha(corpo.id)).estado).toBe('paga');
    }
    const transicoes = (await eventos(corpo.id)).filter((e) => e.tipo === 'transicao');
    expect(transicoes.map((e) => e.dados.para)).toEqual(['paga']);

    // Estorno depois da confirmação: alerta para o dono, sem desfazer o estado.
    sim.definir(order, 'refunded', 'refunded');
    await avisar(publico, order, SEGREDO_A);
    expect(await linha(corpo.id)).toMatchObject({ estado: 'paga', alerta: 'refunded/refunded' });
  });

  it.each([[701, 'a mais'], [699, 'a menos']])('valor pago divergente (%i, %s) vira divergente e não serve para venda', async (pago) => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono);
    const { corpo } = await cobrar(dono);
    sim.aprovar(orderDe(corpo.id), pago);
    await avisar(publico, orderDe(corpo.id), SEGREDO_A);
    expect(await linha(corpo.id)).toMatchObject({ estado: 'divergente', valorPagoCentavos: pago });
    const lista = await chamar<CobrancaPix[]>(amb, 'GET', '/pagamentos/cobrancas?estado=divergente', { token: dono.token });
    expect(lista.corpo.map((c) => c.id)).toEqual([corpo.id]);
    expect((await enviar(amb, dono, [vendaPix(dono, corpo.id, { id: corpo.vendaId })])).corpo.rejeitadas[0].motivo).toBe('pagamento_nao_confirmado');
    // Final: nem um "valor certo" posterior muda o estado.
    sim.aprovar(orderDe(corpo.id));
    await avisar(publico, orderDe(corpo.id), SEGREDO_A);
    expect((await linha(corpo.id)).estado).toBe('divergente');
  });

  it('order de outra referência nunca confirma', async () => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono);
    const { corpo } = await cobrar(dono);
    const order = orderDe(corpo.id);
    sim.aprovar(order);
    sim.orders.get(order)!.corpo.external_reference = gerarId();
    await avisar(publico, order, SEGREDO_A);
    expect((await linha(corpo.id)).estado).toBe('divergente');
  });
});

describe('pagamento tardio, abandono e conciliação', () => {
  it('pagamento depois da expiração vira paga_tardia, visível ao dono e recusado na venda', async () => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono);
    const { corpo } = await cobrar(dono);
    const order = orderDe(corpo.id);
    sim.expirar(order);
    avancarMs(31 * 60_000);
    expect(await conciliarCobrancasPix(pix())).toMatchObject({ consultadas: 1, encerradas: 1 });
    expect((await consultar(dono, corpo.id)).corpo).toMatchObject({ estado: 'expirada', pix: null });
    sim.aprovar(order);
    await avisar(publico, order, SEGREDO_A);
    expect(await linha(corpo.id)).toMatchObject({ estado: 'paga_tardia', valorPagoCentavos: 700 });
    const lista = await chamar<CobrancaPix[]>(amb, 'GET', '/pagamentos/cobrancas?estado=paga_tardia', { token: dono.token });
    expect(lista.corpo).toEqual([expect.objectContaining({ id: corpo.id, estado: 'paga_tardia', vinculadaEm: null, pix: null })]);
    expect((await enviar(amb, dono, [vendaPix(dono, corpo.id, { id: corpo.vendaId })])).corpo.rejeitadas[0].motivo).toBe('pagamento_nao_confirmado');
  });

  it('venda abandonada cancela a order; pagamento posterior é detectado pela conciliação como paga_tardia', async () => {
    const dono = await contaEmTeste(amb);
    await conectar(dono);
    const { corpo } = await cobrar(dono);
    const order = orderDe(corpo.id);
    const cancelada = await cancelar(dono, corpo.id);
    expect(cancelada.status).toBe(200);
    expect(cancelada.corpo).toMatchObject({ estado: 'cancelada', pix: null });
    expect(sim.orders.get(order)!.corpo.status).toBe('canceled');
    const chamadas = sim.chamadas.length;
    expect((await cancelar(dono, corpo.id)).corpo.estado).toBe('cancelada');
    expect(sim.chamadas.length).toBe(chamadas);

    sim.aprovar(order);
    avancarMs(5 * 60_000);
    expect((await conciliarCobrancasPix(pix())).consultadas).toBe(0);
    avancarMs(6 * 60_000);
    expect(await conciliarCobrancasPix(pix())).toMatchObject({ consultadas: 1, confirmadas: 1 });
    expect((await linha(corpo.id)).estado).toBe('paga_tardia');
    // Depois de 24 h sem mudança, a conciliação para de consultar.
    const outra = await cobrar(dono);
    await cancelar(dono, outra.corpo.id);
    avancarMs(25 * 60 * 60_000);
    expect((await conciliarCobrancasPix(pix())).consultadas).toBe(0);
  });

  it('cancelar uma order já paga devolve paga; erro do provedor mantém pendente; sem order cancela localmente', async () => {
    const dono = await contaEmTeste(amb);
    await conectar(dono);
    const { corpo } = await cobrar(dono);
    sim.aprovar(orderDe(corpo.id));
    const r = await cancelar(dono, corpo.id);
    expect(r.status).toBe(200);
    expect(r.corpo.estado).toBe('paga');

    const pendente = await cobrar(dono);
    sim.falharProxima('cancelar');
    const falha = await cancelar(dono, pendente.corpo.id);
    expect(falha.status).toBe(502);
    expect(falha.corpo.erro).toBe('provedor_indisponivel');
    expect((await linha(pendente.corpo.id)).estado).toBe('aguardando');

    sim.falharProxima('criar');
    const semOrder = await cobrar(dono);
    expect(semOrder.corpo.estado).toBe('erro_provedor');
    const antes = sim.chamadas.length;
    expect((await cancelar(dono, semOrder.corpo.id)).corpo.estado).toBe('cancelada');
    expect(sim.chamadas.length).toBe(antes);
    // Cancelada não volta a ser criada no provedor por um reenvio do mesmo pagamento.
    expect((await cobrar(dono, semOrder.pedido)).corpo.estado).toBe('cancelada');
    expect(sim.chamadas.length).toBe(antes);
  });

  it('conciliação confirma sem webhook; um 429 pula só a loja que o recebeu e respeita o Retry-After', async () => {
    const a = await contaEmTeste(amb);
    const b = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
    await conectar(a);
    await conectar(b, TOKEN_B, SEGREDO_B);
    const a1 = await cobrar(a);
    avancarMs(1000);
    const a2 = await cobrar(a);
    avancarMs(1000);
    const b1 = await cobrar(b);
    expect((await conciliarCobrancasPix(pix())).consultadas).toBe(0);
    sim.aprovar(orderDe(a2.corpo.id));
    sim.aprovar(orderDe(b1.corpo.id));
    avancarMs(31_000);
    sim.falharProxima('consultar', new ErroProvedorMp('limite', 429, 'too_many_requests', 120_000));
    // a1 recebe 429: a2 (mesma loja) fica para depois; b1 (outra loja) segue na mesma passada.
    expect(await conciliarCobrancasPix(pix())).toEqual({ consultadas: 2, confirmadas: 1, encerradas: 0, falhas: 1 });
    expect((await linha(b1.corpo.id)).estado).toBe('paga');
    expect((await linha(a2.corpo.id)).estado).toBe('aguardando');
    const a1Linha = await linha(a1.corpo.id);
    expect(a1Linha.falhasConsulta).toBe(1);
    expect(a1Linha.proximaConsultaEm!.getTime() - amb.relogio.agora().getTime()).toBe(120_000);
    expect(await conciliarCobrancasPix(pix())).toEqual({ consultadas: 1, confirmadas: 1, encerradas: 0, falhas: 0 });
    expect((await linha(a2.corpo.id)).estado).toBe('paga');
    avancarMs(119_000);
    expect((await conciliarCobrancasPix(pix())).consultadas).toBe(0);
    avancarMs(1000);
    expect(await conciliarCobrancasPix(pix())).toEqual({ consultadas: 1, confirmadas: 0, encerradas: 0, falhas: 0 });
    expect((await linha(a1.corpo.id)).falhasConsulta).toBe(0);
    const todos = await amb.db.select().from(schema.eventosCobrancaPagamento);
    expect(todos.filter((e) => e.tipo === 'falha_consulta').map((e) => e.dados)).toEqual([expect.objectContaining({ origem: 'conciliacao', tipo: 'limite', status: 429, repeticoes: 1 })]);
    expect(JSON.stringify(todos)).not.toMatch(/TESTE-SIMULADO|segredo-simulado|00020126/);
  });

  it('pendente vencida: recuo crescente e parada 24 h depois do vencimento, ainda visível ao dono', async () => {
    const dono = await contaEmTeste(amb);
    await conectar(dono);
    const { corpo } = await cobrar(dono);
    const expira = (await linha(corpo.id)).expiraEm!.getTime();
    amb.relogio.definir(new Date(expira + 5 * 60_000 + 1000));
    const intervalos: number[] = [];
    let consultas = 0;
    for (let i = 0; i < 200; i++) {
      const r = await conciliarCobrancasPix(pix());
      consultas += r.consultadas;
      const l = await linha(corpo.id);
      if (!l.proximaConsultaEm) break;
      if (r.consultadas) intervalos.push(l.proximaConsultaEm.getTime() - l.consultadoEm!.getTime());
      amb.relogio.definir(l.proximaConsultaEm);
    }
    expect((await linha(corpo.id)).proximaConsultaEm).toBeNull();
    expect(amb.relogio.agora().getTime()).toBeGreaterThanOrEqual(expira + 24 * 60 * 60_000);
    expect(consultas).toBeLessThan(40);
    expect(intervalos[0]).toBe(60_000);
    expect(intervalos.every((v, i) => i === 0 || v >= intervalos[i - 1]!)).toBe(true);
    expect(Math.max(...intervalos)).toBe(60 * 60_000);
    avancarMs(7 * 24 * 60 * 60_000);
    expect((await conciliarCobrancasPix(pix())).consultadas).toBe(0);
    const lista = await chamar<CobrancaPix[]>(amb, 'GET', '/pagamentos/cobrancas?estado=aguardando', { token: dono.token });
    expect(lista.corpo.map((c) => c.id)).toEqual([corpo.id]);
  });

  it('falhas seguidas dobram o intervalo e atualizam um único evento', async () => {
    const dono = await contaEmTeste(amb);
    await conectar(dono);
    const { corpo } = await cobrar(dono);
    const intervalos: number[] = [];
    for (let i = 0; i < 5; i++) {
      amb.relogio.definir((await linha(corpo.id)).proximaConsultaEm!);
      sim.falharProxima('consultar');
      expect((await conciliarCobrancasPix(pix())).falhas).toBe(1);
      intervalos.push((await linha(corpo.id)).proximaConsultaEm!.getTime() - amb.relogio.agora().getTime());
    }
    expect(intervalos).toEqual([60_000, 120_000, 240_000, 480_000, 960_000]);
    const falhas = (await eventos(corpo.id)).filter((e) => e.tipo === 'falha_consulta');
    expect(falhas).toHaveLength(1);
    expect(falhas[0]!.dados).toMatchObject({ tipo: 'indisponivel', status: 503, repeticoes: 5 });
  });

  it('uma loja com muitas pendências não monopoliza a passada; erro inesperado numa cobrança não interrompe as outras', async () => {
    const a = await contaEmTeste(amb);
    const b = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
    await conectar(a);
    await conectar(b, TOKEN_B, SEGREDO_B);
    for (let i = 0; i < 7; i++) await cobrar(a);
    avancarMs(1000);
    const deB = await cobrar(b);
    sim.aprovar(orderDe(deB.corpo.id));
    avancarMs(31_000);
    sim.falharProxima('consultar', new ErroApi(409, 'conflito_cobranca', 'simulado'));
    expect(await conciliarCobrancasPix(pix())).toMatchObject({ consultadas: 6, confirmadas: 1, falhas: 1 });
    expect((await linha(deB.corpo.id)).estado).toBe('paga');
  });

  it('a passada para entre duas consultas quando o serviço está encerrando', async () => {
    const dono = await contaEmTeste(amb);
    await conectar(dono);
    for (let i = 0; i < 3; i++) await cobrar(dono);
    avancarMs(31_000);
    let verificacoes = 0;
    expect((await conciliarCobrancasPix(pix(), { deveParar: () => verificacoes++ >= 1 })).consultadas).toBe(1);
  });

  it('consulta do app vai ao provedor no máximo a cada 3 s', async () => {
    const dono = await contaEmTeste(amb);
    await conectar(dono);
    const { corpo } = await cobrar(dono);
    await consultar(dono, corpo.id);
    expect(consultasAoProvedor()).toBe(0);
    avancarMs(3000);
    await consultar(dono, corpo.id);
    await consultar(dono, corpo.id);
    expect(consultasAoProvedor()).toBe(1);
    avancarMs(2999);
    await consultar(dono, corpo.id);
    expect(consultasAoProvedor()).toBe(1);
    sim.aprovar(orderDe(corpo.id));
    avancarMs(1);
    expect((await consultar(dono, corpo.id)).corpo.estado).toBe('paga');
    avancarMs(10_000);
    await consultar(dono, corpo.id);
    expect(consultasAoProvedor()).toBe(2);
  });

  it('o agendamento não sobrepõe passadas e drena no encerramento', async () => {
    vi.useFakeTimers();
    try {
      let liberar!: () => void;
      let chamadas = 0;
      const parar = agendarConciliacaoPix(() => { chamadas += 1; return new Promise((ok) => { liberar = () => ok({ consultadas: 0, confirmadas: 0, encerradas: 0, falhas: 0 }); }); }, () => {}, 1000);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(3000);
      expect(chamadas).toBe(1);
      liberar();
      await vi.advanceTimersByTimeAsync(1000);
      expect(chamadas).toBe(2);
      const parada = parar();
      liberar();
      await parada;
      await vi.advanceTimersByTimeAsync(5000);
      expect(chamadas).toBe(2);
    } finally { vi.useRealTimers(); }
  });
});

describe('isolamento entre lojas', () => {
  it('cobrança, conexão e webhook de uma loja nunca servem a outra', async () => {
    const a = await contaEmTeste(amb);
    const b = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
    const publicoA = await conectar(a, TOKEN_A, SEGREDO_A);
    const publicoB = await conectar(b, TOKEN_B, SEGREDO_B);
    const { corpo } = await cobrar(a);
    const order = orderDe(corpo.id);
    expect((await consultar(b, corpo.id)).status).toBe(404);
    expect((await cancelar(b, corpo.id)).status).toBe(404);
    expect((await chamar<CobrancaPix[]>(amb, 'GET', '/pagamentos/cobrancas', { token: b.token })).corpo).toEqual([]);

    sim.aprovar(order);
    // Aviso da order de A chegando pela URL de B (com o segredo de B) não encontra nada.
    const antes = consultasAoProvedor();
    expect((await avisar(publicoB, order, SEGREDO_B)).status).toBe(200);
    expect(consultasAoProvedor()).toBe(antes);
    expect((await avisar(publicoA, order, SEGREDO_B)).status).toBe(401);
    expect((await linha(corpo.id)).estado).toBe('aguardando');
    await avisar(publicoA, order, SEGREDO_A);
    expect((await linha(corpo.id)).estado).toBe('paga');

    // A loja B não usa a cobrança paga da loja A, nem com o mesmo id de venda.
    const res = await enviar(amb, b, [vendaPix(b, corpo.id, { id: corpo.vendaId })]);
    expect(res.corpo.rejeitadas).toEqual([{ id: expect.any(String), motivo: 'pagamento_indisponivel' }]);
    // A order de A só é consultada com o token de A.
    expect(sim.orders.get(order)!.token).toBe(TOKEN_A);
  });
});

describe('cartão pelo Mercado Pago Point', () => {
  it.each([['cartao_debito', 'debit_card'], ['cartao_credito', 'credit_card']] as const)('cobre %s no terminal da loja e vincula após a consulta', async (meio, tipo) => {
    config.pointHabilitado = true;
    const dono = await contaEmTeste(amb);
    const outraLoja = await contaEmTeste(amb, 'pro', NUMEROS.outroAprova);
    await conectar(dono);
    await conectar(outraLoja, TOKEN_B);
    const terminalPointId = 'NEWLAND_N950__SIMULADO1';
    sim.terminaisPoint.set(TOKEN_A, [terminalPointId]);
    const terminais = (conta: Conta) => chamar(amb, 'GET', '/pagamentos/mercadopago/point/terminais', { token: conta.token });
    expect((await terminais(dono)).corpo).toEqual([{ id: terminalPointId }]);
    expect((await terminais(outraLoja)).corpo).toEqual([]);
    const corpo = { vendaId: gerarId(), pagamentoId: gerarId(), valorCentavos: 700, provedor: 'mercadopago', meio, terminalPointId };
    const criar = (body = corpo) => chamar(amb, 'POST', '/pagamentos/cobrancas', { token: dono.token, corpo: body });
    expect(await criar()).toMatchObject({ status: 201, corpo: { estado: 'aguardando', meio, pix: null } });
    expect(await criar()).toMatchObject({ status: 200, corpo: { id: corpo.pagamentoId } });
    expect((await criar({ ...corpo, terminalPointId: 'OUTRO_TERMINAL' })).status).toBe(409);
    const order = sim.idDaChave(`pdv-point-${corpo.pagamentoId}`);
    expect(sim.orders.get(order)?.entrada).toMatchObject({ terminalId: terminalPointId, tipo });
    sim.definir(order, 'at_terminal', 'at_terminal');
    expect((await cancelar(dono, corpo.pagamentoId)).corpo.estado).toBe('aguardando');
    const dados = venda(dono, { id: corpo.vendaId, pagamentos: [{ id: corpo.pagamentoId, meio, provedor: 'mercadopago', valorCentavos: 700, trocoCentavos: 0, confirmacao: 'integrado' }] });
    expect((await enviar(amb, dono, [mutacao('venda', dados)])).corpo.rejeitadas[0].motivo).toBe('pagamento_nao_confirmado');
    sim.aprovar(order);
    avancarMs(3000);
    expect((await consultar(dono, corpo.pagamentoId)).corpo.estado).toBe('paga');
    const m = mutacao('venda', dados);
    expect((await enviar(amb, dono, [m])).corpo).toMatchObject({ aceitas: [m.id], rejeitadas: [] });
    expect((await linha(corpo.pagamentoId)).vinculadaEm).not.toBeNull();
    expect((await chamar(amb, 'GET', '/sync/pull?desde=0', { token: dono.token })).corpo.mudancas).toContainEqual(expect.objectContaining({ entidade: 'venda', dados: expect.objectContaining({ pagamentos: dados.pagamentos }) }));
  });
});

describe('venda paga pelo Pix do Mercado Pago', () => {
  async function cobrancaPaga(conta: Conta, valorCentavos = 700) {
    const publico = await conectar(conta);
    const { corpo } = await cobrar(conta, { valorCentavos });
    sim.aprovar(orderDe(corpo.id));
    await avisar(publico, orderDe(corpo.id), SEGREDO_A);
    expect((await linha(corpo.id)).estado).toBe('paga');
    return corpo;
  }

  it('aceita a venda com a cobrança confirmada, vincula na mesma transação e mantém a venda imutável', async () => {
    const dono = await contaEmTeste(amb);
    const c = await cobrancaPaga(dono);
    const m = vendaPix(dono, c.id, { id: c.vendaId });
    const res = await enviar(amb, dono, [m]);
    expect(res.corpo).toMatchObject({ aceitas: [m.id], rejeitadas: [] });
    const salva = await linha(c.id);
    expect(salva.vinculadaEm).toEqual(amb.relogio.agora());
    expect(await amb.db.select().from(schema.pagamentosVenda).where(eq(schema.pagamentosVenda.id, c.id))).toEqual([expect.objectContaining({ vendaId: c.vendaId, meio: 'pix', provedor: 'mercadopago', valorCentavos: 700 })]);
    const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: dono.token });
    expect(pull.corpo.mudancas.find((x: any) => x.entidade === 'venda').dados.pagamentos).toEqual([{ id: c.id, meio: 'pix', provedor: 'mercadopago', valorCentavos: 700, trocoCentavos: 0 }]);
    // Reenvio da mesma mutação e da mesma venda: no-op.
    expect((await enviar(amb, dono, [m])).corpo.aceitas).toEqual([m.id]);
    const reenvio = { ...m, id: gerarId() };
    expect((await enviar(amb, dono, [reenvio])).corpo.aceitas).toEqual([reenvio.id]);
    // Alterar o pagamento de uma venda gravada continua proibido.
    const alterada = { ...m, id: gerarId(), dados: { ...(m.dados as Venda), pagamentos: [{ id: c.id, meio: 'pix' as const, provedor: null, valorCentavos: 700, trocoCentavos: 0 }] } } as Mutacao;
    expect((await enviar(amb, dono, [alterada])).corpo.rejeitadas[0].motivo).toBe('venda_imutavel');
    // Outra venda reutilizando a cobrança já vinculada.
    expect((await enviar(amb, dono, [vendaPix(dono, c.id)])).corpo.rejeitadas[0].motivo).toBe('pagamento_nao_confirmado');
    expect(await amb.db.$count(schema.vendas)).toBe(1);
  });

  it('recusa sem confirmação, com outra venda, outro valor, cobrança já usada, outro meio ou sem cobrança', async () => {
    const dono = await contaEmTeste(amb);
    const paga = await cobrancaPaga(dono);
    const pendente = (await cobrar(dono)).corpo;
    const split = venda(dono, { id: paga.vendaId, pagamentos: [
      { id: paga.id, meio: 'pix', provedor: 'mercadopago', valorCentavos: 500, trocoCentavos: 0 },
      { id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: 200, trocoCentavos: 0 }] });
    const casos: [Mutacao, string][] = [
      [vendaPix(dono, pendente.id, { id: pendente.vendaId }), 'pagamento_nao_confirmado'],
      [vendaPix(dono, paga.id), 'pagamento_nao_confirmado'],
      [mutacao('venda', split), 'pagamento_nao_confirmado'],
      [vendaPix(dono, gerarId()), 'pagamento_indisponivel'],
      [mutacao('venda', venda(dono, { id: paga.vendaId, pagamentos: [{ id: paga.id, meio: 'cartao_debito', provedor: 'mercadopago', valorCentavos: 700, trocoCentavos: 0 }] })), 'pagamento_indisponivel'],
      [mutacao('venda', venda(dono, { id: paga.vendaId, pagamentos: [{ id: paga.id, meio: 'pix', provedor: 'infinitepay', valorCentavos: 700, trocoCentavos: 0 }] })), 'pagamento_indisponivel'],
      [mutacao('venda', venda(dono, { id: paga.vendaId, pagamentos: [{ id: paga.id, meio: 'tap', provedor: 'mercadopago', valorCentavos: 700, trocoCentavos: 0 }] })), 'pagamento_indisponivel'],
    ];
    const res = await enviar(amb, dono, casos.map(([m]) => m));
    expect(res.corpo.aceitas).toEqual([]);
    expect(res.corpo.rejeitadas).toEqual(casos.map(([m, motivo]) => ({ id: m.id, motivo })));
    expect(await amb.db.$count(schema.vendas)).toBe(0);
    expect((await linha(paga.id)).vinculadaEm).toBeNull();

    // Pix manual (provedor null) continua exatamente como antes, ao lado da integração.
    const manual = mutacao('venda', venda(dono, { pagamentos: [{ id: gerarId(), meio: 'pix', provedor: null, valorCentavos: 700, trocoCentavos: 0 }] }));
    const certa = vendaPix(dono, paga.id, { id: paga.vendaId });
    expect((await enviar(amb, dono, [manual, certa])).corpo).toMatchObject({ aceitas: [manual.id, certa.id], rejeitadas: [] });
  });

  it('venda com troco no Pix ou com o mesmo pagamento duas vezes é recusada sem vincular', async () => {
    const dono = await contaEmTeste(amb);
    const paga = await cobrancaPaga(dono);
    const comTroco = mutacao('venda', venda(dono, { id: paga.vendaId, pagamentos: [{ id: paga.id, meio: 'pix', provedor: 'mercadopago', valorCentavos: 700, trocoCentavos: 100 }] }));
    const duplicado = mutacao('venda', venda(dono, { id: paga.vendaId, pagamentos: [
      { id: paga.id, meio: 'pix', provedor: 'mercadopago', valorCentavos: 350, trocoCentavos: 0 },
      { id: paga.id, meio: 'pix', provedor: 'mercadopago', valorCentavos: 350, trocoCentavos: 0 }] }));
    const res = await enviar(amb, dono, [comTroco, duplicado]);
    expect(res.corpo.aceitas).toEqual([]);
    expect(res.corpo.rejeitadas).toEqual([{ id: comTroco.id, motivo: 'venda_inconsistente' }, { id: duplicado.id, motivo: 'venda_inconsistente' }]);
    expect((await linha(paga.id)).vinculadaEm).toBeNull();
  });
});

describe('revisão: reconexão, corridas e limites', () => {
  it('desconectar e reconectar não deixa cobrança pendente órfã (consulta, conciliação e webhook da nova URL)', async () => {
    const dono = await contaEmTeste(amb);
    const antiga = await conectar(dono);
    const porConsulta = (await cobrar(dono)).corpo;
    const porJob = (await cobrar(dono)).corpo;
    const porAviso = (await cobrar(dono)).corpo;
    expect((await chamar(amb, 'DELETE', '/pagamentos/mercadopago/conexao', { token: dono.token })).status).toBe(204);
    for (const c of [porConsulta, porJob, porAviso]) sim.aprovar(orderDe(c.id));

    // Sem conexão: fica pendente, sem chamar o provedor e com um único evento de falha.
    const antes = consultasAoProvedor();
    for (let i = 0; i < 4; i++) { avancarMs(3000); expect((await consultar(dono, porConsulta.id)).corpo.estado).toBe('aguardando'); }
    expect(consultasAoProvedor()).toBe(antes);
    const falhas = (await eventos(porConsulta.id)).filter((e) => e.tipo === 'falha_consulta');
    expect(falhas).toHaveLength(1);
    expect(falhas[0]!.dados).toMatchObject({ tipo: 'conexao_inativa', repeticoes: 4 });

    const nova = await conectar(dono);
    expect(nova).not.toBe(antiga);
    expect((await avisar(antiga, orderDe(porAviso.id), SEGREDO_A)).status).toBe(401);
    expect((await avisar(nova, orderDe(porAviso.id), SEGREDO_A)).status).toBe(200);
    expect((await linha(porAviso.id)).estado).toBe('paga');
    avancarMs(3000);
    expect((await consultar(dono, porConsulta.id)).corpo.estado).toBe('paga');
    const proxima = (await linha(porJob.id)).proximaConsultaEm!;
    if (proxima > amb.relogio.agora()) amb.relogio.definir(proxima);
    expect((await conciliarCobrancasPix(pix())).confirmadas).toBe(1);
    expect((await linha(porJob.id)).estado).toBe('paga');
  });

  it('resposta antiga aplicada depois do estorno não apaga o alerta nem faz o status regredir; venda com alerta é recusada', async () => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono);
    const { corpo } = await cobrar(dono);
    const order = orderDe(corpo.id);
    sim.aprovar(order);
    await avisar(publico, order, SEGREDO_A);
    const linhaAntiga = await linha(corpo.id);
    const respostaAntiga = lerPedido(structuredClone(sim.orders.get(order)!.corpo));
    sim.definir(order, 'refunded', 'refunded');
    await avisar(publico, order, SEGREDO_A);
    expect(await linha(corpo.id)).toMatchObject({ estado: 'paga', alerta: 'refunded/refunded', statusProvedor: 'refunded' });
    // A consulta que leu "processed/accredited" antes do estorno termina por último, com a linha também lida antes.
    const final = await aplicarPedido(pix(), linhaAntiga, respostaAntiga, 'teste');
    expect(final).toMatchObject({ estado: 'paga', alerta: 'refunded/refunded', statusProvedor: 'refunded', detalheProvedor: 'refunded' });
    expect(await linha(corpo.id)).toMatchObject({ alerta: 'refunded/refunded', statusProvedor: 'refunded' });
    const m = vendaPix(dono, corpo.id, { id: corpo.vendaId });
    expect((await enviar(amb, dono, [m])).corpo.rejeitadas).toEqual([{ id: m.id, motivo: 'pagamento_nao_confirmado' }]);
    expect((await linha(corpo.id)).vinculadaEm).toBeNull();
  });

  it('dez avisos assinados idênticos em menos de 1 s geram no máximo uma consulta', async () => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono);
    const { corpo } = await cobrar(dono);
    avancarMs(3000);
    const antes = consultasAoProvedor();
    const requestId = gerarId();
    for (let i = 0; i < 10; i++) {
      expect((await avisar(publico, orderDe(corpo.id), SEGREDO_A, { requestId, semAvancar: true })).status).toBe(200);
      avancarMs(90);
    }
    expect(consultasAoProvedor() - antes).toBeLessThanOrEqual(1);
    const avisos = (await eventos(corpo.id)).filter((e) => e.tipo === 'aviso_recebido');
    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.dados).toMatchObject({ repeticoes: 10 });
  });

  it('duas primeiras conexões simultâneas resultam numa conexão só, sem erro 500', async () => {
    const dono = await contaEmTeste(amb);
    const [r1, r2] = await Promise.all([
      chamar(amb, 'PUT', '/pagamentos/mercadopago/conexao', { token: dono.token, corpo: { accessToken: TOKEN_A, segredoWebhook: SEGREDO_A } }),
      chamar(amb, 'PUT', '/pagamentos/mercadopago/conexao', { token: dono.token, corpo: { accessToken: TOKEN_B, segredoWebhook: SEGREDO_B } }),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([200, 201]);
    expect(r1.corpo.webhookPath).toBe(r2.corpo.webhookPath);
    expect(await amb.db.$count(schema.conexoesPagamento)).toBe(1);
    // O classificador reconhece a violação real do índice único parcial (o caminho da corrida no PostgreSQL).
    const [conexao] = await amb.db.select().from(schema.conexoesPagamento);
    const erro = await amb.db.insert(schema.conexoesPagamento).values({ ...conexao!, id: gerarId(), publicoId: 'outro-publico' }).then(() => null, (e: unknown) => e);
    expect(violacaoUnica(erro)).toBe(true);
    expect(violacaoUnica(new Error('outra falha'))).toBe(false);
  });

  it('order com outro id e a mesma external_reference não confirma', async () => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono);
    const { corpo } = await cobrar(dono);
    const order = orderDe(corpo.id);
    sim.aprovar(order);
    sim.orders.get(order)!.corpo.id = 'ORD01OUTRAORDER';
    await avisar(publico, order, SEGREDO_A);
    expect(await linha(corpo.id)).toMatchObject({ estado: 'divergente', pagaEm: null });
  });

  it('webhook, consulta, conciliação e cancelamento simultâneos terminam num estado só, com um vínculo', async () => {
    const dono = await contaEmTeste(amb);
    const publico = await conectar(dono);
    const { corpo } = await cobrar(dono);
    sim.aprovar(orderDe(corpo.id));
    avancarMs(31_000);
    const [aviso1, consulta, , cancelamento, aviso2] = await Promise.all([
      avisar(publico, orderDe(corpo.id), SEGREDO_A, { semAvancar: true }),
      consultar(dono, corpo.id),
      conciliarCobrancasPix(pix()),
      cancelar(dono, corpo.id),
      avisar(publico, orderDe(corpo.id), SEGREDO_A, { semAvancar: true }),
    ]);
    expect([aviso1.status, consulta.status, cancelamento.status, aviso2.status]).toEqual([200, 200, 200, 200]);
    expect(cancelamento.corpo.estado).toBe('paga');
    expect(await linha(corpo.id)).toMatchObject({ estado: 'paga', valorPagoCentavos: 700 });
    expect((await eventos(corpo.id)).filter((e) => e.tipo === 'transicao').map((e) => e.dados.para)).toEqual(['paga']);
    const m1 = vendaPix(dono, corpo.id, { id: corpo.vendaId });
    const m2 = { ...m1, id: gerarId() };
    const [p1, p2] = await Promise.all([enviar(amb, dono, [m1]), enviar(amb, dono, [m2])]);
    expect([...p1.corpo.aceitas, ...p2.corpo.aceitas].sort()).toEqual([m1.id, m2.id].sort());
    expect((await eventos(corpo.id)).filter((e) => e.tipo === 'vinculada')).toHaveLength(1);
    expect(await amb.db.$count(schema.vendas)).toBe(1);
    expect(sim.orders.get(orderDe(corpo.id))!.corpo.status).toBe('processed');
  });
});
