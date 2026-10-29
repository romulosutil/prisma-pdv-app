import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { MockBillingProvider, RelogioFalso } from '@pdv/shared';
import { randomUUID } from 'node:crypto';
import { abrirPglite, type Conexao } from '../../api/src/db/conexao';
import { aparelhos, sessoes, vendas, itensVenda, pagamentosVenda, caixas, movimentosCaixa } from '../../api/src/db/schema';
import { criarApp } from '../../api/src/servidor';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoSessaoSegura, type CofreSessao } from '../src/dados/armazenamentoSessaoSegura';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { totalDoCarrinho, valorRestante } from '../src/dados/carrinho';
import { ArmazenamentoMemoria } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

class Cofre implements CofreSessao {
  dados = new Map<string, string>();
  falhar = false;
  async obter(k: string) { return this.dados.get(k) ?? null; }
  async gravar(k: string, v: string) { if (this.falhar) { this.falhar = false; throw new Error('cofre indisponível'); } this.dados.set(k, v); }
  async remover(k: string) { this.dados.delete(k); }
}
let conexao: Conexao; let app: Awaited<ReturnType<typeof criarApp>>;
const relogio = new RelogioFalso(new Date('2026-03-10T12:00:00Z'));
const abertos: DatabaseSync[] = [];
let perderResposta = false;
const confirmacoes: { corpo: string; resposta: string }[] = [];
beforeAll(async () => {
  conexao = await abrirPglite();
  app = await criarApp({ db: conexao.db, relogio, billing: new MockBillingProvider(), fontesEan: [] });
  vi.stubGlobal('fetch', async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url);
    const resposta = await app.inject({ method: (init?.method ?? 'GET') as 'GET' | 'POST' | 'DELETE', url: url.pathname + url.search, headers: Object.fromEntries(new Headers(init?.headers).entries()), ...(init?.body ? { payload: String(init.body) } : {}) });
    if (url.pathname === '/auth/recuperacao/confirmar') {
      confirmacoes.push({ corpo: String(init?.body), resposta: resposta.body });
      if (perderResposta) { perderResposta = false; throw new Error('resposta perdida após commit'); }
    }
    return new Response(resposta.statusCode === 204 ? null : resposta.body, { status: resposta.statusCode, headers: { 'content-type': 'application/json' } });
  });
}, 20000);
afterAll(async () => { vi.unstubAllGlobals(); for (const raw of abertos) raw.close(); await app?.close(); await conexao?.fechar(); });
function montar() {
  const base = new ArmazenamentoMemoria(); const cofre = new Cofre();
  const seguro = new ArmazenamentoSessaoSegura(base, cofre, randomUUID);
  const raw = new DatabaseSync(':memory:'); abertos.push(raw);
  const sqlite = new ArmazenamentoSqlite(async () => sqliteBanco(raw), seguro);
  return { base, cofre, raw, sqlite, dados: new Dados(sqlite, randomUUID, 'http://api.local') };
}
async function codigo(email: string) {
  const resposta = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email } });
  expect(resposta.statusCode).toBe(200); return resposta.json().codigo as string;
}

