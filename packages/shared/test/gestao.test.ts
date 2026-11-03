import { expect, it } from 'vitest';
import { csvRelatorio, gerarId, montarRelatorio, MovimentoEstoqueReqSchema, ReceberFiadoReqSchema, VendaSchema, type LinhaRelatorio } from '../src';

it('relatório filtra o instante exato mesmo com precisão ISO diferente e exporta o mesmo snapshot', () => {
  const lojaId = gerarId(), operadorId = gerarId(), caixaId = gerarId();
  const base = { lojaId, operadorId, caixaId, meio: 'dinheiro', descricao: '=HYPERLINK("injetado")' };
  const eventos: LinhaRelatorio[] = [
    { ...base, id: 'venda', categoria: 'venda', em: '2026-11-02T03:00:00.000Z', valorCentavos: 1500 },
    { ...base, id: 'recebimento', categoria: 'recebimento_fiado', em: '2026-11-02T04:00:00.000Z', valorCentavos: 300 },
    { ...base, id: 'diferenca', categoria: 'diferenca', em: '2026-11-02T05:00:00.000Z', valorCentavos: -100 },
    { ...base, id: 'fora', categoria: 'venda', em: '2026-11-03T03:00:00.000Z', valorCentavos: 999 },
  ];
  const r = montarRelatorio(eventos, { inicio: '2026-11-02T03:00:00Z', fim: '2026-11-03T03:00:00Z', lojaId, operadorId, caixaId, meio: 'dinheiro' }, '2026-11-03T04:00:00.000Z');
  expect(r.linhas.map(l => l.id)).toEqual(['venda', 'recebimento', 'diferenca']);
  expect(r.totais).toMatchObject({ venda: 1500, recebimento_fiado: 300, diferenca: -100, suprimento: 0 });
  const csv = csvRelatorio(r);
  expect(csv).toContain('"\'=HYPERLINK(""injetado"")"');
  expect(csv).toContain('"total";"";"";"";"";"";"diferenca";"";-100;""');
  expect(csv).not.toContain('"fora"');
  expect(montarRelatorio(eventos, { ...r.filtros, operadorId: gerarId() }, r.confirmadoEm).linhas).toEqual([]);
  expect(() => montarRelatorio(eventos, { ...r.filtros, fim: r.filtros.inicio }, r.confirmadoEm)).toThrow();
});

it('movimentos exigem quantidade segura, devolução referenciada e dinheiro recebido exige turno', () => {
  const base = { id: gerarId(), produtoId: gerarId(), motivo: 'Contagem física' };
  expect(MovimentoEstoqueReqSchema.safeParse({ ...base, tipo: 'ajuste', quantidadeMilesimos: -2000 }).success).toBe(true);
  for (const req of [
    { ...base, tipo: 'entrada', quantidadeMilesimos: -1 },
    { ...base, tipo: 'devolucao', quantidadeMilesimos: 1000 },
    { ...base, tipo: 'entrada', quantidadeMilesimos: 1000, itemVendaId: gerarId() },
    { ...base, tipo: 'ajuste', quantidadeMilesimos: 0 },
    { ...base, tipo: 'ajuste', quantidadeMilesimos: Number.MAX_SAFE_INTEGER + 1 },
  ]) expect(MovimentoEstoqueReqSchema.safeParse(req).success).toBe(false);
  expect(ReceberFiadoReqSchema.safeParse({ id: gerarId(), vendaId: gerarId(), valorCentavos: 100, meio: 'dinheiro', caixaId: null, motivo: 'Recebido' }).success).toBe(false);
});
