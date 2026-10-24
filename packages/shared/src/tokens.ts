/** Tokens do design system "Balcão" (docs/design-system.md, seção 1). */

export const cores = {
  ink: '#14112B',
  ink2: '#4A4766',
  ink3: '#6B6883',
  bg: '#FFFFFF',
  surface: '#F4F2EE',
  surface2: '#EAE7E1',
  line: '#E2DED6',
  manga: '#FFC933',
  mangaStrong: '#F2B200',
  mangaSoft: '#FFF3CC',
  anil: '#3346F0',
  anilSoft: '#E6E9FF',
  folha: '#0E7A40',
  folhaSoft: '#DDF5E7',
  ambar: '#A65400',
  ambarSoft: '#FFEFD9',
  pitanga: '#C8102E',
  pitangaSoft: '#FDE3E6',
  noite: '#0D0B1A',
} as const;

export const espaco = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export const raio = { sm: 8, md: 16, lg: 24, pill: 999 } as const;

export const margemTela = 20;
export const toqueMinimo = 48;

export interface EstiloTipografia {
  familia: 'Bricolage Grotesque' | 'Inter';
  tamanho: number;
  alturaLinha: number;
  peso: '400' | '500' | '600' | '700' | '800';
  /** Espaçamento entre letras em em (só o Display usa). */
  espacamentoLetras?: number;
}

export const tipografia = {
  display: { familia: 'Bricolage Grotesque', tamanho: 44, alturaLinha: 44, peso: '800', espacamentoLetras: -0.02 },
  tituloXL: { familia: 'Bricolage Grotesque', tamanho: 32, alturaLinha: 34, peso: '800' },
  tituloL: { familia: 'Bricolage Grotesque', tamanho: 24, alturaLinha: 28, peso: '700' },
  tituloM: { familia: 'Inter', tamanho: 18, alturaLinha: 24, peso: '700' },
  corpoL: { familia: 'Inter', tamanho: 17, alturaLinha: 24, peso: '400' },
  corpo: { familia: 'Inter', tamanho: 15, alturaLinha: 22, peso: '400' },
  corpoMedio: { familia: 'Inter', tamanho: 15, alturaLinha: 22, peso: '500' },
  label: { familia: 'Inter', tamanho: 13, alturaLinha: 18, peso: '600' },
  legenda: { familia: 'Inter', tamanho: 12, alturaLinha: 16, peso: '500' },
} as const satisfies Record<string, EstiloTipografia>;
