import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { cores, raio } from '@/tema';
import { Texto } from './Texto';

export interface SecaoProps {
  titulo: string;
  /** Agrupa os filhos num cartão `surface` (ex.: interruptores, pares chave/valor). */
  agrupar?: boolean;
  children: ReactNode;
}

/** Bloco de Ajustes: título em caixa alta (13/18 600, ink-3) e conteúdo. */
export function Secao({ titulo, agrupar, children }: SecaoProps) {
  return (
    <View style={estilos.secao}>
      <Texto estilo="label" cor={cores.ink3} accessibilityRole="header" style={estilos.titulo}>
        {titulo.toUpperCase()}
      </Texto>
      {agrupar ? <View style={estilos.grupo}>{children}</View> : children}
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: { gap: 8 },
  titulo: { letterSpacing: 0.8, marginBottom: 4 },
  grupo: { paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.surface },
});
