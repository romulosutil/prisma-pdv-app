import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useFoco } from '@/tema/useFoco';
import { useCopiarDiagnostico } from './useDiagnostico';

/** Chip de status do Início com atalho da versão de testes: toque longo (1 s) copia o diagnóstico. */
export function ChipComDiagnostico({ texto, children }: { texto: string; children: ReactNode }) {
  const copiar = useCopiarDiagnostico();
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityHint="Toque longo de 1 segundo copia o diagnóstico da versão de testes"
      accessibilityActions={[{ name: 'copiarDiagnostico', label: 'Copiar diagnóstico' }]}
      onAccessibilityAction={() => void copiar()}
      delayLongPress={1000}
      onLongPress={() => void copiar()}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      hitSlop={{ top: 12, bottom: 12 }}
      style={[estilos.chip, anel]}
    >
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
});
