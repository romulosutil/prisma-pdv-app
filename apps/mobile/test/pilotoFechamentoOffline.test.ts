// Reprodução do defeito do piloto (APK 0.1.14, Android físico): fechar o caixa OFFLINE falha com o toast genérico
// porque o erro lançado não é ErroDeDominio. Estes casos imprimem a mensagem REAL e a pilha.
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockBillingProvider, RelogioFalso } from '@pdv/shared';
import { abrirPglite, type Conexao } from '../../api/src/db/conexao';
import { criarApp } from '../../api/src/servidor';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoSessaoSegura, type CofreSessao } from '../src/dados/armazenamentoSessaoSegura';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
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
let rede = true;
let numero = 0; let faixa = 0;
const pastas: string[] = []; const abertos: DatabaseSync[] = [];

beforeAll(async () => {
  conexao = await abrirPglite();
  app = await criarApp({ db: conexao.db, relogio, billing: new MockBillingProvider(), fontesEan: [] });
  vi.stubGlobal('fetch', async (entrada: string | URL | Request, init?: RequestInit) => {
    if (!rede) throw new TypeError('Network request failed');
    const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url);
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const r = await app.inject({ method: (init?.method ?? 'GET') as 'GET' | 'POST' | 'DELETE', url: url.pathname + url.search, headers, ...(init?.body ? { payload: String(init.body) } : {}) });
    return new Response(r.statusCode === 204 ? null : r.body, { status: r.statusCode, headers: { 'content-type': String(r.headers['content-type'] ?? 'application/json') } });
  });
}, 30000);
afterEach(() => { rede = true; for (const raw of abertos.splice(0)) { try { raw.close(); } catch { /* ja fechado */ } } for (const p of pastas.splice(0)) rmSync(p, { recursive: true, force: true }); });
afterAll(async () => { vi.unstubAllGlobals(); await app?.close(); await conexao?.fechar(); });

/** Aparelho: arquivo SQLite + base/cofre que sobrevivem ao encerramento forçado. */
function aparelho() {
  const pasta = mkdtempSync(join(tmpdir(), 'pdv-fecha-off-')); pastas.push(pasta);
  return { caminho: join(pasta, 'dados.sqlite'), base: new ArmazenamentoMemoria(), cofre: new Cofre() };
}
type Aparelho = ReturnType<typeof aparelho>;
/** Uma "vida" do app: instância nova de tudo sobre o mesmo arquivo. */
function vida(a: Aparelho) {
  let proximo = ++faixa * 100000; const novoId = () => id(++proximo);
  const raw = new DatabaseSync(a.caminho); abertos.push(raw);
  const segura = new ArmazenamentoSessaoSegura(a.base, a.cofre, novoId);
  const sqlite = new ArmazenamentoSqlite(async () => sqliteBanco(raw), segura);
  return { dados: new Dados(sqlite, novoId, 'http://api.local'), raw, novoId };
}
async function novoAparelho() {
  const a = aparelho(); const v = vida(a); const n = ++numero;
  await v.dados.criarConta({ email: 'fecha' + n + '@exemplo.com', nomeResponsavel: 'Ana Real', nomeLoja: 'Loja Real', documento: String(n + 500).padStart(11, '0'), tipoLoja: 'Mercado' });
  return { a, v };
}
/** Força-parar e reabrir: fecha o SQLite, cria Dados novo sobre o mesmo arquivo e inicia (online ou offline). */
async function reabrir(a: Aparelho, antigo: ReturnType<typeof vida>) {
  antigo.raw.close();
  const v = vida(a); await v.dados.iniciar(); await v.dados.carrinho.carregar(); return v;
}
async function vendaAvulso(dados: Dados, total: number, partes: number[], aoMeio?: () => Promise<Dados>) {
  let d = dados;
  await d.carrinho.adicionarAvulso(total, 'Avulso');
  for (let i = 0; i < partes.length; i++) {
    await d.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: partes[i]!, trocoCentavos: 0 });
    if (i === 0 && aoMeio) d = await aoMeio();
  }
  return { venda: await d.carrinho.concluir(), dados: d };
}
async function tentarFechar(dados: Dados, contado: number) {
  try { return { ok: true as const, caixa: await dados.caixa.fechar(contado, dados.vendas.obter().vendas, 0) }; }
  catch (e) {
    const err = e as Error & { codigo?: string };
    const resumo = `${err?.constructor?.name} codigo=${err?.codigo} msg=${err?.message}\n${String(err?.stack ?? e).split('\n').slice(0, 8).join('\n')}`;
    console.log('ERRO REAL AO FECHAR:\n' + resumo);
    return { ok: false as const, resumo };
  }
}
/** Dono convida um Gerente e este entra no mesmo aparelho (como no Android do piloto). Opcionalmente com histórico já sincronizado. */
async function comoGerente(com_historico: boolean) {
  const { a, v } = await novoAparelho();
  if (com_historico) {
    await v.dados.abrirCaixa(5000);
    await vendaAvulso(v.dados, 1000, [1000]); await v.dados.carrinho.limpar();
    await v.dados.sincronizacao.sincronizar({ forcar: true });
    await v.dados.caixa.fechar(6000, v.dados.vendas.obter().vendas, 0);
    await v.dados.sincronizacao.sincronizar({ forcar: true });
  }
  const g = await v.dados.backend.convidar!({ email: 'gerente' + (++numero) + '@exemplo.com', nome: 'Gerente', papel: 'gerente' });
  const r = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: g.email } });
  const codigo = r.json().codigo as string;
  await v.dados.consultarVinculos(g.email, codigo);
  await v.dados.entrar(g.email, codigo, g);
  expect(v.dados.conta.obter().sessao?.papel).toBe('gerente');
  return { a, v };
}
const esperar = async (r: ReturnType<typeof tentarFechar>) => { const x = await r; if (!x.ok) expect.fail(x.resumo); return x; };

