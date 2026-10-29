import type { BancoSqlite, SqlExecutor } from './driver';

/** Conexão privada do armazenamento. O chamador serializa leituras e transações.
 * Usa a mesma conexão para que PRAGMA foreign_keys também valha dentro da transação.
 * withExclusiveTransactionAsync do Expo abre outra conexão; não é usado aqui.
 */
export function conectarTransacoes(conexao: SqlExecutor): BancoSqlite {
  return {
    execAsync: (sql) => conexao.execAsync(sql),
    runAsync: (sql, ...params) => conexao.runAsync(sql, ...params),
    getFirstAsync: <T>(sql: string, ...params: (string | number | null)[]) => conexao.getFirstAsync<T>(sql, ...params),
    getAllAsync: <T>(sql: string, ...params: (string | number | null)[]) => conexao.getAllAsync<T>(sql, ...params),
    async withExclusiveTransactionAsync(tarefa) {
      await conexao.execAsync('BEGIN EXCLUSIVE');
      try {
        await tarefa(conexao);
        await conexao.execAsync('COMMIT');
      } catch (erro) {
        // Disco cheio pode ter revertido a transação automaticamente. Preservar o erro original.
        try { await conexao.execAsync('ROLLBACK'); } catch { /* já revertida pelo SQLite */ }
        throw erro;
      }
    },
  };
}
