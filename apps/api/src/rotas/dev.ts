import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RelogioFalso } from '@pdv/shared';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { processarCobrancas } from '../servicos/cobranca';

const AvancarReqSchema = z.object({ dias: z.number().positive() });

/** Só registrada fora de produção (veja `criarApp`): relógio de teste e disparo manual do job. */
export function rotasDev(app: FastifyInstance, { db, relogio, billing }: Deps): void {
  app.post('/dev/relogio/avancar', async (request) => {
    const { dias } = AvancarReqSchema.parse(request.body);
    if (!(relogio instanceof RelogioFalso)) {
      throw new ErroApi(409, 'relogio_real', 'Este servidor usa o relógio real: não dá para avançar o tempo.');
    }
    relogio.avancarDias(dias);
    return { agora: relogio.agora().toISOString() };
  });

  app.post('/dev/jobs/cobranca', async (request) => processarCobrancas(db, billing, relogio, (m) => request.log.info(m)));
}
