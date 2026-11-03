import { randomInt } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { CriarContaReqSchema, gerarId, type CriarContaReq, type Relogio } from '@pdv/shared';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Deps } from '../deps';
import type { Db } from '../db/conexao';
import { codigosLogin, contas, usuarios } from '../db/schema';
import { ErroApi } from '../erros';
import { cancelarEntregaDoCodigo, enfileirarCodigo } from '../email/filaCodigo';
import { hashDoCodigo, normalizarEmail, limiteAuth } from '../servicos/codigoLogin';
import { limitarAuth } from '../servicos/limitesAuth';

/** Desafios não reservam CPF/e-mail nem criam usuário, empresa, aparelho ou sessão. */
export function rotasCadastro(app: FastifyInstance, { db, relogio, emissaoCodigo = { modo: 'desenvolvimento' } }: Deps) {
  app.get('/auth/cadastro/configuracao', async () => ({ versaoContrato: 1, verificacaoEmail: emissaoCodigo.modo === 'email', verificacaoAntecipada: true }));
  app.post('/auth/cadastro/verificar', async (request, reply) => {
    const req = CriarContaReqSchema.pick({ email: true, documento: true, aparelhoId: true, desafioCadastroId: true, codigoCadastro: true }).parse(request.body);
    const resultado = await db.transaction(async tx => {
      if (!await limitarAuth(tx, 'cadastro_confirmacao_ip', request.ip, relogio)) return limiteAuth();
      const prova = await verificarCadastro(tx, req, relogio);
      if (prova instanceof ErroApi) return prova;
      const [usuario] = await tx.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, normalizarEmail(req.email)));
      if (usuario) return new ErroApi(409, 'email_ja_cadastrado', 'Este e-mail já tem acesso. Entre com seu código pessoal.');
      const [conta] = await tx.select({ id: contas.id }).from(contas).where(eq(contas.documento, req.documento));
      if (conta) return new ErroApi(409, 'documento_ja_cadastrado', 'Já existe uma conta com este CPF/CNPJ. Entre na conta ou procure o suporte.');
      return null;
    });
    if (resultado instanceof ErroApi) throw resultado;
    return reply.status(204).send();
  });
  app.post('/auth/cadastro/codigo', async (request, reply) => {
    const req = z.object({ email: z.email(), aparelhoId: z.uuid() }).parse(request.body);
    const email = normalizarEmail(req.email);
    const resultado = await db.transaction(async tx => {
      if (!await limitarAuth(tx, 'cadastro_ip', request.ip, relogio) || !await limitarAuth(tx, 'cadastro_email', email, relogio)) return limiteAuth();
      const [existente] = await tx.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email));
      if (existente) return new ErroApi(409, 'email_ja_cadastrado', 'Este e-mail já tem acesso. Entre com seu código pessoal.');
      const agora = relogio.agora(), id = gerarId(), codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const anteriores = await tx.select({ id: codigosLogin.id }).from(codigosLogin).where(and(eq(codigosLogin.email, email), eq(codigosLogin.finalidade, 'cadastro'), isNull(codigosLogin.usadoEm)));
      for (const anterior of anteriores) {
        await cancelarEntregaDoCodigo(tx, anterior.id, agora, 'substituida');
        await tx.update(codigosLogin).set({ usadoEm: agora }).where(eq(codigosLogin.id, anterior.id));
      }
      const expiraEm = new Date(agora.getTime() + 600_000);
      await tx.insert(codigosLogin).values({ id, email, finalidade: 'cadastro', aparelhoCadastroId: req.aparelhoId, codigoHash: hashDoCodigo(email, codigo), expiraEm, criadoEm: agora });
      if (emissaoCodigo.modo === 'email') await enfileirarCodigo(tx, emissaoCodigo.chaves, { contaId: null, codigoId: id, email, codigo, dominioRemetente: emissaoCodigo.dominioRemetente, criadoEm: agora, expiraEm });
      return { desafioId: id, ...(emissaoCodigo.modo === 'desenvolvimento' ? { codigo } : {}) };
    });
    if (resultado instanceof ErroApi) throw resultado;
    return reply.status(200).send(resultado);
  });
}

/** Retorna erro para o chamador confirmar tentativas recusadas, sem rollback do contador. */
export async function verificarCadastro(tx: Db, req: Pick<CriarContaReq, 'email' | 'aparelhoId' | 'desafioCadastroId' | 'codigoCadastro'>, relogio: Relogio): Promise<ErroApi | string> {
  if (!req.desafioCadastroId || !req.codigoCadastro) return new ErroApi(400, 'cadastro_codigo_necessario', 'Confirme seu e-mail antes de criar a conta.');
  const [prova] = await tx.select().from(codigosLogin).where(eq(codigosLogin.id, req.desafioCadastroId)).for('update');
  const invalido = new ErroApi(400, 'codigo_invalido', 'Código inválido ou expirado.');
  if (!prova || prova.finalidade !== 'cadastro' || prova.email !== normalizarEmail(req.email) || prova.aparelhoCadastroId !== req.aparelhoId || prova.usadoEm || prova.expiraEm <= relogio.agora() || prova.tentativas >= 5) return invalido;
  if (prova.codigoHash !== hashDoCodigo(prova.email, req.codigoCadastro)) {
    await tx.update(codigosLogin).set({ tentativas: prova.tentativas + 1 }).where(eq(codigosLogin.id, prova.id));
    if (prova.tentativas + 1 >= 5) await cancelarEntregaDoCodigo(tx, prova.id, relogio.agora(), 'esgotado');
    return invalido;
  }
  return prova.id;
}
