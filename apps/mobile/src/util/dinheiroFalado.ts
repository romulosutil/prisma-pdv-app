import type { Centavos } from '@pdv/shared';

/** Valor lido de forma natural por leitores de tela: "34 reais e 90 centavos". */
export function falarDinheiro(c: Centavos): string {
  const abs = Math.abs(c);
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  const partes: string[] = [];
  if (reais > 0 || centavos === 0) partes.push(reais === 1 ? '1 real' : `${reais} reais`);
  if (centavos > 0) partes.push(centavos === 1 ? '1 centavo' : `${centavos} centavos`);
  return `${c < 0 ? 'menos ' : ''}${partes.join(' e ')}`;
}
