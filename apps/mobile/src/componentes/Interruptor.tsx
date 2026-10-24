import { Pressable, StyleSheet, View } from 'react-native';
import { cores } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { Texto } from './Texto';

export interface InterruptorProps {
  rotulo: string;
  ligado: boolean;
  onChange: (ligado: boolean) => void;
  divisor?: boolean;
}

/** Linha com chave liga/desliga. A linha toda é o alvo de toque (≥ 48) e o estado não depende só de cor. */
export function Interruptor({ rotulo, ligado, onChange, divisor }: InterruptorProps) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: ligado }}
      onPress={() => onChange(!ligado)}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={[estilos.linha, divisor && estilos.divisor, anel]}
    >
      <Texto estilo="corpoMedio" style={estilos.rotulo}>
        {rotulo}
      </Texto>
      <View style={[estilos.trilho, { backgroundColor: ligado ? cores.anil : cores.surface2 }, !ligado && estilos.contorno]}>
        <View style={[estilos.bola, ligado ? estilos.bolaLigada : estilos.bolaDesligada]} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.line },
  rotulo: { flex: 1 },
  trilho: { width: 52, height: 32, borderRadius: 999 },
  contorno: { borderWidth: 2, borderColor: cores.ink3 },
  bola: { position: 'absolute', borderRadius: 999 },
  bolaLigada: { width: 24, height: 24, top: 4, left: 24, backgroundColor: cores.bg },
  bolaDesligada: { width: 16, height: 16, top: 6, left: 6, backgroundColor: cores.ink3 },
});
