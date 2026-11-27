import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { gerarId, type CobrancaPix, type Sessao } from '@pdv/shared';
import { lerConfiguracaoOAuthMercadoPago, type ConfiguracaoOAuthMercadoPago } from '../src/configuracao';
import type { Conexao } from '../src/db/conexao';
import * as schema from '../src/db/schema';
import type { ConfigPagamentos } from '../src/deps';
import { assinarManifesto, manifestoAssinatura } from '../src/pagamentos/assinaturaWebhook';
import { criarCifradorPagamentos } from '../src/pagamentos/cifrador';
import { ErroProvedorMp } from '../src/pagamentos/mercadoPago';
import { ambientePix, conciliarCobrancasPix } from '../src/servicos/cobrancasPix';
import { comTokenDaLoja, conexaoAtiva, renovarTokensOAuth } from '../src/servicos/conexoesMercadoPago';
import { criarApp } from '../src/servidor';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, criarConta, enviar, mutacao, NUMEROS, venda, type Ambiente } from './ajuda';
import { ProvedorMercadoPagoSimulado } from './provedorMercadoPagoSimulado';

// Credenciais fictícias da aplicação da plataforma e dos vendedores (formato diferente das reais).
const OAUTH: ConfiguracaoOAuthMercadoPago = {
  clientId: 'cliente-simulado-0001',
  clientSecret: 'TESTE-SIMULADO-SEGREDO-APLICACAO',
  redirectUri: 'https://api.exemplo.invalid/pagamentos/mercadopago/oauth/retorno',
  webhookSegredo: 'segredo-simulado-plataforma',
  pkce: true,
  testToken: false,
};
const CHAVE = randomBytes(32).toString('base64');
const DIA = 24 * 60 * 60_000;

type Conta = Awaited<ReturnType<typeof contaEmTeste>>;
let banco: Conexao;
let amb: Ambiente;
let sim: ProvedorMercadoPagoSimulado;
let config: ConfigPagamentos;

beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => {
  sim = new ProvedorMercadoPagoSimulado();
  config = { cifrador: criarCifradorPagamentos(CHAVE), mercadoPago: sim, pagadorEmail: 'pagador@exemplo.com.br', oauth: OAUTH };
  amb = await criarAmbiente(banco, undefined, [], undefined, { pagamentos: config });
});
afterEach(async () => { await amb.fechar(); });

const pix = () => ambientePix({ db: amb.db, relogio: amb.relogio, pagamentos: config });
const avancarMs = (ms: number) => amb.relogio.definir(new Date(amb.relogio.agora().getTime() + ms));
const iniciar = (conta: { token: string }) => chamar<{ url: string }>(amb, 'POST', '/pagamentos/mercadopago/oauth/inicio', { token: conta.token });

async function retorno(consulta: Record<string, string>) {
  const res = await amb.app.inject({ method: 'GET', url: `/pagamentos/mercadopago/oauth/retorno?${new URLSearchParams(consulta)}` });
  return { status: res.statusCode, html: res.body, headers: res.headers };
}

async function conectarOAuth(conta: { token: string }, usuario = '123456789') {
  const inicio = await iniciar(conta);
  expect(inicio.status, JSON.stringify(inicio.corpo)).toBe(201);
  const { code, state } = sim.autorizar(inicio.corpo.url, usuario);
  const r = await retorno({ code, state });
  expect(r.status, r.html).toBe(200);
  return { code, state, url: inicio.corpo.url };
}

const conexaoDe = async (lojaId: string) => (await conexaoAtiva(amb.db, lojaId))!;
const linha = async (id: string) => (await amb.db.select().from(schema.cobrancasPagamento).where(eq(schema.cobrancasPagamento.id, id)))[0]!;
const orderDe = (pagamentoId: string) => sim.idDaChave(`pdv-pix-${pagamentoId}`);
async function cobrar(conta: { token: string }) {
  const r = await chamar<CobrancaPix & { erro?: string }>(amb, 'POST', '/pagamentos/cobrancas', { token: conta.token, corpo: { vendaId: gerarId(), pagamentoId: gerarId(), valorCentavos: 700 } });
  return r;
}
const acessoAtual = async (lojaId: string) => {
  const c = await conexaoDe(lojaId);
  return config.cifrador!.decifrar(c.tokenEnvelope, { lojaId, conexaoId: c.id, campo: 'token' });
};

async function avisarPlataforma(dataId: string | undefined, segredo: string | null, opcoes: { tipo?: string; corpo?: Record<string, unknown> } = {}) {
  avancarMs(3000);
  const requestId = gerarId();
  const ts = String(amb.relogio.agora().getTime());
  const assinatura = segredo ? `ts=${ts},v1=${assinarManifesto(manifestoAssinatura(dataId, requestId, ts), segredo)}` : undefined;
  const consulta = new URLSearchParams({ ...(dataId ? { 'data.id': dataId } : {}), type: opcoes.tipo ?? 'order' });
  const res = await amb.app.inject({
    method: 'POST', url: `/webhooks/pdv-mercadopago?${consulta}`,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId, ...(assinatura ? { 'x-signature': assinatura } : {}) },
    payload: opcoes.corpo ?? { action: 'order.processed', type: opcoes.tipo ?? 'order', data: { id: dataId, status: 'processed' } },
  });
  return { status: res.statusCode, corpo: res.json() };
}

