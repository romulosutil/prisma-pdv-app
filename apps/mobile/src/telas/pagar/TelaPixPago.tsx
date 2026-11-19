import { useLocalSearchParams, Redirect } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { NOME_PROVEDOR, ehProvedor } from './rotulos';
import { useCobranca } from './useCobranca';

export function TelaPixPago() {
  const params = useLocalSearchParams<{ cobranca?: string; provedor?: string }>();
  const { valorCentavos, dividindo, avancar, ocupado } = useCobranca();

  useEffect(() => {
    if (!params.cobranca) return;
    AccessibilityInfo.announceForAccessibility(`Pix confirmado, ${falarDinheiro(valorCentavos)}`);
  }, [params.cobranca, valorCentavos]);

  if (!params.cobranca) {
    return <Redirect href="/pagar" />;
  }

  const nomeProvedor = ehProvedor(params.provedor) ? NOME_PROVEDOR[params.provedor] : 'Pix';

  return (
    <TelaBase
      style={estilos.raiz}
      rodape={
        <Botao
          rotulo={dividindo ? 'Voltar para dividir pagamento' : 'Concluir venda'}
          carregando={ocupado}
          onPress={() => void avancar()}
        />
      }
    >
      <View style={estilos.centro}>
        <Ilustra kind="check" size={140} />
        <Texto estilo="tituloXL" cor={cores.folha} accessibilityRole="header" style={estilos.centrado}>
          Pix confirmado!
        </Texto>
        <Dinheiro centavos={valorCentavos} estilo="display" cor={cores.ink} />
        <Texto estilo="corpoMedio" cor={cores.ink2} style={estilos.centrado}>
          {`Recebido via ${nomeProvedor}`}
        </Texto>
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  raiz: { backgroundColor: cores.folhaSoft },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centrado: { textAlign: 'center' },
});
