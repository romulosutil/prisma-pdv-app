import { useSyncExternalStore } from 'react';
import type { Armazenamento } from './armazenamento';

/** Valor observável (compatível com `useSyncExternalStore`). Atualize sempre com um objeto novo. */
export class Observavel<T> {
  private readonly ouvintes = new Set<() => void>();

  constructor(private valor: T) {}

  /** Estável: pode ser passado direto como `getSnapshot`. */
  readonly obter = (): T => this.valor;

  readonly assinar = (ouvinte: () => void): (() => void) => {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  };

  protected definir(novo: T): void {
    this.valor = novo;
    this.ouvintes.forEach((ouvinte) => ouvinte());
  }
}

export function useObservavel<T>(fonte: Observavel<T>): T {
  return useSyncExternalStore(fonte.assinar, fonte.obter, fonte.obter);
}

/** Observável cujo valor é espelhado numa chave do `Armazenamento`. */
export class Persistido<T> extends Observavel<T> {
  constructor(
    private readonly armazenamento: Armazenamento,
    private readonly chave: string,
    inicial: T,
  ) {
    super(inicial);
  }

  async carregar(): Promise<void> {
    const salvo = await this.armazenamento.obter<T>(this.chave);
    if (salvo !== null) this.definir(salvo);
  }

  /** O estado em memória muda na hora; a gravação segue a ordem das chamadas. */
  protected async modificar(mudar: (atual: T) => T): Promise<T> {
    const novo = mudar(this.obter());
    this.definir(novo);
    await this.armazenamento.gravar(this.chave, novo);
    return novo;
  }

  async reiniciar(inicial: T): Promise<void> {
    this.definir(inicial);
    await this.armazenamento.remover(this.chave);
  }
}
