import { and, eq } from 'drizzle-orm';
import type { Venda } from '@pdv/shared';
import type { Db } from '../db/conexao';
import { movimentosEstoque, mudancas, produtos } from '../db/schema';

/** A conta/loja já está travada pelo chamador. Cadastro não é fonte de saldo após sua criação. */
export async function validarBaixas(tx: Db, v: Venda): Promise<string | null> {
  const totais = new Map<string, number>();
  for (const i of v.itens) if (i.produtoId) totais.set(i.produtoId, (totais.get(i.produtoId) ?? 0) + i.quantidadeMilesimos);
  for (const [id, quantidade] of totais) {
    const [p] = await tx.select().from(produtos).where(eq(produtos.id, id));
    if (!p) return 'produto_nao_encontrado';
    if (p.lojaId !== v.lojaId) return 'produto_outra_loja';
    if (!Number.isSafeInteger(quantidade) || (p?.estoque != null && !Number.isSafeInteger(p.estoque - quantidade))) return 'estoque_fora_do_limite';
  }
  return null;
}

export async function baixarVenda(tx: Db, v: Venda, agora: Date): Promise<void> {
  for (const i of v.itens) {
    if (!i.produtoId) continue;
    const [p] = await tx.select().from(produtos).where(and(eq(produtos.id, i.produtoId), eq(produtos.lojaId, v.lojaId)));
    if (!p || p.estoque === null) continue;
    await tx.insert(movimentosEstoque).values({ id: i.id, lojaId: v.lojaId, produtoId: p.id, tipo: 'venda',
      quantidadeMilesimos: -i.quantidadeMilesimos, motivo: `Venda ${v.id}`, itemVendaId: i.id,
      operadorId: v.operadorId, aparelhoId: v.aparelhoId, criadoEm: new Date(v.criadaEm) });
    await tx.update(produtos).set({ estoque: p.estoque - i.quantidadeMilesimos, versao: p.versao + 1 }).where(eq(produtos.id, p.id));
    await tx.insert(mudancas).values({ lojaId: v.lojaId, entidade: 'produto', entidadeId: p.id, criadoEm: agora });
  }
}
