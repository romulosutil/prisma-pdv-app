/** Interface mínima implementada pelo adaptador SQLite da plataforma. */
export type ParametroSql = string | number | null;

export interface SqlExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: ParametroSql[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: ParametroSql[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: ParametroSql[]): Promise<T[]>;
}

export interface BancoSqlite extends SqlExecutor {
  withExclusiveTransactionAsync(tarefa: (tx: SqlExecutor) => Promise<void>): Promise<void>;
}
