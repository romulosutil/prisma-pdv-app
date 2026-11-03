import { dentroDoLimite, type PlanoId, type Produto } from '@pdv/shared';
import { registrar } from '@/diagnostico/registro';
import type { Ambiente } from './ambiente';
import { ErroDeDominio } from './erros';
import { Persistido } from './observavel';
import type { Unidade } from './tipos';

export interface NovoProduto {
  nome: string;
  /** 8 a 14 dígitos; produtos a granel/atalhos não têm. */
  ean?: string | null;
  precoCentavos: number;
  unidade?: Unidade;
  /** Em milésimos da unidade (a mesma escala de `quantidadeMilesimos`). */
  estoque?: number | null;
  estoqueMinimo?: number | null;
  atalho?: boolean;
}

export interface ContextoProdutos {
  lojaId: () => string;
  planoId: () => PlanoId;
  autorizar?: () => void;
  estoquePorMovimentos?: boolean;
}

/** "Pão Francês" → "pao frances": busca sem acento nem caixa. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const porNome = (a: Produto, b: Produto): number => a.nome.localeCompare(b.nome, 'pt-BR');

/** Catálogo da loja. Exclusão é lógica (`excluidoEm`) para a sincronização futura. */
export class ProdutosRepo extends Persistido<Produto[]> {
  constructor(
    private readonly amb: Ambiente,
    private readonly contexto: ContextoProdutos,
  ) {
    super(amb.armazenamento, 'produtos', []);
  }

  /** Produtos não excluídos, em ordem alfabética. */
  listar(): Produto[] {
    return this.obter()
      .filter((p) => p.excluidoEm === null)
      .sort(porNome);
  }

  atalhos(): Produto[] {
    return this.listar().filter((p) => p.atalho);
  }

  buscarPorId(id: string): Produto | null {
    return this.listar().find((p) => p.id === id) ?? null;
  }

  buscarPorEan(ean: string): Produto | null {
    const digitos = ean.replace(/\D/g, '');
    return this.listar().find((p) => p.ean === digitos) ?? null;
  }

  /** Todos os termos precisam aparecer no nome; quem começa pelo termo vem primeiro. */
  buscarPorNome(consulta: string): Produto[] {
    const termos = normalizarBusca(consulta).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return [];
    return this.listar()
      .map((produto) => ({ produto, nome: normalizarBusca(produto.nome) }))
      .filter(({ nome }) => termos.every((t) => nome.includes(t)))
      .sort((a, b) => Number(b.nome.startsWith(termos[0]!)) - Number(a.nome.startsWith(termos[0]!)))
      .map(({ produto }) => produto);
  }

  /** Lança `ErroDeDominio('limite_plano')` quando o plano não comporta mais um produto. */
  async criar(dados: NovoProduto): Promise<Produto> {
    this.contexto.autorizar?.();
    if (!dentroDoLimite(this.contexto.planoId(), 'produtos', this.listar().length)) {
      throw new ErroDeDominio('limite_plano', 'O plano atual não comporta mais produtos.', 'produtos');
    }
    this.validar(dados);
    const agora = this.amb.relogio.agora().toISOString();
    const produto: Produto = {
      id: this.amb.novoId(),
      lojaId: this.contexto.lojaId(),
      nome: dados.nome.trim(),
      ean: dados.ean ?? null,
      precoCentavos: dados.precoCentavos,
      unidade: dados.unidade ?? 'un',
      estoque: dados.estoque ?? null,
      estoqueMinimo: dados.estoqueMinimo ?? null,
      atalho: dados.atalho ?? false,
      criadoEm: agora,
      atualizadoEm: agora,
      excluidoEm: null,
      versao: 1,
    };
    await this.modificar((atual) => [...atual, produto]);
    registrar('produto', 'produto cadastrado', { ean: produto.ean, precoCentavos: produto.precoCentavos, unidade: produto.unidade, total: this.listar().length });
    return produto;
  }

  async editar(id: string, mudancas: Partial<NovoProduto>): Promise<Produto> {
    this.contexto.autorizar?.();
    const atual = this.buscarPorId(id);
    if (!atual) throw new ErroDeDominio('produto_inexistente', 'Produto não encontrado.');
    if (this.contexto.estoquePorMovimentos && mudancas.estoque !== undefined && mudancas.estoque !== atual.estoque) throw new ErroDeDominio('valor_invalido', 'Use os movimentos de estoque para alterar o saldo.');
    if (this.contexto.estoquePorMovimentos && atual.estoque !== null && mudancas.unidade && mudancas.unidade !== atual.unidade) throw new ErroDeDominio('valor_invalido', 'A unidade de um estoque controlado não pode mudar. Cadastre outro produto.');
    this.validar(mudancas, id);
    const editado: Produto = {
      ...atual,
      nome: mudancas.nome?.trim() ?? atual.nome,
      ean: mudancas.ean === undefined ? atual.ean : mudancas.ean,
      unidade: mudancas.unidade ?? atual.unidade,
      estoque: mudancas.estoque === undefined ? atual.estoque : mudancas.estoque,
      estoqueMinimo: mudancas.estoqueMinimo === undefined ? atual.estoqueMinimo : mudancas.estoqueMinimo,
      atalho: mudancas.atalho ?? atual.atalho,
      precoCentavos: mudancas.precoCentavos ?? atual.precoCentavos,
      atualizadoEm: this.amb.relogio.agora().toISOString(),
      versao: atual.versao + 1,
    };
    await this.modificar((lista) => lista.map((p) => (p.id === id ? editado : p)));
    registrar('produto', 'produto editado', { ean: editado.ean, campos: Object.keys(mudancas) });
    return editado;
  }

  async excluir(id: string): Promise<void> {
    this.contexto.autorizar?.();
    const atual = this.buscarPorId(id);
    if (!atual) throw new ErroDeDominio('produto_inexistente', 'Produto não encontrado.');
    const agora = this.amb.relogio.agora().toISOString();
    await this.modificar((lista) =>
      lista.map((p) => (p.id === id ? { ...p, excluidoEm: agora, atualizadoEm: agora, versao: p.versao + 1 } : p)),
    );
    registrar('produto', 'produto excluído', { ean: atual.ean });
  }

  async substituirTodos(produtos: Produto[]): Promise<void> {
    await this.modificar(() => produtos);
  }

  private validar(dados: Partial<NovoProduto>, idAtual?: string): void {
    if (dados.nome !== undefined && dados.nome.trim().length === 0) {
      throw new ErroDeDominio('valor_invalido', 'O nome do produto é obrigatório.');
    }
    if (dados.precoCentavos !== undefined && (!Number.isSafeInteger(dados.precoCentavos) || dados.precoCentavos < 0)) {
      throw new ErroDeDominio('valor_invalido', 'O preço precisa ser um valor em centavos, sem negativos.');
    }
    if (dados.ean) {
      if (!/^\d{8,14}$/.test(dados.ean)) throw new ErroDeDominio('valor_invalido', 'O código de barras tem de 8 a 14 dígitos.');
      const existente = this.buscarPorEan(dados.ean);
      if (existente && existente.id !== idAtual) {
        throw new ErroDeDominio('ean_duplicado', `Este código já está em "${existente.nome}".`);
      }
    }
  }
}
