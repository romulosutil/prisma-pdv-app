import type { Sessao } from '@pdv/shared';
import type { Armazenamento } from './armazenamento';
import { Persistido } from './observavel';

export interface Perfil {
  nomeResponsavel: string;
  nomeLoja: string;
  /** Tipo de comércio escolhido no cadastro (Mercadinho, Padaria...). */
  tipoLoja?: string;
  email: string;
  aparelhoNome: string;
}

export interface EstadoConta {
  sessao: Sessao | null;
  perfil: Perfil | null;
}

export const NOME_APARELHO_PADRAO = 'Celular do balcão';

/** Conta deste aparelho: a sessão (com o token Bearer) e os dados exibidos nas telas. */
export class ContaRepo extends Persistido<EstadoConta> {
  constructor(armazenamento: Armazenamento) {
    super(armazenamento, 'conta', { sessao: null, perfil: null });
  }

  async registrar(sessao: Sessao, perfil: Perfil): Promise<void> {
    await this.modificar(() => ({ sessao, perfil }));
  }
}
