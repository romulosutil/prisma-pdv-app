import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MockBillingProvider, RelogioFalso } from '@pdv/shared';
import { eq } from 'drizzle-orm';
import { abrirPglite, type Conexao } from '../../api/src/db/conexao';
import { aparelhos, sessoes } from '../../api/src/db/schema';
import { criarApp } from '../../api/src/servidor';
import { Dados } from '../src/dados/dados';
import { mensagemDeErro } from '../src/servicos/backend';
import { ArmazenamentoSessaoSegura, type CofreSessao } from '../src/dados/armazenamentoSessaoSegura';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { totalDoCarrinho, valorRestante } from '../src/dados/carrinho';
import { ArmazenamentoMemoria } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

const id = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
class Cofre implements CofreSessao {
  dados = new Map<string, string>();
  async obter(chave: string) { return this.dados.get(chave) ?? null; }
  async gravar(chave: string, valor: string) { this.dados.set(chave, valor); }
  async remover(chave: string) { this.dados.delete(chave); }
}
let conexao: Conexao;
let app: Awaited<ReturnType<typeof criarApp>>;
const relogio = new RelogioFalso(new Date('2026-03-10T12:00:00Z'));
let numero = 0;
const abertos: DatabaseSync[] = [];
const respostas: { caminho: string; status: number }[] = [];

beforeAll(async () => {
  conexao = await abrirPglite();
  app = await criarApp({ db: conexao.db, relogio, billing: new MockBillingProvider(), fontesEan: [] });
  vi.stubGlobal('fetch', async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url);
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const resposta = await app.inject({ method: (init?.method ?? 'GET') as 'GET' | 'POST' | 'DELETE', url: url.pathname + url.search, headers, ...(init?.body ? { payload: String(init.body) } : {}) });
    respostas.push({ caminho: url.pathname, status: resposta.statusCode });
    return new Response(resposta.statusCode === 204 ? null : resposta.body, { status: resposta.statusCode, headers: { 'content-type': String(resposta.headers['content-type'] ?? 'application/json') } });
  });
}, 20000);
afterAll(async () => { vi.unstubAllGlobals(); for (const raw of abertos) raw.close(); await app?.close(); await conexao?.fechar(); });

async function montar() {
  const n = ++numero; let proximo = n * 1000; const novoId = () => id(++proximo);
  const base = new ArmazenamentoMemoria(); const cofre = new Cofre();
  const segura = new ArmazenamentoSessaoSegura(base, cofre, novoId);
  const raw = new DatabaseSync(':memory:'); abertos.push(raw);
  const sqlite = new ArmazenamentoSqlite(async () => sqliteBanco(raw), segura);
  const dados = new Dados(sqlite, novoId, 'http://api.local');
  const email = 'integracao' + n + '@exemplo.com';
  await dados.criarConta({ email, nomeResponsavel: 'Ana Real', nomeLoja: 'Loja Real', documento: String(n).padStart(11, '0'), tipoLoja: 'Mercado' });
  return { dados, base, cofre, raw, email };
}
async function codigo(email: string) {
  const resposta = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email } });
  expect(resposta.statusCode).toBe(200); return resposta.json().codigo as string;
}
function semToken(base: ArmazenamentoMemoria, token: string) {
  expect([...base.dados.values()].join('\n')).not.toContain(token);
}

