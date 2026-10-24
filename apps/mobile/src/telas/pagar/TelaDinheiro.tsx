import { formatarBRL } from '@pdv/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { CampoDinheiro } from '@/componentes/CampoDinheiro';
import { Chip } from '@/componentes/Chip';
import { Icone } from '@/componentes/Icone';
import { TecladoNumerico } from '@/componentes/TecladoNumerico';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { calcularTroco, sugestoesDeRecebido } from '@/dados/carrinho';
import { cores, raio } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { aplicarTecla } from '@/util/entradaDinheiro';
import { CabecalhoPagamento } from './CabecalhoPagamento';
import { useCobranca } from './useCobranca';

/** "R$ 60" para notas inteiras, "R$ 56,05" quando há centavos. */
const rotuloDaNota = (centavos: number): string => (centavos % 100 === 0 ? `R$ ${centavos / 100}` : formatarBRL(centavos));

export function TelaDinheiro() {
  const { valorCentavos, dividindo, receber, ocupado } = useCobranca();
  const [recebido, setRecebido] = useState(0);

  const troco = calcularTroco(recebido, valorCentavos);
  const faltam = Math.max(valorCentavos - recebido, 0);
  const suficiente = recebido >= valorCentavos;
  const atalhos = sugestoesDeRecebido(valorCentavos);

  return (
    <TelaBase
      rodape={
        <Botao
          rotulo="Confirmar recebimento"
          desabilitado={!suficiente}
          carregando={ocupado}
          onPress={() => void receber({ meio: 'dinheiro', provedor: null, trocoCentavos: troco })}
        />
      }
    >
      <CabecalhoPagamento titulo="Dinheiro" />

      <View style={estilos.conteudo}>
        <View accessible accessibilityLabel={`A cobrar ${falarDinheiro(valorCentavos)}${dividindo ? '. Parte da venda dividida' : ''}`}>
          <View style={estilos.aCobrar}>
            <Texto estilo="corpoL" cor={cores.ink2}>
              A cobrar
            </Texto>
            <Texto estilo="tituloM" numerico>
              {formatarBRL(valorCentavos)}
            </Texto>
          </View>
          {dividindo ? (
            <Texto estilo="legenda" cor={cores.ink3}>
              Parte da venda dividida
            </Texto>
          ) : null}
        </View>

        <CampoDinheiro rotulo="Valor recebido" valorCentavos={recebido} />

        <View style={estilos.atalhos}>
          {atalhos.map((valor, i) => (
            <Chip key={valor} rotulo={i === 0 ? 'Valor exato' : rotuloDaNota(valor)} ativo={recebido === valor} onPress={() => setRecebido(valor)} />
          ))}
        </View>

        <View accessibilityLiveRegion="polite">
          {recebido > 0 ? (
            suficiente ? (
              <View accessible accessibilityRole="text" accessibilityLabel={`Troco: ${falarDinheiro(troco)}`} style={[estilos.situacao, estilos.troco]}>
                <Icone nome="check" cor={cores.folha} espessura={2.5} />
                <Texto estilo="tituloL" numerico cor={cores.folha}>{`Troco ${formatarBRL(troco)}`}</Texto>
              </View>
            ) : (
              <View accessible accessibilityRole="text" accessibilityLabel={`Faltam ${falarDinheiro(faltam)}`} style={[estilos.situacao, estilos.faltam]}>
                <Icone nome="alerta" cor={cores.ambar} />
                <Texto estilo="tituloL" numerico cor={cores.ambar}>{`Faltam ${formatarBRL(faltam)}`}</Texto>
              </View>
            )
          ) : null}
        </View>
      </View>

      <TecladoNumerico onTecla={(tecla) => setRecebido((v) => aplicarTecla(v, tecla))} />
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  conteudo: { flex: 1, gap: 16, paddingTop: 4, paddingBottom: 16 },
  aCobrar: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  situacao: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderRadius: raio.md },
  troco: { backgroundColor: cores.folhaSoft },
  faltam: { backgroundColor: cores.ambarSoft },
});
