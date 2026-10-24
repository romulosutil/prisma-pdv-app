import type { Produto } from '@pdv/shared';
import { describe, expect, it } from 'vitest';
import {
  contarPorFiltro,
  estoqueBaixo,
  filtrarProdutos,
  formatarEstoque,
  legendaDoContador,
  lerQuantidade,
  monograma,
  situacaoDoLimite,
  textoDeQuantidade,
} from '@/telas/produtos/logica';

const base: Produto = {
  id: 'x',
  lojaId: 'l',
  nome: 'Produto',
  ean: null,
  precoCentavos: 100,
  unidade: 'un',
  estoque: null,
  estoqueMinimo: null,
  atalho: false,
  criadoEm: '2026-01-01T00:00:00.000Z',
  atualizadoEm: '2026-01-01T00:00:00.000Z',
  excluidoEm: null,
  versao: 1,
};
const p = (id: string, mudancas: Partial<Produto>): Produto => ({ ...base, id, ...mudancas });

const catalogo = [
  p('arroz', { nome: 'Arroz tipo 1 5kg', ean: '7890000000017' }),
  p('cafe', { nome: 'Café torrado 500g', ean: '7890000000048', estoque: 3000, estoqueMinimo: 5000 }),
  p('pao', { nome: 'Pão francês', unidade: 'kg', atalho: true }),
  p('banana', { nome: 'Banana prata', ean: '7891111111111', unidade: 'kg', estoque: 12000, estoqueMinimo: 2000 }),
  p('gelo', { nome: 'Saco de gelo 5kg', atalho: true }),
];

describe('filtrarProdutos', () => {
  it('busca sem acento nem caixa, com todos os termos', () => {
    expect(filtrarProdutos(catalogo, 'todos', 'CAFE').map((x) => x.id)).toEqual(['cafe']);
    expect(filtrarProdutos(catalogo, 'todos', 'pao fra').map((x) => x.id)).toEqual(['pao']);
    expect(filtrarProdutos(catalogo, 'todos', 'arroz 5kg').map((x) => x.id)).toEqual(['arroz']);
    expect(filtrarProdutos(catalogo, 'todos', 'arroz feijão')).toEqual([]);
  });

  it('busca também por parte do código', () => {
    expect(filtrarProdutos(catalogo, 'todos', '0048').map((x) => x.id)).toEqual(['cafe']);
  });

  it('aplica cada filtro', () => {
    const ids = (f: Parameters<typeof filtrarProdutos>[1]) => filtrarProdutos(catalogo, f, '').map((x) => x.id);
    expect(ids('todos')).toHaveLength(5);
    expect(ids('com_codigo')).toEqual(['arroz', 'cafe', 'banana']);
    expect(ids('sem_codigo')).toEqual(['pao', 'banana', 'gelo']);
    expect(ids('atalhos')).toEqual(['pao', 'gelo']);
    expect(ids('estoque_baixo')).toEqual(['cafe']);
  });

  it('combina filtro e busca', () => {
    expect(filtrarProdutos(catalogo, 'atalhos', 'gelo').map((x) => x.id)).toEqual(['gelo']);
    expect(filtrarProdutos(catalogo, 'atalhos', 'arroz')).toEqual([]);
  });

  it('conta os produtos de cada filtro', () => {
    expect(contarPorFiltro(catalogo)).toEqual({ todos: 5, com_codigo: 3, sem_codigo: 3, atalhos: 2, estoque_baixo: 1 });
  });
});

describe('estoqueBaixo', () => {
  it('exige estoque e mínimo definidos e compara com <=', () => {
    expect(estoqueBaixo(p('a', { estoque: 5000, estoqueMinimo: 5000 }))).toBe(true);
    expect(estoqueBaixo(p('a', { estoque: 5001, estoqueMinimo: 5000 }))).toBe(false);
    expect(estoqueBaixo(p('a', { estoque: 0, estoqueMinimo: null }))).toBe(false);
    expect(estoqueBaixo(p('a', { estoque: null, estoqueMinimo: 3000 }))).toBe(false);
  });
});

describe('limite do plano', () => {
  it('classifica a situação do catálogo', () => {
    expect(situacaoDoLimite(312, 500)).toBe('livre');
    expect(situacaoDoLimite(450, 500)).toBe('proximo');
    expect(situacaoDoLimite(500, 500)).toBe('atingido');
    expect(situacaoDoLimite(620, 500)).toBe('atingido');
    expect(situacaoDoLimite(9000, null)).toBe('livre');
  });

  it('escreve o contador', () => {
    expect(legendaDoContador(312, 500)).toBe('312 de 500 produtos');
    expect(legendaDoContador(1, null)).toBe('1 produto');
    expect(legendaDoContador(9, null)).toBe('9 produtos');
  });
});

describe('monograma', () => {
  it('usa as iniciais das duas primeiras palavras relevantes', () => {
    expect(monograma('Arroz tipo 1 5kg')).toBe('AT');
    expect(monograma('Saco de gelo 5kg')).toBe('SG');
    expect(monograma('Pão francês')).toBe('PF');
    expect(monograma('Café')).toBe('C');
  });
});

describe('quantidades em milésimos', () => {
  it('formata o estoque', () => {
    expect(formatarEstoque(24000, 'un')).toBe('24 un');
    expect(formatarEstoque(6500, 'kg')).toBe('6,5 kg');
    expect(textoDeQuantidade(350)).toBe('0,35');
    expect(textoDeQuantidade(0)).toBe('0');
  });

  it('lê o que o usuário digita', () => {
    expect(lerQuantidade('')).toEqual({ valida: true, milesimos: null });
    expect(lerQuantidade('12')).toEqual({ valida: true, milesimos: 12000 });
    expect(lerQuantidade('6,5')).toEqual({ valida: true, milesimos: 6500 });
    expect(lerQuantidade('0.350')).toEqual({ valida: true, milesimos: 350 });
    expect(lerQuantidade('abc')).toEqual({ valida: false });
    expect(lerQuantidade('1,2345')).toEqual({ valida: false });
    expect(lerQuantidade('-3')).toEqual({ valida: false });
  });
});
