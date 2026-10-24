import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { cores } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { Icone, type NomeIcone } from './Icone';

export interface BotaoIconeProps {
  icone: NomeIcone;
  /** Obrigatório: o botão não tem texto visível. */
  rotulo: string;
  onPress: () => void;
  /** `translucido` é para usar sobre a câmera. */
  variante?: 'surface' | 'translucido';
  desabilitado?: boolean;
  selecionado?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function BotaoIcone({ icone, rotulo, onPress, variante = 'surface', desabilitado, selecionado, style, testID }: BotaoIconeProps) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  const translucido = variante === 'translucido';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado, selected: selecionado }}
      disabled={desabilitado}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      testID={testID}
      style={({ pressed }) => [
        estilos.base,
        {
          backgroundColor: translucido
            ? pressed
              ? 'rgba(255,255,255,0.28)'
              : 'rgba(255,255,255,0.16)'
            : pressed
              ? cores.surface2
              : cores.surface,
          opacity: desabilitado ? 0.4 : 1,
        },
        anel,
        style,
      ]}
    >
      <Icone nome={icone} cor={translucido ? cores.bg : cores.ink} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
