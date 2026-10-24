import type { Plano } from '@pdv/shared';
import { AssinaturaServico } from '@/servicos/assinatura';
import type { Backend } from '@/servicos/backend';
import { BackendHttp } from '@/servicos/backendHttp';
import { BackendLocal } from '@/servicos/backendLocal';
import type { Armazenamento } from './armazenamento';
import { CaixaRepo } from './caixa';
import { ContaRepo, NOME_APARELHO_PADRAO } from './conta';
import { OrdemAtalhosRepo } from './ordemAtalhos';
import { PreferenciasRepo } from './preferencias';
import { ProdutosRepo } from './produtos';
import { RelogioApp } from './relogio';
import { gerarSemente } from './semente';
import { ErroDeDominio } from './erros';
import { VendasRepo } from './vendas';

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
  readonly preferencias: PreferenciasRepo;
  readonly produtos: ProdutosRepo;
  readonly ordemAtalhos: OrdemAtalhosRepo;
  readonly vendas: VendasRepo;
  readonly caixa: CaixaRepo;
  readonly assinatura: AssinaturaServico;

  constructor(
    private readonly armazenamento: Armazenamento,
    private readonly novoId: () => string,
    urlApi?: string,
  ) {
    this.relogio = new RelogioApp(armazenamento);
    this.conta = new ContaRepo(armazenamento);
    this.backend = urlApi
      ? new BackendHttp(urlApi.replace(/\/+$/, ''), () => this.conta.obter().sessao?.token ?? null)
      : new BackendLocal(armazenamento, this.relogio, novoId);
    this.assinatura = new AssinaturaServico(armazenamento, this.relogio, this.backend, () => this.conta.obter().sessao !== null);

    const ambiente = { armazenamento, relogio: this.relogio, novoId };
    const sessao = () => {
      const atual = this.conta.obter().sessao;
      if (!atual) throw new ErroDeDominio('sem_sessao', 'Entre na sua conta primeiro.');
      return atual;
    };
    // Sem assinatura (ainda) vale o menor plano: o cliente só usa o catálogo para UX, o servidor revalida.
    const planoId = () => this.assinatura.obter().licenca?.planoId ?? 'essencial';

    this.preferencias = new PreferenciasRepo(armazenamento);
    this.produtos = new ProdutosRepo(ambiente, { lojaId: () => sessao().lojaId, planoId });
    this.ordemAtalhos = new OrdemAtalhosRepo(armazenamento);
    this.vendas = new VendasRepo(ambiente, { sessao });
    this.caixa = new CaixaRepo(ambiente, { sessao, planoId });
  }

  /** Carrega tudo do armazenamento e confere a assinatura (avaliação de tempo e cobranças devidas). */
  async iniciar(): Promise<void> {
    await Promise.all([
      this.relogio.carregar(),
      this.conta.carregar(),
      this.preferencias.carregar(),
      this.produtos.carregar(),
      this.ordemAtalhos.carregar(),
      this.vendas.carregar(),
      this.caixa.carregar(),
      this.assinatura.carregar(),
    ]);
    await this.assinatura.sincronizar();
  }

  async listarPlanos(): Promise<Plano[]> {
    return this.backend.listarPlanos();
  }

  async criarConta(formulario: FormularioConta): Promise<void> {
    const aparelhoId = this.novoId();
    const sessao = await this.backend.criarConta({
      email: formulario.email,
      nomeResponsavel: formulario.nomeResponsavel,
      nomeLoja: formulario.nomeLoja,
      documento: formulario.documento,
      aparelhoId,
      aparelhoNome: NOME_APARELHO_PADRAO,
    });
    await this.conta.registrar(sessao, {
      nomeResponsavel: formulario.nomeResponsavel,
      nomeLoja: formulario.nomeLoja,
      tipoLoja: formulario.tipoLoja,
      email: formulario.email,
      aparelhoNome: NOME_APARELHO_PADRAO,
    });
    if (this.backend.modo === 'demo') await this.semear();
  }

  /** O contrato da API não tem rota de perfil: sem ela, os nomes exibidos vêm do e-mail. */
  async entrar(email: string, codigo: string): Promise<void> {
    const sessao = await this.backend.entrar({ email, codigo, aparelhoId: this.novoId(), aparelhoNome: NOME_APARELHO_PADRAO });
    const nome = email.split('@')[0] ?? 'Você';
    await this.conta.registrar(sessao, {
      nomeResponsavel: nome.charAt(0).toUpperCase() + nome.slice(1),
      nomeLoja: 'Minha loja',
      email,
      aparelhoNome: NOME_APARELHO_PADRAO,
    });
    await this.assinatura.sincronizar();
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
