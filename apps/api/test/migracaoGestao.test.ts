import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
import { gerarId } from '@pdv/shared';

it('R4 migra saldos positivos, negativos e nulos sem baixar vendas antigas ou inventar autoria', async () => {
  const db = new PGlite();
  try {
    const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
    for (const entrada of journal.entries.filter((e: any) => e.idx < 10)) {
      const texto = await readFile(new URL(`../drizzle/${entrada.tag}.sql`, import.meta.url), 'utf8');
      for (const sql of texto.split('--> statement-breakpoint')) if (sql.trim()) await db.exec(sql);
    }
    const conta = gerarId(), loja = gerarId(), operador = gerarId(), aparelho = gerarId(), venda = gerarId();
    const ids = [gerarId(), gerarId(), gerarId()];
    await db.query('INSERT INTO contas VALUES ($1, $2, $3, $4, now(), now())', [conta, 'migracao@exemplo.com', '12345678901', 'Dono']);
    await db.query('INSERT INTO lojas VALUES ($1, $2, $3, now(), now())', [loja, conta, 'Loja']);
    for (const [n, estoque] of [2000, -3000, null].entries()) await db.query('INSERT INTO produtos VALUES ($1, $2, $3, null, 1000, $4, $5, null, false, now(), now(), null, 7)', [ids[n], loja, 'Produto', 'un', estoque]);
    await db.query('INSERT INTO vendas (id,loja_id,aparelho_id,operador_id,total_centavos,status,criado_em,atualizado_em,versao) VALUES ($1,$2,$3,$4,1000,$5,now(),now(),1)', [venda, loja, aparelho, operador, 'concluida']);
    const antes = (await db.query('SELECT row_to_json(p) AS p FROM produtos p ORDER BY id')).rows;
    const sql = await readFile(new URL('../drizzle/0010_keen_arclight.sql', import.meta.url), 'utf8');
    for (const parte of sql.split('--> statement-breakpoint')) if (parte.trim()) await db.exec(parte);
    expect((await db.query('SELECT row_to_json(p) AS p FROM produtos p ORDER BY id')).rows).toEqual(antes);
    expect((await db.query('SELECT produto_id, quantidade_milesimos, operador_id, aparelho_id, tipo FROM movimentos_estoque ORDER BY quantidade_milesimos')).rows).toEqual([
      { produto_id: ids[1], quantidade_milesimos: -3000, operador_id: null, aparelho_id: null, tipo: 'inicial' },
      { produto_id: ids[0], quantidade_milesimos: 2000, operador_id: null, aparelho_id: null, tipo: 'inicial' },
    ]);
    expect((await db.query('SELECT id, total_centavos, fiado FROM vendas')).rows).toEqual([{ id: venda, total_centavos: 1000, fiado: null }]);
  } finally { await db.close(); }
});
