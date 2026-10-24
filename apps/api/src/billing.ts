import { MockBillingProvider, type BillingProvider } from '@pdv/shared';

/**
 * Ponto de extensão do gateway: um `case` por provider real (Stripe, Asaas, Google Play)
 * implementando `BillingProvider`. Hoje só existe o mock.
 */
export function criarBilling(nome: string = 'mock'): BillingProvider {
  switch (nome) {
    case 'mock':
      return new MockBillingProvider();
    default:
      throw new Error(`BILLING_PROVIDER "${nome}" não é suportado. Valores aceitos: mock.`);
  }
}
