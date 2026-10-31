import {
  AssinaturaResSchema,
  SyncPushReqSchema, SyncPushResSchema, SyncPullResSchema,
  PerfilResSchema,
  AparelhosResSchema,
  CriarContaResSchema,
  LicencaSerializadaSchema,
  LoginResSchema,
  RecuperacaoAparelhoSchema,
  SessaoSchema,
  PlanoIdSchema,
  type AssinaturaRes,
  type CriarAssinaturaReq,
  type CriarContaReq,
  type LoginReq,
  type IniciarRecuperacaoReq, type ConfirmarRecuperacaoReq, type RecuperacaoAparelho,
  type Plano,
  type PlanoId,
  type Sessao,
  type SyncPushReq,
} from '@pdv/shared';
import { z, type ZodType } from 'zod';
import { ErroBackend, type Backend, type CodigoErroBackend } from './backend';

const TEMPO_LIMITE_MS = 15_000;

const PlanoRespostaSchema = z.object({
  id: PlanoIdSchema,
  nome: z.string(),
  precoMensalCentavos: z.number().int().nonnegative(),
  descricaoCurta: z.string(),
  maisEscolhido: z.boolean(),
  limites: LicencaSerializadaSchema.shape.limites,
  recursos: LicencaSerializadaSchema.shape.recursos,
});

const ListaPlanosSchema = z.union([
  z.array(PlanoRespostaSchema),
  z.object({ planos: z.array(PlanoRespostaSchema) }).transform((r) => r.planos),
]);

function codigoDoStatus(status: number): CodigoErroBackend {
  if (status === 401 || status === 403) return 'nao_autorizado';
  if (status === 404) return 'nao_encontrado';
  if (status === 409) return 'conflito';
  if (status === 400 || status === 422) return 'valor_invalido';
  return 'desconhecido';
}

const CODIGOS_CONHECIDOS: readonly string[] = ['cartao_recusado', 'token_invalido', 'valor_invalido', 'cupom_invalido'];
const CODIGOS_CONFLITO: readonly string[] = ['limite_aparelhos', 'aparelho_em_uso', 'aparelho_revogado', 'aparelho_ja_autorizado', 'recuperacao_desnecessaria', 'recuperacao_desatualizada'];

interface OpcoesChamada {
  corpo?: unknown;
  /** Rotas públicas (conta, login, planos) não enviam o token. */
  publica?: boolean;
  /** 404 vira `null` em vez de erro. */
  nuloSe404?: boolean;
  token?: string;
  espera204?: boolean;
}

export class BackendHttp implements Backend {
  readonly modo = 'http' as const;

  constructor(
    private readonly baseUrl: string,
    private readonly obterToken: () => string | null,
    private readonly aoSessaoInvalida?: (tokenUsado: string) => Promise<void> | void,
  ) {}

  enviarMutacoes(req: SyncPushReq, token?: string) {
    return this.chamar('POST', '/sync/push', SyncPushResSchema, { corpo: SyncPushReqSchema.parse(req), token });
  }

  receberMudancas(desde: string, token?: string) {
    if (!/^\d+$/.test(desde)) throw new ErroBackend('valor_invalido', 'Cursor inválido.');
    return this.chamar('GET', `/sync/pull?desde=${encodeURIComponent(desde)}`, SyncPullResSchema, { token });
  }

  obterPerfil(token?: string) {
    return this.chamar('GET', '/conta', PerfilResSchema, { token });
  }

  listarAparelhos() {
    return this.chamar('GET', '/aparelhos', AparelhosResSchema, {});
  }

  async revogarAparelho(id: string): Promise<void> {
    if (!z.uuid().safeParse(id).success) throw new ErroBackend('valor_invalido', 'Identificador de aparelho inválido.');
    await this.chamar('DELETE', `/aparelhos/${encodeURIComponent(id)}`, null, { espera204: true });
  }

  async sair(): Promise<void> {
    await this.chamar('POST', '/auth/logout', null, { espera204: true });
  }

  criarConta(req: CriarContaReq): Promise<Sessao> {
    return this.chamar('POST', '/contas', CriarContaResSchema, { corpo: req, publica: true });
  }

  async pedirCodigo(email: string): Promise<void> {
    await this.chamar('POST', '/auth/codigo', null, { corpo: { email }, publica: true });
  }

  entrar(req: LoginReq): Promise<Sessao> {
    return this.chamar('POST', '/auth/login', LoginResSchema, { corpo: req, publica: true });
  }

  iniciarRecuperacao(req: IniciarRecuperacaoReq): Promise<RecuperacaoAparelho> {
    return this.chamar('POST', '/auth/recuperacao', RecuperacaoAparelhoSchema, { corpo: req, publica: true });
  }

