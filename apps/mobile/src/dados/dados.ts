import { ComandoGestaoSchema, VendaSchema, type ComandoGestao } from '@pdv/shared';
import type { NovaVenda } from './vendas';
import { AutorizarTransferenciaReqSchema, OperacaoCaixaReqSchema, TrocarAparelhoCaixaReqSchema, RecuperacaoAparelhoSchema, SessaoSchema, PerfilResSchema, type Permissao, type Vinculo, type Plano, type RecuperacaoAparelho } from '@pdv/shared';
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
import { ArmazenamentoSyncNavegador } from './syncNavegador';
import { RepositorioSyncSqlite } from './sqlite/syncSqlite';
import type { RepositorioSync } from './syncTipos';
import { SincronizacaoServico } from '@/servicos/sincronizacao';
import { escopoDoPerfil, normalizarEstadoConta, type EstadoConta, type Perfil } from './estadoConta';
import type { Sessao, Venda } from '@pdv/shared';
import { AcessoOffline } from './acessoOffline';
import { SuporteServico } from '@/servicos/suporte';

export interface FormularioConta {
  nomeResponsavel: string;
  email: string;
  /** CPF ou CNPJ, só dígitos. */
  documento: string;
  nomeLoja: string;
  tipoLoja: string;
}

interface ResumoSyncPerfil { pendentes: number; rejeitadas: number; ultimaSincronizacaoEm: string | null }

/**
 * Raiz dos dados e serviços do app. Os repositórios são independentes e reativos
 * (`useObservavel`); aqui só se ligam entre si e ao `Backend`.
 */
export class Dados {
  readonly suporte: SuporteServico;
  readonly relogio: RelogioApp;
  readonly backend: Backend;
  readonly conta: ContaRepo;
  readonly acessoOffline: AcessoOffline;
  private readonly instalacao: InstalacaoRepo;
  readonly preferencias: PreferenciasRepo;
  readonly produtos: ProdutosRepo;
  readonly ordemAtalhos: OrdemAtalhosRepo;
  readonly vendas: VendasRepo;
  readonly caixa: CaixaRepo;
  readonly assinatura: AssinaturaServico;
  readonly carrinho: CarrinhoDuravel;
  readonly armazenamentoDaLoja: ArmazenamentoEscopo;
  readonly sincronizacao: SincronizacaoServico;
  private readonly repositorioSync: RepositorioSync;
  private filaAcesso: Promise<void> = Promise.resolve();
  private filaSaidas: Promise<void> = Promise.resolve();
  private contaCarregada = false;
  private caixaOnlinePendente = false;
  private registrandoFiado: Promise<Venda> | null = null;
  private geracaoAcesso = 0;
  private recuperacao: { desafio: RecuperacaoAparelho; geracao: number; vinculo: string; alvo?: string } | null = null;

  constructor(
    private readonly armazenamento: Armazenamento,
    private readonly novoId: () => string,
    urlApi?: string,
  ) {
    this.relogio = new RelogioApp(armazenamento);
    this.conta = new ContaRepo(armazenamento);
    this.acessoOffline = new AcessoOffline(armazenamento, () => this.relogio.agora());
    let financeiro: Armazenamento;
    if (armazenamento instanceof ArmazenamentoSqlite) {
      armazenamento.configurarSync(novoId, () => this.relogio.agora());
      financeiro = armazenamento;
      this.repositorioSync = new RepositorioSyncSqlite(armazenamento, novoId, () => this.relogio.agora());
    } else {
      const navegador = new ArmazenamentoSyncNavegador(armazenamento, () => this.conta.obter().identidade, novoId, () => this.relogio.agora());
      financeiro = navegador;
      this.repositorioSync = navegador;
    }
    this.armazenamentoDaLoja = new ArmazenamentoEscopo(financeiro, () => this.conta.obter().identidade, true, async chave => {
      if (['produtos', 'caixas', 'vendas'].includes(chave)) await this.observarAcessoOffline(chave === 'vendas');
    });
    this.instalacao = new InstalacaoRepo(armazenamento, novoId);
    this.backend = urlApi
      ? new BackendHttp(urlApi.replace(/\/+$/, ''), () => this.conta.obter().sessao?.token ?? null, (token) => this.conta.invalidarSessao(token))
      : new BackendLocal(armazenamento, this.relogio, novoId);
    this.assinatura = new AssinaturaServico(this.armazenamentoDaLoja, this.relogio, this.backend, () => !this.conta.transicao.obter() && this.conta.obter().sessao !== null, () => this.conta.obter().identidade?.contaId ?? null);
    this.suporte = new SuporteServico(this.backend, this.armazenamentoDaLoja, () => this.conta.obter().sessao, novoId);

    const ambiente = { armazenamento: this.armazenamentoDaLoja, relogio: this.relogio, novoId };
    const sessao = () => {
      const atual = this.conta.obter().identidade;
      if (!atual) throw new ErroDeDominio('sem_sessao', 'Entre na sua conta primeiro.');
      return atual;
    };
    // Sem assinatura (ainda) vale o menor plano: o cliente só usa o catálogo para UX, o servidor revalida.
    const planoId = () => this.assinatura.obter().licenca?.planoId ?? 'essencial';

    this.preferencias = new PreferenciasRepo(this.armazenamentoDaLoja);
    const autorizar = (p: Permissao) => { if (!this.pode(p)) throw new ErroBackend('conflito', 'Seu vínculo não permite esta operação.'); };
    this.produtos = new ProdutosRepo(ambiente, { lojaId: () => sessao().lojaId, planoId, estoquePorMovimentos: this.backend.modo === 'http', autorizar: () => autorizar('cadastrar_produto') });
    this.ordemAtalhos = new OrdemAtalhosRepo(this.armazenamentoDaLoja);
    this.vendas = new VendasRepo(ambiente, { sessao, caixaId: () => this.caixa.atual()?.id ?? null, autorizarVenda: () => autorizar('vender'), autorizarCancelamento: () => autorizar('cancelar_venda'), conferirOutros: () => this.pode('conferir_caixas') });
    this.caixa = new CaixaRepo(ambiente, { sessao, planoId, checkoutPendente: (id) => this.carrinho.pendenteNoCaixa(id),
      autorizar: saida => { if (this.caixaOnlinePendente) throw new ErroBackend('conflito', 'Confirme a operação online pendente na tela de turnos antes de movimentar o caixa.'); autorizar('movimentar_proprio_caixa'); if (saida) autorizar('retirar_dinheiro'); }, conferirOutros: () => this.pode('conferir_caixas'), vendas: () => this.vendas.obter().vendas,
      reservar: this.backend.modo === 'http' ? (id, trocoInicialCentavos) => this.backend.reservarCaixa!({ id, trocoInicialCentavos }, this.conta.obter().sessao?.token) : undefined });
    this.carrinho = new CarrinhoDuravel();
    this.carrinho.configurar(
      this.protegerCheckout(armazenamento instanceof ArmazenamentoSqlite
        ? new CheckoutSqlite(armazenamento, novoId)
        : new CheckoutNavegador(this.armazenamentoDaLoja, this.vendas, () => escopoDoPerfil(sessao()))),
      { novoId, agora: () => this.relogio.agora().toISOString(), caixaId: () => this.caixa.atual()?.id ?? null, aposConcluir: () => this.vendas.carregar(), podeAlterar: () => !this.conta.transicao.obter() && !this.caixaOnlinePendente, podeIniciar: () => !this.conta.obter().reautenticacaoNecessaria && this.pode('vender') },
    );
    this.sincronizacao = new SincronizacaoServico({
      repositorio: this.repositorioSync,
      backend: this.backend,
      sessao: () => this.conta.obter().sessao,
      vinculo: () => this.armazenamentoDaLoja.obterEscopo(),
      agora: () => this.relogio.agora(),
      aplicarLocal: (tarefa) => this.aplicarSyncLocal(tarefa),
      revalidar: () => this.revalidarPerfilAtual(),
    });
  }

