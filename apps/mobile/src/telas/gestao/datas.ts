import { partesDaData } from '@pdv/shared';

export function textoData(d: Date): string {
  const { dia, mes, ano } = partesDaData(d);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
}
export function dataDigitada(texto: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) throw new Error('Informe uma data no formato DD/MM/AAAA.');
  const iso = `${m[3]}-${m[2]}-${m[1]}`, d = new Date(`${iso}T03:00:00.000Z`);
  if (!Number.isFinite(d.getTime()) || textoData(d) !== texto) throw new Error('A data informada não existe.');
  return iso;
}
export function intervaloDatas(inicio: string, fim: string) {
  return { inicio: new Date(`${dataDigitada(inicio)}T03:00:00.000Z`).toISOString(),
    fim: new Date(Date.parse(`${dataDigitada(fim)}T03:00:00.000Z`) + 86400000).toISOString() };
}