  confirmarRecuperacao(req: ConfirmarRecuperacaoReq): Promise<Sessao> {
    return this.chamar('POST', '/auth/recuperacao/confirmar', SessaoSchema, { corpo: req, publica: true });
  }

  listarPlanos(): Promise<Plano[]> {
    return this.chamar('GET', '/planos', ListaPlanosSchema, { publica: true });
  }

  obterAssinatura(): Promise<AssinaturaRes | null> {
    return this.chamar('GET', '/assinatura', AssinaturaResSchema.nullable(), { nuloSe404: true });
  }

  criarAssinatura(req: CriarAssinaturaReq): Promise<AssinaturaRes> {
    return this.chamar('POST', '/assinatura', AssinaturaResSchema, { corpo: req });
  }

  trocarPlano(planoId: PlanoId): Promise<AssinaturaRes> {
    return this.chamar('POST', '/assinatura/trocar-plano', AssinaturaResSchema, { corpo: { planoId } });
  }

  cancelarAssinatura(): Promise<AssinaturaRes> {
    return this.chamar('POST', '/assinatura/cancelar', AssinaturaResSchema, {});
  }

  reativarAssinatura(planoId: PlanoId): Promise<AssinaturaRes> {
    return this.chamar('POST', '/assinatura/reativar', AssinaturaResSchema, { corpo: { planoId } });
  }

  atualizarCartao(tokenCartao: string): Promise<AssinaturaRes> {
    return this.chamar('PUT', '/assinatura/cartao', AssinaturaResSchema, { corpo: { tokenCartao } });
  }

  private async chamar<T>(metodo: string, caminho: string, schema: ZodType<T> | null, opcoes: OpcoesChamada): Promise<T> {
    const cabecalhos: Record<string, string> = { Accept: 'application/json' };
    if (opcoes.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
    const token = opcoes.publica ? null : (opcoes.token ?? this.obterToken());
    if (token) cabecalhos.Authorization = `Bearer ${token}`;

    const controle = new AbortController();
    let resposta: Response;
    let texto: string;
    let prazo: ReturnType<typeof setTimeout> | undefined;
    try {
      const chamada = (async () => {
        const recebida = await fetch(`${this.baseUrl}${caminho}`, {
          method: metodo,
          headers: cabecalhos,
          body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
          signal: controle.signal,
        });
        // A autenticação não depende do corpo, que pode conter dados sensíveis.
        return { resposta: recebida, texto: recebida.status === 401 ? '' : await recebida.text() };
      })();
      const limite = new Promise<never>((_, rejeitar) => {
        prazo = setTimeout(() => {
          controle.abort();
          rejeitar(new Error('Tempo limite excedido.'));
        }, TEMPO_LIMITE_MS);
      });
      ({ resposta, texto } = await Promise.race([chamada, limite]));
    } catch {
      throw new ErroBackend('rede', 'Sem conexão com o servidor.');
    } finally {
      if (prazo !== undefined) clearTimeout(prazo);
    }

    if (resposta.status === 401 && token && !opcoes.publica) {
      try { await this.aoSessaoInvalida?.(token); } catch { /* Preserva o erro de autenticação. */ }
      throw new ErroBackend('nao_autorizado', 'Sua sessão não é mais válida. Entre de novo.', 401);
    }
    if (resposta.status === 404 && opcoes.nuloSe404) return null as T;
    const json: unknown = texto ? safeJson(texto) : undefined;

    if (!resposta.ok) throw erroDaResposta(resposta.status, json);
    if (opcoes.espera204 && resposta.status !== 204) throw new ErroBackend('resposta_invalida', 'Resposta fora do contrato.', resposta.status);
    if (!schema) return undefined as T;
    const lido = schema.safeParse(json);
    if (!lido.success) throw new ErroBackend('resposta_invalida', 'Resposta fora do contrato.', resposta.status);
    return lido.data;
  }
}

function safeJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

function erroDaResposta(status: number, corpo: unknown): ErroBackend {
  if (status === 429) return new ErroBackend('limite_autenticacao', '', status);
  const campos = typeof corpo === 'object' && corpo !== null ? (corpo as Record<string, unknown>) : {};
  const conflito = status === 409 ? [campos.codigo, campos.erro].find((v): v is string => typeof v === 'string' && CODIGOS_CONFLITO.includes(v)) : undefined;
  if (conflito) return new ErroBackend(conflito as CodigoErroBackend, '', status);
  const codigoServidor = [campos.codigo, campos.erro].find((v): v is string => typeof v === 'string' && CODIGOS_CONHECIDOS.includes(v));
  const codigo = status >= 500 || status === 401 || status === 403
    ? codigoDoStatus(status)
    : (codigoServidor as CodigoErroBackend | undefined) ?? codigoDoStatus(status);
  return new ErroBackend(codigo, '', status);
}
