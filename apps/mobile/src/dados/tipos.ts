import type { PagamentoVenda, Produto } from '@pdv/shared';

export type MeioPagamento = PagamentoVenda['meio'];
export type ProvedorPagamento = NonNullable<PagamentoVenda['provedor']>;
export type Unidade = Produto['unidade'];
