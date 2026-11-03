/** Proteção adicional: build conectado não pode construir backend de demonstração. */
export class BackendLocal {
  constructor(..._args: unknown[]) { throw new Error('Este aplicativo exige conexão com a API configurada.'); }
}
