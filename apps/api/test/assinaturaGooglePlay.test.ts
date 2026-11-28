import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adicionarDias,
  gerarId,
  MockBillingProvider,
  RelogioFalso,
  type ConfiguracaoCobrancaRes,
} from '@pdv/shared';
import type { FastifyInstance } from 'fastify';
import type { Conexao } from '../src/db/conexao';
import * as schema from '../src/db/schema';
import {
  ErroGooglePlay,
  lerRespostaSubscriptionsV2,
  type CompraAssinaturaPlay,
  type VerificadorGooglePlay,
} from '../src/pagamentos/googlePlayBilling';
import { criarApp } from '../src/servidor';
import { abrirBanco, INICIO, mutacao, produto, tokenDoCartao, NUMEROS, venda } from './ajuda';
import { emissaoTeste } from './emailFixture';

class VerificadorGooglePlaySimulado implements VerificadorGooglePlay {
  compras = new Map<string, CompraAssinaturaPlay>();
  confirmacoes: Array<{ packageName: string; productId: string; purchaseToken: string }> = [];

  async consultarAssinatura(packageName: string, purchaseToken: string): Promise<CompraAssinaturaPlay> {
    const c = this.compras.get(`${packageName}:${purchaseToken}`);
    if (!c) throw new ErroGooglePlay('token_invalido', 404);
    return c;
  }

  async confirmarAssinatura(packageName: string, productId: string, purchaseToken: string): Promise<void> {
    this.confirmacoes.push({ packageName, productId, purchaseToken });
    const atual = this.compras.get(`${packageName}:${purchaseToken}`);
    if (atual) {
      this.compras.set(`${packageName}:${purchaseToken}`, {
        ...atual,
        acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      });
    }
  }
}

let banco: Conexao;
let app: FastifyInstance;
let relogio: RelogioFalso;
let verificador: VerificadorGooglePlaySimulado;

beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });

async function iniciarComModo(opcoes: { cobrancaDesativada: boolean; billingProvider: 'disabled' | 'google_play'; webhookToken?: string | null }) {
  relogio = new RelogioFalso(INICIO);
  verificador = new VerificadorGooglePlaySimulado();
  app = await criarApp({
    db: banco.db,
    relogio,
    billing: new MockBillingProvider(),
    billingProvider: opcoes.billingProvider,
    cobrancaDesativada: opcoes.cobrancaDesativada,
    googlePlay: {
      verificador,
      packageName: 'br.com.pdv.mobile',
      skuProMensal: 'prisma_pro_mensal',
      webhookToken: opcoes.webhookToken === undefined ? 'segredo-rtdn-play' : opcoes.webhookToken,
    },
    ...(process.env.NODE_ENV === 'production' ? { emissaoCodigo: emissaoTeste } : {}),
    fontesEan: [],
  });
}

afterEach(async () => {
  vi.unstubAllEnvs();
  if (app) await app.close();
});

async function injetar<T = any>(
  metodo: 'GET' | 'POST' | 'PUT',
  url: string,
  opts: { token?: string; headers?: Record<string, string>; corpo?: unknown } = {},
) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const res = await app.inject({
    method: metodo,
    url,
    headers,
    ...(opts.corpo === undefined ? {} : { payload: opts.corpo as object }),
  });
  return { status: res.statusCode, corpo: res.body ? (res.json() as T) : (undefined as T) };
}

let seqConta = 0;
async function criarContaLocal() {
  seqConta += 1;
  const r = await injetar('POST', '/contas', {
    corpo: {
      email: `play${seqConta}@exemplo.com.br`,
      nomeResponsavel: 'Carlos Lojista',
      nomeLoja: `Loja Play ${seqConta}`,
      documento: String(20_000_000_000 + seqConta),
      aparelhoId: gerarId(),
      aparelhoNome: 'Android',
    },
  });
  expect(r.status).toBe(201);
  return r.corpo;
}

