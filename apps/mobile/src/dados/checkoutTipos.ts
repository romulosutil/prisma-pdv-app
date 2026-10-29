import type { Venda } from '@pdv/shared';
import type { EstadoCarrinho } from './carrinho';

/** Identidade fixada na abertura, preservada ao retomar o checkout. */
export interface RegistroCheckout {
  vendaId: string;
  criadaEm: string;
  caixaId: string | null;
  estado: EstadoCarrinho;
}

export interface PersistenciaCheckout {
  carregar(): Promise<RegistroCheckout | null>;
  salvar(registro: RegistroCheckout | null): Promise<void>;
  /** Lê o rascunho confirmado em disco; venda, outbox e conclusão compartilham um commit. */
  concluir(): Promise<Venda>;
}
