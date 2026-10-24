export const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Brasil não tem horário de verão desde 2019: Brasília é UTC-3 fixo. */
const OFFSET_BRASILIA_MS = -3 * 60 * 60 * 1000;

export function adicionarDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_POR_DIA);
}

/**
 * Soma meses civis em UTC. Se o mês de destino é mais curto, usa o último dia
 * (31/01 + 1 mês = 28/02). `diaPreferido` permite voltar ao dia de ancoragem
 * original depois de um mês curto (28/02 + 1 mês com dia 31 = 31/03).
 */
export function adicionarMeses(d: Date, n: number, diaPreferido: number = d.getUTCDate()): Date {
  const mesAlvo = d.getUTCMonth() + n;
  const ultimoDia = new Date(Date.UTC(d.getUTCFullYear(), mesAlvo + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      mesAlvo,
      Math.min(diaPreferido, ultimoDia),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
}

function inicioDoDiaUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Dias corridos (datas de calendário em UTC) de `de` até `ate`. */
export function diferencaEmDias(de: Date, ate: Date): number {
  return Math.round((inicioDoDiaUTC(ate) - inicioDoDiaUTC(de)) / MS_POR_DIA);
}

/** Dia, mês e ano no calendário de Brasília. */
export function partesDaData(d: Date): { dia: number; mes: number; ano: number } {
  const b = new Date(d.getTime() + OFFSET_BRASILIA_MS);
  return { dia: b.getUTCDate(), mes: b.getUTCMonth() + 1, ano: b.getUTCFullYear() };
}

const dois = (n: number): string => String(n).padStart(2, '0');

/** "30/10", no calendário de Brasília. */
export function formatarDataCurta(d: Date): string {
  const { dia, mes } = partesDaData(d);
  return `${dois(dia)}/${dois(mes)}`;
}

/** "30/10/2026", no calendário de Brasília. */
export function formatarData(d: Date): string {
  const { dia, mes, ano } = partesDaData(d);
  return `${dois(dia)}/${dois(mes)}/${ano}`;
}
