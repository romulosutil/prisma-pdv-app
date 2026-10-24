import { describe, expect, it } from 'vitest';
import { cnpjValido, cpfValido, formatarDocumento, validarDocumento } from '@/util/documento';

describe('cpfValido', () => {
  it('aceita CPFs com dígitos verificadores corretos, com ou sem máscara', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('111.444.777-35')).toBe(true);
  });

  it('rejeita dígito verificador errado, repetidos e tamanho errado', () => {
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('123')).toBe(false);
  });
});

describe('cnpjValido', () => {
  it('aceita CNPJs com dígitos verificadores corretos', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11222333000181')).toBe(true);
  });

  it('rejeita dígito verificador errado e repetidos', () => {
    expect(cnpjValido('11.222.333/0001-80')).toBe(false);
    expect(cnpjValido('00.000.000/0000-00')).toBe(false);
  });
});

describe('formatarDocumento', () => {
  it('aplica a máscara de CPF progressivamente', () => {
    expect(formatarDocumento('5')).toBe('5');
    expect(formatarDocumento('5299')).toBe('529.9');
    expect(formatarDocumento('529982')).toBe('529.982');
    expect(formatarDocumento('5299822')).toBe('529.982.2');
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25');
  });

  it('troca para a máscara de CNPJ a partir do 12º dígito e limita em 14', () => {
    expect(formatarDocumento('112223330001')).toBe('11.222.333/0001');
    expect(formatarDocumento('11222333000181999')).toBe('11.222.333/0001-81');
  });

  it('ignora o que não é dígito', () => {
    expect(formatarDocumento('abc529.982x')).toBe('529.982');
  });
});

describe('validarDocumento', () => {
  it('devolve o tipo e os dígitos quando válido', () => {
    expect(validarDocumento('529.982.247-25')).toEqual({ ok: true, tipo: 'cpf', digitos: '52998224725' });
    expect(validarDocumento('11.222.333/0001-81')).toEqual({ ok: true, tipo: 'cnpj', digitos: '11222333000181' });
  });

  it('separa incompleto de inválido', () => {
    expect(validarDocumento('529.982')).toEqual({ ok: false, motivo: 'incompleto' });
    expect(validarDocumento('529.982.247-24')).toEqual({ ok: false, motivo: 'invalido' });
    expect(validarDocumento('11.222.333/0001-80')).toEqual({ ok: false, motivo: 'invalido' });
  });
});
