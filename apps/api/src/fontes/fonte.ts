import type { FonteCatalogo } from '@pdv/shared';

/** O que uma fonte externa sabe sobre um código de barras. Nunca inclui preço. */
export interface DadosEan {
  nome: string;
  marca: string | null;
  conteudo: string | null;
  imagemUrl: string | null;
}

/**
 * "Não está aqui, mas a base conhece o código em outra fonte." As bases Open … Facts compartilham o
 * banco e devolvem 404 "found with a different product type"; o serviço pula direto para a fonte certa.
 */
export interface DicaOutraFonte {
  outraFonte: FonteCatalogo | null;
}

export type ResultadoFonte = DadosEan | DicaOutraFonte | null;

export const ehDica = (r: ResultadoFonte): r is DicaOutraFonte => r !== null && 'outraFonte' in r;

/**
 * Fonte externa de dados de produto. `consultar` devolve `null` quando a fonte não conhece o código
 * e LANÇA em falha de rede/HTTP; quem chama decide como tratar.
 * Deve respeitar o `sinal`, mas o serviço não depende disso para cumprir o orçamento de tempo.
 */
export interface FonteEan {
  id: FonteCatalogo;
  consultar(ean: string, sinal: AbortSignal): Promise<ResultadoFonte>;
}
