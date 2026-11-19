import { formatarBRL, PLANOS, PLANOS_DISPONIVEIS, TESTE_DIAS, type ConfiguracaoCobrancaRes, type Plano } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { CartaoPlano } from '@/componentes/CartaoPlano';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useAssinatura, useConta, useDados } from '@/dados/hooks';
import { useRascunho } from '@/nucleo/rascunho';
import { mensagemDeErro } from '@/servicos/backend';
import { iniciarAssinaturaPlay } from '@/servicos/playBilling';
import { cores } from '@/tema';

const PLANOS_LOCAIS: Plano[] = PLANOS_DISPONIVEIS.map((id) => PLANOS[id]);

export default function Planos() {
  const router = useRouter();
  const toast = useToast();
  const dados = useDados();
  const { identidade } = useConta();
  const { servico } = useAssinatura();
  const { rascunho, alterar } = useRascunho();
  const [planos, setPlanos] = useState(PLANOS_LOCAIS);
  const [configPlay, setConfigPlay] = useState<ConfiguracaoCobrancaRes | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let ativo = true;
    dados
      .listarPlanos()
      .then((lista) => {
        if (ativo && lista.length > 0) setPlanos(lista);
      })
      .catch(() => undefined);
    dados.backend
      .obterConfiguracaoCobranca?.()
      .then((cfg) => {
        if (ativo) setConfigPlay(cfg);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [dados]);

  const escolhido = planos.find((p) => p.id === rascunho.planoId) ?? planos.find((p) => p.id === 'free') ?? planos[0];
  const canalGooglePlay = configPlay?.canal === 'google_play' || dados.backend.modo === 'http';
  const ehFree = escolhido?.id === 'free' || (escolhido?.precoMensalCentavos ?? 0) === 0;

  const continuar = async () => {
    if (!escolhido || ocupado) return;
    if (ehFree) {
      setOcupado(true);
      try {
        if (dados.backend.ativarPlanoGratuito) {
          await servico.ativarPlanoGratuito();
        }
        router.replace('/pagamentos');
      } catch (erro) {
        toast.mostrar(mensagemDeErro(erro), { tipo: 'erro' });
      } finally {
        setOcupado(false);
      }
      return;
    }

    if (canalGooglePlay) {
      setOcupado(true);
      try {
        const compra = await iniciarAssinaturaPlay({
          packageName: configPlay?.packageName ?? 'br.com.pdv.mobile',
          sku: configPlay?.skuProMensal ?? 'prisma_pro_mensal',
          contaId: identidade?.contaId,
        });
        await servico.confirmarCompraGooglePlay(compra);
        router.replace('/pagamentos');
      } catch (erro) {
        toast.mostrar(erro instanceof Error ? erro.message : mensagemDeErro(erro), { tipo: 'erro' });
      } finally {
        setOcupado(false);
      }
      return;
    }

    router.push('/cartao');
  };

  return (
    <TelaBase
      rolavel
      rodape={
        <>
          <Botao
            rotulo={
              ehFree
                ? 'Começar no plano gratuito'
                : canalGooglePlay
                  ? `Assinar Pro na Google Play (${formatarBRL(escolhido!.precoMensalCentavos)}/mês)`
                  : `Começar ${TESTE_DIAS} dias grátis`
            }
            carregando={ocupado}
            onPress={() => void continuar()}
          />
          {!ehFree ? (
            <Botao
              rotulo="Continuar no plano gratuito"
              variante="ghost"
              tamanho="M"
              larguraTotal
              desabilitado={ocupado}
              onPress={() => router.replace('/pagamentos')}
            />
          ) : null}
          {escolhido && !ehFree ? (
            <Texto estilo="legenda" cor={cores.ink3} style={estilos.nota}>
              {`Inclui ${TESTE_DIAS} dias grátis quando elegível na Google Play. Depois, ${formatarBRL(escolhido.precoMensalCentavos)} por mês. Cancele quando quiser.`}
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
            Comece de graça para vender sem limite de vendas ou assine o Pro para liberar recursos avançados e equipe.
          </Texto>
        </View>
        {canalGooglePlay ? (
          <Banner tipo="info" texto="A cobrança do plano Pro é processada com segurança pela Google Play Store." />
        ) : null}
        <View accessibilityRole="radiogroup" accessibilityLabel="Planos" style={estilos.lista}>
          {planos.map((plano) => (
            <CartaoPlano
              key={plano.id}
              plano={plano}
              selecionado={plano.id === escolhido?.id}
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
