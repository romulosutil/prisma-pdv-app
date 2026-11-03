import type { Sessao } from '@pdv/shared';
import type { Armazenamento } from './armazenamento';
import { Observavel, Persistido } from './observavel';
import { CONTA_VAZIA, normalizarEstadoConta, type EstadoConta, type Perfil } from './estadoConta';
export type { EstadoConta, Perfil } from './estadoConta';

export const NOME_APARELHO_PADRAO = 'Celular do balcão';

class TransicaoConta extends Observavel<boolean> {
  constructor() { super(false); }
  alterar(valor: boolean) { this.definir(valor); }
}

/** Conta deste aparelho: a sessão (com o token Bearer) e os dados exibidos nas telas. */
export class ContaRepo extends Persistido<EstadoConta> {
  readonly transicao = new TransicaoConta();
  /** Mantém a trava de escrita da sync sem cobrir a tela com o carregamento de troca de usuário. */
  readonly atualizacaoEmSegundoPlano = new TransicaoConta();
  constructor(private readonly baseConta: Armazenamento) {
    super(baseConta, 'conta', CONTA_VAZIA);
  }

  protected validarCarregado(valor: EstadoConta): EstadoConta { return normalizarEstadoConta(valor); }

  async registrar(sessao: Sessao, perfil: Perfil): Promise<void> {
    await this.modificar(() => normalizarEstadoConta({ sessao, perfil, reautenticacaoNecessaria: false }));
  }

  /** Um 401 atrasado não pode retirar a credencial recebida por um login mais recente. */
  async invalidarSessao(tokenUsado?: string): Promise<void> {
    const tokenRejeitado = tokenUsado ?? this.obter().sessao?.token;
    const negar = (atual: EstadoConta): EstadoConta => {
      if (!atual.sessao || !tokenRejeitado || tokenRejeitado !== atual.sessao.token) return atual;
      return { ...atual, sessao: null, reautenticacaoNecessaria: atual.identidade !== null };
    };
    try { await this.modificar(negar); }
    catch {
      // Negar acesso em memória é obrigatório mesmo se o disco falhar ao retirar uma credencial rejeitada.
      // A identidade financeira permanece; a próxima carga exigirá autenticação/novo 401.
      this.definir(negar(this.obter()));
      if (tokenRejeitado) await this.baseConta.retirarCredencial?.(tokenRejeitado).catch(() => undefined);
      throw new Error('Não foi possível atualizar a credencial local. Entre novamente sem apagar os dados.');
    }
  }
}