  private async observarAcessoOffline(permitirCobranca = false): Promise<void> {
    if (this.backend.modo !== 'http') return;
    const estado = this.conta.obter();
    // Uma cobrança iniciada conserva suas parcelas e pode ser concluída.
    if (permitirCobranca && this.carrinho.obter().parcelas.length && !this.carrinho.obter().concluidaId) return;
    if (!estado.sessao || estado.reautenticacaoNecessaria) throw new ErroBackend('nao_autorizado', 'Entre novamente neste perfil. Seus registros foram preservados.');
    await this.acessoOffline.observar(estado.identidade!);
  }

  private protegerCheckout(base: import('./checkoutTipos').PersistenciaCheckout): import('./checkoutTipos').PersistenciaCheckout {
    return {
      carregar: () => base.carregar(),
      salvar: async r => { if (r || !this.carrinho.obter().concluidaId) await this.observarAcessoOffline(true); await base.salvar(r); },
      concluir: async () => { await this.observarAcessoOffline(true); return base.concluir(); },
    };
  }

  private async revalidarPerfilAtual(): Promise<void> {
    const estado = this.conta.obter();
    if (!estado.sessao || !estado.perfil) throw new ErroBackend('nao_autorizado', 'Entre novamente neste perfil.');
    // A rede pode levar até o timeout. Escritas locais continuam disponíveis enquanto aguardamos.
    const sessao = estado.sessao;
    const perfil = await this.backend.obterPerfil(sessao.token);
    this.validarPerfil(sessao, perfil);
    return this.executarAcesso(async () => {
      if (this.conta.obter().sessao?.token !== sessao.token) throw new ErroBackend('conflito', 'O perfil mudou durante a validação.');
      this.conta.transicao.alterar(true);
      this.armazenamentoDaLoja.bloquearAlteracoes(true);
      await this.aguardarGravacoes();
      await this.revalidarVisibilidade(sessao, perfil);
      await this.acessoOffline.confirmar(sessao);
      await this.conta.registrar({ ...sessao, papel: perfil.papel, permissoes: perfil.permissoes }, { ...estado.perfil!, nomeResponsavel: perfil.nomeResponsavel, nomeLoja: perfil.nomeLoja });
      await this.carregarDadosDaLoja();
    });
  }

  private async revalidarVisibilidade(anterior: Pick<Sessao, 'papel' | 'permissoes' | 'operadorId'>, atual: Pick<Sessao, 'papel' | 'permissoes'>): Promise<void> {
    const antes = !anterior.papel || anterior.papel === 'dono' || !!anterior.permissoes?.includes('conferir_caixas');
    const depois = atual.papel === 'dono' || !!atual.permissoes?.includes('conferir_caixas');
    if (antes !== depois) await this.repositorioSync.atualizarVisibilidade?.(depois ? null : anterior.operadorId);
  }

  private aplicarSyncLocal<T>(tarefa: () => Promise<T>): Promise<T> {
    return this.executarAcesso(async () => {
      this.conta.transicao.alterar(true);
      this.armazenamentoDaLoja.bloquearAlteracoes(true);
      await this.aguardarGravacoes();
      const resultado = await tarefa();
      await this.carregarDadosDaLoja();
      return resultado;
    });
  }

