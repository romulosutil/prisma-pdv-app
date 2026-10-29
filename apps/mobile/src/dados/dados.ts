import type { Plano } from '@pdv/shared';
import { AssinaturaServico } from '@/servicos/assinatura';
import { ErroBackend, type Perfil as PerfilBackend } from '@/servicos/backend';
import type { Backend } from '@/servicos/backend';
import { BackendHttp } from '@/servicos/backendHttp';
import { BackendLocal } from '@/servicos/backendLocal';
import type { Armazenamento } from './armazenamento';
import { CaixaRepo } from './caixa';
import { ContaRepo, NOME_APARELHO_PADRAO } from './conta';
import { InstalacaoRepo } from './instalacao';
import { OrdemAtalhosRepo } from './ordemAtalhos';
import { PreferenciasRepo } from './preferencias';
import { ProdutosRepo } from './produtos';
import { RelogioApp } from './relogio';
import { gerarSemente } from './semente';
import { ErroDeDominio } from './erros';
import { VendasRepo } from './vendas';
import { CarrinhoDuravel } from './carrinhoDuravel';
import { CheckoutNavegador } from './checkoutNavegador';
import { ArmazenamentoSqlite } from './sqlite/armazenamentoSqlite';
import { CheckoutSqlite } from './sqlite/checkoutSqlite';
import { ArmazenamentoEscopo } from './armazenamentoEscopo';
import type { EstadoConta, Perfil } from './estadoConta';
import type { Sessao } from '@pdv/shared';

export interface FormularioConta {
  nomeResponsavel: string;
  email: string;
  /** CPF ou CNPJ, só dígitos. */
  documento: string;
  nomeLoja: string;
  tipoLoja: string;
}

/**
 * Raiz dos dados e serviços do app. Os repositórios são independentes e reativos
 * (`useObservavel`); aqui só se ligam entre si e ao `Backend`.
 */
export class Dados {
  readonly relogio: RelogioApp;
  readonly backend: Backend;
  readonly conta: ContaRepo;
  private readonly instalacao: InstalacaoRepo;
  readonly preferencias: PreferenciasRepo;
  readonly produtos: ProdutosRepo;
  readonly ordemAtalhos: OrdemAtalhosRepo;
  readonly vendas: VendasRepo;
  readonly caixa: CaixaRepo;
  readonly assinatura: AssinaturaServico;
  readonly carrinho: CarrinhoDuravel;
  readonly armazenamentoDaLoja: ArmazenamentoEscopo;
  private filaAcesso: Promise<void> = Promise.resolve();
  private contaCarregada = false;

