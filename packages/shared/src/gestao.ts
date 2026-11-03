import { z } from 'zod';

const id = z.uuid();
const data = z.iso.datetime();
const inteiro = z.number().int().refine(Number.isSafeInteger, 'Valor fora do limite seguro.');
const positivo = inteiro.refine(n => n > 0, 'Informe um valor positivo.');
const motivo = z.string().trim().min(1).max(500);
export const MovimentoEstoqueReqSchema = z.object({
  id, produtoId: id, tipo: z.enum(['entrada', 'ajuste', 'devolucao']),
  quantidadeMilesimos: inteiro.refine(n => n !== 0, 'Quantidade não pode ser zero.'), motivo,
  itemVendaId: id.optional(),
}).strict().superRefine((m, c) => {
  if ((m.tipo !== 'ajuste' && m.quantidadeMilesimos < 0) || (m.tipo === 'devolucao' && !m.itemVendaId) || (m.tipo !== 'devolucao' && m.itemVendaId))
    c.addIssue({ code: 'custom', message: 'Devolução exige item vendido; entrada e devolução são positivas.' });
});
export const MovimentoEstoqueSchema = z.object({
  id, lojaId: id, produtoId: id, tipo: z.enum(['inicial', 'entrada', 'ajuste', 'venda', 'devolucao']),
  quantidadeMilesimos: inteiro, motivo: z.string(), itemVendaId: id.nullable(),
  operadorId: id.nullable(), aparelhoId: id.nullable(), criadoEm: data,
});
export type MovimentoEstoque = z.infer<typeof MovimentoEstoqueSchema>;
export const EstoqueResSchema = z.object({
  saldos: z.array(z.object({ produtoId: id, nome: z.string(), saldoMilesimos: inteiro.nullable(), minimoMilesimos: inteiro.nullable(), negativo: z.boolean() })),
  movimentos: z.array(MovimentoEstoqueSchema),
});
export const ClienteReqSchema = z.object({ id, nome: z.string().trim().min(1).max(150), contato: z.string().trim().max(150) }).strict();
export const ClienteSchema = ClienteReqSchema.extend({ lojaId: id, criadoEm: data });
export type Cliente = z.infer<typeof ClienteSchema>;
export const ReceberFiadoReqSchema = z.object({ id, vendaId: id, valorCentavos: positivo,
  meio: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito']), caixaId: id.nullable(), motivo,
}).strict().refine(r => r.meio !== 'dinheiro' || r.caixaId !== null, 'Recebimento em dinheiro exige turno.');
export const EstornarFiadoReqSchema = z.object({ id, recebimentoId: id, caixaId: id.nullable(), motivo }).strict();
export const EventoFiadoSchema = z.object({ id, lojaId: id, vendaId: id, operadorId: id, aparelhoId: id,
  tipo: z.enum(['recebimento', 'estorno']), valorCentavos: positivo,
  meio: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito']), caixaId: id.nullable(), originalId: id.nullable(), motivo, criadoEm: data,
});
export type EventoFiado = z.infer<typeof EventoFiadoSchema>;
export const FiadoResSchema = z.object({ clientes: z.array(ClienteSchema), titulos: z.array(z.object({
  vendaId: id, clienteId: id, operadorId: id, vencimento: z.iso.date(), valorCentavos: positivo,
  recebidoCentavos: inteiro, saldoCentavos: inteiro, cancelado: z.boolean(), vencido: z.boolean(),
})), eventos: z.array(EventoFiadoSchema) });
export type FiadoRes = z.infer<typeof FiadoResSchema>;
export const LojaReqSchema = z.object({ id, nome: z.string().trim().min(1).max(150) }).strict();
export const ComandoGestaoSchema = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('estoque'), dados: MovimentoEstoqueReqSchema }),
  z.object({ acao: z.literal('cliente'), dados: ClienteReqSchema }),
  z.object({ acao: z.literal('recebimento'), dados: ReceberFiadoReqSchema }),
  z.object({ acao: z.literal('estorno'), dados: EstornarFiadoReqSchema }),
  z.object({ acao: z.literal('loja'), dados: LojaReqSchema }),
]);
export type ComandoGestao = z.infer<typeof ComandoGestaoSchema>;
export const LojaSchema = z.object({ id, contaId: id, nome: z.string(), operadorId: id, papel: z.enum(['dono', 'gerente', 'operador']) });
export const OpcoesRelatorioSchema = z.object({
  lojas: z.array(z.object({ id, nome: z.string() })),
  usuarios: z.array(z.object({ id, nome: z.string(), lojaId: id })),
  turnos: z.array(z.object({ id, operadorId: id, lojaId: id, abertoEm: data, fechadoEm: data.nullable() })),
});
export type OpcoesRelatorio = z.infer<typeof OpcoesRelatorioSchema>;
export const FiltrosRelatorioSchema = z.object({ inicio: data, fim: data, lojaId: z.union([id, z.literal('todas')]).optional(),
  operadorId: id.optional(), caixaId: id.optional(), meio: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito']).optional(),
}).strict().refine(f => Date.parse(f.inicio) < Date.parse(f.fim), 'O fim deve ser posterior ao início (exclusivo).');
export type FiltrosRelatorio = z.infer<typeof FiltrosRelatorioSchema>;
export const CATEGORIAS_RELATORIO = ['venda', 'cancelamento', 'fiado_emitido', 'recebimento_venda', 'recebimento_fiado', 'estorno_fiado',
  'suprimento', 'sangria', 'retirada', 'devolucao', 'transferencia_entrada', 'transferencia_saida', 'correcao_entrada', 'correcao_saida', 'diferenca'] as const;
