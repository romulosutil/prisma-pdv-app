import { RelogioFalso } from '@pdv/shared';
import type { Ambiente } from '@/dados/ambiente';
import type { Armazenamento } from '@/dados/armazenamento';

export class ArmazenamentoMemoria implements Armazenamento {
  readonly dados = new Map<string, string>();

  async obter<T>(chave: string): Promise<T | null> {
    const bruto = this.dados.get(chave);
    if (bruto === undefined) return null;
    let valor: unknown;
    try {
      valor = JSON.parse(bruto);
    } catch {
      throw new Error('Dados armazenados contêm JSON inválido.');
    }
    if (valor === null) throw new Error('Dados armazenados não podem conter null como valor raiz.');
    return valor as T;
  }

  async gravar<T>(chave: string, valor: T): Promise<void> {
    this.dados.set(chave, JSON.stringify(valor));
  }

  async remover(chave: string): Promise<void> {
    this.dados.delete(chave);
  }

  async limpar(): Promise<void> {
    this.dados.clear();
  }
}

/** UUIDs determinísticos no formato v7. */
export function criarContadorDeIds(): () => string {
  let n = 0;
  return () => `00000000-0000-7000-8000-${String(++n).padStart(12, '0')}`;
}

export function criarAmbiente(inicio = new Date('2026-10-23T15:00:00.000Z')): Ambiente & { relogio: RelogioFalso; armazenamento: ArmazenamentoMemoria } {
  return { armazenamento: new ArmazenamentoMemoria(), relogio: new RelogioFalso(inicio), novoId: criarContadorDeIds() };
}
