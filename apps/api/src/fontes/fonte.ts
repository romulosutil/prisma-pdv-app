import type { FonteCatalogo } from '@pdv/shared';

/** O que uma fonte externa sabe sobre um código de barras. Nunca inclui preço. */
export interface DadosEan {
  nome: string;
  marca: string | null;
  conteudo: string | null;
  imagemUrl: string | null;
}

/**
 * Fonte externa de dados de produto (Open Food Facts, Cosmos...). `consultar` devolve `null` quando
 * a fonte não conhece o código e LANÇA em falha de rede/HTTP; quem chama decide como tratar.
 * Deve respeitar o `sinal`, mas o serviço não depende disso para cumprir o orçamento de tempo.
 */
export interface FonteEan {
  id: FonteCatalogo;
  consultar(ean: string, sinal: AbortSignal): Promise<DadosEan | null>;
}
