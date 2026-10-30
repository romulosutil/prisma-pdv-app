import type { Caixa, Venda } from '@pdv/shared';

/** Ajustes comerciais rastreados; não são saídas de dinheiro nem estornos do provedor. */
export function cancelamentosAposFechamento(caixa: Caixa, vendas: readonly Venda[]): Venda[] {
  if (!caixa.fechamento) return [];
  const fechadoEm = new Date(caixa.fechamento.em).getTime();
  return vendas.filter((v) => v.caixaId === caixa.id && v.status === 'cancelada' && v.cancelamento &&
    new Date(v.cancelamento.em).getTime() >= fechadoEm);
}
