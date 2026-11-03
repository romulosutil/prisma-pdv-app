import { useEffect } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import type { Dados } from '@/dados/dados';
import { ArmazenamentoAsync } from '@/dados/armazenamento';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { criarFonteDeContexto } from './contexto';
import { definirFonteDeContexto, definirFonteDePerfil, definirRotaAtual, iniciarRegistro, registrar, salvarAgora } from './registro';

type Argumentos = readonly unknown[];

interface GerenciadorDeErros {
  getGlobalHandler?: () => ((erro: unknown, fatal?: boolean) => void) | undefined;
  setGlobalHandler?: (tratador: (erro: unknown, fatal?: boolean) => void) => void;
}

let instalado = false;

function formatar(argumentos: Argumentos): { mensagem: string; erro: Error | null } {
  const erro = argumentos.find((a): a is Error => a instanceof Error) ?? null;
  const mensagem = argumentos
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      try {
        return JSON.stringify(a) ?? String(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
  return { mensagem, erro };
}

function capturarConsole(): void {
  const original = { error: console.error, warn: console.warn };
  console.error = (...argumentos: unknown[]) => {
    const { mensagem, erro } = formatar(argumentos);
    registrar('erro', mensagem, erro ? { stack: erro.stack } : undefined);
    original.error.apply(console, argumentos);
  };
  console.warn = (...argumentos: unknown[]) => {
    registrar('aviso', formatar(argumentos).mensagem);
    original.warn.apply(console, argumentos);
  };
}

function capturarErrosNaoTratados(): void {
  const global = globalThis as unknown as { ErrorUtils?: GerenciadorDeErros };
  const gerenciador = global.ErrorUtils;
  if (gerenciador?.setGlobalHandler) {
    const anterior = gerenciador.getGlobalHandler?.();
    gerenciador.setGlobalHandler((erro, fatal) => {
      const e = erro instanceof Error ? erro : new Error(String(erro));
      registrar('erro', `${fatal ? 'Erro fatal' : 'Erro não tratado'}: ${e.message}`, { fatal: Boolean(fatal), name: e.name, stack: e.stack });
      void salvarAgora();
      anterior?.(erro, fatal);
    });
  }
  // No React Native (Hermes) a promessa rejeitada sem tratamento já sai como `console.warn`, capturado acima;
  // na web há o evento do navegador.
  const alvo = globalThis as unknown as { addEventListener?: (tipo: string, ouvinte: (e: { reason?: unknown }) => void) => void };
  alvo.addEventListener?.('unhandledrejection', (evento) => {
    const motivo = evento.reason;
    registrar('erro', `Promessa rejeitada sem tratamento: ${motivo instanceof Error ? motivo.message : String(motivo)}`, {
      stack: motivo instanceof Error ? motivo.stack : undefined,
    });
  });
}

function capturarEstadoDoApp(): void {
  registrar('app', 'app aberto', { estado: AppState.currentState });
  AppState.addEventListener('change', (estado) => {
    registrar('app', estado === 'active' ? 'app em primeiro plano' : 'app em segundo plano', { estado });
    if (estado !== 'active') void salvarAgora();
  });
}

/**
 * Instala a captura automática (console, erros JS, promessas, estado do app) e liga a persistência.
 * Chamar uma vez, no módulo do layout raiz. Sem `FERRAMENTAS_TESTE` não faz nada.
 */
export function instalarDiagnostico(dados: Dados): void {
  if (!FERRAMENTAS_TESTE || instalado) return;
  instalado = true;
  definirFonteDeContexto(criarFonteDeContexto(dados));
  definirFonteDePerfil(() => {
    const i = dados.conta.obter().identidade;
    return i ? JSON.stringify([i.contaId, i.lojaId, i.operadorId]) : null;
  });
  capturarConsole();
  capturarErrosNaoTratados();
  capturarEstadoDoApp();
  void iniciarRegistro(new ArmazenamentoAsync());
}

/** Registra cada mudança de rota (e guarda a atual para a exportação). Usar dentro do layout raiz. */
export function useDiagnosticoDeNavegacao(): void {
  const rota = usePathname();
  useEffect(() => {
    if (!FERRAMENTAS_TESTE) return;
    definirRotaAtual(rota);
    registrar('navegacao', rota);
  }, [rota]);
}
