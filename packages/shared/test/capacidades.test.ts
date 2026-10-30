import { expect, it } from 'vitest';
import { pagamentoManualDisponivel, PAGAMENTOS_INTEGRADOS_HABILITADOS } from '../src/capacidades';

it('mantém as integrações fora da oferta inicial', () => {
  expect(PAGAMENTOS_INTEGRADOS_HABILITADOS).toBe(false);
});

for (const meio of ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'tap'] as const) {
  it(`decide disponibilidade de ${meio} pelo meio e provedor`, () => {
    expect(pagamentoManualDisponivel({ meio, provedor: null })).toBe(meio !== 'tap');
    expect(pagamentoManualDisponivel({ meio })).toBe(meio !== 'tap');
    expect(pagamentoManualDisponivel({ meio, provedor: 'infinitepay' })).toBe(false);
    expect(pagamentoManualDisponivel({ meio, provedor: 'mercadopago' })).toBe(false);
  });
}
