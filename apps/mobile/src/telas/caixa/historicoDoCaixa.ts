import type { Caixa, Venda } from '@pdv/shared';

/** Ajustes comerciais rastreados; não são saídas de dinheiro nem estornos do provedor. */
export function cancelamentosAposFechamento(caixa: Caixa, vendas: readonly Venda[]): Venda[] {
  if (!caixa.fechamento) return [];
  return vendas.filter((v) => v.caixaId === caixa.id && v.status === 'cancelada' && v.cancelamento &&
    v.cancelamento.em >= caixa.fechamento!.em);
}
