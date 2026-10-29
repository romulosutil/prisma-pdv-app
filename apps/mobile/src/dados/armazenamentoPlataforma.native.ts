import { openDatabaseAsync } from 'expo-sqlite';
import { ArmazenamentoAsync } from './armazenamento';
import { ArmazenamentoSqlite } from './sqlite/armazenamentoSqlite';
import { conectarTransacoes } from './sqlite/conexao';

/** Não existe fallback: indisponibilidade nativa bloqueia a carga e preserva os dados. */
export const criarArmazenamento = (): ArmazenamentoSqlite => new ArmazenamentoSqlite(async () => {
  const conexao = await openDatabaseAsync('pdv.sqlite', { useNewConnection: true });
  return conectarTransacoes(conexao);
}, new ArmazenamentoAsync());