function envelopeRtdn(payload: Record<string, unknown>) {
  return {
    message: {
      data: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
    },
  };
}

describe('Google Play Billing e modo gratuito', () => {
  beforeEach(async () => {
    await banco.db.execute('truncate table contas cascade');
  });

  it('mantém modo gratuito como padrão configurável sem alterar o binário', async () => {
    await iniciarComModo({ cobrancaDesativada: true, billingProvider: 'disabled' });
    const cfg = await injetar<ConfiguracaoCobrancaRes>('GET', '/assinatura/configuracao');
    expect(cfg.status).toBe(200);
    expect(cfg.corpo).toEqual({
      modoGratuito: true,
      canal: 'disabled',
      planoPadrao: 'free',
      packageName: 'br.com.pdv.mobile',
      skuProMensal: 'prisma_pro_mensal',
    });

    const conta = await criarContaLocal();
    const ass = await injetar('GET', '/assinatura', { token: conta.token });
    expect(ass.corpo.assinatura.status).toBe('liberada');
  });

  it('inicia contas em Free no modo google_play, valida/confirma compra Pro e preserva leitura/exportação quando suspensa', async () => {
    await iniciarComModo({ cobrancaDesativada: false, billingProvider: 'google_play' });

    const cfg = await injetar<ConfiguracaoCobrancaRes>('GET', '/assinatura/configuracao');
    expect(cfg.corpo.modoGratuito).toBe(false);
    expect(cfg.corpo.canal).toBe('google_play');
    expect(cfg.corpo.planoPadrao).toBe('free');

    const conta = await criarContaLocal();
    const assInicial = await injetar('GET', '/assinatura', { token: conta.token });
    expect(assInicial.corpo.assinatura.status).toBe('ativa');
    expect(assInicial.corpo.assinatura.planoId).toBe('free');

    // Plano Free permite vender sem limite de quantidade de vendas.
    const vFree = venda(conta);
    const pFree = await injetar('POST', '/sync/push', {
      token: conta.token,
      corpo: { aparelhoId: conta.aparelhoId, mutacoes: [mutacao('venda', vFree)] },
    });
    expect(pFree.status).toBe(200);
    expect(pFree.corpo.aceitas).toHaveLength(1);

    // Compra pendente é recusada antes de confirmar.
    const tokenPendente = 'tok-pendente-1';
    verificador.compras.set(`br.com.pdv.mobile:${tokenPendente}`, {
      subscriptionState: 'SUBSCRIPTION_STATE_PENDING',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
      startTime: INICIO,
      expiryTime: adicionarDias(INICIO, 30),
      autoRenewing: true,
      orderId: 'GPA.0001',
      productId: 'prisma_pro_mensal',
      emTesteGratis: false,
    });
    const resPend = await injetar('POST', '/assinatura/google-play/confirmar', {
      token: conta.token,
      corpo: { purchaseToken: tokenPendente, productId: 'prisma_pro_mensal', packageName: 'br.com.pdv.mobile' },
    });
    expect(resPend.status).toBe(409);
    expect(resPend.corpo.erro).toBe('compra_pendente');
    expect(verificador.confirmacoes).toHaveLength(0);

    // Compra em teste grátis é validada, reconhecida (ACK) e libera plano Pro em em_teste.
    const tokenPro = 'tok-pro-ativo-1';
    const expira = adicionarDias(INICIO, 7);
    verificador.compras.set(`br.com.pdv.mobile:${tokenPro}`, {
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
      startTime: INICIO,
      expiryTime: expira,
      autoRenewing: true,
      orderId: 'GPA.0002',
      productId: 'prisma_pro_mensal',
      emTesteGratis: true,
    });
    const resPro = await injetar('POST', '/assinatura/google-play/confirmar', {
      token: conta.token,
      corpo: { purchaseToken: tokenPro, productId: 'prisma_pro_mensal', packageName: 'br.com.pdv.mobile' },
    });
    expect(resPro.status).toBe(200);
    expect(resPro.corpo.assinatura.status).toBe('em_teste');
    expect(resPro.corpo.assinatura.planoId).toBe('pro');
    expect(verificador.confirmacoes).toHaveLength(1);

    // Token não pode ser reutilizado em outra conta.
    const outra = await criarContaLocal();
    const resRoubo = await injetar('POST', '/assinatura/google-play/confirmar', {
      token: outra.token,
      corpo: { purchaseToken: tokenPro, productId: 'prisma_pro_mensal', packageName: 'br.com.pdv.mobile' },
    });
    expect(resRoubo.status).toBe(409);
    expect(resRoubo.corpo.erro).toBe('token_em_outra_conta');

    // RTDN sem token válido é rejeitado quando webhookToken configurado.
    const rtdnNaoAuth = await injetar('POST', '/webhooks/pdv-google-play', { corpo: {} });
    expect(rtdnNaoAuth.status).toBe(401);

    // RTDN de falha de pagamento (carência / IN_GRACE_PERIOD).
    verificador.compras.set(`br.com.pdv.mobile:${tokenPro}`, {
      subscriptionState: 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      startTime: INICIO,
      expiryTime: adicionarDias(INICIO, 10),
      autoRenewing: true,
      orderId: 'GPA.0002',
      productId: 'prisma_pro_mensal',
      emTesteGratis: false,
    });
    const rGrace = await injetar('POST', '/webhooks/pdv-google-play?token=segredo-rtdn-play', {
      corpo: envelopeRtdn({
        packageName: 'br.com.pdv.mobile',
        eventTimeMillis: 1000,
        subscriptionNotification: { subscriptionId: 'prisma_pro_mensal', purchaseToken: tokenPro, notificationType: 6 },
      }),
    });
    expect(rGrace.status).toBe(200);
    expect(rGrace.corpo.estado).toBe('inadimplente');

    // A Play envia renovações sem subscriptionId no formato atual da RTDN.
    verificador.compras.set(`br.com.pdv.mobile:${tokenPro}`, {
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      startTime: INICIO,
      expiryTime: adicionarDias(INICIO, 37),
      autoRenewing: true,
      orderId: 'GPA.0002..0',
      productId: 'prisma_pro_mensal',
      emTesteGratis: false,
    });
    const rRenov = await injetar('POST', '/webhooks/pdv-google-play?token=segredo-rtdn-play', {
      corpo: envelopeRtdn({
        packageName: 'br.com.pdv.mobile',
        eventTimeMillis: '2000',
        subscriptionNotification: { version: '1.0', purchaseToken: tokenPro, notificationType: 2 },
      }),
    });
    expect(rRenov.corpo.estado).toBe('ativa');

    // Evento fora de ordem (eventTimeMillis = 1500 < 2000) é ignorado sem regressão.
    verificador.compras.set(`br.com.pdv.mobile:${tokenPro}`, {
      subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      startTime: INICIO,
      expiryTime: INICIO,
      autoRenewing: false,
      orderId: 'GPA.0002',
      productId: 'prisma_pro_mensal',
      emTesteGratis: false,
    });
    const rAntigo = await injetar('POST', '/webhooks/pdv-google-play?token=segredo-rtdn-play', {
      corpo: envelopeRtdn({
        packageName: 'br.com.pdv.mobile',
        eventTimeMillis: 1500,
        subscriptionNotification: { subscriptionId: 'prisma_pro_mensal', purchaseToken: tokenPro, notificationType: 13 },
      }),
    });
    expect(rAntigo.corpo.motivo).toBe('evento_fora_de_ordem');
    expect((await injetar('GET', '/assinatura', { token: conta.token })).corpo.assinatura.status).toBe('ativa');

    // Cancelamento preserva acesso até o fim do período e permite restauração.
    verificador.compras.set(`br.com.pdv.mobile:${tokenPro}`, {
      subscriptionState: 'SUBSCRIPTION_STATE_CANCELED',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      startTime: INICIO,
      expiryTime: adicionarDias(INICIO, 37),
      autoRenewing: false,
      orderId: 'GPA.0002..0',
      productId: 'prisma_pro_mensal',
      emTesteGratis: false,
    });
    const rCancel = await injetar('POST', '/webhooks/pdv-google-play?token=segredo-rtdn-play', {
      corpo: envelopeRtdn({
        packageName: 'br.com.pdv.mobile',
        eventTimeMillis: 3000,
        subscriptionNotification: { subscriptionId: 'prisma_pro_mensal', purchaseToken: tokenPro, notificationType: 3 },
      }),
    });
    expect(rCancel.corpo.estado).toBe('cancelada');
    const rest = await injetar('POST', '/assinatura/google-play/restaurar', {
      token: conta.token,
      corpo: { purchaseToken: tokenPro, productId: 'prisma_pro_mensal', packageName: 'br.com.pdv.mobile' },
    });
    expect(rest.status).toBe(200);
    expect(rest.corpo.assinatura.acessoAte).not.toBeNull();

    // Expiração/reembolso suspende recursos Pro, mas preserva leitura (pull) e exportação!
    verificador.compras.set(`br.com.pdv.mobile:${tokenPro}`, {
      subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      startTime: INICIO,
      expiryTime: INICIO,
      autoRenewing: false,
      orderId: 'GPA.0002..0',
      productId: 'prisma_pro_mensal',
      emTesteGratis: false,
    });
    const rExp = await injetar('POST', '/webhooks/pdv-google-play?token=segredo-rtdn-play', {
      corpo: envelopeRtdn({
        packageName: 'br.com.pdv.mobile',
        eventTimeMillis: 4000,
        subscriptionNotification: { subscriptionId: 'prisma_pro_mensal', purchaseToken: tokenPro, notificationType: 12 },
      }),
    });
    expect(rExp.corpo.estado).toBe('suspensa');

    const pull = await injetar('GET', '/sync/pull?desde=0', { token: conta.token });
    expect(pull.status).toBe(200);
    expect(pull.corpo.mudancas.length).toBeGreaterThanOrEqual(1);

    const exportacao = await injetar('GET', '/suporte/exportacao', { token: conta.token });
    expect(exportacao.status).toBe(200);
    expect(exportacao.corpo.vendas).toHaveLength(1);

    // Usuário suspenso pode voltar para o plano Free e vender normalmente.
    const voltaFree = await injetar('POST', '/assinatura/gratuito', { token: conta.token });
    expect(voltaFree.status).toBe(200);
    expect(voltaFree.corpo.assinatura.planoId).toBe('free');
    expect(voltaFree.corpo.assinatura.status).toBe('ativa');

    const pNovo = await injetar('POST', '/sync/push', {
      token: conta.token,
      corpo: { aparelhoId: conta.aparelhoId, mutacoes: [mutacao('produto', produto(conta.lojaId))] },
    });
    expect(pNovo.status).toBe(200);
    expect(pNovo.corpo.aceitas).toHaveLength(1);
  });

  it('bloqueia todas as rotas legadas de assinatura com 409 gerenciado_pela_google_play quando BILLING_PROVIDER=google_play', async () => {
    await iniciarComModo({ cobrancaDesativada: false, billingProvider: 'google_play' });
    const conta = await criarContaLocal();
    const tokenCartao = tokenDoCartao(NUMEROS.aprova);

    const chamadasLegadas: Array<['POST' | 'PUT', string, unknown?]> = [
      ['POST', '/assinatura', { planoId: 'pro', tokenCartao }],
      ['POST', '/assinatura/trocar-plano', { planoId: 'pro' }],
      ['PUT', '/assinatura/cartao', { tokenCartao }],
      ['POST', '/assinatura/cancelar', undefined],
      ['POST', '/assinatura/reativar', { planoId: 'pro' }],
    ];

    for (const [metodo, url, corpo] of chamadasLegadas) {
      const res = await injetar(metodo, url, { token: conta.token, ...(corpo ? { corpo } : {}) });
      expect(res.status, `${metodo} ${url} no plano Free`).toBe(409);
      expect(res.corpo.erro).toBe('gerenciado_pela_google_play');
    }

    // Ativa assinatura Pro pela Play (em teste grátis e depois ativa paga) e garante que rotas legadas seguem bloqueadas.
    const tokPlay = 'tok-pro-bloqueio-legado';
    verificador.compras.set(`br.com.pdv.mobile:${tokPlay}`, {
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      startTime: INICIO,
      expiryTime: adicionarDias(INICIO, 7),
      autoRenewing: true,
      orderId: 'GPA.7777',
      productId: 'prisma_pro_mensal',
      emTesteGratis: true,
    });
    expect((await injetar('POST', '/assinatura/google-play/confirmar', {
      token: conta.token,
      corpo: { purchaseToken: tokPlay, productId: 'prisma_pro_mensal', packageName: 'br.com.pdv.mobile' },
    })).status).toBe(200);

    for (const [metodo, url, corpo] of chamadasLegadas) {
      const res = await injetar(metodo, url, { token: conta.token, ...(corpo ? { corpo } : {}) });
      expect(res.status, `${metodo} ${url} em Pro em_teste`).toBe(409);
      expect(res.corpo.erro).toBe('gerenciado_pela_google_play');
    }

    verificador.compras.set(`br.com.pdv.mobile:${tokPlay}`, {
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      startTime: INICIO,
      expiryTime: adicionarDias(INICIO, 37),
      autoRenewing: true,
      orderId: 'GPA.7777..0',
      productId: 'prisma_pro_mensal',
      emTesteGratis: false,
    });
    expect((await injetar('POST', '/assinatura/google-play/restaurar', {
      token: conta.token,
      corpo: { purchaseToken: tokPlay, productId: 'prisma_pro_mensal', packageName: 'br.com.pdv.mobile' },
    })).status).toBe(200);

    for (const [metodo, url, corpo] of chamadasLegadas) {
      const res = await injetar(metodo, url, { token: conta.token, ...(corpo ? { corpo } : {}) });
      expect(res.status, `${metodo} ${url} em Pro ativa`).toBe(409);
      expect(res.corpo.erro).toBe('gerenciado_pela_google_play');
    }
  });

  it('exige PDV_PLAY_WEBHOOK_TOKEN no webhook RTDN em produção (503 se ausente, 401 se inválido, 200 com Bearer válido)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await iniciarComModo({ cobrancaDesativada: false, billingProvider: 'google_play', webhookToken: null });
    const semConfig = await injetar('POST', '/webhooks/pdv-google-play', {
      corpo: envelopeRtdn({ packageName: 'br.com.pdv.mobile', eventTimeMillis: 1000, testNotification: { version: '1.0' } }),
    });
    expect(semConfig.status).toBe(503);
    expect(semConfig.corpo.erro).toBe('webhook_nao_configurado');
    await app.close();

    await iniciarComModo({ cobrancaDesativada: false, billingProvider: 'google_play', webhookToken: 'segredo-prod' });
    const semToken = await injetar('POST', '/webhooks/pdv-google-play', {
      corpo: envelopeRtdn({ packageName: 'br.com.pdv.mobile', eventTimeMillis: 1000, testNotification: { version: '1.0' } }),
    });
    expect(semToken.status).toBe(401);
    expect(semToken.corpo.erro).toBe('token_webhook_invalido');

    const tokenErrado = await injetar('POST', '/webhooks/pdv-google-play', {
      headers: { authorization: 'Bearer segredo-errado' },
      corpo: envelopeRtdn({ packageName: 'br.com.pdv.mobile', eventTimeMillis: 1000, testNotification: { version: '1.0' } }),
    });
    expect(tokenErrado.status).toBe(401);

    const tokenValido = await injetar('POST', '/webhooks/pdv-google-play', {
      headers: { authorization: 'Bearer segredo-prod' },
      corpo: envelopeRtdn({ packageName: 'br.com.pdv.mobile', eventTimeMillis: 1000, testNotification: { version: '1.0' } }),
    });
    expect(tokenValido.status).toBe(200);
    expect(tokenValido.corpo).toEqual({ recebido: true, processado: true, motivo: 'teste' });
  });

  it('refina emTesteGratis e latestSuccessfulOrderId em lerRespostaSubscriptionsV2', () => {
    const base = {
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      startTime: '2026-03-10T12:00:00.000Z',
    };

    const viaOfferPhaseTrial = lerRespostaSubscriptionsV2({
      ...base,
      lineItems: [{
        productId: 'prisma_pro_mensal',
        expiryTime: '2026-03-17T12:00:00.000Z',
        latestSuccessfulOrderId: 'GPA.1000',
        offerDetails: { basePlanId: 'mensal', offerId: 'qualquer-id' },
        offerPhase: { freeTrial: {} },
      }],
    });
    expect(viaOfferPhaseTrial.emTesteGratis).toBe(true);
    expect(viaOfferPhaseTrial.orderId).toBe('GPA.1000');

    const introComOfferIdTrial = lerRespostaSubscriptionsV2({
      ...base,
      lineItems: [{
        productId: 'prisma_pro_mensal',
        expiryTime: '2026-04-10T12:00:00.000Z',
        latestSuccessfulOrderId: 'GPA.1001',
        offerDetails: { basePlanId: 'mensal', offerId: 'trial-7d' },
        offerPhase: { introductoryPrice: {} },
      }],
    });
    expect(introComOfferIdTrial.emTesteGratis).toBe(false);

    const basePrice = lerRespostaSubscriptionsV2({
      ...base,
      lineItems: [{
        productId: 'prisma_pro_mensal',
        expiryTime: '2026-04-10T12:00:00.000Z',
        latestSuccessfulOrderId: 'GPA.1002',
        offerPhase: { basePrice: {} },
      }],
    });
    expect(basePrice.emTesteGratis).toBe(false);

    const promoSemOfferPhase = lerRespostaSubscriptionsV2({
      ...base,
      lineItems: [{
        productId: 'prisma_pro_mensal',
        expiryTime: '2026-04-10T12:00:00.000Z',
        latestSuccessfulOrderId: 'GPA.1003',
        offerDetails: { basePlanId: 'mensal', offerId: 'promo-lancamento', offerTags: ['desconto'] },
      }],
    });
    expect(promoSemOfferPhase.emTesteGratis).toBe(false);

    const trialPorIdSemOfferPhase = lerRespostaSubscriptionsV2({
      ...base,
      lineItems: [{
        productId: 'prisma_pro_mensal',
        expiryTime: '2026-03-17T12:00:00.000Z',
        latestSuccessfulOrderId: 'GPA.1111',
        offerDetails: { basePlanId: 'mensal', offerId: 'teste-gratis-7d' },
      }],
    });
    expect(trialPorIdSemOfferPhase.emTesteGratis).toBe(true);
    expect(trialPorIdSemOfferPhase.orderId).toBe('GPA.1111');

    const renovacaoMesmoOfferId = lerRespostaSubscriptionsV2({
      ...base,
      lineItems: [{
        productId: 'prisma_pro_mensal',
        expiryTime: '2026-04-17T12:00:00.000Z',
        latestSuccessfulOrderId: 'GPA.1111..0',
        offerDetails: { basePlanId: 'mensal', offerId: 'teste-gratis-7d' },
      }],
    });
    expect(renovacaoMesmoOfferId.emTesteGratis).toBe(false);
  });
});
