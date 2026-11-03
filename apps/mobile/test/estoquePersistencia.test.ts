import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gerarId, type Sessao } from '@pdv/shared';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { ArmazenamentoMemoria } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

const sessao = (): Sessao => ({ token: 'fixture-local', contaId: gerarId(), lojaId: gerarId(), aparelhoId: gerarId(), operadorId: gerarId() });
async function preparar(base: ArmazenamentoMemoria, raw?: DatabaseSync, falhar?: (sql: string) => boolean) {
  const storage = raw ? new ArmazenamentoSqlite(async () => sqliteBanco(raw, falhar), base) : base;
  const dados = new Dados(storage, gerarId);
  if (!await base.obter('conta')) await dados.conta.registrar(sessao(), { email: 'fixture@example.invalid', nomeResponsavel: 'Operador', nomeLoja: 'Loja', aparelhoNome: 'Teste' });
  await dados.iniciar();
  // Estado comercial local não participa destes testes de estoque.
  return dados;
}
async function vender(d: Dados, produtoId: string, quantidade = 2000) {
  await d.carrinho.adicionarProduto(d.produtos.buscarPorId(produtoId)!, quantidade);
  await d.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: quantidade });
  return d.carrinho.concluir();
}

describe.each(['sqlite', 'navegador'] as const)('estoque em %s', tipo => {
  it('persiste baixa única, ajuste e cancelamento, sem enviar saldo projetado como produto', async () => {
    const raw = tipo === 'sqlite' ? new DatabaseSync(':memory:') : undefined;
    const base = new ArmazenamentoMemoria();
    try {
      const d = await preparar(base, raw);
      const p = await d.produtos.criar({ nome: 'Arroz', precoCentavos: 1000, estoque: 10000 });
      const v = await vender(d, p.id);
      expect(d.produtos.buscarPorId(p.id)!.estoque).toBe(8000);
      expect(d.produtos.obter().find(x => x.id === p.id)!.estoque).toBe(10000);
      expect(v.itens[0]!.controlaEstoque).toBe(true);
      expect(await d.carrinho.concluir()).toEqual(v);
      expect(d.produtos.buscarPorId(p.id)!.estoque).toBe(8000);
      await d.produtos.editar(p.id, { estoque: 12000, motivoEstoque: 'Entrada de mercadoria' });
      expect(d.produtos.buscarPorId(p.id)!.estoque).toBe(12000);
      expect(d.produtos.obter()[0]!.ajustesEstoque).toMatchObject([{ quantidadeMilesimos: 4000, motivo: 'Entrada de mercadoria' }]);
      await d.vendas.cancelar(v.id); await d.vendas.cancelar(v.id);
      expect(d.produtos.buscarPorId(p.id)!.estoque).toBe(14000);
      expect(d.produtos.historicoEstoque(p.id).map(m => m.tipo)).toEqual(['inicial', 'ajuste', 'venda', 'cancelamento']);
      const retomado = await preparar(base, raw);
      expect(retomado.produtos.buscarPorId(p.id)!.estoque).toBe(14000);
      expect(retomado.vendas.obter().vendas).toHaveLength(1);
      const entradas = await retomado.listarPendenciasSync();
      expect(entradas.filter(e => e.mutacao.entidade === 'produto' && e.mutacao.operacao === 'upsert').map(e => (e.mutacao as any).dados.estoque)).toEqual([10000, 10000]);
    } finally { raw?.close(); }
  });
  it('parcelas/rascunho não baixam; desativar e reativar preserva histórico', async () => {
    const raw = tipo === 'sqlite' ? new DatabaseSync(':memory:') : undefined;
    try {
      const d = await preparar(new ArmazenamentoMemoria(), raw);
      const p = await d.produtos.criar({ nome: 'Arroz', precoCentavos: 1000, estoque: 10000 });
      await d.carrinho.adicionarProduto(p, 2000);
      await d.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1000 });
      expect(d.produtos.buscarPorId(p.id)!.estoque).toBe(10000);
      await d.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
      await d.carrinho.concluir(); await d.carrinho.limpar();
      await d.produtos.editar(p.id, { estoque: null });
      const semControle = await vender(d, p.id);
      expect(semControle.itens[0]!.controlaEstoque).toBe(false);
      expect(d.produtos.buscarPorId(p.id)!.estoque).toBeNull();
      await d.produtos.editar(p.id, { estoque: 6000 });
      expect(d.produtos.buscarPorId(p.id)!.estoque).toBe(6000);
      expect(d.produtos.obter()[0]!.ajustesEstoque).toMatchObject([{ quantidadeMilesimos: -2000 }]);
      await expect(d.produtos.editar(p.id, { unidade: 'kg' })).rejects.toThrow('unidade');
    } finally { raw?.close(); }
  });
  it('mantém baixa após editar apenas metadados e permite saldo negativo', async () => {
    const raw = tipo === 'sqlite' ? new DatabaseSync(':memory:') : undefined;
    try {
      const d = await preparar(new ArmazenamentoMemoria(), raw);
      const p = await d.produtos.criar({ nome: 'Arroz', precoCentavos: 1000, estoque: 1000 });
      await vender(d, p.id);
      await d.produtos.editar(p.id, { nome: 'Arroz novo' });
      expect(d.produtos.buscarPorId(p.id)).toMatchObject({ nome: 'Arroz novo', estoque: -1000 });
      expect(d.produtos.obter()[0]!.ajustesEstoque).toEqual([]);
    } finally { raw?.close(); }
  });
  it('correção baseada no saldo de abertura do formulário preserva venda simultânea', async () => {
    const raw = tipo === 'sqlite' ? new DatabaseSync(':memory:') : undefined;
    try {
      const d = await preparar(new ArmazenamentoMemoria(), raw);
      const p = await d.produtos.criar({ nome: 'Arroz', precoCentavos: 1000, estoque: 10000 });
      await vender(d, p.id);
      await d.produtos.editar(p.id, { estoque: 14000, estoqueObservado: 10000, motivoEstoque: 'Reposição contada' });
      expect(d.produtos.buscarPorId(p.id)!.estoque).toBe(12000);
      expect(d.produtos.obter()[0]!.ajustesEstoque).toMatchObject([{ quantidadeMilesimos: 4000 }]);
    } finally { raw?.close(); }
  });
});

