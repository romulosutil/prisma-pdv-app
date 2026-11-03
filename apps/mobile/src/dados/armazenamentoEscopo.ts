import type { Armazenamento } from './armazenamento';
import { escopoDoPerfil, type IdentidadeLocal } from './estadoConta';

const METADATA = new Set(['assinatura', 'preferencias', 'atalhos_ordem', 'chavePix', 'catalogo_ean_cache', 'aberturaCaixaPendente', 'operacaoCaixaPendente', 'operacaoGestaoPendente', 'suporte_pendente']);
const FINANCEIROS = new Set(['produtos', 'caixas', 'vendas']);
const DONO_LEGADO = 'proprietario_metadata_v1';

/** Isola metadata por conta/loja. SQLite já particiona seus agregados financeiros. */
export class ArmazenamentoEscopo implements Armazenamento {
  private bloqueado = false;
  constructor(private readonly base: Armazenamento, private readonly identidade: () => IdentidadeLocal | null, private readonly financeiroSqlite: boolean, private readonly antesDeGravar?: (chave: string) => Promise<void>) {}

  readonly obterEscopo = (): string | null => {
    const i = this.identidade();
    return i ? escopoDoPerfil(i) : null;
  };
  bloquearAlteracoes(valor: boolean): void { this.bloqueado = valor; }
  readonly podeAlterar = (): boolean => !this.bloqueado;

  private particionada(chave: string): boolean { return METADATA.has(chave) || (!this.financeiroSqlite && FINANCEIROS.has(chave)); }
  private endereco(chave: string): { chave: string; escopo: string } | null {
    const i = this.identidade();
    if (chave === 'suporte_pendente') return i ? { chave: `conta:${JSON.stringify([i.contaId, i.lojaId, i.operadorId])}:${chave}`, escopo: this.obterEscopo()! } : null;
    const escopo = i && ['chavePix', 'catalogo_ean_cache'].includes(chave) ? JSON.stringify([i.contaId, i.lojaId]) : this.obterEscopo();
    return escopo ? { chave: `conta:${escopo}:${chave}`, escopo } : null;
  }

  async obter<T>(chave: string): Promise<T | null> {
    if (!this.particionada(chave)) return this.base.obter<T>(chave);
    const alvo = this.endereco(chave);
    if (!alvo) return null;
    const salvo = await this.base.obter<T>(alvo.chave);
    if (chave === 'suporte_pendente') return salvo;
    if (salvo !== null) return salvo;
    const marcador = `${alvo.chave}:migrada`;
    if (await this.base.obter(marcador)) return null;
    let dono = await this.base.obter<string>(DONO_LEGADO);
    if (dono === null && (!this.identidade()?.papel || this.identidade()?.papel === 'dono')) { await this.base.gravar(DONO_LEGADO, alvo.escopo); dono = alvo.escopo; }
    if (dono !== alvo.escopo) { await this.base.gravar(marcador, true); return null; }
    const legado = await this.base.obter<T>(chave);
    if (legado !== null) {
      // Licença legada tem identidade própria. Nunca importar a de outra conta.
      if (chave === 'assinatura') {
        const contaId = (legado as { assinatura?: { contaId?: unknown } }).assinatura?.contaId;
        if (contaId !== this.identidade()?.contaId || this.obterEscopo() !== alvo.escopo) throw new Error('Licença local pertence a outra conta. Preserve os dados para recuperação.');
      }
      await this.base.gravar(alvo.chave, legado);
      if (JSON.stringify(await this.base.obter(alvo.chave)) !== JSON.stringify(legado)) throw new Error('Migração de dados da conta não confirmada. Preserve a origem.');
    }
    await this.base.gravar(marcador, true);
    return legado;
  }

  async gravar<T>(chave: string, valor: T): Promise<void> {
    if (this.bloqueado) throw new Error('Aguarde a troca de conta antes de alterar os dados.');
    const alvo = this.particionada(chave) ? this.endereco(chave) : null;
    await this.antesDeGravar?.(chave);
    if (!this.particionada(chave)) return this.base.gravar(chave, valor);
    if (alvo?.chave !== this.endereco(chave)?.chave) throw new Error('O perfil mudou antes da gravação.');
    if (!alvo) throw new Error('Identifique a conta antes de guardar dados da loja.');
    await this.base.gravar(alvo.chave, valor);
    await this.base.gravar(`${alvo.chave}:migrada`, true);
  }

  async remover(chave: string): Promise<void> {
    if (this.bloqueado) throw new Error('Aguarde a troca de conta antes de alterar os dados.');
    if (!this.particionada(chave)) return this.base.remover(chave);
    const alvo = this.endereco(chave);
    if (!alvo) throw new Error('Identifique a conta antes de alterar dados da loja.');
    // O marcador impede ressuscitar o valor legado após remoção.
    await this.base.gravar(`${alvo.chave}:migrada`, true);
    await this.base.remover(alvo.chave);
  }
  limpar() { return this.base.limpar(); }
}
