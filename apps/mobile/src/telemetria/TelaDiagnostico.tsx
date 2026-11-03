import { useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { Botao } from '@/componentes/Botao';
import { Texto } from '@/componentes/Texto';
import { TelaBase } from '@/componentes/TelaBase';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { useVoltar } from '@/util/useVoltar';
import { compartilharJson } from '@/telas/suporte/compartilhar';
import { exportarPiloto, salvarPiloto } from './registro';

function exportacao() {
  const c = Platform.constants as { Brand?: string; Model?: string; Release?: string };
  const campo = (v: unknown) => typeof v === 'string' && /^[a-zA-Z0-9 ._()-]{1,80}$/.test(v) ? v : null;
  return { app: { versao: Constants.expoConfig?.version, ambiente: 'homologacao' }, aparelho: { plataforma: Platform.OS, marca: campo(c?.Brand), modelo: campo(c?.Model), sistema: campo(c?.Release ?? String(Platform.Version)) }, ...exportarPiloto() };
}
export default function TelaDiagnostico() {
  const voltar = useVoltar('/');
  const [resumo, setResumo] = useState(exportacao);
  const [aviso, setAviso] = useState(''), [ocupado, setOcupado] = useState(false);
  async function executar(tipo: 'copiar' | 'arquivo' | 'atualizar') {
    setOcupado(true); setAviso('');
    try {
      await salvarPiloto(); const atual = exportacao(); setResumo(atual);
      if (tipo === 'copiar') { await Clipboard.setStringAsync(JSON.stringify(atual)); setAviso('Diagnóstico copiado. Cole nesta conversa para investigação.'); }
      if (tipo === 'arquivo') { await compartilharJson('pdv-diagnostico-homologacao.json', JSON.stringify(atual, null, 2), 'Exportar diagnóstico do teste'); setAviso('Diagnóstico entregue ao compartilhamento.'); }
    } catch { setAviso('Não foi possível exportar. Tente copiar o diagnóstico. Seus dados comerciais permanecem preservados.'); }
    finally { setOcupado(false); }
  }
  return <TelaBase rolavel style={{ gap: 16 }}>
    <CabecalhoTela titulo="Diagnóstico do teste" onVoltar={voltar} />
    <Texto>Ativo nesta versão de homologação. Guarda os últimos 500 eventos de navegação, ações, erros JavaScript, consultas e sincronização neste aparelho. O envio acontece quando você copia ou exporta.</Texto>
    <Texto>Não grava a tela, CPF, e-mail, códigos de acesso, nomes de clientes, textos digitados ou corpos de requisições. Falhas nativas ou um encerramento abrupto podem não deixar registro.</Texto>
    <Texto selectable>Execução: {resumo.execucao ?? 'iniciando'}</Texto>
    <Texto>{resumo.eventos?.length ?? 0} eventos disponíveis · versão {resumo.app.versao}</Texto>
    {resumo.persistenciaPendente ? <Texto accessibilityRole="alert">Há eventos apenas na memória. Copie ou exporte antes de fechar o aplicativo.</Texto> : null}
    {aviso ? <Texto accessibilityRole="alert">{aviso}</Texto> : null}
    <Botao rotulo="Copiar histórico do teste" desabilitado={ocupado} onPress={() => void executar('copiar')} />
    <Botao rotulo="Exportar histórico do teste" variante="secundario" desabilitado={ocupado} onPress={() => void executar('arquivo')} />
    <Botao rotulo="Atualizar histórico" variante="terciario" desabilitado={ocupado} onPress={() => void executar('atualizar')} />
    {resumo.eventos?.slice(-12).reverse().map((e, i) => <Texto key={`${e.execucao}-${e.em}-${i}`} selectable>{e.em} · {e.tipo} · {JSON.stringify(e.campos)}</Texto>)}
  </TelaBase>;
}
