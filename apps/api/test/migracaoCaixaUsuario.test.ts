import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
import { gerarId } from '@pdv/shared';

it('migração R2 preserva IDs, totais, duplicatas históricas e movimentos sem inventar autoria', async () => {
  const db = new PGlite();
  try {
    const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
    for (const entrada of journal.entries.filter((e: any) => e.idx < 9)) {
      const texto = await readFile(new URL(`../drizzle/${entrada.tag}.sql`, import.meta.url), 'utf8');
      for (const sql of texto.split('--> statement-breakpoint')) if (sql.trim()) await db.exec(sql);
    }
    const conta = gerarId(), loja = gerarId(), operador = gerarId(), aparelho = gerarId(), a = gerarId(), b = gerarId(), movimento = gerarId();
    await db.exec(`INSERT INTO contas VALUES ('${conta}', 'dono@exemplo.com', '12345678901', 'Dono', now(), now());
      INSERT INTO lojas VALUES ('${loja}', '${conta}', 'Loja', now(), now());
      INSERT INTO operadores (id, conta_id, loja_id, nome, papel, criado_em, atualizado_em) VALUES ('${operador}', '${conta}', '${loja}', 'Legado', 'dono', now(), now());
      INSERT INTO caixas (id, loja_id, aparelho_id, operador_id, aberto_em, troco_inicial_centavos, criado_em, atualizado_em, versao) VALUES
        ('${a}', '${loja}', '${aparelho}', '${operador}', now(), 1000, now(), now(), 1), ('${b}', '${loja}', '${aparelho}', '${operador}', now(), 2000, now(), now(), 1);
      INSERT INTO movimentos_caixa VALUES ('${movimento}', '${a}', '${loja}', 'sangria', 100, 'Cofre', now());`);
    const antes = (await db.query("select 'caixa' as entidade, row_to_json(c) as registro from caixas c union all select 'movimento', row_to_json(m) from movimentos_caixa m")).rows;
    const texto = await readFile(new URL('../drizzle/0009_demonic_magdalene.sql', import.meta.url), 'utf8');
    for (const sql of texto.split('--> statement-breakpoint')) if (sql.trim()) await db.exec(sql);
    const depois = (await db.query("select 'caixa' as entidade, to_jsonb(c) - 'reservado' - 'detalhes' as registro from caixas c union all select 'movimento', to_jsonb(m) - 'detalhes' from movimentos_caixa m")).rows;
    expect(depois).toEqual(antes);
    expect((await db.query('select reservado, detalhes from caixas')).rows).toEqual([{ reservado: false, detalhes: null }, { reservado: false, detalhes: null }]);
    expect((await db.query('select detalhes from movimentos_caixa')).rows).toEqual([{ detalhes: null }]);
  } finally { await db.close(); }
});
