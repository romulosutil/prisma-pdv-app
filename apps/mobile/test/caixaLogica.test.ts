import type { Venda } from '@pdv/shared';
import { describe, expect, it } from 'vitest';
import {
  agruparPorDia,
  compararGaveta,
  filtrarPorMeio,
  formatarQuantidade,
  intervaloDoPeriodo,
  periodoExigePlano,
  resumirVendas,
  rotuloDoDia,
  rotuloDosPagamentos,
  textoDaGaveta,
  vendasDoPeriodo,
} from '@/telas/caixa/logica';
import { csvDeVendas, nomeDoArquivoDeVendas } from '@/telas/caixa/vendasCsv';

// 24/10/2026 15:00 em Brasília (UTC-3).
const AGORA = new Date('2026-10-24T18:00:00.000Z');

function venda(id: string, criadaEm: string, mudancas: Partial<Venda> = {}): Venda {
  return {
    id,
    lojaId: 'l',
    aparelhoId: 'a',
    operadorId: 'o',
    itens: [{ id: `${id}-i`, produtoId: null, descricao: 'Valor avulso', precoUnitarioCentavos: 1000, quantidadeMilesimos: 1000, totalCentavos: 1000 }],
    pagamentos: [{ id: `${id}-p`, meio: 'dinheiro', provedor: null, valorCentavos: 1000, trocoCentavos: 0 }],
    totalCentavos: 1000,
    status: 'concluida',
    criadaEm,
    ...mudancas,
  };
}

describe('conferência da gaveta', () => {
  it('detecta quando bate, sobra ou falta', () => {
    expect(compararGaveta(51230, 51230)).toEqual({ tipo: 'bate', valorCentavos: 0 });
    expect(compararGaveta(51230, 51000)).toEqual({ tipo: 'falta', valorCentavos: 230 });
    expect(compararGaveta(51230, 51500)).toEqual({ tipo: 'sobra', valorCentavos: 270 });
  });

  it('escreve o resultado com texto', () => {
    expect(textoDaGaveta(compararGaveta(51230, 51000))).toBe('Falta R$ 2,30');
    expect(textoDaGaveta(compararGaveta(51230, 51500))).toBe('Sobra R$ 2,70');
    expect(textoDaGaveta(compararGaveta(51230, 51230))).toBe('Bateu certinho');
  });
});

describe('período das vendas', () => {
  it('calcula o intervalo no calendário de Brasília', () => {
    const hoje = intervaloDoPeriodo('hoje', AGORA, null);
    expect(hoje.inicio.toISOString()).toBe('2026-10-24T03:00:00.000Z');
    expect(hoje.fim.toISOString()).toBe('2026-10-25T03:00:00.000Z');
    expect(intervaloDoPeriodo('ontem', AGORA, null).inicio.toISOString()).toBe('2026-10-23T03:00:00.000Z');
    expect(intervaloDoPeriodo('7dias', AGORA, null).inicio.toISOString()).toBe('2026-10-18T03:00:00.000Z');
  });

  it('não deixa o início recuar além do histórico do plano', () => {
    const { inicio } = intervaloDoPeriodo('7dias', AGORA, 3);
    expect(inicio.toISOString()).toBe('2026-10-21T03:00:00.000Z');
  });

  it('só "hoje" vale sem relatório por período', () => {
    expect(periodoExigePlano('hoje')).toBe(false);
    expect(periodoExigePlano('ontem')).toBe(true);
    expect(periodoExigePlano('7dias')).toBe(true);
  });

  it('seleciona as vendas do período da mais recente para a mais antiga', () => {
    const vendas = [
      venda('a', '2026-10-24T12:00:00.000Z'),
      venda('b', '2026-10-24T02:59:00.000Z'), // 23:59 de ontem
      venda('c', '2026-10-24T17:00:00.000Z'),
      venda('d', '2026-10-17T20:00:00.000Z'), // fora dos 7 dias
    ];
    expect(vendasDoPeriodo(vendas, 'hoje', AGORA, null).map((v) => v.id)).toEqual(['c', 'a']);
    expect(vendasDoPeriodo(vendas, 'ontem', AGORA, null).map((v) => v.id)).toEqual(['b']);
    expect(vendasDoPeriodo(vendas, '7dias', AGORA, null).map((v) => v.id)).toEqual(['c', 'a', 'b']);
  });

  it('agrupa por dia mantendo a ordem', () => {
    const grupos = agruparPorDia([
      venda('c', '2026-10-24T17:00:00.000Z'),
      venda('a', '2026-10-24T12:00:00.000Z'),
      venda('b', '2026-10-24T02:59:00.000Z'),
    ]);
    expect(grupos.map((g) => g.vendas.map((v) => v.id))).toEqual([['c', 'a'], ['b']]);
    expect(grupos[0]!.dia.toISOString()).toBe('2026-10-24T03:00:00.000Z');
  });
});

