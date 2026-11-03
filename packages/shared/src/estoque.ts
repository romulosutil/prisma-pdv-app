import type { AjusteEstoque, Produto, Venda } from './contrato';

export interface MovimentoEstoque {
  id: string;
  tipo: 'inicial' | 'ajuste' | 'venda' | 'cancelamento';
  quantidadeMilesimos: number;
  em: string;
  motivo: string;
}

export const controlaEstoque = (p: Pick<Produto, 'estoque' | 'estoqueAtivo'>): boolean => p.estoque !== null && p.estoqueAtivo !== false;

/** União de eventos, inclusive quando os demais campos do produto perdem no LWW. */
export function mesclarAjustesEstoque(atuais: readonly AjusteEstoque[], recebidos: readonly AjusteEstoque[]): AjusteEstoque[] {
  const unicos = new Map<string, AjusteEstoque>();
  for (const a of [...atuais, ...recebidos]) {
    const anterior = unicos.get(a.id);
    if (anterior && (anterior.quantidadeMilesimos !== a.quantidadeMilesimos || anterior.criadoEm !== a.criadoEm || anterior.motivo !== a.motivo)) throw new Error('Ajuste de estoque imutável.');
    unicos.set(a.id, a);
  }
  return [...unicos.values()].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || a.id.localeCompare(b.id));
}

/** Os próprios itens/cancelamentos financeiros são os movimentos, sem uma segunda baixa persistida. */
export function movimentosDoEstoque(p: Produto, vendas: readonly Venda[]): MovimentoEstoque[] {
  if (p.estoque === null) return [];
  const movimentos: MovimentoEstoque[] = [{ id: `inicial:${p.id}`, tipo: 'inicial', quantidadeMilesimos: p.estoque, em: p.criadoEm, motivo: 'Saldo inicial' }];
  for (const a of mesclarAjustesEstoque([], p.ajustesEstoque ?? [])) movimentos.push({ id: a.id, tipo: 'ajuste', quantidadeMilesimos: a.quantidadeMilesimos, em: a.criadoEm, motivo: a.motivo });
  const vistas = new Set<string>();
  for (const v of vendas) {
    if (v.lojaId !== p.lojaId || vistas.has(v.id)) continue;
    vistas.add(v.id);
    for (const i of v.itens) {
      if (i.produtoId !== p.id || i.controlaEstoque !== true) continue;
      movimentos.push({ id: `${v.id}:${i.id}`, tipo: 'venda', quantidadeMilesimos: -i.quantidadeMilesimos, em: v.criadaEm, motivo: 'Venda concluída' });
      if (v.status === 'cancelada') movimentos.push({ id: `${v.id}:${i.id}:cancelamento`, tipo: 'cancelamento', quantidadeMilesimos: i.quantidadeMilesimos, em: v.cancelamento?.em ?? v.criadaEm, motivo: v.cancelamento?.motivo ?? 'Venda cancelada' });
    }
  }
  return movimentos;
}

/** Inclui movimentos anteriores mesmo com controle desativado; usado para reativar sem apagar história. */
export function saldoContabilEstoque(p: Produto, vendas: readonly Venda[]): number | null {
  if (p.estoque === null) return null;
  const saldo = Number(movimentosDoEstoque(p, vendas).reduce((total, m) => total + BigInt(m.quantidadeMilesimos), 0n));
  if (!Number.isSafeInteger(saldo)) throw new Error('Saldo de estoque fora do limite permitido.');
  return saldo;
}

export function saldoEstoque(p: Produto, vendas: readonly Venda[]): number | null {
  return controlaEstoque(p) ? saldoContabilEstoque(p, vendas) : null;
}
