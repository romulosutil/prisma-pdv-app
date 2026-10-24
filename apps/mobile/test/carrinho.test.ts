import type { Produto } from '@pdv/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  Carrinho,
  calcularTroco,
  formatarPeso,
  metadeDoValor,
  montarVenda,
  quantidadeDeItens,
  rotuloDaQuantidade,
  sugestoesDeRecebido,
  totalDoCarrinho,
  valorPago,
  valorRestante,
} from '@/dados/carrinho';
import { VendasRepo } from '@/dados/vendas';
import { criarAmbiente } from './ambiente';

type P = Pick<Produto, 'id' | 'nome' | 'ean' | 'precoCentavos' | 'unidade'>;
const arroz: P = { id: 'arroz', nome: 'Arroz tipo 1 5kg', ean: '7890000000017', precoCentavos: 2790, unidade: 'un' };
const feijao: P = { id: 'feijao', nome: 'Feijão carioca 1kg', ean: '7890000000024', precoCentavos: 849, unidade: 'un' };
const leite: P = { id: 'leite', nome: 'Leite integral 1L', ean: '7890000000031', precoCentavos: 529, unidade: 'un' };
const biscoito: P = { id: 'biscoito', nome: 'Biscoito recheado 130g', ean: '7890000000055', precoCentavos: 379, unidade: 'un' };
const pao: P = { id: 'pao', nome: 'Pão francês', ean: null, precoCentavos: 1690, unidade: 'kg' };
const banana: P = { id: 'banana', nome: 'Banana prata', ean: null, precoCentavos: 699, unidade: 'kg' };

function carrinhoDeDemonstracao(): Carrinho {
  const c = new Carrinho();
  c.adicionarProduto(arroz);
  c.adicionarProduto(feijao);
  for (let i = 0; i < 3; i++) c.adicionarProduto(leite);
  c.adicionarProduto(biscoito);
  return c;
}

describe('Carrinho: itens e totais', () => {
  let c: Carrinho;
  beforeEach(() => {
    c = carrinhoDeDemonstracao();
  });

  it('soma o carrinho de demonstração: 6 itens, R$ 56,05', () => {
    const { itens } = c.obter();
    expect(totalDoCarrinho(itens)).toBe(5605);
    expect(quantidadeDeItens(itens)).toBe(6);
    expect(itens.map((i) => i.descricao)).toEqual(['Biscoito recheado 130g', 'Leite integral 1L', 'Feijão carioca 1kg', 'Arroz tipo 1 5kg']);
    expect(itens.find((i) => i.produtoId === 'leite')?.quantidadeMilesimos).toBe(3000);
  });

  it('o último produto lido fica em destaque, inclusive ao repetir um já existente', () => {
    c.adicionarProduto(arroz);
    const { itens } = c.obter();
    expect(itens[0]).toMatchObject({ produtoId: 'arroz', quantidadeMilesimos: 2000 });
    expect(itens).toHaveLength(4);
  });

  it('altera a quantidade, destaca a linha e remove ao chegar a zero', () => {
    const chave = c.obter().itens.find((i) => i.produtoId === 'feijao')!.chave;
    c.definirQuantidade(chave, 5000);
    expect(c.obter().itens[0]).toMatchObject({ produtoId: 'feijao', quantidadeMilesimos: 5000 });
    expect(totalDoCarrinho(c.obter().itens)).toBe(5605 + 4 * 849);
    c.definirQuantidade(chave, 0);
    expect(c.obter().itens.some((i) => i.produtoId === 'feijao')).toBe(false);
  });

  it('desfaz a última remoção na mesma posição', () => {
    const antes = c.obter().itens.map((i) => i.chave);
    c.remover(antes[2]!);
    expect(c.obter().itens).toHaveLength(3);
    c.desfazerRemocao();
    expect(c.obter().itens.map((i) => i.chave)).toEqual(antes);
    expect(c.obter().removido).toBeNull();
  });

  it('limita a quantidade por unidade a 999', () => {
    const chave = c.obter().itens[0]!.chave;
    c.definirQuantidade(chave, 5_000_000);
    expect(c.obter().itens[0]?.quantidadeMilesimos).toBe(999_000);
  });

  it('limpar zera itens e parcelas', () => {
    c.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
    c.limpar();
    expect(c.obter()).toMatchObject({ itens: [], parcelas: [], concluidaId: null });
  });
});

