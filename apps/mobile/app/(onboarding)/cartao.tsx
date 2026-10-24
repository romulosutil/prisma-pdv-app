import { descricaoCobrancaPaywall, PLANOS } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { FormularioCartao } from '@/componentes/FormularioCartao';
import { Icone } from '@/componentes/Icone';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useAssinatura, useConta, useDados } from '@/dados/hooks';
import { useRascunho } from '@/nucleo/rascunho';
import { cores, raio } from '@/tema';

export default function Cartao() {
  const router = useRouter();
  const dados = useDados();
  const { perfil } = useConta();
  const { servico } = useAssinatura();
  const { rascunho } = useRascunho();
  const plano = PLANOS[rascunho.planoId];
  const cobranca = descricaoCobrancaPaywall(plano.id, dados.relogio.agora());
  const resumo = `Hoje: ${cobranca.hoje} · ${cobranca.texto} · Cancele quando quiser, sem multa.`;

  return (
    <TelaBase rolavel>
      <CabecalhoEtapa etapa={4} total={6} onVoltar={() => router.back()} />
      <View style={estilos.corpo}>
        <View style={estilos.titulos}>
          <Texto estilo="tituloXL" accessibilityRole="header">
            Cadastre seu cartão
          </Texto>
          <Texto estilo="corpo" cor={cores.ink2}>
            {`Plano ${plano.nome}. O cartão só é cobrado depois do teste grátis.`}
          </Texto>
        </View>
        <FormularioCartao
          rotuloBotao="Começar teste grátis"
          agora={() => dados.relogio.agora()}
          nomeInicial={perfil?.nomeResponsavel.toUpperCase()}
          resumo={
            <View accessible accessibilityLabel={resumo} style={estilos.resumo}>
              <Icone nome="info" cor={cores.anil} />
              <Texto estilo="corpoMedio" style={estilos.textoResumo}>
                {resumo}
              </Texto>
            </View>
          }
          aoEnviar={async (token) => {
            await servico.iniciarTeste(plano.id, token);
            router.replace('/teste-iniciado');
          }}
        />
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 24, paddingTop: 16 },
  titulos: { gap: 8 },
  resumo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: raio.md, backgroundColor: cores.anilSoft },
  textoResumo: { flex: 1 },
});