it('recupera em duas instalações SQLite com API real, retry e finanças preservadas', async () => {
  const origem = montar(); const nova = montar(); const email = 'recuperacao@exemplo.com';
  await origem.dados.criarConta({ email, nomeResponsavel: 'Ana Real', nomeLoja: 'Loja Real', documento: '00000000031', tipoLoja: 'Mercado' });
  const anterior = origem.dados.conta.obter().sessao!;
  const produto = await origem.dados.produtos.criar({ nome: 'Produto', precoCentavos: 2500 });
  const caixa = await origem.dados.caixa.abrir(500);
  await origem.dados.carrinho.adicionarProduto(produto); await origem.dados.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
  const agora = relogio.agora(); const vendaId = randomUUID(); const caixaId = randomUUID();
  await conexao.db.insert(vendas).values({ id: vendaId, lojaId: anterior.lojaId, aparelhoId: anterior.aparelhoId, operadorId: anterior.operadorId, totalCentavos: 2500, status: 'concluida', criadoEm: agora, atualizadoEm: agora, versao: 1 });
  await conexao.db.insert(itensVenda).values({ id: randomUUID(), vendaId, lojaId: anterior.lojaId, posicao: 0, descricao: 'Item', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, totalCentavos: 2500, criadoEm: agora });
  await conexao.db.insert(pagamentosVenda).values({ id: randomUUID(), vendaId, lojaId: anterior.lojaId, posicao: 0, meio: 'dinheiro', valorCentavos: 2500, trocoCentavos: 0, criadoEm: agora });
  await conexao.db.insert(caixas).values({ id: caixaId, lojaId: anterior.lojaId, aparelhoId: anterior.aparelhoId, operadorId: anterior.operadorId, abertoEm: agora, trocoInicialCentavos: 1000, criadoEm: agora, atualizadoEm: agora, versao: 1 });
  await conexao.db.insert(movimentosCaixa).values({ id: randomUUID(), caixaId, lojaId: anterior.lojaId, tipo: 'sangria', valorCentavos: 1500, criadoEm: agora });
  const financeiro = async () => Promise.all([conexao.db.select().from(vendas), conexao.db.select().from(itensVenda), conexao.db.select().from(pagamentosVenda), conexao.db.select().from(caixas), conexao.db.select().from(movimentosCaixa)]);
  const antes = await financeiro();
  const codigoLogin = await codigo(email);
  await expect(nova.dados.entrar(email, codigoLogin)).rejects.toMatchObject({ codigo: 'limite_aparelhos', status: 409 });
  const visao = await nova.dados.iniciarRecuperacao(email, codigoLogin);
  expect(visao).not.toHaveProperty('token'); expect(visao.perfil).toMatchObject({ email, nomeLoja: 'Loja Real', nomeResponsavel: 'Ana Real' });
  expect(visao.aparelhos.map(a => a.id)).toEqual([anterior.aparelhoId]);
  let perfilConcluido = false;
  const obterPerfil = nova.dados.backend.obterPerfil.bind(nova.dados.backend);
  vi.spyOn(nova.dados.backend, 'obterPerfil').mockImplementation(async token => {
    perfilConcluido = false; const resposta = await obterPerfil(token); perfilConcluido = true; return resposta;
  });
  const gravarCofre = nova.cofre.gravar.bind(nova.cofre);
  const escritaCofre = vi.spyOn(nova.cofre, 'gravar').mockImplementation(async (chave, valor) => {
    expect(perfilConcluido).toBe(true); await gravarCofre(chave, valor);
  });
  perderResposta = true;
  await expect(nova.dados.confirmarRecuperacao(anterior.aparelhoId)).rejects.toMatchObject({ codigo: 'rede' });
  nova.cofre.falhar = true;
  await expect(nova.dados.confirmarRecuperacao(anterior.aparelhoId)).rejects.toThrow('armazenamento seguro');
  await nova.dados.confirmarRecuperacao(anterior.aparelhoId);
  expect(escritaCofre).toHaveBeenCalledTimes(2);
  expect(confirmacoes).toHaveLength(3); expect(confirmacoes[0]!.corpo).toBe(confirmacoes[1]!.corpo); expect(confirmacoes[1]!.corpo).toBe(confirmacoes[2]!.corpo); expect(confirmacoes[0]!.resposta).toBe(confirmacoes[1]!.resposta); expect(confirmacoes[1]!.resposta).toBe(confirmacoes[2]!.resposta);
  const atual = nova.dados.conta.obter().sessao!;
  expect(atual.aparelhoId).not.toBe(anterior.aparelhoId); expect(atual.contaId).toBe(anterior.contaId);
  expect([...nova.base.dados.values()].join('\n')).not.toContain(atual.token);
  expect([...nova.base.dados.values()].join('\n')).not.toContain(JSON.parse(confirmacoes[0]!.corpo).token);
  expect((await conexao.db.select().from(aparelhos)).filter(a => !a.revogadoEm)).toHaveLength(1);
  expect((await conexao.db.select().from(sessoes)).filter(s => s.aparelhoId === atual.aparelhoId)).toHaveLength(1);
  await expect(origem.dados.backend.obterPerfil()).rejects.toMatchObject({ status: 401 });
  expect(origem.dados.produtos.obter()).toEqual([produto]); expect(origem.dados.caixa.atual()).toEqual(caixa);
  expect(totalDoCarrinho(origem.dados.carrinho.obter().itens)).toBe(2500); expect(valorRestante(2500, origem.dados.carrinho.obter().parcelas)).toBe(1500);
  expect(origem.dados.carrinho.obter().parcelas.map(p => p.valorCentavos)).toEqual([1000]);
  expect(origem.raw.prepare('SELECT COUNT(*) AS n FROM rascunhos').get()).toMatchObject({ n: 1 });
  expect(nova.dados.produtos.obter()).toEqual([]); expect(nova.dados.carrinho.obter().itens).toEqual([]);
  expect(await financeiro()).toEqual(antes);
}, 30000);

