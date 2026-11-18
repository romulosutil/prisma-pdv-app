import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CobrancaPixSchema, CobrancasPixSchema, ConectarMercadoPagoReqSchema, ConexaoMercadoPagoSchema, CriarCobrancaPixReqSchema, EstadoCobrancaPixSchema,
} from '@pdv/shared';
import { exigirDono, exigirPermissao } from '../auth';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
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

  app.get('/pagamentos/cobrancas', dono, async (r) => {
    const amb = ambientePix(deps);
    const { estado } = ListaQuerySchema.parse(r.query);
    return CobrancasPixSchema.parse(await listarCobrancasPix(amb.db, r.sessao.lojaId, estado));
  });

  app.post('/pagamentos/cobrancas', vender, async (r, reply) => {
    const amb = ambientePix(deps);
    const req = CriarCobrancaPixReqSchema.parse(r.body);
    const { cobranca, criada } = await criarCobrancaPix(amb, r.sessao, req);
    return reply.status(criada ? 201 : 200).send(CobrancaPixSchema.parse(cobranca));
  });

  app.get('/pagamentos/cobrancas/:id', vender, async (r) => {
    const { id } = IdParamsSchema.parse(r.params);
    return CobrancaPixSchema.parse(await acompanharCobrancaPix(ambientePix(deps), r.sessao.lojaId, id));
  });

  app.post('/pagamentos/cobrancas/:id/cancelar', vender, async (r) => {
    const { id } = IdParamsSchema.parse(r.params);
    return CobrancaPixSchema.parse(await cancelarCobrancaPix(ambientePix(deps), r.sessao.lojaId, id));
  });
}

const AvisoQuerySchema = z.object({ 'data.id': z.string().max(128).optional(), type: z.string().max(64).optional() });
const cabecalho = (v: string | string[] | undefined): string | undefined => (typeof v === 'string' ? v : undefined);

/**
 * Webhook público do Mercado Pago (evento Order), fora do hook de sessão. Responde rápido: a única chamada
 * externa é a consulta da order (timeout do cliente HTTP de 10 s, abaixo dos 22 s do Mercado Pago).
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
}
