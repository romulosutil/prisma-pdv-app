import { formatarData, PLANOS } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useAssinatura } from '@/dados/hooks';
import { mensagemDeErro } from '@/servicos/backend';
import { cores } from '@/tema';

/** Assinatura suspensa (ou cancelada e vencida): não abre novas vendas até pagar. */
export default function Bloqueio() {
  const router = useRouter();
  const { assinatura, servico } = useAssinatura();
  const [reativando, setReativando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const cancelada = assinatura?.status === 'cancelada';

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

  return (
    <TelaBase
      rolavel
      rodape={
        cancelada ? (
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
            ? `Seu acesso terminou${assinatura?.acessoAte ? ` em ${formatarData(assinatura.acessoAte)}` : ''}. Reative o plano ${assinatura ? PLANOS[assinatura.planoId].nome : ''} para voltar a vender.`
            : 'Não conseguimos cobrar seu cartão e o prazo de 7 dias terminou. Atualize o cartão para voltar a abrir vendas.'}
        </Texto>
        <Texto estilo="corpo" cor={cores.ink3} style={estilos.centrado}>
          Seus dados continuam guardados por 90 dias.
        </Texto>
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
