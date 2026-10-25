import type { DadosEan, FonteEan } from './fonte';

type Buscar = typeof fetch;

const USER_AGENT_PADRAO = 'PDVMobile/0.1 (defina OFF_USER_AGENT com um contato)';
const CAMPOS = 'product_name,product_name_pt,brands,quantity,image_front_small_url';

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  return limpo === '' ? null : limpo;
}

function apenasHttps(valor: unknown): string | null {
  const url = texto(valor);
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Open Food Facts: grátis, mas exige `User-Agent` identificado (`OFF_USER_AGENT`). */
export function criarOpenFoodFacts(buscar: Buscar = fetch): FonteEan {
  return {
    id: 'open_food_facts',
    async consultar(ean, sinal): Promise<DadosEan | null> {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=${CAMPOS}`;
      const res = await buscar(url, {
        signal: sinal,
        headers: { 'User-Agent': process.env.OFF_USER_AGENT || USER_AGENT_PADRAO, Accept: 'application/json' },
      });
      // A API devolve 404 (com `status: 0`) para código que não conhece: não é falha, é "não achei".
      if (res.status === 404) return null;
      if (res.status !== 200) throw new Error(`Open Food Facts respondeu HTTP ${res.status}`);

      const corpo = (await res.json()) as { status?: unknown; product?: Record<string, unknown> | null } | null;
      if (!corpo || corpo.status !== 1 || !corpo.product) return null;

      const produto = corpo.product;
      const nome = texto(produto.product_name_pt) ?? texto(produto.product_name);
      if (!nome) return null;
      const marca = texto(texto(produto.brands)?.split(',')[0]);
      return { nome, marca, conteudo: texto(produto.quantity), imagemUrl: apenasHttps(produto.image_front_small_url) };
    },
  };
}

export const openFoodFacts: FonteEan = criarOpenFoodFacts();
