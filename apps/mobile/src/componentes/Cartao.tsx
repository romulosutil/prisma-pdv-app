import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { cores, raio } from '@/tema';

export type VarianteCartao = 'superficie' | 'elevado' | 'destaque' | 'atencao' | 'sucesso';

const ESTILOS_VARIANTE: Record<VarianteCartao, ViewStyle> = {
  superficie: { backgroundColor: cores.surface },
  elevado: { backgroundColor: cores.bg, borderWidth: 1, borderColor: cores.line },
  destaque: { backgroundColor: cores.bg, borderWidth: 2, borderColor: cores.manga },
  atencao: { backgroundColor: cores.ambarSoft },
  sucesso: { backgroundColor: cores.folhaSoft },
};

export interface CartaoProps {
  children: ReactNode;
  variante?: VarianteCartao;
  padding?: 'compacto' | 'padrao' | 'amp';
  gap?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const PADDINGS = {
  compacto: 12,
  padrao: 16,
  amp: 20,
} as const;

/** Cartão padrão Solar Balcão com padding, raio e contraste uniformes. */
export function Cartao({ children, variante = 'superficie', padding = 'padrao', gap = 12, style, testID }: CartaoProps) {
  return (
    <View testID={testID} style={[estilos.base, ESTILOS_VARIANTE[variante], { padding: PADDINGS[padding], gap }, style]}>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { borderRadius: raio.lg },
});
