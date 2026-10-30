import type { Plano } from '@pdv/shared';

const plural = (n: number, singular: string, plural_: string): string => `${n} ${n === 1 ? singular : plural_}`;

function historico(dias: number | null): string {
  if (dias === null) return 'Histórico de vendas ilimitado';
  return dias >= 365 ? `Histórico de ${plural(Math.round(dias / 365), 'ano', 'anos')}` : `Histórico de ${dias} dias`;
}

/**
 * Linhas de destaque de um plano, derivadas de `PLANOS` (limites e recursos). Nenhum número
 * fica escrito na tela: mudou o catálogo, mudou o paywall. Vendas nunca são limitadas.
 */
export function destaquesDoPlano(plano: Plano): string[] {
  const { limites } = plano;
  return [
    'Vendas ilimitadas',
    limites.produtos === null ? 'Produtos ilimitados' : `Até ${limites.produtos} produtos`,
    historico(limites.historicoDias),
    'Pix, cartão e dinheiro com confirmação manual',
  ];
}