  constructor(
    private readonly armazenamento: Armazenamento,
    private readonly novoId: () => string,
    urlApi?: string,
  ) {
    this.relogio = new RelogioApp(armazenamento);
    this.conta = new ContaRepo(armazenamento);
    this.armazenamentoDaLoja = new ArmazenamentoEscopo(armazenamento, () => this.conta.obter().identidade, armazenamento instanceof ArmazenamentoSqlite);
    this.instalacao = new InstalacaoRepo(armazenamento, novoId);
    this.backend = urlApi
      ? new BackendHttp(urlApi.replace(/\/+$/, ''), () => this.conta.obter().sessao?.token ?? null, (token) => this.conta.invalidarSessao(token))
      : new BackendLocal(armazenamento, this.relogio, novoId);
    this.assinatura = new AssinaturaServico(this.armazenamentoDaLoja, this.relogio, this.backend, () => !this.conta.transicao.obter() && this.conta.obter().sessao !== null, () => this.conta.obter().identidade?.contaId ?? null);

    const ambiente = { armazenamento: this.armazenamentoDaLoja, relogio: this.relogio, novoId };
    const sessao = () => {
      const atual = this.conta.obter().identidade;
      if (!atual) throw new ErroDeDominio('sem_sessao', 'Entre na sua conta primeiro.');
      return atual;
    };
    // Sem assinatura (ainda) vale o menor plano: o cliente só usa o catálogo para UX, o servidor revalida.
    const planoId = () => this.assinatura.obter().licenca?.planoId ?? 'essencial';

    this.preferencias = new PreferenciasRepo(this.armazenamentoDaLoja);
    this.produtos = new ProdutosRepo(ambiente, { lojaId: () => sessao().lojaId, planoId });
    this.ordemAtalhos = new OrdemAtalhosRepo(this.armazenamentoDaLoja);
    this.vendas = new VendasRepo(ambiente, { sessao });
    this.caixa = new CaixaRepo(ambiente, { sessao, planoId });
    this.carrinho = new CarrinhoDuravel();
    this.carrinho.configurar(
      armazenamento instanceof ArmazenamentoSqlite
        ? new CheckoutSqlite(armazenamento, novoId)
        : new CheckoutNavegador(this.armazenamentoDaLoja, this.vendas, () => JSON.stringify([sessao().contaId, sessao().lojaId])),
      { novoId, agora: () => this.relogio.agora().toISOString(), caixaId: () => this.caixa.atual()?.id ?? null, aposConcluir: () => this.vendas.carregar(), podeAlterar: () => !this.conta.transicao.obter(), podeIniciar: () => !this.conta.obter().reautenticacaoNecessaria },
    );
  }

  /** Carrega tudo do armazenamento e confere a assinatura (avaliação de tempo e cobranças devidas). */
  async iniciar(): Promise<void> {
    await this.conta.carregar();
    this.contaCarregada = true;
    await Promise.all([
      this.relogio.carregar(),
      this.carregarDadosDaLoja(),
    ]);
    await this.assinatura.sincronizar();
  }

  private async carregarDadosDaLoja(): Promise<void> {
    await Promise.all([
      this.preferencias.carregar(),
      this.produtos.carregar(),
      this.ordemAtalhos.carregar(),
      this.vendas.carregar(),
      this.caixa.carregar(),
      this.assinatura.carregar(),
    ]);
    if (this.conta.obter().identidade) await this.carrinho.carregar();
  }

  async listarPlanos(): Promise<Plano[]> {
    return this.backend.listarPlanos();
  }

  async criarConta(formulario: FormularioConta): Promise<void> {
    return this.executarAcesso(async () => {
    await this.preflightTroca(formulario.email);
    const anterior = this.conta.obter();
    if (anterior.identidade && !anterior.perfil) throw new ErroBackend('conflito', 'Recupere primeiro o acesso à conta original antes de criar outra conta.');
    const legado = anterior.identidade && anterior.perfil ? { email: anterior.perfil.email, aparelhoId: anterior.identidade.aparelhoId } : undefined;
    const aparelhoId = await this.instalacao.aparelhoDaConta(formulario.email, legado);
    const sessao = await this.backend.criarConta({
      email: formulario.email,
      nomeResponsavel: formulario.nomeResponsavel,
      nomeLoja: formulario.nomeLoja,
      documento: formulario.documento,
      aparelhoId,
      aparelhoNome: NOME_APARELHO_PADRAO,
    });
    if (sessao.aparelhoId !== aparelhoId) throw new ErroBackend('resposta_invalida', 'O aparelho retornado não corresponde ao solicitado.');
    await this.aplicarAcesso(sessao, {
      nomeResponsavel: formulario.nomeResponsavel,
      nomeLoja: formulario.nomeLoja,
      tipoLoja: formulario.tipoLoja,
      email: formulario.email,
      aparelhoNome: NOME_APARELHO_PADRAO,
    }, this.backend.modo === 'demo');
    });
  }

