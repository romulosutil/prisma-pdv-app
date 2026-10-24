import { planoMinimoPara, PLANOS } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { TelaBase } from '@/componentes/TelaBase';
import { TilePagamento } from '@/componentes/TilePagamento';
import { Texto } from '@/componentes/Texto';
import { usePreferencias, useLicenca } from '@/dados/hooks';
import { cores } from '@/tema';
import { PROVEDORES } from '@/util/provedores';

export default function Pagamentos() {
  const router = useRouter();
  const { preferencias, definirConexao } = usePreferencias();
  const { podeUsar } = useLicenca();
  const liberado = podeUsar('integracao_pagamentos');

  return (
    <TelaBase rolavel rodape={<Botao rotulo="Continuar" onPress={() => router.push('/camera')} />}>
      <CabecalhoEtapa etapa={5} total={6} onVoltar={() => router.back()} />
      <View style={estilos.corpo}>
        <Texto estilo="tituloXL" accessibilityRole="header">
          Como você quer receber?
        </Texto>
        <View style={estilos.lista}>
          {PROVEDORES.map((p) => (
            <TilePagamento
              key={p.id}
              titulo={p.nome}
              legenda={p.legenda}
              monograma={p.monograma}
              fundo={p.fundo}
              cor={p.cor}
              estado={!liberado ? 'bloqueado' : preferencias.conectados[p.id] ? 'conectado' : 'desconectado'}
              rotuloBloqueio={`Plano ${PLANOS[planoMinimoPara('integracao_pagamentos')].nome}`}
              onPress={() => definirConexao(p.id, !preferencias.conectados[p.id])}
            />
          ))}
          <TilePagamento
            titulo="Dinheiro"
            legenda="Com calculadora de troco"
            icone="dinheiro"
            fundo={cores.folhaSoft}
            cor={cores.folha}
            estado="sempre_ativo"
          />
          <Texto estilo="legenda" cor={cores.ink3}>
            Dá para mudar depois em Ajustes.
          </Texto>
        </View>
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 32, paddingTop: 24 },
  lista: { gap: 12 },
});
