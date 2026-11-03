import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { formatarBRL, ROTULOS_MOVIMENTO, type PainelCaixas } from '@pdv/shared';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Confirmacao } from '@/componentes/Confirmacao';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { Segmentado } from '@/componentes/Segmentado';
import { useConta, useDados } from '@/dados/hooks';
import { mensagemDeErro } from '@/servicos/backend';
import { useVoltar } from '@/util/useVoltar';

const ACOES = [{ valor: 'movimento', rotulo: 'Movimento' }, { valor: 'receber', rotulo: 'Receber' }, { valor: 'enviar', rotulo: 'Enviar' }] as const;
const TIPOS = [{ valor: 'suprimento', rotulo: 'Entrada' }, { valor: 'sangria', rotulo: 'Sangria' }, { valor: 'retirada', rotulo: 'Retirada' }, { valor: 'devolucao', rotulo: 'Devolução' }, { valor: 'correcao_entrada', rotulo: 'Correção +' }, { valor: 'correcao_saida', rotulo: 'Correção −' }] as const;

export function TurnosCaixa() {
  const dados = useDados(), { identidade, sessao } = useConta(), voltar = useVoltar('/caixa');
  const [linhas, setLinhas] = useState<PainelCaixas>([]), [selecionado, selecionar] = useState('');
  const [acao, setAcao] = useState<typeof ACOES[number]['valor']>('movimento');
  const [tipo, setTipo] = useState<typeof TIPOS[number]['valor']>('retirada');
  const [valor, setValor] = useState(''), [motivo, setMotivo] = useState(''), [categoria, setCategoria] = useState('despesa'), [destino, setDestino] = useState(''), [originalId, setOriginalId] = useState('');
  const [origemId, setOrigemId] = useState(''), [autorizacaoId, setAutorizacaoId] = useState('');
  const [ocupado, setOcupado] = useState(false), [mensagem, setMensagem] = useState(''), [confirmarTroca, setConfirmarTroca] = useState(false);
  const [pendente, setPendente] = useState(false);
  const atualizar = useCallback(async () => {
    if (!dados.backend.listarCaixas || !sessao) return;
    try {
      const lista = await dados.backend.listarCaixas(sessao.token);
      if (dados.conta.obter().sessao?.token !== sessao.token) return;
      setLinhas(lista);
      setPendente(!!await dados.armazenamentoDaLoja.obter('operacaoCaixaPendente'));
    } catch (e) { setMensagem(mensagemDeErro(e)); }
  }, [dados, sessao?.token]);
  useEffect(() => { void atualizar(); }, [atualizar]);
  const linha = linhas.find(l => l.caixa.id === selecionado);
  const caixa = linha?.caixa;
  const executar = async (op: string, p: Record<string, unknown>) => {
    setOcupado(true); setMensagem('');
    try {
      const r = await dados.operacaoCaixaOnline(op, p) as { id?: string; expiraEm?: string };
      setMensagem(op === 'autorizar_transferencia' ? `Autorização: ${r.id}. Válida por 5 minutos. Entregue este identificador ao responsável pela origem para confirmar a transferência.` : 'Operação confirmada no servidor.');
      if (op === 'autorizar_transferencia' && r.id) await Clipboard.setStringAsync(r.id);
    } catch (e) { setMensagem(mensagemDeErro(e)); }
    finally { setOcupado(false); await atualizar(); }
  };
  const movimentar = () => executar('movimento', { caixaId: selecionado, tipo, valorCentavos: Math.round(Number(valor.replace(',', '.')) * 100), motivo, categoria, destino, ...(tipo.startsWith('correcao_') ? { originalId } : {}) });
  const proprio = caixa?.operadorId === identidade?.operadorId;

  return <TelaBase rolavel bordas={['top']} style={{ gap: 16, paddingTop: 16, paddingBottom: 32 }}>
    <CabecalhoTela titulo={dados.pode('conferir_caixas') ? 'Caixas da loja' : 'Meus turnos'} onVoltar={voltar} />
    <Texto estilo="corpo">Valores confirmados no servidor. Operações offline de outros aparelhos só aparecem após sincronização.</Texto>
    <Botao rotulo="Atualizar do servidor" variante="terciario" onPress={() => void atualizar()} desabilitado={ocupado} />
    {mensagem ? <Texto estilo="corpo" accessibilityRole="alert" selectable>{mensagem}</Texto> : null}
    {pendente ? <Botao rotulo="Repetir operação online pendente" carregando={ocupado} onPress={async () => { setOcupado(true); try { const r = await dados.repetirOperacaoCaixaPendente() as { id?: string }; setMensagem(`Operação confirmada: ${r?.id ?? ''}`); } catch (e) { setMensagem(mensagemDeErro(e)); } finally { setOcupado(false); await atualizar(); } }} /> : null}
    {linhas.map(l => <View key={l.caixa.id} style={{ gap: 8, paddingVertical: 12 }}>
      <Texto estilo="tituloM">{`${l.nomeOperador} · ${l.caixa.fechamento ? 'Encerrado' : 'Aberto'}${selecionado === l.caixa.id ? ' · Selecionado' : ''}`}</Texto>
      <Texto estilo="corpo">{`Esperado: ${formatarBRL(l.saldoCentavos)}${l.caixa.fechamento ? ` · Contado: ${formatarBRL(l.caixa.fechamento.contadoCentavos)} · Diferença: ${formatarBRL(l.caixa.fechamento.contadoCentavos - l.caixa.fechamento.esperadoCentavos)}` : ''}`}</Texto>
      <Texto estilo="legenda" selectable>{`Turno: ${l.caixa.id}`}</Texto>
      {!l.caixa.versaoContrato ? <Texto estilo="legenda">Histórico legado: autoria adicional não comprovada permanece sem atribuição.</Texto> : null}
      <Botao rotulo={`Selecionar turno de ${l.nomeOperador}`} tamanho="M" variante="terciario" onPress={() => selecionar(l.caixa.id)} desabilitado={ocupado} />
    </View>)}
    {linha && caixa ? <View style={{ gap: 12 }}>
      <Texto estilo="tituloM">{`Turno de ${linha.nomeOperador}`}</Texto>
      <Botao rotulo="Copiar identificador do turno" variante="terciario" onPress={() => void Clipboard.setStringAsync(caixa.id)} />
      {caixa.movimentos.map(m => <Texto key={m.id} estilo="corpo" selectable>{`${ROTULOS_MOVIMENTO[m.tipo]} · ${formatarBRL(m.valorCentavos)} · ${m.categoria ?? 'Legado'} · ${m.destino ?? ''} · ${m.motivo ?? ''}\nEvento: ${m.id}\nAutor: ${m.autorOperadorId ?? 'Não comprovado no legado'} · Responsável: ${m.responsavelOperadorId ?? caixa.operadorId}${m.aprovadorId ? ` · Aprovador: ${m.aprovadorId}` : ''}${m.originalId ? ` · Original: ${m.originalId}` : ''}`}</Texto>)}
      {linha.auditoria.map(a => <Texto key={a.id} estilo="legenda">{`${a.tipo} · ${a.em} · Autor: ${a.autorOperadorId} · ${String(a.dados.motivo ?? '')}`}</Texto>)}
      {caixa.fechamento ? <>
        <Texto estilo="corpo">{`Recolhido: ${formatarBRL(caixa.fechamento.recolhidoCentavos ?? 0)} · Troco preservado: ${formatarBRL(caixa.fechamento.trocoRestanteCentavos ?? 0)}`}</Texto>
        {dados.pode('conferir_caixas') ? <><Campo rotulo="Motivo da conferência" value={motivo} onChangeText={setMotivo} maxLength={500} /><Botao rotulo="Registrar conferência" carregando={ocupado} onPress={() => void executar('conferir', { caixaId: caixa.id, motivo })} /></> : null}
      </> : <>
        <Segmentado rotuloGrupo="Operação de caixa" opcoes={ACOES} valor={acao} onChange={setAcao} />
        {acao !== 'enviar' ? <><Campo rotulo="Valor (R$)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" /><Campo rotulo="Motivo" value={motivo} onChangeText={setMotivo} maxLength={500} /></> : null}
        {acao === 'movimento' ? <>
          <View style={{ gap: 8 }}>
            {TIPOS.map(t => <Botao key={t.valor} rotulo={`${t.valor === tipo ? '✓ ' : ''}${t.rotulo}`} variante="terciario" tamanho="M" onPress={() => setTipo(t.valor)} desabilitado={ocupado} />)}
          </View>
          <Campo rotulo="Categoria" value={categoria} onChangeText={setCategoria} maxLength={100} />
          <Campo rotulo="Origem/destino e responsável pelo recebimento" value={destino} onChangeText={setDestino} maxLength={150} />
          {tipo.startsWith('correcao_') ? <Campo rotulo="Identificador do evento original" value={originalId} onChangeText={setOriginalId} /> : null}
          <Texto estilo="corpo">{proprio ? 'Saídas exigem permissão de retirada. Correções exigem permissão de conferência.' : 'Intervenção autorizada pelo seu vínculo. O movimento identifica você e o responsável pelo turno.'}</Texto>
          <Botao rotulo="Registrar movimento online" carregando={ocupado} onPress={() => void movimentar()} />
        </> : null}
        {acao === 'receber' && proprio ? <><Campo rotulo="Identificador do turno de origem" value={origemId} onChangeText={setOrigemId} /><Texto estilo="corpo">Autorize o recebimento antes da movimentação física. O responsável pela origem confirma a saída; débito e crédito são registrados juntos.</Texto><Botao rotulo="Autorizar recebimento por 5 minutos" carregando={ocupado} onPress={() => void executar('autorizar_transferencia', { origemId, destinoId: caixa.id, valorCentavos: Math.round(Number(valor.replace(',', '.')) * 100), motivo })} /></> : null}
        {acao === 'enviar' && proprio ? <><Campo rotulo="Autorização emitida pelo destinatário" value={autorizacaoId} onChangeText={setAutorizacaoId} /><Botao rotulo="Confirmar transferência" carregando={ocupado} onPress={() => void executar('transferir', { autorizacaoId })} /></> : null}
        {proprio && (caixa.aparelhoAtualId ?? caixa.aparelhoId) !== identidade?.aparelhoId ? <>
          <Campo rotulo="Motivo da troca de aparelho" value={motivo} onChangeText={setMotivo} maxLength={500} />
          <Botao rotulo="Retomar turno neste aparelho" onPress={() => setConfirmarTroca(true)} />
          <Confirmacao visivel={confirmarTroca} onFechar={() => setConfirmarTroca(false)} titulo="Transferir o turno para este aparelho?" texto="Sincronize e pare de usar o aparelho anterior antes de continuar. Pendências que permanecerem nele serão bloqueadas e precisarão de recuperação. A origem histórica fica preservada." rotuloConfirmar="Confirmei a sincronização anterior" onConfirmar={() => { setConfirmarTroca(false); void executar('aparelho', { caixaId: caixa.id, dados: { aparelhoAnteriorId: caixa.aparelhoAtualId ?? caixa.aparelhoId, motivo, confirmarSincronizacaoAnterior: true } }); }} />
        </> : null}
      </>}
    </View> : null}
  </TelaBase>;
}
