import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import { POLITICAS_PILOTO, VERSAO_POLITICAS, type SolicitacaoSuporte } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Interruptor } from '@/componentes/Interruptor';
import { Segmentado } from '@/componentes/Segmentado';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { useConta, useDados, useSincronizacao } from '@/dados/hooks';
import { useVoltar } from '@/util/useVoltar';
import { compartilharJson } from './compartilhar';

export function Suporte() {
  const dados = useDados(), { sessao } = useConta(), sync = useSincronizacao();
  const voltar = useVoltar('/'), router = useRouter();
  const [tipo, setTipo] = useState<'suporte' | 'exclusao'>('suporte');
  const [mensagem, setMensagem] = useState(''), [diagnostico, setDiagnostico] = useState(false);
  const [lista, setLista] = useState<SolicitacaoSuporte[]>([]), [pendente, setPendente] = useState(false);
  const [aviso, setAviso] = useState(''), [ocupado, setOcupado] = useState(false);
  const conectado = dados.backend.modo === 'http' && !!sessao;
  async function atualizar() {
    const token = sessao?.token, operadorId = sessao?.operadorId;
    const mesmoPerfil = () => dados.conta.obter().sessao?.token === token && dados.conta.obter().sessao?.operadorId === operadorId;
    const pendencia = await dados.suporte.pendente();
    if (!mesmoPerfil()) return;
    setPendente(!!pendencia);
    if (conectado && dados.backend.listarSolicitacoesSuporte) {
      const protocolos = await dados.backend.listarSolicitacoesSuporte(token);
      if (mesmoPerfil()) setLista(protocolos);
    }
  }
  useEffect(() => {
    setLista([]); setPendente(false); setMensagem(''); setDiagnostico(false); setAviso('');
    let ativo = true;
    void atualizar().catch(() => { if (ativo) setAviso('Não foi possível consultar o atendimento. Tente atualizar quando estiver conectado.'); });
    return () => { ativo = false; };
  }, [sessao?.token, sessao?.operadorId]);
  async function executar(acao: () => Promise<void>) {
    setOcupado(true); setAviso('');
    try { await acao(); } catch { setAviso('Não foi possível concluir. Sua solicitação pendente foi preservada, se já foi gravada. Confira a conexão e atualize o atendimento.'); }
    finally {
      setOcupado(false);
      try { setPendente(!!await dados.suporte.pendente()); }
      catch { setAviso('Não foi possível ler a solicitação local. Preserve os dados do app e tente novamente após liberar espaço.'); }
    }
  }
  return <TelaBase rolavel bordas={['top']} style={{ gap: 20, paddingVertical: 24 }}>
    <CabecalhoTela titulo="Suporte e privacidade" onVoltar={voltar} />
    <Texto>Políticas do piloto · versão {VERSAO_POLITICAS}</Texto>
    {POLITICAS_PILOTO.map(p => <View key={p.titulo} style={{ gap: 8 }}><Texto estilo="tituloM" accessibilityRole="header">{p.titulo}</Texto><Texto>{p.texto}</Texto></View>)}
    <Texto estilo="tituloM" accessibilityRole="header">Atendimento pessoal</Texto>
    <Texto>As solicitações pertencem ao seu acesso nesta loja. O dono e outros operadores não recebem suas mensagens. A equipe de suporte autorizada consulta o protocolo e registra a resposta. O app não envia arquivos automaticamente.</Texto>
    {aviso ? <Texto accessibilityRole="alert">{aviso}</Texto> : null}
    {!conectado ? <><Texto>Entre na conta conectada para enviar solicitações e consultar protocolos.</Texto><Botao rotulo="Entrar para falar com suporte" onPress={() => router.push('/entrar')} /></> : <>
      <Segmentado rotuloGrupo="Tipo de solicitação" valor={tipo} onChange={setTipo} opcoes={[{ valor: 'suporte', rotulo: 'Suporte' }, { valor: 'exclusao', rotulo: 'Exclusão' }]} />
      {tipo === 'exclusao' ? <Texto accessibilityRole="alert">Este pedido será analisado pela equipe. Seus dados e vínculos permanecem preservados; exclusão não acontece ao tocar em enviar.</Texto> : null}
      <Campo rotulo="Descreva o problema ou o pedido" value={mensagem} onChangeText={setMensagem} maxLength={2000} />
      <Interruptor rotulo="Incluir resumo técnico sem credenciais" ligado={diagnostico} onChange={setDiagnostico} />
      <Texto>O resumo inclui versão, ambiente, plataforma, contagens de pendências e última sincronização. Revise a mensagem; não inclua códigos de acesso nem dados de clientes.</Texto>
      {pendente ? <><Texto>Há uma solicitação sem confirmação. Reenvie para obter o mesmo protocolo.</Texto><Botao rotulo="Confirmar solicitação pendente" desabilitado={ocupado} onPress={() => void executar(async () => { await dados.suporte.enviar(); await atualizar(); })} /></> : <Botao rotulo={tipo === 'exclusao' ? 'Enviar pedido de análise de exclusão' : 'Enviar solicitação de suporte'} desabilitado={ocupado || mensagem.trim().length < 10} onPress={() => void executar(async () => {
        await dados.suporte.enviar({ tipo, mensagem, diagnostico: diagnostico ? { versao: Constants.expoConfig?.version ?? 'desconhecida', ambiente: Constants.expoConfig?.extra?.ambiente ?? 'homologacao', plataforma: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'web' ? 'web' : 'android', pendentes: sync.pendentes, rejeitadas: sync.rejeitadas, ultimaSincronizacaoEm: sync.ultimaSincronizacaoEm } : null });
        setMensagem(''); await atualizar(); setAviso('Solicitação registrada. Acompanhe a resposta pelo protocolo abaixo.');
      })} />}
      <Botao rotulo="Atualizar atendimento" variante="secundario" desabilitado={ocupado} onPress={() => void executar(atualizar)} />
      {lista.map(s => <View key={s.id} style={{ gap: 8 }}><Texto estilo="corpoMedio">{s.tipo === 'exclusao' ? 'Exclusão' : 'Suporte'} · {s.estado}</Texto><Texto selectable>Protocolo: {s.id}</Texto><Texto>{s.mensagem}</Texto><Texto>{s.resposta ?? 'Aguardando análise da equipe.'}</Texto></View>)}
      <Botao rotulo="Exportar dados confirmados desta loja" variante="secundario" desabilitado={ocupado} onPress={() => void executar(async () => {
        const token = sessao!.token;
        if (!dados.backend.exportarDadosSuporte) throw new Error('Indisponível');
        const arquivo = await dados.backend.exportarDadosSuporte(token);
        if (dados.conta.obter().sessao?.token !== token) throw new Error('Perfil alterado');
        await compartilharJson('pdv-dados-confirmados.json', JSON.stringify(arquivo, null, 2));
        setAviso('Arquivo entregue ao compartilhamento. Escolha somente um destinatário autorizado.');
      })} />
      <Texto>A exportação contém dados comerciais e pessoais autorizados do perfil na loja selecionada. Use também Relatórios e CSV para consultar outras lojas permitidas. Pendências não estão neste arquivo.</Texto>
    </>}
    <Botao rotulo="Consultar sincronização e exportar pendências" variante="terciario" onPress={() => router.push('/(tabs)/caixa/sync')} />
  </TelaBase>;
}
