import { expect, it } from 'vitest';
import { dataDigitada, intervaloDatas, textoData } from '../src/telas/gestao/datas';

it('datas civis de Brasília incluem os dois dias escolhidos sem depender do fuso da máquina', () => {
  expect(intervaloDatas('01/11/2026', '02/11/2026')).toEqual({ inicio: '2026-11-01T03:00:00.000Z', fim: '2026-11-03T03:00:00.000Z' });
  expect(textoData(new Date('2026-11-02T02:59:59.000Z'))).toBe('01/11/2026');
  expect(dataDigitada('29/02/2024')).toBe('2024-02-29');
  for (const invalida of ['29/02/2026', '31/04/2026', '2026-11-02', '00/11/2026', '01/13/2026']) expect(() => dataDigitada(invalida)).toThrow();
});
