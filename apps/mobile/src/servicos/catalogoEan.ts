import { normalizarEan, ProdutoCatalogoSchema, type FonteCatalogo, type ProdutoCatalogo } from '@pdv/shared';
import type { Armazenamento } from '@/dados/armazenamento';
import { registrar } from '@/diagnostico/registro';
import { registrarPiloto } from '@/telemetria/registro';

/**
 * Resultado da consulta ao catálogo de códigos de barras. Os campos além do nome só vêm da API
 * (a base de demonstração só conhece o nome).
 */
export type ResultadoCatalogo =
  | { achou: true; nome: string; marca?: string | null; conteudo?: string | null; imagemUrl?: string | null; fonte?: FonteCatalogo }
  | { achou: false };

import { buscarCatalogoDemo, consultarCatalogoDemo } from './catalogoDemo';

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
  aoSessaoInvalida?: (tokenUsado: string) => Promise<void> | void;
  /** Onde fica o cache local dos códigos já achados. */
  armazenamento: Armazenamento;
  /** `fetch` a usar (testes injetam um falso). */
  buscar?: typeof fetch;
}

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
  private readonly escopo: string | null | undefined;

  constructor(private readonly config: ConfigCatalogoApi | null) {
    this.escopo = config?.armazenamento.obterEscopo?.();
    if (config) void this.carregarCache();
  }
  private mesmoEscopo(): boolean { return this.escopo === this.config?.armazenamento.obterEscopo?.(); }

  get comApi(): boolean {
    return this.config !== null;
  }

  /** Consulta instantânea e sem rede: cache local (com API) ou base simulada (demo). */
  buscarLocal(ean: string): ResultadoCatalogo {
    if (!this.mesmoEscopo()) return { achou: false };
    if (this.config) {
      const codigo = normalizarEan(ean);
      const guardado = codigo ? this.cache.get(codigo) : undefined;
      return guardado ? resultadoDe(guardado) : { achou: false };
    }
    return buscarCatalogoDemo(ean);
  }

  /** Rejeita com `AbortError` só quando o `sinal` de quem chamou cancela; qualquer outra falha vira `{ achou: false }`. */
  consultar(ean: string, { atrasoMs, sinal }: OpcoesConsulta = {}): Promise<ResultadoCatalogo> {
    if (sinal?.aborted) return Promise.reject(erroDeCancelamento());
    return this.config ? this.consultarNaApi(this.config, ean, sinal) : consultarCatalogoDemo(ean, atrasoMs, sinal);
  }

  private async consultarNaApi(config: ConfigCatalogoApi, ean: string, sinal?: AbortSignal): Promise<ResultadoCatalogo> {
    if (!this.mesmoEscopo()) return { achou: false };
    const inicio = Date.now();
    const codigo = normalizarEan(ean);
    if (!codigo) {
      registrarPiloto('catalogo', { etapa: 'invalido', achou: false });
      registrar('leitura', 'consulta de catálogo', { fonte: 'api', achou: false, ms: 0, ean: ean.replace(/\D/g, ''), invalido: true });
      return { achou: false };
    }

    await this.carregarCache();
    if (!this.mesmoEscopo()) return { achou: false };
    const guardado = this.cache.get(codigo);
    if (guardado) {
      registrarPiloto('catalogo', { etapa: 'cache', achou: true });
      registrar('leitura', 'consulta de catálogo', { fonte: 'cache', achou: true, ms: Date.now() - inicio, ean: codigo });
      return resultadoDe(guardado);
    }

    const produto = await this.pedirNaApi(config, codigo, sinal);
    registrarPiloto('catalogo', { etapa: 'api', achou: produto !== null, ms: Math.min(1_000_000, Math.max(0, Date.now() - inicio)) });
    if (!this.mesmoEscopo()) return { achou: false };
    registrar('leitura', 'consulta de catálogo', { fonte: 'api', achou: produto !== null, ms: Date.now() - inicio, ean: codigo });
    if (!produto) return { achou: false };
    this.guardar(config, produto);
    return resultadoDe(produto);
  }

  /** `null` para tudo que não for um produto válido; só lança `AbortError` quando o chamador cancela. */
  private async pedirNaApi(config: ConfigCatalogoApi, codigo: string, sinal?: AbortSignal): Promise<ProdutoCatalogo | null> {
    const token = config.obterToken();
    if (!token) { registrarPiloto('catalogo', { etapa: 'sem_sessao', achou: false }); return null; }

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
        registrarPiloto('catalogo', { etapa: resposta.status === 404 ? 'ausente' : resposta.ok ? 'pronto' : 'falha', status: resposta.status });
        if (resposta.status === 401) await config.aoSessaoInvalida?.(token);
        if (!resposta.ok) return null;
        const lido = ProdutoCatalogoSchema.safeParse(await resposta.json());
        if (!lido.success) registrarPiloto('catalogo', { etapa: 'resposta_invalida' });
        return lido.success ? { ...lido.data, ean: codigo } : null;
      })();
      // Se a corrida for perdida pelo `trabalho`, o erro dele já foi tratado pela própria corrida.
      return await Promise.race([trabalho, quandoAbortar(controle.signal)]);
    } catch (erro) {
      if (sinal?.aborted) throw erro instanceof Error && erro.name === 'AbortError' ? erro : erroDeCancelamento();
      registrarPiloto('catalogo', { etapa: controle.signal.aborted ? 'timeout' : 'rede', achou: false });
      return null;
    } finally {
      clearTimeout(prazo);
      sinal?.removeEventListener('abort', abortar);
    }
  }

  /** Avisa a API do nome que o lojista salvou. Nunca lança e nunca atrasa a tela. */
  async confirmar(ean: string, nome: string): Promise<void> {
    const config = this.config;
    if (!config || !this.mesmoEscopo()) return;
    try {
      const codigo = normalizarEan(ean);
      const nomeLimpo = nome.trim();
      const token = config.obterToken();
      if (!codigo || nomeLimpo.length < 2 || !token) return;
      const controle = new AbortController();
      const prazo = setTimeout(() => controle.abort(), PRAZO_CONFIRMACAO_MS);
      try {
        const buscar = config.buscar ?? fetch;
        const resposta = await Promise.race([
          buscar(`${config.urlApi}/catalogo/ean/${codigo}/confirmacao`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ nome: nomeLimpo }),
            signal: controle.signal,
          }),
          quandoAbortar(controle.signal),
        ]);
        if (resposta.status === 401) await config.aoSessaoInvalida?.(token);
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
        if (!this.mesmoEscopo()) return;
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
    if (!this.mesmoEscopo()) return;
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
