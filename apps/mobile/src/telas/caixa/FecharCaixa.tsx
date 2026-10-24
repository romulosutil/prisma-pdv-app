import { formatarBRL, type Centavos } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Icone } from '@/componentes/Icone';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { ehErroDeDominio } from '@/dados/erros';
import { useCaixa, useResumoDoDia } from '@/dados/hooks';
import { cores, raio } from '@/tema';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { Confirmacao } from '@/componentes/Confirmacao';
import { useVoltar } from '@/util/useVoltar';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { IconeCaixa } from './icones';
import { compararGaveta, textoDaGaveta, type ResultadoGaveta } from './logica';
import { LinhaValor } from './LinhaValor';
import { TelaDeValor } from './TelaDeValor';

const VISUAL = {
  bate: { fundo: cores.folhaSoft, cor: cores.folha },
  sobra: { fundo: cores.anilSoft, cor: cores.anil },
  falta: { fundo: cores.pitangaSoft, cor: cores.pitanga },
} as const;

export function FecharCaixa() {
  const router = useRouter();
  const toast = useToast();
  const voltar = useVoltar('/caixa');
  const { caixa, fechar } = useCaixa();
  const resumo = useResumoDoDia();
  const [contado, setContado] = useState<Centavos>(0);
  const [digitou, setDigitou] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [fechando, setFechando] = useState(false);

  const esperado = resumo.esperadoNaGavetaCentavos;

  if (!caixa || esperado === null) {
    return (
      <TelaBase bordas={['top']} style={estilos.semCaixa}>
        <CabecalhoTela titulo="Fechar caixa" onVoltar={voltar} rotuloVoltar="Voltar para o caixa" />
        <Texto estilo="corpoL" cor={cores.ink2}>
          Não há caixa aberto para fechar.
        </Texto>
        <Botao rotulo="Abrir caixa" onPress={() => router.replace('/caixa/abrir')} />
      </TelaBase>
    );
  }

  const resultado = digitou ? compararGaveta(esperado, contado) : null;

  const confirmar = async () => {
    if (!resultado) return;
    setFechando(true);
    try {
      await fechar(contado);
      toast.mostrar(`Caixa fechado. ${textoDaGaveta(resultado)}.`, { tipo: 'sucesso' });
      router.replace('/caixa');
    } catch (erro) {
      setConfirmando(false);
      if (ehErroDeDominio(erro, 'caixa_fechado')) router.replace('/caixa');
      else toast.mostrar('Não foi possível fechar o caixa. Tente de novo.', { tipo: 'erro' });
    } finally {
      setFechando(false);
    }
  };

  return (
    <>
      <TelaDeValor
        titulo="Fechar caixa"
        onVoltar={voltar}
        descricao="Conte as notas e moedas da gaveta e digite o total."
        antes={
          <View style={estilos.esperado}>
            <LinhaValor rotulo="Esperado na gaveta" centavos={esperado} destaque />
          </View>
        }
        rotuloCampo="Valor contado"
        valorCentavos={contado}
        onChange={(valor) => {
          setContado(valor);
          setDigitou(true);
        }}
        depois={resultado ? <ResultadoDaContagem resultado={resultado} /> : null}
        acao={{ rotulo: 'Fechar caixa', onPress: () => setConfirmando(true), desabilitado: !digitou }}
      />
      <Confirmacao
        visivel={confirmando}
        onFechar={() => setConfirmando(false)}
        titulo="Fechar o caixa?"
        texto={`Você contou ${formatarBRL(contado)} e o esperado era ${formatarBRL(esperado)}. ${resultado ? `${textoDaGaveta(resultado)}. ` : ''}Depois de fechado, você abre um novo caixa quando quiser.`}
        rotuloConfirmar="Fechar caixa"
        carregando={fechando}
        onConfirmar={confirmar}
      />
    </>
  );
}

/** Diferença sempre com ícone e texto (Bateu, Sobra, Falta), nunca só cor. */
function ResultadoDaContagem({ resultado }: { resultado: ResultadoGaveta }) {
  const visual = VISUAL[resultado.tipo];
  const texto = textoDaGaveta(resultado);
  const falado = resultado.tipo === 'bate' ? texto : `${resultado.tipo === 'sobra' ? 'Sobra' : 'Falta'} ${falarDinheiro(resultado.valorCentavos)}`;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" accessibilityLabel={falado} style={[estilos.resultado, { backgroundColor: visual.fundo }]}>
      {resultado.tipo === 'bate' ? <Icone nome="check" cor={visual.cor} /> : null}
      {resultado.tipo === 'sobra' ? <IconeCaixa nome="sobe" cor={visual.cor} /> : null}
      {resultado.tipo === 'falta' ? <Icone nome="alerta" cor={visual.cor} /> : null}
      <Texto estilo="tituloM" cor={visual.cor} numerico>
        {texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  semCaixa: { gap: 16, paddingTop: 16 },
  esperado: { paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.surface },
  resultado: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: raio.md },
});
