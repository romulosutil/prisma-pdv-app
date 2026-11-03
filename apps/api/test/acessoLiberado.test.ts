import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { gerarId, RelogioFalso, type Sessao } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import { assinaturas, contas, eventosCobranca, faturas, vendas } from '../src/db/schema';
import { criarApp } from '../src/servidor';
import { criarBillingDesativado } from '../src/billing';
import { validarConfiguracao } from '../src/configuracao';
import { criarCifradorCodigo } from '../src/email/cifrador';
import { processarCobrancas } from '../src/servicos/cobranca';
import { abrirBanco, INICIO, mutacao, venda } from './ajuda';

let banco: Conexao;
let app: Awaited<ReturnType<typeof criarApp>>;
let relogio: RelogioFalso;
let billing: ReturnType<typeof criarBillingDesativado>;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => {
  vi.stubEnv('NODE_ENV', 'production');
  await banco.db.execute(sql`truncate table contas, usuarios cascade`);
  relogio = new RelogioFalso(INICIO);
  billing = criarBillingDesativado();
  app = await criarApp({ db: banco.db, relogio, billing, cobrancaDesativada: true, fontesEan: [],
    emissaoCodigo: { modo: 'email', dominioRemetente: 'example.com', chaves: { ativaId: 'teste', cifradores: new Map([['teste', criarCifradorCodigo(Buffer.alloc(32, 1).toString('base64'))]]) } } });
});
afterEach(async () => { await app.close(); vi.unstubAllEnvs(); });
async function cadastrar(): Promise<Sessao> {
  const r = await app.inject({ method: 'POST', url: '/contas', payload: {
    email: 'loja@example.com', documento: '12345678901', nomeResponsavel: 'Maria', nomeLoja: 'Loja', aparelhoNome: 'Celular', aparelhoId: gerarId(),
  } });
  expect(r.statusCode).toBe(201);
  return r.json();
}
const cabecalho = (s: Sessao) => ({ authorization: `Bearer ${s.token}` });

describe('produção sem cobrança', () => {
  it('assume disabled sem configuração e mantém as guardas de produção', () => {
    const e = { NODE_ENV: 'production', PORT: '3333', DATABASE_URL: 'postgres://db/pdv' };
    expect(validarConfiguracao({ ...e, BILLING_PROVIDER: 'disabled' })).toEqual({ ambiente: 'production', porta: 3333, databaseUrl: e.DATABASE_URL, billingProvider: 'disabled' });
    expect(validarConfiguracao(e).billingProvider).toBe('disabled');
    expect(() => validarConfiguracao({ ...e, BILLING_PROVIDER: 'mock' })).toThrow('Nenhum provedor');
    expect(() => validarConfiguracao({ ...e, DATABASE_URL: undefined, BILLING_PROVIDER: 'disabled' })).toThrow('DATABASE_URL é obrigatória');
  });
  it('recusa toda operação financeira em vez de simular sucesso', async () => {
    await expect(billing.verificarCartao('qualquer')).rejects.toMatchObject({ codigo: 'cobranca_desativada', status: 409 });
    await expect(billing.cobrar({ clienteRef: 'c', valorCentavos: 100, descricao: 'x', chaveIdempotencia: 'k' })).rejects.toMatchObject({ codigo: 'cobranca_desativada' });
    await expect(billing.estornar('x')).rejects.toMatchObject({ codigo: 'cobranca_desativada' });
  });
  it('persiste acesso pro sem cartão, cliente, faturas ou evento de pagamento', async () => {
    const sessao = await cadastrar();
    const r = await app.inject({ url: '/assinatura', headers: cabecalho(sessao) });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ assinatura: { contaId: sessao.contaId, planoId: 'pro', status: 'liberada', cartao: null }, licenca: { status: 'liberada', validaAte: '2026-03-17T12:00:00.000Z' } });
    expect(await banco.db.select().from(assinaturas)).toMatchObject([{ contaId: sessao.contaId, status: 'liberada', clienteRef: null, cartaoFingerprint: null }]);
    expect(await banco.db.select().from(faturas)).toEqual([]);
    expect((await banco.db.select().from(eventosCobranca)).map(e => e.tipo)).toEqual(['acesso_liberado_sem_cobranca']);
  });
  it.each([['POST', '/assinatura'], ['POST', '/assinatura/trocar-plano'], ['PUT', '/assinatura/cartao'], ['POST', '/assinatura/cancelar'], ['POST', '/assinatura/reativar']] as const)('recusa %s %s sem efeitos financeiros', async (method, url) => {
    const sessao = await cadastrar();
    const antes = await banco.db.select().from(assinaturas);
    const verificar = vi.spyOn(billing, 'verificarCartao'); const cobrar = vi.spyOn(billing, 'cobrar');
    const r = await app.inject({ method, url, headers: cabecalho(sessao), payload: {} });
    expect(r.statusCode).toBe(409); expect(r.json().erro).toBe('cobranca_desativada');
    expect(verificar).not.toHaveBeenCalled(); expect(cobrar).not.toHaveBeenCalled();
    expect(await banco.db.select().from(assinaturas)).toEqual(antes);
    expect(await banco.db.select().from(faturas)).toEqual([]);
  });
  it('conserva a gratuidade ao desativar o modo de concessão para novos cadastros', async () => {
    const s = await cadastrar(); await app.close();
    app = await criarApp({ db: banco.db, relogio, billing, fontesEan: [], emissaoCodigo: { modo: 'email', dominioRemetente: 'example.com', chaves: { ativaId: 'x', cifradores: new Map() } } });
    const r = await app.inject({ method: 'POST', url: '/assinatura', headers: cabecalho(s), payload: { planoId: 'pro', tokenCartao: 'x' } });
    expect(r.statusCode).toBe(409); expect(r.json().erro).toBe('cobranca_desativada');
    expect((await banco.db.select().from(assinaturas))[0]?.status).toBe('liberada');
  });
  it('aceita venda manual, persiste e mantém autorização e dev desativado', async () => {
    const s = await cadastrar(); const v = venda(s); const m = mutacao('venda', v);
    const r = await app.inject({ method: 'POST', url: '/sync/push', headers: cabecalho(s), payload: { aparelhoId: s.aparelhoId, mutacoes: [m] } });
    expect(r.statusCode).toBe(200); expect(r.json().aceitas).toEqual([m.id]); expect(r.json().rejeitadas).toEqual([]);
    expect((await banco.db.select().from(vendas))[0]?.id).toBe(v.id);
    expect((await app.inject({ url: '/assinatura' })).statusCode).toBe(401);
    for (const url of ['/dev/relogio/avancar', '/dev/jobs/cobranca']) expect((await app.inject({ method: 'POST', url, payload: {} })).statusCode).toBe(404);
    const codigo = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: 'ausente@example.com' } });
    expect(codigo.statusCode).toBe(204); expect(codigo.body).toBe('');
  });
  it('não cria renovação nem fatura depois de 90 dias mesmo se o processador for chamado', async () => {
    const s = await cadastrar(); relogio.avancarDias(90);
    const resumo = await processarCobrancas(banco.db, billing, relogio, () => undefined);
    expect(resumo.cobrancas).toBe(0); expect(resumo.erros).toBe(0);
    expect(await banco.db.select().from(faturas)).toEqual([]);
    expect((await banco.db.select().from(assinaturas).where(eq(assinaturas.contaId, s.contaId)))[0]?.status).toBe('liberada');
  });
});
