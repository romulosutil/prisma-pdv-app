import { OpcoesRelatorioSchema, ComandoGestaoSchema, ClienteSchema, EstoqueResSchema, EventoFiadoSchema, FiadoResSchema, FiltrosRelatorioSchema, LojaSchema, RelatorioSchema, type ComandoGestao, type FiltrosRelatorio } from '@pdv/shared';
import {
  AssinaturaResSchema,
  CaixaSchema, PainelCaixasSchema, ReservarCaixaReqSchema, OperacaoCaixaReqSchema, AutorizarTransferenciaReqSchema, TrocarAparelhoCaixaReqSchema,
  SyncPushReqSchema, SyncPushResSchema, SyncPullResSchema,
  PerfilResSchema,
  AparelhosResSchema,
  CriarContaResSchema,
  LicencaSerializadaSchema,
  LoginResSchema,
  RecuperacaoAparelhoSchema,
  SessaoSchema,
  PlanoIdSchema,
  VinculosSchema, VinculoSchema,
  type ConvidarReq, type AlterarVinculoReq,
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
import { SolicitacaoSuporteSchema, SolicitarSuporteSchema, type SolicitarSuporte } from '@pdv/shared';
import { ErroBackend, type Backend, type CodigoErroBackend } from './backend';
import { registrarHttp } from '@/telemetria/registro';

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

const CODIGOS_CONHECIDOS: readonly string[] = ['cartao_recusado', 'token_invalido', 'valor_invalido', 'cupom_invalido', 'codigo_invalido', 'cadastro_codigo_necessario'];
const CODIGOS_CONFLITO: readonly string[] = ['email_ja_cadastrado', 'documento_ja_cadastrado', 'limite_aparelhos', 'aparelho_em_uso', 'aparelho_revogado', 'aparelho_ja_autorizado', 'recuperacao_desnecessaria', 'recuperacao_desatualizada', 'limite_operadores', 'vinculo_existente', 'convite_pendente', 'vinculo_desligado', 'aceitar_convite', 'selecionar_vinculo'];

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
  pedirCodigoCadastro(email: string, aparelhoId: string) {
    return this.chamar('POST', '/auth/cadastro/codigo', z.object({ desafioId: z.uuid() }), { corpo: { email, aparelhoId }, publica: true });
  }
  verificarCadastro(req: Pick<CriarContaReq, 'email' | 'documento' | 'aparelhoId' | 'desafioCadastroId' | 'codigoCadastro'>) {
    return this.chamar<void>('POST', '/auth/cadastro/verificar', null, { corpo: req, publica: true, espera204: true });
  }
  solicitarSuporte(req: SolicitarSuporte, token?: string) { return this.chamar('POST', '/suporte/solicitacoes', SolicitacaoSuporteSchema, { corpo: SolicitarSuporteSchema.parse(req), token }); }
  listarSolicitacoesSuporte(token?: string) { return this.chamar('GET', '/suporte/solicitacoes', z.array(SolicitacaoSuporteSchema), { token }); }
  exportarDadosSuporte(token?: string) { return this.chamar('GET', '/suporte/exportacao', z.record(z.string(), z.unknown()), { token }); }
  readonly modo = 'http' as const;
  obterEstoque(token?: string) { return this.chamar('GET', '/estoque', EstoqueResSchema, { token }); }
  obterFiado(token?: string) { return this.chamar('GET', '/fiado', FiadoResSchema, { token }); }
  listarLojas(token?: string) { return this.chamar('GET', '/lojas', z.array(LojaSchema), { token }); }
  obterOpcoesRelatorio(token?: string) { return this.chamar('GET', '/relatorios/filtros', OpcoesRelatorioSchema, { token }); }
  obterRelatorio(filtros: FiltrosRelatorio, token?: string) {
    const f = FiltrosRelatorioSchema.parse(filtros);
    const consulta = Object.entries(f).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`).join('&');
    return this.chamar('GET', `/relatorios?${consulta}`, RelatorioSchema, { token });
  }
  executarGestao(comando: ComandoGestao, token?: string): Promise<unknown> {
    const c = ComandoGestaoSchema.parse(comando);
    if (c.acao === 'estoque') return this.chamar('POST', '/estoque/movimentos', z.object({ id: z.uuid() }), { corpo: c.dados, token });
    if (c.acao === 'cliente') return this.chamar('POST', '/clientes', ClienteSchema, { corpo: c.dados, token });
    if (c.acao === 'loja') return this.chamar('POST', '/lojas', LojaSchema, { corpo: c.dados, token });
    return this.chamar('POST', c.acao === 'recebimento' ? '/fiado/recebimentos' : '/fiado/estornos', EventoFiadoSchema, { corpo: c.dados, token });
  }

  reservarCaixa(req: z.infer<typeof ReservarCaixaReqSchema>, token?: string) { return this.chamar('POST', '/caixas/reservar', CaixaSchema, { corpo: ReservarCaixaReqSchema.parse(req), token }); }
  listarCaixas(token?: string) { return this.chamar('GET', '/caixas', PainelCaixasSchema, { token }); }
  movimentarCaixa(id: string, req: z.infer<typeof OperacaoCaixaReqSchema>, token?: string) { z.uuid().parse(id); return this.chamar('POST', `/caixas/${id}/movimentos`, CaixaSchema, { corpo: OperacaoCaixaReqSchema.parse(req), token }); }
  autorizarTransferencia(req: z.infer<typeof AutorizarTransferenciaReqSchema>, token?: string) { return this.chamar('POST', '/caixas/transferencias/autorizar', z.object({ id: z.uuid(), expiraEm: z.iso.datetime() }), { corpo: AutorizarTransferenciaReqSchema.parse(req), token }); }
  executarTransferencia(autorizacaoId: string, token?: string) { z.uuid().parse(autorizacaoId); return this.chamar('POST', '/caixas/transferencias/executar', z.object({ id: z.uuid(), caixa: CaixaSchema }), { corpo: { autorizacaoId }, token }); }
  conferirCaixa(id: string, eventoId: string, motivo: string, token?: string) { z.uuid().parse(id); return this.chamar('POST', `/caixas/${id}/conferir`, z.object({ id: z.uuid() }), { corpo: { id: eventoId, motivo }, token }); }
  trocarAparelhoCaixa(id: string, req: z.infer<typeof TrocarAparelhoCaixaReqSchema>, token?: string) { z.uuid().parse(id); return this.chamar('POST', `/caixas/${id}/aparelho`, CaixaSchema, { corpo: TrocarAparelhoCaixaReqSchema.parse(req), token }); }

  consultarVinculos(email: string, codigo: string) {
    return this.chamar('POST', '/auth/vinculos', VinculosSchema, { corpo: { email, codigo }, publica: true });
  }
  listarEquipe() { return this.chamar('GET', '/equipe', VinculosSchema, {}); }
  convidar(req: ConvidarReq) { return this.chamar('POST', '/equipe/convites', VinculoSchema, { corpo: req }); }
  alterarVinculo(id: string, req: AlterarVinculoReq) {
    z.uuid().parse(id);
    return this.chamar('PUT', `/equipe/${encodeURIComponent(id)}`, VinculoSchema, { corpo: req });
  }

  constructor(
    private readonly baseUrl: string,
    private readonly obterToken: () => string | null,
    private readonly aoSessaoInvalida?: (tokenUsado: string) => Promise<void> | void,
    private readonly aoHoraServidor?: (horaIso: string, recebidaEm: number) => Promise<void>,
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

  async sair(token?: string): Promise<void> {
    await this.chamar('POST', '/auth/logout', null, { espera204: true, token });
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
    const inicio = Date.now();
    const cabecalhos: Record<string, string> = { Accept: 'application/json' };
    if (opcoes.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
    const token = opcoes.publica ? null : (opcoes.token ?? this.obterToken());
    if (token) cabecalhos.Authorization = `Bearer ${token}`;

    const controle = new AbortController();
    let resposta: Response;
    let texto: string;
    let recebidaEm: number;
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
        const em = Date.now();
        return { resposta: recebida, recebidaEm: em, texto: recebida.status === 401 ? '' : await recebida.text() };
      })();
      const limite = new Promise<never>((_, rejeitar) => {
        prazo = setTimeout(() => {
          controle.abort();
          rejeitar(new Error('Tempo limite excedido.'));
        }, TEMPO_LIMITE_MS);
      });
      ({ resposta, texto, recebidaEm } = await Promise.race([chamada, limite]));
    } catch {
      registrarHttp(metodo, caminho, inicio, 0, 'rede');
      throw new ErroBackend('rede', 'Sem conexão com o servidor.');
    } finally {
      if (prazo !== undefined) clearTimeout(prazo);
    }

    const json: unknown = texto ? safeJson(texto) : undefined;
    const erroResposta = resposta.ok ? null : erroDaResposta(resposta.status, json);
    registrarHttp(metodo, caminho, inicio, resposta.status, resposta.ok ? 'pronto' : 'falha', erroResposta?.codigo);
    if (resposta.status === 401 && token && !opcoes.publica) {
      try { await this.aoSessaoInvalida?.(token); } catch { /* Preserva o erro de autenticação. */ }
      throw new ErroBackend('nao_autorizado', 'Sua sessão não é mais válida. Entre de novo.', 401);
    }
    if (resposta.status === 404 && opcoes.nuloSe404) return null as T;
    if (erroResposta) throw erroResposta;
    if (opcoes.espera204 && resposta.status !== 204) throw new ErroBackend('resposta_invalida', 'Resposta fora do contrato.', resposta.status);
    const sincronizarHora = async () => {
      const hora = resposta.headers.get('x-pdv-agora');
      if (hora && z.iso.datetime().safeParse(hora).success) await this.aoHoraServidor?.(hora, recebidaEm);
    };
    if (!schema) { await sincronizarHora(); return undefined as T; }
    const lido = schema.safeParse(json);
    if (!lido.success) { registrarHttp(metodo, caminho, inicio, resposta.status, 'resposta_invalida'); throw new ErroBackend('resposta_invalida', 'Resposta fora do contrato.', resposta.status); }
    await sincronizarHora();
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
  if (status === 403 && campos.erro === 'proibido') return new ErroBackend('permissao_negada', '', status);
  if (status === 409 && campos.erro === 'conflito' && typeof campos.mensagem === 'string' && campos.mensagem.length <= 500) return new ErroBackend('conflito', campos.mensagem, status);
  const conflito = status === 409 ? [campos.codigo, campos.erro].find((v): v is string => typeof v === 'string' && CODIGOS_CONFLITO.includes(v)) : undefined;
  if (conflito) return new ErroBackend(conflito as CodigoErroBackend, '', status);
  const codigoServidor = [campos.codigo, campos.erro].find((v): v is string => typeof v === 'string' && CODIGOS_CONHECIDOS.includes(v));
  const codigo = status >= 500 || status === 401 || status === 403
    ? codigoDoStatus(status)
    : (codigoServidor as CodigoErroBackend | undefined) ?? codigoDoStatus(status);
  return new ErroBackend(codigo, '', status);
}
