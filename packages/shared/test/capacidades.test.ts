import { expect, it } from 'vitest';
import { motivoConfirmacaoManual, pagamentoManualDisponivel, PAGAMENTOS_INTEGRADOS_HABILITADOS } from '../src/capacidades';

it('habilita as integrações do MVP', () => {
  expect(PAGAMENTOS_INTEGRADOS_HABILITADOS).toBe(true);
});

for (const meio of ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'tap'] as const) {
  it(`decide disponibilidade manual de ${meio} pelo meio, provedor e confirmacao`, () => {
    expect(pagamentoManualDisponivel({ meio, provedor: null })).toBe(meio !== 'tap');
    expect(pagamentoManualDisponivel({ meio })).toBe(meio !== 'tap');
    expect(pagamentoManualDisponivel({ meio, provedor: 'infinitepay' })).toBe(false);
    expect(pagamentoManualDisponivel({ meio, provedor: 'mercadopago' })).toBe(false);
    expect(pagamentoManualDisponivel({ meio, provedor: 'stone' })).toBe(meio !== 'tap');
    expect(pagamentoManualDisponivel({ meio, provedor: 'outro' })).toBe(meio !== 'tap');
    expect(pagamentoManualDisponivel({ meio, provedor: 'infinitepay', confirmacao: 'manual' })).toBe(meio !== 'tap');
    expect(pagamentoManualDisponivel({ meio, provedor: 'mercadopago', confirmacao: 'manual' })).toBe(meio !== 'tap');
  });
}

it('explica o motivo documental para maquininhas manuais', () => {
  expect(motivoConfirmacaoManual('stone', 'cartao_credito')).toContain('parceria');
  expect(motivoConfirmacaoManual('infinitepay', 'tap')).toContain('deeplink');
  expect(motivoConfirmacaoManual('mercadopago', 'cartao_debito')).toContain('Point');
});
