import { useId } from 'react';
import { View } from 'react-native';
import Svg from 'react-native-svg';
import { ILUSTRACOES } from './ilustracoes';

export type KindIlustra = keyof typeof ILUSTRACOES;

export interface IlustraProps {
  kind: KindIlustra;
  size?: number;
}

/**
 * Ilustração decorativa "aquarela 3D" (design system, seção 3), em SVG 200x200 sem filtros:
 * volume por radialGradient, brilhos por gradiente que desvanece e sombras de contato coloridas.
 * Decorativa: oculta de leitores de tela.
 */
export function Ilustra({ kind, size = 160 }: IlustraProps) {
  const uid = useId().replace(/\W/g, '');
  const Conteudo = ILUSTRACOES[kind];
  // `aria-hidden` na View: o RN traduz para cada plataforma; no Svg as props nativas vazariam para o DOM na web.
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Conteudo p={`${kind}${uid}`} />
      </Svg>
    </View>
  );
}
