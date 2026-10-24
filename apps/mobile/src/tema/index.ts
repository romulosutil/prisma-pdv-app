import { cores, espaco, margemTela, raio, tipografia, toqueMinimo, type EstiloTipografia } from '@pdv/shared';
import type { TextStyle } from 'react-native';
import { nomeDaFonte } from './fontes';

export { cores, espaco, margemTela, raio, tipografia, toqueMinimo };
export { FONTES_PARA_CARREGAR } from './fontes';

export type NomeEstilo = keyof typeof tipografia;

export function estiloDeTexto(estilo: EstiloTipografia): TextStyle {
  return {
    fontFamily: nomeDaFonte(estilo.familia, estilo.peso),
    fontSize: estilo.tamanho,
    lineHeight: estilo.alturaLinha,
    letterSpacing: estilo.espacamentoLetras === undefined ? undefined : estilo.espacamentoLetras * estilo.tamanho,
  };
}

/** Estilos de texto do design system prontos para o RN. */
export const texto: Record<NomeEstilo, TextStyle> = {
  display: estiloDeTexto(tipografia.display),
  tituloXL: estiloDeTexto(tipografia.tituloXL),
  tituloL: estiloDeTexto(tipografia.tituloL),
  tituloM: estiloDeTexto(tipografia.tituloM),
  corpoL: estiloDeTexto(tipografia.corpoL),
  corpo: estiloDeTexto(tipografia.corpo),
  corpoMedio: estiloDeTexto(tipografia.corpoMedio),
  label: estiloDeTexto(tipografia.label),
  legenda: estiloDeTexto(tipografia.legenda),
};

/** Texto de botão e rótulos que o design system define fora da tabela de tipografia. */
export const textoBotao = {
  L: estiloDeTexto({ familia: 'Inter', tamanho: 17, alturaLinha: 24, peso: '700' }),
  M: estiloDeTexto({ familia: 'Inter', tamanho: 15, alturaLinha: 20, peso: '600' }),
  S: estiloDeTexto({ familia: 'Inter', tamanho: 13, alturaLinha: 18, peso: '600' }),
  vender: estiloDeTexto({ familia: 'Inter', tamanho: 16, alturaLinha: 20, peso: '700' }),
} as const;

/** Dígitos do teclado numérico: Inter 24/600. */
export const textoTeclado = estiloDeTexto({ familia: 'Inter', tamanho: 24, alturaLinha: 30, peso: '600' });

/** Wordmark provisório "[nome]": Bricolage 22/28 800. */
export const textoMarca = estiloDeTexto({ familia: 'Bricolage Grotesque', tamanho: 22, alturaLinha: 28, peso: '800', espacamentoLetras: -0.02 });

/** Monograma do provedor de pagamento ("IP", "MP"): Inter 14/18 700. */
export const textoMonograma = estiloDeTexto({ familia: 'Inter', tamanho: 14, alturaLinha: 18, peso: '700' });

/** Legenda em destaque (StatusPill, rótulos da barra inferior): Inter 12/16 600. */
export const legendaForte = estiloDeTexto({ familia: 'Inter', tamanho: 12, alturaLinha: 16, peso: '600' });

export const sombras = {
  sheet: { shadowColor: cores.ink, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 16 },
  toast: { shadowColor: cores.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 24, elevation: 12 },
  vender: { shadowColor: cores.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8 },
  segmento: { shadowColor: cores.ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 1 },
} as const;
