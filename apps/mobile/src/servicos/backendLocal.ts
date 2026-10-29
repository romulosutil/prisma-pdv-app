import {
  atualizarCartao as atualizarCartaoDaAssinatura,
  avaliar,
  cancelar as cancelarAssinatura,
  cobrancaDevida,
  calcularProrata,
  desserializarAssinatura,
  ErroTransicao,
  iniciarTeste,
  licencaDe,
  MockBillingProvider,
  PLANOS,
  PerfilResSchema,
  PLANOS_ORDEM,
  reativar as reativarAssinatura,
  registrarCobrancaAprovada,
  registrarCobrancaRecusada,
  serializarAssinatura,
  serializarLicenca,
  trocarPlano as trocarPlanoDaAssinatura,
  type Assinatura,
  type AssinaturaRes,
  type AssinaturaSerializada,
  type CriarAssinaturaReq,
  type CriarContaReq,
  type LoginReq,
  type Plano,
  type PlanoId,
  type Relogio,
  type Sessao,
} from '@pdv/shared';
import type { Armazenamento } from '@/dados/armazenamento';
import { ErroBackend, type Backend, type Perfil, type Aparelhos } from './backend';

interface EstadoLocal {
  sessao: Sessao | null;
  perfil?: Perfil;
  aparelhoNome?: string;
  aparelhoCriadoEm?: string;
  email: string | null;
  assinatura: AssinaturaSerializada | null;
  /** No mock o "cliente" do gateway é o próprio token do cartão. */
  clienteRef: string | null;
}

const CHAVE = 'backend_local';
/** Limite de cobranças encadeadas num só processamento (relógio de teste avançado muitos meses). */
const MAX_COBRANCAS_POR_PROCESSAMENTO = 24;

/**
 * "Servidor no bolso" do modo demo: a mesma máquina de estados do `@pdv/shared`, o
 * `MockBillingProvider` em memória e o estado guardado no `Armazenamento`. Faz o papel do job
 * diário da API: cada `obterAssinatura` avalia o tempo e cobra o que estiver devido.
 */
export class BackendLocal implements Backend {
  readonly modo = 'demo' as const;
  private readonly billing = new MockBillingProvider();
  private estado: EstadoLocal | null = null;

  constructor(
    private readonly armazenamento: Armazenamento,
    private readonly relogio: Relogio,
    private readonly novoId: () => string,
  ) {}

  async criarConta(req: CriarContaReq): Promise<Sessao> {
    const sessao: Sessao = {
      token: `demo_${this.novoId()}`,
      contaId: this.novoId(),
      lojaId: this.novoId(),
      operadorId: this.novoId(),
      aparelhoId: req.aparelhoId,
    };
    await this.salvar({ sessao, email: req.email.toLowerCase(), assinatura: null, clienteRef: null, perfil: { contaId: sessao.contaId, lojaId: sessao.lojaId, operadorId: sessao.operadorId, email: req.email.toLowerCase(), nomeResponsavel: req.nomeResponsavel, nomeLoja: req.nomeLoja, papel: 'dono' }, aparelhoNome: req.aparelhoNome, aparelhoCriadoEm: this.relogio.agora().toISOString() });
    return sessao;
  }

  async obterPerfil(token?: string): Promise<Perfil> {
    const estado = await this.carregar();
    if (!estado.sessao || (token !== undefined && token !== estado.sessao.token)) throw new ErroBackend('nao_autorizado', 'Sessão demo inválida.');
    const perfil = PerfilResSchema.safeParse(estado.perfil);
    if (!perfil.success || perfil.data.contaId !== estado.sessao.contaId || perfil.data.lojaId !== estado.sessao.lojaId || perfil.data.operadorId !== estado.sessao.operadorId) throw new ErroBackend('resposta_invalida', 'Perfil demo indisponível.');
    return perfil.data;
  }

  async listarAparelhos(): Promise<Aparelhos> {
    const estado = await this.carregar();
    if (!estado.sessao) throw new ErroBackend('nao_autorizado', 'Sessão demo inválida.');
    if (!estado.aparelhoNome || !estado.aparelhoCriadoEm) throw new ErroBackend('resposta_invalida', 'Aparelho demo indisponível.');
    return [{ id: estado.sessao.aparelhoId, nome: estado.aparelhoNome, criadoEm: estado.aparelhoCriadoEm, ultimoAcessoEm: estado.aparelhoCriadoEm, revogadoEm: null, atual: true }];
  }

