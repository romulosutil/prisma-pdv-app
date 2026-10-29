import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { gerarId, type Relogio, type Sessao } from '@pdv/shared';
import type { Db } from './db/conexao';
import { aparelhos, contas, lojas, operadores, sessoes } from './db/schema';
import { ErroApi } from './erros';

export type SessaoAutenticada = Omit<Sessao, 'token'>;

declare module 'fastify' {
  interface FastifyRequest {
    sessao: SessaoAutenticada;
    sessaoId: string;
  }
}

export const sha256 = (texto: string): string => createHash('sha256').update(texto).digest('hex');

/** Abre uma sessão e devolve o token em claro, que só existe aqui e no aparelho. */
export const SESSAO_VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;
export async function criarSessao(db: Db, dados: SessaoAutenticada, agora: Date, token = randomBytes(32).toString('base64url')): Promise<Sessao> {
  await db.insert(sessoes).values({ id: gerarId(), tokenHash: sha256(token), ...dados, criadoEm: agora, expiraEm: new Date(agora.getTime() + SESSAO_VALIDADE_MS) });
  return { token, ...dados };
}

/** Hook `onRequest` das rotas protegidas: `Authorization: Bearer <token>`. */
export function exigirSessao(db: Db, relogio: Relogio) {
  return async (request: FastifyRequest): Promise<void> => {
    const token = /^Bearer (\S+)$/.exec(request.headers.authorization ?? '')?.[1];
    if (!token) throw new ErroApi(401, 'nao_autenticado', 'Sessão inválida. Entre novamente.');
    const [sessao] = await db
      .select({
        id: sessoes.id,
        contaId: sessoes.contaId,
        lojaId: sessoes.lojaId,
        operadorId: sessoes.operadorId,
        aparelhoId: sessoes.aparelhoId,
      })
      .from(sessoes)
      .innerJoin(contas, eq(contas.id, sessoes.contaId))
      .innerJoin(lojas, and(eq(lojas.id, sessoes.lojaId), eq(lojas.contaId, contas.id)))
      .innerJoin(operadores, and(eq(operadores.id, sessoes.operadorId), eq(operadores.contaId, contas.id), eq(operadores.lojaId, lojas.id)))
      .innerJoin(aparelhos, and(eq(aparelhos.id, sessoes.aparelhoId), eq(aparelhos.contaId, contas.id), eq(aparelhos.lojaId, lojas.id)))
      .where(and(eq(sessoes.tokenHash, sha256(token)), isNull(sessoes.revogadaEm), isNull(aparelhos.revogadoEm), gt(sessoes.expiraEm, relogio.agora())));
    if (!sessao) throw new ErroApi(401, 'nao_autenticado', 'Sessão inválida. Entre novamente.');
    const { id, ...identidade } = sessao;
    request.sessaoId = id;
    request.sessao = identidade;
  };
}

/** Revalida a identidade depois dos locks da transação de push. */
export async function revalidarSessaoSync(tx: Db, sessaoId: string, identidade: SessaoAutenticada, agora: Date): Promise<void> {
  const [sessao] = await tx.select({ id: sessoes.id }).from(sessoes)
    .innerJoin(contas, eq(contas.id, sessoes.contaId))
    .innerJoin(lojas, and(eq(lojas.id, sessoes.lojaId), eq(lojas.contaId, contas.id)))
    .innerJoin(operadores, and(eq(operadores.id, sessoes.operadorId), eq(operadores.contaId, contas.id), eq(operadores.lojaId, lojas.id)))
    .innerJoin(aparelhos, and(eq(aparelhos.id, sessoes.aparelhoId), eq(aparelhos.contaId, contas.id), eq(aparelhos.lojaId, lojas.id)))
    .where(and(eq(sessoes.id, sessaoId), eq(sessoes.contaId, identidade.contaId), eq(sessoes.lojaId, identidade.lojaId),
      eq(sessoes.operadorId, identidade.operadorId), eq(sessoes.aparelhoId, identidade.aparelhoId),
      isNull(sessoes.revogadaEm), isNull(aparelhos.revogadoEm), gt(sessoes.expiraEm, agora)));
  if (!sessao) throw new ErroApi(401, 'nao_autenticado', 'Sessão inválida. Entre novamente.');
}
