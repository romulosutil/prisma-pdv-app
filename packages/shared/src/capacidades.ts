import type { PagamentoVenda } from './contrato';
import { MOTIVOS_CONFIRMACAO_MANUAL } from './rotulos';

/** Pagamentos integrados (Mercado Pago e InfinitePay) habilitados para o MVP. */
export const PAGAMENTOS_INTEGRADOS_HABILITADOS = true;

/** Campo omitido no domínio local é normalizado para null ao gravar a venda. */
export function pagamentoManualDisponivel(p: {
  meio: PagamentoVenda['meio'];
  provedor?: PagamentoVenda['provedor'] | null;
  confirmacao?: PagamentoVenda['confirmacao'];
}): boolean {
  if (p.confirmacao === 'manual') return p.meio !== 'tap';
  if (p.provedor === 'stone' || p.provedor === 'outro') return p.meio !== 'tap';
  return p.provedor == null &&
    (p.meio === 'dinheiro' || p.meio === 'pix' || p.meio === 'cartao_credito' || p.meio === 'cartao_debito');
}

export function motivoConfirmacaoManual(
  provedor: PagamentoVenda['provedor'] | null | undefined,
  meio: PagamentoVenda['meio'],
): string {
  if (meio === 'tap' && provedor === 'infinitepay') return MOTIVOS_CONFIRMACAO_MANUAL.infinitetap;
  if (provedor === 'stone') return MOTIVOS_CONFIRMACAO_MANUAL.stone;
  if (provedor === 'mercadopago') return MOTIVOS_CONFIRMACAO_MANUAL.mercadopago_point;
  if (provedor === 'infinitepay') return MOTIVOS_CONFIRMACAO_MANUAL.infinitepay_estorno;
  return MOTIVOS_CONFIRMACAO_MANUAL.outro;
}
