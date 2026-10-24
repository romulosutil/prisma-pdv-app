import { formatarBRL, PLANOS } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BotaoIcone } from '@/componentes/BotaoIcone';
import { FormularioCartao } from '@/componentes/FormularioCartao';
import { Icone } from '@/componentes/Icone';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useAssinatura, useConta, useDados } from '@/dados/hooks';
import { cores, raio } from '@/tema';

export default function AtualizarCartao() {
  const router = useRouter();
  const toast = useToast();
  const dados = useDados();
  const { perfil } = useConta();
  const { assinatura, servico } = useAssinatura();
  const emAtraso = assinatura?.status === 'inadimplente' || assinatura?.status === 'suspensa';
  const valor = assinatura ? PLANOS[assinatura.planoAgendado ?? assinatura.planoId].precoMensalCentavos : 0;
  const aviso = emAtraso ? `Vamos cobrar ${formatarBRL(valor)} agora neste cartão para liberar o acesso.` : 'O novo cartão vale para as próximas cobranças.';

  const sair = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <TelaBase rolavel>
      <View style={estilos.topo}>
        <BotaoIcone icone="voltar" rotulo="Voltar" onPress={sair} />
      </View>
      <View style={estilos.corpo}>
        <Texto estilo="tituloXL" accessibilityRole="header">
          Atualizar cartão
        </Texto>
        <FormularioCartao
          rotuloBotao={emAtraso ? `Pagar ${formatarBRL(valor)}` : 'Salvar cartão'}
          agora={() => dados.relogio.agora()}
          nomeInicial={perfil?.nomeResponsavel.toUpperCase()}
          resumo={
            <View accessible accessibilityLabel={aviso} style={estilos.resumo}>
              <Icone nome="info" cor={cores.anil} />
              <Texto estilo="corpoMedio" style={estilos.textoResumo}>
                {aviso}
              </Texto>
            </View>
          }
          aoEnviar={async (token) => {
            await servico.atualizarCartao(token);
            toast.mostrar(emAtraso ? 'Pagamento aprovado. Acesso liberado.' : 'Cartão atualizado.', { tipo: 'sucesso' });
            sair();
          }}
        />
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  topo: { minHeight: 56, justifyContent: 'center' },
  corpo: { gap: 24, paddingTop: 16 },
  resumo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: raio.md, backgroundColor: cores.anilSoft },
  textoResumo: { flex: 1 },
});
