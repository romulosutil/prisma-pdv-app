import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BancoSqlite, ParametroSql, SqlExecutor } from '../src/dados/sqlite/driver';
import { inicializarSchema, VERSAO_SCHEMA } from '../src/dados/sqlite/schema';

function adaptar(raw: DatabaseSync): BancoSqlite {
  const executor: SqlExecutor = {
    async execAsync(sql) { raw.exec(sql); },
    async runAsync(sql, ...params) { return raw.prepare(sql).run(...params); },
    async getFirstAsync<T>(sql: string, ...params: ParametroSql[]) {
      return (raw.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: ParametroSql[]) {
      return raw.prepare(sql).all(...params) as T[];
    },
  };
  return { ...executor, async withExclusiveTransactionAsync(tarefa) {
    raw.exec('BEGIN EXCLUSIVE');
    try { await tarefa(executor); raw.exec('COMMIT'); }
    catch (erro) { raw.exec('ROLLBACK'); throw erro; }
  } };
}

describe('schema SQLite', () => {
  it('inicializa duas vezes e persiste ao reabrir arquivo', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'pdv-sqlite-'));
    const caminho = join(pasta, 'dados.sqlite');
    let raw = new DatabaseSync(caminho);
    try {
      let db = adaptar(raw);
      await inicializarSchema(db);
      await db.runAsync('INSERT INTO produtos VALUES (?, ?, ?, ?)', 'a', 'l', 'p', '{"nome":"Arroz"}');
      await inicializarSchema(db);
      raw.close();
      raw = new DatabaseSync(caminho);
      db = adaptar(raw);
      await inicializarSchema(db);
      expect(await db.getFirstAsync('SELECT payload_json FROM produtos')).toEqual({ payload_json: '{"nome":"Arroz"}' });
      expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: VERSAO_SCHEMA });
      expect(await db.getFirstAsync('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
    } finally { raw.close(); rmSync(pasta, { recursive: true, force: true }); }
  });

  it('isola partições e rejeita referências cruzadas', async () => {
    const raw = new DatabaseSync(':memory:');
    try {
      const db = adaptar(raw);
      await inicializarSchema(db);
      await db.runAsync('INSERT INTO caixas VALUES (?, ?, ?, ?)', 'a', 'l1', 'c', '{}');
      await db.runAsync('INSERT INTO vendas VALUES (?, ?, ?, ?, ?)', 'a', 'l1', 'v', 'c', '{}');
      await db.runAsync('INSERT INTO vendas VALUES (?, ?, ?, ?, ?)', 'b', 'l1', 'v', null, '{}');
      await db.runAsync('INSERT INTO vendas VALUES (?, ?, ?, ?, ?)', 'a', 'l2', 'v', null, '{}');
      expect(await db.getAllAsync('SELECT id FROM vendas WHERE conta_id = ? AND loja_id = ?', 'a', 'l1')).toHaveLength(1);
      await expect(db.runAsync('INSERT INTO vendas VALUES (?, ?, ?, ?, ?)', 'b', 'l1', 'outra', 'c', '{}')).rejects.toThrow();
      await expect(db.runAsync('INSERT INTO itens_venda VALUES (?, ?, ?, ?, ?, ?)', 'b', 'l2', 'v', 'i', 0, '{}')).rejects.toThrow();
      await expect(db.runAsync('INSERT INTO pagamentos_venda VALUES (?, ?, ?, ?, ?, ?)', 'b', 'l2', 'v', 'p', 0, '{}')).rejects.toThrow();
    } finally { raw.close(); }
  });

  it('desfaz toda a migração quando uma instrução falha', async () => {
    const raw = new DatabaseSync(':memory:');
    try {
      const db = adaptar(raw);
      raw.exec('CREATE TABLE caixas (existente TEXT)');
      await expect(inicializarSchema(db)).rejects.toThrow();
      expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 0 });
      expect(await db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'produtos'")).toBeNull();
      expect(await db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'caixas'")).toEqual({ name: 'caixas' });
    } finally { raw.close(); }
  });

  it('rejeita versão futura sem alterar schema ou versão', async () => {
    const raw = new DatabaseSync(':memory:');
    try {
      const db = adaptar(raw);
      raw.exec('PRAGMA user_version = 999');
      await expect(inicializarSchema(db)).rejects.toThrow('mais recente');
      expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 999 });
      expect(await db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'produtos'")).toBeNull();
    } finally { raw.close(); }
  });
});
