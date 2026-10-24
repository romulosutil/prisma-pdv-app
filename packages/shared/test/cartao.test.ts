import { describe, expect, it } from 'vitest';
import { CARTOES_TESTE, cvvValido, detectarBandeira, formatarNumeroCartao, luhnValido, validadeValida } from '../src';

describe('luhnValido', () => {
  it('aceita números válidos, com ou sem separadores', () => {
    expect(luhnValido('4242424242424242')).toBe(true);
    expect(luhnValido('4242 4242 4242 4242')).toBe(true);
    expect(luhnValido('4000-0000-0000-0002')).toBe(true);
    expect(luhnValido('378282246310005')).toBe(true);
    expect(luhnValido('5555555555554444')).toBe(true);
  });

  it('recusa dígito trocado, tamanho errado e letras', () => {
    expect(luhnValido('4242424242424241')).toBe(false);
    expect(luhnValido('4242')).toBe(false);
    expect(luhnValido('4242 4242 4242 42a2')).toBe(false);
    expect(luhnValido('')).toBe(false);
  });

  it('os cartões de teste passam no Luhn', () => {
    for (const c of Object.values(CARTOES_TESTE)) expect(luhnValido(c.numero)).toBe(true);
  });
});

describe('detectarBandeira', () => {
  it.each([
    ['4242424242424242', 'visa'],
    ['4000000000000002', 'visa'],
    ['5555555555554444', 'mastercard'],
    ['2223003122003222', 'mastercard'],
    ['378282246310005', 'amex'],
    ['341111111111111', 'amex'],
    ['6062821234567890', 'hipercard'],
    ['3841001111222233', 'hipercard'],
    ['9999999999999999', 'desconhecida'],
    ['', 'desconhecida'],
  ] as const)('%s -> %s', (numero, esperada) => {
    expect(detectarBandeira(numero)).toBe(esperada);
  });

  it('Elo é testada antes de Visa e Mastercard', () => {
    expect(detectarBandeira('4011781111111111')).toBe('elo');
    expect(detectarBandeira('4389351111111111')).toBe('elo');
    expect(detectarBandeira('5066991111111111')).toBe('elo');
    expect(detectarBandeira('6504051111111111')).toBe('elo');
    expect(detectarBandeira('5090001111111111')).toBe('elo');
  });

  it('ignora espaços', () => {
    expect(detectarBandeira('4011 78')).toBe('elo');
  });
});

describe('formatarNumeroCartao', () => {
  it('agrupa em 4-4-4-4', () => {
    expect(formatarNumeroCartao('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatarNumeroCartao('42424')).toBe('4242 4');
    expect(formatarNumeroCartao('4242-4242 4242.4242')).toBe('4242 4242 4242 4242');
  });

  it('Amex em 4-6-5', () => {
    expect(formatarNumeroCartao('378282246310005')).toBe('3782 822463 10005');
    expect(formatarNumeroCartao('37828224')).toBe('3782 8224');
  });

  it('limita o tamanho', () => {
    expect(formatarNumeroCartao('3782822463100059999')).toBe('3782 822463 10005');
  });
});

describe('validadeValida', () => {
  const agora = new Date('2026-10-23T12:00:00Z');

  it('aceita o mês atual inteiro e datas futuras', () => {
    expect(validadeValida('10/26', agora)).toBe(true);
    expect(validadeValida('11/26', agora)).toBe(true);
    expect(validadeValida('01/30', agora)).toBe(true);
  });

  it('recusa vencidos, formato ruim e mês inexistente', () => {
    expect(validadeValida('09/26', agora)).toBe(false);
    expect(validadeValida('12/25', agora)).toBe(false);
    expect(validadeValida('13/27', agora)).toBe(false);
    expect(validadeValida('00/27', agora)).toBe(false);
    expect(validadeValida('1/27', agora)).toBe(false);
    expect(validadeValida('10/2027', agora)).toBe(false);
  });

  it('recusa datas absurdamente distantes', () => {
    expect(validadeValida('10/60', agora)).toBe(false);
  });
});

describe('cvvValido', () => {
  it('3 dígitos, 4 para Amex', () => {
    expect(cvvValido('123', 'visa')).toBe(true);
    expect(cvvValido('1234', 'visa')).toBe(false);
    expect(cvvValido('1234', 'amex')).toBe(true);
    expect(cvvValido('123', 'amex')).toBe(false);
    expect(cvvValido('12a', 'visa')).toBe(false);
    expect(cvvValido('123', 'desconhecida')).toBe(true);
    expect(cvvValido('1234', 'desconhecida')).toBe(true);
  });
});