async function convidarOperador(dono: Conta): Promise<Sessao> {
  const email = 'operadora@exemplo.com.br';
  const convite = await chamar(amb, 'POST', '/equipe/convites', { token: dono.token, corpo: { email, nome: 'Operadora', papel: 'gerente' } });
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email } })).corpo.codigo;
  const login = await chamar<Sessao>(amb, 'POST', '/auth/login', { corpo: { email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Celular', operadorId: convite.corpo.operadorId, aceitarConvite: true } });
  expect(login.status).toBe(200);
  return login.corpo;
}

describe('configuração do OAuth', () => {
  it('autoriza credenciais de teste no deploy hospedado apenas com o sandbox e o callback exato de homologação', () => {
    const origem = 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host';
    const env = {
      NODE_ENV: 'production',
      PDV_API_PUBLIC_URL: origem,
      PDV_PAGAMENTOS_CHAVE: CHAVE,
      PDV_MP_SANDBOX_TOKEN_SHA256: 'a'.repeat(64),
      PDV_MP_CLIENT_ID: OAUTH.clientId,
      PDV_MP_CLIENT_SECRET: OAUTH.clientSecret,
      PDV_MP_REDIRECT_URI: `${origem}/pagamentos/mercadopago/oauth/retorno`,
      PDV_MP_OAUTH_TEST_TOKEN: 'true',
      PDV_MP_OAUTH_TEST_SELLER_ID: '987654321',
    };
    expect(lerConfiguracaoOAuthMercadoPago(env)).toMatchObject({ testToken: true, vendedorTesteId: '987654321' });
    expect(() => lerConfiguracaoOAuthMercadoPago({ ...env, PDV_MP_SANDBOX_TOKEN_SHA256: undefined })).toThrow();
    expect(() => lerConfiguracaoOAuthMercadoPago({ ...env, PDV_MP_REDIRECT_URI: OAUTH.redirectUri })).toThrow();
    expect(() => lerConfiguracaoOAuthMercadoPago({ ...env, PDV_MP_OAUTH_TEST_TOKEN: 'false' })).toThrow(/PDV_MP_OAUTH_TEST_SELLER_ID/);
    expect(() => lerConfiguracaoOAuthMercadoPago({ ...env, PDV_MP_OAUTH_TEST_SELLER_ID: 'inválido' })).toThrow(/PDV_MP_OAUTH_TEST_SELLER_ID/);
  });

  it('é opcional, vai em conjunto, exige https e recusa token de teste em produção, sem citar valores', () => {
    expect(lerConfiguracaoOAuthMercadoPago({})).toBeNull();
    const base = { PDV_MP_CLIENT_ID: '1234567890', PDV_MP_CLIENT_SECRET: 'segredo-x', PDV_MP_REDIRECT_URI: 'https://api.exemplo.invalid/pagamentos/mercadopago/oauth/retorno' };
    expect(lerConfiguracaoOAuthMercadoPago(base)).toEqual({ clientId: '1234567890', clientSecret: 'segredo-x', redirectUri: base.PDV_MP_REDIRECT_URI, webhookSegredo: null, pkce: true, testToken: false });
    expect(lerConfiguracaoOAuthMercadoPago({ ...base, PDV_MP_OAUTH_PKCE: 'false', PDV_MP_OAUTH_TEST_TOKEN: 'true', PDV_MP_WEBHOOK_SECRET: 'segredo-w' }))
      .toMatchObject({ pkce: false, testToken: true, webhookSegredo: 'segredo-w' });
    for (const env of [
      { PDV_MP_CLIENT_ID: '1' },
      { ...base, PDV_MP_REDIRECT_URI: 'http://api.exemplo.invalid/retorno' },
      { ...base, PDV_MP_REDIRECT_URI: 'https://api.exemplo.invalid/retorno?segredo=1' },
      { ...base, PDV_MP_CLIENT_ID: 'segredo com espaço' },
      { ...base, PDV_MP_OAUTH_TEST_TOKEN: 'true', NODE_ENV: 'production' },
      { ...base, PDV_MP_OAUTH_PKCE: 'talvez' },
      { PDV_MP_WEBHOOK_SECRET: 'segredo-w' },
    ]) {
      expect(() => lerConfiguracaoOAuthMercadoPago(env)).toThrow();
      try { lerConfiguracaoOAuthMercadoPago(env); } catch (e) { expect((e as Error).message).not.toMatch(/segredo/); }
    }
  });
});

describe('início e retorno do OAuth', () => {
  it('encaminha Pix e renovação OAuth de teste pelo provedor do vendedor na homologação', async () => {
    const provedorOAuth = new ProvedorMercadoPagoSimulado();
    config.oauth = { ...OAUTH, testToken: true };
    config.mercadoPagoOAuthTeste = provedorOAuth;
    const dono = await contaEmTeste(amb);
    const inicio = await iniciar(dono);
    expect(inicio.status).toBe(201);
    const autorizacao = provedorOAuth.autorizar(inicio.corpo.url, '987654321');
    expect((await retorno(autorizacao)).status).toBe(200);
    expect(provedorOAuth.trocas[0]).toMatchObject({ testToken: true });
    expect(await conexaoDe(dono.lojaId)).toMatchObject({ modo: 'oauth', contaProvedorId: '987654321', liveMode: false });

    const cobranca = await cobrar(dono);
    expect(cobranca.status).toBe(201);
    expect(cobranca.corpo.pix?.qrCode).toBeTruthy();
    expect(provedorOAuth.orders.size).toBe(1);
    expect(sim.chamadas).toHaveLength(0);

    const renovar = provedorOAuth.renovarToken.bind(provedorOAuth);
    vi.spyOn(provedorOAuth, 'renovarToken').mockImplementationOnce(async (...args) => ({ ...await renovar(...args), liveMode: true }));
    provedorOAuth.revogarAcesso(await acessoAtual(dono.lojaId));
    avancarMs(6 * 60_000);
    const consulta = await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${cobranca.corpo.id}`, { token: dono.token });
    expect(consulta.corpo.estado).toBe('aguardando');
    expect((await cobrar(dono)).status).toBe(409);
    expect((await conexaoDe(dono.lojaId)).reautorizarDesde).toBeInstanceOf(Date);
    expect(provedorOAuth.orders.size).toBe(1);
  });

  it.each([true, null])('rejeita credenciais de teste sem confirmação explícita de sandbox (%s)', async (liveMode) => {
    config.oauth = { ...OAUTH, testToken: true };
    const dono = await contaEmTeste(amb);
    const inicio = await iniciar(dono);
    const trocar = sim.trocarCodigo.bind(sim);
    vi.spyOn(sim, 'trocarCodigo').mockImplementationOnce(async (...args) => ({ ...await trocar(...args), liveMode }));
    const resposta = await retorno(sim.autorizar(inicio.corpo.url));
    expect(resposta.status).toBe(400);
    expect(resposta.html).toContain(liveMode ? 'credencial_produtiva' : 'ambiente_teste_ausente');
    expect(resposta.html).not.toMatch(/TG-SIMULADO|TESTE-SIMULADO/);
    expect(await conexaoAtiva(amb.db, dono.lojaId)).toBeUndefined();
  });

  it('aceita ausência de live_mode só para o vendedor fictício configurado e mantém a verificação ao renovar', async () => {
    const vendedorTesteId = '987654321';
    config.oauth = { ...OAUTH, testToken: true, vendedorTesteId };
    const dono = await contaEmTeste(amb);
    const outroInicio = await iniciar(dono);
    const outro = await retorno(sim.autorizar(outroInicio.corpo.url, '123456789'));
    expect(outro.status).toBe(400);
    expect(outro.html).toContain('vendedor_de_teste_divergente');
    expect(await conexaoAtiva(amb.db, dono.lojaId)).toBeUndefined();

    const inicio = await iniciar(dono);
    const trocar = sim.trocarCodigo.bind(sim);
    const renovar = sim.renovarToken.bind(sim);
    vi.spyOn(sim, 'trocarCodigo').mockImplementationOnce(async (...args) => ({ ...await trocar(...args), liveMode: null }));
    vi.spyOn(sim, 'renovarToken').mockImplementationOnce(async (...args) => ({ ...await renovar(...args), liveMode: null }));
    expect((await retorno(sim.autorizar(inicio.corpo.url, vendedorTesteId))).status).toBe(200);
    expect(await conexaoDe(dono.lojaId)).toMatchObject({ modo: 'oauth', contaProvedorId: vendedorTesteId, liveMode: null });
    const cobranca = await cobrar(dono);
    expect(cobranca.corpo.pix?.qrCode).toBeTruthy();
    const acesso = await acessoAtual(dono.lojaId);
    sim.revogarAcesso(acesso);
    avancarMs(6 * 60_000);
    const consulta = await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${cobranca.corpo.id}`, { token: dono.token });
    expect(consulta.corpo.estado).toBe('aguardando');
    expect(sim.renovacoes).toHaveLength(1);
    expect(await acessoAtual(dono.lojaId)).not.toBe(acesso);
  });

  it('só o dono inicia; sem configuração da plataforma responde 503 e a página de retorno é genérica', async () => {
    const dono = await contaEmTeste(amb, 'pro');
    const gerente = await convidarOperador(dono);
    expect((await iniciar(gerente)).status).toBe(403);
    const semOAuth = await criarAmbiente(banco, undefined, [], undefined, { pagamentos: { ...config, oauth: null } });
    try {
      const outro = await contaEmTeste(semOAuth);
      const r = await chamar(semOAuth, 'POST', '/pagamentos/mercadopago/oauth/inicio', { token: outro.token });
      expect(r.status).toBe(503);
      expect(r.corpo.erro).toBe('oauth_indisponivel');
      const pagina = await semOAuth.app.inject({ method: 'GET', url: '/pagamentos/mercadopago/oauth/retorno?code=x&state=y' });
      expect(pagina.statusCode).toBe(400);
      expect(pagina.body).toContain('Não foi possível conectar o Mercado Pago.');
      expect(pagina.body).not.toContain('Código de homologação');
      const aviso = await semOAuth.app.inject({ method: 'POST', url: '/webhooks/pdv-mercadopago?data.id=ORD1&type=order', payload: {} });
      expect(aviso.statusCode).toBe(503);
      // O modo token continua disponível sem o OAuth.
      expect((await chamar(semOAuth, 'GET', '/pagamentos/mercadopago/conexao', { token: outro.token })).status).toBe(200);
    } finally { await semOAuth.fechar(); }
  });

  it('monta a URL documentada com state forte e PKCE S256; conclui, cifra os tokens e devolve uma página sem segredos', async () => {
    const dono = await contaEmTeste(amb);
    const inicio = await iniciar(dono);
    expect(inicio.status).toBe(201);
    const url = new URL(inicio.corpo.url);
    expect(`${url.origin}${url.pathname}`).toBe('https://auth.mercadopago.com/authorization');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: OAUTH.clientId, response_type: 'code', platform_id: 'mp', redirect_uri: OAUTH.redirectUri, code_challenge_method: 'S256' });
    expect([...url.searchParams.keys()].sort()).toEqual(['client_id', 'code_challenge', 'code_challenge_method', 'platform_id', 'redirect_uri', 'response_type', 'state']);
    const state = url.searchParams.get('state')!;
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const [registro] = await amb.db.select().from(schema.estadosOauthPagamento);
    expect(JSON.stringify(registro)).not.toContain(state);
    expect(registro).toMatchObject({ lojaId: dono.lojaId, operadorId: dono.operadorId, usadoEm: null, expiraEm: new Date(amb.relogio.agora().getTime() + 10 * 60_000) });

    const { code } = sim.autorizar(inicio.corpo.url);
    const r = await retorno({ code, state });
    expect(r.status).toBe(200);
    expect(r.html).toContain('Mercado Pago conectado. Volte ao app.');
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.headers['referrer-policy']).toBe('no-referrer');
    expect(r.headers['content-security-policy']).toContain("default-src 'none'");
    expect(r.headers['content-type']).toMatch(/^text\/html/);
    for (const proibido of [code, state, 'TESTE-SIMULADO', dono.lojaId, '123456789']) expect(r.html).not.toContain(proibido);

    expect(sim.trocas).toHaveLength(1);
    const troca = sim.trocas[0]!;
    expect(troca).toMatchObject({ codigo: code, clientId: OAUTH.clientId, testToken: false });
    expect(troca.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(createHash('sha256').update(troca.codeVerifier!).digest('base64url')).toBe(url.searchParams.get('code_challenge'));

    const conexao = await conexaoDe(dono.lojaId);
    expect(conexao).toMatchObject({ modo: 'oauth', contaProvedorId: '123456789', liveMode: false, reautorizarDesde: null, segredoWebhookEnvelope: null });
    expect(conexao.tokenExpiraEm).toEqual(new Date(amb.relogio.agora().getTime() + 15552000 * 1000));
    const bruto = JSON.stringify(await amb.db.select().from(schema.conexoesPagamento)) + JSON.stringify(await amb.db.select().from(schema.estadosOauthPagamento));
    expect(bruto).not.toMatch(/TESTE-SIMULADO|TG-SIMULADO/);
    expect(bruto).not.toContain(troca.codeVerifier!);
    expect((await amb.db.select().from(schema.estadosOauthPagamento))[0]).toMatchObject({ resultado: 'conectado', verificadorEnvelope: null });
    const estado = await chamar(amb, 'GET', '/pagamentos/mercadopago/conexao', { token: dono.token });
    expect(estado.corpo).toMatchObject({ conectada: true, modo: 'oauth', reautorizacaoNecessaria: false, webhookPath: null, temSegredoWebhook: false });
    expect(JSON.stringify(estado.corpo)).not.toMatch(/TESTE-SIMULADO|123456789/);
    // Cobrança com a conexão OAuth.
    expect((await cobrar(dono)).corpo.estado).toBe('aguardando');
  });

  it('state é de uso único: repetir, expirar, faltar, ser desconhecido ou vir com error= falha e consome o state', async () => {
    const dono = await contaEmTeste(amb);
    const ok = await conectarOAuth(dono);
    const repetido = await retorno({ code: ok.code, state: ok.state });
    expect(repetido.status).toBe(400);
    expect(repetido.html).toContain('Não foi possível conectar o Mercado Pago.');
    expect(sim.trocas).toHaveLength(1);

    const expira = await iniciar(dono);
    const codigoExpira = sim.autorizar(expira.corpo.url);
    avancarMs(10 * 60_000 + 1);
    expect((await retorno(codigoExpira)).status).toBe(400);
    expect((await amb.db.select().from(schema.estadosOauthPagamento)).find((e) => e.resultado === 'estado_expirado')).toBeDefined();
    expect(sim.trocas).toHaveLength(1);

    expect((await retorno({ code: 'TG-SIMULADO-X' })).status).toBe(400);
    expect((await retorno({ code: 'TG-SIMULADO-X', state: 'desconhecido' })).status).toBe(400);

    const negado = await iniciar(dono);
    const { state } = sim.autorizar(negado.corpo.url);
    const comErro = await retorno({ error: 'access_denied', state });
    expect(comErro.status).toBe(400);
    expect((await retorno({ code: 'TG-SIMULADO-Y', state })).status).toBe(400);
    expect(sim.trocas).toHaveLength(1);
    // Nada da query volta na página.
    const malicioso = await retorno({ state: '<script>alert(1)</script>', code: '"><img>' });
    expect(malicioso.html).not.toMatch(/script>|<img/);
  });

  it('novo início invalida o anterior; troca recusada não conecta; dono que perdeu o papel não conclui', async () => {
    const dono = await contaEmTeste(amb);
    const primeiro = await iniciar(dono);
    const segundo = await iniciar(dono);
    expect((await retorno(sim.autorizar(primeiro.corpo.url))).status).toBe(400);

    sim.falharProxima('trocar', new ErroProvedorMp('concessao_invalida', 400, 'invalid_grant'));
    expect((await retorno(sim.autorizar(segundo.corpo.url))).status).toBe(400);
    expect(await conexaoAtiva(amb.db, dono.lojaId)).toBeUndefined();

    const terceiro = await iniciar(dono);
    const autorizado = sim.autorizar(terceiro.corpo.url);
    await amb.db.update(schema.operadores).set({ papel: 'gerente' }).where(eq(schema.operadores.id, dono.operadorId));
    expect((await retorno(autorizado)).status).toBe(400);
    expect(await conexaoAtiva(amb.db, dono.lojaId)).toBeUndefined();
    expect(sim.trocas).toHaveLength(1);
  });

  it('o state de uma loja só conecta aquela loja', async () => {
    const a = await contaEmTeste(amb);
    const b = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
    await conectarOAuth(a, '111');
    expect((await conexaoDe(a.lojaId)).contaProvedorId).toBe('111');
    expect(await conexaoAtiva(amb.db, b.lojaId)).toBeUndefined();
  });

  it('PKCE desligado: sem code_challenge na URL e sem code_verifier na troca', async () => {
    config.oauth = { ...OAUTH, pkce: false };
    const dono = await contaEmTeste(amb);
    const { url } = await conectarOAuth(dono);
    expect(new URL(url).searchParams.has('code_challenge')).toBe(false);
    expect(sim.trocas[0]!.codeVerifier).toBeNull();
  });
});

