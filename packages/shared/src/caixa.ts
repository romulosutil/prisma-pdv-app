import type { Caixa, MovimentoCaixa, Venda } from './contrato';

export const ROTULOS_MOVIMENTO: Record<MovimentoCaixa['tipo'], string> = {
  recebimento_fiado: 'Recebimento de fiado', estorno_fiado: 'Estorno de fiado', suprimento: 'Entrada', sangria: 'Sangria', retirada: 'Retirada', transferencia_entrada: 'Transferência recebida', transferencia_saida: 'Transferência enviada', devolucao: 'Devolução em dinheiro', correcao_entrada: 'Correção de entrada', correcao_saida: 'Correção de saída',
};
export function sinalMovimento(tipo: MovimentoCaixa['tipo']): 1 | -1 {
  return ['suprimento', 'transferencia_entrada', 'correcao_entrada', 'recebimento_fiado'].includes(tipo) ? 1 : -1;
}
/** Pagamento.valorCentavos já é líquido; troco é informativo e não deve ser subtraído novamente.
 * Cancelamento comercial não devolve numerário. Só o evento de devolução reduz a gaveta. */
export function saldoDoCaixa(caixa: Caixa, vendas: readonly Venda[]): number {
  return caixa.abertura.trocoInicialCentavos
    + vendas.filter(v => v.caixaId === caixa.id).flatMap(v => v.pagamentos).filter(p => p.meio === 'dinheiro').reduce((s, p) => s + p.valorCentavos, 0)
    + caixa.movimentos.reduce((s, m) => s + sinalMovimento(m.tipo) * m.valorCentavos, 0);
}
