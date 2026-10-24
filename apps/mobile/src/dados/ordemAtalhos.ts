import type { Armazenamento } from './armazenamento';
import { Persistido } from './observavel';

/** Ordena `itens` pela lista de ids; quem não está na lista (atalho novo) vai ao final, na ordem original. */
export function ordenarPelaOrdem<T extends { id: string }>(itens: readonly T[], ordem: readonly string[]): T[] {
  const posicao = (id: string) => {
    const i = ordem.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...itens].sort((a, b) => posicao(a.id) - posicao(b.id));
}

/** Troca `id` de lugar com o vizinho (`-1` sobe, `1` desce). */
export function moverNaOrdem(ids: readonly string[], id: string, sentido: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + sentido;
  if (i === -1 || j < 0 || j >= ids.length) return [...ids];
  const nova = [...ids];
  [nova[i], nova[j]] = [nova[j]!, nova[i]!];
  return nova;
}

/**
 * Posição dos atalhos de venda neste aparelho (o catálogo não tem campo de posição). Guarda só ids:
 * atalho novo, sem posição, entra no fim (a lista de entrada já vem em ordem alfabética) e id de
 * atalho excluído sai da lista na próxima mudança.
 */
export class OrdemAtalhosRepo extends Persistido<string[]> {
  constructor(armazenamento: Armazenamento) {
    super(armazenamento, 'atalhos_ordem', []);
  }

  ordenar<T extends { id: string }>(atalhos: readonly T[]): T[] {
    return ordenarPelaOrdem(atalhos, this.obter());
  }

  /** `atalhos` é a lista atual; devolve a nova ordem (só com os ids que ainda são atalhos). */
  async mover(atalhos: readonly { id: string }[], id: string, sentido: -1 | 1): Promise<string[]> {
    const atual = this.ordenar(atalhos).map((a) => a.id);
    const nova = moverNaOrdem(atual, id, sentido);
    await this.modificar(() => nova);
    return nova;
  }
}
