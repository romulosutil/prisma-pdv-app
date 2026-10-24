import type { Centavos } from '@pdv/shared';

/** Marca de ordem de bytes UTF-8: sem ela o Excel em português lê os acentos errado. */
const BOM = '\uFEFF';
/** Excel pt-BR usa `;` porque a vírgula é o separador decimal. */
const SEPARADOR = ';';
const QUEBRA_DE_LINHA = '\r\n';

/** Texto digitado pelo usuário que começa com = + - @ viraria fórmula na planilha; o apóstrofo mantém como texto. */
export function neutralizarFormula(texto: string): string {
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

/** Aspas só quando preciso: o campo tem `;`, aspas ou quebra de linha. Aspas internas são dobradas. */
export function escaparCelula(valor: string): string {
  return /[;"\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** CSV completo: BOM, linhas separadas por CRLF e uma quebra no fim. */
export function montarCsv(linhas: readonly (readonly string[])[]): string {
  const corpo = linhas.map((linha) => linha.map(escaparCelula).join(SEPARADOR)).join(QUEBRA_DE_LINHA);
  return `${BOM}${corpo}${QUEBRA_DE_LINHA}`;
}

/** 123456 -> "1234,56": vírgula decimal e sem separador de milhar, para a planilha ler como número. */
export function decimalBR(centavos: Centavos): string {
  const abs = Math.abs(centavos);
  return `${centavos < 0 ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

/** Quantidade em milésimos: 1000 -> "1", 350 -> "0,350", 1500 -> "1,500". */
export function quantidadeBR(milesimos: number): string {
  if (milesimos % 1000 === 0) return String(milesimos / 1000);
  return `${Math.floor(milesimos / 1000)},${String(milesimos % 1000).padStart(3, '0')}`;
}
