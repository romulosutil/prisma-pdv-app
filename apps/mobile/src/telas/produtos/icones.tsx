import { criarIcone } from '@/componentes/criarIcone';

export type NomeIconeProduto = 'setaCima' | 'setaBaixo' | 'raio';

export const IconeProduto = criarIcone<NomeIconeProduto>({
  setaCima: [{ d: 'M12 19V5M5 12l7-7 7 7' }],
  setaBaixo: [{ d: 'M12 5v14M19 12l-7 7-7-7' }],
  raio: [{ d: 'M13 2L4 14h7l-1 8 9-12h-7z' }],
});
