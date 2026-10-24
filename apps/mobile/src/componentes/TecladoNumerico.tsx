import { Pressable, StyleSheet, View } from 'react-native';
import { cores, raio, textoTeclado } from '@/tema';
import type { TeclaNumerica } from '@/util/entradaDinheiro';
import { Icone } from './Icone';
import { Texto } from './Texto';

const LINHAS: readonly (readonly TeclaNumerica[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['00', '0', 'apagar'],
];

const ROTULO_FALADO: Record<TeclaNumerica, string> = {
  '0': 'zero',
  '1': 'um',
  '2': 'dois',
  '3': 'três',
  '4': 'quatro',
  '5': 'cinco',
  '6': 'seis',
  '7': 'sete',
  '8': 'oito',
  '9': 'nove',
  '00': 'zero zero',
  apagar: 'Apagar',
};

export interface TecladoNumericoProps {
  onTecla: (tecla: TeclaNumerica) => void;
  desabilitado?: boolean;
}

export function TecladoNumerico({ onTecla, desabilitado }: TecladoNumericoProps) {
  return (
    <View style={estilos.grade} accessibilityLabel="Teclado numérico">
      {LINHAS.map((linha, i) => (
        <View key={i} style={estilos.linha}>
          {linha.map((tecla) => (
            <Pressable
              key={tecla}
              accessibilityRole="button"
              accessibilityLabel={ROTULO_FALADO[tecla]}
              accessibilityState={{ disabled: desabilitado }}
              disabled={desabilitado}
              onPress={() => onTecla(tecla)}
              style={({ pressed }) => [estilos.tecla, pressed && estilos.pressionada, desabilitado && estilos.inativa]}
            >
              {tecla === 'apagar' ? (
                <Icone nome="apagar" />
              ) : (
                <Texto cor={cores.ink} style={estilos.digito}>
                  {tecla}
                </Texto>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  grade: { gap: 8 },
  linha: { flexDirection: 'row', gap: 8 },
  tecla: {
    flex: 1,
    minHeight: 64,
    borderRadius: raio.md,
    backgroundColor: cores.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressionada: { backgroundColor: cores.surface2 },
  inativa: { opacity: 0.4 },
  digito: { ...textoTeclado, fontVariant: ['tabular-nums'] },
});
