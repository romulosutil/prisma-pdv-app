import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AparelhosResSchema, gerarId, PerfilResSchema } from '@pdv/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { criarSessao } from '../src/auth';
import type { Conexao } from '../src/db/conexao';
import { aparelhos, codigosLogin, contas, operadores, sessoes, usuarios } from '../src/db/schema';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, criarConta, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

async function codigo(email: string) { return (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email } })).corpo.codigo as string; }
async function login(email: string, aparelhoId: string, cod: string) {
  return chamar(amb, 'POST', '/auth/login', { corpo: { email, codigo: cod, aparelhoId, aparelhoNome: 'Celular' } });
}
async function apagar(token: string, id: string) {
  const r = await amb.app.inject({ method: 'DELETE', url: `/aparelhos/${id}`, headers: { authorization: `Bearer ${token}` } });
  return { status: r.statusCode, corpo: r.body ? r.json() : undefined };
}
async function esperarBloqueio() {
  if (!process.env.PDV_TEST_POSTGRES_URL) {
    // PGlite serializa a conexão; esta espera não prova concorrência PostgreSQL.
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    return;
  }
  const limite = Date.now() + 5000;
  while (Date.now() < limite) {
    const linhas = await amb.db.execute(sql`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND lower(query) LIKE '%from "contas"%' AND lower(query) LIKE '%for update%') AS bloqueado`) as unknown as { bloqueado: boolean }[];
    if (linhas[0]?.bloqueado) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Login não aguardou a trava de contas em pg_stat_activity');
}

describe('sessões e aparelhos', () => {
  it('expira exatamente aos 30 dias e responde erro genérico', async () => {
    const conta = await criarConta(amb);
    amb.relogio.avancarHoras(30 * 24 - 1 / 3600000);
    expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
    amb.relogio.avancarHoras(1 / 3600000);
    const resposta = await chamar(amb, 'GET', '/conta', { token: conta.token });
    expect(resposta.status).toBe(401);
    expect(resposta.corpo.erro).toBe('nao_autenticado');
    expect(JSON.stringify(resposta.corpo)).not.toContain(conta.token);
  });

  it('logout revoga apenas token atual do mesmo aparelho', async () => {
    const conta = await criarConta(amb);
    const outro = await login(conta.email, conta.aparelhoId, await codigo(conta.email));
    expect(outro.status).toBe(200);
    expect((await chamar(amb, 'POST', '/auth/logout', { token: conta.token })).status).toBe(204);
    expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(401);
    expect((await chamar(amb, 'GET', '/conta', { token: outro.corpo.token })).status).toBe(200);
  });

  it('retorna perfil e aparelhos da loja sem segredos', async () => {
    const conta = await criarConta(amb);
    await criarConta(amb);
    const resposta = await chamar(amb, 'GET', '/conta', { token: conta.token });
    expect(PerfilResSchema.parse(resposta.corpo)).toMatchObject({ contaId: conta.contaId, lojaId: conta.lojaId, email: conta.email, nomeResponsavel: 'Maria Souza', nomeLoja: 'Mercadinho da Maria', papel: 'dono' });
    const lista = await chamar(amb, 'GET', '/aparelhos', { token: conta.token });
    expect(AparelhosResSchema.parse(lista.corpo)).toMatchObject([{ id: conta.aparelhoId, atual: true, revogadoEm: null }]);
    expect(lista.corpo).toHaveLength(1);
    expect(JSON.stringify([resposta.corpo, lista.corpo])).not.toMatch(/token|hash|codigo|documento/i);
  });

  it('revoga sessões do aparelho, restringe à loja e permite substituição', async () => {
    const conta = await contaEmTeste(amb, 'essencial');
    const outra = await criarConta(amb);
    const segundoToken = await login(conta.email, conta.aparelhoId, await codigo(conta.email));
    expect((await apagar(conta.token, outra.aparelhoId)).status).toBe(404);
    expect((await apagar(conta.token, conta.aparelhoId)).status).toBe(204);
    expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(401);
    expect((await chamar(amb, 'GET', '/conta', { token: segundoToken.corpo.token })).status).toBe(401);
    expect((await chamar(amb, 'GET', '/conta', { token: outra.token })).status).toBe(200);
    amb.relogio.avancarHoras(1 / 60);
    const cod = await codigo(conta.email);
    const recusado = await login(conta.email, conta.aparelhoId, cod);
    expect(recusado).toMatchObject({ status: 409, corpo: { erro: 'aparelho_revogado' } });
    expect(await amb.db.$count(codigosLogin, and(eq(codigosLogin.email, conta.email), isNull(codigosLogin.usadoEm)))).toBe(1);
    const substituto = await login(conta.email, gerarId(), cod);
    expect(substituto.status).toBe(200);
    expect((await apagar(substituto.corpo.token, conta.aparelhoId)).status).toBe(204);
    expect((await chamar(amb, 'GET', '/conta', { token: substituto.corpo.token })).status).toBe(200);
    expect(await amb.db.$count(sessoes, and(eq(sessoes.aparelhoId, conta.aparelhoId), isNull(sessoes.revogadaEm)))).toBe(0);
  });

  it('operador não pode gerir aparelhos e revogar outro não afeta aparelho ativo', async () => {
    const conta = await contaEmTeste(amb, 'negocio');
    const novoId = gerarId();
    const novo = await login(conta.email, novoId, await codigo(conta.email));
    expect(novo.status).toBe(200);
    const operadorId = gerarId();
    const agora = amb.relogio.agora();
    const usuarioId = gerarId();
    await amb.db.insert(usuarios).values({ id: usuarioId, email: 'operador@exemplo.com', nome: 'Operador', criadoEm: agora, atualizadoEm: agora });
    await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: conta.contaId, lojaId: conta.lojaId, nome: 'Operador', papel: 'operador', criadoEm: agora, atualizadoEm: agora });
    const operador = await criarSessao(amb.db, { contaId: conta.contaId, lojaId: conta.lojaId, operadorId, aparelhoId: novoId }, agora);
    expect((await chamar(amb, 'GET', '/aparelhos', { token: operador.token })).status).toBe(403);
    expect((await apagar(operador.token, conta.aparelhoId)).status).toBe(403);
    expect((await apagar(novo.corpo.token, conta.aparelhoId)).status).toBe(204);
    expect((await chamar(amb, 'GET', '/conta', { token: novo.corpo.token })).status).toBe(200);
    expect((await chamar(amb, 'GET', '/conta', { token: operador.token })).status).toBe(200);
    expect((await amb.db.select().from(aparelhos).where(eq(aparelhos.id, conta.aparelhoId)))[0]?.revogadoEm).not.toBeNull();
  });

  it.each(['lojaId', 'operadorId', 'aparelhoId'] as const)('rejeita sessão com %s de outra conta', async (campo) => {
    const conta = await criarConta(amb);
    const outra = await criarConta(amb);
    await amb.db.update(sessoes).set({ [campo]: outra[campo] }).where(eq(sessoes.contaId, conta.contaId));
    const res = await chamar(amb, 'GET', '/conta', { token: conta.token });
    expect(res.status).toBe(401);
    expect(res.corpo.erro).toBe('nao_autenticado');
    expect((await chamar(amb, 'GET', '/conta', { token: outra.token })).status).toBe(200);
  });

  it('login concorrente não consome o mesmo código duas vezes', async () => {
    const conta = await criarConta(amb);
    const cod = await codigo(conta.email);
    const respostas = await Promise.all([login(conta.email, conta.aparelhoId, cod), login(conta.email, conta.aparelhoId, cod)]);
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 401]);
    expect(await amb.db.$count(sessoes, eq(sessoes.contaId, conta.contaId))).toBe(2);
  });

  it('rejeita código que expira enquanto login aguarda a conta', async () => {
    const conta = await criarConta(amb);
    const cod = await codigo(conta.email);
    let liberar!: () => void;
    let travada!: () => void;
    const pronto = new Promise<void>((resolve) => { travada = resolve; });
    const espera = new Promise<void>((resolve) => { liberar = resolve; });
    const transacao = amb.db.transaction(async (tx) => {
      await tx.select().from(contas).where(eq(contas.id, conta.contaId)).for('update');
      travada();
      await espera;
    });
    await pronto;
    const tentativa = login(conta.email, conta.aparelhoId, cod);
    try {
      await esperarBloqueio();
      amb.relogio.avancarHoras(1 / 6);
    } finally { liberar(); await transacao; }
    expect((await tentativa).status).toBe(401);
    expect(await amb.db.$count(sessoes, eq(sessoes.contaId, conta.contaId))).toBe(1);
  }, 10000);

  it('login aguarda revogação confirmada e preserva código', async () => {
    const conta = await criarConta(amb);
    const cod = await codigo(conta.email);
    let liberar!: () => void;
    let travada!: () => void;
    const pronto = new Promise<void>((resolve) => { travada = resolve; });
    const espera = new Promise<void>((resolve) => { liberar = resolve; });
    const transacao = amb.db.transaction(async (tx) => {
      await tx.select().from(contas).where(eq(contas.id, conta.contaId)).for('update');
      await tx.update(aparelhos).set({ revogadoEm: amb.relogio.agora() }).where(eq(aparelhos.id, conta.aparelhoId));
      await tx.update(sessoes).set({ revogadaEm: amb.relogio.agora() }).where(eq(sessoes.aparelhoId, conta.aparelhoId));
      travada();
      await espera;
    });
    await pronto;
    const tentativa = login(conta.email, conta.aparelhoId, cod);
    try { await esperarBloqueio(); }
    finally { liberar(); await transacao; }
    expect(await tentativa).toMatchObject({ status: 409, corpo: { erro: 'aparelho_revogado' } });
    expect(await amb.db.$count(codigosLogin, and(eq(codigosLogin.email, conta.email), isNull(codigosLogin.usadoEm)))).toBe(1);
    expect(await amb.db.$count(sessoes, eq(sessoes.contaId, conta.contaId))).toBe(1);
  }, 10000);

  it('logins concorrentes não ultrapassam limite de um aparelho ativo', async () => {
    const conta = await contaEmTeste(amb, 'essencial');
    expect((await apagar(conta.token, conta.aparelhoId)).status).toBe(204);
    const cod = await codigo(conta.email);
    const [pendente] = await amb.db.select().from(codigosLogin).where(and(eq(codigosLogin.email, conta.email), isNull(codigosLogin.usadoEm)));
    if (!pendente) throw new Error('Código não criado');
    // Duas credenciais pendentes iguais exercitam a disputa pelo último lugar, sem reutilizar uma linha.
    await amb.db.insert(codigosLogin).values({ ...pendente, id: gerarId(), criadoEm: new Date(pendente.criadoEm.getTime() - 1) });
    const respostas = await Promise.all([login(conta.email, gerarId(), cod), login(conta.email, gerarId(), cod)]);
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(respostas.find((r) => r.status === 409)?.corpo.erro).toBe('limite_aparelhos');
    expect(await amb.db.$count(aparelhos, and(eq(aparelhos.contaId, conta.contaId), isNull(aparelhos.revogadoEm)))).toBe(1);
  });
});
