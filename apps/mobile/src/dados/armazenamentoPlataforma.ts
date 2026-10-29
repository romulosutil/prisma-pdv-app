import { ArmazenamentoAsync } from './armazenamento';

/** Adaptador explícito para navegador. Metro usa .native.ts no Android/iOS. */
export const criarArmazenamento = (): ArmazenamentoAsync => new ArmazenamentoAsync();
