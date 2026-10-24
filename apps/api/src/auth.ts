import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { gerarId, type Sessao } from '@pdv/shared';
import type { Db } from './db/conexao';
import { sessoes } from './db/schema';
import { ErroApi } from './erros';

export type SessaoAutenticada = Omit<Sessao, 'token'>;

declare module 'fastify' {
  interface FastifyRequest {
    sessao: SessaoAutenticada;
  }
}

export const sha256 = (texto: string): string => createHash('sha256').update(texto).digest('hex');

/** Abre uma sessão e devolve o token em claro, que só existe aqui e no aparelho. */
export async function criarSessao(db: Db, dados: SessaoAutenticada, agora: Date): Promise<Sessao> {
  const token = randomBytes(32).toString('base64url');
  await db.insert(sessoes).values({ id: gerarId(), tokenHash: sha256(token), ...dados, criadoEm: agora });
  return { token, ...dados };
}

/** Hook `onRequest` das rotas protegidas: `Authorization: Bearer <token>`. */
export function exigirSessao(db: Db) {
  return async (request: FastifyRequest): Promise<void> => {
    const token = /^Bearer (\S+)$/.exec(request.headers.authorization ?? '')?.[1];
    if (!token) throw new ErroApi(401, 'nao_autenticado', 'Informe o token no cabeçalho Authorization: Bearer.');
    const [sessao] = await db
      .select({
        contaId: sessoes.contaId,
        lojaId: sessoes.lojaId,
        operadorId: sessoes.operadorId,
        aparelhoId: sessoes.aparelhoId,
      })
      .from(sessoes)
      .where(eq(sessoes.tokenHash, sha256(token)));
    if (!sessao) throw new ErroApi(401, 'nao_autenticado', 'Sessão inválida. Entre novamente.');
    request.sessao = sessao;
  };
}