describe('filtro e resumo das vendas', () => {
  const dividida = venda('d', '2026-10-24T12:00:00.000Z', {
    totalCentavos: 3000,
    pagamentos: [
      { id: '1', meio: 'dinheiro', provedor: null, valorCentavos: 1000, trocoCentavos: 0 },
      { id: '2', meio: 'pix', provedor: null, valorCentavos: 2000, trocoCentavos: 0 },
    ],
  });
  const cartao = venda('c', '2026-10-24T13:00:00.000Z', {
    pagamentos: [{ id: '3', meio: 'tap', provedor: 'infinitepay', valorCentavos: 1000, trocoCentavos: 0 }],
  });
  const cancelada = venda('x', '2026-10-24T14:00:00.000Z', { status: 'cancelada' });

  it('filtra por meio e inclui pagamentos divididos', () => {
    const todas = [dividida, cartao, cancelada];
    expect(filtrarPorMeio(todas, 'todos')).toHaveLength(3);
    expect(filtrarPorMeio(todas, 'pix').map((v) => v.id)).toEqual(['d']);
    expect(filtrarPorMeio(todas, 'dinheiro').map((v) => v.id)).toEqual(['d', 'x']);
    expect(filtrarPorMeio(todas, 'cartao').map((v) => v.id)).toEqual(['c']);
  });

  it('nomeia os pagamentos sem repetir', () => {
    expect(rotuloDosPagamentos(dividida)).toBe('Dinheiro + Pix');
    expect(rotuloDosPagamentos(cartao)).toBe('Aproximação');
  });

  it('soma só as vendas concluídas', () => {
    expect(resumirVendas([dividida, cartao, cancelada])).toEqual({ concluidas: 2, canceladas: 1, totalCentavos: 4000 });
  });
});

describe('rótulo do dia', () => {
  it('diz hoje, ontem ou o dia da semana', () => {
    expect(rotuloDoDia(new Date('2026-10-24T03:00:00.000Z'), AGORA)).toBe('Hoje, 24/10');
    expect(rotuloDoDia(new Date('2026-10-23T03:00:00.000Z'), AGORA)).toBe('Ontem, 23/10');
    expect(rotuloDoDia(new Date('2026-10-21T03:00:00.000Z'), AGORA)).toBe('Quarta, 21/10');
  });
});

describe('quantidade do item', () => {
  it('usa × para unidades inteiras e kg para fracionados', () => {
    expect(formatarQuantidade(1000)).toBe('1×');
    expect(formatarQuantidade(3000)).toBe('3×');
    expect(formatarQuantidade(500)).toBe('0,500 kg');
    expect(formatarQuantidade(1200, 'kg')).toBe('1,200 kg');
    expect(formatarQuantidade(2000, 'kg')).toBe('2,000 kg');
  });
});

describe('CSV de vendas', () => {
  it('gera uma linha por item, com ; e vírgula decimal, e protege fórmulas', () => {
    const v = venda('a', '2026-10-24T21:41:00.000Z', {
      itens: [
        { id: '1', produtoId: null, descricao: '=cmd; "x"', precoUnitarioCentavos: 1690, quantidadeMilesimos: 500, totalCentavos: 845 },
        { id: '2', produtoId: null, descricao: 'Leite integral 1L', precoUnitarioCentavos: 529, quantidadeMilesimos: 3000, totalCentavos: 1587 },
      ],
      pagamentos: [{ id: 'p', meio: 'pix', provedor: null, valorCentavos: 2432, trocoCentavos: 0 }],
      totalCentavos: 2432,
    });
    const linhas = csvDeVendas([v], () => '#000230').slice(1).split('\r\n');
    expect(linhas[0]).toBe('Venda;Data;Hora;Situação;Pagamento;Item;Quantidade;Preço unitário;Total do item');
    expect(linhas[1]).toBe('#000230;24/10/2026;18:41;Paga;Pix;"\'=cmd; ""x""";0,500;16,90;8,45');
    expect(linhas[2]).toBe('#000230;24/10/2026;18:41;Paga;Pix;Leite integral 1L;3;5,29;15,87');
  });

  it('nomeia o arquivo com a data de Brasília', () => {
    expect(nomeDoArquivoDeVendas(AGORA)).toBe('vendas-2026-10-24.csv');
    expect(nomeDoArquivoDeVendas(new Date('2026-10-25T01:00:00.000Z'))).toBe('vendas-2026-10-24.csv');
  });
});
