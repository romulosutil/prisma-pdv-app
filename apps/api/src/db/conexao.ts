import { mkdir } from 'node:fs/promises';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';

/** Banco usado pelo app: o mesmo código roda sobre PGlite (dev/testes) e Postgres (produção). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Conexao {
  db: Db;
  fechar(): Promise<void>;
}

const PASTA_MIGRACOES = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Sem `pasta`, o banco vive em memória (testes). */
export async function abrirPglite(pasta?: string): Promise<Conexao> {
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ]);
  if (pasta) await mkdir(pasta, { recursive: true });
  const cliente = new PGlite(pasta);
  const db = drizzle(cliente, { schema });
  await migrate(db, { migrationsFolder: PASTA_MIGRACOES });
  return { db, fechar: () => cliente.close() };
}

export async function abrirPostgres(url: string): Promise<Conexao> {
  const [{ default: postgres }, { drizzle }, { migrate }] = await Promise.all([
    import('postgres'),
    import('drizzle-orm/postgres-js'),
    import('drizzle-orm/postgres-js/migrator'),
  ]);
  const cliente = postgres(url);
  const db = drizzle(cliente, { schema });
  await migrate(db, { migrationsFolder: PASTA_MIGRACOES });
  return { db, fechar: () => cliente.end() };
}