describe('fechar caixa offline (piloto 0.1.14)', () => {
  it('(a) offline simples: abre online, vende R$ 25 offline, fecha offline sem relancar', async () => {
    const { v } = await novoAparelho(); const { dados } = v;
    await dados.abrirCaixa(10000);
    rede = false;
    await vendaAvulso(dados, 2500, [2500]);
    await esperar(tentarFechar(dados, 12500));
  }, 30000);

  it('(b) sequencia completa: split + relancar online, venda offline, relancar, reboot, fechar offline', async () => {
    const { a, v: v0 } = await novoAparelho(); let v = v0;
    await v.dados.abrirCaixa(10000);
    const r = await vendaAvulso(v.dados, 4000, [2000, 2000], async () => { v = await reabrir(a, v); return v.dados; });
    expect(r.venda.totalCentavos).toBe(4000);
    v = await reabrir(a, v);
    rede = false;
    v = await reabrir(a, v);
    await vendaAvulso(v.dados, 2500, [2500]);
    v = await reabrir(a, v);
    v = await reabrir(a, v);
    expect(v.dados.vendas.obter().vendas.length).toBeGreaterThanOrEqual(2);
    await esperar(tentarFechar(v.dados, 16500));
  }, 60000);

  it('(c) split + relancar online, sem queda de rede: fechar online', async () => {
    const { a, v: v0 } = await novoAparelho(); let v = v0;
    await v.dados.abrirCaixa(10000);
    await vendaAvulso(v.dados, 4000, [2000, 2000], async () => { v = await reabrir(a, v); return v.dados; });
    v = await reabrir(a, v);
    await vendaAvulso(v.dados, 2500, [2500]);
    v = await reabrir(a, v);
    await esperar(tentarFechar(v.dados, 16500));
  }, 60000);

  it('(d) sem split, com relancar offline: abre online, relanca offline, vende, relanca, fecha offline', async () => {
    const { a, v: v0 } = await novoAparelho(); let v = v0;
    await v.dados.abrirCaixa(10000);
    rede = false;
    v = await reabrir(a, v);
    await vendaAvulso(v.dados, 2500, [2500]);
    v = await reabrir(a, v);
    await esperar(tentarFechar(v.dados, 12500));
  }, 60000);

  it('(e) split online + relancar, depois offline sem nova venda: fechar offline', async () => {
    const { a, v: v0 } = await novoAparelho(); let v = v0;
    await v.dados.abrirCaixa(10000);
    await vendaAvulso(v.dados, 4000, [2000, 2000], async () => { v = await reabrir(a, v); return v.dados; });
    rede = false;
    v = await reabrir(a, v);
    await esperar(tentarFechar(v.dados, 14000));
  }, 60000);

  for (const historico of [false, true]) {
    it('(f' + (historico ? '2' : '1') + ') Gerente, sequencia completa do aparelho' + (historico ? ' com historico sincronizado' : ''), async () => {
      const { a, v: v0 } = await comoGerente(historico); let v = v0;
      await v.dados.abrirCaixa(10000);
      const r = await vendaAvulso(v.dados, 4000, [2000, 2000], async () => { v = await reabrir(a, v); return v.dados; });
      expect(r.venda.totalCentavos).toBe(4000);
      v = await reabrir(a, v);
      rede = false;
      v = await reabrir(a, v);
      await vendaAvulso(v.dados, 2500, [2500]);
      v = await reabrir(a, v);
      v = await reabrir(a, v);
      expect(v.dados.pode('movimentar_proprio_caixa')).toBe(true);
      await esperar(tentarFechar(v.dados, 16500));
    }, 90000);
  }

  it('(g) Gerente, offline, com sincronizacao (falha de rede) disputando em paralelo com o fechamento', async () => {
    const { a, v: v0 } = await comoGerente(true); let v = v0;
    await v.dados.abrirCaixa(10000);
    await vendaAvulso(v.dados, 4000, [2000, 2000], async () => { v = await reabrir(a, v); return v.dados; });
    rede = false;
    v = await reabrir(a, v);
    await vendaAvulso(v.dados, 2500, [2500]);
    v = await reabrir(a, v);
    const sincs = [v.dados.sincronizacao.sincronizar(), v.dados.sincronizacao.sincronizar({ forcar: true })];
    await esperar(tentarFechar(v.dados, 16500));
    await Promise.allSettled(sincs);
    expect(v.dados.caixa.atual()).toBeNull();
  }, 90000);
});

