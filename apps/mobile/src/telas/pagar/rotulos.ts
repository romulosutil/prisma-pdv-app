import type { Parcela } from '@/dados/carrinho';
import type { ProvedorPagamento } from '@/dados/tipos';

export const NOME_PROVEDOR: Record<ProvedorPagamento, string> = {
  infinitepay: 'InfinitePay',
  mercadopago: 'Mercado Pago',
};

export const NOME_TAP: Record<ProvedorPagamento, string> = {
  infinitepay: 'InfiniteTap',
  mercadopago: 'Mercado Pago Tap',
};

export const ehProvedor = (valor: unknown): valor is ProvedorPagamento => valor === 'infinitepay' || valor === 'mercadopago';

/** Como a parcela aparece no recibo e na divisão: "Pix · InfinitePay", "Cartão de débito"... */
export function rotuloDaParcela(parcela: Pick<Parcela, 'meio' | 'provedor'>): string {
  const { meio, provedor } = parcela;
  switch (meio) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'pix':
      return provedor ? `Pix · ${NOME_PROVEDOR[provedor]}` : 'Pix · chave';
    case 'cartao_credito':
      return 'Cartão de crédito';
    case 'cartao_debito':
      return 'Cartão de débito';
    case 'tap':
      return provedor ? `Aproximação · ${NOME_TAP[provedor]}` : 'Aproximação';
  }
}
