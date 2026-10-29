import type { z } from 'zod';
import type { PerfilResSchema, AparelhosResSchema } from '@pdv/shared';
import type {
  AssinaturaRes,
  IniciarRecuperacaoReq, ConfirmarRecuperacaoReq, RecuperacaoAparelho,
  CriarAssinaturaReq,
  CriarContaReq,
  LoginReq,
  Plano,
  PlanoId,
  Sessao,
} from '@pdv/shared';

export type CodigoErroBackend =
  | 'rede'
  | 'cartao_recusado'
  | 'token_invalido'
  | 'valor_invalido'
  | 'nao_autorizado'
  | 'limite_autenticacao'
  | 'nao_encontrado'
  | 'conflito'
  | 'limite_aparelhos' | 'aparelho_em_uso' | 'aparelho_revogado'
  | 'aparelho_ja_autorizado' | 'recuperacao_desnecessaria' | 'recuperacao_desatualizada'
  | 'recuperacao_indisponivel'
  | 'resposta_invalida'
  | 'desconhecido';

export class ErroBackend extends Error {
  constructor(
    readonly codigo: CodigoErroBackend,
    mensagem: string,
    readonly status?: number,
  ) {
    super(mensagem);
    this.name = 'ErroBackend';
  }
}

const MENSAGENS: Record<CodigoErroBackend, string> = {
  rede: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  cartao_recusado: 'Não conseguimos aprovar este cartão. Confira os dados ou use outro cartão.',
  token_invalido: 'Não foi possível validar o cartão. Digite os dados de novo.',
  valor_invalido: 'Algum dado está inválido. Confira e tente de novo.',
  nao_autorizado: 'Sua sessão não é mais válida. Entre de novo.',
  limite_autenticacao: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  nao_encontrado: 'Não encontramos o que você pediu.',
  conflito: 'Essa ação não é possível agora. Confira a situação da assinatura.',
  limite_aparelhos: 'O limite de aparelhos foi atingido. Você pode substituir um aparelho com segurança.',
  aparelho_em_uso: 'Este aparelho já está vinculado a outra conta.',
  aparelho_revogado: 'Este aparelho foi revogado e não pode ser reativado.',
  aparelho_ja_autorizado: 'Este aparelho já está autorizado. Entre normalmente.',
  recuperacao_desnecessaria: 'Há uma vaga disponível. Entre normalmente.',
  recuperacao_desatualizada: 'Esta recuperação está desatualizada. Peça um novo código.',
  recuperacao_indisponivel: 'Recuperação de aparelho indisponível no modo demo.',
  resposta_invalida: 'O servidor respondeu algo inesperado. Tente de novo em instantes.',
  desconhecido: 'Algo deu errado. Tente de novo em instantes.',
};

/** Mensagem pt-BR para mostrar ao usuário; a do servidor só entra quando já vem pronta para ele. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroBackend) return erro.codigo === 'conflito' && erro.message ? erro.message : MENSAGENS[erro.codigo];
  return MENSAGENS.desconhecido;
}

/**
 * O que o app precisa do servidor. `BackendLocal` roda tudo no aparelho (modo demo);
 * `BackendHttp` fala com a API quando `EXPO_PUBLIC_API_URL` está definida.
 */
export type Perfil = z.infer<typeof PerfilResSchema>;
export type Aparelhos = z.infer<typeof AparelhosResSchema>;

export interface Backend {
  readonly modo: 'demo' | 'http';
  obterPerfil(token?: string): Promise<Perfil>;
  listarAparelhos(): Promise<Aparelhos>;
  revogarAparelho(id: string): Promise<void>;
  sair(): Promise<void>;
  criarConta(req: CriarContaReq): Promise<Sessao>;
  pedirCodigo(email: string): Promise<void>;
  entrar(req: LoginReq): Promise<Sessao>;
  iniciarRecuperacao(req: IniciarRecuperacaoReq): Promise<RecuperacaoAparelho>;
  confirmarRecuperacao(req: ConfirmarRecuperacaoReq): Promise<Sessao>;
  listarPlanos(): Promise<Plano[]>;
  /** `null` quando a conta ainda não tem assinatura. */
  obterAssinatura(): Promise<AssinaturaRes | null>;
  criarAssinatura(req: CriarAssinaturaReq): Promise<AssinaturaRes>;
  trocarPlano(planoId: PlanoId): Promise<AssinaturaRes>;
  cancelarAssinatura(): Promise<AssinaturaRes>;
  reativarAssinatura(planoId: PlanoId): Promise<AssinaturaRes>;
  atualizarCartao(tokenCartao: string): Promise<AssinaturaRes>;
}
