import { describe, expect, it } from 'vitest';
import { AjusteEstoqueSchema, ProdutoSchema, ItemVendaSchema, mesclarAjustesEstoque, movimentosDoEstoque, saldoEstoque, saldoContabilEstoque, type Produto, type Venda, type AjusteEstoque } from '../src';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const em = '2026-11-02T12:00:00.000Z';
const produto = (campos: Partial<Produto> = {}): Produto => ({ id: id(1), lojaId: id(2), nome: 'Arroz', ean: null, precoCentavos: 100, unidade: 'un', estoque: 10000, estoqueMinimo: 2000, atalho: false, criadoEm: em, atualizadoEm: em, excluidoEm: null, versao: 1, ...campos });
const ajuste = (n: number, quantidadeMilesimos: number): AjusteEstoque => ({ id: id(n), quantidadeMilesimos, criadoEm: em, motivo: 'Contagem' });
const venda = (campos: Partial<Venda> = {}): Venda => ({ id: id(3), lojaId: id(2), aparelhoId: id(4), operadorId: id(5), itens: [{ id: id(6), produtoId: id(1), descricao: 'Arroz', precoUnitarioCentavos: 100, quantidadeMilesimos: 2000, totalCentavos: 200, controlaEstoque: true }], pagamentos: [{ id: id(7), meio: 'dinheiro', provedor: null, valorCentavos: 200, trocoCentavos: 0 }], totalCentavos: 200, status: 'concluida', criadaEm: em, ...campos });

describe('estoque por movimentos', () => {
  it('baixa10→8 e repõe8→10, mantendo baixa e reposição no histórico', () => {
    expect(saldoEstoque(produto(), [venda()])).toBe(8000);
    const cancelada = venda({ status: 'cancelada', cancelamento: { id: id(8), em, operadorId: id(5), motivo: 'Devolução', estorno: 'nao_realizado' } });
    expect(saldoEstoque(produto(), [cancelada])).toBe(10000);
    expect(movimentosDoEstoque(produto(), [cancelada]).map(m => [m.tipo, m.quantidadeMilesimos])).toEqual([['inicial', 10000], ['venda', -2000], ['cancelamento', 2000]]);
  });
  it('ignora histórico sem marcador, avulsos, outra loja e produto sem controle', () => {
    const antiga = venda(); delete antiga.itens[0]!.controlaEstoque;
    const avulsa = venda({ id: id(9), itens: [{ ...venda().itens[0]!, produtoId: null }] });
    expect(saldoEstoque(produto(), [antiga, avulsa, venda({ lojaId: id(99) })])).toBe(10000);
    expect(saldoEstoque(produto({ estoque: null }), [venda()])).toBeNull();
  });
  it('soma duas vendas, depois um cancelamento, sem recontar a mesma venda', () => {
    const a = venda();
    const b = venda({ id: id(10), itens: [{ ...a.itens[0]!, quantidadeMilesimos: 3000 }] });
    expect(saldoEstoque(produto(), [a, b, a])).toBe(5000);
    expect(saldoEstoque(produto(), [{ ...a, status: 'cancelada' }, b])).toBe(7000);
  });
  it('une ajustes+4/-1 em qualquer ordem, uma vez, conservando a baixa2', () => {
    const a = ajuste(11, 4000), b = ajuste(12, -1000);
    const unidos = mesclarAjustesEstoque([a], [b, a]);
    expect(unidos).toEqual(mesclarAjustesEstoque([b], [a, b]));
    expect(unidos).toHaveLength(2);
    expect(saldoEstoque(produto({ ajustesEstoque: unidos }), [venda()])).toBe(11000);
    expect(() => mesclarAjustesEstoque([a], [{ ...a, quantidadeMilesimos: 5000 }])).toThrow('Ajuste de estoque imutável');
  });
  it('preserva frações e permite negativo sem arredondamento', () => {
    const v = venda({ itens: [{ ...venda().itens[0]!, quantidadeMilesimos: 350 }] });
    expect(saldoEstoque(produto({ estoque: 1000 }), [v])).toBe(650);
    expect(saldoEstoque(produto({ estoque: 1000 }), [venda()])).toBe(-1000);
  });
  it('desativar esconde saldo e preserva histórico para reativar com ajuste', () => {
    const p = produto({ estoqueAtivo: false });
    const semBaixa = venda({ id: id(15), itens: [{ ...venda().itens[0]!, controlaEstoque: false }] });
    expect(saldoEstoque(p, [venda(), semBaixa])).toBeNull();
    expect(saldoContabilEstoque(p, [venda(), semBaixa])).toBe(8000);
    expect(saldoEstoque({ ...p, estoqueAtivo: true, ajustesEstoque: [ajuste(16, -2000)] }, [venda(), semBaixa])).toBe(6000);
  });
  it('contratos preservam legado, recusam ajuste zero, duplicado e número inseguro', () => {
    expect(ProdutoSchema.parse(produto())).toEqual(produto());
    expect(ItemVendaSchema.parse(venda().itens[0]).controlaEstoque).toBe(true);
    expect(AjusteEstoqueSchema.safeParse(ajuste(11, 0)).success).toBe(false);
    expect(AjusteEstoqueSchema.safeParse(ajuste(11, Number.MAX_SAFE_INTEGER + 1)).success).toBe(false);
    expect(ProdutoSchema.safeParse(produto({ ajustesEstoque: [ajuste(11, 1000), ajuste(11, 2000)] })).success).toBe(false);
    expect(() => saldoEstoque(produto({ estoque: Number.MAX_SAFE_INTEGER, ajustesEstoque: [ajuste(12, 1)] }), [])).toThrow('Saldo de estoque fora');
  });
});
