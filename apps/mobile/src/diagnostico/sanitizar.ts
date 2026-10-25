/**
 * Higiene dos dados do diagnóstico. O JSON é colado em conversas, então nada sensível pode entrar:
 * número de cartão, CVV, código de login e tokens somem; CPF/CNPJ e e-mail são mascarados.
 * Módulo puro (sem React Native) para ser testado no Node.
 */

const REMOVIDO = '[removido]';
const LIMITE_TEXTO = 400;
const LIMITE_STACK = 1500;
const LIMITE_ITENS = 20;
const LIMITE_CHAVES = 30;
const PROFUNDIDADE_MAXIMA = 4;

/** Chaves cujo valor nunca é registrado, qualquer que seja o conteúdo. */
const CHAVE_SECRETA = /cvv|cvc|token|senha|password|secret|segredo|authorization|otp|login|acesso|numerocartao|cartaonumero|cardnumber|^pan$|^numero$|validade|cliente|nomecliente|sessao/i;
/** Chaves que carregam CPF/CNPJ: o valor é mascarado pelo tamanho. */
const CHAVE_DOCUMENTO = /^(cpf|cnpj|documento)$/i;
/** Chaves de código de barras: números de 8 a 14 dígitos passam intactos (são o objeto do diagnóstico). */
const CHAVE_CODIGO_DE_BARRAS = /^(codigo|ean)$/i;

// 12345674725 vira "***.***.*47-25".
export function mascararCpf(digitos: string): string {
  return `***.***.*${digitos.slice(-4, -2)}-${digitos.slice(-2)}`;
}

// 12345678000195 vira "**.***.***/**01-95" (o CNPJ completo nunca sai do aparelho).
export function mascararCnpj(digitos: string): string {
  return `**.***.***/**${digitos.slice(-4, -2)}-${digitos.slice(-2)}`;
}

const mascararPorTamanho = (digitos: string): string =>
  digitos.length === 14 ? mascararCnpj(digitos) : digitos.length === 11 ? mascararCpf(digitos) : REMOVIDO;

/** Aplica, em ordem, as máscaras de texto livre. Mensagens de console passam por aqui. */
export function sanitizarTexto(texto: string): string {
  let t = texto;
  // Tokens e credenciais em formato de cabeçalho/JWT.
  t = t.replace(/\bBearer\s+[\w.~+/=-]+/gi, `Bearer ${REMOVIDO}`);
  t = t.replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, REMOVIDO);
  t = t.replace(/\btok_[\w-]+/gi, REMOVIDO);
  t = t.replace(/\b(token|senha|password|cvv|cvc|secret|authorization|otp)(["']?\s*[:=]\s*["']?)[^\s"',;&}]+/gi, `$1$2${REMOVIDO}`);
  // E-mail: primeira letra + *** + domínio.
  t = t.replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g, '$1***@$2');
  // CNPJ e CPF formatados.
  t = t.replace(/(?<!\d)(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})(?!\d)/g, (_, _a, _b, _c, d, e) => mascararCnpj(`${d}${e}`));
  t = t.replace(/(?<!\d)\d{3}\.\d{3}\.(\d{3})-(\d{2})(?!\d)/g, (_, c, d) => mascararCpf(`${c}${d}`));
  // Número de cartão (13 a 19 dígitos, com espaços ou hífens) — inclui qualquer sequência longa de dígitos.
  t = t.replace(/(?<![\d])(?:\d[ -]?){12,18}\d(?![\d])/g, REMOVIDO);
  // CPF sem formatação.
  t = t.replace(/(?<![\d])(\d{11})(?![\d])/g, (_, d: string) => mascararCpf(d));
  return t;
}

function cortar(texto: string, limite: number): string {
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

function sanitizarErro(erro: Error): Record<string, string> {
  const saida: Record<string, string> = { name: erro.name, message: cortar(sanitizarTexto(erro.message), LIMITE_TEXTO) };
  if (erro.stack) saida.stack = cortar(sanitizarTexto(erro.stack.split('\n').slice(0, 12).join('\n')), LIMITE_STACK);
  return saida;
}

function sanitizarValor(valor: unknown, chave: string | null, profundidade: number): unknown {
  if (valor === null || typeof valor === 'boolean') return valor;
  if (chave && CHAVE_SECRETA.test(chave) && valor !== undefined) return REMOVIDO;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    const soDigitos = valor.replace(/\D/g, '');
    if (chave && CHAVE_DOCUMENTO.test(chave) && soDigitos.length > 0) return mascararPorTamanho(soDigitos);
    if (chave && CHAVE_CODIGO_DE_BARRAS.test(chave) && /^\d{8,14}$/.test(valor)) return valor;
    return cortar(sanitizarTexto(valor), LIMITE_TEXTO);
  }
  if (valor === undefined) return undefined;
  if (typeof valor === 'bigint' || typeof valor === 'symbol') return String(valor);
  if (typeof valor === 'function') return '[função]';
  if (valor instanceof Error) return sanitizarErro(valor);
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.toISOString();
  if (profundidade >= PROFUNDIDADE_MAXIMA) return '[profundo demais]';
  if (Array.isArray(valor)) {
    const itens = valor.slice(0, LIMITE_ITENS).map((v) => sanitizarValor(v, chave, profundidade + 1) ?? null);
    return valor.length > LIMITE_ITENS ? [...itens, `…+${valor.length - LIMITE_ITENS}`] : itens;
  }
  if (typeof valor === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>).slice(0, LIMITE_CHAVES)) {
      const limpo = sanitizarValor(v, k, profundidade + 1);
      if (limpo !== undefined) saida[k] = limpo;
    }
    return saida;
  }
  return undefined;
}

/**
 * Copia `valor` removendo o que não pode sair do aparelho: valores de chaves sensíveis (cartão, CVV,
 * token, login, cliente) viram `[removido]`; textos passam por `sanitizarTexto`. Limita profundidade e tamanho.
 */
export function sanitizar(valor: unknown): unknown {
  return sanitizarValor(valor, null, 0);
}
