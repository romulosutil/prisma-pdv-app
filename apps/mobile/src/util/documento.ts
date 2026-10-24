export type TipoDocumento = 'cpf' | 'cnpj';

export type ResultadoDocumento =
  | { ok: true; tipo: TipoDocumento; digitos: string }
  | { ok: false; motivo: 'incompleto' | 'invalido' };

export const soDigitos = (texto: string): string => texto.replace(/\D/g, '');

const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

const todosIguais = (digitos: string): boolean => /^(\d)\1+$/.test(digitos);

function digitoCpf(digitos: number[], quantidade: number): number {
  let soma = 0;
  for (let i = 0; i < quantidade; i++) soma += (digitos[i] ?? 0) * (quantidade + 1 - i);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

function digitoCnpj(digitos: number[], pesos: readonly number[]): number {
  let soma = 0;
  pesos.forEach((peso, i) => {
    soma += (digitos[i] ?? 0) * peso;
  });
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(texto: string): boolean {
  const d = soDigitos(texto);
  if (d.length !== 11 || todosIguais(d)) return false;
  const n = [...d].map(Number);
  return digitoCpf(n, 9) === n[9] && digitoCpf(n, 10) === n[10];
}

export function cnpjValido(texto: string): boolean {
  const d = soDigitos(texto);
  if (d.length !== 14 || todosIguais(d)) return false;
  const n = [...d].map(Number);
  return digitoCnpj(n, PESOS_CNPJ_1) === n[12] && digitoCnpj(n, PESOS_CNPJ_2) === n[13];
}

/** Máscara progressiva: até 11 dígitos é CPF (000.000.000-00); acima disso, CNPJ (00.000.000/0000-00). */
export function formatarDocumento(texto: string): string {
  const d = soDigitos(texto).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

export function validarDocumento(texto: string): ResultadoDocumento {
  const digitos = soDigitos(texto);
  if (digitos.length === 11) return cpfValido(digitos) ? { ok: true, tipo: 'cpf', digitos } : { ok: false, motivo: 'invalido' };
  if (digitos.length === 14) return cnpjValido(digitos) ? { ok: true, tipo: 'cnpj', digitos } : { ok: false, motivo: 'invalido' };
  return { ok: false, motivo: digitos.length < 14 ? 'incompleto' : 'invalido' };
}