/** CP 152: Gerente com dados de OUTRO operador (dono) já sincronizados; reinicia a frio sem rede. */
async function gerenteComDadosDeOutros() {
  const { a, v: v0 } = await novoAparelho(); let v = v0;
  await v.dados.abrirCaixa(5000);
  await vendaAvulso(v.dados, 1000, [1000]); await v.dados.carrinho.limpar();
  await v.dados.sincronizacao.sincronizar({ forcar: true });
  await v.dados.caixa.fechar(6000, v.dados.vendas.obter().vendas, 0);
  await v.dados.sincronizacao.sincronizar({ forcar: true });
  const g = await v.dados.backend.convidar!({ email: 'gerente' + (++numero) + '@exemplo.com', nome: 'Gerente', papel: 'gerente' });
  const cod = (await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: g.email } })).json().codigo as string;
  await v.dados.consultarVinculos(g.email, cod);
  await v.dados.entrar(g.email, cod, g);
  const gerenteId = v.dados.conta.obter().sessao!.operadorId;
  await v.dados.sincronizacao.sincronizar({ forcar: true });
  await v.dados.abrirCaixa(10000);
  const r = await vendaAvulso(v.dados, 3000, [3000]); await v.dados.carrinho.limpar();
  const r2 = await vendaAvulso(v.dados, 1500, [1500]); await v.dados.carrinho.limpar();
  await v.dados.sincronizacao.sincronizar({ forcar: true });
  await v.dados.sincronizacao.sincronizar({ forcar: true });
  rede = false;
  v = await reabrir(a, v);
  return { a, v, gerenteId, vendaPropria: r.venda.id, vendaPropria2: r2.venda.id };
}
const linhas = (raw: DatabaseSync, tabela: string, perfil: string) => (raw.prepare(`SELECT id, payload_json FROM ${tabela} WHERE loja_id LIKE ?`).all('%' + perfil + '%') as { id: string; payload_json: string }[]).map((l): Record<string, any> => ({ id: l.id, ...JSON.parse(l.payload_json) }));
/** Linhas da partição SQLite do perfil do Gerente que pertencem a outros operadores. */
const deOutros = (raw: DatabaseSync, tabela: string, gerenteId: string) => linhas(raw, tabela, gerenteId).filter((x) => x.operadorId !== gerenteId);
const deletesNaOutbox = (raw: DatabaseSync) => (raw.prepare('SELECT payload_json FROM outbox').all() as { payload_json: string }[]).map((l) => JSON.parse(l.payload_json)).filter((m) => m.operacao === 'delete');