it('retry após metadata confirmada e exceção preserva cofre e sessão única', async () => {
  const origem = montar(); const nova = montar(); const email = 'metadata@exemplo.com';
  await origem.dados.criarConta({ email, nomeResponsavel: 'Bia', nomeLoja: 'Loja Bia', documento: '00000000032', tipoLoja: 'Mercado' });
  const anterior = origem.dados.conta.obter().sessao!;
  const visao = await nova.dados.iniciarRecuperacao(email, await codigo(email));
  const inicio = confirmacoes.length;
  const gravar = nova.base.gravar.bind(nova.base); let falhou = false;
  const spy = vi.spyOn(nova.base, 'gravar').mockImplementation(async (chave, valor) => {
    await gravar(chave, valor);
    if (chave === 'conta' && !falhou) { falhou = true; throw new Error('falha depois do commit'); }
  });
  await expect(nova.dados.confirmarRecuperacao(anterior.aparelhoId)).rejects.toThrow('armazenamento seguro');
  expect(falhou).toBe(true);
  const resposta = JSON.parse(confirmacoes[inicio]!.resposta) as { token: string; aparelhoId: string };
  const metadata = await nova.base.obter<{ identidade: { aparelhoId: string }; referenciaCredencial: string }>('conta');
  expect(metadata?.identidade.aparelhoId).toBe(visao.aparelhoNovoId);
  expect(nova.cofre.dados.get('pdv-sessao-' + metadata!.referenciaCredencial)).toBe(resposta.token);
  expect([...nova.base.dados.values()].join('\n')).not.toContain(resposta.token);
  expect([...nova.base.dados.values()].join('\n')).not.toContain(JSON.parse(confirmacoes[inicio]!.corpo).token);
  spy.mockRestore();
  await nova.dados.confirmarRecuperacao(anterior.aparelhoId);
  expect(confirmacoes[inicio + 1]!.corpo).toBe(confirmacoes[inicio]!.corpo);
  expect(confirmacoes[inicio + 1]!.resposta).toBe(confirmacoes[inicio]!.resposta);
  expect(nova.dados.conta.obter().sessao).toMatchObject({ token: resposta.token, aparelhoId: visao.aparelhoNovoId });
  expect((await conexao.db.select().from(sessoes)).filter(s => s.aparelhoId === resposta.aparelhoId)).toHaveLength(1);
  expect((await conexao.db.select().from(aparelhos)).filter(a => a.contaId === anterior.contaId && !a.revogadoEm)).toHaveLength(1);
}, 30000);

it('preflight consulta pendências SQLite duráveis não carregadas nas duas fases', async () => {
  const local = montar(); const contaB = montar();
  const emailA = 'duravel-a@exemplo.com'; const emailB = 'duravel-b@exemplo.com';
  await local.dados.criarConta({ email: emailA, nomeResponsavel: 'A', nomeLoja: 'Loja A', documento: '00000000041', tipoLoja: 'Mercado' });
  await contaB.dados.criarConta({ email: emailB, nomeResponsavel: 'B', nomeLoja: 'Loja B', documento: '00000000042', tipoLoja: 'Mercado' });
  const antigoB = contaB.dados.conta.obter().sessao!;
  const tentativa = new Dados(local.sqlite, randomUUID, 'http://api.local');
  const iniciar = vi.spyOn(tentativa.backend, 'iniciarRecuperacao');
  const confirmar = vi.spyOn(tentativa.backend, 'confirmarRecuperacao');
  const codigoB = await codigo(emailB);
  const visao = await tentativa.iniciarRecuperacao(emailB, codigoB);
  expect(visao.aparelhos[0]?.id).toBe(antigoB.aparelhoId);
  expect(tentativa.produtos.obter()).toEqual([]);
  const produto = await local.dados.produtos.criar({ nome: 'Pendente durável', precoCentavos: 2500 });
  const caixa = await local.dados.caixa.abrir(500);
  await local.dados.carrinho.adicionarProduto(produto); await local.dados.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
  const tabelas = ['produtos', 'caixas', 'rascunhos', 'outbox'];
  const estado = () => tabelas.map(t => local.raw.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all());
  const antes = estado();
  expect(tentativa.produtos.obter()).toEqual([]);
  await expect(tentativa.confirmarRecuperacao(antigoB.aparelhoId)).rejects.toMatchObject({ codigo: 'conflito' });
  expect(confirmar).not.toHaveBeenCalled(); expect(estado()).toEqual(antes);
  const novaTentativa = new Dados(local.sqlite, randomUUID, 'http://api.local');
  const iniciarNova = vi.spyOn(novaTentativa.backend, 'iniciarRecuperacao');
  expect(novaTentativa.produtos.obter()).toEqual([]);
  await expect(novaTentativa.iniciarRecuperacao(emailB, codigoB)).rejects.toMatchObject({ codigo: 'conflito' });
  expect(iniciarNova).not.toHaveBeenCalled(); expect(iniciar).toHaveBeenCalledTimes(1);
  expect(estado()).toEqual(antes);
  expect(local.dados.produtos.obter()).toEqual([produto]); expect(local.dados.caixa.atual()).toEqual(caixa);
  expect(totalDoCarrinho(local.dados.carrinho.obter().itens)).toBe(2500);
  expect(valorRestante(2500, local.dados.carrinho.obter().parcelas)).toBe(1500);
}, 30000);
