import { StyleSheet, View } from 'react-native';
import { cores, legendaForte } from '@/tema';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';

export type TipoStatus = 'pago' | 'pendente' | 'offline' | 'sincronizando' | 'cancelado';

const ESTILO: Record<TipoStatus, { fundo: string; cor: string; icone: NomeIcone; texto: string }> = {
  pago: { fundo: cores.folhaSoft, cor: cores.folha, icone: 'check', texto: 'Pago' },
  pendente: { fundo: cores.ambarSoft, cor: cores.ambar, icone: 'relogio', texto: 'Pendente' },
  offline: { fundo: cores.ambarSoft, cor: cores.ambar, icone: 'offline', texto: 'Offline' },
  sincronizando: { fundo: cores.anilSoft, cor: cores.anil, icone: 'sincronizar', texto: 'Sincronizando' },
  cancelado: { fundo: cores.pitangaSoft, cor: cores.pitanga, icone: 'fechar', texto: 'Cancelado' },
};

export interface StatusPillProps {
  tipo: TipoStatus;
  /** Substitui o texto padrão (ex.: "Em teste" usando o visual `sincronizando`). */
  texto?: string;
}

/** Status sempre com ícone e texto: nunca só cor. */
export function StatusPill({ tipo, texto }: StatusPillProps) {
  const e = ESTILO[tipo];
  const rotulo = texto ?? e.texto;
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`Situação: ${rotulo}`} style={[estilos.pill, { backgroundColor: e.fundo }]}>
      <Icone nome={e.icone} tamanho={14} cor={e.cor} espessura={2.5} />
      <Texto cor={e.cor} style={legendaForte}>
        {rotulo}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  pill: {
    minHeight: 24,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: 999,
  },
});
