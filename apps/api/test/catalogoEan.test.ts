import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { atribuicaoCatalogo, EMAIL_CONTATO, ProdutoCatalogoSchema, validarEan, type FonteCatalogo } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import type { DadosEan, FonteEan, ResultadoFonte } from '../src/fontes/fonte';
import { criarOpenBeautyFacts, criarOpenFoodFacts, criarOpenProductsFacts, fontesEanGratuitas } from '../src/fontes/openFoodFacts';
import { abrirBanco, chamar, criarAmbiente, criarConta, type Ambiente } from './ajuda';

/** Completa 12 dígitos com o verificador GS1 (EAN-13). */
function ean13(base: string): string {
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  return base + String((10 - (soma % 10)) % 10);
}

const EAN = ean13('789100010010');
const OUTRO_EAN = ean13('789200020020');
const CAMPOS = ['ean', 'nome', 'marca', 'conteudo', 'imagemUrl', 'fonte', 'confianca', 'atribuicao'];

const DADOS: DadosEan = { nome: 'Café Pilão 500g', marca: 'Pilão', conteudo: '500 g', imagemUrl: 'https://img.exemplo.com/cafe.jpg' };

function fonteFalsa(comportamento: (ean: string, sinal: AbortSignal) => Promise<ResultadoFonte>, id: FonteCatalogo = 'open_food_facts') {
  const chamadas: string[] = [];
  const fonte: FonteEan = {
    id,
    consultar(ean, sinal) {
      chamadas.push(ean);
      return comportamento(ean, sinal);
    },
  };
  return { fonte, chamadas };
}

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => {
  banco = await abrirBanco();
});
afterAll(() => banco.fechar());
afterEach(async () => {
  await amb?.fechar();
});

async function iniciar(fontes: FonteEan[] = [], orcamentoMs?: number, extras: { timeoutPorFonteEanMs?: number; cacheNegativoEanMs?: number } = {}) {
  amb = await criarAmbiente(banco, undefined, fontes, orcamentoMs, extras);
  return { loja1: await criarConta(amb), loja2: await criarConta(amb), loja3: await criarConta(amb) };
}

const consultar = (token: string, ean = EAN) => chamar(amb, 'GET', `/catalogo/ean/${ean}`, { token });
const confirmar = (token: string, nome: string, ean = EAN) =>
  chamar(amb, 'POST', `/catalogo/ean/${ean}/confirmacao`, { token, corpo: { nome } });

