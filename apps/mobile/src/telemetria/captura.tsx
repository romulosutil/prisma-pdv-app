import { useEffect } from 'react';
import { AppState } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Botao } from '@/componentes/Botao';
import { ArmazenamentoAsync } from '@/dados/armazenamento';
import type { Dados } from '@/dados/dados';
import { novoId } from '@/util/ids';
import { camposErro, RegistroPiloto, rotaSegura, type CamposEvento } from './nucleo';
import { definirRegistro, registrarPiloto, salvarPiloto } from './registro';

let instalado = false;
export function instalarPiloto(dados: Dados): void {
  if (process.env.EXPO_PUBLIC_AMBIENTE !== 'homologacao' || instalado) return;
  instalado = true;
  const registro = new RegistroPiloto(novoId()); definirRegistro(registro);
  void registro.iniciar(new ArmazenamentoAsync(), () => dados.armazenamentoDaLoja.obterEscopo());
  registrarPiloto('app', { etapa: 'inicio' });
  const erro = console.error, aviso = console.warn;
  console.error = (...args: unknown[]) => { registrarPiloto('erro', { ...camposErro(args.find(a => a instanceof Error)), erro: 'console_error' }); erro.apply(console, args); };
  console.warn = (...args: unknown[]) => { registrarPiloto('erro', { erro: 'console_warn' }); aviso.apply(console, args); };
  const global = globalThis as unknown as { ErrorUtils?: { getGlobalHandler?: () => ((e: unknown, fatal?: boolean) => void) | undefined; setGlobalHandler?: (h: (e: unknown, fatal?: boolean) => void) => void }; addEventListener?: (tipo: string, h: (e: { reason?: unknown }) => void) => void };
  const anterior = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((e, fatal) => { registrarPiloto('erro', camposErro(e)); void salvarPiloto(); anterior?.(e, fatal); });
  global.addEventListener?.('unhandledrejection', e => registrarPiloto('erro', { ...camposErro(e.reason), erro: 'promessa' }));
  AppState.addEventListener('change', estado => { registrarPiloto('app', { etapa: ['active', 'inactive', 'background'].includes(estado) ? estado as CamposEvento['etapa'] : 'desconhecido' }); if (estado !== 'active') void salvarPiloto(); });
  dados.sincronizacao.assinar(() => {
    const s = dados.sincronizacao.obter(); registrarPiloto('sincronizacao', { situacao: s.situacao, pendentes: s.pendentes, rejeitadas: s.rejeitadas });
  });
  dados.conta.transicao.assinar(() => registrarPiloto('transicao', { bloqueado: dados.conta.transicao.obter(), segundoPlano: dados.conta.atualizacaoEmSegundoPlano.obter() }));
}
export function IndicadorPiloto() {
  const rota = usePathname(), router = useRouter();
  useEffect(() => { registrarPiloto('navegacao', { rota: rotaSegura(rota) }); }, [rota]);
  return <Botao rotulo="Diagnóstico do teste ativo · Abrir" variante="terciario" tamanho="S" onPress={() => router.push('/diagnostico' as Href)} />;
}
export async function copiarHistoricoPiloto(): Promise<void> { await salvarPiloto(); const { exportarPiloto } = await import('./registro'); await Clipboard.setStringAsync(JSON.stringify(exportarPiloto())); }
