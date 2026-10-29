import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MockBillingProvider, RelogioFalso } from '@pdv/shared';
import { eq } from 'drizzle-orm';
import { abrirPglite, type Conexao } from '../../api/src/db/conexao';
import { aparelhos, contas, sessoes } from '../../api/src/db/schema';
import { criarApp } from '../../api/src/servidor';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoSessaoSegura, type CofreSessao } from '../src/dados/armazenamentoSessaoSegura';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { totalDoCarrinho, valorRestante } from '../src/dados/carrinho';
import { ArmazenamentoMemoria } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
class Cofre implements CofreSessao {
  dados = new Map<string, string>();
  async obter(k: string) { return this.dados.get(k) ?? null; }
  async gravar(k: string, v: string) { this.dados.set(k, v); }
  async remover(k: string) { this.dados.delete(k); }
}
let conexao: Conexao; let app: Awaited<ReturnType<typeof criarApp>>;
const abertos: DatabaseSync[] = []; const chamadas: { metodo: string; caminho: string; status: number }[] = [];
let n = 0;
beforeAll(async () => {
  conexao = await abrirPglite();
  app = await criarApp({ db: conexao.db, relogio: new RelogioFalso(new Date('2026-03-10T12:00:00Z')), billing: new MockBillingProvider(), fontesEan: [] });
  vi.stubGlobal('fetch', async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url);
    const metodo = init?.method ?? 'GET';
    const resposta = await app.inject({ method: metodo as 'GET' | 'POST' | 'DELETE', url: url.pathname + url.search, headers: Object.fromEntries(new Headers(init?.headers).entries()), ...(init?.body ? { payload: String(init.body) } : {}) });
    chamadas.push({ metodo, caminho: url.pathname, status: resposta.statusCode });
    return new Response(resposta.statusCode === 204 ? null : resposta.body, { status: resposta.statusCode, headers: { 'content-type': String(resposta.headers['content-type'] ?? 'application/json') } });
  });
}, 20000);
afterAll(async () => { vi.unstubAllGlobals(); for (const raw of abertos) raw.close(); await app?.close(); await conexao?.fechar(); });
function montar() {
  let proximo = ++n * 1000; const novoId = () => id(++proximo);
  const base = new ArmazenamentoMemoria(); const cofre = new Cofre(); const seguro = new ArmazenamentoSessaoSegura(base, cofre, novoId);
  const raw = new DatabaseSync(':memory:'); abertos.push(raw);
  const sqlite = new ArmazenamentoSqlite(async () => sqliteBanco(raw), seguro);
  return { base, cofre, raw, sqlite, novoId, dados: new Dados(sqlite, novoId, 'http://api.local') };
}
const formulario = (email: string, documento: string, nome: string) => ({ email, documento, nomeResponsavel: nome, nomeLoja: `Loja ${nome}`, tipoLoja: 'Mercado' });
async function codigo(email: string) {
  const res = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email } });
  expect(res.statusCode).toBe(200); return res.json().codigo as string;
}
function semToken(base: ArmazenamentoMemoria, token: string) { expect([...base.dados.values()].join('\n')).not.toContain(token); }

