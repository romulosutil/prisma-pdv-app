import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('preserva venda legada sem presumir caixa ou evento', async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE TABLE caixas (id uuid PRIMARY KEY); CREATE TABLE vendas (id uuid PRIMARY KEY, status text NOT NULL); INSERT INTO vendas VALUES ('00000000-0000-4000-8000-000000000001', 'cancelada');");
    const migracao = await readFile(new URL('../drizzle/0006_dazzling_lockheed.sql', import.meta.url), 'utf8');
    for (const sql of migracao.split('--> statement-breakpoint')) if (sql.trim()) await db.exec(sql);
    expect((await db.query('SELECT status, caixa_id, cancelamento FROM vendas')).rows).toEqual([{ status: 'cancelada', caixa_id: null, cancelamento: null }]);
    await expect(db.exec("UPDATE vendas SET caixa_id = '00000000-0000-4000-8000-000000000002'")).rejects.toThrow();
  } finally { await db.close(); }
});
