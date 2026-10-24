import { Pressable, StyleSheet, View } from 'react-native';
import { cores, legendaForte, raio, textoBotao, textoMonograma } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';

export type EstadoTile = 'desconectado' | 'conectado' | 'sempre_ativo' | 'bloqueado';

export interface TilePagamentoProps {
  titulo: string;
  legenda: string;
  /** Monograma do provedor (sem logos reais), ex.: "IP". Tem prioridade sobre `icone`. */
  monograma?: string;
  icone?: NomeIcone;
  fundo: string;
  cor: string;
  estado: EstadoTile;
  /** Sem `onPress` o tile é só informativo (ex.: Dinheiro). */
  onPress?: () => void;
  /** Texto da etiqueta quando `bloqueado` (ex.: "Plano Negócio"). */
  rotuloBloqueio?: string;
}

const ETIQUETA: Record<Exclude<EstadoTile, 'desconectado' | 'bloqueado'>, string> = {
  conectado: 'Conectado',
  sempre_ativo: 'Sempre ativo',
};

/** Linha de meio de pagamento (72h): monograma, título + legenda e a situação à direita. */
export function TilePagamento({ titulo, legenda, monograma, icone, fundo, cor, estado, onPress, rotuloBloqueio = 'Plano superior' }: TilePagamentoProps) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  const situacao =
    estado === 'desconectado' ? 'desconectado' : estado === 'bloqueado' ? `indisponível, ${rotuloBloqueio}` : ETIQUETA[estado].toLowerCase();

  const conteudo = (
    <>
      <View style={[estilos.monograma, { backgroundColor: fundo }]}>
        {monograma ? (
          <Texto cor={cor} style={textoMonograma}>
            {monograma}
          </Texto>
        ) : icone ? (
          <Icone nome={icone} cor={cor} />
        ) : null}
      </View>
      <View style={estilos.textos}>
        <Texto style={textoBotao.M}>
          {titulo}
        </Texto>
        <Texto estilo="legenda" cor={cores.ink3}>
          {legenda}
        </Texto>
      </View>
      {estado === 'desconectado' ? (
        <View style={estilos.conectar}>
          <Texto estilo="label">Conectar</Texto>
        </View>
      ) : estado === 'bloqueado' ? (
        <View style={[estilos.pill, { backgroundColor: cores.ambarSoft }]}>
          <Icone nome="alerta" tamanho={14} cor={cores.ambar} espessura={2.5} />
          <Texto cor={cores.ambar} style={legendaForte}>
            {rotuloBloqueio}
          </Texto>
        </View>
      ) : (
        <View style={[estilos.pill, { backgroundColor: cores.folhaSoft }]}>
          <Icone nome="check" tamanho={14} cor={cores.folha} espessura={2.5} />
          <Texto cor={cores.folha} style={legendaForte}>
            {ETIQUETA[estado]}
          </Texto>
        </View>
      )}
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${titulo}, ${legenda}, ${situacao}`} style={estilos.tile}>
        {conteudo}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={`${titulo}, ${legenda}`}
      accessibilityValue={{ text: situacao }}
      accessibilityState={{ checked: estado === 'conectado', disabled: estado === 'bloqueado' }}
      disabled={estado === 'bloqueado'}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={({ pressed }) => [estilos.tile, pressed && estilos.pressionado, estado === 'bloqueado' && estilos.bloqueado, anel]}
    >
      {conteudo}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tile: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: raio.md,
    backgroundColor: cores.surface,
  },
  pressionado: { backgroundColor: cores.surface2 },
  bloqueado: { opacity: 0.8 },
  monograma: { width: 40, height: 40, borderRadius: raio.sm, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  conectar: { minHeight: 36, paddingHorizontal: 16, borderRadius: 999, backgroundColor: cores.bg, alignItems: 'center', justifyContent: 'center' },
  pill: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 10, borderRadius: 999 },
});
