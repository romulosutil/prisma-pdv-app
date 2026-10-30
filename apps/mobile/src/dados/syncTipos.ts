import type { Mutacao, SyncPullRes } from '@pdv/shared';

export interface EntradaSync {
  mutacao: Mutacao;
  tentativas: number;
  proximaTentativaEm: string | null;
  motivo: string | null;
  bloqueada: boolean;
}

export interface EstadoRepositorioSync {
  entradas: EntradaSync[];
  cursor: string;
  ultimaSincronizacaoEm: string | null;
}

/** Implementações capturam conta/loja; cursor, pendências e aplicação são duráveis. */
export interface RepositorioSync {
  preparar(): Promise<void>;
  estado(): Promise<EstadoRepositorioSync>;
  confirmar(ids: readonly string[]): Promise<void>;
  adiar(ids: readonly string[], motivo: string, proximaTentativaEm: string): Promise<void>;
  rejeitar(rejeitadas: readonly { id: string; motivo: string }[]): Promise<void>;
  aplicarPagina(pagina: SyncPullRes): Promise<void>;
  finalizar(em: string): Promise<void>;
  /** Reabre a tentativa, sem mudar ID, conteúdo ou data da operação original. */
  retentarRejeitadas(): Promise<void>;
  /** JSON local para revisão; nunca contém token/sessão/credencial. */
  exportar(): Promise<string>;
}
