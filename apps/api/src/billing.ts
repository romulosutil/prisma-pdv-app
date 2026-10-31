import { MockBillingProvider, type BillingProvider } from '@pdv/shared';
import { ErroApi } from './erros';

/** Falha fechada: nenhuma operação financeira pode simular sucesso neste modo. */
export function criarBillingDesativado(): BillingProvider {
  const recusar = async (): Promise<never> => {
    throw new ErroApi(409, 'cobranca_desativada', 'O acesso está liberado sem cobrança de assinatura.');
  };
  return { verificarCartao: recusar, cobrar: recusar, estornar: recusar };
}

/**
 * Ponto de extensão do gateway: um `case` por provider real (Stripe, Asaas, Google Play)
 * implementando `BillingProvider`. Hoje só existe o mock.
 */
export function criarBilling(nome: string = 'mock'): BillingProvider {
  switch (nome) {
    case 'mock':
      return new MockBillingProvider();
    default:
      throw new Error('BILLING_PROVIDER não é suportado. Valores aceitos: mock.');
  }
}
