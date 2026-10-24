import { describe, expect, it } from 'vitest';
import { formatarValidade, validarCartao } from '@/util/cartao';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { aplicarTecla } from '@/util/entradaDinheiro';
import { destaquesDoPlano } from '@/util/planos';
import { formatarHora, inicioDoDia, mesmoDia } from '@/util/tempo';
import { PLANOS } from '@pdv/shared';

describe('falarDinheiro', () => {
  it('lê reais e centavos de forma natural', () => {
    expect(falarDinheiro(3490)).toBe('34 reais e 90 centavos');
    expect(falarDinheiro(100)).toBe('1 real');
    expect(falarDinheiro(101)).toBe('1 real e 1 centavo');
    expect(falarDinheiro(90)).toBe('90 centavos');
    expect(falarDinheiro(0)).toBe('0 reais');
    expect(falarDinheiro(-550)).toBe('menos 5 reais e 50 centavos');
  });
});

describe('aplicarTecla', () => {
  it('digita de trás para frente em centavos', () => {
    let v = 0;
    for (const t of ['1', '2', '3'] as const) v = aplicarTecla(v, t);
    expect(v).toBe(123);
    expect(aplicarTecla(v, '00')).toBe(12_300);
    expect(aplicarTecla(v, 'apagar')).toBe(12);
    expect(aplicarTecla(0, 'apagar')).toBe(0);
  });

  it('não passa do máximo', () => {
    expect(aplicarTecla(5000, '9', 50_000)).toBe(5000);
  });
});

describe('tempo (Brasília)', () => {
  it('formata a hora e acha o início do dia em UTC-3', () => {
    const d = new Date('2026-10-23T21:41:00.000Z');
    expect(formatarHora(d)).toBe('18:41');
    expect(inicioDoDia(d).toISOString()).toBe('2026-10-23T03:00:00.000Z');
    expect(mesmoDia(d, new Date('2026-10-24T02:59:00.000Z'))).toBe(true);
    expect(mesmoDia(d, new Date('2026-10-24T03:00:00.000Z'))).toBe(false);
  });
});

describe('cartão', () => {
  it('formata a validade', () => {
    expect(formatarValidade('1')).toBe('1');
    expect(formatarValidade('122')).toBe('12/2');
    expect(formatarValidade('1227')).toBe('12/27');
  });

  it('acusa todos os campos inválidos de uma vez', () => {
    const erros = validarCartao({ numero: '1234', validade: '13/20', cvv: '1', nome: '' }, new Date('2026-10-23T12:00:00Z'));
    expect(Object.keys(erros).sort()).toEqual(['cvv', 'nome', 'numero', 'validade']);
    expect(validarCartao({ numero: '4242 4242 4242 4242', validade: '12/30', cvv: '123', nome: 'Ana' }, new Date('2026-10-23T12:00:00Z'))).toEqual({});
  });
});

describe('destaquesDoPlano', () => {
  it('deriva as linhas dos limites do catálogo', () => {
    expect(destaquesDoPlano(PLANOS.essencial)).toEqual([
      'Vendas ilimitadas',
      'Até 500 produtos',
      '1 aparelho e 1 operador',
      'Histórico de 90 dias',
    ]);
    expect(destaquesDoPlano(PLANOS.negocio)).toContain('Produtos ilimitados');
    expect(destaquesDoPlano(PLANOS.pro)).toContain('3 lojas');
  });
});
