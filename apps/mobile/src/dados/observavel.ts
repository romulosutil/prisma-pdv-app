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
  private fila: Promise<void> = Promise.resolve();

  private enfileirar<R>(operacao: () => Promise<R>): Promise<R> {
    const resultado = this.fila.then(operacao);
    this.fila = resultado.then(() => undefined, () => undefined);
    return resultado;
  }
  constructor(
    private readonly armazenamento: Armazenamento,
    private readonly chave: string,
    private readonly inicial: T,
  ) {
    super(inicial);
  }

  async carregar(): Promise<void> {
    return this.enfileirar(async () => {
      const escopo = this.armazenamento.obterEscopo?.();
      const salvo = await this.armazenamento.obter<T>(this.chave);
      if (escopo !== this.armazenamento.obterEscopo?.()) throw new Error('A conta mudou durante a leitura. Tente novamente.');
      this.definir(this.validarCarregado(salvo ?? this.inicial));
    });
  }

  protected validarCarregado(valor: T): T { return valor; }

  aguardarGravacoes(): Promise<void> { return this.fila; }
  /** Troca de escopo: limpa somente o snapshot; o armazenamento da conta anterior permanece. */
  limparMemoria(): void { this.definir(this.inicial); }

  /** Publica o novo estado somente após a gravação bem-sucedida. */
  protected async modificar(mudar: (atual: T) => T): Promise<T> {
    return this.enfileirar(async () => {
      const escopo = this.armazenamento.obterEscopo?.();
      const novo = mudar(this.obter());
      if (novo === this.obter()) return novo;
      await this.armazenamento.gravar(this.chave, novo);
      if (escopo !== this.armazenamento.obterEscopo?.()) throw new Error('A conta mudou durante a gravação. Recarregue os dados.');
      this.definir(novo);
      return novo;
    });
  }

  async reiniciar(inicial: T): Promise<void> {
    return this.enfileirar(async () => {
      await this.armazenamento.remover(this.chave);
      this.definir(inicial);
    });
  }
}
