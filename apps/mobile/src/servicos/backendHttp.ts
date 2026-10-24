import {
  AssinaturaResSchema,
  CriarContaResSchema,
  LicencaSerializadaSchema,
  LoginResSchema,
  PlanoIdSchema,
  type AssinaturaRes,
  type CriarAssinaturaReq,
  type CriarContaReq,
  type LoginReq,
  type Plano,
  type PlanoId,
  type Sessao,
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

const CODIGOS_CONHECIDOS: readonly string[] = ['cartao_recusado', 'token_invalido', 'valor_invalido'];

interface OpcoesChamada {
  corpo?: unknown;
  /** Rotas públicas (conta, login, planos) não enviam o token. */
  publica?: boolean;
  /** 404 vira `null` em vez de erro. */
  nuloSe404?: boolean;
}

export class BackendHttp implements Backend {
  readonly modo = 'http' as const;

  constructor(
    private readonly baseUrl: string,
    private readonly obterToken: () => string | null,
  ) {}

  criarConta(req: CriarContaReq): Promise<Sessao> {
    return this.chamar('POST', '/contas', CriarContaResSchema, { corpo: req, publica: true });
  }

  async pedirCodigo(email: string): Promise<void> {
    await this.chamar('POST', '/auth/codigo', null, { corpo: { email }, publica: true });
  }

  entrar(req: LoginReq): Promise<Sessao> {
    return this.chamar('POST', '/auth/login', LoginResSchema, { corpo: req, publica: true });
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
    const token = opcoes.publica ? null : this.obterToken();
    if (token) cabecalhos.Authorization = `Bearer ${token}`;

    const controle = new AbortController();
    const prazo = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    let resposta: Response;
    try {
      resposta = await fetch(`${this.baseUrl}${caminho}`, {
        method: metodo,
        headers: cabecalhos,
        body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
        signal: controle.signal,
      });
    } catch {
      throw new ErroBackend('rede', 'Sem conexão com o servidor.');
    } finally {
      clearTimeout(prazo);
    }

    if (resposta.status === 404 && opcoes.nuloSe404) return null as T;
    const texto = await resposta.text();
    const json: unknown = texto ? safeJson(texto) : undefined;

    if (!resposta.ok) throw erroDaResposta(resposta.status, json);
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
  const campos = typeof corpo === 'object' && corpo !== null ? (corpo as Record<string, unknown>) : {};
  const mensagem = [campos.mensagem, campos.message, campos.erro].find((v): v is string => typeof v === 'string') ?? '';
  const codigoServidor = [campos.codigo, campos.erro].find((v): v is string => typeof v === 'string' && CODIGOS_CONHECIDOS.includes(v));
  return new ErroBackend((codigoServidor as CodigoErroBackend | undefined) ?? codigoDoStatus(status), mensagem, status);
}
