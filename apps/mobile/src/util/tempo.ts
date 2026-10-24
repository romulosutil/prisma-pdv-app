import { MS_POR_DIA } from '@pdv/shared';

/** Brasília é UTC-3 fixo (sem horário de verão desde 2019). */
const OFFSET_BRASILIA_MS = -3 * 60 * 60 * 1000;

const dois = (n: number): string => String(n).padStart(2, '0');

/** "18:41", no relógio de Brasília. */
export function formatarHora(d: Date): string {
  const b = new Date(d.getTime() + OFFSET_BRASILIA_MS);
  return `${dois(b.getUTCHours())}:${dois(b.getUTCMinutes())}`;
}

/** Instante da meia-noite de Brasília do dia de `d`. */
export function inicioDoDia(d: Date): Date {
  const b = d.getTime() + OFFSET_BRASILIA_MS;
  return new Date(Math.floor(b / MS_POR_DIA) * MS_POR_DIA - OFFSET_BRASILIA_MS);
}

export function mesmoDia(a: Date, b: Date): boolean {
  return inicioDoDia(a).getTime() === inicioDoDia(b).getTime();
}
