import { PLANOS, planoMinimoPara } from '@pdv/shared';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { DevSettings, Platform, StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Icone } from '@/componentes/Icone';
import { Interruptor } from '@/componentes/Interruptor';
import { LinhaLista } from '@/componentes/LinhaLista';
import { Secao } from '@/componentes/Secao';
import { Segmentado } from '@/componentes/Segmentado';
import { StatusPill } from '@/componentes/StatusPill';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { TilePagamento } from '@/componentes/TilePagamento';
import { useAssinatura, useConta, useDados, useLicenca, usePreferencias } from '@/dados/hooks';
import { cores, raio } from '@/tema';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { PROVEDORES } from '@/util/provedores';
import { STATUS_VISUAL } from '@/util/statusAssinatura';

function recarregarApp() {
  if (Platform.OS === 'web') window.location.reload();
  else DevSettings.reload();
}

export default function Ajustes() {
  const router = useRouter();
  const dados = useDados();
  const { perfil, primeiroNome } = useConta();
  const { assinatura } = useAssinatura();
  const { podeUsar } = useLicenca();
  const { preferencias, alterar, definirConexao } = usePreferencias();
  const integracaoLiberada = podeUsar('integracao_pagamentos');
  const status = assinatura ? STATUS_VISUAL[assinatura.status] : null;

  return (
    <TelaBase rolavel bordas={['top']} style={estilos.tela}>
      <Texto estilo="tituloXL" accessibilityRole="header">
        Ajustes
      </Texto>

      <Secao titulo="Conta">
        <View style={estilos.cartao}>
          <LinhaLista
            titulo="Assinatura"
            subtitulo={assinatura ? `Plano ${PLANOS[assinatura.planoId].nome}` : 'Sem assinatura'}
            rotuloAcessivel={assinatura && status ? `Assinatura, plano ${PLANOS[assinatura.planoId].nome}, ${status.texto}` : 'Assinatura'}
            onPress={() => router.push('/ajustes/assinatura')}
            valor={
              <View style={estilos.valorAssinatura}>
                {status ? <StatusPill tipo={status.tipo} texto={status.texto} /> : null}
                <Icone nome="chevronDireita" tamanho={20} cor={cores.ink3} />
              </View>
            }
          />
        </View>
      </Secao>

      <Secao titulo="Recebimentos">
        <View style={estilos.lista}>
          {PROVEDORES.map((p) => (
            <TilePagamento
              key={p.id}
              titulo={p.nome}
              legenda={p.legenda}
              monograma={p.monograma}
              fundo={p.fundo}
              cor={p.cor}
              estado={!integracaoLiberada ? 'bloqueado' : preferencias.conectados[p.id] ? 'conectado' : 'desconectado'}
              rotuloBloqueio={`Plano ${PLANOS[planoMinimoPara('integracao_pagamentos')].nome}`}
              onPress={() => definirConexao(p.id, !preferencias.conectados[p.id])}
            />
          ))}
          <TilePagamento titulo="Dinheiro" legenda="Com calculadora de troco" icone="dinheiro" fundo={cores.bg} cor={cores.ink} estado="sempre_ativo" />
        </View>
        <View style={estilos.opcao}>
          <Texto estilo="label">Pix sai por padrão em</Texto>
          <Segmentado
            rotuloGrupo="Pix sai por padrão em"
            valor={preferencias.pixPadrao}
            onChange={(pixPadrao) => alterar({ pixPadrao })}
            opcoes={PROVEDORES.map((p) => ({ valor: p.id, rotulo: p.nome }))}
          />
        </View>
      </Secao>

      <Secao titulo="Leitor">
        <View style={estilos.interruptores}>
          <Interruptor rotulo="Bipe sonoro" ligado={preferencias.bipe} onChange={(bipe) => alterar({ bipe })} />
          <Interruptor rotulo="Vibrar ao ler" ligado={preferencias.vibrar} onChange={(vibrar) => alterar({ vibrar })} divisor />
          <Interruptor rotulo="Lanterna ao abrir a câmera" ligado={preferencias.lanterna} onChange={(lanterna) => alterar({ lanterna })} divisor />
        </View>
        <View style={estilos.opcao}>
          <Texto estilo="label">Ignorar o mesmo código por</Texto>
          <Segmentado
            rotuloGrupo="Ignorar o mesmo código por"
            valor={preferencias.ignorarMesmoCodigoMs}
            onChange={(ignorarMesmoCodigoMs) => alterar({ ignorarMesmoCodigoMs })}
            opcoes={[
              { valor: 1000, rotulo: '1 s' },
              { valor: 1500, rotulo: '1,5 s' },
              { valor: 2000, rotulo: '2 s' },
            ]}
          />
        </View>
        <View style={estilos.opcao}>
          <Texto estilo="label">Pausar a câmera parada após</Texto>
          <Segmentado
            rotuloGrupo="Pausar a câmera parada após"
            valor={preferencias.pausarCameraSeg}
            onChange={(pausarCameraSeg) => alterar({ pausarCameraSeg })}
            opcoes={[
              { valor: 10, rotulo: '10 s' },
              { valor: 15, rotulo: '15 s' },
              { valor: 30, rotulo: '30 s' },
            ]}
          />
        </View>
        <Texto estilo="legenda" cor={cores.ink3}>
          Evita passar o mesmo produto duas vezes e poupa bateria.
        </Texto>
      </Secao>

      <Secao titulo="Aparelho" agrupar>
        <LinhaDado rotulo="Nome do aparelho" valor={perfil?.aparelhoNome ?? ''} />
        <LinhaDado rotulo="Operadora" valor={primeiroNome} divisor />
        <LinhaDado rotulo="Loja" valor={perfil?.nomeLoja ?? ''} divisor />
        {perfil?.tipoLoja ? <LinhaDado rotulo="Tipo de comércio" valor={perfil.tipoLoja} divisor /> : null}
        <LinhaDado rotulo="Versão" valor={Constants.expoConfig?.version ?? '0.1.0'} divisor />
      </Secao>

      {FERRAMENTAS_TESTE ? (
        <Secao titulo="Desenvolvimento">
          <Botao
            rotulo="Zerar dados do app"
            variante="perigo"
            tamanho="M"
            larguraTotal
            accessibilityHint="Apaga conta, assinatura e vendas deste aparelho e reinicia o app"
            onPress={async () => {
              await dados.zerar();
              recarregarApp();
            }}
          />
        </Secao>
      ) : null}
    </TelaBase>
  );
}

function LinhaDado({ rotulo, valor, divisor }: { rotulo: string; valor: string; divisor?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${rotulo}: ${valor}`} style={[estilos.dado, divisor && estilos.divisor]}>
      <Texto estilo="corpo" cor={cores.ink2}>
        {rotulo}
      </Texto>
      <Texto estilo="corpoMedio" style={estilos.valorDado}>
        {valor}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 28, paddingTop: 24, paddingBottom: 32 },
  cartao: { paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.surface },
  valorAssinatura: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  lista: { gap: 8 },
  opcao: { gap: 8, marginTop: 8 },
  interruptores: { paddingLeft: 16, paddingRight: 8, borderRadius: raio.md, backgroundColor: cores.surface },
  dado: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.line },
  valorDado: { flexShrink: 1, textAlign: 'right' },
});