describe('GET /catalogo/ean/:ean', () => {
  it('401 sem sessão', async () => {
    await iniciar();
    expect((await chamar(amb, 'GET', `/catalogo/ean/${EAN}`)).status).toBe(401);
    expect((await chamar(amb, 'POST', `/catalogo/ean/${EAN}/confirmacao`, { corpo: { nome: 'Café' } })).status).toBe(401);
  });

  it('400 ean_invalido com dígito verificador errado', async () => {
    const { loja1 } = await iniciar();
    const errado = EAN.slice(0, 12) + String((Number(EAN[12]) + 1) % 10);
    expect(validarEan(errado)).toBe(false);
    const res = await consultar(loja1.token, errado);
    expect(res.status).toBe(400);
    expect(res.corpo.erro).toBe('ean_invalido');
    expect((await consultar(loja1.token, 'abc')).corpo.erro).toBe('ean_invalido');
  });

  it('404 ean_nao_encontrado quando nenhuma fonte conhece', async () => {
    const { loja1 } = await iniciar();
    const res = await consultar(loja1.token);
    expect(res.status).toBe(404);
    expect(res.corpo.erro).toBe('ean_nao_encontrado');
  });

  it('404 também quando as fontes não conhecem o código', async () => {
    const { fonte, chamadas } = fonteFalsa(async () => null);
    const { loja1 } = await iniciar([fonte]);
    expect((await consultar(loja1.token)).status).toBe(404);
    expect(chamadas).toEqual([EAN]);
  });

  it('devolve o catálogo próprio sem consultar fontes', async () => {
    const { fonte, chamadas } = fonteFalsa(async () => DADOS);
    const { loja1, loja2 } = await iniciar([fonte]);
    await confirmar(loja1.token, 'Café Pilão 500g');
    await confirmar(loja2.token, 'cafe pilao 500g');
    // A confirmação gravou o catálogo antes de qualquer consulta externa.
    const res = await consultar(loja1.token);
    expect(res.status).toBe(200);
    expect(res.corpo).toEqual({
      ean: EAN,
      nome: 'cafe pilao 500g',
      marca: null,
      conteudo: null,
      imagemUrl: null,
      fonte: 'proprio',
      confianca: 'confirmada',
      atribuicao: null,
    });
    expect(chamadas).toEqual([]);
  });

  it('acerto externo grava o cache e a segunda consulta não chama a fonte', async () => {
    const { fonte, chamadas } = fonteFalsa(async () => DADOS);
    const { loja1, loja2 } = await iniciar([fonte]);
    const esperado = { ean: EAN, ...DADOS, fonte: 'open_food_facts', confianca: 'externa', atribuicao: atribuicaoCatalogo('open_food_facts', EAN) };
    expect(await consultar(loja1.token)).toEqual({ status: 200, corpo: esperado });
    expect(await consultar(loja2.token)).toEqual({ status: 200, corpo: esperado });
    expect(chamadas).toHaveLength(1);
  });

  it('usa a primeira fonte que achar e não consulta as seguintes', async () => {
    const primeira = fonteFalsa(async () => null);
    const segunda = fonteFalsa(async () => DADOS);
    const terceira = fonteFalsa(async () => ({ ...DADOS, nome: 'Outro' }));
    const { loja1 } = await iniciar([primeira.fonte, segunda.fonte, terceira.fonte]);
    const res = await consultar(loja1.token);
    expect(res.corpo.nome).toBe(DADOS.nome);
    expect(primeira.chamadas).toHaveLength(1);
    expect(segunda.chamadas).toHaveLength(1);
    expect(terceira.chamadas).toHaveLength(0);
  });

  it('fonte que lança vira 404, nunca 500, e a próxima fonte ainda é tentada', async () => {
    const quebrada = fonteFalsa(async () => {
      throw new Error('rede caiu');
    });
    const { loja1 } = await iniciar([quebrada.fonte]);
    expect((await consultar(loja1.token)).status).toBe(404);

    await amb.fechar();
    const boa = fonteFalsa(async () => DADOS);
    const { loja1: l } = await iniciar([quebrada.fonte, boa.fonte]);
    const res = await consultar(l.token);
    expect(res.status).toBe(200);
    expect(res.corpo.fonte).toBe('open_food_facts');
  });

  it('fonte lenta que ignora o sinal estoura o orçamento e vira 404', async () => {
    const lenta = fonteFalsa(() => new Promise<DadosEan | null>(() => undefined));
    const { loja1 } = await iniciar([lenta.fonte], 50);
    const t0 = Date.now();
    const res = await consultar(loja1.token);
    expect(res.status).toBe(404);
    expect(Date.now() - t0).toBeLessThan(1500);
  });

  it('o orçamento é compartilhado: a fonte seguinte não ganha tempo extra e o sinal chega abortado', async () => {
    let sinalVisto: AbortSignal | undefined;
    const lenta = fonteFalsa((_ean, sinal) => {
      sinalVisto = sinal;
      return new Promise<DadosEan | null>((_ok, falha) => sinal.addEventListener('abort', () => falha(sinal.reason)));
    });
    const seguinte = fonteFalsa(async () => DADOS);
    const { loja1 } = await iniciar([lenta.fonte, seguinte.fonte], 50);
    const res = await consultar(loja1.token);
    expect(res.status).toBe(404);
    expect(sinalVisto?.aborted).toBe(true);
    expect(seguinte.chamadas).toHaveLength(0);
  });

  it('descarta imagem inválida e ignora fonte com nome em branco', async () => {
    const f1 = fonteFalsa(async () => ({ ...DADOS, nome: '   ' }));
    const f2 = fonteFalsa(async () => ({ ...DADOS, imagemUrl: 'não é url' }));
    const { loja1 } = await iniciar([f1.fonte, f2.fonte]);
    const res = await consultar(loja1.token);
    expect(res.status).toBe(200);
    expect(res.corpo.imagemUrl).toBeNull();
  });
});

