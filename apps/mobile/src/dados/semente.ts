import { multiplicarPreco, type Caixa, type ItemVenda, type Produto, type Venda } from '@pdv/shared';
import { inicioDoDia } from '@/util/tempo';
import type { EstadoVendas } from './vendas';
import type { MeioPagamento, Unidade } from './tipos';

/** Dados fictícios do design system (seção 4), idênticos em todas as telas. */
export interface Semente {
  produtos: Produto[];
  vendas: EstadoVendas;
  caixas: Caixa[];
}

export interface EntradaSemente {
  lojaId: string;
  aparelhoId: string;
  operadorId: string;
  agora: Date;
  novoId: () => string;
}

interface ModeloProduto {
  nome: string;
  ean: string | null;
  precoCentavos: number;
  unidade: Unidade;
  atalho: boolean;
}

const MODELOS: readonly ModeloProduto[] = [
  { nome: 'Arroz tipo 1 5kg', ean: '7890000000017', precoCentavos: 2790, unidade: 'un', atalho: false },
  { nome: 'Feijão carioca 1kg', ean: '7890000000024', precoCentavos: 849, unidade: 'un', atalho: false },
  { nome: 'Leite integral 1L', ean: '7890000000031', precoCentavos: 529, unidade: 'un', atalho: false },
  { nome: 'Café torrado 500g', ean: '7890000000048', precoCentavos: 1990, unidade: 'un', atalho: false },
  { nome: 'Biscoito recheado 130g', ean: '7890000000055', precoCentavos: 379, unidade: 'un', atalho: false },
  { nome: 'Refrigerante cola 2L', ean: '7890000000062', precoCentavos: 999, unidade: 'un', atalho: false },
  { nome: 'Pão francês', ean: null, precoCentavos: 1690, unidade: 'kg', atalho: true },
  { nome: 'Banana prata', ean: null, precoCentavos: 699, unidade: 'kg', atalho: true },
  { nome: 'Saco de gelo 5kg', ean: null, precoCentavos: 1200, unidade: 'un', atalho: true },
];

/** Totais do dia por meio (centavos) e quantidade de vendas: 47 vendas, R$ 1.284,50. */
const MEIOS_DO_DIA: readonly { meio: MeioPagamento; vendas: number; totalCentavos: number }[] = [
  { meio: 'dinheiro', vendas: 16, totalCentavos: 41_230 },
  { meio: 'pix', vendas: 19, totalCentavos: 59_870 },
  { meio: 'cartao_credito', vendas: 12, totalCentavos: 27_350 },
];

export const TROCO_INICIAL_DEMO = 10_000;
/** A última venda da semente é a #000230; a próxima será a #000231. */
export const NUMERO_BASE_DEMO = 183;

const MIL = 1000;

/** Divide `total` em `partes` valores variados que somam exatamente `total`. */
function repartir(total: number, partes: number): number[] {
  const base = Math.floor(total / partes);
  const valores = Array.from({ length: partes - 1 }, (_, i) => base + (((i * 37) % 11) - 5) * 120);
  return [...valores, total - valores.reduce((s, v) => s + v, 0)];
}

/** Monta os itens de uma venda de `alvo` centavos com produtos reais; o resto vira "Valor avulso". */
function montarItens(alvo: number, indice: number, produtos: readonly Produto[], novoId: () => string): ItemVenda[] {
  const itens: ItemVenda[] = [];
  let restante = alvo;
  const adicionar = (produto: Produto | null, preco: number, descricao: string) => {
    itens.push({
      id: novoId(),
      produtoId: produto?.id ?? null,
      descricao,
      precoUnitarioCentavos: preco,
      quantidadeMilesimos: MIL,
      totalCentavos: multiplicarPreco(preco, MIL),
    });
    restante -= preco;
  };
  for (let k = 0; k < produtos.length && itens.length < 3; k++) {
    const produto = produtos[(indice * 4 + k * 3) % produtos.length]!;
    if (produto.precoCentavos <= restante) adicionar(produto, produto.precoCentavos, produto.nome);
  }
  if (restante > 0) adicionar(null, restante, 'Valor avulso');
  return itens;
}

export function gerarSemente(entrada: EntradaSemente): Semente {
  const { lojaId, aparelhoId, operadorId, agora, novoId } = entrada;
  const criadoEm = agora.toISOString();

  const produtos: Produto[] = MODELOS.map((m) => ({
    id: novoId(),
    lojaId,
    nome: m.nome,
    ean: m.ean,
    precoCentavos: m.precoCentavos,
    unidade: m.unidade,
    estoque: null,
    estoqueMinimo: null,
    atalho: m.atalho,
    criadoEm,
    atualizadoEm: criadoEm,
    excluidoEm: null,
    versao: 1,
  }));

  // Intercala os meios na ordem do dia (Bresenham): ninguém fica agrupado.
  const valores = MEIOS_DO_DIA.map((m) => repartir(m.totalCentavos, m.vendas));
  const usados = MEIOS_DO_DIA.map(() => 0);
  const totalVendas = MEIOS_DO_DIA.reduce((s, m) => s + m.vendas, 0);
  const inicioDoDiaMs = inicioDoDia(agora).getTime();
  const passo = (agora.getTime() - inicioDoDiaMs) / (totalVendas + 1);

  const vendas: Venda[] = [];
  for (let n = 0; n < totalVendas; n++) {
    let escolhido = 0;
    let maiorDivida = -Infinity;
    MEIOS_DO_DIA.forEach((m, i) => {
      const divida = (m.vendas * (n + 1)) / totalVendas - (usados[i] ?? 0);
      if (divida > maiorDivida) {
        maiorDivida = divida;
        escolhido = i;
      }
    });
    const modelo = MEIOS_DO_DIA[escolhido]!;
    const alvo = valores[escolhido]![usados[escolhido]!]!;
    usados[escolhido] = (usados[escolhido] ?? 0) + 1;
    vendas.push({
      id: novoId(),
      lojaId,
      aparelhoId,
      operadorId,
      itens: montarItens(alvo, n, produtos, novoId),
      pagamentos: [
        { id: novoId(), meio: modelo.meio, provedor: null, valorCentavos: alvo, trocoCentavos: 0 },
      ],
      totalCentavos: alvo,
      status: 'concluida',
      criadaEm: new Date(inicioDoDiaMs + passo * (n + 1)).toISOString(),
    });
  }

  const caixa: Caixa = {
    id: novoId(),
    lojaId,
    aparelhoId,
    operadorId,
    abertura: {
      em: new Date(new Date(vendas[0]!.criadaEm).getTime() - 60_000).toISOString(),
      trocoInicialCentavos: TROCO_INICIAL_DEMO,
    },
    fechamento: null,
    movimentos: [],
  };

  return { produtos, vendas: { vendas, numeroBase: NUMERO_BASE_DEMO }, caixas: [caixa] };
}
