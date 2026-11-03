import { DatabaseSync } from 'node:sqlite';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { gerarId, type Sessao } from '@pdv/shared';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, INICIO, type Ambiente } from '../../api/test/ajuda';
import type { Conexao } from '../../api/src/db/conexao';
import { itensVenda, vendas } from '../../api/src/db/schema';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { ArmazenamentoMemoria } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

let banco: Conexao, amb: Ambiente, url: string;
let abertos: DatabaseSync[] = [];
const fetchReal = globalThis.fetch;
beforeAll(async () => { banco = await abrirBanco(); }, 30000);
beforeEach(async () => {
  amb = await criarAmbiente(banco);
  url = await amb.app.listen({ port: 0, host: '127.0.0.1' });
  vi.spyOn(Date, 'now').mockImplementation(() => amb.relogio.agora().getTime());
});
afterEach(async () => { vi.unstubAllGlobals(); vi.restoreAllMocks(); for (const db of abertos) db.close(); abertos = []; await amb.fechar(); });
afterAll(async () => { await banco.fechar(); });

async function instalar(sessao: Sessao) {
  const base = new ArmazenamentoMemoria(), raw = new DatabaseSync(':memory:'); abertos.push(raw);
  const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base);
  const d = new Dados(storage, gerarId, url);
  await d.conta.registrar(sessao, { email: 'estoque@example.invalid', nomeResponsavel: 'Dono', nomeLoja: 'Loja', aparelhoNome: 'Teste' });
  await d.iniciar();
  return d;
}
async function autorizar(c: { email: string }) {
  amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 60000));
  const codigo = await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: c.email } });
  expect(codigo.status).toBe(200);
  const res = await chamar<Sessao>(amb, 'POST', '/auth/login', { corpo: { email: c.email, codigo: codigo.corpo.codigo, aparelhoId: gerarId(), aparelhoNome: 'Outra instalação' } });
  expect(res.status).toBe(200);
  return res.corpo;
}
async function sincronizar(d: Dados) {
  await d.sincronizacao.sincronizar({ forcar: true });
  expect(d.sincronizacao.obter()).toMatchObject({ situacao: 'ocioso', pendentes: 0, rejeitadas: 0 });
}
async function vender(d: Dados, produtoId: string, quantidade: number) {
  await d.carrinho.adicionarProduto(d.produtos.buscarPorId(produtoId)!, quantidade);
  await d.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: quantidade });
  return d.carrinho.concluir();
}

it('dois SQLite vendem offline, repetem resposta perdida, cancelam e restauram saldo exato por HTTP', async () => {
  const c = await contaEmTeste(amb);
  const a = await instalar(c);
  const p = await a.produtos.criar({ nome: 'Arroz', precoCentavos: 1000, estoque: 10000 });
  await sincronizar(a);
  const b = await instalar(await autorizar(c)); await sincronizar(b);
  expect(b.produtos.buscarPorId(p.id)!.estoque).toBe(10000);
  const va = await vender(a, p.id, 2000), vb = await vender(b, p.id, 3000);
  expect(a.produtos.buscarPorId(p.id)!.estoque).toBe(8000);
  expect(b.produtos.buscarPorId(p.id)!.estoque).toBe(7000);
  let perder = true;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await fetchReal(input, init);
    if (perder && String(input).endsWith('/sync/push')) { perder = false; throw new TypeError('Resposta perdida após commit'); }
    return res;
  });
  await a.sincronizacao.sincronizar();
  expect(a.sincronizacao.obter().situacao).toBe('offline');
  expect(a.produtos.buscarPorId(p.id)!.estoque).toBe(8000);
  await sincronizar(b); await sincronizar(a);
  expect([a, b].map(d => d.produtos.buscarPorId(p.id)!.estoque)).toEqual([5000, 5000]);
  expect(await amb.db.select().from(vendas)).toHaveLength(2);
  expect((await amb.db.select().from(itensVenda)).map(i => [i.vendaId, i.controlaEstoque]).sort()).toEqual([[va.id, true], [vb.id, true]].sort());
  // O dono no segundo aparelho cancela a venda confirmada do primeiro.
  await b.vendas.cancelar(va.id); await b.vendas.cancelar(va.id);
  await sincronizar(b); await sincronizar(a);
  expect([a, b].map(d => d.produtos.buscarPorId(p.id)!.estoque)).toEqual([7000, 7000]);
  const restaurado = await instalar(await autorizar(c)); await sincronizar(restaurado);
  expect(restaurado.produtos.buscarPorId(p.id)!.estoque).toBe(7000);
  expect(restaurado.vendas.obter().vendas).toHaveLength(2);
  expect(restaurado.produtos.historicoEstoque(p.id).map(m => m.quantidadeMilesimos).sort((a,b) => a-b)).toEqual([-3000, -2000, 2000, 10000]);
  expect(await restaurado.listarPendenciasSync()).toEqual([]);
}, 30000);

it('ajustes offline+4/-1 e venda2 convergem para11 em ambos os aparelhos, sem eco ou sobrescrita', async () => {
  const c = await contaEmTeste(amb), a = await instalar(c);
  const p = await a.produtos.criar({ nome: 'Arroz', precoCentavos: 1000, estoque: 10000 });
  await sincronizar(a);
  const b = await instalar(await autorizar(c)); await sincronizar(b);
  // Ambos ajustam a partir do saldo10 antes de conhecer a venda feita por A.
  await a.produtos.editar(p.id, { estoque: 14000, motivoEstoque: 'Reposição' });
  await b.produtos.editar(p.id, { estoque: 9000, motivoEstoque: 'Perda' });
  await vender(a, p.id, 2000);
  await sincronizar(b); await sincronizar(a); await sincronizar(b);
  expect([a, b].map(d => d.produtos.buscarPorId(p.id)!.estoque)).toEqual([11000, 11000]);
  const ajustes = a.produtos.obter()[0]!.ajustesEstoque!;
  expect(ajustes.map(m => m.quantidadeMilesimos).sort((a,b) => a-b)).toEqual([-1000, 4000]);
  expect(b.produtos.obter()[0]!.ajustesEstoque).toEqual(ajustes);
  await sincronizar(a); await sincronizar(b);
  expect([a, b].map(d => d.produtos.buscarPorId(p.id)!.estoque)).toEqual([11000, 11000]);
  expect((await a.listarPendenciasSync()).length + (await b.listarPendenciasSync()).length).toBe(0);
}, 30000);
