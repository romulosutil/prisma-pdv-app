import { PLANOS, PLANOS_ORDEM, type Plano, type Produto } from '@pdv/shared';
import { normalizarBusca } from '@/dados/produtos';

export type FiltroProdutos = 'todos' | 'com_codigo' | 'sem_codigo' | 'atalhos' | 'estoque_baixo';

/** Só avisa quando o produto tem estoque e mínimo definidos. */
export const estoqueBaixo = (p: Produto): boolean => p.estoque !== null && p.estoqueMinimo !== null && p.estoque <= p.estoqueMinimo;

const REGRAS: Record<FiltroProdutos, (p: Produto) => boolean> = {
  todos: () => true,
  com_codigo: (p) => p.ean !== null,
  // Itens a granel (kg) costumam ser vendidos sem código, mesmo quando têm um.
  sem_codigo: (p) => p.ean === null || p.unidade === 'kg',
  atalhos: (p) => p.atalho,
  estoque_baixo: estoqueBaixo,
};

/** Busca pelo nome (sem acento nem caixa, todos os termos) ou por parte do código, somada ao filtro escolhido. */
export function filtrarProdutos(produtos: readonly Produto[], filtro: FiltroProdutos, busca: string): Produto[] {
  const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
  return produtos.filter((p) => {
    if (!REGRAS[filtro](p)) return false;
    if (termos.length === 0) return true;
    const nome = normalizarBusca(p.nome);
    return termos.every((t) => nome.includes(t) || (p.ean?.includes(t) ?? false));
  });
}

export function contarPorFiltro(produtos: readonly Produto[]): Record<FiltroProdutos, number> {
  const contagem = {} as Record<FiltroProdutos, number>;
  for (const filtro of Object.keys(REGRAS) as FiltroProdutos[]) contagem[filtro] = produtos.filter(REGRAS[filtro]).length;
  return contagem;
}

export type SituacaoLimite = 'livre' | 'proximo' | 'atingido';

/** `limite` nulo é ilimitado. "Próximo" começa em 90% do limite. */
export function situacaoDoLimite(total: number, limite: number | null): SituacaoLimite {
  if (limite === null) return 'livre';
  if (total >= limite) return 'atingido';
  return total >= limite * 0.9 ? 'proximo' : 'livre';
}

/** Menor plano sem limite de produtos (hoje, o Negócio): é para onde o aviso de limite leva. */
export function planoSemLimiteDeProdutos(): Plano {
  const id = PLANOS_ORDEM.find((candidato) => PLANOS[candidato].limites.produtos === null);
  if (!id) throw new Error('Nenhum plano sem limite de produtos');
  return PLANOS[id];
}

export function legendaDoContador(total: number, limite: number | null): string {
  if (limite !== null) return `${total} de ${limite} produtos`;
  return `${total} ${total === 1 ? 'produto' : 'produtos'}`;
}

/** "Arroz tipo 1 5kg" -> "AT": iniciais das duas primeiras palavras que não são número nem preposição curta. */
export function monograma(nome: string): string {
  const palavras = nome.split(/\s+/).filter((p) => p.length > 2 && !/^\d/.test(p));
  const [primeira = nome, segunda = ''] = palavras;
  return `${primeira.charAt(0)}${segunda.charAt(0)}`.toUpperCase();
}

/** Estoque em milésimos para exibir: 24000 un -> "24 un", 6500 kg -> "6,5 kg". */
export function formatarEstoque(milesimos: number, unidade: Produto['unidade']): string {
  return `${textoDeQuantidade(milesimos)} ${unidade}`;
}

/** Milésimos em texto de campo: 12000 -> "12", 6500 -> "6,5", 350 -> "0,35". */
export function textoDeQuantidade(milesimos: number): string {
  const inteiro = Math.floor(milesimos / 1000);
  const fracao = String(milesimos % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fracao ? `${inteiro},${fracao}` : String(inteiro);
}

export type LeituraQuantidade = { valida: true; milesimos: number | null } | { valida: false };

/** Texto digitado em milésimos: "" -> sem valor (`null`), "6,5" -> 6500. Aceita vírgula ou ponto, até 3 casas. */
export function lerQuantidade(texto: string): LeituraQuantidade {
  const limpo = texto.trim();
  if (limpo === '') return { valida: true, milesimos: null };
  const m = /^(\d{1,7})(?:[.,](\d{1,3}))?$/.exec(limpo);
  if (!m) return { valida: false };
  return { valida: true, milesimos: Number(m[1]) * 1000 + Number((m[2] ?? '').padEnd(3, '0')) };
}

export const somenteDigitos = (texto: string): string => texto.replace(/\D/g, '');
