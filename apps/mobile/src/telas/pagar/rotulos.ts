import type { Parcela } from '@/dados/carrinho';
import type { ProvedorPagamento, ProvedorVenda } from '@/dados/tipos';

export const NOME_PROVEDOR: Record<ProvedorVenda, string> = {
  infinitepay: 'InfinitePay',
  mercadopago: 'Mercado Pago',
  stone: 'Stone',
  outro: 'Outra maquininha',
};

export const NOME_TAP: Record<ProvedorPagamento, string> = {
  infinitepay: 'InfiniteTap',
  mercadopago: 'Mercado Pago Tap',
};

export const ehProvedor = (valor: unknown): valor is ProvedorPagamento => valor === 'infinitepay' || valor === 'mercadopago';
export const ehProvedorVenda = (valor: unknown): valor is ProvedorVenda =>
  valor === 'infinitepay' || valor === 'mercadopago' || valor === 'stone' || valor === 'outro';

/** Como a parcela aparece no recibo e na divisão: "Pix · InfinitePay", "Cartão de débito"... */
export function rotuloDaParcela(parcela: Pick<Parcela, 'meio' | 'provedor'> & { maquininha?: string | null }): string {
  const { meio, provedor, maquininha } = parcela;
  const sufixoMaquininha = maquininha ? ` · ${maquininha}` : provedor ? ` · ${NOME_PROVEDOR[provedor]}` : '';
  switch (meio) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'pix':
      return provedor ? `Pix · ${NOME_PROVEDOR[provedor]}` : 'Pix · chave';
    case 'cartao_credito':
      return `Cartão de crédito${sufixoMaquininha}`;
    case 'cartao_debito':
      return `Cartão de débito${sufixoMaquininha}`;
    case 'tap':
      return provedor === 'infinitepay' || provedor === 'mercadopago'
        ? `Aproximação · ${NOME_TAP[provedor]}`
        : `Aproximação${sufixoMaquininha}`;
  }
}
