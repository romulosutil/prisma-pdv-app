import type { MeioPagamento } from '@/dados/tipos';
import type { NomeIcone } from '@/componentes/Icone';

const MEIOS: Record<MeioPagamento, { rotulo: string; icone: NomeIcone }> = {
  dinheiro: { rotulo: 'Dinheiro', icone: 'dinheiro' },
  pix: { rotulo: 'Pix', icone: 'pix' },
  cartao_credito: { rotulo: 'Cartão', icone: 'cartao' },
  cartao_debito: { rotulo: 'Cartão', icone: 'cartao' },
  tap: { rotulo: 'Aproximação', icone: 'cartao' },
};

export const rotuloDoMeio = (meio: MeioPagamento): string => MEIOS[meio].rotulo;
export const iconeDoMeio = (meio: MeioPagamento): NomeIcone => MEIOS[meio].icone;
