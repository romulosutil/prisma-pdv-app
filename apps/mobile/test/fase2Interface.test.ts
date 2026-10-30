import { expect, it } from 'vitest';
import type { Caixa, Venda } from '@pdv/shared';
import { cancelamentosAposFechamento } from '../src/telas/caixa/historicoDoCaixa';

it('apresenta somente ajustes auditados vinculados e posteriores sem mudar fechamento', () => {
  const caixa = { id: 'caixa-a', fechamento: { em: '2026-10-30T13:00:00.000Z', esperadoCentavos: 2500, contadoCentavos: 2500 } } as Caixa;
  const venda = { id: 'venda', caixaId: caixa.id, totalCentavos: 2500, status: 'cancelada', cancelamento: { id: 'evento', em: '2026-10-30T14:00:00.000Z', operadorId: 'operador', motivo: 'Erro', estorno: 'nao_realizado' } } as Venda;
  const snapshot = JSON.stringify(caixa);
  const outras = [{ ...venda, caixaId: 'caixa-b' }, { ...venda, caixaId: null }, { ...venda, cancelamento: null }, { ...venda, status: 'concluida' as const }, { ...venda, cancelamento: { ...venda.cancelamento!, em: '2026-10-30T12:00:00.000Z' } }];
  expect(cancelamentosAposFechamento(caixa, [venda, ...outras])).toEqual([venda]);
  expect(JSON.stringify(caixa)).toBe(snapshot);
  expect(cancelamentosAposFechamento({ ...caixa, fechamento: null }, [venda])).toEqual([]);
});

it('compara instantes com precisões ISO diferentes, incluindo igualdade e anterior', () => {
  const caixa = { id: 'caixa-a', fechamento: { em: '2026-10-30T13:00:00Z', esperadoCentavos: 2500, contadoCentavos: 2500 } } as Caixa;
  const base = { caixaId: caixa.id, status: 'cancelada', cancelamento: { id: 'evento', operadorId: 'operador', motivo: 'Erro', estorno: 'nao_realizado' } };
  const posterior = { ...base, id: 'posterior', cancelamento: { ...base.cancelamento, em: '2026-10-30T13:00:00.001Z' } } as Venda;
  const igual = { ...posterior, id: 'igual', cancelamento: { ...posterior.cancelamento!, em: '2026-10-30T13:00:00.000Z' } };
  const anterior = { ...posterior, id: 'anterior', cancelamento: { ...posterior.cancelamento!, em: '2026-10-30T12:59:59.999Z' } };
  expect(cancelamentosAposFechamento(caixa, [posterior, igual, anterior])).toEqual([posterior, igual]);
  expect(cancelamentosAposFechamento({ ...caixa, fechamento: { ...caixa.fechamento!, em: '2026-10-30T13:00:00.000Z' } }, [posterior, igual, anterior])).toEqual([posterior, igual]);
});
