import { and, eq } from 'drizzle-orm';
import { atribuicaoCatalogo, ProdutoCatalogoSchema, type ProdutoCatalogo } from '@pdv/shared';
import type { Db } from '../db/conexao';
import { catalogoEan, catalogoEanConfirmacoes } from '../db/schema';
import { ehDica, type DadosEan, type FonteEan, type ResultadoFonte } from '../fontes/fonte';

export const ORCAMENTO_CONSULTA_MS = 2000;
export const TIMEOUT_POR_FONTE_MS = 1200;
/** Lojas diferentes que precisam concordar no nome para ele virar sugestão. */
export const CONFIRMACOES_MINIMAS = 2;

type LinhaCatalogo = typeof catalogoEan.$inferSelect;

function paraProduto(linha: LinhaCatalogo): ProdutoCatalogo {
  return ProdutoCatalogoSchema.parse({
    ean: linha.ean,
    nome: linha.nome,
    marca: linha.marca,
    conteudo: linha.conteudo,
    imagemUrl: linha.imagemUrl,
    fonte: linha.fonte,
    confianca: linha.confianca,
    atribuicao: atribuicaoCatalogo(linha.fonte, linha.ean),
  });
}

/** Minúsculas, sem acento e com espaços colapsados: "  Café  PILÃO " == "cafe pilao". */
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const formaDeExibicao = (nome: string): string => nome.replace(/\s+/g, ' ').trim();

/** Rejeita quando o sinal aborta, mesmo que a fonte ignore o sinal: o orçamento vale para qualquer fonte. */
function corrida<T>(promessa: Promise<T>, sinal: AbortSignal): Promise<T> {
  if (sinal.aborted) return Promise.reject(sinal.reason);
  return new Promise<T>((resolve, reject) => {
    const aoAbortar = () => reject(sinal.reason);
    sinal.addEventListener('abort', aoAbortar, { once: true });
    promessa.then(
      (v) => {
        sinal.removeEventListener('abort', aoAbortar);
        resolve(v);
      },
      (e) => {
        sinal.removeEventListener('abort', aoAbortar);
        reject(e);
      },
    );
  });
}

/** Garante que o que a fonte devolveu cabe no contrato; `null` se não há nome aproveitável. */
function sanear(dados: DadosEan): DadosEan | null {
  const nome = formaDeExibicao(dados.nome).slice(0, 200).trim();
  if (!nome) return null;
  const imagemUrl = dados.imagemUrl && URL.canParse(dados.imagemUrl) ? dados.imagemUrl : null;
  return { nome, marca: dados.marca?.trim() || null, conteudo: dados.conteudo?.trim() || null, imagemUrl };
}

export interface CacheNegativo {
  contem(ean: string): boolean;
  registrar(ean: string): void;
}

export interface OpcoesConsulta {
  fontes: readonly FonteEan[];
  agora: Date;
  /** Orçamento total das fontes externas (padrão 2000 ms). */
  orcamentoMs?: number;
  /** Teto de cada fonte dentro do orçamento (padrão 1200 ms): uma fonte lenta não come o tempo das outras. */
  timeoutPorFonteMs?: number;
  /** EANs que nenhuma fonte conhece, por pouco tempo: evita repetir a cascata a cada bipe. */
  cacheNegativo?: CacheNegativo;
  aviso(mensagem: string, erro?: unknown): void;
}

/**
 * Catálogo próprio primeiro; depois as fontes externas, em ordem, dentro de um orçamento total e de um
 * teto por fonte. Para na primeira resposta útil; falha ou demora de uma fonte não impede as seguintes.
 */
export async function consultarEan(db: Db, ean: string, opcoes: OpcoesConsulta): Promise<ProdutoCatalogo | null> {
  const [existente] = await db.select().from(catalogoEan).where(eq(catalogoEan.ean, ean));
  if (existente) return paraProduto(existente);
  if (opcoes.fontes.length === 0) return null;
  if (opcoes.cacheNegativo?.contem(ean)) return null;

  const orcamento = AbortSignal.timeout(opcoes.orcamentoMs ?? ORCAMENTO_CONSULTA_MS);
  const porFonteMs = opcoes.timeoutPorFonteMs ?? TIMEOUT_POR_FONTE_MS;
  // Só um "não conheço" de todas as fontes vira cache negativo; falha ou timeout pode ser passageiro.
  let todasResponderam = true;

  for (let i = 0; i < opcoes.fontes.length; i++) {
    const fonte = opcoes.fontes[i]!;
    if (orcamento.aborted) {
      todasResponderam = false;
      break;
    }
    const sinal = AbortSignal.any([orcamento, AbortSignal.timeout(porFonteMs)]);
    let resultado: ResultadoFonte;
    try {
      resultado = await corrida(fonte.consultar(ean, sinal), sinal);
    } catch (erro) {
      todasResponderam = false;
      opcoes.aviso(`Fonte ${fonte.id} falhou para o EAN ${ean}; seguindo para a próxima.`, erro);
      continue;
    }

    if (ehDica(resultado)) {
      // A base compartilhada disse onde o código mora: pula direto para lá, ou encerra se não for adiante.
      const alvo = resultado.outraFonte;
      const atual = i;
      const destino = opcoes.fontes.findIndex((f, j) => j > atual && f.id === alvo);
      if (destino === -1) break;
      i = destino - 1;
      continue;
    }
    const dados = resultado ? sanear(resultado) : null;
    if (!dados) continue;

    await db
      .insert(catalogoEan)
      .values({ ean, ...dados, fonte: fonte.id, confianca: 'externa', criadoEm: opcoes.agora, atualizadoEm: opcoes.agora })
      .onConflictDoNothing();
    // Se outra requisição gravou primeiro, vale o que está na tabela.
    const [gravado] = await db.select().from(catalogoEan).where(eq(catalogoEan.ean, ean));
    if (gravado) return paraProduto(gravado);
  }
  if (todasResponderam) opcoes.cacheNegativo?.registrar(ean);
  return null;
}

