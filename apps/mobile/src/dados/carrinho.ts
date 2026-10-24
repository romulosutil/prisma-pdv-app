import { somar, type Centavos, type Produto } from '@pdv/shared';
import { useMemo } from 'react';
import { Observavel, useObservavel } from './observavel';
import { totalDosItens, type ItemNovaVenda, type NovaVenda, type PagamentoNovaVenda } from './vendas';

const MIL = 1000;
const MAXIMO_UNIDADES_MILESIMOS = 999 * MIL;
const MAXIMO_PESO_MILESIMOS = 99_999;

export interface ItemCarrinho extends ItemNovaVenda {
  /** Identifica a linha no carrinho (não vai para a venda). */
  chave: string;
  unidade: Produto['unidade'];
  ean: string | null;
}

/** Quanto um meio já recebeu da venda. Os valores são líquidos: a soma das parcelas é o total. */
export type Parcela = PagamentoNovaVenda;

export interface EstadoCarrinho {
  /** O mais recente (ou o último mexido) vem primeiro: é o item em destaque. */
  itens: ItemCarrinho[];
  parcelas: Parcela[];
  /** Último item removido, para o "Desfazer". */
  removido: { item: ItemCarrinho; indice: number } | null;
  /** Id da venda registrada. Enquanto existir, as telas de cobrança não aceitam mais nada. */
  concluidaId: string | null;
}

const VAZIO: EstadoCarrinho = { itens: [], parcelas: [], removido: null, concluidaId: null };

type ProdutoDoCarrinho = Pick<Produto, 'id' | 'nome' | 'ean' | 'precoCentavos' | 'unidade'>;

const limiteDe = (unidade: Produto['unidade']): number => (unidade === 'kg' ? MAXIMO_PESO_MILESIMOS : MAXIMO_UNIDADES_MILESIMOS);

/** Venda em andamento, em memória, compartilhada entre Vender e Pagar. */
export class Carrinho extends Observavel<EstadoCarrinho> {
  private contador = 0;

  constructor() {
    super(VAZIO);
  }

  /** `milesimos`: 1 un = 1000; para itens por kg, o peso em gramas (0,350 kg = 350). Soma se o produto já está no carrinho. */
  readonly adicionarProduto = (produto: ProdutoDoCarrinho, milesimos: number = MIL): void => {
    const { itens } = this.obter();
    const atual = itens.find((i) => i.produtoId === produto.id);
    if (atual) {
      this.guardar({ itens: [this.comQuantidade(atual, atual.quantidadeMilesimos + milesimos), ...itens.filter((i) => i !== atual)], removido: null });
      return;
    }
    const novo: ItemCarrinho = {
      chave: this.novaChave(),
      produtoId: produto.id,
      descricao: produto.nome,
      precoUnitarioCentavos: produto.precoCentavos,
      quantidadeMilesimos: Math.min(milesimos, limiteDe(produto.unidade)),
      unidade: produto.unidade,
      ean: produto.ean,
    };
    this.guardar({ itens: [novo, ...itens], removido: null });
  };

  readonly adicionarAvulso = (valorCentavos: Centavos, descricao: string): void => {
    const novo: ItemCarrinho = {
      chave: this.novaChave(),
      produtoId: null,
      descricao: descricao.trim() || 'Valor avulso',
      precoUnitarioCentavos: valorCentavos,
      quantidadeMilesimos: MIL,
      unidade: 'un',
      ean: null,
    };
    this.guardar({ itens: [novo, ...this.obter().itens], removido: null });
  };

  /** Define a quantidade (milésimos) da linha e a destaca. Zero ou menos remove. */
  readonly definirQuantidade = (chave: string, milesimos: number): void => {
    const { itens } = this.obter();
    const atual = itens.find((i) => i.chave === chave);
    if (!atual) return;
    if (milesimos <= 0) {
      this.remover(chave);
      return;
    }
    this.guardar({ itens: [this.comQuantidade(atual, milesimos), ...itens.filter((i) => i !== atual)] });
  };

  readonly remover = (chave: string): void => {
    const { itens } = this.obter();
    const indice = itens.findIndex((i) => i.chave === chave);
    const item = itens[indice];
    if (!item) return;
    this.guardar({ itens: itens.filter((i) => i !== item), removido: { item, indice } });
  };

  readonly desfazerRemocao = (): void => {
    const { itens, removido } = this.obter();
    if (!removido) return;
    const restaurados = [...itens];
    restaurados.splice(Math.min(removido.indice, restaurados.length), 0, removido.item);
    this.guardar({ itens: restaurados, removido: null });
  };

  /** Traz a linha para o destaque (onde ficam os controles de quantidade). */
  readonly destacar = (chave: string): void => {
    const { itens } = this.obter();
    const alvo = itens.find((i) => i.chave === chave);
    if (alvo && itens[0] !== alvo) this.guardar({ itens: [alvo, ...itens.filter((i) => i !== alvo)] });
  };

