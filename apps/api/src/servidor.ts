import cors from '@fastify/cors';
import { ErroTransicao } from '@pdv/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { exigirSessao } from './auth';
import type { Deps } from './deps';
import { ErroApi } from './erros';
import { rotasAssinatura, rotasPlanos } from './rotas/assinatura';
import { rotasCatalogo } from './rotas/catalogo';
import { rotasConta, rotasContaProtegidas } from './rotas/conta';
import { rotasDev } from './rotas/dev';
import { rotasSync } from './rotas/sync';

// Mensagens de validação do zod em português, inclusive nos schemas do @pdv/shared.
z.config(z.locales.pt());

export interface ConfigApp extends Deps {
  logger?: boolean;
}

function descreverErroZod(erro: z.ZodError): string {
  const primeiro = erro.issues[0];
  if (!primeiro) return 'Requisição inválida.';
  const campo = primeiro.path.join('.');
  return campo ? `Requisição inválida (${campo}): ${primeiro.message}` : `Requisição inválida: ${primeiro.message}`;
}

/** NODE_ENV é lido aqui, na criação: em produção as rotas /dev nem existem. */
export async function criarApp(config: ConfigApp): Promise<FastifyInstance> {
  const producao = process.env.NODE_ENV === 'production';
  const deps: Deps = {
    db: config.db,
    relogio: config.relogio,
    billing: config.billing,
    fontesEan: config.fontesEan,
    orcamentoEanMs: config.orcamentoEanMs,
  };
  const app = Fastify({ logger: config.logger ?? false });

  // Aceita POST com Content-Type JSON e corpo vazio (ex.: /assinatura/cancelar).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, corpo, feito) => {
    const texto = String(corpo);
    if (texto === '') return feito(null, undefined);
    try {
      feito(null, JSON.parse(texto));
    } catch {
      feito(new ErroApi(400, 'json_invalido', 'O corpo da requisição não é um JSON válido.'), undefined);
    }
  });

  app.setErrorHandler((erro, request, reply) => {
    if (erro instanceof ErroApi) return reply.status(erro.status).send({ erro: erro.codigo, mensagem: erro.message });
    if (erro instanceof z.ZodError) {
      return reply.status(400).send({ erro: 'requisicao_invalida', mensagem: descreverErroZod(erro) });
    }
    if (erro instanceof ErroTransicao) return reply.status(409).send({ erro: 'transicao_invalida', mensagem: erro.message });
    // Erros do próprio Fastify (corpo grande demais, tipo de conteúdo não suportado...).
    if (erro instanceof Error && 'statusCode' in erro && typeof erro.statusCode === 'number' && erro.statusCode < 500) {
      return reply.status(erro.statusCode).send({ erro: 'requisicao_invalida', mensagem: erro.message });
    }
    request.log.error(erro);
    return reply.status(500).send({ erro: 'erro_interno', mensagem: 'Erro interno. Tente novamente em instantes.' });
  });
  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ erro: 'rota_nao_encontrada', mensagem: 'Rota não encontrada.' }),
  );

  if (!producao) {
    await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] });
  }

  app.get('/saude', async () => {
    await deps.db.execute(sql`select 1`);
    return { status: 'ok' };
  });
  rotasPlanos(app);
  rotasConta(app, deps, producao);
  if (!producao) rotasDev(app, deps);

  await app.register(async (privado) => {
    privado.decorateRequest('sessao');
    privado.addHook('onRequest', exigirSessao(deps.db, deps.relogio));
    rotasContaProtegidas(privado, deps);
    rotasAssinatura(privado, deps);
    rotasSync(privado, deps);
    rotasCatalogo(privado, deps);
  });

  return app;
}
