/** Tokens do design system "Balcão" (3 camadas retrocompatíveis, WCAG AA). */

export const primitivos = {
  noite950: '#0D0B1A',
  noite900: '#14112B',
  noite850: '#171429',
  noite800: '#252142',
  noite750: '#221E38',
  noite700: '#2F2A4A',
  ardo700: '#4A4766',
  ardo600: '#5C5973',
  ardo400: '#9D99B8',
  ardo300: '#C8C5DE',
  ardo100: '#F6F5FA',
  branco: '#FFFFFF',
  creme100: '#F4F2EE',
  creme200: '#EAE7E1',
  creme300: '#E2DED6',
  manga500: '#FFC933',
  manga600: '#F2B200',
  manga100: '#FFF3CC',
  anil600: '#3346F0',
  anil400: '#7C8BFF',
  anil100: '#E6E9FF',
  folha700: '#0E7A40',
  folha400: '#5CE092',
  folha900: '#0F2D1D',
  folha100: '#DDF5E7',
  ambar700: '#A65400',
  ambar400: '#FFB866',
  ambar900: '#33200B',
  ambar100: '#FFEFD9',
  pitanga700: '#C8102E',
  pitanga400: '#FF8A9B',
  pitanga900: '#36121A',
  pitanga100: '#FDE3E6',
  pitanga200: '#F9CBD1',
  ilustra: {
    coral: '#FF7A59',
    magenta: '#E8407A',
    turquesa: '#2EC4B6',
    violeta: '#7B5CFF',
    lima: '#B6E83A',
  },
} as const;

export const cores = {
  ink: primitivos.noite900,
  ink2: primitivos.ardo700,
  ink3: primitivos.ardo600,
  bg: primitivos.branco,
  surface: primitivos.creme100,
  surface2: primitivos.creme200,
  line: primitivos.creme300,
  manga: primitivos.manga500,
  mangaStrong: primitivos.manga600,
  mangaSoft: primitivos.manga100,
  anil: primitivos.anil600,
  anilSoft: primitivos.anil100,
  folha: primitivos.folha700,
  folhaSoft: primitivos.folha100,
  ambar: primitivos.ambar700,
  ambarSoft: primitivos.ambar100,
  pitanga: primitivos.pitanga700,
  pitangaSoft: primitivos.pitanga100,
  noite: primitivos.noite950,
} as const;

export const espaco = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export const espacoTokens = {
  xxs: 2,
  xs: 4,
  xs2: 6,
  sm: 8,
  sm2: 10,
  md: 12,
  md2: 14,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
} as const;

export const layoutTokens = {
  margemTela: 20,
  gapSecao: 24,
  gapBloco: 16,
  gapItem: 12,
  gapInline: 8,
  gapCompacto: 4,
  paddingCard: 16,
  paddingCardDestaque: 20,
  paddingControle: 14,
} as const;

export const raio = { sm: 8, md: 16, lg: 24, pill: 999 } as const;

export const movimentoTokens = {
  duracao: {
    instantaneo: 0,
    rapido: 120,
    normal: 180,
    folha: 220,
    flash: 350,
    laser: 900,
  },
} as const;

export const bordaTokens = { fina: 1, foco: 2, recorte: 4 } as const;
export const opacidadeTokens = { desabilitado: 0.4, bloqueado: 0.75, inativo: 0.6 } as const;
export const camadaTokens = { base: 0, visorOverlay: 10, barra: 20, folha: 40, toast: 60 } as const;
export const janelaTokens = { estreita: 360, compacta: 600, media: 840, expandida: 1200 } as const;

