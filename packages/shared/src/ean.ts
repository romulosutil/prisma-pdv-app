const COMPRIMENTOS_EAN = [8, 12, 13, 14];

/** Valida um código de barras GS1 (EAN-8, UPC-A, EAN-13, GTIN-14): só dígitos e dígito verificador correto. */
export function validarEan(ean: string): boolean {
  if (!/^\d+$/.test(ean) || !COMPRIMENTOS_EAN.includes(ean.length)) return false;
  const digitos = Array.from(ean, Number);
  const verificador = digitos[digitos.length - 1]!;
  let soma = 0;
  // Pesos 3/1 alternados a partir do dígito mais à direita, sem contar o verificador.
  for (let i = digitos.length - 2, peso = 3; i >= 0; i--, peso = peso === 3 ? 1 : 3) {
    soma += digitos[i]! * peso;
  }
  return (10 - (soma % 10)) % 10 === verificador;
}

/** Remove tudo que não for dígito; devolve o código se for válido, senão `null`. */
export function normalizarEan(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, '');
  return validarEan(digitos) ? digitos : null;
}