/** Cache negativo em memória, por instância do app (como o limitador). */
export function criarCacheNegativo(ttlMs: number, agora: () => Date, maximo = 5000): CacheNegativo {
  const expiraEm = new Map<string, number>();
  return {
    contem(ean) {
      const limite = expiraEm.get(ean);
      if (limite === undefined) return false;
      if (agora().getTime() < limite) return true;
      expiraEm.delete(ean);
      return false;
    },
    registrar(ean) {
      expiraEm.delete(ean);
      expiraEm.set(ean, agora().getTime() + ttlMs);
      while (expiraEm.size > maximo) {
        const maisAntigo = expiraEm.keys().next();
        if (maisAntigo.done) break;
        expiraEm.delete(maisAntigo.value);
      }
    },
  };
}

/**
 * Registra o nome que a loja confirmou. Quando CONFIRMACOES_MINIMAS lojas distintas concordam no
 * mesmo nome normalizado, ele vira o nome do catálogo (confiança 'confirmada'), mesmo sobre um cache externo.
 */
export async function confirmarEan(db: Db, lojaId: string, ean: string, nome: string, agora: Date): Promise<void> {
  const exibicao = formaDeExibicao(nome);
  const normalizado = normalizarNome(exibicao);

  await db.transaction(async (tx) => {
    await tx
      .insert(catalogoEanConfirmacoes)
      .values({ ean, lojaId, nome: exibicao, nomeNormalizado: normalizado, criadoEm: agora })
      .onConflictDoUpdate({
        target: [catalogoEanConfirmacoes.ean, catalogoEanConfirmacoes.lojaId],
        set: { nome: exibicao, nomeNormalizado: normalizado, criadoEm: agora },
      });

    const iguais = await tx
      .select({ lojaId: catalogoEanConfirmacoes.lojaId })
      .from(catalogoEanConfirmacoes)
      .where(and(eq(catalogoEanConfirmacoes.ean, ean), eq(catalogoEanConfirmacoes.nomeNormalizado, normalizado)))
      .limit(CONFIRMACOES_MINIMAS);
    // Uma linha por loja (PK ean+loja): contar linhas é contar lojas distintas.
    if (iguais.length < CONFIRMACOES_MINIMAS) return;

    // A confirmação que acabou de chegar é, por definição, a mais recente do grupo.
    const nomeFinal = exibicao;
    // marca, conteúdo e imagem de um cache externo anterior continuam valendo: descrevem o mesmo produto.
    await tx
      .insert(catalogoEan)
      .values({ ean, nome: nomeFinal, fonte: 'proprio', confianca: 'confirmada', criadoEm: agora, atualizadoEm: agora })
      .onConflictDoUpdate({
        target: catalogoEan.ean,
        set: { nome: nomeFinal, fonte: 'proprio', confianca: 'confirmada', atualizadoEm: agora },
      });
  });
}

/** Janela fixa em memória, por loja. Criada dentro do app: nada de estado global entre instâncias. */
export function criarLimitador(limite: number, janelaMs: number, agora: () => Date) {
  const janelas = new Map<string, { inicio: number; usadas: number }>();
  return {
    /** Registra uma consulta; `false` quando a loja já esgotou a janela. */
    tentar(chave: string): boolean {
      const t = agora().getTime();
      if (janelas.size > 5000) {
        for (const [k, j] of janelas) if (t - j.inicio >= janelaMs) janelas.delete(k);
      }
      let janela = janelas.get(chave);
      if (!janela || t - janela.inicio >= janelaMs) {
        janela = { inicio: t, usadas: 0 };
        janelas.set(chave, janela);
      }
      if (janela.usadas >= limite) return false;
      janela.usadas += 1;
      return true;
    },
  };
}