export const ROTULOS_RELATORIO: Record<typeof CATEGORIAS_RELATORIO[number], string> = {
  venda: 'Vendas realizadas', cancelamento: 'Vendas canceladas', fiado_emitido: 'Crédito concedido', recebimento_venda: 'Recebimentos na venda',
  recebimento_fiado: 'Recebimentos de fiado', estorno_fiado: 'Devoluções de fiado', suprimento: 'Entradas externas', sangria: 'Sangrias', retirada: 'Retiradas',
  devolucao: 'Devoluções em dinheiro', transferencia_entrada: 'Transferências recebidas', transferencia_saida: 'Transferências enviadas',
  correcao_entrada: 'Correções de entrada', correcao_saida: 'Correções de saída', diferenca: 'Diferenças de fechamento',
};
export const LinhaRelatorioSchema = z.object({ id: z.string(), lojaId: id, operadorId: id, autorOperadorId: id.optional(), caixaId: id.nullable(),
  em: data, categoria: z.enum(CATEGORIAS_RELATORIO), meio: z.string().nullable(), valorCentavos: inteiro, descricao: z.string(),
});
export type LinhaRelatorio = z.infer<typeof LinhaRelatorioSchema>;
export const RelatorioSchema = z.object({ filtros: FiltrosRelatorioSchema, linhas: z.array(LinhaRelatorioSchema),
  totais: z.record(z.string(), inteiro), confirmadoEm: data });
export type Relatorio = z.infer<typeof RelatorioSchema>;

/** Eventos são filtrados por seu próprio instante, responsável e turno, nunca por proximidade de data. */
export function montarRelatorio(eventos: LinhaRelatorio[], filtros: FiltrosRelatorio, confirmadoEm: string): Relatorio {
  FiltrosRelatorioSchema.parse(filtros);
  const linhas = eventos.filter(l => Date.parse(l.em) >= Date.parse(filtros.inicio) && Date.parse(l.em) < Date.parse(filtros.fim) &&
    (!filtros.lojaId || filtros.lojaId === 'todas' || l.lojaId === filtros.lojaId) &&
    (!filtros.operadorId || l.operadorId === filtros.operadorId) && (!filtros.caixaId || l.caixaId === filtros.caixaId) &&
    (!filtros.meio || l.meio === filtros.meio)).sort((a, b) => a.em.localeCompare(b.em) || a.id.localeCompare(b.id));
  const totais: Record<string, number> = Object.fromEntries(CATEGORIAS_RELATORIO.map(c => [c, 0]));
  for (const l of linhas) { totais[l.categoria] = inteiro.parse(totais[l.categoria]! + l.valorCentavos); }
  return { filtros, linhas, totais, confirmadoEm };
}

/** Mesmo snapshot e totais da tela. Neutraliza fórmulas também em nomes e descrições. */
export function csvRelatorio(r: Relatorio): string {
  const celula = (v: unknown) => typeof v === 'number' ? String(v) : '"' + String(v ?? '').replace(/^[\s\uFEFF]*[=+@-]/, m => "'" + m).replace(/"/g, '""') + '"';
  const linhas: unknown[][] = [['tipo', 'id', 'loja', 'operador', 'turno', 'instante', 'categoria', 'meio', 'centavos', 'descricao', 'autor'],
    ['filtros', '', r.filtros.lojaId ?? '', r.filtros.operadorId ?? '', r.filtros.caixaId ?? '', `${r.filtros.inicio} / ${r.filtros.fim}`, '', r.filtros.meio ?? '', '', 'Fim exclusivo; somente dados confirmados', ''],
    ...r.linhas.map(l => ['evento', l.id, l.lojaId, l.operadorId, l.caixaId, l.em, l.categoria, l.meio, l.valorCentavos, l.descricao, l.autorOperadorId]),
    ...Object.entries(r.totais).map(([c, n]) => ['total', '', '', '', '', '', c, '', n, '', ''])];
  return '\uFEFF' + linhas.map(l => l.map(celula).join(';')).join('\r\n');
}
