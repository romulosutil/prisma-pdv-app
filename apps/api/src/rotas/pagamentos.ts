import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CobrancaPixSchema,
  CobrancasPixSchema,
  ConectarInfinitePayReqSchema,
  ConectarMercadoPagoReqSchema,
  ConexaoInfinitePaySchema,
  ConexaoMercadoPagoSchema,
  CriarCobrancaPixReqSchema,
  EstadoCobrancaPixSchema,
} from '@pdv/shared';
import { exigirDono, exigirPermissao } from '../auth';
import { cobrancasPagamento } from '../db/schema';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import {
  acompanharCobrancaInfinitePay,
  ambienteInfinitePay,
  cancelarCobrancaInfinitePay,
  conectarInfinitePay,
  criarCobrancaInfinitePay,
  desconectarInfinitePay,
  estadoConexaoInfinitePay,
  receberAvisoInfinitePay,
} from '../servicos/cobrancasInfinitePay';
import {
  acompanharCobrancaPix, ambientePix, cancelarCobrancaPix, conectarMercadoPago, criarCobrancaPix, desconectarMercadoPago, estadoConexao,
  listarCobrancasPix, receberAvisoMercadoPago,
} from '../servicos/cobrancasPix';

const IdParamsSchema = z.object({ id: z.uuid() });
const ListaQuerySchema = z.object({ estado: EstadoCobrancaPixSchema.optional() });

/** Rotas autenticadas. Conexão e lista: só o dono. Cobrança: quem pode vender, sempre na loja da sessão. */
export function rotasPagamentos(app: FastifyInstance, deps: Deps): void {
  const { db, relogio } = deps;
  const dono = { preHandler: exigirDono(db, relogio) };
  const vender = { preHandler: exigirPermissao(db, relogio, 'vender') };

  app.get('/pagamentos/mercadopago/conexao', dono, async (r) =>
    ConexaoMercadoPagoSchema.parse(await estadoConexao(ambientePix(deps), r.sessao.lojaId)));

  app.put('/pagamentos/mercadopago/conexao', dono, async (r, reply) => {
    const amb = ambientePix(deps);
    const req = ConectarMercadoPagoReqSchema.parse(r.body);
    const { conexao, criada } = await conectarMercadoPago(amb, r.sessao, req);
    return reply.status(criada ? 201 : 200).send(ConexaoMercadoPagoSchema.parse(conexao));
  });

  app.delete('/pagamentos/mercadopago/conexao', dono, async (r, reply) => {
    await desconectarMercadoPago(ambientePix(deps), r.sessao.lojaId);
    return reply.status(204).send();
  });

  app.get('/pagamentos/infinitepay/conexao', dono, async (r) =>
    ConexaoInfinitePaySchema.parse(await estadoConexaoInfinitePay(ambienteInfinitePay(deps), r.sessao.lojaId)));

  app.put('/pagamentos/infinitepay/conexao', dono, async (r, reply) => {
    const amb = ambienteInfinitePay(deps);
    const req = ConectarInfinitePayReqSchema.parse(r.body);
    const { conexao, criada } = await conectarInfinitePay(amb, r.sessao, req);
    return reply.status(criada ? 201 : 200).send(ConexaoInfinitePaySchema.parse(conexao));
  });

  app.delete('/pagamentos/infinitepay/conexao', dono, async (r, reply) => {
    await desconectarInfinitePay(ambienteInfinitePay(deps), r.sessao.lojaId);
    return reply.status(204).send();
  });

  app.get('/pagamentos/cobrancas', dono, async (r) => {
    const amb = ambientePix(deps);
    const { estado } = ListaQuerySchema.parse(r.query);
    return CobrancasPixSchema.parse(await listarCobrancasPix(amb.db, r.sessao.lojaId, estado));
  });

  app.post('/pagamentos/cobrancas', vender, async (r, reply) => {
    const ambPix = ambientePix(deps);
    const req = CriarCobrancaPixReqSchema.parse(r.body);
    if (req.provedor === 'infinitepay') {
      const amb = ambienteInfinitePay(deps);
      const { cobranca, criada } = await criarCobrancaInfinitePay(amb, r.sessao, req);
      return reply.status(criada ? 201 : 200).send(CobrancaPixSchema.parse(cobranca));
    }
    if (req.meio && req.meio !== 'pix') {
      throw new ErroApi(400, 'meio_nao_suportado', 'Use Pix no Mercado Pago ou InfinitePay para cobrança automática.');
    }
    const { cobranca, criada } = await criarCobrancaPix(ambPix, r.sessao, req);
    return reply.status(criada ? 201 : 200).send(CobrancaPixSchema.parse(cobranca));
  });

  app.get('/pagamentos/cobrancas/:id', vender, async (r) => {
    const ambPix = ambientePix(deps);
    const { id } = IdParamsSchema.parse(r.params);
    const [c] = await ambPix.db.select().from(cobrancasPagamento)
      .where(and(eq(cobrancasPagamento.id, id), eq(cobrancasPagamento.lojaId, r.sessao.lojaId)));
    if (!c) throw new ErroApi(404, 'cobranca_nao_encontrada', 'Cobrança não encontrada.');
    if (c.provedor === 'infinitepay') {
      return CobrancaPixSchema.parse(await acompanharCobrancaInfinitePay(ambienteInfinitePay(deps), c));
    }
    return CobrancaPixSchema.parse(await acompanharCobrancaPix(ambPix, r.sessao.lojaId, id));
  });

  app.post('/pagamentos/cobrancas/:id/cancelar', vender, async (r) => {
    const ambPix = ambientePix(deps);
    const { id } = IdParamsSchema.parse(r.params);
    const [c] = await ambPix.db.select().from(cobrancasPagamento)
      .where(and(eq(cobrancasPagamento.id, id), eq(cobrancasPagamento.lojaId, r.sessao.lojaId)));
    if (!c) throw new ErroApi(404, 'cobranca_nao_encontrada', 'Cobrança não encontrada.');
    if (c.provedor === 'infinitepay') {
      return CobrancaPixSchema.parse(await cancelarCobrancaInfinitePay(ambienteInfinitePay(deps), c));
    }
    return CobrancaPixSchema.parse(await cancelarCobrancaPix(ambPix, r.sessao.lojaId, id));
  });
}

