/** Configuração ausente nunca produz sugestão fictícia nem atraso artificial. */
export function buscarCatalogoDemo(..._args: unknown[]): never {
  throw new Error('O catálogo conectado exige uma API configurada.');
}
export function consultarCatalogoDemo(..._args: unknown[]): Promise<never> {
  return Promise.reject(new Error('O catálogo conectado exige uma API configurada.'));
}
