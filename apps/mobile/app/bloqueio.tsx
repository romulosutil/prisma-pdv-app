import { formatarData, PLANOS, type ConfiguracaoCobrancaRes } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useAssinatura, useDados } from '@/dados/hooks';
import { mensagemDeErro } from '@/servicos/backend';
import { abrirGerenciamentoPlay, restaurarComprasPlay } from '@/servicos/playBilling';
import { cores } from '@/tema';

/** Assinatura suspensa (ou cancelada e vencida): orienta regularização ou volta ao Free sem perder dados. */
export default function Bloqueio() {
  const router = useRouter();
  const dados = useDados();
  const { assinatura, servico } = useAssinatura();
  const [configPlay, setConfigPlay] = useState<ConfiguracaoCobrancaRes | null>(null);
  const [reativando, setReativando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const cancelada = assinatura?.status === 'cancelada';

  useEffect(() => {
    let ativo = true;
    dados.backend
      .obterConfiguracaoCobranca?.()
      .then((cfg) => {
        if (ativo) setConfigPlay(cfg);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [dados.backend]);

  const modoGooglePlay = configPlay?.canal === 'google_play' || assinatura?.cartao === null;
  const packageName = configPlay?.packageName ?? 'br.com.pdv.mobile';
  const sku = configPlay?.skuProMensal ?? 'prisma_pro_mensal';

  const reativar = async () => {
    if (!assinatura) return;
    setErro(null);
    setReativando(true);
    try {
      await servico.reativar(assinatura.planoId);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setReativando(false);
    }
  };

  const restaurarPlay = async () => {
    setErro(null);
    setReativando(true);
    try {
      const compra = await restaurarComprasPlay({ packageName, sku });
      if (!compra) {
        setErro('Nenhuma assinatura ativa foi encontrada na sua conta Google Play.');
        return;
      }
      await servico.restaurarCompraGooglePlay(compra);
      router.replace('/');
    } catch (e) {
      setErro(e instanceof Error ? e.message : mensagemDeErro(e));
    } finally {
      setReativando(false);
    }
  };

  const usarPlanoGratuito = async () => {
    setErro(null);
    setReativando(true);
    try {
      await servico.ativarPlanoGratuito();
      router.replace('/');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setReativando(false);
    }
  };

  return (
    <TelaBase
      rolavel
      rodape={
        modoGooglePlay ? (
          <>
            <Botao
              rotulo="Regularizar na Google Play"
              onPress={() => void abrirGerenciamentoPlay(packageName, sku)}
            />
            <Botao
              rotulo="Restaurar compra"
              variante="secundario"
              tamanho="M"
              larguraTotal
              carregando={reativando}
              onPress={() => void restaurarPlay()}
            />
            <Botao
              rotulo="Continuar no plano gratuito"
              variante="terciario"
              tamanho="M"
              larguraTotal
              desabilitado={reativando}
              onPress={() => void usarPlanoGratuito()}
            />
          </>
        ) : cancelada ? (
          <>
            <Botao rotulo="Reativar assinatura" onPress={reativar} carregando={reativando} />
            <Botao rotulo="Atualizar cartão" variante="ghost" tamanho="M" larguraTotal onPress={() => router.push('/atualizar-cartao')} />
          </>
        ) : (
          <Botao rotulo="Atualizar cartão" onPress={() => router.push('/atualizar-cartao')} />
        )
      }
    >
      <View style={estilos.centro}>
        <Ilustra kind="pausa" size={200} />
        <Texto estilo="tituloXL" accessibilityRole="header" style={estilos.centrado}>
          {cancelada ? 'Assinatura cancelada' : 'Assinatura suspensa'}
        </Texto>
        <Texto estilo="corpoL" cor={cores.ink2} style={estilos.centrado}>
          {cancelada
            ? `Seu acesso ao plano ${assinatura ? PLANOS[assinatura.planoId].nome : 'Pro'} terminou${assinatura?.acessoAte ? ` em ${formatarData(assinatura.acessoAte)}` : ''}.`
            : modoGooglePlay
              ? 'Sua assinatura Pro não está ativa no momento. Você pode regularizar pela Google Play ou usar o plano gratuito.'
              : 'Não conseguimos cobrar seu cartão e o prazo de 7 dias terminou. Atualize o cartão para voltar a abrir vendas.'}
        </Texto>
        <Texto estilo="corpo" cor={cores.ink3} style={estilos.centrado}>
          Seus registros permanecem preservados. Consulte o suporte para exportação e pedidos de exclusão.
        </Texto>
        <Botao rotulo="Suporte, privacidade e exportação" variante="terciario" onPress={() => router.push('/suporte')} />
        {erro ? (
          <View style={estilos.aviso}>
            <Banner tipo="erro" texto={erro} />
          </View>
        ) : null}
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 24 },
  centrado: { textAlign: 'center' },
  aviso: { alignSelf: 'stretch' },
});
