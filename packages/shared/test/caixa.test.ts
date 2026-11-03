import { expect, it } from 'vitest';
import { saldoDoCaixa, type Caixa, type Venda } from '../src';

it('saldo usa apenas numerário do turno, preserva cancelamento sem devolução e destinação não desconta duas vezes', () => {
  const cx: Caixa = { id: 'a', lojaId: 'l', aparelhoId: 'd', operadorId: 'ana', abertura: { em: '2026-11-02T00:00:00Z', trocoInicialCentavos: 10000 }, fechamento: null, movimentos: [] };
  const v: Venda = { id: 'v', lojaId: 'l', aparelhoId: 'd', operadorId: 'ana', caixaId: 'a', itens: [], pagamentos: [{ id: 'p', meio: 'dinheiro', provedor: null, valorCentavos: 20000, trocoCentavos: 5000 }, { id: 'pix', meio: 'pix', provedor: null, valorCentavos: 5000, trocoCentavos: 0 }], totalCentavos: 25000, status: 'cancelada', criadaEm: '2026-11-02T00:00:00Z' };
  cx.movimentos = [ ['suprimento', 5000], ['sangria', 8000], ['retirada', 2000] ].map(([tipo, valorCentavos], i) => ({ id: String(i), tipo: tipo as 'suprimento' | 'sangria' | 'retirada', valorCentavos: Number(valorCentavos), motivo: 'Teste', criadoEm: v.criadaEm }));
  expect(saldoDoCaixa(cx, [v, { ...v, caixaId: 'bruno' }])).toBe(25000);
  cx.movimentos.push({ id: 'devolucao', tipo: 'devolucao', valorCentavos: 20000, motivo: 'Devolução efetiva', criadoEm: v.criadaEm });
  expect(saldoDoCaixa(cx, [v])).toBe(5000);
  cx.fechamento = { em: v.criadaEm, esperadoCentavos: 5000, contadoCentavos: 5000, recolhidoCentavos: 4000, trocoRestanteCentavos: 1000 };
  expect(saldoDoCaixa(cx, [v])).toBe(5000);
});