  /** Registra o quanto um meio recebeu. Lança se a parcela passar do que falta. */
  readonly adicionarParcela = (parcela: Parcela): void => {
    const { itens, parcelas } = this.obter();
    if (parcela.valorCentavos <= 0 || parcela.valorCentavos > valorRestante(totalDosItens(itens), parcelas)) {
      throw new RangeError('A parcela precisa ser maior que zero e caber no que falta pagar.');
    }
    this.guardar({ parcelas: [...parcelas, parcela] });
  };

  readonly marcarConcluida = (vendaId: string): void => this.guardar({ concluidaId: vendaId });

  readonly limpar = (): void => this.definir(VAZIO);

  private guardar(parcial: Partial<EstadoCarrinho>): void {
    this.definir({ ...this.obter(), ...parcial });
  }

  private novaChave(): string {
    this.contador += 1;
    return `linha-${this.contador}`;
  }

  private comQuantidade(item: ItemCarrinho, milesimos: number): ItemCarrinho {
    return { ...item, quantidadeMilesimos: Math.min(milesimos, limiteDe(item.unidade)) };
  }
}

export const carrinho = new Carrinho();

// ---------- Cálculos puros ----------

export const totalDoCarrinho = (itens: readonly ItemNovaVenda[]): Centavos => totalDosItens(itens);

/** "6 itens" = unidades somadas; um item por peso conta como um. */
export function quantidadeDeItens(itens: readonly ItemCarrinho[]): number {
  return itens.reduce((soma, i) => soma + (i.unidade === 'kg' ? 1 : Math.round(i.quantidadeMilesimos / MIL)), 0);
}

export const valorPago = (parcelas: readonly Parcela[]): Centavos => somar(...parcelas.map((p) => p.valorCentavos));

export const valorRestante = (total: Centavos, parcelas: readonly Parcela[]): Centavos => Math.max(total - valorPago(parcelas), 0);

export const calcularTroco = (recebidoCentavos: Centavos, devidoCentavos: Centavos): Centavos => Math.max(recebidoCentavos - devidoCentavos, 0);

/** Metade arredondada para cima: dividir R$ 56,05 dá R$ 28,03 + R$ 28,02. */
export const metadeDoValor = (centavos: Centavos): Centavos => Math.ceil(centavos / 2);

/** Atalhos de "valor recebido": o valor exato e as próximas notas redondas que cobrem a conta. */
export function sugestoesDeRecebido(devidoCentavos: Centavos): Centavos[] {
  const reais = Math.ceil(devidoCentavos / 100);
  const proximoMultiplo = (passo: number) => Math.ceil(reais / passo) * passo * 100;
  const candidatos = [devidoCentavos, proximoMultiplo(10), proximoMultiplo(10) + 1000, proximoMultiplo(50), proximoMultiplo(100)];
  return [...new Set(candidatos.filter((c) => c >= devidoCentavos))].sort((a, b) => a - b).slice(0, 4);
}

export function montarVenda(itens: readonly ItemCarrinho[], parcelas: readonly Parcela[]): NovaVenda {
  return {
    itens: itens.map(({ produtoId, descricao, precoUnitarioCentavos, quantidadeMilesimos }) => ({
      produtoId,
      descricao,
      precoUnitarioCentavos,
      quantidadeMilesimos,
    })),
    pagamentos: parcelas.map((p) => ({ ...p })),
  };
}

/** "0,350 kg" a partir de gramas. */
export const formatarPeso = (milesimos: number): string => `${(milesimos / MIL).toFixed(3).replace('.', ',')} kg`;

/** "3×" para unidades, "0,350 kg" para peso. */
export const rotuloDaQuantidade = (item: Pick<ItemCarrinho, 'unidade' | 'quantidadeMilesimos'>): string =>
  item.unidade === 'kg' ? formatarPeso(item.quantidadeMilesimos) : `${Math.round(item.quantidadeMilesimos / MIL)}×`;

// ---------- Hook ----------

export function useCarrinho() {
  const estado = useObservavel(carrinho);
  return useMemo(() => {
    const totalCentavos = totalDoCarrinho(estado.itens);
    return {
      ...estado,
      totalCentavos,
      quantidade: quantidadeDeItens(estado.itens),
      pagoCentavos: valorPago(estado.parcelas),
      restanteCentavos: valorRestante(totalCentavos, estado.parcelas),
      vazio: estado.itens.length === 0,
      adicionarProduto: carrinho.adicionarProduto,
      adicionarAvulso: carrinho.adicionarAvulso,
      definirQuantidade: carrinho.definirQuantidade,
      remover: carrinho.remover,
      desfazerRemocao: carrinho.desfazerRemocao,
      destacar: carrinho.destacar,
      adicionarParcela: carrinho.adicionarParcela,
      marcarConcluida: carrinho.marcarConcluida,
      limpar: carrinho.limpar,
    };
  }, [estado]);
}
