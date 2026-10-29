import { randomInt } from 'node:crypto';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CriarContaReqSchema,
  CriarContaResSchema,
  dentroDoLimite,
  gerarId,
  LoginReqSchema,
  LoginResSchema,
  licencaDe,
  PerfilResSchema,
  AparelhosResSchema,
} from '@pdv/shared';
import { criarSessao, sha256 } from '../auth';
import { aparelhos, codigosLogin, contas, lojas, operadores, sessoes } from '../db/schema';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { carregarAssinatura } from '../servicos/assinatura';

const CODIGO_VALIDADE_MS = 10 * 60 * 1000;
const CODIGO_MAX_TENTATIVAS = 5;

const PedirCodigoReqSchema = z.object({ email: z.email() });

const normalizarEmail = (email: string): string => email.trim().toLowerCase();
const hashDoCodigo = (email: string, codigo: string): string => sha256(`${email}:${codigo}`);

export function rotasConta(app: FastifyInstance, { db, relogio }: Deps, producao: boolean): void {
  app.post('/contas', async (request, reply) => {
    const req = CriarContaReqSchema.parse(request.body);
    const email = normalizarEmail(req.email);
    const agora = relogio.agora();

    const sessao = await db.transaction(async (tx) => {
      const [existente] = await tx
        .select({ email: contas.email, documento: contas.documento })
        .from(contas)
        .where(or(eq(contas.email, email), eq(contas.documento, req.documento)));
      if (existente?.email === email) throw new ErroApi(409, 'email_ja_cadastrado', 'Já existe uma conta com este e-mail.');
      if (existente) throw new ErroApi(409, 'documento_ja_cadastrado', 'Já existe uma conta com este CPF/CNPJ.');
      const [aparelhoEmUso] = await tx.select({ id: aparelhos.id }).from(aparelhos).where(eq(aparelhos.id, req.aparelhoId));
      if (aparelhoEmUso) throw new ErroApi(409, 'aparelho_em_uso', 'Este aparelho já pertence a outra conta.');

      const contaId = gerarId();
      const lojaId = gerarId();
      const operadorId = gerarId();
      await tx.insert(contas).values({
        id: contaId,
        email,
        documento: req.documento,
        nomeResponsavel: req.nomeResponsavel,
        criadoEm: agora,
        atualizadoEm: agora,
      });
      await tx.insert(lojas).values({ id: lojaId, contaId, nome: req.nomeLoja, criadoEm: agora, atualizadoEm: agora });
      await tx
        .insert(operadores)
        .values({ id: operadorId, contaId, lojaId, nome: req.nomeResponsavel, papel: 'dono', criadoEm: agora, atualizadoEm: agora });
      await tx
        .insert(aparelhos)
        .values({ id: req.aparelhoId, contaId, lojaId, nome: req.aparelhoNome, criadoEm: agora, ultimoAcessoEm: agora });
      return criarSessao(tx, { contaId, lojaId, operadorId, aparelhoId: req.aparelhoId }, agora);
    });

    return reply.status(201).send(CriarContaResSchema.parse(sessao));
  });

  // Não revela se o e-mail existe: sem conta, a resposta é a mesma e nenhum código é gerado.
  app.post('/auth/codigo', async (request, reply) => {
    const email = normalizarEmail(PedirCodigoReqSchema.parse(request.body).email);
    const codigo = await db.transaction(async (tx) => {
      const [conta] = await tx.select({ id: contas.id }).from(contas).where(eq(contas.email, email)).for('update');
      if (!conta) return null;
      const agora = relogio.agora();
      const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await tx.update(codigosLogin).set({ usadoEm: agora }).where(and(eq(codigosLogin.email, email), isNull(codigosLogin.usadoEm)));
      await tx.insert(codigosLogin).values({
        id: gerarId(),
        email,
        codigoHash: hashDoCodigo(email, codigo),
        expiraEm: new Date(agora.getTime() + CODIGO_VALIDADE_MS),
        criadoEm: agora,
      });
      return codigo;
    });

    if (codigo === null) return reply.status(204).send();

    // O envio por e-mail ainda não existe: fora de produção o código volta na resposta e vai para o console.
    if (producao) return reply.status(204).send();
    request.log.info(`[codigo-login] ${email}: ${codigo}`);
    return { codigo };
  });

  app.post('/auth/login', async (request) => {
    const req = LoginReqSchema.parse(request.body);
    const email = normalizarEmail(req.email);

    const sessao = await db.transaction(async (tx) => {
      // A mesma trava serializa login, consumo de código, limite e revogação de aparelhos.
      const [conta] = await tx.select().from(contas).where(eq(contas.email, email)).for('update');
      const codigoInvalido = new ErroApi(401, 'codigo_invalido', 'Código inválido ou expirado.');
      if (!conta) throw codigoInvalido;
      const agora = relogio.agora();
      const [pendente] = await tx
        .select()
        .from(codigosLogin)
        .where(and(eq(codigosLogin.email, email), isNull(codigosLogin.usadoEm)))
        .orderBy(desc(codigosLogin.criadoEm))
        .limit(1);
      if (!pendente || pendente.expiraEm <= agora || pendente.tentativas >= CODIGO_MAX_TENTATIVAS) throw codigoInvalido;
      if (pendente.codigoHash !== hashDoCodigo(email, req.codigo)) {
        await tx.update(codigosLogin).set({ tentativas: pendente.tentativas + 1 }).where(eq(codigosLogin.id, pendente.id));
        // Sem lançar aqui: o erro desfaria a transação e a contagem de tentativas junto.
        return null;
      }

      const [dono] = await tx
        .select()
        .from(operadores)
        .where(and(eq(operadores.contaId, conta.id), eq(operadores.papel, 'dono')));
      if (!dono) throw new Error(`Conta ${conta.id} sem operador dono`);

      const [aparelho] = await tx.select().from(aparelhos).where(eq(aparelhos.id, req.aparelhoId));
      if (aparelho && aparelho.contaId !== conta.id) {
        throw new ErroApi(409, 'aparelho_em_uso', 'Este aparelho já pertence a outra conta.');
      }
      if (aparelho?.revogadoEm) throw new ErroApi(409, 'aparelho_revogado', 'Este aparelho foi revogado.');
      if (aparelho && aparelho.lojaId !== dono.lojaId) throw new ErroApi(409, 'aparelho_em_uso', 'Este aparelho pertence a outra loja.');
      if (aparelho) {
        await tx.update(aparelhos).set({ nome: req.aparelhoNome, ultimoAcessoEm: agora }).where(eq(aparelhos.id, aparelho.id));
      } else {
        const { assinatura } = await carregarAssinatura(tx, conta.id, agora);
        const { planoId } = licencaDe(assinatura, agora);
        const total = await tx.$count(aparelhos, and(eq(aparelhos.contaId, conta.id), isNull(aparelhos.revogadoEm)));
        if (!dentroDoLimite(planoId, 'aparelhos', total)) {
          throw new ErroApi(409, 'limite_aparelhos', 'O plano atual não permite mais aparelhos. Remova um aparelho ou troque de plano.');
        }
        await tx
          .insert(aparelhos)
          .values({ id: req.aparelhoId, contaId: conta.id, lojaId: dono.lojaId, nome: req.aparelhoNome, criadoEm: agora, ultimoAcessoEm: agora });
      }

      await tx.update(codigosLogin).set({ usadoEm: agora }).where(eq(codigosLogin.id, pendente.id));
      return criarSessao(tx, { contaId: conta.id, lojaId: dono.lojaId, operadorId: dono.id, aparelhoId: req.aparelhoId }, agora);
    });

    if (!sessao) throw new ErroApi(401, 'codigo_invalido', 'Código inválido ou expirado.');
    return LoginResSchema.parse(sessao);
  });
}

