import { partesDaData } from './datas';

export const BANDEIRAS = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'desconhecida'] as const;
export type Bandeira = (typeof BANDEIRAS)[number];

/** Dados do cartão que podem ser guardados: nunca o número completo nem o CVV. */
export interface CartaoSalvo {
  bandeira: Bandeira;
  ultimos4: string;
  fingerprint: string;
}

type Faixa = readonly [number, number];

// BINs de 6 dígitos da Elo. Vários começam com 4 ou 5, por isso a Elo é testada antes de Visa e Mastercard.
const FAIXAS_ELO: readonly Faixa[] = [
  [401178, 401179],
  [431274, 431274],
  [438935, 438935],
  [451416, 451416],
  [457393, 457393],
  [457631, 457632],
  [504175, 504175],
  [506699, 506778],
  [509000, 509999],
  [627780, 627780],
  [636297, 636297],
  [636368, 636368],
  [650031, 650033],
  [650035, 650051],
  [650405, 650439],
  [650485, 650538],
  [650541, 650598],
  [650700, 650718],
  [650720, 650727],
  [650901, 650920],
  [651652, 651679],
  [655000, 655019],
  [655021, 655058],
];

const FAIXAS_HIPERCARD: readonly Faixa[] = [
  [384100, 384100],
  [384140, 384140],
  [384160, 384160],
  [606282, 606282],
  [637095, 637095],
  [637568, 637568],
  [637599, 637599],
  [637609, 637609],
  [637612, 637612],
];

const soDigitos = (texto: string): string => texto.replace(/\D/g, '');

const emFaixa = (valor: number, faixas: readonly Faixa[]): boolean =>
  faixas.some(([min, max]) => valor >= min && valor <= max);

export function luhnValido(numero: string): boolean {
  const limpo = numero.replace(/[\s-]/g, '');
  if (!/^\d{12,19}$/.test(limpo)) return false;
  let soma = 0;
  for (let i = 0; i < limpo.length; i++) {
    let digito = Number(limpo[limpo.length - 1 - i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    soma += digito;
  }
  return soma % 10 === 0;
}

export function detectarBandeira(numero: string): Bandeira {
  const digitos = soDigitos(numero);
  const bin6 = digitos.length >= 6 ? Number(digitos.slice(0, 6)) : -1;
  const prefixo2 = Number(digitos.slice(0, 2));
  const prefixo4 = Number(digitos.slice(0, 4));

  if (emFaixa(bin6, FAIXAS_ELO)) return 'elo';
  if (emFaixa(bin6, FAIXAS_HIPERCARD)) return 'hipercard';
  if (prefixo2 === 34 || prefixo2 === 37) return 'amex';
  if ((prefixo2 >= 51 && prefixo2 <= 55) || (prefixo4 >= 2221 && prefixo4 <= 2720)) return 'mastercard';
  if (digitos.startsWith('4')) return 'visa';
  return 'desconhecida';
}

/** Agrupa em 4-4-4-4 (Amex em 4-6-5). Ignora tudo que não é dígito. */
export function formatarNumeroCartao(numero: string, bandeira: Bandeira = detectarBandeira(numero)): string {
  const amex = bandeira === 'amex';
  const digitos = soDigitos(numero).slice(0, amex ? 15 : 19);
  const tamanhos = amex ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const grupos: string[] = [];
  let inicio = 0;
  for (const tamanho of tamanhos) {
    if (inicio >= digitos.length) break;
    grupos.push(digitos.slice(inicio, inicio + tamanho));
    inicio += tamanho;
  }
  return grupos.join(' ');
}

/** Valida "MM/AA": o cartão vale até o fim do mês informado, no máximo 20 anos à frente. */
export function validadeValida(validade: string, agora: Date): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(validade);
  if (!m) return false;
  const mes = Number(m[1]);
  if (mes < 1 || mes > 12) return false;
  const { mes: mesAtual, ano: anoAtual } = partesDaData(agora);
  const meses = (2000 + Number(m[2])) * 12 + mes;
  const atual = anoAtual * 12 + mesAtual;
  return meses >= atual && meses <= atual + 20 * 12;
}

export function cvvValido(cvv: string, bandeira: Bandeira): boolean {
  if (!/^\d+$/.test(cvv)) return false;
  if (bandeira === 'amex') return cvv.length === 4;
  if (bandeira === 'desconhecida') return cvv.length === 3 || cvv.length === 4;
  return cvv.length === 3;
}