describe('acesso com API local e SQLite', () => {
  it('orienta código incorreto e expirado no login real sem perder a sessão anterior', async () => {
    const { dados, email } = await montar();
    const sessao = dados.conta.obter().sessao!;
    const valido = await codigo(email);
    const incorreto = String((Number(valido) + 1) % 1_000_000).padStart(6, '0');
    for (const tentativa of [incorreto, valido]) {
      if (tentativa === valido) relogio.avancarHoras(11 / 60);
      respostas.length = 0;
      for (const chamar of [
        () => dados.backend.consultarVinculos!(email, tentativa),
        () => dados.backend.entrar({ email, codigo: tentativa, aparelhoId: sessao.aparelhoId, aparelhoNome: 'Caixa' }),
      ]) {
        const erro = await chamar().catch(e => e);
        expect(erro).toMatchObject({ codigo: 'codigo_invalido', status: 401 });
        expect(mensagemDeErro(erro)).toBe('Código inválido ou expirado. Confira o código ou solicite outro.');
        expect(dados.conta.obter().sessao).toEqual(sessao);
      }
      expect(respostas).toEqual([{ caminho: '/auth/vinculos', status: 401 }, { caminho: '/auth/login', status: 401 }]);
    }
  }, 20000);
  it('cria conta e entra três vezes usando o mesmo aparelho e perfil real', async () => {
    const { dados, base, email } = await montar();
    const inicial = dados.conta.obter().sessao!; semToken(base, inicial.token);
    for (let i = 0; i < 3; i++) {
      if (i > 0) relogio.avancarHoras(1 / 60);
      await dados.entrar(email, await codigo(email));
      const atual = dados.conta.obter();
      expect(atual.sessao?.aparelhoId).toBe(inicial.aparelhoId);
      expect(atual.perfil).toMatchObject({ nomeResponsavel: 'Ana Real', nomeLoja: 'Loja Real', email });
      semToken(base, atual.sessao!.token);
    }
    const linhas = await conexao.db.select().from(aparelhos).where(eq(aparelhos.contaId, inicial.contaId));
    expect(linhas.map(a => a.id)).toEqual([inicial.aparelhoId]);
  }, 20000);
  it('recupera checkout parcial após 401 real por expiração e conclui localmente', async () => {
    const { dados, raw, email } = await montar(); const anterior = dados.conta.obter().sessao!;
    const produto = await dados.produtos.criar({ nome: 'Produto', precoCentavos: 2500 });
    const caixa = await dados.caixa.abrir(500);
    await dados.carrinho.adicionarProduto(produto); await dados.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
    const rascunho = raw.prepare('SELECT venda_id FROM rascunhos').get() as { venda_id: string };
    relogio.avancarDias(31);
    respostas.length = 0;
    await expect(dados.backend.obterPerfil()).rejects.toMatchObject({ codigo: 'nao_autorizado' });
    expect(respostas).toEqual([{ caminho: '/conta', status: 401 }]);
    expect(dados.conta.obter()).toMatchObject({ sessao: null, identidade: { contaId: anterior.contaId }, reautenticacaoNecessaria: true });
    expect(dados.produtos.obter()).toEqual([produto]); expect(dados.caixa.atual()).toEqual(caixa);
    expect(totalDoCarrinho(dados.carrinho.obter().itens)).toBe(2500); expect(valorRestante(2500, dados.carrinho.obter().parcelas)).toBe(1500);
    await dados.entrar(email, await codigo(email));
    expect(dados.conta.obter().sessao).toMatchObject({ contaId: anterior.contaId, aparelhoId: anterior.aparelhoId });
    expect(dados.produtos.obter()).toEqual([produto]); expect(dados.caixa.atual()).toEqual(caixa);
    expect(valorRestante(2500, dados.carrinho.obter().parcelas)).toBe(1500);
    await dados.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1500, trocoCentavos: 0 });
    const venda = await dados.carrinho.concluir();
    expect(venda.id).toBe(rascunho.venda_id); expect(venda.totalCentavos).toBe(2500);
    expect(venda.pagamentos.map(p => p.valorCentavos)).toEqual([1000, 1500]);
    const pendencias = raw.prepare('SELECT payload_json FROM outbox ORDER BY sequencia').all().map((r) => JSON.parse(String(r.payload_json)));
    expect(pendencias.map((m) => [m.entidade, m.dados.id])).toEqual([['produto', produto.id], ['caixa', caixa.id], ['venda', venda.id]]);
  }, 20000);
  it('revoga o próprio aparelho na API, invalida tokens e preserva dados locais', async () => {
    const { dados } = await montar(); const sessao = dados.conta.obter().sessao!;
    const produto = await dados.produtos.criar({ nome: 'Produto', precoCentavos: 2500 });
    const caixa = await dados.caixa.abrir(500);
    await dados.revogarAparelho(sessao.aparelhoId);
    expect(dados.conta.obter()).toMatchObject({ sessao: null, identidade: { contaId: sessao.contaId } });
    const registros = await conexao.db.select().from(sessoes).where(eq(sessoes.aparelhoId, sessao.aparelhoId));
    expect(registros.length).toBeGreaterThan(0); expect(registros.every(s => s.revogadaEm !== null)).toBe(true);
    const resposta = await app.inject({ method: 'GET', url: '/conta', headers: { authorization: 'Bearer ' + sessao.token } });
    expect(resposta.statusCode).toBe(401); expect(dados.produtos.obter()).toEqual([produto]); expect(dados.caixa.atual()).toEqual(caixa);
  }, 20000);
});