  /** Registra no mesmo agregado/outbox de vendas; a rede confirma depois, sem recriar a dívida. */
  registrarFiado(nova: NovaVenda): Promise<Venda> {
    if (this.registrandoFiado) return this.registrandoFiado;
    const registro = this.registrarFiadoInterno(nova);
    this.registrandoFiado = registro;
    void registro.finally(() => { if (this.registrandoFiado === registro) this.registrandoFiado = null; }).catch(() => undefined);
    return registro;
  }

  private async registrarFiadoInterno(nova: NovaVenda) {
    if (!nova.fiado) throw new ErroBackend('valor_invalido', 'Informe cliente, saldo e vencimento.');
    return this.executarAcesso(async () => {
      this.conta.transicao.alterar(true);
      await this.aguardarGravacoes();
      if (!this.pode('vender') || this.caixaOnlinePendente) throw new ErroBackend('conflito', 'Confirme suas pendências antes de vender fiado.');
      if (this.carrinho.obter().itens.length || this.carrinho.obter().parcelas.length) throw new ErroBackend('conflito', 'Conclua ou guarde a venda em andamento primeiro.');
      // Valida antes de persistir; SQLite e navegador preservam o contrato completo.
      VendaSchema.shape.fiado.parse(nova.fiado);
      if (nova.pagamentos.some(p => p.meio === 'dinheiro') && !this.caixa.atual()) throw new ErroBackend('conflito', 'Abra seu turno para receber dinheiro.');
      return this.vendas.registrar(nova);
    });
  }

  async operacaoGestaoOnline(acao: ComandoGestao['acao'], parametros: Record<string, unknown>): Promise<unknown> {
    if (!this.backend.executarGestao) throw new ErroBackend('conflito', 'A gestão exige conexão com a API.');
    const vinculo = this.armazenamentoDaLoja.obterEscopo();
    await this.sincronizacao.sincronizar({ forcar: true });
    const resposta = await this.executarAcesso(async () => {
      this.conta.transicao.alterar(true);
      await this.aguardarGravacoes();
      if (vinculo !== this.armazenamentoDaLoja.obterEscopo()) throw new ErroBackend('conflito', 'Retome o perfil original.');
      if (await this.armazenamentoDaLoja.obter('operacaoCaixaPendente')) throw new ErroBackend('conflito', 'Confirme a operação pendente na tela de turnos.');
      if ((await this.repositorioSync.estado()).entradas.length || this.sincronizacao.obter().situacao !== 'ocioso') throw new ErroBackend('conflito', 'Sincronize as pendências antes desta operação online.');
      if (this.carrinho.obter().parcelas.length && !this.carrinho.obter().concluidaId) throw new ErroBackend('conflito', 'Conclua o recebimento em andamento.');
      const pendente = await this.armazenamentoDaLoja.obter<ComandoGestao>('operacaoGestaoPendente');
      const comando = ComandoGestaoSchema.parse({ acao, dados: { ...parametros, id: pendente?.dados.id ?? this.novoId() } });
      if (pendente && JSON.stringify(pendente) !== JSON.stringify(comando)) throw new ErroBackend('conflito', 'Repita o comando pendente de gestão antes de iniciar outro.');
      const token = this.conta.obter().sessao?.token;
      if (!token) throw new ErroBackend('nao_autorizado', 'Entre novamente neste perfil.');
      await this.armazenamentoDaLoja.gravar('operacaoGestaoPendente', comando);
      this.caixaOnlinePendente = true;
      try { return await this.backend.executarGestao!(comando, token); }
      catch (e) {
        if (e instanceof ErroBackend && e.status && e.status >= 400 && e.status < 500) {
          await this.armazenamentoDaLoja.remover('operacaoGestaoPendente'); this.caixaOnlinePendente = false;
        }
        throw e;
      }
    });
    await this.sincronizacao.sincronizar({ forcar: true });
    await this.executarAcesso(async () => {
      if (vinculo !== this.armazenamentoDaLoja.obterEscopo()) throw new ErroBackend('conflito', 'Retome o perfil original para confirmar.');
      if (this.sincronizacao.obter().situacao !== 'ocioso' || (await this.repositorioSync.estado()).entradas.length) throw new ErroBackend('conflito', 'Operação confirmada no servidor. Repita a pendência para atualizar este aparelho.');
      await this.armazenamentoDaLoja.remover('operacaoGestaoPendente');
      this.caixaOnlinePendente = false;
    });
    return resposta;
  }

  async repetirOperacaoGestaoPendente() {
    const c = ComandoGestaoSchema.parse(await this.armazenamentoDaLoja.obter('operacaoGestaoPendente'));
    const { id: _id, ...parametros } = c.dados;
    return this.operacaoGestaoOnline(c.acao, parametros);
  }

  async abrirCaixa(troco: number) {
    if (this.backend.modo === 'demo') return this.caixa.abrir(troco);
    const vinculo = this.armazenamentoDaLoja.obterEscopo();
    await this.sincronizacao.sincronizar({ forcar: true });
    return this.executarAcesso(async () => {
      this.conta.transicao.alterar(true);
      await this.aguardarGravacoes();
      if (vinculo !== this.armazenamentoDaLoja.obterEscopo()) throw new ErroBackend('conflito', 'O usuário mudou. Retome o perfil original para abrir o turno.');
      if ((await this.repositorioSync.estado()).entradas.length) throw new ErroBackend('conflito', 'Sincronize as operações e o fechamento anterior antes de abrir outro turno.');
      return this.caixa.abrir(troco);
    });
  }

