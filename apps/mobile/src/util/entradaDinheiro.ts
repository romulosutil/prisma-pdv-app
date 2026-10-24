import type { Centavos } from '@pdv/shared';

export type TeclaNumerica = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | 'apagar';

/** Digitação "de trás para frente": cada dígito entra pela direita (1, 12, 123 -> R$ 1,23). */
export function aplicarTecla(atual: Centavos, tecla: TeclaNumerica, maximo: Centavos = 99_999_999): Centavos {
  if (tecla === 'apagar') return Math.floor(atual / 10);
  const proximo = atual * 10 ** tecla.length + Number(tecla);
  return proximo > maximo ? atual : proximo;
}