describe('POST /catalogo/ean/:ean/confirmacao', () => {
  it('204 e uma única loja não expõe o nome para ninguém', async () => {
    const { loja1, loja2 } = await iniciar();
    const res = await confirmar(loja1.token, 'Café Pilão 500g');
    expect(res.status).toBe(204);
    expect(res.corpo).toBeUndefined();
    expect((await consultar(loja2.token)).status).toBe(404);
    expect((await consultar(loja1.token)).status).toBe(404);
  });

  it('duas lojas distintas com o mesmo nome (acento, caixa, espaços) expõem como confirmada', async () => {
    const { loja1, loja2, loja3 } = await iniciar();
    expect((await confirmar(loja1.token, 'Café Pilão 500g')).status).toBe(204);
    expect((await confirmar(loja2.token, '  CAFE   pilao 500G ')).status).toBe(204);
    const res = await consultar(loja3.token);
    expect(res.status).toBe(200);
    expect(res.corpo).toMatchObject({ ean: EAN, nome: 'CAFE pilao 500G', fonte: 'proprio', confianca: 'confirmada' });
    expect(ProdutoCatalogoSchema.safeParse(res.corpo).success).toBe(true);
  });

  it('a mesma loja confirmando duas vezes não conta em dobro', async () => {
    const { loja1, loja2 } = await iniciar();
    await confirmar(loja1.token, 'Café Pilão 500g');
    await confirmar(loja1.token, 'Café Pilão 500g');
    await confirmar(loja1.token, 'cafe pilao 500g');
    expect((await consultar(loja2.token)).status).toBe(404);
  });

  it('reconfirmar troca o nome da mesma loja', async () => {
    const { loja1, loja2, loja3 } = await iniciar();
    await confirmar(loja1.token, 'Café A');
    await confirmar(loja2.token, 'Café B');
    expect((await consultar(loja3.token)).status).toBe(404);
    await confirmar(loja1.token, 'Café B');
    const res = await consultar(loja3.token);
    expect(res.status).toBe(200);
    expect(res.corpo.nome).toBe('Café B');
  });

  it('nomes diferentes não se somam', async () => {
    const { loja1, loja2, loja3 } = await iniciar();
    await confirmar(loja1.token, 'Café Pilão 500g');
    await confirmar(loja2.token, 'Café Pilão 250g');
    expect((await consultar(loja3.token)).status).toBe(404);
  });

  it('a confirmação sobrescreve o cache externo e preserva marca, conteúdo e imagem', async () => {
    const { fonte } = fonteFalsa(async () => ({ ...DADOS, nome: 'CAFE PILAO TRAD' }));
    const { loja1, loja2, loja3 } = await iniciar([fonte]);
    expect((await consultar(loja3.token)).corpo).toMatchObject({ nome: 'CAFE PILAO TRAD', confianca: 'externa' });
    await confirmar(loja1.token, 'Café Pilão Tradicional');
    expect((await consultar(loja3.token)).corpo.confianca).toBe('externa');
    await confirmar(loja2.token, 'café pilão tradicional');
    const res = await consultar(loja3.token);
    expect(res.corpo).toEqual({
      ean: EAN,
      nome: 'café pilão tradicional',
      marca: DADOS.marca,
      conteudo: DADOS.conteudo,
      imagemUrl: DADOS.imagemUrl,
      fonte: 'proprio',
      confianca: 'confirmada',
      atribuicao: null,
    });
  });

  it('400 para EAN inválido e para corpo inválido', async () => {
    const { loja1 } = await iniciar();
    const r1 = await confirmar(loja1.token, 'Café', '123');
    expect(r1.status).toBe(400);
    expect(r1.corpo.erro).toBe('ean_invalido');
    expect((await confirmar(loja1.token, 'x')).status).toBe(400);
    expect((await chamar(amb, 'POST', `/catalogo/ean/${EAN}/confirmacao`, { token: loja1.token })).status).toBe(400);
  });
});

describe('limite de consultas por loja', () => {
  it('a 301ª consulta na hora dá 429 e a janela reabre após 1 h; outra loja não é afetada', async () => {
    const { fonte } = fonteFalsa(async () => DADOS);
    const { loja1, loja2 } = await iniciar([fonte]);
    for (let i = 1; i <= 300; i++) {
      const res = await consultar(loja1.token);
      if (res.status !== 200) throw new Error(`consulta ${i} devolveu ${res.status}`);
    }
    const bloqueada = await consultar(loja1.token);
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.corpo.erro).toBe('limite_consultas');
    expect((await consultar(loja2.token)).status).toBe(200);

    amb.relogio.avancarHoras(1);
    expect((await consultar(loja1.token)).status).toBe(200);
  });

  it('o estado do limite é por app: um app novo começa do zero', async () => {
    const { loja1 } = await iniciar();
    for (let i = 0; i < 300; i++) await consultar(loja1.token);
    expect((await consultar(loja1.token)).status).toBe(429);
    await amb.fechar();
    amb = await criarAmbiente(banco);
    const nova = await criarConta(amb);
    expect((await consultar(nova.token)).status).toBe(404);
  });
});

