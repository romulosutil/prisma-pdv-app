import { randomBytes } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { gerarId, type CobrancaPix } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import * as schema from '../src/db/schema';
import type { ConfigPagamentos } from '../src/deps';
import { criarCifradorPagamentos } from '../src/pagamentos/cifrador';
import type {
  LinkInfinitePay,
  PedidoInfinitePayEntrada,
  ProvedorInfinitePay,
  ResultadoVerificacaoInfinitePay,
  VerificacaoInfinitePayEntrada,
} from '../src/pagamentos/infinitePay';
import { ambientePix, conciliarCobrancasPix } from '../src/servicos/cobrancasPix';
import { EXPIRACAO_INFINITEPAY_MS } from '../src/pagamentos/infinitePay';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, mutacao, NUMEROS, venda, type Ambiente } from './ajuda';
import { ProvedorMercadoPagoSimulado } from './provedorMercadoPagoSimulado';

const CHAVE = randomBytes(32).toString('base64');

class ProvedorInfinitePaySimulado implements ProvedorInfinitePay {
  chamadasLink: PedidoInfinitePayEntrada[] = [];
  chamadasCheck: VerificacaoInfinitePayEntrada[] = [];
  respostasCheck = new Map<string, ResultadoVerificacaoInfinitePay>();
  slugSequencia = 0;

  async criarLinkCheckout(pedido: PedidoInfinitePayEntrada): Promise<LinkInfinitePay> {
    this.chamadasLink.push(pedido);
    this.slugSequencia += 1;
    const slug = `slug-ip-${this.slugSequencia}`;
    return {
      url: `https://checkout.infinitepay.io/${pedido.handle}/${slug}`,
      slug,
      expiraEm: new Date(pedido.expiraEm),
    };
  }

  async verificarPagamento(entrada: VerificacaoInfinitePayEntrada): Promise<ResultadoVerificacaoInfinitePay> {
    this.chamadasCheck.push(entrada);
    return (
      this.respostasCheck.get(entrada.orderNsu) ?? {
        success: true,
        paid: false,
        amount: null,
        paidAmount: null,
        installments: null,
        captureMethod: null,
      }
    );
  }
}

let banco: Conexao;
let amb: Ambiente;
let simIp: ProvedorInfinitePaySimulado;
let config: ConfigPagamentos;

beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });

beforeEach(async () => {
  simIp = new ProvedorInfinitePaySimulado();
  config = {
    cifrador: criarCifradorPagamentos(CHAVE),
    mercadoPago: new ProvedorMercadoPagoSimulado(),
    infinitePay: simIp,
    urlPublicaApi: 'https://api.prismapdv.exemplo',
    pagadorEmail: 'pagador@exemplo.com.br',
  };
  amb = await criarAmbiente(banco, undefined, [], undefined, { pagamentos: config });
});

afterEach(async () => { await amb.fechar(); });

