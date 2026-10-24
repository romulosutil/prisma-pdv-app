import { formatarBRL, type Plano } from '@pdv/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { cores, raio, textoBotao } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { destaquesDoPlano } from '@/util/planos';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { Icone } from './Icone';
import { Texto } from './Texto';

export interface CartaoPlanoProps {
  plano: Plano;
  selecionado: boolean;
  onPress: () => void;
}

/** Opção de plano do paywall: seleção única, com preço, destaques e a etiqueta "Mais escolhido". */
export function CartaoPlano({ plano, selecionado, onPress }: CartaoPlanoProps) {
  const { aoFocar, aoDesfocar, anel } = useFoco(3);
  const destaques = destaquesDoPlano(plano);
  const rotulo = `${plano.nome}, ${falarDinheiro(plano.precoMensalCentavos)} por mês${plano.maisEscolhido ? ', mais escolhido' : ''}. ${plano.descricaoCurta}. ${destaques.join('. ')}`;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: selecionado }}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={[estilos.cartao, selecionado && estilos.selecionado, anel]}
    >
      <View style={estilos.cabecalho}>
        <View style={[estilos.marcador, selecionado && estilos.marcadorAtivo]}>
          {selecionado ? <Icone nome="check" tamanho={16} cor={cores.bg} espessura={3} /> : null}
        </View>
        <View style={estilos.titulo}>
          <View style={estilos.linhaNome}>
            <Texto estilo="tituloM">{plano.nome}</Texto>
            {plano.maisEscolhido ? (
              <View style={estilos.etiqueta}>
                <Texto cor={cores.ink} style={textoBotao.S}>
                  Mais escolhido
                </Texto>
              </View>
            ) : null}
          </View>
          <Texto estilo="corpo" cor={cores.ink2}>
            {plano.descricaoCurta}
          </Texto>
        </View>
        <View style={estilos.preco}>
          <Texto estilo="tituloL" numerico>
            {formatarBRL(plano.precoMensalCentavos)}
          </Texto>
          <Texto estilo="legenda" cor={cores.ink3}>
            por mês
          </Texto>
        </View>
      </View>
      <View style={estilos.lista}>
        {destaques.map((linha) => (
          <View key={linha} style={estilos.item}>
            <Icone nome="check" tamanho={16} cor={cores.folha} espessura={2.5} />
            <Texto estilo="corpo" style={estilos.textoItem}>
              {linha}
            </Texto>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: { gap: 12, padding: 16, borderRadius: raio.md, borderWidth: 2, borderColor: cores.line, backgroundColor: cores.bg },
  selecionado: { borderColor: cores.anil, backgroundColor: cores.anilSoft },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  marcador: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: cores.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorAtivo: { borderColor: cores.anil, backgroundColor: cores.anil },
  titulo: { flex: 1, gap: 2 },
  linhaNome: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  etiqueta: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: cores.manga },
  preco: { alignItems: 'flex-end' },
  lista: { gap: 6, paddingLeft: 36 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textoItem: { flex: 1 },
});