describe('privacidade do catálogo', () => {
  it('nenhuma resposta contém preço nem loja', async () => {
    const { fonte } = fonteFalsa(async () => DADOS);
    const { loja1, loja2 } = await iniciar([fonte]);
    const respostas = [
      await consultar(loja1.token),
      await confirmar(loja1.token, 'Café Pilão 500g'),
      await confirmar(loja2.token, 'Café Pilão 500g'),
      await consultar(loja2.token),
      await consultar(loja2.token, OUTRO_EAN),
    ];
    for (const r of respostas) {
      const json = JSON.stringify(r.corpo ?? null);
      expect(json).not.toMatch(/prec|centavos|loja_?id/i);
      expect(json).not.toContain(loja1.lojaId);
      if (r.status === 200) expect(Object.keys(r.corpo).sort()).toEqual([...CAMPOS].sort());
    }
  });
});

describe('fonte Open Food Facts', () => {
  const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });
  const comoFetch = (f: unknown) => f as typeof fetch;

  afterEach(() => vi.unstubAllEnvs());

  it('monta a URL, envia o User-Agent e mapeia os campos', async () => {
    vi.stubEnv('OFF_USER_AGENT', 'PDVTeste/1.0 (contato@exemplo.com.br)');
    const buscar = vi.fn(async (_url: string, _init: RequestInit) =>
      resposta({
        status: 1,
        product: {
          product_name: 'Coffee',
          product_name_pt: 'Café Torrado',
          brands: 'Pilão, Outra Marca',
          quantity: '500 g',
          image_front_small_url: 'https://images.openfoodfacts.org/x.jpg',
        },
      }),
    );
    const sinal = new AbortController().signal;
    const dados = await criarOpenFoodFacts(comoFetch(buscar)).consultar(EAN, sinal);
    expect(dados).toEqual({ nome: 'Café Torrado', marca: 'Pilão', conteudo: '500 g', imagemUrl: 'https://images.openfoodfacts.org/x.jpg' });

    const [url, init] = buscar.mock.calls[0]!;
    expect(url).toBe(
      `https://world.openfoodfacts.org/api/v2/product/${EAN}.json?fields=product_name,product_name_pt,brands,quantity,image_front_small_url`,
    );
    expect((init.headers as Record<string, string>)['User-Agent']).toBe('PDVTeste/1.0 (contato@exemplo.com.br)');
    expect(init.signal).toBe(sinal);
  });

  it('usa o User-Agent padrão, cai para product_name e ignora imagem não https', async () => {
    vi.stubEnv('OFF_USER_AGENT', '');
    const buscar = vi.fn(async (_url: string, _init: RequestInit) =>
      resposta({ status: 1, product: { product_name: 'Coffee', product_name_pt: '  ', brands: '', quantity: '', image_front_small_url: 'http://x/y.jpg' } }),
    );
    const fonte = criarOpenFoodFacts(comoFetch(buscar));
    expect(await fonte.consultar(EAN, AbortSignal.timeout(1000))).toEqual({ nome: 'Coffee', marca: null, conteudo: null, imagemUrl: null });
    const init = buscar.mock.calls[0]![1];
    // O Open Food Facts exige "App/Versão (contato)": sem a variável, o padrão já leva o contato público do produto.
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(`PrismaPDV/0.1 (${EMAIL_CONTATO})`);
  });

  it('devolve null quando status != 1 ou sem nome', async () => {
    const sinal = AbortSignal.timeout(1000);
    const naoAchou = criarOpenFoodFacts(comoFetch(async () => resposta({ status: 0, status_verbose: 'product not found' })));
    expect(await naoAchou.consultar(EAN, sinal)).toBeNull();
    const semNome = criarOpenFoodFacts(comoFetch(async () => resposta({ status: 1, product: { brands: 'X' } })));
    expect(await semNome.consultar(EAN, sinal)).toBeNull();
  });

  it('devolve null (e não lança) quando o Open Food Facts responde 404 para código desconhecido', async () => {
    const fonte = criarOpenFoodFacts(comoFetch(async () => resposta({ status: 0, status_verbose: 'product not found' }, 404)));
    expect(await fonte.consultar(EAN, AbortSignal.timeout(1000))).toBeNull();
  });

  it('lança em HTTP diferente de 200 e em erro de rede', async () => {
    const sinal = AbortSignal.timeout(1000);
    const http = criarOpenFoodFacts(comoFetch(async () => resposta({}, 503)));
    await expect(http.consultar(EAN, sinal)).rejects.toThrow(/503/);
    const rede = criarOpenFoodFacts(
      comoFetch(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    await expect(rede.consultar(EAN, sinal)).rejects.toThrow('fetch failed');
  });
});

