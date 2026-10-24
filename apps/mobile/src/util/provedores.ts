import { cores } from '@/tema';
import type { ProvedorPagamento } from '@/dados/tipos';

export interface InfoProvedor {
  id: ProvedorPagamento;
  nome: string;
  legenda: string;
  /** Monograma no lugar do logo (o design system não usa logos reais). */
  monograma: string;
  fundo: string;
  cor: string;
}

export const PROVEDORES: readonly InfoProvedor[] = [
  { id: 'infinitepay', nome: 'InfinitePay', legenda: 'Pix na tela + InfiniteTap no celular', monograma: 'IP', fundo: cores.ink, cor: cores.bg },
  { id: 'mercadopago', nome: 'Mercado Pago', legenda: 'Pix na tela + Tap no celular', monograma: 'MP', fundo: cores.anilSoft, cor: cores.anil },
];