export const semanticos = {
  claro: {
    bg: {
      canvas: primitivos.branco,
      surface: primitivos.creme100,
      surfacePressed: primitivos.creme200,
      elevated: primitivos.branco,
      scrim: 'rgba(20,17,43,0.4)',
      cameraOverlay: 'rgba(13,11,26,0.55)',
      cameraHud: 'rgba(13,11,26,0.62)',
      cameraBadge: 'rgba(255,255,255,0.94)',
    },
    fg: {
      primary: primitivos.noite900,
      secondary: primitivos.ardo700,
      muted: primitivos.ardo600,
      mutedOnDark: '#A9A6BD',
    },
    border: {
      default: primitivos.creme300,
      onDarkSubtle: 'rgba(255,255,255,0.14)',
      accentOnDark: 'rgba(255,201,51,0.4)',
    },
    action: {
      primary: { bg: primitivos.manga500, pressed: primitivos.manga600, fg: primitivos.noite900 },
      danger: { bg: primitivos.pitanga100, pressed: primitivos.pitanga200, fg: primitivos.pitanga700 },
      translucent: { default: 'rgba(255,255,255,0.16)', pressed: 'rgba(255,255,255,0.28)' },
      focusRing: primitivos.anil600,
      focusSoft: primitivos.anil100,
    },
    status: {
      success: { bg: primitivos.folha100, fg: primitivos.folha700 },
      warning: { bg: primitivos.ambar100, fg: primitivos.ambar700 },
      danger: { bg: primitivos.pitanga100, fg: primitivos.pitanga700 },
      info: { bg: primitivos.anil100, fg: primitivos.anil600 },
      successOnDark: '#1FAF5F',
      dangerOnDark: primitivos.pitanga400,
      successFlash: 'rgba(14,122,64,0.85)',
    },
  },
  escuro: {
    bg: {
      canvas: primitivos.noite950,
      surface: primitivos.noite850,
      surfacePressed: primitivos.noite750,
      elevated: primitivos.noite800,
      scrim: 'rgba(0,0,0,0.6)',
      cameraOverlay: 'rgba(13,11,26,0.65)',
      cameraHud: 'rgba(13,11,26,0.75)',
      cameraBadge: 'rgba(37,33,66,0.94)',
    },
    fg: {
      primary: primitivos.ardo100,
      secondary: primitivos.ardo300,
      muted: primitivos.ardo400,
      mutedOnDark: primitivos.ardo400,
    },
    border: {
      default: primitivos.noite700,
      onDarkSubtle: 'rgba(255,255,255,0.18)',
      accentOnDark: 'rgba(255,201,51,0.45)',
    },
    action: {
      primary: { bg: primitivos.manga500, pressed: primitivos.manga600, fg: primitivos.noite900 },
      danger: { bg: primitivos.pitanga900, pressed: '#4B1924', fg: primitivos.pitanga400 },
      translucent: { default: 'rgba(255,255,255,0.16)', pressed: 'rgba(255,255,255,0.28)' },
      focusRing: primitivos.anil400,
      focusSoft: '#1E2452',
    },
    status: {
      success: { bg: primitivos.folha900, fg: primitivos.folha400 },
      warning: { bg: primitivos.ambar900, fg: primitivos.ambar400 },
      danger: { bg: primitivos.pitanga900, fg: primitivos.pitanga400 },
      info: { bg: '#1E2452', fg: primitivos.anil400 },
      successOnDark: primitivos.folha400,
      dangerOnDark: primitivos.pitanga400,
      successFlash: 'rgba(14,122,64,0.9)',
    },
  },
} as const;

export const margemTela = 20;
export const toqueMinimo = 48;

export interface EstiloTipografia {
  familia: 'Bricolage Grotesque' | 'Inter';
  tamanho: number;
  alturaLinha: number;
  peso: '400' | '500' | '600' | '700' | '800';
  /** Espaçamento entre letras em em (só o Display usa). */
  espacamentoLetras?: number;
  /** Fator máximo de escalonamento de fonte para evitar quebras em telas pequenas. */
  maxScale?: number;
}

export const tipografia = {
  display: { familia: 'Bricolage Grotesque', tamanho: 44, alturaLinha: 44, peso: '800', espacamentoLetras: -0.02, maxScale: 1.35 },
  tituloXL: { familia: 'Bricolage Grotesque', tamanho: 32, alturaLinha: 34, peso: '800', maxScale: 1.4 },
  tituloL: { familia: 'Bricolage Grotesque', tamanho: 24, alturaLinha: 28, peso: '700', maxScale: 1.5 },
  tituloM: { familia: 'Inter', tamanho: 18, alturaLinha: 24, peso: '700', maxScale: 1.75 },
  corpoL: { familia: 'Inter', tamanho: 17, alturaLinha: 24, peso: '400', maxScale: 2.0 },
  corpo: { familia: 'Inter', tamanho: 15, alturaLinha: 22, peso: '400', maxScale: 2.0 },
  corpoMedio: { familia: 'Inter', tamanho: 15, alturaLinha: 22, peso: '500', maxScale: 2.0 },
  label: { familia: 'Inter', tamanho: 13, alturaLinha: 18, peso: '600', maxScale: 1.5 },
  legenda: { familia: 'Inter', tamanho: 12, alturaLinha: 16, peso: '500', maxScale: 1.5 },
  codigo: { familia: 'Inter', tamanho: 13, alturaLinha: 18, peso: '500', espacamentoLetras: 0.04, maxScale: 1.5 },
} as const satisfies Record<string, EstiloTipografia>;
