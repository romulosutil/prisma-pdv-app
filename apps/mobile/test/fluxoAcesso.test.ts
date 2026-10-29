import { describe, expect, it } from 'vitest';
import { decidirRota } from '../src/nucleo/fluxo';

const base = { temConta: true, assinatura: null, agora: new Date('2026-10-29T12:00:00.000Z'), reautenticacaoNecessaria: true };

describe('recuperação de acesso e checkout em andamento', () => {
  it('solicita login com identidade local e nenhuma credencial, sem permitir nova venda', () => {
    expect(decidirRota(base, ['(tabs)'])).toBe('/entrar');
    expect(decidirRota(base, ['vender'])).toBe('/entrar');
    expect(decidirRota(base, ['pagar'])).toBe('/entrar');
    expect(decidirRota(base, ['(onboarding)', 'entrar'])).toBeNull();
  });

  it('mantém o checkout iniciado acessível mesmo sem sessão/licença nova', () => {
    const emAndamento = { ...base, vendaEmAndamento: true };
    expect(decidirRota(emAndamento, ['pagar', 'dividir'])).toBeNull();
    expect(decidirRota(emAndamento, ['pagar', 'sucesso'])).toBeNull();
    expect(decidirRota(emAndamento, ['vender'])).toBeNull();
    expect(decidirRota(emAndamento, ['(tabs)'])).toBe('/entrar');
  });

  it('ao encerrar o checkout exige autenticação antes da venda seguinte', () => {
    expect(decidirRota({ ...base, vendaEmAndamento: false }, ['vender'])).toBe('/entrar');
  });

  it('não permite checkout sem uma identidade de conta', () => {
    expect(decidirRota({ ...base, temConta: false, vendaEmAndamento: true }, ['pagar'])).toBe('/boas-vindas');
  });
});
