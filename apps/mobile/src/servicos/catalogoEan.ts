import { normalizarEan, ProdutoCatalogoSchema, type FonteCatalogo, type ProdutoCatalogo } from '@pdv/shared';
import type { Armazenamento } from '@/dados/armazenamento';
import { registrar } from '@/diagnostico/registro';

/**
 * Resultado da consulta ao catálogo de códigos de barras. Os campos além do nome só vêm da API
 * (a base de demonstração só conhece o nome).
 */
export type ResultadoCatalogo =
  | { achou: true; nome: string; marca?: string | null; conteudo?: string | null; imagemUrl?: string | null; fonte?: FonteCatalogo }
  | { achou: false };

/**
 * Base local que simula o catálogo nacional (modo demo, sem API): EAN -> nome sugerido.
 * Os códigos 789000000xxxx são os do cadastro de demonstração.
 */
const BASE_LOCAL: Readonly<Record<string, string>> = {
  '7890000000017': 'Arroz tipo 1 5kg',
  '7890000000024': 'Feijão carioca 1kg',
  '7890000000031': 'Leite integral 1L',
  '7890000000048': 'Café torrado 500g',
  '7890000000055': 'Biscoito recheado 130g',
  '7890000000062': 'Refrigerante cola 2L',
  '7896543210987': 'Achocolatado em pó 400g',
  '7891000100103': 'Leite condensado 395g',
  '7891910000197': 'Açúcar refinado 1kg',
  '7891000053508': 'Creme de leite 200g',
  '7896004000012': 'Macarrão espaguete 500g',
  '7894900011517': 'Refrigerante laranja 2L',
  '7891150024391': 'Sabão em pó 1kg',
  '7898080640147': 'Água mineral 1,5L',
};

export interface OpcoesConsulta {
  /** Atraso artificial que imita a ida à rede (só no modo demo). */
  atrasoMs?: number;
  /** Cancela a espera (a tela foi fechada). */
  sinal?: AbortSignal;
}

/** Ligação com a API do app. Sem ela (`null`), o catálogo é a base simulada local. */
export interface ConfigCatalogoApi {
  /** Endereço base da API, sem barra final. */
  urlApi: string;
  /** Token da sessão; sem sessão não há consulta (a rota é privada). */
  obterToken: () => string | null;
  /** Onde fica o cache local dos códigos já achados. */
  armazenamento: Armazenamento;
  /** `fetch` a usar (testes injetam um falso). */
  buscar?: typeof fetch;
}

const ATRASO_PADRAO_MS = 900;
/** Passou disso, o cadastro segue sem sugestão: ninguém espera no balcão. */
export const PRAZO_CONSULTA_MS = 2500;
const PRAZO_CONFIRMACAO_MS = 8000;
export const LIMITE_CACHE = 500;
export const CHAVE_CACHE = 'catalogo_ean_cache';

function erroDeCancelamento(): Error {
  return Object.assign(new Error('Consulta cancelada'), { name: 'AbortError' });
}

function resultadoDe(p: Pick<ProdutoCatalogo, 'nome' | 'marca' | 'conteudo' | 'imagemUrl' | 'fonte'>): ResultadoCatalogo {
  return { achou: true, nome: p.nome, marca: p.marca, conteudo: p.conteudo, imagemUrl: p.imagemUrl, fonte: p.fonte };
}

/** Rejeita quando o sinal dispara; nunca resolve. Serve para não depender de o `fetch` respeitar o sinal. */
function quandoAbortar(sinal: AbortSignal): Promise<never> {
  return new Promise((_, rejeitar) => {
    if (sinal.aborted) rejeitar(erroDeCancelamento());
    else sinal.addEventListener('abort', () => rejeitar(erroDeCancelamento()), { once: true });
  });
}

export class CatalogoEan {
  /** Do mais antigo para o mais novo (ordem de inserção). */
  private readonly cache = new Map<string, ProdutoCatalogo>();
  private carregamento: Promise<void> | null = null;

