import { formatarBRL, PLANOS, PLANOS_ORDEM, TESTE_DIAS, type Plano } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { CartaoPlano } from '@/componentes/CartaoPlano';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useDados } from '@/dados/hooks';
import { useRascunho } from '@/nucleo/rascunho';
import { cores } from '@/tema';

const PLANOS_LOCAIS: Plano[] = PLANOS_ORDEM.map((id) => PLANOS[id]);

export default function Planos() {
  const router = useRouter();
  const dados = useDados();
  const { rascunho, alterar } = useRascunho();
  const [planos, setPlanos] = useState(PLANOS_LOCAIS);

  // Preços e limites vêm do servidor quando há API; sem ela (ou sem rede) vale o catálogo do shared.
  useEffect(() => {
    let ativo = true;
    dados
      .listarPlanos()
      .then((lista) => {
        if (ativo && lista.length > 0) setPlanos(lista);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [dados]);

  const escolhido = planos.find((p) => p.id === rascunho.planoId) ?? planos[0];

  return (
    <TelaBase
      rolavel
      rodape={
        <>
          <Botao rotulo={`Começar ${TESTE_DIAS} dias grátis`} onPress={() => router.push('/cartao')} />
          {escolhido ? (
            <Texto estilo="legenda" cor={cores.ink3} style={estilos.nota}>
              {`Depois, ${formatarBRL(escolhido.precoMensalCentavos)} por mês. Cancele quando quiser, sem multa.`}
            </Texto>
          ) : null}
        </>
      }
    >
      <CabecalhoEtapa etapa={3} total={6} onVoltar={() => router.back()} />
      <View style={estilos.corpo}>
        <View style={estilos.titulos}>
          <Texto estilo="tituloXL" accessibilityRole="header">
            Escolha seu plano
          </Texto>
          <Texto estilo="corpo" cor={cores.ink2}>
            {`Teste ${TESTE_DIAS} dias grátis com tudo do plano escolhido. Você pode trocar quando quiser.`}
          </Texto>
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel="Planos" style={estilos.lista}>
          {planos.map((plano) => (
            <CartaoPlano
              key={plano.id}
              plano={plano}
              selecionado={plano.id === rascunho.planoId}
              onPress={() => alterar({ planoId: plano.id })}
            />
          ))}
        </View>
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 24, paddingTop: 16 },
  titulos: { gap: 8 },
  lista: { gap: 12 },
  nota: { textAlign: 'center' },
});
