import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
import { gerarId } from '@pdv/shared';

it('migra o dono sem alterar IDs ou registros financeiros e revoga acesso legado sem identidade', async () => {
  const db = new PGlite();
  try {
    const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
    for (const entrada of journal.entries.filter((e: any) => e.idx < 8)) {
      const texto = await readFile(new URL(`../drizzle/${entrada.tag}.sql`, import.meta.url), 'utf8');
      for (const sql of texto.split('--> statement-breakpoint')) if (sql.trim()) await db.exec(sql);
    }
    const conta = gerarId(), loja = gerarId(), dono = gerarId(), legado = gerarId(), aparelho = gerarId(), caixa = gerarId(), venda = gerarId();
    await db.exec(`INSERT INTO contas VALUES ('${conta}', 'dono@exemplo.com', '12345678901', 'Dona', now(), now());
      INSERT INTO lojas VALUES ('${loja}', '${conta}', 'Loja', now(), now());
      INSERT INTO operadores VALUES ('${dono}', '${conta}', '${loja}', 'Dona', 'dono', now(), now()), ('${legado}', '${conta}', '${loja}', 'Legado', 'operador', now(), now());
      INSERT INTO aparelhos VALUES ('${aparelho}', '${conta}', '${loja}', 'Celular', now(), now(), null);
      INSERT INTO sessoes VALUES ('${gerarId()}', 'hash-dono', '${conta}', '${loja}', '${dono}', '${aparelho}', now(), now() + interval '30 days', null),
        ('${gerarId()}', 'hash-legado', '${conta}', '${loja}', '${legado}', '${aparelho}', now(), now() + interval '30 days', null);
      INSERT INTO caixas VALUES ('${caixa}', '${loja}', '${aparelho}', '${dono}', now(), 1000, null, null, null, now(), now(), null, 1);
      INSERT INTO vendas (id, loja_id, aparelho_id, operador_id, total_centavos, status, criado_em, atualizado_em, versao, caixa_id) VALUES ('${venda}', '${loja}', '${aparelho}', '${dono}', 700, 'concluida', now(), now(), 1, '${caixa}');`);
    const antes = await db.query('select row_to_json(c) as registro from caixas c union all select row_to_json(v) from vendas v');
    const texto = await readFile(new URL('../drizzle/0008_mute_maddog.sql', import.meta.url), 'utf8');
    for (const sql of texto.split('--> statement-breakpoint')) if (sql.trim()) await db.exec(sql);
    expect((await db.query('select row_to_json(c) as registro from caixas c union all select row_to_json(v) from vendas v')).rows).toEqual(antes.rows);
    expect((await db.query(`select usuario_id from operadores where id = '${dono}'`)).rows).toEqual([{ usuario_id: conta }]);
    expect((await db.query("select revogada_em from sessoes where token_hash = 'hash-dono'")).rows[0]).toEqual({ revogada_em: null });
    expect((await db.query<{ revogada_em: Date | null }>("select revogada_em from sessoes where token_hash = 'hash-legado'")).rows[0]?.revogada_em).not.toBeNull();
  } finally { await db.close(); }
});
