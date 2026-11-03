import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { AlterarVinculoReqSchema, ConvidarReqSchema, dentroDoLimite, gerarId, licencaDe, permissoesEfetivas, VinculosSchema, VinculoSchema } from '@pdv/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { exigirDono, validarDonoAtual } from '../auth';
import { contas, lojas, operadores, sessoes, usuarios } from '../db/schema';
import type { Db } from '../db/conexao';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { normalizarEmail } from '../servicos/codigoLogin';
import { carregarAssinatura } from '../servicos/assinatura';

export function rotasEquipe(app: FastifyInstance, { db, relogio }: Deps): void {
  const guarda = { preHandler: exigirDono(db, relogio) };
  const listar = async (tx: Db, r: FastifyRequest) => {
    const lista = await tx.select({ o: operadores, u: usuarios, l: lojas }).from(operadores)
      .innerJoin(usuarios, eq(usuarios.id, operadores.usuarioId)).innerJoin(lojas, eq(lojas.id, operadores.lojaId))
      .where(and(eq(operadores.contaId, r.sessao.contaId), eq(operadores.lojaId, r.sessao.lojaId)));
    return VinculosSchema.parse(lista.map(({ o, u, l }) => ({ operadorId: o.id, usuarioId: u.id, contaId: o.contaId, lojaId: o.lojaId,
      nome: o.nome, email: u.email, nomeLoja: l.nome, papel: o.papel, estado: o.estado,
      permissoes: permissoesEfetivas(o.papel, o.permissoes), conviteExpiraEm: o.conviteExpiraEm?.toISOString() ?? null })));
  };
  async function travar(tx: Db, r: FastifyRequest) {
    await tx.select({ id: contas.id }).from(contas).where(eq(contas.id, r.sessao.contaId)).for('update');
    await validarDonoAtual(tx, r.sessaoId, r.sessao, relogio.agora());
  }
  app.get('/equipe', guarda, async r => db.transaction(async tx => { await travar(tx, r); return listar(tx, r); }));
  app.post('/equipe/convites', guarda, async (r, reply) => {
    const req = ConvidarReqSchema.parse(r.body);
    if (req.permissoes?.includes('administrar_equipe')) throw new ErroApi(400, 'permissao_invalida', 'Somente o dono administra a equipe.');
    const resultado = await db.transaction(async tx => {
      await travar(tx, r);
      const agora = relogio.agora();
      const email = normalizarEmail(req.email);
      await tx.insert(usuarios).values({ id: gerarId(), email, nome: req.nome, criadoEm: agora, atualizadoEm: agora }).onConflictDoNothing({ target: usuarios.email });
      const [usuario] = await tx.select().from(usuarios).where(eq(usuarios.email, email));
      if (!usuario) throw new Error('Identidade do convite indisponível.');
      const [anterior] = await tx.select().from(operadores).where(and(eq(operadores.usuarioId, usuario.id), eq(operadores.lojaId, r.sessao.lojaId)));
      if (anterior && (anterior.estado === 'ativo' || anterior.estado === 'suspenso' || anterior.papel === 'dono')) throw new ErroApi(409, 'vinculo_existente', 'Este usuário já possui vínculo. Edite o vínculo existente.');
      const { assinatura } = await carregarAssinatura(tx, r.sessao.contaId, agora);
      const ocupados = (await tx.select().from(operadores).where(eq(operadores.contaId, r.sessao.contaId)))
        .filter(o => o.id !== anterior?.id && (o.estado === 'ativo' || o.estado === 'suspenso' || (o.estado === 'convidado' && o.conviteExpiraEm && o.conviteExpiraEm > agora))).length;
      if (!dentroDoLimite(licencaDe(assinatura, agora).planoId, 'operadores', ocupados)) throw new ErroApi(409, 'limite_operadores', 'O plano atual não permite mais usuários.');
      const dados = { nome: req.nome, papel: req.papel, permissoes: req.permissoes ?? null, estado: 'convidado' as const,
        conviteExpiraEm: new Date(agora.getTime() + 7 * 86400000), convidadoPor: r.sessao.operadorId, aceitoEm: null, atualizadoEm: agora };
      const id = anterior?.id ?? gerarId();
      if (anterior) await tx.update(operadores).set(dados).where(eq(operadores.id, id));
      else await tx.insert(operadores).values({ id, usuarioId: usuario.id, contaId: r.sessao.contaId, lojaId: r.sessao.lojaId, criadoEm: agora, ...dados });
      return VinculoSchema.parse((await listar(tx, r)).find(o => o.operadorId === id));
    });
    return reply.status(201).send(resultado);
  });
  app.put('/equipe/:id', guarda, async r => {
    const { id } = z.object({ id: z.uuid() }).parse(r.params);
    const req = AlterarVinculoReqSchema.parse(r.body);
    if (req.permissoes?.includes('administrar_equipe')) throw new ErroApi(400, 'permissao_invalida', 'Somente o dono administra a equipe.');
    return db.transaction(async tx => {
      await travar(tx, r);
      const [alvo] = await tx.select().from(operadores).where(and(eq(operadores.id, id), eq(operadores.contaId, r.sessao.contaId), eq(operadores.lojaId, r.sessao.lojaId)));
      if (!alvo) throw new ErroApi(404, 'vinculo_nao_encontrado', 'Usuário não encontrado.');
      if (alvo.papel === 'dono') throw new ErroApi(403, 'proibido', 'O vínculo do dono não pode ser alterado por esta operação.');
      if (alvo.estado === 'convidado' && req.estado !== 'desligado') throw new ErroApi(409, 'convite_pendente', 'O usuário precisa aceitar o convite.');
      if (alvo.estado === 'desligado') throw new ErroApi(409, 'vinculo_desligado', 'Envie um novo convite para retomar o acesso.');
      const agora = relogio.agora();
      if (req.estado === 'ativo' && alvo.estado !== 'ativo') {
        const { assinatura } = await carregarAssinatura(tx, r.sessao.contaId, agora);
        const ativos = await tx.$count(operadores, and(eq(operadores.contaId, r.sessao.contaId), eq(operadores.estado, 'ativo')));
        if (!dentroDoLimite(licencaDe(assinatura, agora).planoId, 'operadores', ativos)) throw new ErroApi(409, 'limite_operadores', 'O plano atual não permite ativar mais usuários.');
      }
      await tx.update(operadores).set({ ...req, ...(req.papel && !req.permissoes ? { permissoes: null } : {}), atualizadoEm: agora }).where(eq(operadores.id, id));
      await tx.update(sessoes).set({ revogadaEm: agora }).where(and(eq(sessoes.operadorId, id), isNull(sessoes.revogadaEm)));
      return VinculoSchema.parse((await listar(tx, r)).find(o => o.operadorId === id));
    });
  });
}
