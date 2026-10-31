import { formatarBRL, formatarDataCurta, PLANOS, TESTE_DIAS, valorMensalAssinatura } from '@pdv/shared';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useAssinatura } from '@/dados/hooks';
import { cores } from '@/tema';

export default function TesteIniciado() {
  const router = useRouter();
  const { assinatura } = useAssinatura();

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility('Seu teste grátis começou.');
  }, []);

  const plano = assinatura ? PLANOS[assinatura.planoId] : null;

  return (
    <TelaBase rodape={<Botao rotulo="Continuar" onPress={() => router.push('/pagamentos')} />}>
      {/* Sem voltar: o teste já começou, não faz sentido refazer o cartão. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={estilos.centro}>
        <Ilustra kind="check" size={220} />
        <Texto estilo="tituloXL" accessibilityRole="header" style={estilos.centrado}>
          Seu teste grátis começou
        </Texto>
        {assinatura && plano ? (
          <Texto estilo="corpoL" cor={cores.ink2} style={estilos.centrado}>
            {`Você tem ${TESTE_DIAS} dias grátis no plano ${plano.nome}. A primeira cobrança, de ${formatarBRL(valorMensalAssinatura(assinatura))}, será em ${formatarDataCurta(assinatura.testeTerminaEm)}.${assinatura.cupom ? ` Cupom ${assinatura.cupom.codigo}: ${assinatura.cupom.percentualDesconto}% de desconto vitalício.` : ''} Cancele quando quiser, sem multa.`}
          </Texto>
        ) : null}
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 24 },
  centrado: { textAlign: 'center' },
});
