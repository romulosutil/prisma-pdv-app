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
import {
  consultarOfertaPlay,
  descreverOfertaPlay,
  iniciarAssinaturaPlay,
  type OfertaAssinaturaPlay,
} from '@/servicos/playBilling';
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
  const [ofertaPlay, setOfertaPlay] = useState<OfertaAssinaturaPlay | null>(null);
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
  const skuPlay = configPlay?.skuProMensal ?? 'prisma_pro_mensal';
  const ehFree = escolhido?.id === 'free' || (escolhido?.precoMensalCentavos ?? 0) === 0;
  const planoPro = planos.find((p) => p.id === 'pro') ?? PLANOS.pro;
  const descricaoPlay = descreverOfertaPlay(ofertaPlay, planoPro.precoMensalCentavos);

  useEffect(() => {
    if (!canalGooglePlay) return;
    let ativo = true;
    consultarOfertaPlay({ sku: skuPlay })
      .then((oferta) => {
        if (ativo) setOfertaPlay(oferta);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [canalGooglePlay, skuPlay]);

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
          sku: skuPlay,
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
                  ? descricaoPlay.rotuloBotaoOnboarding
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
              {canalGooglePlay
                ? descricaoPlay.notaCobranca
                : `Inclui ${TESTE_DIAS} dias grátis. Depois, ${formatarBRL(escolhido.precoMensalCentavos)} por mês. Cancele quando quiser.`}
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
          {planos.map((plano) => {
            const usarOfertaPlay = canalGooglePlay && plano.id === 'pro' && ofertaPlay !== null;
            return (
              <CartaoPlano
                key={plano.id}
                plano={plano}
                selecionado={plano.id === escolhido?.id}
                precoFormatado={usarOfertaPlay ? descricaoPlay.precoFormatado : undefined}
                periodoLabel={usarOfertaPlay ? descricaoPlay.periodoLabel : undefined}
                detalheOferta={usarOfertaPlay ? descricaoPlay.detalheOferta : undefined}
                onPress={() => alterar({ planoId: plano.id })}
              />
            );
          })}
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
