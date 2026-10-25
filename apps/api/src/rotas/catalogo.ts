import type { FastifyInstance } from 'fastify';
import { ConfirmarEanReqSchema, normalizarEan, ProdutoCatalogoSchema } from '@pdv/shared';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { confirmarEan, consultarEan, criarLimitador } from '../servicos/catalogoEan';

const LIMITE_CONSULTAS_POR_HORA = 300;
const UMA_HORA_MS = 60 * 60 * 1000;

function eanDaRota(parametros: unknown): string {
  const bruto = (parametros as { ean?: string }).ean ?? '';
  const ean = normalizarEan(bruto);
  if (!ean) throw new ErroApi(400, 'ean_invalido', 'Código de barras inválido. Confira os dígitos.');
  return ean;
}

export function rotasCatalogo(app: FastifyInstance, { db, relogio, fontesEan, orcamentoEanMs }: Deps): void {
  // Estado por instância do app (não global): cada criarApp tem a sua contagem.
  const limitador = criarLimitador(LIMITE_CONSULTAS_POR_HORA, UMA_HORA_MS, () => relogio.agora());

  app.get('/catalogo/ean/:ean', async (request) => {
    const ean = eanDaRota(request.params);
    if (!limitador.tentar(request.sessao.lojaId)) {
      throw new ErroApi(429, 'limite_consultas', 'Muitas consultas de código de barras. Tente novamente mais tarde.');
    }
    const produto = await consultarEan(db, ean, {
      fontes: fontesEan,
      agora: relogio.agora(),
      orcamentoMs: orcamentoEanMs,
      aviso: (mensagem, erro) => request.log.warn({ err: erro }, mensagem),
    });
    if (!produto) throw new ErroApi(404, 'ean_nao_encontrado', 'Produto não encontrado para este código de barras.');
    return ProdutoCatalogoSchema.parse(produto);
  });

  app.post('/catalogo/ean/:ean/confirmacao', async (request, reply) => {
    const ean = eanDaRota(request.params);
    const { nome } = ConfirmarEanReqSchema.parse(request.body);
    await confirmarEan(db, request.sessao.lojaId, ean, nome, relogio.agora());
    return reply.status(204).send();
  });
}