  /** Comando durável por perfil: resposta perdida deve repetir a mesma chave e os mesmos dados. */
  async operacaoCaixaOnline(operacao: string, parametros: Record<string, unknown>): Promise<unknown> {
    if (this.backend.modo !== 'http') throw new ErroBackend('conflito', 'Esta operação exige conexão com a API.');
    const vinculo = this.armazenamentoDaLoja.obterEscopo();
    await this.sincronizacao.sincronizar({ forcar: true });
    const resultado = await this.executarAcesso(async () => {
      this.conta.transicao.alterar(true);
      await this.aguardarGravacoes();
      if (vinculo !== this.armazenamentoDaLoja.obterEscopo()) throw new ErroBackend('conflito', 'O usuário mudou. Retome o perfil original.');
      if ((await this.repositorioSync.estado()).entradas.length || this.sincronizacao.obter().situacao !== 'ocioso') throw new ErroBackend('conflito', 'Sincronize todas as pendências antes desta operação online.');
      if (this.carrinho.obter().parcelas.length && !this.carrinho.obter().concluidaId) throw new ErroBackend('conflito', 'Conclua a cobrança em andamento primeiro.');
      if (await this.armazenamentoDaLoja.obter('operacaoGestaoPendente')) throw new ErroBackend('conflito', 'Repita a operação pendente de gestão primeiro.');
      const pendente = await this.armazenamentoDaLoja.obter<{ operacao: string; parametros: Record<string, unknown>; id: string }>('operacaoCaixaPendente');
      if (pendente && JSON.stringify([pendente.operacao, pendente.parametros]) !== JSON.stringify([operacao, parametros])) throw new ErroBackend('conflito', 'Repita a operação online pendente antes de iniciar outra.');
      const comando = pendente ?? { operacao, parametros, id: this.novoId() };
      const p = parametros, token = this.conta.obter().sessao?.token;
      if (!token) throw new ErroBackend('nao_autorizado', 'Entre novamente.');
      // Validar antes de persistir para não deixar um comando inválido bloqueando o perfil.
      const corpo = { ...p, id: comando.id }; delete (corpo as Record<string, unknown>).caixaId;
      if (operacao === 'movimento') OperacaoCaixaReqSchema.parse(corpo);
      else if (operacao === 'autorizar_transferencia') AutorizarTransferenciaReqSchema.parse(corpo);
      else if (operacao === 'aparelho') TrocarAparelhoCaixaReqSchema.parse(p.dados);
      else if (!['transferir', 'conferir'].includes(operacao)) throw new ErroBackend('valor_invalido', 'Operação inválida.');
      await this.armazenamentoDaLoja.gravar('operacaoCaixaPendente', comando);
      this.caixaOnlinePendente = true;
      let resposta: unknown;
      try {
        if (operacao === 'movimento') resposta = await this.backend.movimentarCaixa!(String(p.caixaId), OperacaoCaixaReqSchema.parse(corpo), token);
        if (operacao === 'autorizar_transferencia') resposta = await this.backend.autorizarTransferencia!(AutorizarTransferenciaReqSchema.parse(corpo), token);
        if (operacao === 'transferir') resposta = await this.backend.executarTransferencia!(String(p.autorizacaoId), token);
        if (operacao === 'conferir') resposta = await this.backend.conferirCaixa!(String(p.caixaId), comando.id, String(p.motivo), token);
        if (operacao === 'aparelho') resposta = await this.backend.trocarAparelhoCaixa!(String(p.caixaId), TrocarAparelhoCaixaReqSchema.parse(p.dados), token);
      } catch (e) {
        // Recusa explícita não foi aplicada. Falha de rede/5xx mantém a chave para consulta/reenvio.
        if (e instanceof ErroBackend && e.status && e.status >= 400 && e.status < 500) { await this.armazenamentoDaLoja.remover('operacaoCaixaPendente'); this.caixaOnlinePendente = false; }
        throw e;
      }
      return resposta;
    });
    await this.sincronizacao.sincronizar({ forcar: true });
    await this.executarAcesso(async () => {
      if (vinculo !== this.armazenamentoDaLoja.obterEscopo()) throw new ErroBackend('conflito', 'Retome o perfil original para confirmar o resultado.');
      if (this.sincronizacao.obter().situacao !== 'ocioso' || (await this.repositorioSync.estado()).entradas.length) throw new ErroBackend('conflito', 'Operação confirmada no servidor. Repita a operação pendente para atualizar os dados deste aparelho.');
      await this.armazenamentoDaLoja.remover('operacaoCaixaPendente');
      this.caixaOnlinePendente = false;
    });
    return resultado;
  }

  async repetirOperacaoCaixaPendente() {
    const c = await this.armazenamentoDaLoja.obter<{ operacao: string; parametros: Record<string, unknown> }>('operacaoCaixaPendente');
    if (!c) throw new ErroBackend('conflito', 'Não há operação online pendente.');
    return this.operacaoCaixaOnline(c.operacao, c.parametros);
  }

  async listarPendenciasSync() {
    const escopo = this.armazenamentoDaLoja.obterEscopo();
    if (!escopo) return [];
    const estado = await this.repositorioSync.estado();
    return escopo === this.armazenamentoDaLoja.obterEscopo() ? estado.entradas : [];
  }

  /** Carrega tudo do armazenamento e confere a assinatura (avaliação de tempo e cobranças devidas). */
  async iniciar(): Promise<void> {
    await this.conta.carregar();
    this.contaCarregada = true;
    await Promise.all([
      this.relogio.carregar(),
      this.carregarDadosDaLoja(),
    ]);
    const identidade = this.conta.obter().identidade;
    if (identidade && this.backend.modo === 'http') {
      await this.acessoOffline.carregar(identidade);
      try { await this.revalidarPerfilAtual(); } catch (e) { if (!(e instanceof ErroBackend)) throw e; }
    }
    await this.assinatura.sincronizar();
    await this.sincronizacao.atualizarEstado();
    await this.processarSaidasPendentes();
  }

