import { EMAIL_CONTATO, type FonteCatalogo } from '@pdv/shared';
import type { DadosEan, FonteEan, ResultadoFonte } from './fonte';

type Buscar = typeof fetch;

/** O OFF exige "App/Versão (contato)"; sem `OFF_USER_AGENT`, usa o contato público do produto. */
const USER_AGENT_PADRAO = `PrismaPDV/0.1 (${EMAIL_CONTATO})`;

/**
 * Bases do projeto Open Food Facts: mesma API (`/api/v2/product/{ean}.json`), mesmo banco, licença
 * ODbL (atribuição obrigatória, ver `atribuicaoCatalogo`), leitura sem chave e `User-Agent` identificado.
 */
interface ProjetoOpenFacts {
  id: Exclude<FonteCatalogo, 'proprio'>;
  host: string;
  nome: string;
  /** Só o OFF guarda a URL da imagem (comportamento já homologado); as novas fontes ficam em nome/marca/conteúdo. */
  comImagem: boolean;
}

const PROJETOS: Record<ProjetoOpenFacts['id'], ProjetoOpenFacts> = {
  open_food_facts: { id: 'open_food_facts', host: 'world.openfoodfacts.org', nome: 'Open Food Facts', comImagem: true },
  open_beauty_facts: { id: 'open_beauty_facts', host: 'world.openbeautyfacts.org', nome: 'Open Beauty Facts', comImagem: false },
  open_products_facts: { id: 'open_products_facts', host: 'world.openproductsfacts.org', nome: 'Open Products Facts', comImagem: false },
};

/** `product_type` do banco compartilhado → fonte que o serve. `petfood` não está na cascata. */
const FONTE_DO_TIPO: Record<string, FonteCatalogo | null> = {
  food: 'open_food_facts',
  beauty: 'open_beauty_facts',
  product: 'open_products_facts',
  petfood: null,
};

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

/** Lê o 404 "product found with a different product type: beauty" sem nunca lançar. */
async function dicaDo404(res: Response): Promise<ResultadoFonte> {
  try {
    const corpo = (await res.json()) as { status_verbose?: unknown } | null;
    const tipo = /different product type:\s*([a-z]+)/i.exec(texto(corpo?.status_verbose) ?? '')?.[1]?.toLowerCase();
    // `Object.hasOwn`, não `in`: "constructor" (herdado do protótipo) não é tipo de produto.
    if (tipo && Object.hasOwn(FONTE_DO_TIPO, tipo)) return { outraFonte: FONTE_DO_TIPO[tipo] ?? null };
  } catch {
    // Corpo ilegível: continua sendo só "não achei".
  }
  return null;
}

function criarFonteOpenFacts(projeto: ProjetoOpenFacts, buscar: Buscar): FonteEan {
  const campos = ['product_name', 'product_name_pt', 'brands', 'quantity', ...(projeto.comImagem ? ['image_front_small_url'] : [])].join(',');
  return {
    id: projeto.id,
    async consultar(ean, sinal): Promise<ResultadoFonte> {
      const url = `https://${projeto.host}/api/v2/product/${encodeURIComponent(ean)}.json?fields=${campos}`;
      const res = await buscar(url, {
        signal: sinal,
        headers: { 'User-Agent': process.env.OFF_USER_AGENT || USER_AGENT_PADRAO, Accept: 'application/json' },
      });
      // A API devolve 404 (com `status: 0`) para código que não conhece: não é falha, é "não achei".
      if (res.status === 404) return dicaDo404(res);
      if (res.status !== 200) throw new Error(`${projeto.nome} respondeu HTTP ${res.status}`);

      const corpo = (await res.json()) as { status?: unknown; product?: Record<string, unknown> | null } | null;
      if (!corpo || corpo.status !== 1 || !corpo.product) return null;

      const produto = corpo.product;
      const nome = texto(produto.product_name_pt) ?? texto(produto.product_name);
      if (!nome) return null;
      const marca = texto(texto(produto.brands)?.split(',')[0]);
      const dados: DadosEan = {
        nome,
        marca,
        conteudo: texto(produto.quantity),
        imagemUrl: projeto.comImagem ? apenasHttps(produto.image_front_small_url) : null,
      };
      return dados;
    },
  };
}

/** Open Food Facts: alimentos e bebidas. */
export const criarOpenFoodFacts = (buscar: Buscar = fetch): FonteEan => criarFonteOpenFacts(PROJETOS.open_food_facts, buscar);
/** Open Beauty Facts: higiene e cosméticos. */
export const criarOpenBeautyFacts = (buscar: Buscar = fetch): FonteEan => criarFonteOpenFacts(PROJETOS.open_beauty_facts, buscar);
/** Open Products Facts: limpeza, bazar e demais não alimentícios. */
export const criarOpenProductsFacts = (buscar: Buscar = fetch): FonteEan => criarFonteOpenFacts(PROJETOS.open_products_facts, buscar);

export const openFoodFacts: FonteEan = criarOpenFoodFacts();
export const openBeautyFacts: FonteEan = criarOpenBeautyFacts();
export const openProductsFacts: FonteEan = criarOpenProductsFacts();

/** Cascata gratuita padrão da API (o catálogo próprio vem sempre antes, no serviço). */
export const fontesEanGratuitas: FonteEan[] = [openFoodFacts, openBeautyFacts, openProductsFacts];
