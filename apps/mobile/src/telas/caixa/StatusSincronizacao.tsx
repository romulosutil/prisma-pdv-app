import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useDados, useProdutos, useSincronizacao, useVendas } from '@/dados/hooks';
import type { EntradaSync } from '@/dados/syncTipos';
import { cores, raio } from '@/tema';
import { CabecalhoCaixa } from './CabecalhoCaixa';
import { LinhaValor } from './LinhaValor';
import { exportarPendencias } from './exportarPendencias';

function motivoDaPendencia(motivo: string | null): string {
  if (motivo === 'venda_fora_da_janela_offline') return 'Venda antiga: precisa de revisão autenticada. A data e o conteúdo foram preservados.';
  if (motivo === 'recurso_plano' || motivo === 'limite_plano') return 'O recurso ou limite do plano precisa ser revisto antes do envio.';
  if (motivo === 'origem_invalida' || motivo === 'permissao_negada') return 'A origem ou permissão desta operação precisa de revisão.';
  if (motivo && ['caixa_fechada', 'caixa_desatualizado', 'fechamento_inconsistente', 'caixa_imutavel', 'movimento_imutavel'].includes(motivo)) return 'Conflito de turno: o registro local foi preservado. Confira o histórico confirmado com o responsável; correções exigem motivo e autoria. O turno não será reaberto nem sobrescrito.';
  return 'O registro está preservado neste aparelho e precisa de revisão antes de ser confirmado.';
}

