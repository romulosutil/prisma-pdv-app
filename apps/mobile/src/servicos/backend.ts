import type { OpcoesRelatorio, ComandoGestao, FiltrosRelatorio, Relatorio, FiadoRes, EstoqueResSchema, LojaSchema } from '@pdv/shared';
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
  SyncPushReq, SyncPushRes, SyncPullRes,
  Vinculo, ConvidarReq, AlterarVinculoReq,
  Caixa, PainelCaixas, ReservarCaixaReqSchema, OperacaoCaixaReqSchema, AutorizarTransferenciaReqSchema, TrocarAparelhoCaixaReqSchema,
} from '@pdv/shared';

export type CodigoErroBackend =
  | 'rede'
  | 'cartao_recusado'
  | 'token_invalido'
  | 'valor_invalido'
  | 'cupom_invalido'
  | 'nao_autorizado'
  | 'limite_autenticacao'
  | 'nao_encontrado'
  | 'conflito'
  | 'email_ja_cadastrado' | 'documento_ja_cadastrado' | 'codigo_invalido' | 'cadastro_codigo_necessario'
  | 'limite_aparelhos' | 'aparelho_em_uso' | 'aparelho_revogado'
  | 'aparelho_ja_autorizado' | 'recuperacao_desnecessaria' | 'recuperacao_desatualizada'
  | 'recuperacao_indisponivel'
  | 'resposta_invalida'
  | 'permissao_negada' | 'limite_operadores' | 'vinculo_existente' | 'convite_pendente' | 'vinculo_desligado' | 'aceitar_convite' | 'selecionar_vinculo'
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
  email_ja_cadastrado: 'Este e-mail já tem acesso. Entre com seu código pessoal.',
  documento_ja_cadastrado: 'Já existe uma conta com este CPF/CNPJ. Entre na conta ou procure o suporte.',
  codigo_invalido: 'Código inválido ou expirado. Confira o código ou solicite outro.',
  cadastro_codigo_necessario: 'Confirme o código enviado ao e-mail para criar a conta.',
  rede: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  cartao_recusado: 'Não conseguimos aprovar este cartão. Confira os dados ou use outro cartão.',
  token_invalido: 'Não foi possível validar o cartão. Digite os dados de novo.',
  valor_invalido: 'Algum dado está inválido. Confira e tente de novo.',
  cupom_invalido: 'Cupom inválido. Confira o código e tente novamente.',
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
  permissao_negada: 'Seu vínculo não permite esta operação. Fale com o dono da loja.',
  limite_operadores: 'O plano atual não permite mais usuários.',
  vinculo_existente: 'Esta pessoa já possui vínculo. Altere o acesso na lista da equipe.',
  convite_pendente: 'A pessoa precisa aceitar o convite com seu código pessoal.',
  vinculo_desligado: 'Envie um novo convite para retomar o acesso.',
  aceitar_convite: 'Confirme o aceite do convite para entrar nesta loja.',
  selecionar_vinculo: 'Escolha a empresa e a loja para entrar.',
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
  pedirCodigoCadastro?(email: string, aparelhoId: string): Promise<{ desafioId: string }>;
  solicitarSuporte?(req: import('@pdv/shared').SolicitarSuporte, token?: string): Promise<import('@pdv/shared').SolicitacaoSuporte>;
  listarSolicitacoesSuporte?(token?: string): Promise<import('@pdv/shared').SolicitacaoSuporte[]>;
  exportarDadosSuporte?(token?: string): Promise<Record<string, unknown>>;
  readonly modo: 'demo' | 'http';
  executarGestao?(comando: ComandoGestao, token?: string): Promise<unknown>;
  obterEstoque?(token?: string): Promise<z.infer<typeof EstoqueResSchema>>;
  obterFiado?(token?: string): Promise<FiadoRes>;
  listarLojas?(token?: string): Promise<z.infer<typeof LojaSchema>[]>;
  obterOpcoesRelatorio?(token?: string): Promise<OpcoesRelatorio>;
  obterRelatorio?(filtros: FiltrosRelatorio, token?: string): Promise<Relatorio>;
  reservarCaixa?(req: z.infer<typeof ReservarCaixaReqSchema>, token?: string): Promise<Caixa>;
  listarCaixas?(token?: string): Promise<PainelCaixas>;
  movimentarCaixa?(id: string, req: z.infer<typeof OperacaoCaixaReqSchema>, token?: string): Promise<Caixa>;
  autorizarTransferencia?(req: z.infer<typeof AutorizarTransferenciaReqSchema>, token?: string): Promise<{ id: string; expiraEm: string }>;
  executarTransferencia?(autorizacaoId: string, token?: string): Promise<{ id: string; caixa: Caixa }>;
  conferirCaixa?(id: string, eventoId: string, motivo: string, token?: string): Promise<{ id: string }>;
  trocarAparelhoCaixa?(id: string, req: z.infer<typeof TrocarAparelhoCaixaReqSchema>, token?: string): Promise<Caixa>;
  consultarVinculos?(email: string, codigo: string): Promise<Vinculo[]>;
  listarEquipe?(): Promise<Vinculo[]>;
  convidar?(req: ConvidarReq): Promise<Vinculo>;
  alterarVinculo?(id: string, req: AlterarVinculoReq): Promise<Vinculo>;
  enviarMutacoes?(req: SyncPushReq, token?: string): Promise<SyncPushRes>;
  receberMudancas?(desde: string, token?: string): Promise<SyncPullRes>;
  obterPerfil(token?: string): Promise<Perfil>;
  listarAparelhos(): Promise<Aparelhos>;
  revogarAparelho(id: string): Promise<void>;
  sair(token?: string): Promise<void>;
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
