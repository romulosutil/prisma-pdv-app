import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registrar } from '@/diagnostico/registro';
import {
  buscarNoCatalogo,
  CatalogoEan,
  CHAVE_CACHE,
  configurarCatalogoEan,
  consultarCatalogo,
  LIMITE_CACHE,
  PRAZO_CONSULTA_MS,
} from '@/servicos/catalogoEan';
import { sugestaoParaCadastro } from '@/telas/produtos/sugestao';
import { ArmazenamentoMemoria } from './ambiente';

vi.mock('@/diagnostico/registro', () => ({ registrar: vi.fn() }));

afterEach(() => configurarCatalogoEan(null));

describe('catálogo de EAN (modo demo, base local simulada)', () => {
  it('acha o nome de um código conhecido, ignorando separadores', () => {
    expect(buscarNoCatalogo('7896543210987')).toEqual({ achou: true, nome: 'Achocolatado em pó 400g' });
    expect(buscarNoCatalogo('789 6543 210987')).toEqual({ achou: true, nome: 'Achocolatado em pó 400g' });
  });

  it('não acha código fora do catálogo', () => {
    expect(buscarNoCatalogo('7891234567895')).toEqual({ achou: false });
  });

  it('responde depois do atraso artificial', async () => {
    const inicio = Date.now();
    const r = await consultarCatalogo('7890000000048', { atrasoMs: 30 });
    expect(r).toEqual({ achou: true, nome: 'Café torrado 500g' });
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(25);
  });

  it('o cenário "não encontrado" também passa pelo atraso', async () => {
    await expect(consultarCatalogo('7891234567895', { atrasoMs: 5 })).resolves.toEqual({ achou: false });
  });

  it('continua achando o código de demonstração 7891000100103 e registra a consulta', async () => {
    await expect(consultarCatalogo('7891000100103', { atrasoMs: 1 })).resolves.toEqual({ achou: true, nome: 'Leite condensado 395g' });
    expect(registrar).toHaveBeenCalledWith('leitura', 'consulta de catálogo', expect.objectContaining({ fonte: 'demo', achou: true, ean: '7891000100103' }));
  });

  it('rejeita quando a consulta é cancelada', async () => {
    const controle = new AbortController();
    const espera = consultarCatalogo('7890000000048', { atrasoMs: 1000, sinal: controle.signal });
    controle.abort();
    await expect(espera).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejeita na hora se já chegou cancelada', async () => {
    const controle = new AbortController();
    controle.abort();
    await expect(consultarCatalogo('7890000000048', { atrasoMs: 1000, sinal: controle.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

// ---------- Com API ----------

const URL_API = 'https://api.teste';
const EAN_ACHADO = '7891000100103';

/** EAN-13 válido a partir de um número (dígito verificador calculado). */
function eanValido(n: number): string {
  const base = String(n).padStart(12, '0');
  const soma = [...base].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return base + String((10 - (soma % 10)) % 10);
}

function produtoApi(ean: string, extra: Record<string, unknown> = {}) {
  return { ean, nome: 'Leite condensado 395g', marca: 'Marca X', conteudo: '395 g', imagemUrl: null, fonte: 'proprio', confianca: 'confirmada', ...extra };
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

type Buscar = (url: string, init?: RequestInit) => Promise<Response>;

function montar(buscar: Buscar, armazenamento = new ArmazenamentoMemoria(), token: string | null = 'tok-1') {
  const chamadas = vi.fn(buscar);
  const catalogo = new CatalogoEan({ urlApi: URL_API, obterToken: () => token, armazenamento, buscar: chamadas as unknown as typeof fetch });
  return { catalogo, chamadas, armazenamento };
}

/** Fetch que nunca responde sozinho e respeita o sinal, como o de verdade. */
const fetchPendente: Buscar = (_url, init) =>
  new Promise((_, rejeitar) => {
    init?.signal?.addEventListener('abort', () => rejeitar(Object.assign(new Error('abortado'), { name: 'AbortError' })));
  });

describe('catálogo de EAN (com API)', () => {
  beforeEach(() => vi.mocked(registrar).mockClear());

  it('acha pela API, autenticado, e devolve marca, conteúdo e fonte', async () => {
    const { catalogo, chamadas } = montar(async () => json(produtoApi(EAN_ACHADO)));
    const r = await catalogo.consultar(EAN_ACHADO);
    expect(r).toEqual({ achou: true, nome: 'Leite condensado 395g', marca: 'Marca X', conteudo: '395 g', imagemUrl: null, fonte: 'proprio' });
    expect(chamadas).toHaveBeenCalledTimes(1);
    const [url, init] = chamadas.mock.calls[0]!;
    expect(url).toBe(`${URL_API}/catalogo/ean/${EAN_ACHADO}`);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    expect(registrar).toHaveBeenCalledWith('leitura', 'consulta de catálogo', expect.objectContaining({ fonte: 'api', achou: true, ean: EAN_ACHADO }));
  });

  it('não usa o atraso artificial', async () => {
    const { catalogo } = montar(async () => json(produtoApi(EAN_ACHADO)));
    vi.useFakeTimers();
    try {
      await expect(catalogo.consultar(EAN_ACHADO, { atrasoMs: 60_000 })).resolves.toMatchObject({ achou: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['404', async () => json({ erro: 'ean_nao_encontrado' }, 404)],
    ['429', async () => json({ erro: 'limite_consultas' }, 429)],
    ['500', async () => json({ erro: 'x' }, 500)],
    ['offline', async () => Promise.reject(new TypeError('Network request failed'))],
    ['resposta fora do contrato', async () => json({ nome: 123 })],
    ['resposta que não é JSON', async () => new Response('<html>', { status: 200 })],
  ])('%s => achou false, sem lançar, e não entra no cache', async (_nome, buscar) => {
    const { catalogo, armazenamento } = montar(buscar as Buscar);
    await expect(catalogo.consultar(EAN_ACHADO)).resolves.toEqual({ achou: false });
    expect(armazenamento.dados.has(CHAVE_CACHE)).toBe(false);
    expect(registrar).toHaveBeenCalledWith('leitura', 'consulta de catálogo', expect.objectContaining({ fonte: 'api', achou: false }));
  });

  it('passou de 2,5 s => achou false', async () => {
    vi.useFakeTimers();
    try {
      const { catalogo } = montar(fetchPendente);
      const consulta = catalogo.consultar(EAN_ACHADO);
      let resolvida = false;
      void consulta.then(() => (resolvida = true));
      await vi.advanceTimersByTimeAsync(PRAZO_CONSULTA_MS - 1);
      expect(resolvida).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      await expect(consulta).resolves.toEqual({ achou: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('o cache serve a segunda consulta sem chamar a API, inclusive depois de reabrir o app', async () => {
    const { catalogo, chamadas, armazenamento } = montar(async () => json(produtoApi(EAN_ACHADO)));
    await catalogo.consultar(EAN_ACHADO);
    const segunda = await catalogo.consultar(EAN_ACHADO);
    expect(segunda).toMatchObject({ achou: true, nome: 'Leite condensado 395g' });
    expect(chamadas).toHaveBeenCalledTimes(1);
    expect(registrar).toHaveBeenLastCalledWith('leitura', 'consulta de catálogo', expect.objectContaining({ fonte: 'cache', achou: true }));

    // Novo processo, mesmo armazenamento: a leitura continua sem rede.
    const reaberto = montar(async () => Promise.reject(new TypeError('offline')), armazenamento);
    await expect(reaberto.catalogo.consultar(EAN_ACHADO)).resolves.toMatchObject({ achou: true, nome: 'Leite condensado 395g' });
    expect(reaberto.chamadas).not.toHaveBeenCalled();
    expect(reaberto.catalogo.buscarLocal(EAN_ACHADO)).toMatchObject({ achou: true });
  });

  it(`o cache guarda só os últimos ${LIMITE_CACHE} códigos`, async () => {
    const { catalogo, chamadas, armazenamento } = montar(async (url) => json(produtoApi(url.split('/').pop()!)));
    const codigos = Array.from({ length: LIMITE_CACHE + 1 }, (_, i) => eanValido(100_000_000_000 + i));
    for (const c of codigos) await catalogo.consultar(c);
    expect(chamadas).toHaveBeenCalledTimes(LIMITE_CACHE + 1);

    const salvo = await armazenamento.obter<{ ean: string }[]>(CHAVE_CACHE);
    expect(salvo).toHaveLength(LIMITE_CACHE);
    expect(salvo!.some((p) => p.ean === codigos[0])).toBe(false);
    expect(salvo![0]!.ean).toBe(codigos[1]);
    expect(salvo!.at(-1)!.ean).toBe(codigos[LIMITE_CACHE]);

    // O mais novo continua em cache; o mais antigo foi descartado e vai de novo à API.
    await catalogo.consultar(codigos[LIMITE_CACHE]!);
    expect(chamadas).toHaveBeenCalledTimes(LIMITE_CACHE + 1);
    await catalogo.consultar(codigos[0]!);
    expect(chamadas).toHaveBeenCalledTimes(LIMITE_CACHE + 2);
  });

  it('ignora itens corrompidos do cache salvo', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    await armazenamento.gravar(CHAVE_CACHE, [{ lixo: true }, 42, produtoApi(EAN_ACHADO)]);
    const { catalogo, chamadas } = montar(async () => json({ erro: 'x' }, 404), armazenamento);
    await expect(catalogo.consultar(EAN_ACHADO)).resolves.toMatchObject({ achou: true });
    expect(chamadas).not.toHaveBeenCalled();
  });

  it('código inválido (tamanho ou dígito verificador) não chama a API', async () => {
    const { catalogo, chamadas } = montar(async () => json(produtoApi(EAN_ACHADO)));
    for (const ruim of ['123', '', 'abc', '7891000100104', '78910001001030000']) {
      await expect(catalogo.consultar(ruim)).resolves.toEqual({ achou: false });
    }
    expect(chamadas).not.toHaveBeenCalled();
  });

  it('normaliza separadores antes de consultar', async () => {
    const { catalogo, chamadas } = montar(async () => json(produtoApi(EAN_ACHADO)));
    await expect(catalogo.consultar('789 1000-100103')).resolves.toMatchObject({ achou: true });
    expect(chamadas.mock.calls[0]![0]).toBe(`${URL_API}/catalogo/ean/${EAN_ACHADO}`);
  });

  it('sem sessão não consulta', async () => {
    const { catalogo, chamadas } = montar(async () => json(produtoApi(EAN_ACHADO)), new ArmazenamentoMemoria(), null);
    await expect(catalogo.consultar(EAN_ACHADO)).resolves.toEqual({ achou: false });
    expect(chamadas).not.toHaveBeenCalled();
  });

  it('rejeita com AbortError quando o sinal do chamador cancela no meio da consulta', async () => {
    const { catalogo } = montar(fetchPendente);
    const controle = new AbortController();
    const consulta = catalogo.consultar(EAN_ACHADO, { sinal: controle.signal });
    await new Promise((r) => setTimeout(r, 0));
    controle.abort();
    await expect(consulta).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejeita com AbortError mesmo se o fetch ignorar o sinal', async () => {
    const { catalogo } = montar(() => new Promise<Response>(() => undefined));
    const controle = new AbortController();
    const consulta = catalogo.consultar(EAN_ACHADO, { sinal: controle.signal });
    await new Promise((r) => setTimeout(r, 0));
    controle.abort();
    await expect(consulta).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejeita na hora se já chegou cancelada, sem chamar a API', async () => {
    const { catalogo, chamadas } = montar(async () => json(produtoApi(EAN_ACHADO)));
    const controle = new AbortController();
    controle.abort();
    await expect(catalogo.consultar(EAN_ACHADO, { sinal: controle.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(chamadas).not.toHaveBeenCalled();
  });

  it('as funções do módulo seguem a configuração; sem ela, voltam ao demo', async () => {
    configurarCatalogoEan({
      urlApi: URL_API,
      obterToken: () => 'tok',
      armazenamento: new ArmazenamentoMemoria(),
      buscar: (async () => json(produtoApi(EAN_ACHADO, { nome: 'Nome da API' }))) as unknown as typeof fetch,
    });
    // Com API, a base de demonstração não vale.
    expect(buscarNoCatalogo('7890000000048')).toEqual({ achou: false });
    await expect(consultarCatalogo(EAN_ACHADO)).resolves.toMatchObject({ achou: true, nome: 'Nome da API' });
    expect(buscarNoCatalogo(EAN_ACHADO)).toMatchObject({ achou: true, nome: 'Nome da API' });

    configurarCatalogoEan(null);
    await expect(consultarCatalogo(EAN_ACHADO, { atrasoMs: 1 })).resolves.toEqual({ achou: true, nome: 'Leite condensado 395g' });
  });
});

describe('confirmarNoCatalogo', () => {
  it('envia o nome salvo para a confirmação do código', async () => {
    const { catalogo, chamadas } = montar(async () => new Response(null, { status: 204 }));
    await catalogo.confirmar('789 1000 100103', '  Leite condensado 395g ');
    expect(chamadas).toHaveBeenCalledTimes(1);
    const [url, init] = chamadas.mock.calls[0]!;
    expect(url).toBe(`${URL_API}/catalogo/ean/${EAN_ACHADO}/confirmacao`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ nome: 'Leite condensado 395g' });
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it.each([
    ['offline', async () => Promise.reject(new TypeError('Network request failed'))],
    ['500', async () => json({ erro: 'x' }, 500)],
  ])('não lança quando a API falha (%s)', async (_nome, buscar) => {
    const { catalogo } = montar(buscar as Buscar);
    await expect(catalogo.confirmar(EAN_ACHADO, 'Leite condensado 395g')).resolves.toBeUndefined();
  });

  it('não lança quando a API trava (limite de tempo)', async () => {
    vi.useFakeTimers();
    try {
      const { catalogo } = montar(fetchPendente);
      const envio = catalogo.confirmar(EAN_ACHADO, 'Leite condensado 395g');
      await vi.advanceTimersByTimeAsync(10_000);
      await expect(envio).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('não chama a API para código inválido, nome curto ou sem sessão', async () => {
    const { catalogo, chamadas } = montar(async () => new Response(null, { status: 204 }));
    await catalogo.confirmar('123', 'Leite');
    await catalogo.confirmar(EAN_ACHADO, ' a ');
    const semSessao = montar(async () => new Response(null, { status: 204 }), new ArmazenamentoMemoria(), null);
    await semSessao.catalogo.confirmar(EAN_ACHADO, 'Leite condensado');
    expect(chamadas).not.toHaveBeenCalled();
    expect(semSessao.chamadas).not.toHaveBeenCalled();
  });

  it('em modo demo não faz nada', async () => {
    await expect(new CatalogoEan(null).confirmar(EAN_ACHADO, 'Leite condensado')).resolves.toBeUndefined();
  });
});

describe('sugestaoParaCadastro', () => {
  it('usa o nome já consultado', () => {
    expect(sugestaoParaCadastro('7896543210987', 'Achocolatado')).toEqual({ ean: '7896543210987', nome: 'Achocolatado', origem: 'catalogo' });
  });

  it('consulta a base quando só chega o código (fluxo de Vender)', () => {
    expect(sugestaoParaCadastro('7890000000048')).toEqual({ ean: '7890000000048', nome: 'Café torrado 500g', origem: 'catalogo' });
    expect(sugestaoParaCadastro('7891234567895')).toEqual({ ean: '7891234567895', nome: '', origem: 'ausente' });
  });

  it('respeita o preenchimento manual', () => {
    expect(sugestaoParaCadastro('7890000000048', undefined, true)).toEqual({ ean: '7890000000048', nome: '', origem: 'manual' });
  });

  it('ignora código ausente ou inválido', () => {
    expect(sugestaoParaCadastro(undefined)).toBeUndefined();
    expect(sugestaoParaCadastro('123')).toBeUndefined();
  });
});
