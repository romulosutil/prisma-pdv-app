import { Text, type TextProps } from 'react-native';
import { cores, texto, type NomeEstilo } from '@/tema';

export interface TextoProps extends TextProps {
  estilo?: NomeEstilo;
  cor?: string;
  /** Algarismos de largura fixa (valores monetários, horas, contadores). */
  numerico?: boolean;
}

export function Texto({ estilo = 'corpo', cor = cores.ink, numerico, style, ...resto }: TextoProps) {
  return <Text {...resto} style={[texto[estilo], { color: cor }, numerico && { fontVariant: ['tabular-nums'] }, style]} />;
}
