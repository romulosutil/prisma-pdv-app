import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SyncPullResSchema, SyncPushReqSchema, SyncPushResSchema } from '@pdv/shared';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { aplicarPush, buscarMudancas } from '../servicos/sync';
import { autorizacaoAtual, revalidarSessaoSync } from '../auth';
import { eq } from 'drizzle-orm';
import { contas } from '../db/schema';

const PullQuerySchema = z.object({
  desde: z
    .string()
    .regex(/^\d+$/, 'O cursor deve ser um número, como o devolvido pela última sincronização')
    .default('0'),
});

export function rotasSync(app: FastifyInstance, { db, relogio }: Deps): void {
  app.post('/sync/push', async (request) => {
    const req = SyncPushReqSchema.parse(request.body);
    if (req.aparelhoId !== request.sessao.aparelhoId) {
      throw new ErroApi(403, 'aparelho_invalido', 'O aparelho informado não é o da sessão.');
    }
    return SyncPushResSchema.parse(await aplicarPush(db, request.sessaoId, request.sessao, req, relogio));
  });

  app.get('/sync/pull', async (request) => {
    const { desde } = PullQuerySchema.parse(request.query);
    return db.transaction(async tx => {
      await tx.select({ id: contas.id }).from(contas).where(eq(contas.id, request.sessao.contaId)).for('update');
      await revalidarSessaoSync(tx, request.sessaoId, request.sessao, relogio.agora());
      const { permissoes } = await autorizacaoAtual(tx, request.sessao.operadorId);
      return SyncPullResSchema.parse(await buscarMudancas(tx, request.sessao.lojaId, Number(desde), permissoes.includes('conferir_caixas') ? undefined : request.sessao.operadorId));
    });
  });
}
