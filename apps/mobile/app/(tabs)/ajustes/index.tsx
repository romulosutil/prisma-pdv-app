import { PLANOS } from '@pdv/shared';
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
import { useAssinatura, useConta, useDados, usePreferencias } from '@/dados/hooks';
import { registrar, salvarAgora } from '@/diagnostico/registro';
import { cores, raio } from '@/tema';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { STATUS_VISUAL } from '@/util/statusAssinatura';

/**
 * Seção de diagnóstico da versão de testes. A condição é a de `FERRAMENTAS_TESTE` escrita por extenso: o Metro só
 * elimina o ramo morto (e o módulo do `require`) quando está inline. Sem EXPO_PUBLIC_FERRAMENTAS_TESTE, a seção
 * e o texto "Copiar diagnóstico" não entram no bundle de produção.
 */
const SecaoDiagnostico: typeof import('@/diagnostico/SecaoDiagnostico').SecaoDiagnostico | null =
  __DEV__ || process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE === '1'
    ? (require('@/diagnostico/SecaoDiagnostico') as typeof import('@/diagnostico/SecaoDiagnostico')).SecaoDiagnostico
    : null;

function recarregarApp() {
  if (Platform.OS === 'web') window.location.reload();
  else DevSettings.reload();
}

export default function Ajustes() {
  const router = useRouter();
  const dados = useDados();
  const { perfil, primeiroNome, identidade } = useConta();
  const dono = !identidade?.papel || identidade.papel === 'dono';
  const { assinatura } = useAssinatura();
  const { preferencias, alterar } = usePreferencias();
  const status = assinatura ? STATUS_VISUAL[assinatura.status] : null;

  return (
    <TelaBase rolavel bordas={['top']} style={estilos.tela}>
      <Texto estilo="tituloXL" accessibilityRole="header">
        Ajustes
      </Texto>

      <Secao titulo="Conta">
        <View style={estilos.cartao}>
          <LinhaLista titulo="Usuários neste aparelho" subtitulo={perfil?.email ?? 'Acesso pessoal'} onPress={() => router.push('/ajustes/usuarios')} valor={<Icone nome="chevronDireita" tamanho={20} cor={cores.ink3} />} />
          {dono && dados.backend?.modo === 'http' ? <LinhaLista titulo="Equipe da loja" subtitulo="Convites e permissões" onPress={() => router.push('/ajustes/equipe')} valor={<Icone nome="chevronDireita" tamanho={20} cor={cores.ink3} />} /> : null}
          {dono ? <LinhaLista titulo="Conta e aparelhos" subtitulo="Acesso e recuperação" onPress={() => router.push('/ajustes/aparelhos')} valor={<Icone nome="chevronDireita" tamanho={20} cor={cores.ink3} />} /> : null}
          {dono ? <LinhaLista
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
          /> : null}
        </View>
      </Secao>

      {dados.backend?.modo === 'http' ? <Secao titulo="Gestão">
        <LinhaLista titulo="Estoque e movimentos" subtitulo="Entradas, devoluções e divergências" onPress={() => router.push('/gestao/estoque')} />
        {dados.pode('vender') ? <LinhaLista titulo="Clientes e fiado" subtitulo="Saldos, vencimentos e recebimentos" onPress={() => router.push('/gestao/fiado')} /> : null}
        <LinhaLista titulo="Relatórios e CSV" subtitulo="Por período, usuário, turno, loja e meio" onPress={() => router.push('/gestao/relatorios')} />
        <LinhaLista titulo="Lojas e vínculos" subtitulo="Selecionar loja e administrar filiais" onPress={() => router.push('/ajustes/lojas')} />
      </Secao> : null}

      <Secao titulo="Recebimentos">
        <View style={estilos.lista}>
          <TilePagamento titulo="Pix" legenda="Pela sua chave, com confirmação manual" icone="pix" fundo={cores.bg} cor={cores.ink} estado="sempre_ativo" />
          <TilePagamento titulo="Cartão" legenda="Registro manual da maquininha" icone="cartao" fundo={cores.bg} cor={cores.ink} estado="sempre_ativo" />
          <TilePagamento titulo="Dinheiro" legenda="Com calculadora de troco" icone="dinheiro" fundo={cores.bg} cor={cores.ink} estado="sempre_ativo" />
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

      {SecaoDiagnostico ? <SecaoDiagnostico /> : null}
      <Secao titulo="Ajuda">
        <LinhaLista titulo="Suporte e privacidade" subtitulo="Atendimento, termos, exportação e exclusão" onPress={() => router.push('/suporte')} />
      </Secao>

      {__DEV__ || process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE === '1' ? (
        <Secao titulo="Desenvolvimento">
          <Botao
            rotulo="Zerar dados do app"
            variante="perigo"
            tamanho="M"
            larguraTotal
            accessibilityHint="Apaga conta, assinatura e vendas deste aparelho e reinicia o app"
            onPress={async () => {
              registrar('app', 'dados do app zerados');
              await salvarAgora();
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
