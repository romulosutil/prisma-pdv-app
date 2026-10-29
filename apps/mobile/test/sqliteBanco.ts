import { DatabaseSync } from 'node:sqlite';
import type { BancoSqlite, ParametroSql, SqlExecutor } from '../src/dados/sqlite/driver';
import { conectarTransacoes } from '../src/dados/sqlite/conexao';

export function sqliteBanco(raw: DatabaseSync, falhar?: (sql: string) => boolean): BancoSqlite {
  const tx: SqlExecutor = {
    async execAsync(sql) { raw.exec(sql); },
    async runAsync(sql, ...params) {
      if (falhar?.(sql)) throw new Error('falha injetada');
      return raw.prepare(sql).run(...params);
    },
    async getFirstAsync<T>(sql: string, ...params: ParametroSql[]) {
      return (raw.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: ParametroSql[]) {
      return raw.prepare(sql).all(...params) as T[];
    },
  };
  return conectarTransacoes(tx);
}
