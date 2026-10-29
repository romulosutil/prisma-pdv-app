import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('migra sessão legada existente com expiração de 30 dias e revogações nulas', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE aparelhos (id text PRIMARY KEY);
      CREATE TABLE sessoes (id text PRIMARY KEY, criado_em timestamp with time zone NOT NULL);
      INSERT INTO aparelhos VALUES ('aparelho');
      INSERT INTO sessoes VALUES ('sessao', '2026-03-10T12:00:00Z');`);
    const migracao = await readFile(new URL('../drizzle/0002_equal_bishop.sql', import.meta.url), 'utf8');
    for (const sql of migracao.split('--> statement-breakpoint')) if (sql.trim()) await db.exec(sql);
    const sessao = await db.query<{ expira_em: Date; revogada_em: Date | null }>('SELECT expira_em, revogada_em FROM sessoes');
    expect(new Date(sessao.rows[0]!.expira_em).toISOString()).toBe('2026-04-09T12:00:00.000Z');
    expect(sessao.rows[0]!.revogada_em).toBeNull();
    expect((await db.query('SELECT revogado_em FROM aparelhos')).rows[0]).toEqual({ revogado_em: null });
    await expect(db.exec("INSERT INTO sessoes (id, criado_em) VALUES ('outra', now())")).rejects.toThrow();
  } finally { await db.close(); }
});
