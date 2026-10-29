import type { Produto, Venda } from '@pdv/shared';
import { Carrinho, type EstadoCarrinho, type Parcela } from './carrinho';
import type { PersistenciaCheckout, RegistroCheckout } from './checkoutTipos';
import { Observavel } from './observavel';

const vazio = (): EstadoCarrinho => ({ itens: [], parcelas: [], removido: null, concluidaId: null });
type ProdutoCarrinho = Pick<Produto, 'id' | 'nome' | 'ean' | 'precoCentavos' | 'unidade'>;

/** Fachada assíncrona do app. Carrinho continua sendo o redutor puro usado pelos testes de domínio. */
export class CarrinhoDuravel extends Observavel<EstadoCarrinho> {
  private registro: RegistroCheckout | null = null;
  private fila: Promise<void> = Promise.resolve();
  private persistencia: PersistenciaCheckout | null = null;
  private contexto: { novoId: () => string; agora: () => string; caixaId: () => string | null; aposConcluir?: () => Promise<void>; podeAlterar?: () => boolean; podeIniciar?: () => boolean } | null = null;

  constructor() { super(vazio()); }

  configurar(persistencia: PersistenciaCheckout, contexto: NonNullable<CarrinhoDuravel['contexto']>): void {
    this.persistencia = persistencia;
    this.contexto = contexto;
  }
  aguardarGravacoes(): Promise<void> { return this.fila; }
  limparMemoria(): void { this.registro = null; this.definir(vazio()); }
  private exigirDisponivel(): void {
    if (this.contexto?.podeAlterar?.() === false) throw new Error('Aguarde a troca de conta antes de alterar o checkout.');
  }

  private enfileirar<T>(tarefa: () => Promise<T>): Promise<T> {
    const resultado = this.fila.then(tarefa);
    this.fila = resultado.then(() => undefined, () => undefined);
    return resultado;
  }

  carregar(): Promise<void> {
    return this.enfileirar(async () => {
      if (!this.persistencia) throw new Error('Persistência do checkout não configurada.');
      const salvo = await this.persistencia.carregar();
      this.registro = salvo;
      this.definir(salvo?.estado ?? vazio());
    });
  }

  private mudar(operacao: (redutor: Carrinho) => void): Promise<void> {
    return this.enfileirar(async () => {
      if (!this.persistencia || !this.contexto) throw new Error('Persistência do checkout não configurada.');
      this.exigirDisponivel();
      if (this.obter().itens.length === 0 && this.contexto.podeIniciar?.() === false) throw new Error('Entre novamente antes de iniciar uma nova venda.');
      if (this.obter().concluidaId) throw new Error('Esta venda já foi concluída. Inicie uma nova venda.');
      const redutor = new Carrinho();
      redutor.restaurar(this.obter());
      operacao(redutor);
      const estado = redutor.obter();
      if (this.obter().parcelas.length > 0 && JSON.stringify(estado.itens) !== JSON.stringify(this.obter().itens)) {
        throw new Error('Conclua a cobrança antes de alterar os itens recebidos.');
      }
      const registro = estado.itens.length === 0 ? null : {
        vendaId: this.registro?.vendaId ?? this.contexto.novoId(),
        criadaEm: this.registro?.criadaEm ?? this.contexto.agora(),
        caixaId: this.registro ? this.registro.caixaId : this.contexto.caixaId(),
        estado,
      };
      await this.persistencia.salvar(registro);
      this.registro = registro;
      this.definir(estado);
    });
  }

  readonly adicionarProduto = (produto: ProdutoCarrinho, milesimos?: number) => this.mudar((r) => r.adicionarProduto(produto, milesimos));
  readonly adicionarAvulso = (valor: number, descricao: string) => this.mudar((r) => r.adicionarAvulso(valor, descricao));
  readonly definirQuantidade = (chave: string, quantidade: number) => this.mudar((r) => r.definirQuantidade(chave, quantidade));
  readonly remover = (chave: string) => this.mudar((r) => r.remover(chave));
  readonly desfazerRemocao = () => this.mudar((r) => r.desfazerRemocao());
  readonly destacar = (chave: string) => this.mudar((r) => r.destacar(chave));
  readonly adicionarParcela = (parcela: Parcela) => this.mudar((r) => r.adicionarParcela(parcela));

  readonly limpar = (): Promise<void> => this.enfileirar(async () => {
    if (!this.persistencia) throw new Error('Persistência do checkout não configurada.');
    this.exigirDisponivel();
    if (this.obter().parcelas.length > 0 && !this.obter().concluidaId) throw new Error('Há valores recebidos. Conclua a venda antes de limpar.');
    await this.persistencia.salvar(null);
    this.registro = null;
    this.definir(vazio());
  });

  readonly concluir = (): Promise<Venda> => this.enfileirar(async () => {
    if (!this.persistencia) throw new Error('Persistência do checkout não configurada.');
    this.exigirDisponivel();
    const venda = await this.persistencia.concluir();
    await this.contexto?.aposConcluir?.();
    // Não há segunda gravação: o serviço já confirmou venda/outbox/rascunho no mesmo commit.
    if (this.registro) this.registro = { ...this.registro, estado: { ...this.obter(), concluidaId: venda.id } };
    this.definir({ ...this.obter(), concluidaId: venda.id });
    return venda;
  });
}

