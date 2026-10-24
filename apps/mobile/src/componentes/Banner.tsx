import { StyleSheet, View } from 'react-native';
import { cores, raio } from '@/tema';
import { Botao } from './Botao';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';

export type TipoBanner = 'info' | 'atencao' | 'erro';

const ESTILO: Record<TipoBanner, { fundo: string; cor: string; icone: NomeIcone }> = {
  info: { fundo: cores.anilSoft, cor: cores.anil, icone: 'info' },
  atencao: { fundo: cores.ambarSoft, cor: cores.ambar, icone: 'alerta' },
  erro: { fundo: cores.pitangaSoft, cor: cores.pitanga, icone: 'erro' },
};

export interface BannerProps {
  tipo: TipoBanner;
  texto: string;
  acao?: { rotulo: string; aoPressionar: () => void };
}

/** Aviso com ícone, texto e ação opcional. O texto fica em tinta para manter o contraste. */
export function Banner({ tipo, texto, acao }: BannerProps) {
  const e = ESTILO[tipo];
  return (
    <View
      accessible={!acao}
      accessibilityRole={tipo === 'info' ? undefined : 'alert'}
      accessibilityLabel={acao ? undefined : texto}
      style={[estilos.caixa, { backgroundColor: e.fundo }]}
    >
      <View style={estilos.linha}>
        <Icone nome={e.icone} cor={e.cor} />
        <Texto estilo="corpoMedio" style={estilos.texto}>
          {texto}
        </Texto>
      </View>
      {acao ? <Botao rotulo={acao.rotulo} onPress={acao.aoPressionar} variante="secundario" tamanho="M" /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { gap: 12, padding: 16, borderRadius: raio.md },
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  texto: { flex: 1 },
});
