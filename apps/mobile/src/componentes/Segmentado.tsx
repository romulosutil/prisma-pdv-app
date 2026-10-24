import { Pressable, StyleSheet, View } from 'react-native';
import { cores, sombras, textoBotao } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { Texto } from './Texto';

export interface OpcaoSegmentada<T extends string | number> {
  valor: T;
  rotulo: string;
}

export interface SegmentadoProps<T extends string | number> {
  opcoes: readonly OpcaoSegmentada<T>[];
  valor: T;
  onChange: (valor: T) => void;
  /** Nome do grupo, lido pelo leitor de tela. */
  rotuloGrupo: string;
}

export function Segmentado<T extends string | number>({ opcoes, valor, onChange, rotuloGrupo }: SegmentadoProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={rotuloGrupo} style={estilos.trilho}>
      {opcoes.map((opcao) => (
        <Segmento key={String(opcao.valor)} rotulo={opcao.rotulo} ativo={opcao.valor === valor} onPress={() => onChange(opcao.valor)} />
      ))}
    </View>
  );
}

function Segmento({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: ativo }}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={[estilos.segmento, ativo && estilos.ativo, anel]}
    >
      <Texto numerico style={[textoBotao.M, estilos.rotulo]} cor={ativo ? cores.ink : cores.ink2}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  trilho: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: cores.surface },
  segmento: { flex: 1, minHeight: 40, paddingHorizontal: 8, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ativo: { backgroundColor: cores.bg, ...sombras.segmento },
  rotulo: { textAlign: 'center' },
});