describe('reconexão e renovação dos tokens', () => {
  it('OAuth substitui a conexão por token da mesma loja e a cobrança pendente continua sendo confirmada', async () => {
    const dono = await contaEmTeste(amb);
    sim.tokensValidos.add('TESTE-SIMULADO-TOKEN-COLADO');
    sim.donoDoToken.set('TESTE-SIMULADO-TOKEN-COLADO', '123456789');
    expect((await chamar(amb, 'PUT', '/pagamentos/mercadopago/conexao', { token: dono.token, corpo: { accessToken: 'TESTE-SIMULADO-TOKEN-COLADO', segredoWebhook: 'segredo-simulado-colado' } })).status).toBe(201);
    const idAntes = (await conexaoDe(dono.lojaId)).id;
    const { corpo } = await cobrar(dono);
    await conectarOAuth(dono);
    const depois = await conexaoDe(dono.lojaId);
    expect(depois).toMatchObject({ id: idAntes, modo: 'oauth', segredoWebhookEnvelope: null });
    sim.aprovar(orderDe(corpo.id));
    avancarMs(3000);
    expect((await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${corpo.id}`, { token: dono.token })).corpo.estado).toBe('paga');
  });

  it('o job renova os tokens que vencem em até 30 dias e grava o refresh token girado', async () => {
    const dono = await contaEmTeste(amb);
    await conectarOAuth(dono);
    const antes = await conexaoDe(dono.lojaId);
    expect(await renovarTokensOAuth(pix())).toMatchObject({ renovadas: 0, reautorizar: 0, falhas: 0 });
    avancarMs(151 * DIA);
    expect(await renovarTokensOAuth(pix())).toMatchObject({ renovadas: 1, reautorizar: 0, falhas: 0 });
    const depois = await conexaoDe(dono.lojaId);
    const refreshAntigo = config.cifrador!.decifrar(antes.refreshTokenEnvelope, { lojaId: dono.lojaId, conexaoId: antes.id, campo: 'refresh_token' });
    const refreshNovo = config.cifrador!.decifrar(depois.refreshTokenEnvelope, { lojaId: dono.lojaId, conexaoId: depois.id, campo: 'refresh_token' });
    expect(sim.renovacoes).toEqual([refreshAntigo]);
    expect(refreshNovo).not.toBe(refreshAntigo);
    expect(sim.refreshValidos.has(refreshNovo)).toBe(true);
    expect(sim.refreshValidos.has(refreshAntigo)).toBe(false);
    expect(depois.versaoToken).toBe(antes.versaoToken + 1);
    expect(depois.tokenExpiraEm).toEqual(new Date(amb.relogio.agora().getTime() + 15552000 * 1000));
    expect(await renovarTokensOAuth(pix())).toMatchObject({ renovadas: 0, reautorizar: 0, falhas: 0 });
  });

  it('401 do provedor: renova uma vez e repete a consulta; invalid_grant pede nova autorização sem mexer nas cobranças', async () => {
    const dono = await contaEmTeste(amb);
    await conectarOAuth(dono);
    // Fora da janela de "renovado há pouco" (5 min), em que um 401 não renova de novo.
    avancarMs(6 * 60_000);
    const paga = (await cobrar(dono)).corpo;
    sim.aprovar(orderDe(paga.id));
    sim.revogarAcesso(await acessoAtual(dono.lojaId));
    avancarMs(3000);
    expect((await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${paga.id}`, { token: dono.token })).corpo.estado).toBe('paga');
    expect(sim.renovacoes).toHaveLength(1);
    expect((await conexaoDe(dono.lojaId)).tokenRenovadoEm).toEqual(amb.relogio.agora());

    const pendente = (await cobrar(dono)).corpo;
    sim.aprovar(orderDe(pendente.id));
    sim.revogarAcesso(await acessoAtual(dono.lojaId));
    sim.falharProxima('renovar', new ErroProvedorMp('concessao_invalida', 400, 'invalid_grant'));
    avancarMs(6 * 60_000);
    expect((await chamar<CobrancaPix>(amb, 'GET', `/pagamentos/cobrancas/${pendente.id}`, { token: dono.token })).corpo.estado).toBe('aguardando');
    expect((await chamar(amb, 'GET', '/pagamentos/mercadopago/conexao', { token: dono.token })).corpo).toMatchObject({ conectada: true, reautorizacaoNecessaria: true });
    const nova = await cobrar(dono);
    expect(nova.status).toBe(409);
    expect(nova.corpo.erro).toBe('mercadopago_reautorizar');
    const eventos = await amb.db.select().from(schema.eventosCobrancaPagamento).where(eq(schema.eventosCobrancaPagamento.cobrancaId, pendente.id));
    expect(eventos.filter((e) => e.tipo === 'falha_consulta').map((e) => e.dados.tipo)).toEqual(['reautorizacao_necessaria']);
    // Sem nova chamada ao provedor enquanto a conexão pede reautorização.
    const renovacoes = sim.renovacoes.length;
    avancarMs(3000);
    await chamar(amb, 'GET', `/pagamentos/cobrancas/${pendente.id}`, { token: dono.token });
    expect(sim.renovacoes).toHaveLength(renovacoes);
    expect(await renovarTokensOAuth(pix())).toMatchObject({ renovadas: 0, reautorizar: 0, falhas: 0 });

    await conectarOAuth(dono);
    expect((await chamar(amb, 'GET', '/pagamentos/mercadopago/conexao', { token: dono.token })).corpo.reautorizacaoNecessaria).toBe(false);
    expect((await linha(pendente.id)).proximaConsultaEm).toEqual(amb.relogio.agora());
    expect(await conciliarCobrancasPix(pix())).toMatchObject({ confirmadas: 1 });
    expect((await linha(pendente.id)).estado).toBe('paga');
  });

  it('renovações simultâneas chamam o provedor uma vez e não perdem o refresh token girado', async () => {
    const dono = await contaEmTeste(amb);
    await conectarOAuth(dono);
    await amb.db.update(schema.conexoesPagamento).set({ tokenExpiraEm: new Date(amb.relogio.agora().getTime() - 1000) }).where(eq(schema.conexoesPagamento.lojaId, dono.lojaId));
    sim.atrasoRenovacaoMs = 150;
    const tokens = await Promise.all([1, 2, 3].map(() => comTokenDaLoja(pix(), dono.lojaId, async (t) => t)));
    expect(sim.renovacoes).toHaveLength(1);
    expect(new Set(tokens).size).toBe(1);
    expect(tokens[0]).toBe(await acessoAtual(dono.lojaId));
    const c = await conexaoDe(dono.lojaId);
    const refresh = config.cifrador!.decifrar(c.refreshTokenEnvelope, { lojaId: dono.lojaId, conexaoId: c.id, campo: 'refresh_token' });
    expect(sim.refreshValidos.has(refresh)).toBe(true);
    expect(c.renovandoAte).toBeNull();
  });
});

