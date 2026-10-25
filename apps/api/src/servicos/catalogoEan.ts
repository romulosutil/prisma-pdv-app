import { and, eq } from 'drizzle-orm';
import { ProdutoCatalogoSchema, type ProdutoCatalogo } from '@pdv/shared';
import type { Db } from '../db/conexao';
import { catalogoEan, catalogoEanConfirmacoes } from '../db/schema';
import type { DadosEan, FonteEan } from '../fontes/fonte';

export const ORCAMENTO_CONSULTA_MS = 2000;
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

export interface OpcoesConsulta {
  fontes: readonly FonteEan[];
  agora: Date;
  orcamentoMs?: number;
  aviso(mensagem: string, erro?: unknown): void;
}

/** Catálogo próprio primeiro; depois as fontes externas, em ordem, dentro de um orçamento total. */
export async function consultarEan(db: Db, ean: string, opcoes: OpcoesConsulta): Promise<ProdutoCatalogo | null> {
  const [existente] = await db.select().from(catalogoEan).where(eq(catalogoEan.ean, ean));
  if (existente) return paraProduto(existente);

  const sinal = AbortSignal.timeout(opcoes.orcamentoMs ?? ORCAMENTO_CONSULTA_MS);
  for (const fonte of opcoes.fontes) {
    if (sinal.aborted) break;
    let dados: DadosEan | null = null;
    try {
      const bruto = await corrida(fonte.consultar(ean, sinal), sinal);
      dados = bruto ? sanear(bruto) : null;
    } catch (erro) {
      opcoes.aviso(`Fonte ${fonte.id} falhou para o EAN ${ean}; seguindo para a próxima.`, erro);
      continue;
    }
    if (!dados) continue;

    await db
      .insert(catalogoEan)
      .values({ ean, ...dados, fonte: fonte.id, confianca: 'externa', criadoEm: opcoes.agora, atualizadoEm: opcoes.agora })
      .onConflictDoNothing();
    // Se outra requisição gravou primeiro, vale o que está na tabela.
    const [gravado] = await db.select().from(catalogoEan).where(eq(catalogoEan.ean, ean));
    if (gravado) return paraProduto(gravado);
  }
  return null;
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

