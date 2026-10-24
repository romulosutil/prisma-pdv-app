import { Pressable, StyleSheet } from 'react-native';
import { cores } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { Texto } from './Texto';

export interface ChipProps {
  rotulo: string;
  ativo?: boolean;
  onPress: () => void;
  testID?: string;
}

/** Filtro/opção em pill de 36 de altura (toque de 48 pelo hitSlop). */
export function Chip({ rotulo, ativo = false, onPress, testID }: ChipProps) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: ativo }}
      hitSlop={6}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      testID={testID}
      style={({ pressed }) => [
        estilos.base,
        { backgroundColor: ativo ? cores.ink : pressed ? cores.surface2 : cores.surface },
        anel,
      ]}
    >
      <Texto estilo="label" cor={ativo ? cores.bg : cores.ink}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { minHeight: 36, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