  constructor(private readonly config: ConfigCatalogoApi | null) {
    if (config) void this.carregarCache();
  }

  get comApi(): boolean {
    return this.config !== null;
  }

  /** Consulta instantânea e sem rede: cache local (com API) ou base simulada (demo). */
  buscarLocal(ean: string): ResultadoCatalogo {
    if (this.config) {
      const codigo = normalizarEan(ean);
      const guardado = codigo ? this.cache.get(codigo) : undefined;
      return guardado ? resultadoDe(guardado) : { achou: false };
    }
    const nome = BASE_LOCAL[ean.replace(/\D/g, '')];
    return nome ? { achou: true, nome } : { achou: false };
  }

  /** Rejeita com `AbortError` só quando o `sinal` de quem chamou cancela; qualquer outra falha vira `{ achou: false }`. */
  consultar(ean: string, { atrasoMs = ATRASO_PADRAO_MS, sinal }: OpcoesConsulta = {}): Promise<ResultadoCatalogo> {
    if (sinal?.aborted) return Promise.reject(erroDeCancelamento());
    return this.config ? this.consultarNaApi(this.config, ean, sinal) : this.consultarNoDemo(ean, atrasoMs, sinal);
  }

  private consultarNoDemo(ean: string, atrasoMs: number, sinal?: AbortSignal): Promise<ResultadoCatalogo> {
    const inicio = Date.now();
    return new Promise((resolver, rejeitar) => {
      const cancelar = () => {
        clearTimeout(espera);
        rejeitar(erroDeCancelamento());
      };
      const espera = setTimeout(() => {
        sinal?.removeEventListener('abort', cancelar);
        const resultado = this.buscarLocal(ean);
        registrar('leitura', 'consulta de catálogo', { fonte: 'demo', achou: resultado.achou, ms: Date.now() - inicio, ean: ean.replace(/\D/g, '') });
        resolver(resultado);
      }, atrasoMs);
      sinal?.addEventListener('abort', cancelar, { once: true });
    });
  }

  private async consultarNaApi(config: ConfigCatalogoApi, ean: string, sinal?: AbortSignal): Promise<ResultadoCatalogo> {
    const inicio = Date.now();
    const codigo = normalizarEan(ean);
    if (!codigo) {
      registrar('leitura', 'consulta de catálogo', { fonte: 'api', achou: false, ms: 0, ean: ean.replace(/\D/g, ''), invalido: true });
      return { achou: false };
    }

    await this.carregarCache();
    const guardado = this.cache.get(codigo);
    if (guardado) {
      registrar('leitura', 'consulta de catálogo', { fonte: 'cache', achou: true, ms: Date.now() - inicio, ean: codigo });
      return resultadoDe(guardado);
    }

    const produto = await this.pedirNaApi(config, codigo, sinal);
    registrar('leitura', 'consulta de catálogo', { fonte: 'api', achou: produto !== null, ms: Date.now() - inicio, ean: codigo });
    if (!produto) return { achou: false };
    this.guardar(config, produto);
    return resultadoDe(produto);
  }

  /** `null` para tudo que não for um produto válido; só lança `AbortError` quando o chamador cancela. */
  private async pedirNaApi(config: ConfigCatalogoApi, codigo: string, sinal?: AbortSignal): Promise<ProdutoCatalogo | null> {
    const token = config.obterToken();
    if (!token) return null;

    const controle = new AbortController();
    const abortar = () => controle.abort();
    sinal?.addEventListener('abort', abortar, { once: true });
    const prazo = setTimeout(abortar, PRAZO_CONSULTA_MS);
    const buscar = config.buscar ?? fetch;
    try {
      const trabalho = (async () => {
        const resposta = await buscar(`${config.urlApi}/catalogo/ean/${codigo}`, {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          signal: controle.signal,
        });
        if (!resposta.ok) return null;
        const lido = ProdutoCatalogoSchema.safeParse(await resposta.json());
        return lido.success ? { ...lido.data, ean: codigo } : null;
      })();
      // Se a corrida for perdida pelo `trabalho`, o erro dele já foi tratado pela própria corrida.
      return await Promise.race([trabalho, quandoAbortar(controle.signal)]);
    } catch (erro) {
      if (sinal?.aborted) throw erro instanceof Error && erro.name === 'AbortError' ? erro : erroDeCancelamento();
      return null;
    } finally {
      clearTimeout(prazo);
      sinal?.removeEventListener('abort', abortar);
    }
  }

