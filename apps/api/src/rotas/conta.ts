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
} from '@pdv/shared';
import { criarSessao, sha256 } from '../auth';
import { aparelhos, codigosLogin, contas, lojas, operadores } from '../db/schema';
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
    const agora = relogio.agora();

    const [conta] = await db.select({ id: contas.id }).from(contas).where(eq(contas.email, email));
    if (!conta) return reply.status(204).send();

    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await db.transaction(async (tx) => {
      await tx.update(codigosLogin).set({ usadoEm: agora }).where(and(eq(codigosLogin.email, email), isNull(codigosLogin.usadoEm)));
      await tx.insert(codigosLogin).values({
        id: gerarId(),
        email,
        codigoHash: hashDoCodigo(email, codigo),
        expiraEm: new Date(agora.getTime() + CODIGO_VALIDADE_MS),
        criadoEm: agora,
      });
    });

    // O envio por e-mail ainda não existe: fora de produção o código volta na resposta e vai para o console.
    if (producao) return reply.status(204).send();
    request.log.info(`[codigo-login] ${email}: ${codigo}`);
    return { codigo };
  });

  app.post('/auth/login', async (request) => {
    const req = LoginReqSchema.parse(request.body);
    const email = normalizarEmail(req.email);
    const agora = relogio.agora();

    const sessao = await db.transaction(async (tx) => {
      const [pendente] = await tx
        .select()
        .from(codigosLogin)
        .where(and(eq(codigosLogin.email, email), isNull(codigosLogin.usadoEm)))
        .orderBy(desc(codigosLogin.criadoEm))
        .limit(1);
      const codigoInvalido = new ErroApi(401, 'codigo_invalido', 'Código inválido ou expirado.');
      if (!pendente || pendente.expiraEm <= agora || pendente.tentativas >= CODIGO_MAX_TENTATIVAS) throw codigoInvalido;
      if (pendente.codigoHash !== hashDoCodigo(email, req.codigo)) {
        await tx.update(codigosLogin).set({ tentativas: pendente.tentativas + 1 }).where(eq(codigosLogin.id, pendente.id));
        // Sem lançar aqui: o erro desfaria a transação e a contagem de tentativas junto.
        return null;
      }

      const [conta] = await tx.select().from(contas).where(eq(contas.email, email));
      if (!conta) throw codigoInvalido;
      const [dono] = await tx
        .select()
        .from(operadores)
        .where(and(eq(operadores.contaId, conta.id), eq(operadores.papel, 'dono')));
      if (!dono) throw new Error(`Conta ${conta.id} sem operador dono`);

      const [aparelho] = await tx.select().from(aparelhos).where(eq(aparelhos.id, req.aparelhoId));
      if (aparelho && aparelho.contaId !== conta.id) {
        throw new ErroApi(409, 'aparelho_em_uso', 'Este aparelho já pertence a outra conta.');
      }
      if (aparelho) {
        await tx.update(aparelhos).set({ nome: req.aparelhoNome, ultimoAcessoEm: agora }).where(eq(aparelhos.id, aparelho.id));
      } else {
        const { assinatura } = await carregarAssinatura(tx, conta.id, agora);
        const { planoId } = licencaDe(assinatura, agora);
        const total = await tx.$count(aparelhos, eq(aparelhos.contaId, conta.id));
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