describe('cascata de fontes gratuitas', () => {
  const nunca = () => new Promise<ResultadoFonte>(() => undefined);

  it('a ordem padrão é Open Food Facts → Open Beauty Facts → Open Products Facts', () => {
    expect(fontesEanGratuitas.map((f) => f.id)).toEqual(['open_food_facts', 'open_beauty_facts', 'open_products_facts']);
  });

  it('segue a ordem, para na primeira resposta útil e grava fonte e atribuição', async () => {
    const off = fonteFalsa(async () => null, 'open_food_facts');
    const obf = fonteFalsa(async () => ({ ...DADOS, nome: 'Sabonete Lux 85g', imagemUrl: null }), 'open_beauty_facts');
    const opf = fonteFalsa(async () => DADOS, 'open_products_facts');
    const { loja1, loja2 } = await iniciar([off.fonte, obf.fonte, opf.fonte]);
    const res = await consultar(loja1.token);
    expect(res.status).toBe(200);
    expect(res.corpo).toMatchObject({ nome: 'Sabonete Lux 85g', fonte: 'open_beauty_facts', confianca: 'externa' });
    expect(res.corpo.atribuicao).toEqual({
      texto: 'Dados do Open Beauty Facts, um projeto Open Food Facts, sob a Open Database License',
      licenca: 'ODbL-1.0',
      url: `https://world.openbeautyfacts.org/product/${EAN}`,
    });
    expect([off.chamadas.length, obf.chamadas.length, opf.chamadas.length]).toEqual([1, 1, 0]);
    // Gravado no catálogo próprio: outra loja recebe sem nova consulta externa.
    expect((await consultar(loja2.token)).corpo).toEqual(res.corpo);
    expect([off.chamadas.length, obf.chamadas.length, opf.chamadas.length]).toEqual([1, 1, 0]);
  });

  it('timeout por fonte: uma fonte travada não consome o orçamento das seguintes', async () => {
    const travada = fonteFalsa(nunca, 'open_food_facts');
    const boa = fonteFalsa(async () => DADOS, 'open_beauty_facts');
    const { loja1 } = await iniciar([travada.fonte, boa.fonte], 2000, { timeoutPorFonteEanMs: 50 });
    const t0 = Date.now();
    const res = await consultar(loja1.token);
    expect(res.status).toBe(200);
    expect(res.corpo.fonte).toBe('open_beauty_facts');
    expect(Date.now() - t0).toBeLessThan(1500);
  });

  it('o orçamento total vale mesmo com várias fontes lentas', async () => {
    const fontes = (['open_food_facts', 'open_beauty_facts', 'open_products_facts'] as const).map((id) => fonteFalsa(nunca, id));
    const { loja1 } = await iniciar(fontes.map((f) => f.fonte), 120, { timeoutPorFonteEanMs: 50 });
    const t0 = Date.now();
    expect((await consultar(loja1.token)).status).toBe(404);
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(fontes[2]!.chamadas.length).toBeLessThanOrEqual(1);
  });

  it('falha parcial: duas fontes fora do ar e a terceira responde', async () => {
    const offline = fonteFalsa(async () => {
      throw new TypeError('fetch failed');
    }, 'open_food_facts');
    const http503 = fonteFalsa(async () => {
      throw new Error('Open Beauty Facts respondeu HTTP 503');
    }, 'open_beauty_facts');
    const opf = fonteFalsa(async () => ({ ...DADOS, nome: 'Pilha AA Panasonic' }), 'open_products_facts');
    const { loja1 } = await iniciar([offline.fonte, http503.fonte, opf.fonte]);
    const res = await consultar(loja1.token);
    expect(res.status).toBe(200);
    expect(res.corpo).toMatchObject({ nome: 'Pilha AA Panasonic', fonte: 'open_products_facts' });
    expect(res.corpo.atribuicao.url).toBe(`https://world.openproductsfacts.org/product/${EAN}`);
  });

  it('todas fora do ar (404 e offline, com as fontes reais): 404 e o cadastro segue', async () => {
    const naoAchou = async () => new Response(JSON.stringify({ status: 0, status_verbose: 'product not found' }), { status: 404 });
    const semRede = async (): Promise<Response> => {
      throw new TypeError('fetch failed');
    };
    const { loja1, loja2 } = await iniciar([criarOpenFoodFacts(naoAchou), criarOpenBeautyFacts(semRede), criarOpenProductsFacts(naoAchou)]);
    const res = await consultar(loja1.token);
    expect(res.status).toBe(404);
    expect(res.corpo.erro).toBe('ean_nao_encontrado');
    // Nada impede o lojista de cadastrar e confirmar o nome à mão.
    expect((await confirmar(loja1.token, 'Detergente Ypê 500ml')).status).toBe(204);
    expect((await confirmar(loja2.token, 'Detergente Ypê 500ml')).status).toBe(204);
    expect((await consultar(loja1.token)).corpo).toMatchObject({ nome: 'Detergente Ypê 500ml', fonte: 'proprio', atribuicao: null });
  });

  it('a dica "different product type" pula direto para a fonte certa', async () => {
    const off = fonteFalsa(async () => ({ outraFonte: 'open_products_facts' }), 'open_food_facts');
    const obf = fonteFalsa(async () => DADOS, 'open_beauty_facts');
    const opf = fonteFalsa(async () => ({ ...DADOS, nome: 'Palito de dente' }), 'open_products_facts');
    const { loja1 } = await iniciar([off.fonte, obf.fonte, opf.fonte]);
    expect((await consultar(loja1.token)).corpo).toMatchObject({ nome: 'Palito de dente', fonte: 'open_products_facts' });
    expect(obf.chamadas).toHaveLength(0);
  });

  it('dica para tipo fora da cascata (ração) encerra a busca sem chamar as outras', async () => {
    const off = fonteFalsa(async () => ({ outraFonte: null }), 'open_food_facts');
    const obf = fonteFalsa(async () => DADOS, 'open_beauty_facts');
    const { loja1 } = await iniciar([off.fonte, obf.fonte]);
    expect((await consultar(loja1.token)).status).toBe(404);
    expect(obf.chamadas).toHaveLength(0);
  });
});