  async revogarAparelho(_id: string): Promise<void> {
    throw new ErroBackend('desconhecido', 'Revogação de aparelho indisponível no modo demo.');
  }

  async sair(): Promise<void> { /* A credencial local é gerida pelo chamador. */ }

  async pedirCodigo(): Promise<void> {
    // Sem e-mail de verdade no modo demo: qualquer código de 6 dígitos vale em `entrar`.
  }

  async entrar(req: LoginReq): Promise<Sessao> {
    const estado = await this.carregar();
    if (!estado.sessao || estado.email !== req.email.toLowerCase()) {
      throw new ErroBackend('nao_autorizado', 'Não encontramos uma conta com este e-mail neste aparelho.');
    }
    return { ...estado.sessao, aparelhoId: req.aparelhoId };
  }

  async listarPlanos(): Promise<Plano[]> {
    return PLANOS_ORDEM.map((id) => PLANOS[id]);
  }

  async obterAssinatura(): Promise<AssinaturaRes | null> {
    const estado = await this.carregar();
    if (!estado.assinatura) return null;
    const processada = await this.processar(estado, desserializarAssinatura(estado.assinatura));
    return this.resposta(processada);
  }

  async criarAssinatura(req: CriarAssinaturaReq): Promise<AssinaturaRes> {
    const estado = await this.carregar();
    if (!estado.sessao) throw new ErroBackend('nao_autorizado', '');
    if (estado.assinatura) throw new ErroBackend('conflito', 'Esta conta já tem uma assinatura.');
    const verificacao = await this.billing.verificarCartao(req.tokenCartao);
    if (!verificacao.ok) throw new ErroBackend(verificacao.motivo === 'cartao_recusado' ? 'cartao_recusado' : 'token_invalido', '');

    const assinatura = iniciarTeste({
      id: this.novoId(),
      contaId: estado.sessao.contaId,
      planoId: req.planoId,
      cartao: { bandeira: verificacao.bandeira, ultimos4: verificacao.ultimos4, fingerprint: verificacao.fingerprint },
      agora: this.relogio.agora(),
    });
    await this.salvar({ ...estado, assinatura: serializarAssinatura(assinatura), clienteRef: verificacao.clienteRef });
    return this.resposta(assinatura);
  }

  async trocarPlano(planoId: PlanoId): Promise<AssinaturaRes> {
    const { estado, assinatura } = await this.assinaturaAtual();
    const agora = this.relogio.agora();
    const prorata = calcularProrata(assinatura, planoId, agora);
    if (prorata > 0) await this.cobrar(estado, assinatura, prorata, `Upgrade para ${PLANOS[planoId].nome}`, `upgrade:${this.novoId()}`);
    return this.gravar(estado, this.transicao(() => trocarPlanoDaAssinatura(assinatura, planoId, agora)));
  }

  async cancelarAssinatura(): Promise<AssinaturaRes> {
    const { estado, assinatura } = await this.assinaturaAtual();
    return this.gravar(estado, this.transicao(() => cancelarAssinatura(assinatura, this.relogio.agora())));
  }

  async reativarAssinatura(planoId: PlanoId): Promise<AssinaturaRes> {
    const { estado, assinatura } = await this.assinaturaAtual();
    const agora = this.relogio.agora();
    // Depois do período já pago, reativar abre um período novo: cobra antes (regra do `reativar` do shared).
    if (assinatura.status === 'cancelada' && agora >= assinatura.periodoAtualFim) {
      await this.cobrar(estado, assinatura, PLANOS[planoId].precoMensalCentavos, `Assinatura ${PLANOS[planoId].nome}`, `reativar:${this.novoId()}`);
    }
    return this.gravar(estado, this.transicao(() => reativarAssinatura(assinatura, { planoId, agora })));
  }

