import type { ChaveLimite } from '@pdv/shared';

export type CodigoErroDominio =
  | 'limite_plano'
  | 'recurso_plano'
  | 'ean_duplicado'
  | 'produto_inexistente'
  | 'valor_invalido'
  | 'sem_itens'
  | 'pagamento_incompleto'
  | 'venda_inexistente'
  | 'caixa_ja_aberto'
  | 'caixa_fechado'
  | 'sem_sessao';

/** Erro de regra de negócio dos repositórios. A tela decide a mensagem pelo `codigo`. */
export class ErroDeDominio extends Error {
  constructor(
    readonly codigo: CodigoErroDominio,
    mensagem: string,
    /** Para `limite_plano`: qual limite estourou. */
    readonly limite?: ChaveLimite,
  ) {
    super(mensagem);
    this.name = 'ErroDeDominio';
  }
}

export function ehErroDeDominio(erro: unknown, codigo?: CodigoErroDominio): erro is ErroDeDominio {
  return erro instanceof ErroDeDominio && (codigo === undefined || erro.codigo === codigo);
}