describe('cache negativo', () => {
  it('EAN que nenhuma fonte conhece não é reconsultado até expirar', async () => {
    const off = fonteFalsa(async () => null, 'open_food_facts');
    const obf = fonteFalsa(async () => null, 'open_beauty_facts');
    const { loja1, loja2 } = await iniciar([off.fonte, obf.fonte], undefined, { cacheNegativoEanMs: 10 * 60 * 1000 });
    expect((await consultar(loja1.token)).status).toBe(404);
    expect((await consultar(loja2.token)).status).toBe(404);
    expect([off.chamadas.length, obf.chamadas.length]).toEqual([1, 1]);
    // Outro EAN não é afetado.
    await consultar(loja1.token, OUTRO_EAN);
    expect(off.chamadas).toEqual([EAN, OUTRO_EAN]);

    amb.relogio.avancarHoras(1);
    expect((await consultar(loja1.token)).status).toBe(404);
    expect(off.chamadas.filter((e) => e === EAN)).toHaveLength(2);
  });

  it('falha não entra no cache negativo', async () => {
    let falhar = true;
    const off = fonteFalsa(async () => {
      if (falhar) throw new TypeError('fetch failed');
      return DADOS;
    });
    const { loja1 } = await iniciar([off.fonte]);
    expect((await consultar(loja1.token)).status).toBe(404);
    falhar = false;
    expect((await consultar(loja1.token)).status).toBe(200);
    expect(off.chamadas).toHaveLength(2);
  });

  it('o catálogo próprio vence o cache negativo (nome confirmado por duas lojas)', async () => {
    const off = fonteFalsa(async () => null);
    const { loja1, loja2, loja3 } = await iniciar([off.fonte]);
    expect((await consultar(loja1.token)).status).toBe(404);
    await confirmar(loja1.token, 'Vela de aniversário');
    await confirmar(loja2.token, 'Vela de aniversário');
    expect((await consultar(loja3.token)).corpo).toMatchObject({ nome: 'Vela de aniversário', fonte: 'proprio' });
    expect(off.chamadas).toHaveLength(1);
  });

  it('acerto no cache negativo ainda conta no limite por loja', async () => {
    const off = fonteFalsa(async () => null);
    const { loja1 } = await iniciar([off.fonte]);
    for (let i = 0; i < 300; i++) await consultar(loja1.token);
    expect((await consultar(loja1.token)).status).toBe(429);
    expect(off.chamadas).toHaveLength(1);
  });

  it('EAN com dígito verificador errado é rejeitado sem chamar fonte', async () => {
    const off = fonteFalsa(async () => DADOS);
    const { loja1 } = await iniciar([off.fonte]);
    const errado = EAN.slice(0, 12) + String((Number(EAN[12]) + 1) % 10);
    expect((await consultar(loja1.token, errado)).corpo.erro).toBe('ean_invalido');
    expect(off.chamadas).toHaveLength(0);
  });
});

