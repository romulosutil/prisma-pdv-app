import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Ilustra } from '@/componentes/Ilustra';
import { StatusPill } from '@/componentes/StatusPill';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { provedoresPagamento } from '@/servicos/provedoresPagamento';
import { cores } from '@/tema';
import { NOME_TAP } from './rotulos';
import { useCobranca } from './useCobranca';

/** Voltou do app do provedor sem resultado: consulta antes de cobrar de novo, para não cobrar duas vezes. */
export function TelaTapFalha() {
  const router = useRouter();
  const { provedor, cobranca, parametros, receber, ocupado, trocarDeMeio } = useCobranca();
  const [consultado, setConsultado] = useState(false);

  if (!provedor || !cobranca) return <Redirect href="/pagar" />;

  const consultar = () => {
    if (provedoresPagamento.situacaoTap(cobranca) === 'aprovado') void receber({ meio: 'tap', provedor });
    else setConsultado(true);
  };

  return (
    <TelaBase
      rodape={
        <>
          <Botao rotulo="Consultar status" carregando={ocupado} onPress={consultar} />
          <Botao
            rotulo="Tentar de novo"
            variante={consultado ? 'secundario' : 'terciario'}
            desabilitado={!consultado}
            accessibilityHint={consultado ? undefined : 'Consulte o status antes, para não cobrar duas vezes'}
            onPress={() => router.replace({ pathname: '/pagar/tap', params: parametros() })}
          />
          <Botao rotulo="Outro meio de pagamento" variante="terciario" tamanho="M" larguraTotal onPress={trocarDeMeio} />
        </>
      }
    >
      <View style={estilos.conteudo}>
        <StatusPill tipo="pendente" />
        <Ilustra kind="recibo" size={140} />
        <Texto estilo="tituloXL" accessibilityRole="header" style={estilos.centro}>
          Não recebemos a confirmação
        </Texto>
        <Texto estilo="corpo" cor={cores.ink2} style={estilos.centro}>
          {`Você voltou do ${NOME_TAP[provedor]} sem um resultado. Antes de cobrar de novo, consulte o status para não cobrar duas vezes.`}
        </Texto>
        {consultado ? <Banner tipo="info" texto="Nenhum pagamento encontrado para esta venda. Pode tentar de novo." /> : null}
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  conteudo: { flex: 1, alignItems: 'center', gap: 16, paddingTop: 32 },
  centro: { textAlign: 'center' },
});
