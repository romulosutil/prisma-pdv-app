import { describe, expect, it } from 'vitest';
import {
  adicionarDias,
  adicionarMeses,
  diferencaEmDias,
  formatarData,
  formatarDataCurta,
  gerarId,
  RelogioFalso,
  relogioSistema,
} from '../src';

describe('datas', () => {
  it('adicionarDias', () => {
    expect(adicionarDias(new Date('2026-10-23T12:00:00Z'), 7).toISOString()).toBe('2026-10-30T12:00:00.000Z');
    expect(adicionarDias(new Date('2026-10-23T12:00:00Z'), -2).toISOString()).toBe('2026-10-21T12:00:00.000Z');
  });

  it('adicionarMeses usa o último dia de meses curtos e preserva o horário', () => {
    expect(adicionarMeses(new Date('2026-01-31T15:30:00Z'), 1).toISOString()).toBe('2026-02-28T15:30:00.000Z');
    expect(adicionarMeses(new Date('2026-12-15T00:00:00Z'), 1).toISOString()).toBe('2027-01-15T00:00:00.000Z');
    expect(adicionarMeses(new Date('2026-02-28T00:00:00Z'), 1, 31).toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });

  it('diferencaEmDias conta dias corridos de calendário em UTC', () => {
    expect(diferencaEmDias(new Date('2026-10-23T23:00:00Z'), new Date('2026-10-30T01:00:00Z'))).toBe(7);
    expect(diferencaEmDias(new Date('2026-10-30T12:00:00Z'), new Date('2026-10-23T12:00:00Z'))).toBe(-7);
    expect(diferencaEmDias(new Date('2026-10-23T00:00:00Z'), new Date('2026-10-23T23:59:59Z'))).toBe(0);
  });

  it('formata no calendário de Brasília', () => {
    expect(formatarDataCurta(new Date('2026-10-30T12:00:00Z'))).toBe('30/10');
    expect(formatarData(new Date('2026-10-30T12:00:00Z'))).toBe('30/10/2026');
    expect(formatarData(new Date('2026-01-05T12:00:00Z'))).toBe('05/01/2026');
    // 01h UTC ainda é a noite anterior em Brasília
    expect(formatarData(new Date('2026-11-01T01:00:00Z'))).toBe('31/10/2026');
  });
});

describe('relógio', () => {
  it('RelogioFalso avança e redefine sem alterar datas já entregues', () => {
    const relogio = new RelogioFalso(new Date('2026-10-23T12:00:00Z'));
    const antes = relogio.agora();
    relogio.avancarDias(7);
    relogio.avancarHoras(6);
    expect(relogio.agora().toISOString()).toBe('2026-10-30T18:00:00.000Z');
    expect(antes.toISOString()).toBe('2026-10-23T12:00:00.000Z');
    relogio.definir(new Date('2027-01-01T00:00:00Z'));
    expect(relogio.agora().toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('relogioSistema devolve o instante atual', () => {
    expect(Math.abs(relogioSistema.agora().getTime() - Date.now())).toBeLessThan(1000);
  });
});

describe('gerarId (UUID v7)', () => {
  const formatoV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('tem o formato do UUID v7', () => {
    expect(gerarId()).toMatch(formatoV7);
  });

  it('codifica o timestamp nos 48 primeiros bits, versão 7 e variante 10', () => {
    const id = gerarId({ agoraMs: 0x018f_1234_5678, bytesAleatorios: () => new Uint8Array(10).fill(0xff) });
    expect(id).toBe('018f1234-5678-7fff-bfff-ffffffffffff');
    const zeros = gerarId({ agoraMs: 0, bytesAleatorios: () => new Uint8Array(10) });
    expect(zeros).toBe('00000000-0000-7000-8000-000000000000');
  });

  it('usa a fonte de bytes injetada e valida o tamanho', () => {
    const pedidos: number[] = [];
    gerarId({ bytesAleatorios: (n) => (pedidos.push(n), new Uint8Array(n)) });
    expect(pedidos).toEqual([10]);
    expect(() => gerarId({ bytesAleatorios: () => new Uint8Array(3) })).toThrow();
  });

  it('ids gerados em instantes crescentes ordenam como texto', () => {
    const ids = [1, 2, 3, 1000, 100000].map((agoraMs) => gerarId({ agoraMs: 1_780_000_000_000 + agoraMs }));
    expect([...ids].sort()).toEqual(ids);
  });

  it('não repete', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => gerarId()));
    expect(ids.size).toBe(2000);
  });
});