it('falha no commit SQLite preserva parcela e saldo; reabre arquivo e conclui uma única vez', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pdv-estoque-'));
  const caminho = join(dir, 'estoque.sqlite');
  const base = new ArmazenamentoMemoria(); let raw = new DatabaseSync(caminho); let falha = false;
  try {
    const d = await preparar(base, raw, sql => falha && sql.startsWith('INSERT INTO outbox'));
    const p = await d.produtos.criar({ nome: 'Arroz', precoCentavos: 1000, estoque: 10000 });
    await d.carrinho.adicionarProduto(p, 2000);
    await d.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 2000 });
    falha = true;
    await expect(d.carrinho.concluir()).rejects.toThrow('falha injetada');
    expect(d.produtos.buscarPorId(p.id)!.estoque).toBe(10000);
    expect(d.carrinho.obter().parcelas).toHaveLength(1);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM vendas').get()).toMatchObject({ n: 0 });
    raw.close(); raw = new DatabaseSync(caminho);
    const reaberto = await preparar(base, raw);
    const venda = await reaberto.carrinho.concluir();
    expect(reaberto.produtos.buscarPorId(p.id)!.estoque).toBe(8000);
    raw.close(); raw = new DatabaseSync(caminho);
    const respostaPerdida = await preparar(base, raw);
    expect(await respostaPerdida.carrinho.concluir()).toEqual(venda);
    expect(respostaPerdida.produtos.buscarPorId(p.id)!.estoque).toBe(8000);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM vendas').get()).toMatchObject({ n: 1 });
  } finally { raw.close(); rmSync(dir, { recursive: true, force: true }); }
});