  private async carregarDadosDaLoja(): Promise<void> {
    this.caixaOnlinePendente = !!await this.armazenamentoDaLoja.obter('operacaoCaixaPendente') || !!await this.armazenamentoDaLoja.obter('operacaoGestaoPendente');
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
    this.exigirTrocaDisponivel();
    this.invalidarRecuperacao();
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
    await this.assinatura.sincronizar();
    });
  }

  async consultarVinculos(email: string, codigo: string): Promise<Vinculo[]> {
    if (!this.backend.consultarVinculos) return [];
    return this.backend.consultarVinculos(email, codigo);
  }

  pode(permissao: Permissao): boolean {
    const estado = this.conta.obter();
    if (estado.reautenticacaoNecessaria || (this.backend.modo === 'http' && (!estado.sessao || !estado.identidade || !this.acessoOffline.permitido(estado.identidade)))) return false;
    const i = estado.identidade;
    return !!i && (!i.papel || i.papel === 'dono' || (i.permissoes ?? []).includes(permissao));
  }

  async entrar(email: string, codigo: string, vinculo?: Vinculo): Promise<void> {
    this.exigirTrocaDisponivel();
    this.invalidarRecuperacao();
    return this.executarAcesso(async () => {
    await this.preflightTroca(email, vinculo?.operadorId);
    const anterior = this.conta.obter();
    const semPerfil = anterior.identidade !== null && anterior.perfil === null;
    const legado = anterior.identidade && anterior.perfil ? { email: anterior.perfil.email, aparelhoId: anterior.identidade.aparelhoId } : undefined;
    const aparelhoLegado = semPerfil ? anterior.identidade!.aparelhoId : anterior.identidade?.contaId === vinculo?.contaId && anterior.identidade?.lojaId === vinculo?.lojaId ? anterior.identidade?.aparelhoId : undefined;
    const aparelhoId = vinculo
      ? await this.instalacao.aparelhoDaLoja(vinculo.contaId, vinculo.lojaId, aparelhoLegado)
      : semPerfil ? anterior.identidade!.aparelhoId : await this.instalacao.aparelhoDaConta(email, legado);
    const sessao = await this.backend.entrar({ email, codigo, aparelhoId, aparelhoNome: NOME_APARELHO_PADRAO,
      ...(vinculo ? { operadorId: vinculo.operadorId, aceitarConvite: vinculo.estado === 'convidado' } : {}) });
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
    }, false, !!vinculo);
    await this.assinatura.sincronizar();
    });
  }

  async listarPerfisLocais() {
    const ids = await this.armazenamento.obter<string[]>('perfis_locais') ?? [];
    const atual = this.conta.obter();
    if (atual.identidade && !ids.includes(atual.identidade.operadorId)) ids.push(atual.identidade.operadorId);
    const perfis = [];
    for (const id of ids) {
      const ativo = atual.identidade?.operadorId === id;
      const bruto = ativo ? atual : await this.armazenamento.obter(`perfil-conta:${id}`);
      if (!bruto) continue;
      const p = normalizarEstadoConta(bruto);
      if (p.identidade && p.perfil) {
        await this.acessoOffline.carregar(p.identidade);
        const resumo = ativo ? await this.resumoSyncAtual() : await this.armazenamento.obter<ResumoSyncPerfil>(`resumo-sync-perfil:${id}`);
        perfis.push({ operadorId: id, nome: p.perfil.nomeResponsavel, loja: p.perfil.nomeLoja, email: p.perfil.email, pausado: p.sessao !== null, ativo,
          exigeReautenticacao: !p.sessao || p.reautenticacaoNecessaria || (this.backend.modo === 'http' && !this.acessoOffline.permitido(p.identidade)),
          offlineAte: this.acessoOffline.limite(p.identidade), resumo });
      }
    }
    return perfis;
  }

  private async resumoSyncAtual(): Promise<ResumoSyncPerfil> {
    const e = await this.repositorioSync.estado();
    return { pendentes: e.entradas.filter(x => !x.bloqueada).length, rejeitadas: e.entradas.filter(x => x.bloqueada).length, ultimaSincronizacaoEm: e.ultimaSincronizacaoEm };
  }

  private exigirTrocaDisponivel(): void {
    if (this.sincronizacao.obter().situacao === 'sincronizando' || this.conta.transicao.obter()) throw new ErroBackend('conflito', 'Aguarde a confirmação em andamento antes de alternar o usuário.');
  }

  private async guardarPerfil(estado: EstadoConta): Promise<void> {
    if (!estado.identidade || !estado.perfil) return;
    const id = estado.identidade.operadorId;
    if (this.conta.obter().identidade?.operadorId === id) await this.armazenamento.gravar(`resumo-sync-perfil:${id}`, await this.resumoSyncAtual());
    await this.armazenamento.gravar(`perfil-conta:${id}`, estado);
    const ids = await this.armazenamento.obter<string[]>('perfis_locais') ?? [];
    if (!ids.includes(id)) await this.armazenamento.gravar('perfis_locais', [...ids, id]);
  }

  async retomarPerfil(operadorId: string): Promise<void> {
    this.exigirTrocaDisponivel();
    return this.executarAcesso(async () => {
      this.conta.transicao.alterar(true);
      this.armazenamentoDaLoja.bloquearAlteracoes(true);
      await this.aguardarGravacoes();
      if (this.carrinho.obter().parcelas.length && !this.carrinho.obter().concluidaId) throw new ErroBackend('conflito', 'Conclua a cobrança antes de alternar o usuário.');
      const bruto = await this.armazenamento.obter(`perfil-conta:${operadorId}`);
      if (!bruto) throw new ErroBackend('conflito', 'Entre com seu código pessoal para autorizar este perfil.');
      const salvo = normalizarEstadoConta(bruto);
      if (!salvo.sessao || !salvo.perfil) throw new ErroBackend('conflito', 'Entre novamente com seu código pessoal.');
      await this.acessoOffline.carregar(salvo.sessao);
      let perfil: PerfilBackend;
      try { perfil = await this.backend.obterPerfil(salvo.sessao.token); }
      catch (erro) {
        if (erro instanceof ErroBackend && erro.status === 401) await this.guardarPerfil({ ...salvo, sessao: null, reautenticacaoNecessaria: true });
        if (erro instanceof ErroBackend && erro.codigo === 'rede' && this.acessoOffline.permitido(salvo.sessao)) {
          await this.acessoOffline.observar(salvo.sessao);
          await this.aplicarAcesso(salvo.sessao, salvo.perfil, false, true, false);
          await this.sincronizacao.atualizarEstado();
          return;
        }
        throw erro;
      }
      this.validarPerfil(salvo.sessao, perfil);
      await this.aplicarAcesso({ ...salvo.sessao, papel: perfil.papel, permissoes: perfil.permissoes }, { ...salvo.perfil, nomeResponsavel: perfil.nomeResponsavel, nomeLoja: perfil.nomeLoja }, false, true);
      await this.assinatura.sincronizar();
      await this.sincronizacao.atualizarEstado();
    });
  }

  private validarPerfil(sessao: Sessao, perfil: PerfilBackend): void {
    if (perfil.contaId !== sessao.contaId || perfil.lojaId !== sessao.lojaId || perfil.operadorId !== sessao.operadorId) throw new ErroBackend('resposta_invalida', 'Perfil divergente da sessão.');
  }

  private invalidarRecuperacao(): number {
    this.recuperacao = null;
    return ++this.geracaoAcesso;
  }

  obterRecuperacaoPendente(): { recuperacao: Omit<RecuperacaoAparelho, 'token'>; aparelhoSubstituidoId: string | null } | null {
    const tentativa = this.recuperacao;
    if (!tentativa || tentativa.geracao !== this.geracaoAcesso || tentativa.vinculo !== this.vinculoAtual()) return null;
    const { token: _token, ...visao } = tentativa.desafio;
    return { recuperacao: { ...visao, perfil: { ...visao.perfil }, aparelhos: visao.aparelhos.map(a => ({ ...a })) }, aparelhoSubstituidoId: tentativa.alvo ?? null };
  }

  cancelarRecuperacao(): void { this.invalidarRecuperacao(); }

  private verificarGeracao(geracao: number): void {
    if (geracao !== this.geracaoAcesso) throw new ErroBackend('conflito', 'Esta tentativa de acesso foi cancelada.');
  }

  private vinculoAtual(): string {
    const { identidade, perfil } = this.conta.obter();
    return JSON.stringify({ identidade, perfil });
  }

  private verificarVinculo(geracao: number, vinculo: string): void {
    this.verificarGeracao(geracao);
    if (this.vinculoAtual() !== vinculo) throw new ErroBackend('conflito', 'A conta local mudou. Inicie a recuperação novamente.');
  }

  async iniciarRecuperacao(email: string, codigo: string): Promise<Omit<RecuperacaoAparelho, 'token'>> {
    this.exigirTrocaDisponivel();
    const geracao = this.invalidarRecuperacao();
    return this.executarAcesso(async () => {
      this.verificarGeracao(geracao);
      const anterior = this.conta.obter();
      if (anterior.identidade && !anterior.perfil) throw new ErroBackend('conflito', 'Entre primeiro na conta original para recuperar seu perfil.');
      const vinculo = this.vinculoAtual();
      await this.preflightTroca(email);
      this.verificarVinculo(geracao, vinculo);
      const legado = anterior.identidade && anterior.perfil ? { email: anterior.perfil.email, aparelhoId: anterior.identidade.aparelhoId } : undefined;
      const aparelhoId = await this.instalacao.aparelhoDaConta(email, legado);
      this.verificarVinculo(geracao, vinculo);
      const resposta = await this.backend.iniciarRecuperacao({ email, codigo, aparelhoId, aparelhoNome: NOME_APARELHO_PADRAO });
      this.verificarVinculo(geracao, vinculo);
      const lido = RecuperacaoAparelhoSchema.safeParse(resposta);
      if (!lido.success) throw new ErroBackend('resposta_invalida', 'Resposta de recuperação inválida.');
      const desafio = lido.data;
      if (desafio.aparelhoNovoId !== aparelhoId || desafio.aparelhoNovoNome !== NOME_APARELHO_PADRAO || desafio.perfil.email.trim().toLowerCase() !== email.trim().toLowerCase()) throw new ErroBackend('resposta_invalida', 'Recuperação divergente da solicitação.');
      if (anterior.identidade && anterior.perfil?.email.trim().toLowerCase() === email.trim().toLowerCase() && (desafio.perfil.contaId !== anterior.identidade.contaId || desafio.perfil.lojaId !== anterior.identidade.lojaId || desafio.perfil.operadorId !== anterior.identidade.operadorId)) throw new ErroBackend('resposta_invalida', 'Recuperação divergente da conta local.');
      this.recuperacao = { desafio, geracao, vinculo };
      const { token: _token, ...visao } = desafio;
      return { ...visao, perfil: { ...visao.perfil }, aparelhos: visao.aparelhos.map(a => ({ ...a })) };
    });
  }

  async confirmarRecuperacao(aparelhoSubstituidoId: string): Promise<void> {
    const tentativa = this.recuperacao;
    if (!tentativa) throw new ErroBackend('conflito', 'Inicie a recuperação antes de confirmar.');
    return this.executarAcesso(async () => {
      const { desafio, geracao, vinculo } = tentativa;
      this.verificarVinculo(geracao, vinculo);
      if (this.recuperacao !== tentativa) throw new ErroBackend('conflito', 'Esta recuperação não está mais disponível.');
      if (!desafio.aparelhos.some(a => a.id === aparelhoSubstituidoId) || (tentativa.alvo && tentativa.alvo !== aparelhoSubstituidoId)) throw new ErroBackend('conflito', 'Escolha o aparelho apresentado na recuperação.');
      await this.preflightTroca(desafio.perfil.email);
      this.verificarVinculo(geracao, vinculo);
      tentativa.alvo = aparelhoSubstituidoId;
      let resposta: Sessao;
      try {
        resposta = await this.backend.confirmarRecuperacao({ id: desafio.id, token: desafio.token, aparelhoSubstituidoId, confirmar: true });
      } catch (erro) {
        if (erro instanceof ErroBackend && erro.status === 401 && this.recuperacao === tentativa) this.recuperacao = null;
        throw erro;
      }
      this.verificarVinculo(geracao, vinculo);
      const lido = SessaoSchema.safeParse(resposta);
      if (!lido.success) throw new ErroBackend('resposta_invalida', 'Sessão de recuperação inválida.');
      const sessao = lido.data;
      if (sessao.aparelhoId !== desafio.aparelhoNovoId || sessao.contaId !== desafio.perfil.contaId || sessao.lojaId !== desafio.perfil.lojaId || sessao.operadorId !== desafio.perfil.operadorId) throw new ErroBackend('resposta_invalida', 'Sessão divergente da recuperação.');
      const respostaPerfil = await this.backend.obterPerfil(sessao.token);
      this.verificarVinculo(geracao, vinculo);
      const perfil = PerfilResSchema.safeParse(respostaPerfil);
      if (!perfil.success) throw new ErroBackend('resposta_invalida', 'Perfil de recuperação inválido.');
      this.validarPerfil(sessao, perfil.data);
      if (perfil.data.papel !== 'dono' || perfil.data.email.trim().toLowerCase() !== desafio.perfil.email.trim().toLowerCase()) throw new ErroBackend('resposta_invalida', 'Perfil divergente da recuperação.');
      this.verificarVinculo(geracao, vinculo);
      const perfilLocal: Perfil = { nomeResponsavel: perfil.data.nomeResponsavel, nomeLoja: perfil.data.nomeLoja, email: perfil.data.email, aparelhoNome: NOME_APARELHO_PADRAO };
      try {
        await this.aplicarAcesso(sessao, perfilLocal);
      } catch (erro) {
        const atual = this.conta.obter();
        const identidade = atual.identidade;
        const p = atual.perfil;
        if (this.recuperacao === tentativa && this.geracaoAcesso === geracao && atual.sessao === null && identidade && p &&
          identidade.contaId === sessao.contaId && identidade.lojaId === sessao.lojaId && identidade.operadorId === sessao.operadorId && identidade.aparelhoId === sessao.aparelhoId &&
          p.email === perfilLocal.email && p.nomeResponsavel === perfilLocal.nomeResponsavel && p.nomeLoja === perfilLocal.nomeLoja && p.aparelhoNome === perfilLocal.aparelhoNome && p.tipoLoja === perfilLocal.tipoLoja) {
          tentativa.vinculo = this.vinculoAtual();
        }
        throw erro;
      }
      if (this.recuperacao === tentativa) this.recuperacao = null;
      await this.assinatura.sincronizar();
    });
  }

  private executarAcesso<T>(tarefa: () => Promise<T>): Promise<T> {
    const resultado = this.filaAcesso.then(async () => {
      if (!this.contaCarregada) { await this.conta.carregar(); this.contaCarregada = true; }
      try { return await tarefa(); }
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

  private async preflightTroca(email: string, operadorId?: string): Promise<void> {
    const anterior = this.conta.obter();
    if (!anterior.identidade || !anterior.perfil || (anterior.perfil.email.trim().toLowerCase() === email.trim().toLowerCase() && (!operadorId || operadorId === anterior.identidade.operadorId))) return;
    this.conta.transicao.alterar(true);
    this.armazenamentoDaLoja.bloquearAlteracoes(true);
    await this.aguardarGravacoes();
    if (this.carrinho.obter().parcelas.length && !this.carrinho.obter().concluidaId) throw new ErroBackend('conflito', 'Conclua a cobrança antes de alternar o usuário.');
    if (anterior.identidade.papel && operadorId) return;
    // Uma tentativa de acesso pode preceder iniciar(); consulte o estado durável
    // antes de decidir se a conta anterior está livre de pendências.
    if (!(this.armazenamento instanceof ArmazenamentoSqlite)) {
      await Promise.all([this.produtos.carregar(), this.vendas.carregar(), this.caixa.carregar(), this.carrinho.carregar()]);
    }
    if (await this.possuiPendencias()) throw new ErroBackend('conflito', 'Há operações locais pendentes. Entre na mesma conta para recuperar e sincronizar antes de trocar.');
  }

  private async possuiPendencias(): Promise<boolean> {
    const checkout = this.carrinho.obter();
    if (checkout.itens.length > 0 && !checkout.concluidaId) return true;
    await this.repositorioSync.preparar();
    return (await this.repositorioSync.estado()).entradas.length > 0;
  }

  private limparMemoriaDaLoja(): void {
    this.produtos.limparMemoria(); this.vendas.limparMemoria(); this.caixa.limparMemoria();
    this.preferencias.limparMemoria(); this.ordemAtalhos.limparMemoria(); this.carrinho.limparMemoria(); this.assinatura.limparMemoria();
  }

  private async aplicarAcesso(sessao: Sessao, perfil: Perfil, semear = false, permitirPausa = false, renovarOffline = true): Promise<void> {
    const anterior: EstadoConta = this.conta.obter();
    const mudou = anterior.identidade !== null && (anterior.identidade.contaId !== sessao.contaId || anterior.identidade.lojaId !== sessao.lojaId || anterior.identidade.operadorId !== sessao.operadorId);
    const salvoDestino = mudou ? await this.armazenamento.obter(`perfil-conta:${sessao.operadorId}`) : anterior;
    const destinoAnterior = salvoDestino ? normalizarEstadoConta(salvoDestino) : null;
    this.conta.transicao.alterar(true);
    this.armazenamentoDaLoja.bloquearAlteracoes(true);
    let gravada = false;
    try {
      await this.aguardarGravacoes();
      if (mudou && !(permitirPausa && anterior.identidade?.papel) && await this.possuiPendencias()) throw new ErroBackend('conflito', 'Há operações locais pendentes. Entre na mesma conta para recuperar e sincronizar antes de trocar.');
      if (mudou) {
        if (this.carrinho.obter().parcelas.length && !this.carrinho.obter().concluidaId) throw new ErroBackend('conflito', 'Conclua a cobrança antes de alternar o usuário.');
        await this.guardarPerfil(anterior);
      }
      if (renovarOffline && this.backend.modo === 'http') await this.acessoOffline.confirmar(sessao);
      await this.conta.registrar(sessao, perfil);
      gravada = true;
      if (destinoAnterior?.identidade) await this.revalidarVisibilidade(destinoAnterior.identidade, sessao);
      if (sessao.papel) await this.instalacao.confirmarAparelhoDaLoja(sessao.contaId, sessao.lojaId, sessao.aparelhoId);
      if (mudou) this.limparMemoriaDaLoja();
      if (semear) {
        this.armazenamentoDaLoja.bloquearAlteracoes(false);
        await this.semear();
        this.armazenamentoDaLoja.bloquearAlteracoes(true);
      }
      await this.carregarDadosDaLoja();
      // A credencial ativa fica somente em `conta`; o cofre de perfis guarda pausados.
      await this.armazenamento.remover(`perfil-conta:${sessao.operadorId}`);
    } catch (erro) {
      if (gravada) await this.conta.invalidarSessao(sessao.token).catch(() => undefined);
      throw erro;
    } finally {
      this.armazenamentoDaLoja.bloquearAlteracoes(false);
      this.conta.transicao.alterar(false);
    }
  }

  async sair(): Promise<{ revogadaNoServidor: boolean }> {
    this.invalidarRecuperacao();
    const estado = this.conta.obter();
    const tokenUsado = estado.sessao?.token;
    const operadorUsado = estado.identidade?.operadorId;
    if (!tokenUsado) return { revogadaNoServidor: false };
    const pendenteId = this.backend.modo === 'http' ? this.novoId() : null;
    await this.executarAcesso(async () => {
      if (pendenteId) {
        // Esta credencial fica no cofre exclusivamente para revogar a sessão.
        await this.armazenamento.gravar(`perfil-conta:${pendenteId}`, estado);
        const ids = await this.armazenamento.obter<string[]>('saidas_pendentes') ?? [];
        await this.armazenamento.gravar('saidas_pendentes', [...ids, pendenteId]);
      }
      await this.conta.invalidarSessao(tokenUsado);
      if (operadorUsado) {
        const pausado = await this.armazenamento.obter<EstadoConta>(`perfil-conta:${operadorUsado}`);
        if (pausado?.sessao?.token === tokenUsado) await this.guardarPerfil({ ...pausado, sessao: null, reautenticacaoNecessaria: true });
      }
    });
    let revogadaNoServidor = false;
    try { await this.backend.sair(tokenUsado); revogadaNoServidor = this.backend.modo === 'http'; }
    catch (erro) {
      if (erro instanceof ErroBackend && erro.status === 401) revogadaNoServidor = this.backend.modo === 'http';
      else if (!(erro instanceof ErroBackend)) throw erro;
    }
    if (revogadaNoServidor && pendenteId) await this.removerSaidaPendente(pendenteId);
    return { revogadaNoServidor };
  }

  private removerSaidaPendente(id: string): Promise<void> {
    return this.executarAcesso(async () => {
      await this.armazenamento.remover(`perfil-conta:${id}`);
      const ids = await this.armazenamento.obter<string[]>('saidas_pendentes') ?? [];
      await this.armazenamento.gravar('saidas_pendentes', ids.filter(x => x !== id));
    });
  }

  processarSaidasPendentes(): Promise<void> {
    const trabalho = this.filaSaidas.then(async () => {
      if (this.backend.modo !== 'http') return;
      const ids = await this.armazenamento.obter<string[]>('saidas_pendentes') ?? [];
      for (const id of ids) {
        const salvo = await this.armazenamento.obter<EstadoConta>(`perfil-conta:${id}`);
        if (salvo?.sessao) {
          try { await this.backend.sair(salvo.sessao.token); }
          catch (erro) { if (!(erro instanceof ErroBackend && erro.status === 401)) return; }
        }
        await this.removerSaidaPendente(id);
      }
    });
    this.filaSaidas = trabalho.catch(() => undefined);
    return trabalho;
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
