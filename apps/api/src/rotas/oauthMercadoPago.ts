import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { InicioOAuthMercadoPagoSchema } from '@pdv/shared';
import { exigirDono } from '../auth';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { ambientePix, receberAvisoPlataforma } from '../servicos/cobrancasPix';
import { concluirOAuth, exigirOAuth, iniciarOAuth, paginaRetornoOAuth } from '../servicos/oauthMercadoPago';

/** Início do OAuth: só o dono, na loja da sessão. */
export function rotasOAuthMercadoPago(app: FastifyInstance, deps: Deps): void {
  app.post('/pagamentos/mercadopago/oauth/inicio', { preHandler: exigirDono(deps.db, deps.relogio) }, async (r, reply) => {
    const amb = exigirOAuth(ambientePix(deps));
    return reply.status(201).send(InicioOAuthMercadoPagoSchema.parse(await iniciarOAuth(amb, r.sessao)));
  });
}

const RetornoQuerySchema = z.object({ code: z.string().max(512).optional(), state: z.string().max(256).optional() });
const AvisoQuerySchema = z.object({ 'data.id': z.string().max(128).optional(), type: z.string().max(64).optional(), topic: z.string().max(64).optional() });
const cabecalho = (v: string | string[] | undefined): string | undefined => (typeof v === 'string' ? v : undefined);

function usuarioDoCorpo(corpo: unknown): string | null {
  const u = (corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>).user_id : undefined);
  return typeof u === 'number' || (typeof u === 'string' && /^\d{1,32}$/.test(u)) ? String(u) : null;
}

/** Rotas públicas (fora do hook de sessão): retorno do OAuth e webhook da aplicação da plataforma. */
export function rotasOAuthMercadoPagoPublicas(app: FastifyInstance, deps: Deps): void {
  // `logLevel: warn`: a linha de acesso padrão registraria `code` e `state` da URL.
  app.get('/pagamentos/mercadopago/oauth/retorno', { logLevel: 'warn' }, async (r, reply) => {
    reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer').header('X-Content-Type-Options', 'nosniff')
      .header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
      .type('text/html; charset=utf-8');
    let ok = false;
    try {
      const amb = exigirOAuth(ambientePix(deps));
      const consulta = RetornoQuerySchema.safeParse(r.query);
      const resultado = consulta.success ? await concluirOAuth(amb, consulta.data) : 'estado_invalido';
      ok = resultado === 'conectado';
      if (!ok) r.log.warn({ resultado }, 'Retorno do OAuth do Mercado Pago recusado.');
    } catch (erro) {
      r.log.warn({ codigo: erro instanceof ErroApi ? erro.codigo : 'erro_interno' }, 'Falha no retorno do OAuth do Mercado Pago.');
    }
    return reply.status(ok ? 200 : 400).send(paginaRetornoOAuth(ok));
  });

  app.post('/webhooks/pdv-mercadopago', async (r, reply) => {
    const amb = ambientePix(deps);
    const consulta = AvisoQuerySchema.safeParse(r.query);
    if (!consulta.success) throw new ErroApi(400, 'requisicao_invalida', 'Aviso inválido.');
    const corpo = r.body as Record<string, unknown> | undefined;
    const tipoCorpo = typeof corpo?.type === 'string' ? corpo.type : undefined;
    await receberAvisoPlataforma(amb, {
      assinatura: cabecalho(r.headers['x-signature']),
      requestId: cabecalho(r.headers['x-request-id']),
      dataId: consulta.data['data.id'],
      tipo: consulta.data.type ?? consulta.data.topic ?? tipoCorpo,
      usuarioId: usuarioDoCorpo(corpo),
    });
    return reply.status(200).send({ recebido: true });
  });
}
