import { criarIcone } from '@/componentes/criarIcone';

export type NomeIconeCaixa = 'sangria' | 'suprimento' | 'sobe';

export const IconeCaixa = criarIcone<NomeIconeCaixa>({
  sangria: [{ d: 'M12 3v12M7 10l5 5 5-5M4 21h16' }],
  suprimento: [{ d: 'M12 21V9M7 14l5-5 5 5M4 3h16' }],
  sobe: [{ d: 'M7 17L17 7M8 7h9v9' }],
});
