import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useAbrirVenda } from '@/nucleo/useAbrirVenda';
import { cores, legendaForte, sombras, textoBotao } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { toqueLeve } from '@/util/haptico';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';

const ABAS: Record<string, { rotulo: string; icone: NomeIcone }> = {
  index: { rotulo: 'Início', icone: 'inicio' },
  produtos: { rotulo: 'Produtos', icone: 'produtos' },
  caixa: { rotulo: 'Caixa', icone: 'caixa' },
  ajustes: { rotulo: 'Ajustes', icone: 'ajustes' },
};

const ALTURA_BARRA = 88;
const LIMITE_FONTE = 1.3;
/** A partir daqui os rótulos descem para não encostar na base do botão Vender (elevado 22). */
const FONTE_AMPLIADA = 1.15;

/** Barra inferior: Início, Produtos | Vender | Caixa, Ajustes. O Vender abre a rota `/vender`, fora das abas. */
export function BarraInferior({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { width, fontScale } = useWindowDimensions();
  const ampliada = fontScale > FONTE_AMPLIADA;
  const compacta = width < 380;
  const larguraCentral = compacta ? 108 : 128;
  const rotaAtiva = state.routes[state.index]?.name;

  const abas = state.routes
    .filter((rota) => rota.name in ABAS)
    .map((rota) => {
      const config = ABAS[rota.name]!;
      const ativa = rota.name === rotaAtiva;
      return (
        <Aba
          key={rota.key}
          rotulo={config.rotulo}
          icone={config.icone}
          ativa={ativa}
          ampliada={ampliada}
          onPress={() => {
            const evento = emitter.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true });
            if (!ativa && !evento.defaultPrevented) navigateToTab(rota.key);
          }}
        />
      );
    });

  return (
    <View
      accessibilityRole="tablist"
      style={[estilos.barra, { minHeight: ALTURA_BARRA + insets.bottom, paddingBottom: insets.bottom }]}
    >
      <View style={estilos.lateral}>{abas.slice(0, 2)}</View>
      <View style={[estilos.central, { width: larguraCentral }]}>
        <Vender compacta={compacta} />
      </View>
      <View style={estilos.lateral}>{abas.slice(2)}</View>
    </View>
  );
}

function Aba({
  rotulo,
  icone,
  ativa,
  ampliada,
  onPress,
}: {
  rotulo: string;
  icone: NomeIcone;
  ativa: boolean;
  ampliada: boolean;
  onPress: () => void;
}) {
  const { aoFocar, aoDesfocar, anel } = useFoco(3);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: ativa }}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={[estilos.aba, ampliada && estilos.abaAmpliada, anel, { borderRadius: 12 }]}
    >
      <Icone nome={icone} cor={ativa ? cores.ink : cores.ink2} />
      <View style={estilos.rotuloLargo}>
        <Texto
          numberOfLines={1}
          maxFontSizeMultiplier={LIMITE_FONTE}
          cor={ativa ? cores.ink : cores.ink2}
          style={[legendaForte, estilos.rotuloAba]}
        >
          {rotulo}
        </Texto>
      </View>
      <View style={[estilos.ponto, { backgroundColor: ativa ? cores.manga : 'transparent' }]} />
    </Pressable>
  );
}

function Vender({ compacta }: { compacta: boolean }) {
  const abrirVenda = useAbrirVenda();
  const { aoFocar, aoDesfocar, focado } = useFoco(3);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Vender"
      accessibilityHint="Abre o leitor de código de barras"
      onPress={() => {
        toqueLeve();
        abrirVenda();
      }}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={({ pressed }) => [
        estilos.vender,
        { minWidth: compacta ? 92 : 104, paddingHorizontal: compacta ? 10 : 14 },
        sombras.vender,
        { backgroundColor: pressed ? cores.mangaStrong : cores.manga },
        focado && estilos.venderFocado,
      ]}
    >
      <Icone nome="codigoBarras" />
      <Texto cor={cores.ink} maxFontSizeMultiplier={LIMITE_FONTE} style={textoBotao.vender}>
        Vender
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: cores.line,
    backgroundColor: cores.bg,
  },
  // Duas abas de cada lado: as laterais dividem o espaço que sobra e a central se adapta em 360dp.
  lateral: { flex: 2, flexDirection: 'row' },
  central: { alignItems: 'center' },
  aba: { flex: 1, minWidth: 48, minHeight: 56, alignItems: 'center', gap: 2 },
  abaAmpliada: { paddingTop: 10 },
  rotuloLargo: { alignSelf: 'stretch', paddingHorizontal: 2, alignItems: 'center' },
  rotuloAba: { textAlign: 'center' },
  ponto: { width: 6, height: 6, borderRadius: 3 },
  vender: {
    minHeight: 56,
    marginTop: -22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 4,
    borderColor: cores.bg,
    borderRadius: 999,
  },
  venderFocado: { outlineWidth: 2, outlineColor: cores.anil, outlineStyle: 'solid', outlineOffset: 3 },
});