  async atualizarCartao(tokenCartao: string): Promise<AssinaturaRes> {
    const { estado, assinatura } = await this.assinaturaAtual();
    const verificacao = await this.billing.verificarCartao(tokenCartao);
    if (!verificacao.ok) throw new ErroBackend(verificacao.motivo === 'cartao_recusado' ? 'cartao_recusado' : 'token_invalido', '');

    const agora = this.relogio.agora();
    let nova = this.transicao(() =>
      atualizarCartaoDaAssinatura(assinatura, { bandeira: verificacao.bandeira, ultimos4: verificacao.ultimos4, fingerprint: verificacao.fingerprint }),
    );
    const novoEstado = { ...estado, clienteRef: verificacao.clienteRef };
    // Cartão novo em conta com pagamento em atraso: tenta cobrar na hora para destravar o acesso.
    if (nova.status === 'inadimplente' || nova.status === 'suspensa') {
      const valor = PLANOS[nova.planoAgendado ?? nova.planoId].precoMensalCentavos;
      await this.cobrar(novoEstado, nova, valor, `Assinatura ${PLANOS[nova.planoAgendado ?? nova.planoId].nome}`, `recuperacao:${this.novoId()}`);
      nova = registrarCobrancaAprovada(nova, agora);
    }
    return this.gravar(novoEstado, nova);
  }

  // ---------- internos ----------

  private async carregar(): Promise<EstadoLocal> {
    this.estado ??= (await this.armazenamento.obter<EstadoLocal>(CHAVE)) ?? { sessao: null, email: null, assinatura: null, clienteRef: null };
    return this.estado;
  }

  private async salvar(estado: EstadoLocal): Promise<void> {
    this.estado = estado;
    await this.armazenamento.gravar(CHAVE, estado);
  }

  private async assinaturaAtual(): Promise<{ estado: EstadoLocal; assinatura: Assinatura }> {
    const estado = await this.carregar();
    if (!estado.assinatura) throw new ErroBackend('nao_encontrado', 'Esta conta ainda não tem assinatura.');
    const assinatura = await this.processar(estado, desserializarAssinatura(estado.assinatura));
    return { estado: this.estado ?? estado, assinatura };
  }

  private async gravar(estado: EstadoLocal, assinatura: Assinatura): Promise<AssinaturaRes> {
    await this.salvar({ ...estado, assinatura: serializarAssinatura(assinatura) });
    return this.resposta(assinatura);
  }

  private resposta(assinatura: Assinatura): AssinaturaRes {
    return { assinatura: serializarAssinatura(assinatura), licenca: serializarLicenca(licencaDe(assinatura, this.relogio.agora())) };
  }

  /** Transições inválidas da máquina viram erro de conflito com a mensagem dela. */
  private transicao(executar: () => Assinatura): Assinatura {
    try {
      return executar();
    } catch (erro) {
      if (erro instanceof ErroTransicao) throw new ErroBackend('conflito', erro.message);
      throw erro;
    }
  }

  private async cobrar(estado: EstadoLocal, assinatura: Assinatura, valorCentavos: number, descricao: string, chave: string): Promise<void> {
    if (!estado.clienteRef) throw new ErroBackend('token_invalido', '');
    const resultado = await this.billing.cobrar({
      clienteRef: estado.clienteRef,
      valorCentavos,
      descricao,
      chaveIdempotencia: `${assinatura.id}:${chave}`,
    });
    if (!resultado.ok) throw new ErroBackend(resultado.motivo === 'cartao_recusado' ? 'cartao_recusado' : 'valor_invalido', '');
  }

  /** O "job diário": suspende quem passou da carência e cobra teste vencido, renovação e retentativas. */
  private async processar(estado: EstadoLocal, inicial: Assinatura): Promise<Assinatura> {
    const agora = this.relogio.agora();
    let assinatura = avaliar(inicial, agora);
    for (let i = 0; i < MAX_COBRANCAS_POR_PROCESSAMENTO; i++) {
      const devida = cobrancaDevida(assinatura, agora);
      if (!devida || !estado.clienteRef) break;
      const resultado = await this.billing.cobrar({
        clienteRef: estado.clienteRef,
        valorCentavos: devida.valorCentavos,
        descricao: `Assinatura (${devida.tipo})`,
        chaveIdempotencia: `${assinatura.id}:${devida.tipo}:${assinatura.periodoAtualFim.toISOString()}:${assinatura.tentativasFalhas}`,
      });
      assinatura = resultado.ok ? registrarCobrancaAprovada(assinatura, agora) : registrarCobrancaRecusada(assinatura, agora);
    }
    assinatura = avaliar(assinatura, agora);
    if (assinatura !== inicial) await this.salvar({ ...estado, assinatura: serializarAssinatura(assinatura) });
    return assinatura;
  }
}