describe('InfinitePay Checkout Integrado e payment_check', () => {
  it('conecta e desconecta handle + apiKey opcional sem devolver segredo', async () => {
    const conta = await contaEmTeste(amb, 'pro');

    const vazio = await chamar(amb, 'GET', '/pagamentos/infinitepay/conexao', { token: conta.token });
    expect(vazio.status).toBe(200);
    expect(vazio.corpo).toMatchObject({ conectada: false, handle: null, temApiKey: false, webhookPath: null });

    const criada = await chamar(amb, 'PUT', '/pagamentos/infinitepay/conexao', {
      token: conta.token,
      corpo: { handle: 'loja-da-maria', apiKey: 'ip-key-secreta-123' },
    });
    expect(criada.status).toBe(201);
    expect(criada.corpo).toMatchObject({
      conectada: true,
      handle: 'loja-da-maria',
      temApiKey: true,
    });
    expect(criada.corpo.webhookPath).toMatch(/^\/webhooks\/pdv-infinitepay\//);
    expect(JSON.stringify(criada.corpo)).not.toContain('ip-key-secreta-123');

    const removida = await chamar(amb, 'DELETE', '/pagamentos/infinitepay/conexao', { token: conta.token });
    expect(removida.status).toBe(204);

    const apos = await chamar(amb, 'GET', '/pagamentos/infinitepay/conexao', { token: conta.token });
    expect(apos.corpo.conectada).toBe(false);
  });

  it('cria cobrança Checkout de forma idempotente, rejeita conflito e nunca confia em webhook sem payment_check', async () => {
    const conta = await contaEmTeste(amb, 'pro');
    const outra = await contaEmTeste(amb, 'pro', NUMEROS.outroAprova);

    const semConexao = await chamar(amb, 'POST', '/pagamentos/cobrancas', {
      token: conta.token,
      corpo: { vendaId: gerarId(), pagamentoId: gerarId(), valorCentavos: 700, provedor: 'infinitepay', meio: 'pix' },
    });
    expect(semConexao.status).toBe(409);
    expect(semConexao.corpo.erro).toBe('infinitepay_nao_conectado');

    const conn = await chamar(amb, 'PUT', '/pagamentos/infinitepay/conexao', {
      token: conta.token,
      corpo: { handle: 'loja-maria' },
    });
    const publicoId = String(conn.corpo.webhookPath).split('/').pop()!;

    const vendaId = gerarId();
    const pagamentoId = gerarId();
    const c1 = await chamar<CobrancaPix>(amb, 'POST', '/pagamentos/cobrancas', {
      token: conta.token,
      corpo: { vendaId, pagamentoId, valorCentavos: 700, provedor: 'infinitepay', meio: 'pix', descricao: 'Combo Balcão' },
    });
    expect(c1.status).toBe(201);
    expect(c1.corpo).toMatchObject({
      id: pagamentoId,
      vendaId,
      estado: 'aguardando',
      valorCentavos: 700,
      provedor: 'infinitepay',
      meio: 'pix',
    });
    expect(c1.corpo.checkoutUrl).toContain('https://checkout.infinitepay.io/loja-maria/slug-ip-1');
    expect(simIp.chamadasLink[0]?.webhookUrl).toBe(`https://api.prismapdv.exemplo/webhooks/pdv-infinitepay/${publicoId}`);

    // Idempotência: segundo POST não cria novo link.
    const c2 = await chamar<CobrancaPix>(amb, 'POST', '/pagamentos/cobrancas', {
      token: conta.token,
      corpo: { vendaId, pagamentoId, valorCentavos: 700, provedor: 'infinitepay', meio: 'pix' },
    });
    expect(c2.status).toBe(200);
    expect(simIp.chamadasLink).toHaveLength(1);

    // Conflito com valor distinto.
    const conflito = await chamar(amb, 'POST', '/pagamentos/cobrancas', {
      token: conta.token,
      corpo: { vendaId, pagamentoId, valorCentavos: 900, provedor: 'infinitepay', meio: 'pix' },
    });
    expect(conflito.status).toBe(409);

    // Outra loja não acessa cobrança da loja Maria.
    const isolada = await chamar(amb, 'GET', `/pagamentos/cobrancas/${pagamentoId}`, { token: outra.token });
    expect(isolada.status).toBe(404);

    // Webhook falso afirmando pago enquanto payment_check responde paid=false não confirma.
    simIp.respostasCheck.set(pagamentoId, {
      success: true,
      paid: false,
      amount: 700,
      paidAmount: 0,
      installments: null,
      captureMethod: null,
    });
    const whFalso = await chamar(amb, 'POST', `/webhooks/pdv-infinitepay/${publicoId}`, {
      corpo: { order_nsu: pagamentoId, transaction_nsu: 'tx-1', invoice_slug: 'slug-ip-1', paid: true, paid_amount: 700 },
    });
    expect(whFalso.status).toBe(200);
    expect(simIp.chamadasCheck).toHaveLength(1);

    amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 4000));
    const aposFalso = await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${pagamentoId}`, { token: conta.token });
    expect(aposFalso.corpo.estado).toBe('aguardando');

    // Sync rejeita venda antes do pagamento confirmado.
    const vNaoPaga = venda(conta, {
      id: vendaId,
      pagamentos: [{ id: pagamentoId, meio: 'pix', provedor: 'infinitepay', valorCentavos: 700, trocoCentavos: 0 }],
    });
    const pushAntes = await enviar(amb, conta, [mutacao('venda', vNaoPaga)]);
    expect(pushAntes.corpo.rejeitadas).toEqual([{ id: expect.any(String), motivo: 'pagamento_nao_confirmado' }]);

    // payment_check confirma pago com valor exato -> webhook marca paga e sync vincula uma única vez.
    simIp.respostasCheck.set(pagamentoId, {
      success: true,
      paid: true,
      amount: 700,
      paidAmount: 700,
      installments: 1,
      captureMethod: 'pix',
    });
    const whPago = await chamar(amb, 'POST', `/webhooks/pdv-infinitepay/${publicoId}`, {
      corpo: { order_nsu: pagamentoId, transaction_nsu: 'tx-1', invoice_slug: 'slug-ip-1' },
    });
    expect(whPago.status).toBe(200);

    const estadoPago = await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${pagamentoId}`, { token: conta.token });
    expect(estadoPago.corpo.estado).toBe('paga');
    expect(estadoPago.corpo.valorPagoCentavos).toBe(700);

    // Webhook duplicado/fora de ordem não regride o estado.
    simIp.respostasCheck.set(pagamentoId, {
      success: true,
      paid: false,
      amount: 700,
      paidAmount: 0,
      installments: null,
      captureMethod: null,
    });
    await chamar(amb, 'POST', `/webhooks/pdv-infinitepay/${publicoId}`, {
      corpo: { order_nsu: pagamentoId, transaction_nsu: 'tx-1', invoice_slug: 'slug-ip-1' },
    });
    const aposDuplicado = await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${pagamentoId}`, { token: conta.token });
    expect(aposDuplicado.corpo.estado).toBe('paga');

    const pushPago = await enviar(amb, conta, [mutacao('venda', vNaoPaga)]);
    expect(pushPago.corpo.aceitas).toHaveLength(1);
    expect(pushPago.corpo.rejeitadas).toEqual([]);

    // Reutilizar mesma cobrança paga em segunda venda é rejeitado.
    const vReuso = venda(conta, {
      pagamentos: [{ id: pagamentoId, meio: 'pix', provedor: 'infinitepay', valorCentavos: 700, trocoCentavos: 0 }],
    });
    const pushReuso = await enviar(amb, conta, [mutacao('venda', vReuso)]);
    expect(pushReuso.corpo.rejeitadas).toEqual([{ id: expect.any(String), motivo: 'pagamento_nao_confirmado' }]);
  });

  it('marca divergente para valor pago menor e suporta cancelamento, expiração e paga_tardia na conciliação', async () => {
    const conta = await contaEmTeste(amb, 'pro');
    const conn = await chamar(amb, 'PUT', '/pagamentos/infinitepay/conexao', {
      token: conta.token,
      corpo: { handle: 'loja-maria' },
    });
    const publicoId = String(conn.corpo.webhookPath).split('/').pop()!;

    // Caso 1: valor divergente.
    const divId = gerarId();
    await chamar(amb, 'POST', '/pagamentos/cobrancas', {
      token: conta.token,
      corpo: { vendaId: gerarId(), pagamentoId: divId, valorCentavos: 1000, provedor: 'infinitepay', meio: 'cartao_credito' },
    });
    simIp.respostasCheck.set(divId, {
      success: true,
      paid: true,
      amount: 1000,
      paidAmount: 900,
      installments: 1,
      captureMethod: 'credit_card',
    });
    await chamar(amb, 'POST', `/webhooks/pdv-infinitepay/${publicoId}`, {
      corpo: { order_nsu: divId, transaction_nsu: 'tx-div', invoice_slug: 'slug-ip-1' },
    });
    const resDiv = await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${divId}`, { token: conta.token });
    expect(resDiv.corpo.estado).toBe('divergente');

    // Caso 2: cancelamento e pagamento tardio via conciliação.
    const tardiaId = gerarId();
    await chamar(amb, 'POST', '/pagamentos/cobrancas', {
      token: conta.token,
      corpo: { vendaId: gerarId(), pagamentoId: tardiaId, valorCentavos: 700, provedor: 'infinitepay', meio: 'pix' },
    });
    const cancelada = await chamar<CobrancaPix>(amb, 'POST', `/pagamentos/cobrancas/${tardiaId}/cancelar`, { token: conta.token });
    expect(cancelada.corpo.estado).toBe('cancelada');

    await amb.db.update(schema.cobrancasPagamento)
      .set({ transacaoProvedorId: 'tx-tardio', slugProvedor: 'slug-ip-2' })
      .where(eq(schema.cobrancasPagamento.id, tardiaId));
    simIp.respostasCheck.set(tardiaId, {
      success: true,
      paid: true,
      amount: 700,
      paidAmount: 700,
      installments: 1,
      captureMethod: 'pix',
    });
    amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 15 * 60_000));
    const resumo = await conciliarCobrancasPix(ambientePix({ db: amb.db, relogio: amb.relogio, pagamentos: config }));
    expect(resumo.confirmadas).toBe(1);

    const aposTardia = await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${tardiaId}`, { token: conta.token });
    expect(aposTardia.corpo.estado).toBe('paga_tardia');

    // Caso 3: expiração local na conciliação sem transaction_nsu.
    const expId = gerarId();
    await chamar(amb, 'POST', '/pagamentos/cobrancas', {
      token: conta.token,
      corpo: { vendaId: gerarId(), pagamentoId: expId, valorCentavos: 500, provedor: 'infinitepay', meio: 'cartao_debito' },
    });
    amb.relogio.definir(new Date(amb.relogio.agora().getTime() + EXPIRACAO_INFINITEPAY_MS + 60_000));
    const resExp = await conciliarCobrancasPix(ambientePix({ db: amb.db, relogio: amb.relogio, pagamentos: config }));
    expect(resExp.encerradas).toBe(1);

    const estadoExp = await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${expId}`, { token: conta.token });
    expect(estadoExp.corpo.estado).toBe('expirada');
  });
});