describe('webhook da aplicação da plataforma', () => {
  it('acha a cobrança em qualquer loja e confirma com o token da loja dona; user_id do corpo só fica registrado', async () => {
    const a = await contaEmTeste(amb);
    const b = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
    await conectarOAuth(a, '111');
    await conectarOAuth(b, '222');
    const deB = (await cobrar(b)).corpo;
    const order = orderDe(deB.id);
    sim.aprovar(order);
    expect((await avisarPlataforma(order, 'segredo-errado-simulado')).status).toBe(401);
    expect((await avisarPlataforma(order, null)).status).toBe(401);
    expect((await linha(deB.id)).estado).toBe('aguardando');
    // A order de B só existe para o token de B no simulado: confirmar prova que a consulta usou o token de B.
    const ok = await avisarPlataforma(order, OAUTH.webhookSegredo, { corpo: { type: 'order', user_id: 111, data: { id: order } } });
    expect(ok).toEqual({ status: 200, corpo: { recebido: true } });
    expect((await linha(deB.id)).estado).toBe('paga');
    const eventos = await amb.db.select().from(schema.eventosCobrancaPagamento).where(eq(schema.eventosCobrancaPagamento.cobrancaId, deB.id));
    expect(eventos.some((e) => e.tipo === 'observacao' && e.dados.motivo === 'usuario_divergente_no_aviso')).toBe(true);
    const consultas = sim.chamadas.filter((c) => c.operacao === 'consultar').length;
    expect((await avisarPlataforma('ORD01DESCONHECIDA', OAUTH.webhookSegredo)).status).toBe(200);
    expect((await avisarPlataforma(order, OAUTH.webhookSegredo, { tipo: 'payment' })).status).toBe(200);
    expect(sim.chamadas.filter((c) => c.operacao === 'consultar').length).toBe(consultas);
  });

  it('mp-connect só agenda uma conferência barata, sem mexer no vencimento; desvínculo vira pedido de nova autorização', async () => {
    const a = await contaEmTeste(amb);
    const b = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
    await conectarOAuth(a, '111');
    await conectarOAuth(b, '222');
    const vencimento = (await conexaoDe(a.lojaId)).tokenExpiraEm;
    for (let i = 0; i < 5; i++) {
      expect((await avisarPlataforma(undefined, OAUTH.webhookSegredo, { tipo: 'mp-connect', corpo: { type: 'mp-connect', user_id: 111 } })).status).toBe(200);
    }
    const marcada = await conexaoDe(a.lojaId);
    expect(marcada.tokenExpiraEm).toEqual(vencimento);
    expect(marcada.revisarEm).not.toBeNull();
    // Cinco dicas = uma conferência (GET /users/me), sem renovar.
    const validacoes = sim.chamadas.filter((c) => c.operacao === 'validar').length;
    expect(await renovarTokensOAuth(pix())).toMatchObject({ revisadas: 1, renovadas: 0, falhas: 0 });
    expect(sim.chamadas.filter((c) => c.operacao === 'validar').length - validacoes).toBe(1);
    expect(sim.renovacoes).toHaveLength(0);
    expect((await conexaoDe(a.lojaId)).revisarEm).toBeNull();
    expect(await renovarTokensOAuth(pix())).toMatchObject({ revisadas: 0, renovadas: 0 });

    // Desvínculo real: o token deixa de valer e a renovação é recusada.
    avancarMs(6 * 60_000);
    await avisarPlataforma(undefined, OAUTH.webhookSegredo, { tipo: 'mp-connect', corpo: { type: 'mp-connect', user_id: 111 } });
    sim.revogarAcesso(await acessoAtual(a.lojaId));
    sim.falharProxima('renovar', new ErroProvedorMp('concessao_invalida', 400, 'invalid_grant'));
    expect(await renovarTokensOAuth(pix())).toMatchObject({ reautorizar: 1 });
    expect(await conexaoDe(a.lojaId)).toMatchObject({ reautorizarMotivo: 'refresh_recusado' });
    expect((await conexaoDe(a.lojaId)).reautorizarDesde).not.toBeNull();
    expect((await conexaoDe(b.lojaId)).reautorizarDesde).toBeNull();
  });

  it('a conexão OAuth não aceita o webhook por conexão (que exige segredo próprio) e a venda confirmada sincroniza', async () => {
    const dono = await contaEmTeste(amb);
    await conectarOAuth(dono);
    const c = (await cobrar(dono)).corpo;
    sim.aprovar(orderDe(c.id));
    const publico = (await conexaoDe(dono.lojaId)).publicoId;
    const porConexao = await amb.app.inject({ method: 'POST', url: `/webhooks/pdv-mercadopago/${publico}?data.id=${orderDe(c.id)}&type=order`, payload: {} });
    expect(porConexao.statusCode).toBe(401);
    await avisarPlataforma(orderDe(c.id), OAUTH.webhookSegredo);
    const m = mutacao('venda', venda(dono, { id: c.vendaId, pagamentos: [{ id: c.id, meio: 'pix', provedor: 'mercadopago', valorCentavos: 700, trocoCentavos: 0 }] }));
    expect((await enviar(amb, dono, [m])).corpo).toMatchObject({ aceitas: [m.id], rejeitadas: [] });
  });
});

