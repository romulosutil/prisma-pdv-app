import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useAssinatura, useProdutos, useVendas } from '@/dados/hooks';
import { cores, raio } from '@/tema';
import { formatarHora } from '@/util/tempo';
import { CabecalhoCaixa } from './CabecalhoCaixa';
import { LinhaValor } from './LinhaValor';

/**
 * Situação da sincronização. Ainda não há fila de envio de vendas: no modo de testes tudo fica no
 * aparelho; com a API ligada, o que existe é a conexão e a última verificação da assinatura.
 */
export function StatusSincronizacao() {
  const toast = useToast();
  const { modo, offline, agora, servico } = useAssinatura();
  const { produtos } = useProdutos();
  const { vendas } = useVendas();
  const [verificando, setVerificando] = useState(false);
  const demo = modo === 'demo';

  const verificar = async () => {
    setVerificando(true);
    try {
      await servico.sincronizar();
      toast.mostrar(servico.obter().offline ? 'Ainda sem conexão com o servidor.' : 'Conexão com o servidor confirmada.', {
        tipo: servico.obter().offline ? 'erro' : 'sucesso',
      });
    } catch {
      toast.mostrar('Não foi possível verificar agora. Tente de novo.', { tipo: 'erro' });
    } finally {
      setVerificando(false);
    }
  };

  return (
    <TelaBase rolavel bordas={['top']} style={estilos.tela}>
      <CabecalhoCaixa secao="sync" />

      <View style={estilos.estado}>
        <Ilustra kind={demo || offline ? 'offline' : 'check'} size={140} />
        <View accessibilityLiveRegion="polite" style={estilos.textos}>
          <Texto estilo="tituloL" accessibilityRole="header" style={estilos.centro}>
            {demo ? 'Modo de testes: dados só neste aparelho' : offline ? 'Sem conexão' : 'Conectado'}
          </Texto>
          <Texto estilo="corpo" cor={cores.ink2} style={estilos.centro}>
            {demo
              ? 'Suas vendas e produtos ficam guardados neste aparelho e nada é enviado para a internet.'
              : offline
                ? 'Pode continuar vendendo: guardamos tudo aqui e a conexão volta sozinha.'
                : 'O aparelho está falando com o servidor.'}
          </Texto>
        </View>
      </View>

      <View style={estilos.cartao}>
        <LinhaValor rotulo="Neste aparelho" valor={<Texto estilo="corpoMedio" numerico>{`${produtos.length} produtos · ${vendas.length} vendas`}</Texto>} rotuloAcessivel={`Neste aparelho: ${produtos.length} produtos e ${vendas.length} vendas`} />
        {demo ? null : (
          <LinhaValor
            rotulo="Assinatura verificada às"
            valor={<Texto estilo="corpoMedio" numerico>{formatarHora(agora)}</Texto>}
            rotuloAcessivel={`Assinatura verificada às ${formatarHora(agora)}`}
            divisor
          />
        )}
      </View>

      {demo ? null : <Botao rotulo={offline ? 'Tentar agora' : 'Verificar agora'} icone="sincronizar" carregando={verificando} onPress={verificar} />}
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 20, paddingTop: 24, paddingBottom: 32 },
  estado: { alignItems: 'center', gap: 12 },
  textos: { gap: 8 },
  centro: { textAlign: 'center' },
  cartao: { paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.surface },
});
