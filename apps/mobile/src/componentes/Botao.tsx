import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { cores, textoBotao } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';
import { registrarAcao } from '@/telemetria/registro';

export type VarianteBotao = 'primario' | 'secundario' | 'terciario' | 'ghost' | 'perigo';
export type TamanhoBotao = 'L' | 'M' | 'S';

export interface BotaoProps {
  rotulo: string;
  onPress: () => void;
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  icone?: NomeIcone;
  desabilitado?: boolean;
  carregando?: boolean;
  /** Ocupa a largura toda. Padrão: só no tamanho L. */
  larguraTotal?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ALTURA: Record<TamanhoBotao, number> = { L: 56, M: 48, S: 36 };
const PADDING: Record<TamanhoBotao, number> = { L: 24, M: 20, S: 16 };

const FUNDO: Record<VarianteBotao, { normal: string; pressionado: string }> = {
  primario: { normal: cores.manga, pressionado: cores.mangaStrong },
  secundario: { normal: cores.ink, pressionado: cores.ink2 },
  terciario: { normal: cores.surface, pressionado: cores.surface2 },
  ghost: { normal: 'transparent', pressionado: cores.surface2 },
  perigo: { normal: cores.pitangaSoft, pressionado: '#F9CBD1' },
};

const COR_TEXTO: Record<VarianteBotao, string> = {
  primario: cores.ink,
  secundario: cores.bg,
  terciario: cores.ink,
  ghost: cores.ink,
  perigo: cores.pitanga,
};

export function Botao({
  rotulo,
  onPress,
  variante = 'primario',
  tamanho = 'L',
  icone,
  desabilitado = false,
  carregando = false,
  larguraTotal = tamanho === 'L',
  accessibilityHint,
  style,
  testID,
}: BotaoProps) {
  const { focado, aoFocar, aoDesfocar, anel } = useFoco();
  const corTexto = COR_TEXTO[variante];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: desabilitado, busy: carregando }}
      disabled={desabilitado || carregando}
      onPress={() => { registrarAcao(rotulo); onPress(); }}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      hitSlop={tamanho === 'S' ? { top: 6, bottom: 6, left: 4, right: 4 } : undefined}
      testID={testID}
      style={({ pressed }) => [
        estilos.base,
        {
          minHeight: ALTURA[tamanho],
          paddingHorizontal: PADDING[tamanho],
          backgroundColor: pressed ? FUNDO[variante].pressionado : FUNDO[variante].normal,
          opacity: desabilitado ? 0.4 : 1,
        },
        larguraTotal ? estilos.larguraTotal : estilos.alinharAoConteudo,
        anel,
        style,
      ]}
    >
      <View style={[estilos.conteudo, carregando && estilos.oculto]}>
        {icone ? <Icone nome={icone} tamanho={tamanho === 'S' ? 18 : 24} cor={corTexto} /> : null}
        <Texto cor={corTexto} style={[textoBotao[tamanho], estilos.rotulo, variante === 'ghost' && focado && estilos.sublinhado]}>
          {rotulo}
        </Texto>
      </View>
      {carregando ? <ActivityIndicator style={StyleSheet.absoluteFill} color={corTexto} /> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  larguraTotal: { alignSelf: 'stretch' },
  alinharAoConteudo: { alignSelf: 'flex-start' },
  conteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 1 },
  oculto: { opacity: 0 },
  rotulo: { textAlign: 'center', flexShrink: 1 },
  sublinhado: { textDecorationLine: 'underline' },
});