describe('fontes Open Beauty Facts e Open Products Facts', () => {
  const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });
  const comoFetch = (f: unknown) => f as typeof fetch;

  it('mesma API em outro host, sem pedir nem gravar imagem', async () => {
    for (const [criar, host] of [
      [criarOpenBeautyFacts, 'world.openbeautyfacts.org'],
      [criarOpenProductsFacts, 'world.openproductsfacts.org'],
    ] as const) {
      const buscar = vi.fn(async (_url: string, _init: RequestInit) =>
        resposta({ status: 1, product: { product_name: 'Shampoo', brands: 'Seda', quantity: '325 ml', image_front_small_url: 'https://x/y.jpg' } }),
      );
      expect(await criar(comoFetch(buscar)).consultar(EAN, AbortSignal.timeout(1000))).toEqual({
        nome: 'Shampoo',
        marca: 'Seda',
        conteudo: '325 ml',
        imagemUrl: null,
      });
      const [url, init] = buscar.mock.calls[0]!;
      expect(url).toBe(`https://${host}/api/v2/product/${EAN}.json?fields=product_name,product_name_pt,brands,quantity`);
      expect((init.headers as Record<string, string>)['User-Agent']).toBeTruthy();
    }
  });

  it('404 "found with a different product type" vira dica da fonte certa', async () => {
    const dica = (tipo: string) =>
      comoFetch(async () => resposta({ code: EAN, status: 0, status_verbose: `product found with a different product type: ${tipo}` }, 404));
    const s = () => AbortSignal.timeout(1000);
    expect(await criarOpenFoodFacts(dica('beauty')).consultar(EAN, s())).toEqual({ outraFonte: 'open_beauty_facts' });
    expect(await criarOpenProductsFacts(dica('food')).consultar(EAN, s())).toEqual({ outraFonte: 'open_food_facts' });
    expect(await criarOpenFoodFacts(dica('product')).consultar(EAN, s())).toEqual({ outraFonte: 'open_products_facts' });
    expect(await criarOpenFoodFacts(dica('petfood')).consultar(EAN, s())).toEqual({ outraFonte: null });
    expect(await criarOpenFoodFacts(dica('desconhecido')).consultar(EAN, s())).toBeNull();
    // Chave herdada do protótipo não é tipo conhecido: não pode virar dica e encerrar a cascata.
    expect(await criarOpenFoodFacts(dica('constructor')).consultar(EAN, s())).toBeNull();
    const corpoRuim = comoFetch(async () => new Response('não é json', { status: 404 }));
    expect(await criarOpenBeautyFacts(corpoRuim).consultar(EAN, s())).toBeNull();
  });

  it('produto achado sem nome (comum no Open Beauty Facts) não serve e a cascata segue', async () => {
    const semNome = comoFetch(async () => resposta({ status: 1, product: { product_type: 'beauty' } }));
    expect(await criarOpenBeautyFacts(semNome).consultar(EAN, AbortSignal.timeout(1000))).toBeNull();
  });
});