export function rotasContaProtegidas(app: FastifyInstance, { db, relogio }: Deps): void {
  async function perfil(request: import('fastify').FastifyRequest) {
    const s = request.sessao;
    const [p] = await db.select({ contaId: contas.id, lojaId: lojas.id, operadorId: operadores.id, email: contas.email, nomeResponsavel: contas.nomeResponsavel, nomeLoja: lojas.nome, papel: operadores.papel })
      .from(contas).innerJoin(lojas, and(eq(lojas.contaId, contas.id), eq(lojas.id, s.lojaId)))
      .innerJoin(operadores, and(eq(operadores.id, s.operadorId), eq(operadores.contaId, contas.id), eq(operadores.lojaId, lojas.id)))
      .where(eq(contas.id, s.contaId));
    if (!p) throw new ErroApi(401, 'nao_autenticado', 'Sessão inválida. Entre novamente.');
    return PerfilResSchema.parse(p);
  }
  app.get('/conta', async (request) => perfil(request));
  app.post('/auth/logout', async (request, reply) => {
    await db.update(sessoes).set({ revogadaEm: relogio.agora() }).where(eq(sessoes.id, request.sessaoId));
    return reply.status(204).send();
  });
  app.get('/aparelhos', async (request) => {
    if ((await perfil(request)).papel !== 'dono') throw new ErroApi(403, 'proibido', 'Operação permitida somente ao dono.');
    const s = request.sessao;
    const lista = await db.select().from(aparelhos).where(and(eq(aparelhos.contaId, s.contaId), eq(aparelhos.lojaId, s.lojaId)));
    return AparelhosResSchema.parse(lista.map((a) => ({ id: a.id, nome: a.nome, criadoEm: a.criadoEm.toISOString(), ultimoAcessoEm: a.ultimoAcessoEm.toISOString(), revogadoEm: a.revogadoEm?.toISOString() ?? null, atual: a.id === s.aparelhoId })));
  });
  app.delete('/aparelhos/:id', async (request, reply) => {
    if ((await perfil(request)).papel !== 'dono') throw new ErroApi(403, 'proibido', 'Operação permitida somente ao dono.');
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const s = request.sessao;
    await db.transaction(async (tx) => {
      // Ordem comum com login: conta antes de qualquer aparelho ou sessão.
      await tx.select({ id: contas.id }).from(contas).where(eq(contas.id, s.contaId)).for('update');
      const [aparelho] = await tx.select().from(aparelhos).where(and(eq(aparelhos.id, id), eq(aparelhos.contaId, s.contaId), eq(aparelhos.lojaId, s.lojaId)));
      if (!aparelho) throw new ErroApi(404, 'aparelho_nao_encontrado', 'Aparelho não encontrado.');
      const agora = relogio.agora();
      if (!aparelho.revogadoEm) await tx.update(aparelhos).set({ revogadoEm: agora }).where(eq(aparelhos.id, id));
      await tx.update(sessoes).set({ revogadaEm: agora }).where(and(eq(sessoes.aparelhoId, id), eq(sessoes.contaId, s.contaId), eq(sessoes.lojaId, s.lojaId), isNull(sessoes.revogadaEm)));
    });
    return reply.status(204).send();
  });
}