  async entrar(email: string, codigo: string): Promise<void> {
    return this.executarAcesso(async () => {
    await this.preflightTroca(email);
    const anterior = this.conta.obter();
    const semPerfil = anterior.identidade !== null && anterior.perfil === null;
    const legado = anterior.identidade && anterior.perfil ? { email: anterior.perfil.email, aparelhoId: anterior.identidade.aparelhoId } : undefined;
    const aparelhoId = semPerfil ? anterior.identidade!.aparelhoId : await this.instalacao.aparelhoDaConta(email, legado);
    const sessao = await this.backend.entrar({ email, codigo, aparelhoId, aparelhoNome: NOME_APARELHO_PADRAO });
    if (sessao.aparelhoId !== aparelhoId) throw new ErroBackend('resposta_invalida', 'O aparelho retornado não corresponde ao solicitado.');
    const perfil = await this.backend.obterPerfil(sessao.token);
    this.validarPerfil(sessao, perfil);
    if (semPerfil) {
      if (sessao.contaId !== anterior.identidade!.contaId || sessao.lojaId !== anterior.identidade!.lojaId) throw new ErroBackend('conflito', 'Recupere primeiro o acesso à conta original.');
      const associado = await this.instalacao.aparelhoDaConta(perfil.email, { email: perfil.email, aparelhoId });
      if (associado !== aparelhoId) throw new ErroBackend('conflito', 'O aparelho da conta não corresponde à identidade recuperada.');
    }
    await this.aplicarAcesso(sessao, {
      nomeResponsavel: perfil.nomeResponsavel,
      nomeLoja: perfil.nomeLoja,
      email: perfil.email,
      aparelhoNome: NOME_APARELHO_PADRAO,
    });
    await this.assinatura.sincronizar();
    });
  }

  private validarPerfil(sessao: Sessao, perfil: PerfilBackend): void {
    if (perfil.contaId !== sessao.contaId || perfil.lojaId !== sessao.lojaId || perfil.operadorId !== sessao.operadorId) throw new ErroBackend('resposta_invalida', 'Perfil divergente da sessão.');
  }

  private executarAcesso(tarefa: () => Promise<void>): Promise<void> {
    const resultado = this.filaAcesso.then(async () => {
      if (!this.contaCarregada) { await this.conta.carregar(); this.contaCarregada = true; }
      try { await tarefa(); }
      finally {
        this.armazenamentoDaLoja.bloquearAlteracoes(false);
        this.conta.transicao.alterar(false);
      }
    });
    this.filaAcesso = resultado.then(() => undefined, () => undefined);
    return resultado;
  }

  private async aguardarGravacoes(): Promise<void> {
    await Promise.all([this.produtos.aguardarGravacoes(), this.vendas.aguardarGravacoes(), this.caixa.aguardarGravacoes(), this.preferencias.aguardarGravacoes(), this.ordemAtalhos.aguardarGravacoes(), this.carrinho.aguardarGravacoes()]);
  }

  private async preflightTroca(email: string): Promise<void> {
    const anterior = this.conta.obter();
    if (!anterior.identidade || !anterior.perfil || anterior.perfil.email.trim().toLowerCase() === email.trim().toLowerCase()) return;
    this.conta.transicao.alterar(true);
    this.armazenamentoDaLoja.bloquearAlteracoes(true);
    await this.aguardarGravacoes();
    // Uma tentativa de acesso pode preceder iniciar(); consulte o estado durável
    // antes de decidir se a conta anterior está livre de pendências.
    if (!(this.armazenamento instanceof ArmazenamentoSqlite)) {
      await Promise.all([this.produtos.carregar(), this.vendas.carregar(), this.caixa.carregar(), this.carrinho.carregar()]);
    }
    if (await this.possuiPendencias()) throw new ErroBackend('conflito', 'Há operações locais pendentes. Entre na mesma conta para recuperar e sincronizar antes de trocar.');
  }