export function StatusSincronizacao() {
  const dados = useDados();
  const router = useRouter();
  const toast = useToast();
  const { situacao, pendentes, rejeitadas, ultimaSincronizacaoEm, mensagem, servico } = useSincronizacao();
  const { produtos } = useProdutos();
  const { vendas, numeroDe } = useVendas();
  const [entradas, setEntradas] = useState<EntradaSync[]>([]);
  const [exportando, setExportando] = useState(false);
  const demo = situacao === 'local';
  const ocupado = situacao === 'sincronizando';
  const semSessao = situacao === 'sem_sessao' || situacao === 'reautenticacao';

  useEffect(() => {
    let atual = true;
    dados.listarPendenciasSync().then((lista) => { if (atual) setEntradas(lista); }).catch(() => { if (atual) setEntradas([]); });
    return () => { atual = false; };
  }, [dados, situacao, pendentes, rejeitadas, ultimaSincronizacaoEm, mensagem]);

  const verificar = async () => {
    try { await servico.sincronizar({ forcar: true }); }
    catch { toast.mostrar('Não foi possível sincronizar. Seus registros continuam guardados.', { tipo: 'erro' }); }
  };
  const exportar = async () => {
    setExportando(true);
    try { await exportarPendencias(await servico.exportar()); }
    catch { toast.mostrar('Não foi possível exportar agora. Os registros continuam guardados.', { tipo: 'erro' }); }
    finally { setExportando(false); }
  };
  const retentar = async () => {
    try { await servico.retentarRejeitadas(); await verificar(); }
    catch { toast.mostrar('Entre novamente na mesma conta antes de tentar os registros em revisão.', { tipo: 'erro' }); }
  };
  const titulo = demo ? 'Modo local: dados neste aparelho'
    : semSessao ? 'Entre novamente para sincronizar'
      : ocupado ? 'Sincronizando seus registros'
        : situacao === 'offline' ? 'Sem conexão com o servidor'
          : rejeitadas > 0 ? 'Há registros para revisão'
            : pendentes > 0 ? 'Há registros aguardando envio'
              : ultimaSincronizacaoEm ? 'Dados confirmados no servidor' : 'Aguardando primeira sincronização';

  return (
    <TelaBase rolavel bordas={['top']} style={estilos.tela}>
      <CabecalhoCaixa secao="sync" />
      <View style={estilos.estado}>
        <Ilustra kind={demo || situacao === 'offline' || semSessao ? 'offline' : 'check'} size={140} />
        <View accessibilityLiveRegion="polite" style={estilos.textos}>
          <Texto estilo="tituloL" accessibilityRole="header" style={estilos.centro}>{titulo}</Texto>
          <Texto estilo="corpo" cor={cores.ink2} style={estilos.centro}>
            {demo ? 'Esta demonstração não envia os dados para um servidor.'
              : semSessao ? 'Os dados locais foram preservados. Entre na mesma conta para continuar o envio e a recuperação.'
                : 'Só retiramos um registro da fila quando o servidor confirma. Registros ainda pendentes permanecem neste aparelho.'}
          </Texto>
          {mensagem && mensagem !== 'Sem conexão com o servidor.' ? <Texto estilo="legenda" cor={cores.ink2} style={estilos.centro}>{mensagem}</Texto> : null}
        </View>
      </View>
      <View style={estilos.cartao}>
        <LinhaValor rotulo="Neste aparelho" valor={<Texto estilo="corpoMedio">{`${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'} · ${vendas.length} ${vendas.length === 1 ? 'venda' : 'vendas'}`}</Texto>} />
        {!demo ? <>
          <LinhaValor rotulo="Aguardando confirmação" valor={<Texto estilo="corpoMedio">{pendentes}</Texto>} divisor />
          <LinhaValor rotulo="Preservados para revisão" valor={<Texto estilo="corpoMedio">{rejeitadas}</Texto>} divisor />
          <LinhaValor rotulo="Última sincronização concluída" valor={<Texto estilo="corpoMedio">{ultimaSincronizacaoEm ? new Date(ultimaSincronizacaoEm).toLocaleString('pt-BR') : 'Ainda não concluída'}</Texto>} divisor />
        </> : null}
      </View>
      {!demo && !semSessao ? <Botao rotulo="Sincronizar agora" icone="sincronizar" carregando={ocupado} onPress={() => void verificar()} /> : null}
      {!demo ? <Texto accessibilityRole="alert">Operações ainda não sincronizadas ficam somente neste aparelho. Sincronize antes de trocar, reinstalar ou limpar o aplicativo. O backup do Android não recupera essas pendências.</Texto> : null}
      {semSessao ? <Botao rotulo="Entrar na mesma conta" onPress={() => router.push('/entrar')} /> : null}
      {!demo && rejeitadas > 0 ? <>
        <Texto estilo="tituloM" accessibilityRole="header">Registros preservados para revisão</Texto>
        {entradas.filter((e) => e.bloqueada).map((e) => {
          const venda = e.mutacao.entidade === 'venda' ? vendas.find((v) => v.id === e.mutacao.dados.id) : undefined;
          return <View key={e.mutacao.id} style={estilos.aviso}>
            <Texto estilo="corpoMedio">{venda ? `Venda ${numeroDe(venda)}` : e.mutacao.entidade === 'produto' ? 'Alteração de produto' : 'Alteração de caixa'}</Texto>
            <Texto estilo="corpo">{motivoDaPendencia(e.motivo)}</Texto>
          </View>;
        })}
        <Texto estilo="legenda" cor={cores.ink2}>Exporte o arquivo e solicite revisão pela conta autenticada no atendimento. Não reinstale o app nem altere a data da venda. O arquivo permanece local até você escolher compartilhá-lo.</Texto>
        <Botao rotulo="Exportar pendências para revisão" variante="secundario" carregando={exportando} onPress={() => void exportar()} />
        {!semSessao ? <Botao rotulo="Conferir turnos confirmados" variante="terciario" onPress={() => router.push('/(tabs)/caixa/turnos')} /> : null}
        {!semSessao ? <Botao rotulo="Tentar novamente após revisão" variante="terciario" onPress={() => void retentar()} /> : null}
      </> : null}
      {!demo ? <Texto estilo="legenda" cor={cores.ink3}>Uma instalação recuperada recebe somente o que foi confirmado no servidor. Pendências de outro aparelho não são recuperadas automaticamente.</Texto> : null}
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 20, paddingTop: 24, paddingBottom: 32 },
  estado: { alignItems: 'center', gap: 12 },
  textos: { gap: 8 },
  centro: { textAlign: 'center' },
  cartao: { paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.surface },
  aviso: { gap: 8, padding: 16, borderRadius: raio.md, backgroundColor: cores.surface },
});
