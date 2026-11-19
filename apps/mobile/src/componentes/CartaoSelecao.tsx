import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { cores, raio } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { Icone } from './Icone';
import { Texto } from './Texto';

export interface CartaoSelecaoProps {
  titulo: string;
  subtitulo?: string;
  selecionado?: boolean;
  desabilitado?: boolean;
  badge?: ReactNode;
  rodape?: ReactNode;
  onPress: () => void;
  testID?: string;
}

/** Cartão selecionável com indicador visual claro além da borda. */
export function CartaoSelecao({ titulo, subtitulo, selecionado = false, desabilitado, badge, rodape, onPress, testID }: CartaoSelecaoProps) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${titulo}${subtitulo ? `. ${subtitulo}` : ''}`}
      accessibilityState={{ checked: selecionado, disabled: desabilitado }}
      disabled={desabilitado}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      testID={testID}
      style={({ pressed }) => [
        estilos.base,
        selecionado ? estilos.selecionado : estilos.padrao,
        pressed && estilos.pressionado,
        desabilitado && estilos.desabilitado,
        anel,
      ]}
    >
      <View style={estilos.topo}>
        <View style={estilos.textos}>
          <Texto estilo="corpoMedio" numerico>
            {titulo}
          </Texto>
          {subtitulo ? (
            <Texto estilo="legenda" cor={cores.ink2} numerico>
              {subtitulo}
            </Texto>
          ) : null}
        </View>
        {badge}
        <View style={[estilos.marcador, selecionado && estilos.marcadorAtivo]}>
          {selecionado ? <Icone nome="check" tamanho={14} cor={cores.bg} espessura={2.5} /> : null}
        </View>
      </View>
      {rodape ? <View style={estilos.rodape}>{rodape}</View> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { borderRadius: raio.md, padding: 16, gap: 10, borderWidth: 2 },
  padrao: { backgroundColor: cores.surface, borderColor: 'transparent' },
  selecionado: { backgroundColor: cores.bg, borderColor: cores.anil },
  pressionado: { backgroundColor: cores.surface2 },
  desabilitado: { opacity: 0.5 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  marcador: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: cores.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorAtivo: { backgroundColor: cores.anil, borderColor: cores.anil },
  rodape: { paddingTop: 6, borderTopWidth: 1, borderTopColor: cores.line },
});