describe('revisão do OAuth', () => {
  const esperarMs = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
  const vencerToken = (lojaId: string) => amb.db.update(schema.conexoesPagamento)
    .set({ tokenExpiraEm: new Date(amb.relogio.agora().getTime() - 1000) }).where(eq(schema.conexoesPagamento.lojaId, lojaId));

  it('desconectar durante uma renovação não grava tokens de volta na conexão', async () => {
    const dono = await contaEmTeste(amb);
    await conectarOAuth(dono);
    await vencerToken(dono.lojaId);
    sim.atrasoRenovacaoMs = 200;
    const emCurso = comTokenDaLoja(pix(), dono.lojaId, async (t) => t).then(() => null, (e: unknown) => e);
    await esperarMs(50);
    expect((await chamar(amb, 'DELETE', '/pagamentos/mercadopago/conexao', { token: dono.token })).status).toBe(204);
    expect(await emCurso).toBeInstanceOf(Error);
    expect(sim.renovacoes).toHaveLength(1);
    const [linhaConexao] = await amb.db.select().from(schema.conexoesPagamento);
    expect(linhaConexao).toMatchObject({ ativa: false, tokenEnvelope: null, refreshTokenEnvelope: null });
  });

  it('403 nunca renova; 401 logo depois de uma renovação também não renova de novo', async () => {
    const dono = await contaEmTeste(amb);
    await conectarOAuth(dono);
    avancarMs(6 * 60_000);
    const { corpo } = await cobrar(dono);
    for (let i = 0; i < 3; i++) {
      sim.falharProxima('consultar', new ErroProvedorMp('acesso_negado', 403, 'forbidden'));
      avancarMs(3000);
      await chamar(amb, 'GET', `/pagamentos/cobrancas/${corpo.id}`, { token: dono.token });
    }
    amb.relogio.definir((await linha(corpo.id)).proximaConsultaEm!);
    sim.falharProxima('consultar', new ErroProvedorMp('acesso_negado', 403, 'forbidden'));
    expect((await conciliarCobrancasPix(pix())).falhas).toBe(1);
    expect(sim.renovacoes).toHaveLength(0);
    const eventos = await amb.db.select().from(schema.eventosCobrancaPagamento).where(eq(schema.eventosCobrancaPagamento.cobrancaId, corpo.id));
    expect(eventos.filter((e) => e.tipo === 'falha_consulta').map((e) => e.dados)).toEqual([expect.objectContaining({ tipo: 'acesso_negado', status: 403, repeticoes: 4 })]);
    expect((await linha(corpo.id)).falhasConsulta).toBe(4);

    // 401 → uma renovação; outro 401 dentro de 5 min → falha comum, sem girar o refresh de novo.
    sim.revogarAcesso(await acessoAtual(dono.lojaId));
    avancarMs(3000);
    await chamar(amb, 'GET', `/pagamentos/cobrancas/${corpo.id}`, { token: dono.token });
    expect(sim.renovacoes).toHaveLength(1);
    sim.revogarAcesso(await acessoAtual(dono.lojaId));
    avancarMs(3000);
    await chamar(amb, 'GET', `/pagamentos/cobrancas/${corpo.id}`, { token: dono.token });
    expect(sim.renovacoes).toHaveLength(1);
  });

  it('401 ao criar a order: renova, repete com a mesma chave e cria uma order só', async () => {
    const dono = await contaEmTeste(amb);
    await conectarOAuth(dono);
    avancarMs(6 * 60_000);
    sim.revogarAcesso(await acessoAtual(dono.lojaId));
    const r = await cobrar(dono);
    expect(r.corpo.estado).toBe('aguardando');
    const criacoes = sim.chamadas.filter((c) => c.operacao === 'criar');
    expect(criacoes).toHaveLength(2);
    expect(new Set(criacoes.map((c) => c.chave))).toEqual(new Set([`pdv-pix-${r.corpo.id}`]));
    expect(sim.orders.size).toBe(1);
    expect(sim.renovacoes).toHaveLength(1);
  });

  it('falha passageira da renovação com o token ainda válido: o token atual continua em uso', async () => {
    const dono = await contaEmTeste(amb);
    await conectarOAuth(dono);
    const tokenAtual = await acessoAtual(dono.lojaId);
    avancarMs(151 * DIA);
    sim.falharProxima('renovar');
    expect(await renovarTokensOAuth(pix())).toMatchObject({ renovadas: 0, falhas: 1 });
    const c = await conexaoDe(dono.lojaId);
    expect(c.refreshSemRespostaEm).not.toBeNull();
    expect(c.proximaRenovacaoEm!.getTime() - amb.relogio.agora().getTime()).toBe(5 * 60_000);
    expect(await comTokenDaLoja(pix(), dono.lojaId, async (t) => t)).toBe(tokenAtual);
    expect(sim.renovacoes).toHaveLength(1);
    // Depois, invalid_grant: o motivo indica que uma renovação anterior ficou sem resposta (refresh possivelmente girado).
    avancarMs(5 * 60_000);
    sim.falharProxima('renovar', new ErroProvedorMp('concessao_invalida', 400, 'invalid_grant'));
    expect(await renovarTokensOAuth(pix())).toMatchObject({ reautorizar: 1 });
    expect((await conexaoDe(dono.lojaId)).reautorizarMotivo).toBe('refresh_girado_sem_resposta');
  });

  it('trava vencida de uma renovação que caiu também marca refresh sem resposta', async () => {
    const dono = await contaEmTeste(amb);
    await conectarOAuth(dono);
    await amb.db.update(schema.conexoesPagamento).set({ renovandoAte: new Date(amb.relogio.agora().getTime() - 1000) }).where(eq(schema.conexoesPagamento.lojaId, dono.lojaId));
    avancarMs(151 * DIA);
    sim.falharProxima('renovar', new ErroProvedorMp('concessao_invalida', 400, 'invalid_grant'));
    expect(await renovarTokensOAuth(pix())).toMatchObject({ reautorizar: 1 });
    expect((await conexaoDe(dono.lojaId)).reautorizarMotivo).toBe('refresh_girado_sem_resposta');
  });

  it('conexões que falham na renovação recuam e não tomam a vez das outras', async () => {
    const contas = [await criarConta(amb), await criarConta(amb), await criarConta(amb)];
    for (const [i, conta] of contas.entries()) { await conectarOAuth(conta, String(100 + i)); avancarMs(DIA); }
    avancarMs(151 * DIA);
    sim.falharProxima('renovar', new ErroProvedorMp('rejeitado', 400, 'invalid_request'));
    sim.falharProxima('renovar', new ErroProvedorMp('rejeitado', 400, 'invalid_request'));
    expect(await renovarTokensOAuth(pix(), { lote: 2 })).toMatchObject({ renovadas: 0, falhas: 2 });
    expect(await renovarTokensOAuth(pix(), { lote: 2 })).toMatchObject({ renovadas: 1, falhas: 0 });
    expect((await conexaoDe(contas[2]!.lojaId)).versaoToken).toBe(2);
    avancarMs(5 * 60_000);
    expect(await renovarTokensOAuth(pix(), { lote: 2 })).toMatchObject({ renovadas: 2 });
  });

  it('o job apaga state com mais de 1 dia', async () => {
    const dono = await contaEmTeste(amb);
    await iniciar(dono);
    await iniciar(dono);
    avancarMs(DIA + 1000);
    await iniciar(dono);
    expect(await renovarTokensOAuth(pix())).toMatchObject({ estadosRemovidos: 2 });
    expect(await amb.db.$count(schema.estadosOauthPagamento)).toBe(1);
  });

  it('state de outra loja: o dono de B que usa o state de A conecta só A; o state de A nunca conecta B', async () => {
    const a = await contaEmTeste(amb);
    const b = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
    const deA = await iniciar(a);
    const deB = await iniciar(b);
    // O dono de B (vendedor 222 no Mercado Pago) abre a URL de A: a autorização fica com A, nunca com B.
    expect((await retorno(sim.autorizar(deA.corpo.url, '222'))).status).toBe(200);
    expect((await conexaoDe(a.lojaId)).contaProvedorId).toBe('222');
    expect(await conexaoAtiva(amb.db, b.lojaId)).toBeUndefined();
    // O state de B continua sendo o único que conecta B.
    expect((await retorno(sim.autorizar(deB.corpo.url, '222'))).status).toBe(200);
    expect((await conexaoDe(b.lojaId)).contaProvedorId).toBe('222');
    expect((await conexaoDe(a.lojaId)).id).not.toBe((await conexaoDe(b.lojaId)).id);
    expect(await amb.db.$count(schema.conexoesPagamento)).toBe(2);
  });

  it('o retorno do OAuth não registra code nem state no log', async () => {
    const linhas: string[] = [];
    const comLog = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], pagamentos: config, logger: { level: 'info', stream: { write: (l) => { linhas.push(l); } } } });
    try {
      const dono = await contaEmTeste(amb);
      const inicio = await iniciar(dono);
      const ok = sim.autorizar(inicio.corpo.url);
      for (const consulta of [ok, { code: 'TG-SIMULADO-RUIM', state: ok.state }, { error: 'access_denied', state: 'estado-qualquer-simulado' }]) {
        const res = await comLog.inject({ method: 'GET', url: `/pagamentos/mercadopago/oauth/retorno?${new URLSearchParams(consulta)}` });
        expect([200, 400]).toContain(res.statusCode);
      }
      const texto = linhas.join('\n');
      expect(texto).toContain('Retorno do OAuth do Mercado Pago recusado.');
      for (const proibido of [ok.code, ok.state, 'TG-SIMULADO-RUIM', 'estado-qualquer-simulado', 'oauth/retorno?']) expect(texto).not.toContain(proibido);
      // Sanidade: as outras rotas continuam com a linha de acesso.
      await comLog.inject({ method: 'GET', url: '/saude' });
      expect(linhas.join('\n')).toContain('/saude');
    } finally { await comLog.close(); }
  });
});
