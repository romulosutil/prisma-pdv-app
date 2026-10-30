import type { PagamentoVenda } from './contrato';

/** Integrações só poderão ser ofertadas depois da implementação e homologação próprias. */
export const PAGAMENTOS_INTEGRADOS_HABILITADOS = false;

/** Campo omitido no domínio local é normalizado para null ao gravar a venda. */
export function pagamentoManualDisponivel(p: { meio: PagamentoVenda['meio']; provedor?: PagamentoVenda['provedor'] }): boolean {
  return p.provedor == null &&
    (p.meio === 'dinheiro' || p.meio === 'pix' || p.meio === 'cartao_credito' || p.meio === 'cartao_debito');
}
