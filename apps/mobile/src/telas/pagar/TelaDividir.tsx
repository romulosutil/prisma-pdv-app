import { formatarBRL } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip } from '@/componentes/Chip';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone, type NomeIcone } from '@/componentes/Icone';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { metadeDoValor, useCarrinho } from '@/dados/carrinho';
import { cores, raio, textoBotao } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { iconeDoMeio } from '@/util/meios';
import { CabecalhoPagamento } from './CabecalhoPagamento';
import { FolhaValorParte } from './FolhaValorParte';
import { rotuloDaParcela } from './rotulos';

type Rota = '/pagar/pix' | '/pagar/cartao' | '/pagar/dinheiro';

/** Venda dividida: mostra o que já foi pago e cobra o restante em partes, cada uma num meio. */
export function TelaDividir() {
  const router = useRouter();
  const { totalCentavos, pagoCentavos, restanteCentavos, parcelas } = useCarrinho();

  const metade = metadeDoValor(restanteCentavos);
  // Na primeira parte sugere a metade; depois, o que falta.
  const [parte, setParte] = useState(parcelas.length === 0 ? metade : restanteCentavos);
  const [digitando, setDigitando] = useState(false);

  useEffect(() => {
    setParte(parcelas.length === 0 ? metadeDoValor(restanteCentavos) : restanteCentavos);
  }, [parcelas.length, restanteCentavos]);

  const percentual = totalCentavos > 0 ? Math.min(100, Math.round((pagoCentavos / totalCentavos) * 100)) : 0;
  const parteValida = Math.min(Math.max(parte, 1), restanteCentavos);

  const cobrar = (rota: Rota) =>
    router.push({ pathname: rota, params: { valor: String(parteValida), dividir: '1' } });

  return (
    <TelaBase rolavel>
      <CabecalhoPagamento titulo="Dividir pagamento" rotuloVoltar="Voltar para formas de pagamento" onVoltar={parcelas.length > 0 ? false : undefined} />

      <View style={estilos.secao}>
        <View style={estilos.linhaProgresso}>
          <Texto style={textoBotao.M} numerico>{`Pago ${formatarBRL(pagoCentavos)}`}</Texto>
          <Texto estilo="legenda" cor={cores.ink3} numerico>{`de ${formatarBRL(totalCentavos)}`}</Texto>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Valor já pago"
          accessibilityValue={{ min: 0, max: 100, now: percentual, text: `${percentual}% pago, ${falarDinheiro(pagoCentavos)} de ${falarDinheiro(totalCentavos)}` }}
          style={estilos.trilho}
        >
          <View style={[estilos.progresso, { width: `${percentual}%` }]} />
        </View>
      </View>

      {parcelas.length > 0 ? (
        <View style={estilos.secao}>
          <Texto estilo="label" cor={cores.ink3} accessibilityRole="header">
            Parcelas
          </Texto>
          {parcelas.map((p, i) => (
            <View key={i} accessible accessibilityLabel={`${rotuloDaParcela(p)}, recebido, ${falarDinheiro(p.valorCentavos)}`} style={estilos.parcela}>
              <View style={estilos.iconeParcela}>
                <Icone nome={iconeDoMeio(p.meio)} />
              </View>
              <View style={estilos.textosParcela}>
                <Texto estilo="corpoMedio">{rotuloDaParcela(p)}</Texto>
                <View style={estilos.recebido}>
                  <Icone nome="check" tamanho={14} cor={cores.folha} espessura={2.5} />
                  <Texto estilo="legenda" cor={cores.folha}>
                    Recebido
                  </Texto>
                </View>
              </View>
              <Dinheiro centavos={p.valorCentavos} estilo="corpoMedio" accessible={false} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={estilos.secao}>
        <Texto estilo="tituloL" numerico accessibilityRole="header">{`Falta ${formatarBRL(restanteCentavos)}`}</Texto>

        <Texto estilo="label" cor={cores.ink3}>
          Valor desta parte
        </Texto>
        <View style={estilos.partes}>
          {restanteCentavos > 1 ? <Chip rotulo={`Metade ${formatarBRL(metade)}`} ativo={parteValida === metade && metade !== restanteCentavos} onPress={() => setParte(metade)} /> : null}
          <Chip rotulo={`Tudo que falta ${formatarBRL(restanteCentavos)}`} ativo={parteValida === restanteCentavos} onPress={() => setParte(restanteCentavos)} />
          <Chip rotulo="Outro valor" ativo={parteValida !== restanteCentavos && parteValida !== metade} onPress={() => setDigitando(true)} />
        </View>
        <Texto estilo="corpoMedio" cor={cores.ink2} numerico accessibilityLabel={`Cobrar agora ${falarDinheiro(parteValida)}`}>
          {`Cobrar agora ${formatarBRL(parteValida)} com:`}
        </Texto>

        <View style={estilos.grade}>
          <OpcaoDeMeio icone="pix" rotulo="Pix" onPress={() => cobrar('/pagar/pix')} />
          <OpcaoDeMeio icone="cartao" rotulo="Cartão" onPress={() => cobrar('/pagar/cartao')} />
          <OpcaoDeMeio icone="dinheiro" rotulo="Dinheiro" onPress={() => cobrar('/pagar/dinheiro')} />
        </View>
        <Texto estilo="legenda" cor={cores.ink3}>
          Cada parte cobra o valor escolhido. Quando o restante chegar a zero, a venda é concluída.
        </Texto>
      </View>

      <FolhaValorParte
        visivel={digitando}
        maximoCentavos={restanteCentavos}
        onFechar={() => setDigitando(false)}
        onUsar={(valor) => {
          setParte(valor);
          setDigitando(false);
        }}
      />
    </TelaBase>
  );
}

function OpcaoDeMeio({ icone, rotulo, onPress, bloqueado }: { icone: NomeIcone; rotulo: string; onPress: () => void; bloqueado?: boolean }) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={bloqueado ? `${rotulo}, bloqueado no seu plano` : rotulo}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={({ pressed }) => [estilos.opcao, { backgroundColor: pressed ? cores.surface2 : cores.surface }, anel]}
    >
      <Icone nome={bloqueado ? 'cadeado' : icone} />
      <Texto style={textoBotao.M}>{rotulo}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  secao: { gap: 8, paddingTop: 12, paddingBottom: 12 },
  linhaProgresso: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  trilho: { height: 10, borderRadius: 999, backgroundColor: cores.surface2, overflow: 'hidden' },
  progresso: { height: '100%', borderRadius: 999, backgroundColor: cores.anil },
  parcela: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: raio.md, backgroundColor: cores.surface },
  iconeParcela: { width: 40, height: 40, borderRadius: raio.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.bg },
  textosParcela: { flex: 1, minWidth: 0, gap: 2 },
  recebido: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcao: { flexGrow: 1, flexBasis: '45%', minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: raio.md },
});
