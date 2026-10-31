import { aplicarDesconto, descricaoCobrancaPaywall, encontrarCupom, formatarBRL, PLANOS, TESTE_DIAS, type CupomAplicado } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
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
  const [codigoCupom, setCodigoCupom] = useState('');
  const [cupom, setCupom] = useState<CupomAplicado | null>(null);
  const [erroCupom, setErroCupom] = useState<string | null>(null);
  const plano = PLANOS[rascunho.planoId];
  const cobranca = descricaoCobrancaPaywall(plano.id, dados.relogio.agora(), cupom);
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
        <View style={estilos.cupom}>
          <Campo
            rotulo="Cupom de desconto (opcional)"
            value={codigoCupom}
            maxLength={40}
            autoCapitalize="characters"
            autoCorrect={false}
            erro={erroCupom}
            onChangeText={(valor) => {
              setCodigoCupom(valor);
              setCupom(null);
              setErroCupom(null);
            }}
          />
          <Botao
            rotulo={cupom ? 'Remover cupom' : 'Aplicar cupom'}
            variante="secundario"
            onPress={() => {
              if (cupom) { setCupom(null); setCodigoCupom(''); return; }
              const encontrado = encontrarCupom(codigoCupom);
              setErroCupom(encontrado ? null : 'Cupom inválido. Confira o código e tente novamente.');
              setCupom(encontrado);
              if (encontrado) setCodigoCupom(encontrado.codigo);
            }}
          />
          {cupom ? (
            <Texto estilo="corpoMedio" cor={cores.folha} accessibilityLiveRegion="polite">
              {`${cupom.codigo}: ${cupom.percentualDesconto}% de desconto vitalício. De ${formatarBRL(plano.precoMensalCentavos)} por ${formatarBRL(aplicarDesconto(plano.precoMensalCentavos, cupom))}/mês após os ${TESTE_DIAS} dias grátis.`}
            </Texto>
          ) : null}
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
            if (codigoCupom.trim() && !cupom) {
              setErroCupom('Aplique ou remova o cupom antes de continuar.');
              return;
            }
            await servico.iniciarTeste(plano.id, token, cupom?.codigo);
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
  cupom: { gap: 12 },
  resumo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: raio.md, backgroundColor: cores.anilSoft },
  textoResumo: { flex: 1 },
});
