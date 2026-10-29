/** Valor monetário em centavos, sempre inteiro. Nunca acumular em float. */
export type Centavos = number;

function exigirInteiro(valor: number, nome: string): void {
  if (!Number.isSafeInteger(valor)) {
    throw new RangeError(`${nome} deve ser um inteiro seguro, recebido: ${valor}`);
  }
}

export function formatarBRL(c: Centavos): string {
  exigirInteiro(c, 'centavos');
  const abs = Math.abs(c);
  const reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = String(abs % 100).padStart(2, '0');
  return `${c < 0 ? '-' : ''}R$ ${reais},${centavos}`;
}

const COM_MILHAR = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;
const DECIMAL_PONTO = /^(-?)(\d+)\.(\d{1,2})$/;

/**
 * Aceita "1.284,50", "R$ 12,00", "-R$ 5,00", "12" (reais) e "12.5".
 * Retorna null quando o texto não é um valor reconhecível.
 */
export function parseBRL(texto: string): Centavos | null {
  const limpo = texto.replace(/R\$/gi, '').replace(/\s/g, '');
  const m = COM_MILHAR.exec(limpo) ?? DECIMAL_PONTO.exec(limpo);
  if (!m) return null;
  const [, sinal, inteiro = '', fracao = ''] = m;
  const reais = Number(inteiro.replace(/\./g, ''));
  const total = reais * 100 + Number(fracao.padEnd(2, '0'));
  if (!Number.isSafeInteger(total)) return null;
  return sinal === '-' && total !== 0 ? -total : total;
}

/**
 * Total de uma linha: preço por unidade (ou por kg) vezes quantidade em milésimos
 * (1 un = 1000, 0,350 kg = 350). Arredonda meio para cima (afastando de zero).
 */
export function multiplicarPreco(precoCentavos: Centavos, quantidadeMilesimos: number): Centavos {
  exigirInteiro(precoCentavos, 'precoCentavos');
  exigirInteiro(quantidadeMilesimos, 'quantidadeMilesimos');
  const bruto = Math.abs(precoCentavos * quantidadeMilesimos);
  exigirInteiro(bruto, 'produto');
  // Somar 500 ao produto seguro pode ultrapassar a faixa exata.
  const arredondado = Math.floor(bruto / 1000) + (bruto % 1000 >= 500 ? 1 : 0);
  const negativo = precoCentavos < 0 !== quantidadeMilesimos < 0;
  return negativo && arredondado !== 0 ? -arredondado : arredondado;
}

export function somar(...valores: Centavos[]): Centavos {
  let total = 0;
  for (const v of valores) {
    exigirInteiro(v, 'centavos');
    total += v;
  }
  exigirInteiro(total, 'soma');
  return total;
}
