import type { PagamentoVenda, Produto } from '@pdv/shared';

export type MeioPagamento = PagamentoVenda['meio'];
export type ProvedorVenda = NonNullable<PagamentoVenda['provedor']>;
export type ProvedorPagamento = 'infinitepay' | 'mercadopago';
export type Unidade = Produto['unidade'];
