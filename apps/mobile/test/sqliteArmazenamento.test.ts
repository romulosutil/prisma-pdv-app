import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Armazenamento } from '../src/dados/armazenamento';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { inicializarSchema } from '../src/dados/sqlite/schema';
import { sqliteBanco } from './sqliteBanco';

class Memoria implements Armazenamento {
  dados = new Map<string, unknown>();
  async obter<T>(chave: string) { return (this.dados.get(chave) as T | undefined) ?? null; }
  async gravar<T>(chave: string, valor: T) { this.dados.set(chave, structuredClone(valor)); }
  async remover(chave: string) { this.dados.delete(chave); }
  async limpar() { this.dados.clear(); }
}

const ids = Array.from({ length: 12 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);
const [conta, loja, aparelho, operador, produtoId, caixaId, vendaId, itemId, pagamentoId, contaB, lojaB] = ids as [string, string, string, string, string, string, string, string, string, string, string];
const data = '2026-10-28T12:00:00.000Z';
const sessao = { token: 'token', contaId: conta, lojaId: loja, aparelhoId: aparelho, operadorId: operador };
const produto = { id: produtoId, lojaId: loja, nome: 'Arroz', ean: null, precoCentavos: 2500, unidade: 'un', estoque: 3000, estoqueMinimo: null, atalho: false, criadoEm: data, atualizadoEm: data, excluidoEm: null, versao: 1 };
const caixa = { id: caixaId, lojaId: loja, aparelhoId: aparelho, operadorId: operador, abertura: { em: data, trocoInicialCentavos: 500 }, fechamento: null, movimentos: [] };
const venda = { id: vendaId, lojaId: loja, aparelhoId: aparelho, operadorId: operador, itens: [{ id: itemId, produtoId, descricao: 'Arroz', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, totalCentavos: 2500 }], pagamentos: [{ id: pagamentoId, meio: 'dinheiro', provedor: null, valorCentavos: 2500, trocoCentavos: 500 }], totalCentavos: 2500, status: 'concluida', criadaEm: data };
const vendas = { vendas: [venda], numeroBase: 42 };

async function legadoCompleto() {
  const legado = new Memoria();
  await legado.gravar('conta', { sessao });
  await legado.gravar('produtos', [produto]);
  await legado.gravar('caixas', [caixa]);
  await legado.gravar('vendas', vendas);
  return legado;
}

describe('ArmazenamentoSqlite', () => {
  it('migra, repete e reabre sem perder agregado ou origem', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pdv-migracao-'));
    const arquivo = join(dir, 'dados.sqlite');
    const legado = await legadoCompleto();
    let raw = new DatabaseSync(arquivo);
    try {
      let storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), legado);
      expect(await storage.obter('produtos')).toEqual([produto]);
      expect(await storage.obter('caixas')).toEqual([caixa]);
      expect(await storage.obter('vendas')).toEqual(vendas);
      expect(raw.prepare('SELECT COUNT(*) AS n FROM itens_venda').get()).toMatchObject({ n: 1 });
      expect(raw.prepare('SELECT COUNT(*) AS n FROM pagamentos_venda').get()).toMatchObject({ n: 1 });
      expect(raw.prepare('SELECT resumo_json FROM migracoes_legado').get()).toMatchObject({ resumo_json: JSON.stringify({ produtos: 1, caixas: 1, vendas: 1, totalCentavos: 2500, numeroBase: 42 }) });
      raw.close(); raw = new DatabaseSync(arquivo);
      storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), legado);
      expect(await storage.obter('vendas')).toEqual(vendas);
      expect(await legado.obter('vendas')).toEqual(vendas);
      expect(await legado.obter('produtos')).toEqual([produto]);
      expect(await legado.obter('caixas')).toEqual([caixa]);
      expect(raw.prepare('SELECT COUNT(*) AS n FROM migracoes_legado').get()).toMatchObject({ n: 1 });
    } finally { raw.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it('reverte escrita parcial e permite nova tentativa sem apagar origem', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = await legadoCompleto();
    let falha = true;
    try {
      const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw, (sql) => falha && sql.startsWith('INSERT INTO pagamentos_venda')), legado);
      await expect(storage.obter('vendas')).rejects.toThrow('falha injetada');
      for (const tabela of ['produtos', 'caixas', 'vendas', 'itens_venda', 'pagamentos_venda', 'migracoes_legado']) expect(raw.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get()).toMatchObject({ n: 0 });
      expect(await legado.obter('vendas')).toEqual(vendas);
      falha = false;
      expect(await storage.obter('vendas')).toEqual(vendas);
    } finally { raw.close(); }
  });

  it('não marca migração quando a validação do destino diverge', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = await legadoCompleto();
    try {
      const db = sqliteBanco(raw);
      await inicializarSchema(db);
      raw.exec("CREATE TRIGGER corromper AFTER INSERT ON produtos BEGIN UPDATE produtos SET payload_json = replace(payload_json, 'Arroz', 'Feijao') WHERE id = NEW.id; END");
      const storage = new ArmazenamentoSqlite(async () => db, legado);
      await expect(storage.obter('produtos')).rejects.toThrow('não validada');
      for (const tabela of ['produtos', 'caixas', 'vendas', 'migracoes_legado', 'estado_local']) expect(raw.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get()).toMatchObject({ n: 0 });
      expect(await legado.obter('produtos')).toEqual([produto]);
      raw.exec('DROP TRIGGER corromper');
      expect(await storage.obter('produtos')).toEqual([produto]);
    } finally { raw.close(); }
  });

  it.each(['itens_venda', 'pagamentos_venda'])('rejeita migração se faltar filho normalizado em %s', async (tabela) => {
    const raw = new DatabaseSync(':memory:');
    const legado = await legadoCompleto();
    try {
      const db = sqliteBanco(raw);
      await inicializarSchema(db);
      raw.exec(`CREATE TRIGGER remover_filho AFTER INSERT ON ${tabela} BEGIN DELETE FROM ${tabela} WHERE rowid = NEW.rowid; END`);
      const storage = new ArmazenamentoSqlite(async () => db, legado);
      await expect(storage.obter('vendas')).rejects.toThrow();
      for (const nome of ['produtos', 'caixas', 'vendas', 'itens_venda', 'pagamentos_venda', 'migracoes_legado', 'estado_local']) {
        expect(raw.prepare(`SELECT COUNT(*) AS n FROM ${nome}`).get()).toMatchObject({ n: 0 });
      }
      expect(await legado.obter('produtos')).toEqual([produto]);
      expect(await legado.obter('caixas')).toEqual([caixa]);
      expect(await legado.obter('vendas')).toEqual(vendas);
    } finally { raw.close(); }
  });

  it('reverte a substituição financeira quando falha a gravação de um filho', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = await legadoCompleto();
    let falha = false;
    try {
      const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw, (sql) => falha && sql.startsWith('INSERT INTO pagamentos_venda')), legado);
      await storage.obter('vendas');
      falha = true;
      await expect(storage.gravar('vendas', { vendas: [{ ...venda, totalCentavos: 3000 }], numeroBase: 99 })).rejects.toThrow('falha injetada');
      falha = false;
      expect(await storage.obter('vendas')).toEqual(vendas);
      expect(raw.prepare('SELECT COUNT(*) AS n FROM itens_venda').get()).toMatchObject({ n: 1 });
      expect(raw.prepare('SELECT COUNT(*) AS n FROM pagamentos_venda').get()).toMatchObject({ n: 1 });
    } finally { raw.close(); }
  });

  it('não importa o legado da conta A para B e mantém consultas particionadas', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = await legadoCompleto();
    try {
      const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), legado);
      await storage.obter('vendas');
      await legado.gravar('conta', { sessao: { ...sessao, contaId: contaB, lojaId: lojaB } });
      expect(await storage.obter('produtos')).toEqual([]);
      expect(await storage.obter('vendas')).toEqual({ vendas: [], numeroBase: 0 });
      await storage.gravar('produtos', [{ ...produto, lojaId: lojaB }]);
      await legado.gravar('conta', { sessao });
      expect(await storage.obter('produtos')).toEqual([produto]);
      expect(await storage.obter('vendas')).toEqual(vendas);
    } finally { raw.close(); }
  });

  it('oculta dados sem conta e mantém origem', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = await legadoCompleto();
    try {
      await legado.remover('conta');
      const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), legado);
      expect(await storage.obter('vendas')).toBeNull();
      expect(await legado.obter('vendas')).toEqual(vendas);
    } finally { raw.close(); }
  });

  it.each([
    ['loja divergente', [{ ...produto, lojaId: lojaB }]],
    ['IDs duplicados', [produto, produto]],
    ['campos inválidos', [{ ...produto, precoCentavos: -1 }]],
  ])('recusa %s e preserva origem sem marcador', async (_descricao, produtos) => {
    const raw = new DatabaseSync(':memory:');
    const legado = await legadoCompleto();
    try {
      await legado.gravar('produtos', produtos);
      const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), legado);
      await expect(storage.obter('produtos')).rejects.toThrow();
      expect(await legado.obter('produtos')).toEqual(produtos);
      expect(raw.prepare('SELECT COUNT(*) AS n FROM migracoes_legado').get()).toMatchObject({ n: 0 });
      expect(raw.prepare('SELECT COUNT(*) AS n FROM produtos').get()).toMatchObject({ n: 0 });
    } finally { raw.close(); }
  });

  it('não converte JSON inválido no destino em estado vazio', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = await legadoCompleto();
    try {
      const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), legado);
      await storage.obter('produtos');
      raw.prepare('UPDATE produtos SET payload_json = ?').run('{inválido');
      await expect(storage.obter('produtos')).rejects.toThrow();
      expect(await legado.obter('produtos')).toEqual([produto]);
    } finally { raw.close(); }
  });

  it('propaga erro SQL ao ler destino em vez de retornar vazio', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = await legadoCompleto();
    try {
      const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), legado);
      await storage.obter('produtos');
      raw.exec('DROP TABLE produtos');
      await expect(storage.obter('produtos')).rejects.toThrow();
      expect(await legado.obter('produtos')).toEqual([produto]);
    } finally { raw.close(); }
  });
});