describe('Gerente com dados de outros operadores, reinicio a frio offline (CP 152)', () => {
  // Servidor com cobrança desativada (assinatura liberada) e relógio do app alinhado ao dele: sem isso o servidor rejeita a venda do dono por assinatura_suspensa e o histórico não chega ao Gerente.
  let appOriginal: typeof app;
  beforeAll(async () => { appOriginal = app; app = await criarApp({ db: conexao.db, relogio, billing: new MockBillingProvider(), cobrancaDesativada: true, fontesEan: [] }); }, 30000);
  afterAll(async () => { await app.close(); app = appOriginal; });
  beforeEach(() => { vi.spyOn(Date, 'now').mockImplementation(() => relogio.agora().getTime()); });
  afterEach(() => { vi.restoreAllMocks(); });
  it('(h) pre-condicao: particao SQLite do Gerente tem caixa fechado e vendas de outro operador', async () => {
    const { v, gerenteId } = await gerenteComDadosDeOutros();
    expect(deOutros(v.raw, 'caixas', gerenteId).some((c) => c.fechamento)).toBe(true);
    expect(deOutros(v.raw, 'vendas', gerenteId).length).toBeGreaterThan(0);
  }, 90000);

  it('(i) fechar o caixa proprio offline preserva o caixa fechado de outro operador e nao gera delete', async () => {
    const { v, gerenteId } = await gerenteComDadosDeOutros();
    const antes = deOutros(v.raw, 'caixas', gerenteId).map((c) => c.id).sort();
    expect(antes.length).toBeGreaterThan(0);
    await esperar(tentarFechar(v.dados, 14500));
    expect(deOutros(v.raw, 'caixas', gerenteId).map((c) => c.id).sort()).toEqual(antes);
    expect(deletesNaOutbox(v.raw)).toEqual([]);
  }, 90000);

  it('(j) cancelar venda propria offline preserva vendas de outros e nao enfileira delete', async () => {
    const { v, gerenteId, vendaPropria } = await gerenteComDadosDeOutros();
    const antes = deOutros(v.raw, 'vendas', gerenteId).map((x) => x.id).sort();
    expect(antes.length).toBeGreaterThan(0);
    await v.dados.vendas.cancelar(vendaPropria);
    expect(deOutros(v.raw, 'vendas', gerenteId).map((x) => x.id).sort()).toEqual(antes);
    expect(deletesNaOutbox(v.raw)).toEqual([]);
  }, 90000);

  it('(k) apos o reinicio offline a memoria do Gerente inclui os caixas e vendas de outros', async () => {
    const { v, gerenteId } = await gerenteComDadosDeOutros();
    expect(v.dados.pode('conferir_caixas')).toBe(true);
    expect(v.dados.caixa.obter().some((c) => c.operadorId !== gerenteId && c.fechamento)).toBe(true);
    expect(v.dados.vendas.obter().vendas.some((x) => x.operadorId !== gerenteId)).toBe(true);
  }, 90000);
});