  private async possuiPendencias(): Promise<boolean> {
    if (this.carrinho.obter().itens.length > 0) return true;
    if (this.armazenamento instanceof ArmazenamentoSqlite) {
      let pendente = false;
      await this.armazenamento.transacao(async (tx, p) => {
        // Até P0-02 integrar todos os eventos/ack, registros locais são conservadoramente não confirmados.
        for (const tabela of ['outbox', 'rascunhos', 'produtos', 'vendas', 'caixas']) {
          if (await tx.getFirstAsync(`SELECT 1 FROM ${tabela} WHERE conta_id = ? AND loja_id = ? LIMIT 1`, p.contaId, p.lojaId)) pendente = true;
        }
      });
      return pendente;
    }
    return this.produtos.obter().length > 0 || this.vendas.obter().vendas.length > 0 || this.caixa.obter().length > 0;
  }

  private limparMemoriaDaLoja(): void {
    this.produtos.limparMemoria(); this.vendas.limparMemoria(); this.caixa.limparMemoria();
    this.preferencias.limparMemoria(); this.ordemAtalhos.limparMemoria(); this.carrinho.limparMemoria(); this.assinatura.limparMemoria();
  }

  private async aplicarAcesso(sessao: Sessao, perfil: Perfil, semear = false): Promise<void> {
    const anterior: EstadoConta = this.conta.obter();
    const mudou = anterior.identidade !== null && (anterior.identidade.contaId !== sessao.contaId || anterior.identidade.lojaId !== sessao.lojaId);
    this.conta.transicao.alterar(true);
    this.armazenamentoDaLoja.bloquearAlteracoes(true);
    let gravada = false;
    try {
      await this.aguardarGravacoes();
      if (mudou && await this.possuiPendencias()) throw new ErroBackend('conflito', 'Há operações locais pendentes. Entre na mesma conta para recuperar e sincronizar antes de trocar.');
      await this.conta.registrar(sessao, perfil);
      gravada = true;
      if (mudou) this.limparMemoriaDaLoja();
      if (semear) {
        this.armazenamentoDaLoja.bloquearAlteracoes(false);
        await this.semear();
        this.armazenamentoDaLoja.bloquearAlteracoes(true);
      }
      await this.carregarDadosDaLoja();
    } catch (erro) {
      if (gravada) await this.conta.invalidarSessao(sessao.token).catch(() => undefined);
      throw erro;
    } finally {
      this.armazenamentoDaLoja.bloquearAlteracoes(false);
      this.conta.transicao.alterar(false);
    }
  }

  async sair(): Promise<{ revogadaNoServidor: boolean }> {
    const tokenUsado = this.conta.obter().sessao?.token;
    if (!tokenUsado) return { revogadaNoServidor: false };
    let revogadaNoServidor = false;
    try { await this.backend.sair(); revogadaNoServidor = this.backend.modo === 'http'; }
    catch (erro) { if (!(erro instanceof ErroBackend)) throw erro; }
    await this.conta.invalidarSessao(tokenUsado);
    return { revogadaNoServidor };
  }

  async revogarAparelho(id: string): Promise<void> {
    const origem = this.conta.obter().identidade;
    await this.backend.revogarAparelho(id);
    const atual = this.conta.obter().identidade;
    if (id === atual?.aparelhoId && atual?.contaId === origem?.contaId && atual?.lojaId === origem?.lojaId) await this.conta.invalidarSessao();
  }

  /** Apaga todos os dados locais (só para o modo dev); o app precisa ser recarregado em seguida. */
  async zerar(): Promise<void> {
    await this.armazenamento.limpar();
  }

  private async semear(): Promise<void> {
    const sessao = this.conta.obter().sessao;
    if (!sessao) return;
    const semente = gerarSemente({ ...sessao, agora: this.relogio.agora(), novoId: this.novoId });
    await Promise.all([
      this.produtos.substituirTodos(semente.produtos),
      this.vendas.substituirTodas(semente.vendas),
      this.caixa.substituirTodos(semente.caixas),
    ]);
  }
}
