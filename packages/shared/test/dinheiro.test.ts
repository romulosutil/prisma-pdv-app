import { describe, expect, it } from 'vitest';
import { formatarBRL, multiplicarPreco, parseBRL, somar } from '../src';

describe('formatarBRL', () => {
  it('formata com milhar e vírgula', () => {
    expect(formatarBRL(128450)).toBe('R$ 1.284,50');
    expect(formatarBRL(123456789)).toBe('R$ 1.234.567,89');
  });

  it('formata zero, centavos soltos e valores pequenos', () => {
    expect(formatarBRL(0)).toBe('R$ 0,00');
    expect(formatarBRL(5)).toBe('R$ 0,05');
    expect(formatarBRL(1200)).toBe('R$ 12,00');
  });

  it('formata negativos com sinal antes do R$', () => {
    expect(formatarBRL(-500)).toBe('-R$ 5,00');
    expect(formatarBRL(-128450)).toBe('-R$ 1.284,50');
  });

  it('usa espaço normal depois do R$', () => {
    expect(formatarBRL(100).charCodeAt(2)).toBe(0x20);
  });

  it('rejeita valores que não são inteiros', () => {
    expect(() => formatarBRL(10.5)).toThrow(RangeError);
    expect(() => formatarBRL(Number.NaN)).toThrow(RangeError);
  });
});

describe('parseBRL', () => {
  it('lê os formatos de digitação comuns', () => {
    expect(parseBRL('1.284,50')).toBe(128450);
    expect(parseBRL('R$ 12,00')).toBe(1200);
    expect(parseBRL('12')).toBe(1200);
    expect(parseBRL('1284,50')).toBe(128450);
    expect(parseBRL('0,5')).toBe(50);
    expect(parseBRL('R$ 1.000')).toBe(100000);
  });

  it('lê negativos e zero', () => {
    expect(parseBRL('-R$ 5,00')).toBe(-500);
    expect(parseBRL('R$ -5,00')).toBe(-500);
    expect(parseBRL('0')).toBe(0);
    expect(parseBRL('-0,00')).toBe(0);
  });

  it('lê ponto decimal', () => {
    expect(parseBRL('12.5')).toBe(1250);
    expect(parseBRL('1284.50')).toBe(128450);
  });

  it('devolve null para lixo', () => {
    for (const texto of ['', 'abc', '12,345', '1,2,3', 'R$', '12,']) {
      expect(parseBRL(texto)).toBeNull();
    }
  });

  it('é inverso de formatarBRL', () => {
    for (const c of [0, 1, 99, 100, 128450, -12345, 99999999]) {
      expect(parseBRL(formatarBRL(c))).toBe(c);
    }
  });
});

describe('multiplicarPreco', () => {
  it('unidades inteiras (1 un = 1000)', () => {
    expect(multiplicarPreco(529, 3000)).toBe(1587);
    expect(multiplicarPreco(2790, 1000)).toBe(2790);
  });

  it('itens por kg, com arredondamento meio para cima', () => {
    expect(multiplicarPreco(1690, 350)).toBe(592); // 5,915
    expect(multiplicarPreco(699, 1250)).toBe(874); // 8,7375
    expect(multiplicarPreco(1, 500)).toBe(1);
    expect(multiplicarPreco(1, 499)).toBe(0);
  });

  it('é simétrico para negativos e nunca devolve -0', () => {
    expect(multiplicarPreco(-1690, 350)).toBe(-592);
    expect(multiplicarPreco(-1, 499)).toBe(0);
    expect(Object.is(multiplicarPreco(-1, 499), -0)).toBe(false);
  });

  it('rejeita quantidade fracionária', () => {
    expect(() => multiplicarPreco(100, 0.5)).toThrow(RangeError);
  });
});

describe('somar', () => {
  it('soma inteiros sem erro de ponto flutuante', () => {
    expect(somar(1010, 2020, 30)).toBe(3060);
    expect(somar()).toBe(0);
    // 0,1 + 0,2 em reais seria 0.30000000000000004
    expect(somar(10, 20)).toBe(30);
  });

  it('o carrinho de demonstração fecha em R$ 56,05', () => {
    const total = somar(2790, 849, multiplicarPreco(529, 3000), 379);
    expect(formatarBRL(total)).toBe('R$ 56,05');
  });

  it('rejeita não inteiros', () => {
    expect(() => somar(1, 0.5)).toThrow(RangeError);
  });
});
