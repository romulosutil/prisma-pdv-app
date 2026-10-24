import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { cores } from '@/tema';
import { useFoco } from '@/tema/useFoco';

export interface BotaoRedondoProps {
  rotulo: string;
  onPress: () => void;
  desabilitado?: boolean;
  children: ReactNode;
}

/** Botão redondo de 48 para ícones que o `Icone` do app não tem (setas de ordem, por exemplo). */
export function BotaoRedondo({ rotulo, onPress, desabilitado, children }: BotaoRedondoProps) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={({ pressed }) => [estilos.base, { backgroundColor: pressed ? cores.surface2 : cores.surface, opacity: desabilitado ? 0.4 : 1 }, anel]}
    >
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
