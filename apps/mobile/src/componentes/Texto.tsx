import { Text, type TextProps } from 'react-native';
import { cores, texto, tipografia, type NomeEstilo } from '@/tema';

export interface TextoProps extends TextProps {
  estilo?: NomeEstilo;
  cor?: string;
  /** Algarismos de largura fixa (valores monetários, horas, contadores). */
  numerico?: boolean;
}

export function Texto({ estilo = 'corpo', cor = cores.ink, numerico, maxFontSizeMultiplier, android_hyphenationFrequency = 'none', style, ...resto }: TextoProps) {
  return (
    <Text
      {...resto}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? tipografia[estilo].maxScale}
      android_hyphenationFrequency={android_hyphenationFrequency}
      style={[texto[estilo], { color: cor }, numerico && { fontVariant: ['tabular-nums'] }, style]}
    />
  );
}