  /** Avisa a API do nome que o lojista salvou. Nunca lança e nunca atrasa a tela. */
  async confirmar(ean: string, nome: string): Promise<void> {
    const config = this.config;
    if (!config) return;
    try {
      const codigo = normalizarEan(ean);
      const nomeLimpo = nome.trim();
      const token = config.obterToken();
      if (!codigo || nomeLimpo.length < 2 || !token) return;
      const controle = new AbortController();
      const prazo = setTimeout(() => controle.abort(), PRAZO_CONFIRMACAO_MS);
      try {
        const buscar = config.buscar ?? fetch;
        await Promise.race([
          buscar(`${config.urlApi}/catalogo/ean/${codigo}/confirmacao`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ nome: nomeLimpo }),
            signal: controle.signal,
          }),
          quandoAbortar(controle.signal),
        ]);
      } finally {
        clearTimeout(prazo);
      }
    } catch {
      // Best-effort: sem rede ou com a API fora do ar, o produto continua salvo no aparelho.
    }
  }

  private carregarCache(): Promise<void> {
    this.carregamento ??= (async () => {
      try {
        const salvos = await this.config?.armazenamento.obter<unknown[]>(CHAVE_CACHE);
        if (!Array.isArray(salvos)) return;
        // O que chegou durante a leitura é mais novo que o que estava salvo.
        const recentes = [...this.cache.values()];
        this.cache.clear();
        for (const item of salvos) {
          const lido = ProdutoCatalogoSchema.safeParse(item);
          if (lido.success) this.cache.set(lido.data.ean, lido.data);
        }
        for (const produto of recentes) {
          this.cache.delete(produto.ean);
          this.cache.set(produto.ean, produto);
        }
        this.aparar();
      } catch {
        // Cache ilegível = cache vazio.
      }
    })();
    return this.carregamento;
  }

  private guardar(config: ConfigCatalogoApi, produto: ProdutoCatalogo): void {
    this.cache.delete(produto.ean);
    this.cache.set(produto.ean, produto);
    this.aparar();
    config.armazenamento.gravar(CHAVE_CACHE, [...this.cache.values()]).catch(() => undefined);
  }

  private aparar(): void {
    while (this.cache.size > LIMITE_CACHE) {
      const maisAntigo = this.cache.keys().next();
      if (maisAntigo.done) return;
      this.cache.delete(maisAntigo.value);
    }
  }
}

let atual = new CatalogoEan(null);

/** Liga o catálogo à API (chamado uma vez na `instancia.ts`); `null` volta à base simulada. */
export function configurarCatalogoEan(config: ConfigCatalogoApi | null): void {
  atual = new CatalogoEan(config);
}

/** `true` quando as consultas vão para a API. */
export function catalogoComApi(): boolean {
  return atual.comApi;
}

/** Consulta instantânea, sem rede: cache local (com API) ou base simulada (demo). `{ achou: false }` fora disso. */
export function buscarNoCatalogo(ean: string): ResultadoCatalogo {
  return atual.buscarLocal(ean);
}

/** Consulta completa, com a mesma assinatura da versão simulada. Rejeita com `AbortError` se o `sinal` cancelar. */
export function consultarCatalogo(ean: string, opcoes?: OpcoesConsulta): Promise<ResultadoCatalogo> {
  return atual.consultar(ean, opcoes);
}

/** Informa à API o nome salvo para um código (best-effort; ignora qualquer falha). */
export function confirmarNoCatalogo(ean: string, nome: string): Promise<void> {
  return atual.confirmar(ean, nome);
}