const AvisoQuerySchema = z.object({ 'data.id': z.string().max(128).optional(), type: z.string().max(64).optional() });
const AvisoInfinitePaySchema = z.object({
  order_nsu: z.string().max(128).optional(),
  transaction_nsu: z.string().max(128).optional(),
  invoice_slug: z.string().max(128).optional(),
  slug: z.string().max(128).optional(),
}).passthrough();
const cabecalho = (v: string | string[] | undefined): string | undefined => (typeof v === 'string' ? v : undefined);

/**
 * Webhooks públicos de pagamentos, fora do hook de sessão.
 */
export function rotasWebhookPagamentos(app: FastifyInstance, deps: Deps): void {
  app.post('/webhooks/pdv-mercadopago/:conexaoPublicaId', async (r, reply) => {
    const amb = ambientePix(deps);
    const { conexaoPublicaId } = z.object({ conexaoPublicaId: z.string().max(64) }).parse(r.params);
    const consulta = AvisoQuerySchema.safeParse(r.query);
    if (!consulta.success) throw new ErroApi(400, 'requisicao_invalida', 'Aviso inválido.');
    await receberAvisoMercadoPago(amb, conexaoPublicaId, {
      assinatura: cabecalho(r.headers['x-signature']),
      requestId: cabecalho(r.headers['x-request-id']),
      dataId: consulta.data['data.id'],
      tipo: consulta.data.type,
    });
    return reply.status(200).send({ recebido: true });
  });

  app.post('/webhooks/pdv-infinitepay/:conexaoPublicaId', async (r, reply) => {
    const amb = ambienteInfinitePay(deps);
    const { conexaoPublicaId } = z.object({ conexaoPublicaId: z.string().max(64) }).parse(r.params);
    const corpo = AvisoInfinitePaySchema.safeParse(r.body ?? {});
    if (!corpo.success) throw new ErroApi(400, 'requisicao_invalida', 'Aviso InfinitePay inválido.');
    const resultado = await receberAvisoInfinitePay(amb, conexaoPublicaId, corpo.data);
    return reply.status(200).send({ recebido: true, resultado });
  });
}
