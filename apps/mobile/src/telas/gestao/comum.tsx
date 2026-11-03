import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { Botao } from '@/componentes/Botao';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useConta, useDados } from '@/dados/hooks';
import { ErroBackend, mensagemDeErro } from '@/servicos/backend';
import { useVoltar } from '@/util/useVoltar';

export function useGestao() {
  const dados = useDados(), { sessao } = useConta();
  const [ocupado, setOcupado] = useState(false), [mensagem, setMensagem] = useState(''), [pendente, setPendente] = useState(false);
  const token = sessao?.token;
  const mesmoPerfil = useCallback(() => !!token && dados.conta.obter().sessao?.token === token, [dados, token]);
  const atualizarPendente = useCallback(async () => {
    const p = !!await dados.armazenamentoDaLoja.obter('operacaoGestaoPendente');
    if (mesmoPerfil()) setPendente(p);
  }, [dados, mesmoPerfil]);
  useEffect(() => { void atualizarPendente(); }, [atualizarPendente]);
  async function executar(tarefa: () => Promise<void>, sucesso = '') {
    if (!mesmoPerfil() || ocupado) return;
    setOcupado(true); setMensagem('');
    try { await tarefa(); if (mesmoPerfil()) setMensagem(sucesso); }
    catch (e) { if (mesmoPerfil()) setMensagem(e instanceof z.ZodError ? e.issues[0]?.message ?? 'Revise os campos.' : e instanceof ErroBackend ? mensagemDeErro(e) : e instanceof Error ? e.message : 'Não foi possível concluir.'); }
    finally { if (mesmoPerfil()) { setOcupado(false); await atualizarPendente(); } }
  }
  return { dados, token, mesmoPerfil, ocupado, mensagem, pendente, executar };
}
export type EstadoGestao = ReturnType<typeof useGestao>;
export function TelaGestao({ titulo, estado, atualizar, children }: { titulo: string; estado: EstadoGestao; atualizar: () => Promise<void>; children: ReactNode }) {
  const voltar = useVoltar('/ajustes');
  return <TelaBase rolavel bordas={['top']} style={{ gap: 16, paddingTop: 16, paddingBottom: 40 }}>
    <CabecalhoTela titulo={titulo} onVoltar={voltar} />
    <Texto estilo="corpo">Dados confirmados da loja no servidor. Operações de aparelhos offline aparecem após sincronização.</Texto>
    {estado.dados.backend.modo !== 'http' ? <Texto estilo="corpo" accessibilityRole="alert">Esta gestão requer a versão conectada.</Texto> : <Botao rotulo="Atualizar do servidor" variante="terciario" carregando={estado.ocupado} onPress={() => void estado.executar(atualizar)} />}
    {estado.mensagem ? <Texto estilo="corpo" accessibilityRole="alert" selectable>{estado.mensagem}</Texto> : null}
    {estado.pendente ? <Botao rotulo="Confirmar operação de gestão pendente" carregando={estado.ocupado} onPress={() => void estado.executar(async () => { await estado.dados.repetirOperacaoGestaoPendente(); await atualizar(); }, 'Operação confirmada.')} /> : null}
    {children}
  </TelaBase>;
}
