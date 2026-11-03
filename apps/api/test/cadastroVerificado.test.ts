import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { gerarId, RelogioFalso, MockBillingProvider } from '@pdv/shared';
import { eq, sql } from 'drizzle-orm';
import { abrirBanco } from './ajuda';
import { cadastroComProva, emissaoTeste } from './emailFixture';
import { criarApp } from '../src/servidor';
import { codigosLogin, contas, sessoes, usuarios, entregasCodigo } from '../src/db/schema';
import { processarEntregasCodigo } from '../src/email/filaCodigo';
let banco: Awaited<ReturnType<typeof abrirBanco>>, app: Awaited<ReturnType<typeof criarApp>>, relogio: RelogioFalso;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => {
  vi.stubEnv('NODE_ENV', 'production');
  await banco.db.execute(sql`TRUNCATE contas, usuarios, codigos_login, limites_auth CASCADE`);
  relogio = new RelogioFalso(new Date('2026-11-03T15:00:00Z'));
  app = await criarApp({ db: banco.db, relogio, billing: new MockBillingProvider(), emissaoCodigo: emissaoTeste, cobrancaDesativada: true, fontesEan: [] });
});
afterEach(async () => { await app.close(); vi.unstubAllEnvs(); });
const dados = () => ({ email: 'cadastro@example.com', nomeResponsavel: 'Responsável', nomeLoja: 'Loja', documento: '12345678901', aparelhoId: gerarId(), aparelhoNome: 'Celular' });
const criar = (payload: unknown) => app.inject({ method: 'POST', url: '/contas', payload: payload as any });
it('não cria empresa/usuário/sessão sem prova; emissão só enfileira código cifrado e sem conta', async () => {
  const req = dados();
  expect((await criar(req)).statusCode).toBe(400);
  const prova = await cadastroComProva(app, banco.db, req);
  expect(await banco.db.select().from(contas)).toHaveLength(0);
  expect(await banco.db.select().from(usuarios)).toHaveLength(0);
  expect(await banco.db.select().from(sessoes)).toHaveLength(0);
  const [entrega] = await banco.db.select().from(entregasCodigo);
  expect(entrega?.contaId).toBeNull(); expect(entrega?.envelope).toBeTruthy();
  expect((await app.inject({ url: '/auth/cadastro/configuracao' })).json()).toEqual({ versaoContrato: 1, verificacaoEmail: true, verificacaoAntecipada: true });
  const r = await criar(prova); expect(r.statusCode).toBe(201);
  expect(await banco.db.select().from(contas)).toHaveLength(1);
  expect(await banco.db.select().from(sessoes)).toHaveLength(1);
  expect((await criar(prova)).statusCode).toBe(400);
  expect(await banco.db.select().from(sessoes)).toHaveLength(1);
});
it('vincula prova a e-mail/aparelho e bloqueia cinco erros confirmados sem rollback dos contadores', async () => {
  const prova = await cadastroComProva(app, banco.db, dados());
  expect((await criar({ ...prova, email: 'outra@example.com' })).statusCode).toBe(400);
  expect((await criar({ ...prova, aparelhoId: gerarId() })).statusCode).toBe(400);
  const errado = prova.codigoCadastro === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) expect((await criar({ ...prova, codigoCadastro: errado })).statusCode).toBe(400);
  expect((await criar(prova)).statusCode).toBe(400);
  const [registro] = await banco.db.select().from(codigosLogin).where(eq(codigosLogin.id, prova.desafioCadastroId));
  expect(registro?.tentativas).toBe(5); expect(await banco.db.select().from(contas)).toHaveLength(0);
});
it('expira, limita reenvio e invalida desafio anterior; código nunca aparece na resposta email', async () => {
  const req = dados(), prova = await cadastroComProva(app, banco.db, req);
  const pedir = () => app.inject({ method: 'POST', url: '/auth/cadastro/codigo', payload: { email: req.email, aparelhoId: req.aparelhoId } });
  expect((await pedir()).statusCode).toBe(429);
  relogio.avancarDias(1);
  expect((await criar(prova)).statusCode).toBe(400);
  const r = await pedir(); expect(r.statusCode).toBe(200); expect(Object.keys(r.json())).toEqual(['desafioId']);
  const [antigo] = await banco.db.select().from(codigosLogin).where(eq(codigosLogin.id, prova.desafioCadastroId));
  expect(antigo?.usadoEm).not.toBeNull();
});
it('duas confirmações concorrentes consomem a prova uma única vez', async () => {
  const prova = await cadastroComProva(app, banco.db, dados());
  const resultados = await Promise.all([criar(prova), criar(prova)]);
  expect(resultados.map(r => r.statusCode).sort()).toEqual([201, 400]);
  expect(await banco.db.select().from(contas)).toHaveLength(1);
  expect(await banco.db.select().from(sessoes)).toHaveLength(1);
});
it('worker entrega desafio sem conta pelo canal de teste, preservando validações de hash/prazo', async () => {
  await cadastroComProva(app, banco.db, dados());
  if (emissaoTeste.modo !== 'email') throw new Error();
  const enviar = vi.fn().mockResolvedValue(undefined);
  const r = await processarEntregasCodigo(banco.db, { ...emissaoTeste, canal: { enviar }, relogio });
  expect(r.aceitas).toBe(1); expect(enviar).toHaveBeenCalledOnce();
  expect(await banco.db.select().from(contas)).toHaveLength(0);
});


