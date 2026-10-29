import { describe, expect, it } from 'vitest';
import { gerarId } from '@pdv/shared';
import { venda } from './ajuda';
import { vendaConsistente } from '../src/servicos/valoresVenda';

const base = () => venda({ lojaId: gerarId(), aparelhoId: gerarId(), operadorId: gerarId() });

describe('valores da venda', () => {
  it('arredonda 499, 500 e 501 milésimos exatamente e permite gratuidade', () => {
    for (const [preco, total] of [[499, 0], [500, 1], [501, 1]]) {
      const v = base();
      v.itens = [{ ...v.itens[0]!, precoUnitarioCentavos: preco!, quantidadeMilesimos: 1, totalCentavos: total! }];
      v.totalCentavos = total!;
      v.pagamentos = total ? [{ ...v.pagamentos[0]!, valorCentavos: total, trocoCentavos: 0 }] : [];
      expect(vendaConsistente(v)).toBe(true);
    }
    const gratis = base();
    gratis.itens = [{ ...gratis.itens[0]!, precoUnitarioCentavos: 0, totalCentavos: 0 }];
    gratis.totalCentavos = 0;
    gratis.pagamentos = [{ ...gratis.pagamentos[0]!, valorCentavos: 0, trocoCentavos: 0 }];
    expect(vendaConsistente(gratis)).toBe(true);
  });
  it('verifica limites, somas, parcelas, troco e IDs repetidos', () => {
    const v = base();
    v.itens = [{ ...v.itens[0]!, precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, totalCentavos: 2500 }];
    v.totalCentavos = 2500;
    v.pagamentos = [{ ...v.pagamentos[0]!, valorCentavos: 1000, trocoCentavos: 500 }, { id: gerarId(), meio: 'pix', provedor: null, valorCentavos: 1500, trocoCentavos: 0 }];
    expect(vendaConsistente(v)).toBe(true);
    for (const n of [1499, 1501]) expect(vendaConsistente({ ...v, pagamentos: [v.pagamentos[0]!, { ...v.pagamentos[1]!, valorCentavos: n }] })).toBe(false);
    expect(vendaConsistente({ ...v, itens: [] })).toBe(false);
    expect(vendaConsistente({ ...v, itens: [v.itens[0]!, v.itens[0]!] })).toBe(false);
    expect(vendaConsistente({ ...v, pagamentos: [v.pagamentos[0]!, v.pagamentos[0]!] })).toBe(false);
    expect(vendaConsistente({ ...v, pagamentos: [v.pagamentos[0]!, { ...v.pagamentos[1]!, trocoCentavos: 1 }] })).toBe(false);
    expect(vendaConsistente({ ...v, itens: [{ ...v.itens[0]!, precoUnitarioCentavos: Number.MAX_SAFE_INTEGER, quantidadeMilesimos: 2 }] })).toBe(false);
    expect(vendaConsistente({ ...v, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: Number.MAX_SAFE_INTEGER, trocoCentavos: 1 }] })).toBe(false);
    expect(vendaConsistente({ ...v, itens: [{ ...v.itens[0]!, totalCentavos: 2499 }] })).toBe(false);
    expect(vendaConsistente({ ...v, itens: [{ ...v.itens[0]!, totalCentavos: 2499 }], totalCentavos: 2499, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: 2499, trocoCentavos: 0 }] })).toBe(false);
    expect(vendaConsistente({ ...v, itens: [{ ...v.itens[0]!, quantidadeMilesimos: 0 }] })).toBe(false);
    expect(vendaConsistente({ ...v, itens: [{ ...v.itens[0]!, quantidadeMilesimos: Number.MAX_SAFE_INTEGER + 1 }] })).toBe(false);
    expect(vendaConsistente({ ...v, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: Number.MAX_SAFE_INTEGER, trocoCentavos: 0 }, { ...v.pagamentos[1]!, valorCentavos: 1 }] })).toBe(false);
    expect(vendaConsistente({ ...v, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: -1 }] })).toBe(false);
    const produtoExcessivo = { ...v, itens: [{ ...v.itens[0]!, precoUnitarioCentavos: 4503599627370496, quantidadeMilesimos: 2, totalCentavos: 9007199254741 }], totalCentavos: 9007199254741, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: 9007199254741, trocoCentavos: 0 }] };
    expect(vendaConsistente(produtoExcessivo)).toBe(false);
    expect(vendaConsistente({ ...produtoExcessivo, itens: [{ ...produtoExcessivo.itens[0]!, precoUnitarioCentavos: Number.MAX_SAFE_INTEGER, quantidadeMilesimos: 1 }] })).toBe(true);
    expect(vendaConsistente({ ...v, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: 2500, trocoCentavos: Number.MAX_SAFE_INTEGER }] })).toBe(false);
    expect(vendaConsistente({ ...v, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: 2500, trocoCentavos: Number.MAX_SAFE_INTEGER - 2500 }] })).toBe(true);
    for (const meio of ['pix', 'cartao_credito', 'cartao_debito', 'tap'] as const) {
      expect(vendaConsistente({ ...v, pagamentos: [{ ...v.pagamentos[0]!, meio, valorCentavos: 2500, trocoCentavos: 1 }] })).toBe(false);
      expect(vendaConsistente({ ...v, pagamentos: [{ ...v.pagamentos[0]!, meio, valorCentavos: 2500, trocoCentavos: 0 }] })).toBe(true);
    }
    const item = { ...v.itens[0]!, precoUnitarioCentavos: 1250, totalCentavos: 1250 };
    expect(vendaConsistente({ ...v, itens: [item, item] })).toBe(false);
    expect(vendaConsistente({ ...v, itens: [item, { ...item, id: gerarId() }] })).toBe(true);
    const parcela = { ...v.pagamentos[0]!, valorCentavos: 1250, trocoCentavos: 0 };
    expect(vendaConsistente({ ...v, pagamentos: [parcela, parcela] })).toBe(false);
    expect(vendaConsistente({ ...v, pagamentos: [parcela, { ...parcela, id: gerarId() }] })).toBe(true);
  });
});