describe('troca de contas com API real em processo', () => {
  it('mantém aparelhos por conta e isolamento A → B → A após reiniciar', async () => {
    const c = montar(); let dados = c.dados;
    const a = formulario('troca-a@exemplo.com', '00000000011', 'Ana');
    const b = formulario('troca-b@exemplo.com', '00000000012', 'Bia');
    await dados.criarConta(a); const sessaoA = dados.conta.obter().sessao!;
    const instalacao = await c.base.obter('instalacao'); semToken(c.base, sessaoA.token);
    await dados.preferencias.alterar({ bipe: false, lanterna: true });
    await dados.armazenamentoDaLoja.gravar('chavePix', 'ana@pix.example');
    chamadas.length = 0; await dados.criarConta(b); const sessaoB = dados.conta.obter().sessao!;
    expect(chamadas).toContainEqual({ metodo: 'POST', caminho: '/contas', status: 201 });
    expect(sessaoB.contaId).not.toBe(sessaoA.contaId); expect(sessaoB.lojaId).not.toBe(sessaoA.lojaId); expect(sessaoB.aparelhoId).not.toBe(sessaoA.aparelhoId);
    expect(dados.conta.obter().perfil).toMatchObject({ nomeResponsavel: 'Bia', nomeLoja: 'Loja Bia', email: b.email });
    expect(dados.preferencias.obter()).toMatchObject({ bipe: true, lanterna: false });
    expect(await dados.armazenamentoDaLoja.obter('chavePix')).toBeNull(); semToken(c.base, sessaoB.token);
    dados = new Dados(c.sqlite, c.novoId, 'http://api.local'); await dados.iniciar();
    for (const [form, esperada] of [[a, sessaoA], [b, sessaoB], [a, sessaoA], [b, sessaoB]] as const) {
      chamadas.length = 0; await dados.entrar(form.email, await codigo(form.email));
      const atual = dados.conta.obter();
      expect(atual.sessao).toMatchObject({ contaId: esperada.contaId, lojaId: esperada.lojaId, aparelhoId: esperada.aparelhoId });
      expect(atual.perfil).toMatchObject({ nomeResponsavel: form.nomeResponsavel, nomeLoja: form.nomeLoja, email: form.email });
      expect(chamadas).toContainEqual({ metodo: 'POST', caminho: '/auth/login', status: 200 });
      expect(chamadas).toContainEqual({ metodo: 'GET', caminho: '/conta', status: 200 });
      semToken(c.base, atual.sessao!.token);
      if (form === a) { expect(dados.preferencias.obter()).toMatchObject({ bipe: false, lanterna: true }); expect(await dados.armazenamentoDaLoja.obter('chavePix')).toBe('ana@pix.example'); }
      else { expect(dados.preferencias.obter()).toMatchObject({ bipe: true, lanterna: false }); expect(await dados.armazenamentoDaLoja.obter('chavePix')).toBeNull(); }
    }
    expect(await c.base.obter('instalacao')).toEqual(instalacao);
    for (const s of [sessaoA, sessaoB]) {
      const linhas = await conexao.db.select().from(aparelhos).where(eq(aparelhos.contaId, s.contaId));
      expect(linhas).toHaveLength(1); expect(linhas[0]).toMatchObject({ id: s.aparelhoId, revogadoEm: null });
    }
  }, 20000);

  it('recusa criar ou entrar em B com rascunho A antes de qualquer chamada de autenticação', async () => {
    const c = montar(); const outro = montar();
    const a = formulario('pendente-a@exemplo.com', '00000000021', 'Ana');
    const b = formulario('pendente-b@exemplo.com', '00000000022', 'Bia');
    const nova = formulario('pendente-c@exemplo.com', '00000000023', 'Caio');
    await outro.dados.criarConta(b); const codigoB = await codigo(b.email);
    await c.dados.criarConta(a); const antes = structuredClone(c.dados.conta.obter());
    await c.dados.carrinho.adicionarAvulso(2500, 'Avulso'); await c.dados.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
    const checkout = structuredClone(c.dados.carrinho.obter());
    const mapa = await c.base.obter('instalacao_aparelhos');
    const contasAntes = await conexao.db.select().from(contas); const sessoesAntes = await conexao.db.select().from(sessoes);
    chamadas.length = 0;
    await expect(c.dados.criarConta(nova)).rejects.toMatchObject({ codigo: 'conflito' });
    await expect(c.dados.entrar(b.email, codigoB)).rejects.toMatchObject({ codigo: 'conflito' });
    expect(chamadas).toEqual([]);
    expect(await conexao.db.select().from(contas)).toHaveLength(contasAntes.length);
    expect(await conexao.db.select().from(sessoes)).toHaveLength(sessoesAntes.length);
    expect(await c.base.obter('instalacao_aparelhos')).toEqual(mapa);
    expect(c.dados.conta.obter()).toEqual(antes); expect(c.dados.carrinho.obter()).toEqual(checkout);
    expect(totalDoCarrinho(checkout.itens)).toBe(2500); expect(valorRestante(2500, checkout.parcelas)).toBe(1500);
    expect(c.raw.prepare('SELECT COUNT(*) AS n FROM rascunhos').get()).toMatchObject({ n: 1 });
  }, 20000);
});