describe('Carrinho: peso (kg) e valor avulso', () => {
  it('calcula itens por kg em gramas, arredondando o centavo', () => {
    const c = new Carrinho();
    c.adicionarProduto(pao, 300);
    c.adicionarProduto(banana, 1000);
    const { itens } = c.obter();
    expect(totalDoCarrinho(itens)).toBe(507 + 699);
    expect(quantidadeDeItens(itens)).toBe(2);
    expect(rotuloDaQuantidade(itens[1]!)).toBe('0,300 kg');
    expect(formatarPeso(1250)).toBe('1,250 kg');
  });

  it('pesar o mesmo produto de novo soma o peso', () => {
    const c = new Carrinho();
    c.adicionarProduto(pao, 300);
    c.adicionarProduto(pao, 250);
    expect(c.obter().itens).toHaveLength(1);
    expect(c.obter().itens[0]?.quantidadeMilesimos).toBe(550);
  });

  it('lança valor avulso como linha própria, com descrição padrão', () => {
    const c = new Carrinho();
    c.adicionarAvulso(450, '  Hortifruti ');
    c.adicionarAvulso(1000, '');
    const { itens } = c.obter();
    expect(itens.map((i) => i.descricao)).toEqual(['Valor avulso', 'Hortifruti']);
    expect(itens.every((i) => i.produtoId === null && i.quantidadeMilesimos === 1000)).toBe(true);
    expect(totalDoCarrinho(itens)).toBe(1450);
  });
});

describe('Pagamento: dividir e troco', () => {
  it('divide R$ 56,05 em duas partes até zerar o restante', () => {
    const c = carrinhoDeDemonstracao();
    const total = totalDoCarrinho(c.obter().itens);
    const parte = metadeDoValor(total);
    expect(parte).toBe(2803);

    c.adicionarParcela({ meio: 'dinheiro', valorCentavos: parte, trocoCentavos: 197 });
    const { parcelas } = c.obter();
    expect(valorPago(parcelas)).toBe(2803);
    expect(valorRestante(total, parcelas)).toBe(2802);

    c.adicionarParcela({ meio: 'pix', provedor: null, valorCentavos: valorRestante(total, parcelas) });
    expect(valorRestante(total, c.obter().parcelas)).toBe(0);
  });

  it('não aceita parcela zerada nem maior que o restante', () => {
    const c = carrinhoDeDemonstracao();
    expect(() => c.adicionarParcela({ meio: 'pix', valorCentavos: 0 })).toThrow(RangeError);
    expect(() => c.adicionarParcela({ meio: 'pix', valorCentavos: 5606 })).toThrow(RangeError);
    c.adicionarParcela({ meio: 'pix', valorCentavos: 5000 });
    expect(() => c.adicionarParcela({ meio: 'tap', valorCentavos: 606 })).toThrow(RangeError);
  });

  it('calcula o troco só quando o recebido cobre a conta', () => {
    expect(calcularTroco(6000, 5605)).toBe(395);
    expect(calcularTroco(5605, 5605)).toBe(0);
    expect(calcularTroco(5000, 5605)).toBe(0);
  });

  it('sugere o valor exato e as próximas notas redondas', () => {
    expect(sugestoesDeRecebido(5605)).toEqual([5605, 6000, 7000, 10000]);
    expect(sugestoesDeRecebido(6000)).toEqual([6000, 7000, 10000]);
    expect(sugestoesDeRecebido(99)).toEqual([99, 1000, 2000, 5000]);
  });

  it('a venda montada fecha o total e o VendasRepo a registra com troco separado', async () => {
    const c = carrinhoDeDemonstracao();
    c.adicionarParcela({ meio: 'dinheiro', valorCentavos: 5605, trocoCentavos: 395 });
    const nova = montarVenda(c.obter().itens, c.obter().parcelas);
    expect(nova.itens[0]).not.toHaveProperty('chave');

    const repo = new VendasRepo(criarAmbiente(), { sessao: () => ({ lojaId: 'l', aparelhoId: 'a', operadorId: 'o' }) });
    const venda = await repo.registrar(nova);
    expect(venda.totalCentavos).toBe(5605);
    expect(venda.pagamentos).toMatchObject([{ meio: 'dinheiro', valorCentavos: 5605, trocoCentavos: 395 }]);
    expect(venda.itens).toHaveLength(4);
  });
});