it('recusa email existente na emissão, sem novos desafios ou entregas', async () => {
  const existente = dados();
  expect((await criar(await cadastroComProva(app, banco.db, existente))).statusCode).toBe(201);
  const antesCodigos = await banco.db.$count(codigosLogin), antesEntregas = await banco.db.$count(entregasCodigo);
  relogio.avancarDias(1);
  const resposta = await app.inject({ method: 'POST', url: '/auth/cadastro/codigo', payload: { email: existente.email, aparelhoId: gerarId() } });
  expect([resposta.statusCode, resposta.json().erro]).toEqual([409, 'email_ja_cadastrado']);
  expect(await banco.db.$count(codigosLogin)).toBe(antesCodigos); expect(await banco.db.$count(entregasCodigo)).toBe(antesEntregas);
  expect(await banco.db.$count(contas)).toBe(1); expect(await banco.db.$count(sessoes)).toBe(1);
});
const conferir = (payload: unknown) => app.inject({ method: 'POST', url: '/auth/cadastro/verificar', payload: payload as any });
it('confere documento antes da loja somente após prova válida de email, sem criar conta ou sessão', async () => {
  const existente = dados();
  expect((await criar(await cadastroComProva(app, banco.db, existente))).statusCode).toBe(201);
  const req = { ...dados(), email: 'nova@example.com' };
  const prova = await cadastroComProva(app, banco.db, req);
  const semProva = await conferir(req);
  expect([semProva.statusCode, semProva.json().erro]).toEqual([400, 'cadastro_codigo_necessario']);
  const errado = prova.codigoCadastro === '000000' ? '111111' : '000000';
  expect((await conferir({ ...prova, codigoCadastro: errado })).statusCode).toBe(400);
  const resposta = await conferir(prova);
  expect([resposta.statusCode, resposta.json().erro]).toEqual([409, 'documento_ja_cadastrado']);
  expect(resposta.body).not.toContain(existente.email); expect(resposta.body).not.toContain(existente.documento);
  expect(await banco.db.$count(contas)).toBe(1); expect(await banco.db.$count(usuarios)).toBe(1); expect(await banco.db.$count(sessoes)).toBe(1);
});
it('verifica documento livre sem consumir OTP e repete a prova ao criar a conta', async () => {
  const prova = await cadastroComProva(app, banco.db, dados());
  expect((await conferir(prova)).statusCode).toBe(204);
  expect(await banco.db.$count(contas)).toBe(0); expect(await banco.db.$count(sessoes)).toBe(0);
  expect((await criar(prova)).statusCode).toBe(201);
  expect((await conferir(prova)).statusCode).toBe(400);
});
it('verificação antecipada também vincula email/aparelho e confirma cinco erros', async () => {
  const prova = await cadastroComProva(app, banco.db, dados());
  expect((await conferir({ ...prova, aparelhoId: gerarId() })).statusCode).toBe(400);
  expect((await conferir({ ...prova, email: 'outra@example.com' })).statusCode).toBe(400);
  const errado = prova.codigoCadastro === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) expect((await conferir({ ...prova, codigoCadastro: errado })).statusCode).toBe(400);
  expect((await conferir(prova)).statusCode).toBe(400); expect((await criar(prova)).statusCode).toBe(400);
  const [registro] = await banco.db.select().from(codigosLogin).where(eq(codigosLogin.id, prova.desafioCadastroId));
  expect(registro?.tentativas).toBe(5); expect(await banco.db.$count(contas)).toBe(0);
});
it('mantém a checagem final se o documento for ocupado após a verificação antecipada', async () => {
  const prova = await cadastroComProva(app, banco.db, dados());
  expect((await conferir(prova)).statusCode).toBe(204);
  const concorrente = { ...dados(), email: 'concorrente@example.com' };
  expect((await criar(await cadastroComProva(app, banco.db, concorrente))).statusCode).toBe(201);
  const resposta = await criar(prova);
  expect([resposta.statusCode, resposta.json().erro]).toEqual([409, 'documento_ja_cadastrado']);
  expect(await banco.db.$count(contas)).toBe(1); expect(await banco.db.$count(sessoes)).toBe(1);
});
