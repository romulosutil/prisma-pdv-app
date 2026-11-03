import { randomInt } from 'node:crypto';
import { and, asc, eq, isNull, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CriarContaReqSchema,
  CriarContaResSchema,
  dentroDoLimite,
  gerarId,
  criarAcessoLiberado,
  LoginReqSchema,
  LoginResSchema,
  licencaDe,
  PerfilResSchema,
  AparelhosResSchema,
  ConsultarVinculosReqSchema, permissoesEfetivas,
} from '@pdv/shared';
import { criarSessao, exigirDono, validarDonoAtual } from '../auth';
import { aparelhos, codigosLogin, contas, lojas, operadores, sessoes, recuperacoesAparelho, usuarios } from '../db/schema';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { carregarAssinatura, salvarAssinatura, registrarEvento } from '../servicos/assinatura';
import { limitarAuth } from '../servicos/limitesAuth';
import { normalizarEmail, hashDoCodigo, limiteAuth, verificarCodigoUsuario, consumirCodigoLogin } from '../servicos/codigoLogin';
import { cancelarEntregaDoCodigo, enfileirarCodigo } from '../email/filaCodigo';
import { vinculosDoUsuario } from '../servicos/equipe';

const CODIGO_VALIDADE_MS = 10 * 60 * 1000;

const PedirCodigoReqSchema = z.object({ email: z.email() });


export function rotasConta(app: FastifyInstance, { db, relogio, cobrancaDesativada, emissaoCodigo = { modo: 'desenvolvimento' } }: Deps): void {
  app.post('/contas', async (request, reply) => {
    const req = CriarContaReqSchema.parse(request.body);
    const email = normalizarEmail(req.email);
    const agora = relogio.agora();

    const sessao = await db.transaction(async (tx) => {
      const [usuarioExistente] = await tx.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email));
      if (usuarioExistente) throw new ErroApi(409, 'email_ja_cadastrado', 'Este e-mail já tem acesso. Entre com seu código pessoal.');
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
      const usuarioId = gerarId();
      await tx.insert(usuarios).values({ id: usuarioId, email, nome: req.nomeResponsavel, criadoEm: agora, atualizadoEm: agora });
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
        .values({ id: operadorId, usuarioId, contaId, lojaId, nome: req.nomeResponsavel, papel: 'dono', aceitoEm: agora, criadoEm: agora, atualizadoEm: agora });
      await tx
        .insert(aparelhos)
        .values({ id: req.aparelhoId, contaId, lojaId, nome: req.aparelhoNome, criadoEm: agora, ultimoAcessoEm: agora });
      if (cobrancaDesativada) {
        const acesso = criarAcessoLiberado({ id: gerarId(), contaId, agora });
        await salvarAssinatura(tx, acesso, agora);
        await registrarEvento(tx, acesso, 'acesso_liberado_sem_cobranca', { planoId: acesso.planoId }, agora);
      }
      return criarSessao(tx, { contaId, lojaId, operadorId, aparelhoId: req.aparelhoId }, agora);
    });

    return reply.status(201).send(CriarContaResSchema.parse(sessao));
  });

  // Não revela se o e-mail existe: sem conta, a resposta é a mesma e nenhum código é gerado.
  app.post('/auth/codigo', async (request, reply) => {
    const email = normalizarEmail(PedirCodigoReqSchema.parse(request.body).email);
    let codigo: string | null | ErroApi;
    try { codigo = await db.transaction(async (tx) => {
      if (!await limitarAuth(tx, 'emissao_ip', request.ip, relogio)) return limiteAuth();
      if (!await limitarAuth(tx, 'emissao_email', email, relogio)) return limiteAuth();
      const [usuario] = await tx.select().from(usuarios).where(eq(usuarios.email, email)).for('update');
      if (!usuario) return null;
      let agora = relogio.agora();
      const vinculos = await vinculosDoUsuario(tx, usuario.id, agora);
      const primeiro = vinculos[0];
      if (!primeiro) return null;
      // Um usuário pode ter vínculo com outra empresa além daquela de que é dono.
      const vinculadas = await tx.select().from(contas).where(or(eq(contas.id, primeiro.contaId), eq(contas.email, email))).orderBy(asc(contas.id)).for('update');
      const conta = vinculadas.find(c => c.id === primeiro.contaId);
      if (!conta) return null;
      agora = relogio.agora();
      const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const anteriores = await tx.select({ id: codigosLogin.id }).from(codigosLogin).where(and(eq(codigosLogin.email, email), isNull(codigosLogin.usadoEm)));
      for (const c of anteriores) await cancelarEntregaDoCodigo(tx, c.id, agora, 'substituida');
      await tx.update(codigosLogin).set({ usadoEm: agora }).where(and(eq(codigosLogin.email, email), isNull(codigosLogin.usadoEm)));
      const propria = vinculadas.find(c => c.email === email);
      if (propria) await tx.update(recuperacoesAparelho).set({ invalidadoEm: agora }).where(and(eq(recuperacoesAparelho.contaId, propria.id), isNull(recuperacoesAparelho.confirmadoEm), isNull(recuperacoesAparelho.invalidadoEm)));
      const codigoId = gerarId();
      const expiraEm = new Date(agora.getTime() + CODIGO_VALIDADE_MS);
      await tx.insert(codigosLogin).values({
        id: codigoId,
        email,
        codigoHash: hashDoCodigo(email, codigo),
        expiraEm,
        criadoEm: agora,
      });
      if (emissaoCodigo.modo === 'email') await enfileirarCodigo(tx, emissaoCodigo.chaves, { contaId: conta.id, codigoId, email, codigo, dominioRemetente: emissaoCodigo.dominioRemetente, criadoEm: agora, expiraEm });
      return codigo;
    }); } catch (erro) {
      if (emissaoCodigo.modo === 'email') throw new ErroApi(503, 'codigo_indisponivel', 'Código temporariamente indisponível.');
      throw erro;
    }

    if (codigo instanceof ErroApi) throw codigo;
    if (codigo === null) return reply.status(204).send();

    if (emissaoCodigo.modo === 'email') return reply.status(204).send();
    return { codigo };
  });

  app.post('/auth/vinculos', async request => {
    const req = ConsultarVinculosReqSchema.parse(request.body);
    const resultado = await db.transaction(async tx => {
      if (!await limitarAuth(tx, 'login_ip', request.ip, relogio)) return limiteAuth();
      const prova = await verificarCodigoUsuario(tx, normalizarEmail(req.email), req.codigo, relogio);
      if (prova instanceof ErroApi) return prova;
      return vinculosDoUsuario(tx, prova.usuario.id, prova.agora);
    });
    if (resultado instanceof ErroApi) throw resultado;
    return resultado;
  });

  app.post('/auth/login', async (request) => {
    const req = LoginReqSchema.parse(request.body);
    const email = normalizarEmail(req.email);

    const sessao = await db.transaction(async (tx) => {
      if (!await limitarAuth(tx, 'login_ip', request.ip, relogio)) return limiteAuth();
      const prova = await verificarCodigoUsuario(tx, email, req.codigo, relogio);
      if (prova instanceof ErroApi) return prova;
      const { usuario, pendente } = prova;
      let agora = prova.agora;
      const vinculos = await vinculosDoUsuario(tx, usuario.id, agora);
      if (!req.operadorId && vinculos.length !== 1) return new ErroApi(409, 'selecionar_vinculo', 'Escolha a empresa e a loja para entrar.');
      const escolhido = req.operadorId ? vinculos.find(v => v.operadorId === req.operadorId) : vinculos[0];
      if (!escolhido) return new ErroApi(403, 'proibido', 'Você não tem acesso a este vínculo.');
      const [conta] = await tx.select().from(contas).where(eq(contas.id, escolhido.contaId)).for('update');
      if (!conta) return new ErroApi(403, 'proibido', 'Vínculo indisponível.');
      agora = relogio.agora();
      if (pendente.expiraEm <= agora) return new ErroApi(401, 'codigo_invalido', 'Código inválido ou expirado.');
      // A conta serializa alterações de equipe, aceite e sincronização.
      const [operador] = await tx.select().from(operadores).where(and(eq(operadores.id, escolhido.operadorId), eq(operadores.usuarioId, usuario.id)));
      if (!operador || !['ativo', 'convidado'].includes(operador.estado)) return new ErroApi(403, 'proibido', 'Vínculo indisponível.');
      if (operador.estado === 'convidado') {
        if (!req.aceitarConvite || !operador.conviteExpiraEm || operador.conviteExpiraEm <= agora) return new ErroApi(409, 'aceitar_convite', 'Confirme o aceite do convite para esta loja.');
        const { assinatura } = await carregarAssinatura(tx, conta.id, agora);
        const total = await tx.$count(operadores, and(eq(operadores.contaId, conta.id), eq(operadores.estado, 'ativo')));
        if (!dentroDoLimite(licencaDe(assinatura, agora).planoId, 'operadores', total)) return new ErroApi(409, 'limite_operadores', 'O plano atual não permite ativar mais usuários.');
      }

      const [aparelho] = await tx.select().from(aparelhos).where(eq(aparelhos.id, req.aparelhoId));
      if (aparelho && aparelho.contaId !== conta.id) {
        return new ErroApi(409, 'aparelho_em_uso', 'Este aparelho já pertence a outra conta.');
      }
      if (aparelho?.revogadoEm) return new ErroApi(409, 'aparelho_revogado', 'Este aparelho foi revogado.');
      if (aparelho && aparelho.lojaId !== operador.lojaId) return new ErroApi(409, 'aparelho_em_uso', 'Este aparelho pertence a outra loja.');
      if (aparelho) {
        await tx.update(aparelhos).set({ nome: req.aparelhoNome, ultimoAcessoEm: agora }).where(eq(aparelhos.id, aparelho.id));
      } else {
        const { assinatura } = await carregarAssinatura(tx, conta.id, agora);
        const { planoId } = licencaDe(assinatura, agora);
        const total = await tx.$count(aparelhos, and(eq(aparelhos.contaId, conta.id), isNull(aparelhos.revogadoEm)));
        if (!dentroDoLimite(planoId, 'aparelhos', total)) {
          return new ErroApi(409, 'limite_aparelhos', 'O plano atual não permite mais aparelhos. Remova um aparelho ou troque de plano.');
        }
        await tx
          .insert(aparelhos)
          .values({ id: req.aparelhoId, contaId: conta.id, lojaId: operador.lojaId, nome: req.aparelhoNome, criadoEm: agora, ultimoAcessoEm: agora });
      }

      await consumirCodigoLogin(tx, pendente.id, agora);
      if (operador.estado === 'convidado') await tx.update(operadores).set({ estado: 'ativo', aceitoEm: agora, atualizadoEm: agora }).where(eq(operadores.id, operador.id));
      return criarSessao(tx, { contaId: conta.id, lojaId: operador.lojaId, operadorId: operador.id, aparelhoId: req.aparelhoId }, agora);
    });

    if (sessao instanceof ErroApi) throw sessao;
    return LoginResSchema.parse(sessao);
  });
}

export function rotasContaProtegidas(app: FastifyInstance, { db, relogio }: Deps): void {
  async function perfil(request: import('fastify').FastifyRequest) {
    const s = request.sessao;
    const [p] = await db.select({ contaId: contas.id, lojaId: lojas.id, operadorId: operadores.id, usuarioId: usuarios.id, email: usuarios.email, nomeResponsavel: operadores.nome, nomeLoja: lojas.nome, papel: operadores.papel, permissoes: operadores.permissoes })
      .from(contas).innerJoin(lojas, and(eq(lojas.contaId, contas.id), eq(lojas.id, s.lojaId)))
      .innerJoin(operadores, and(eq(operadores.id, s.operadorId), eq(operadores.contaId, contas.id), eq(operadores.lojaId, lojas.id)))
      .innerJoin(usuarios, eq(usuarios.id, operadores.usuarioId))
      .where(eq(contas.id, s.contaId));
    if (!p) throw new ErroApi(401, 'nao_autenticado', 'Sessão inválida. Entre novamente.');
    return PerfilResSchema.parse({ ...p, permissoes: permissoesEfetivas(p.papel, p.permissoes) });
  }
  app.get('/conta', async (request) => perfil(request));
  app.post('/auth/logout', async (request, reply) => {
    await db.update(sessoes).set({ revogadaEm: relogio.agora() }).where(eq(sessoes.id, request.sessaoId));
    return reply.status(204).send();
  });
  app.get('/aparelhos', { preHandler: exigirDono(db, relogio) }, async (request) => {
    const s = request.sessao;
    const lista = await db.select().from(aparelhos).where(and(eq(aparelhos.contaId, s.contaId), eq(aparelhos.lojaId, s.lojaId)));
    return AparelhosResSchema.parse(lista.map((a) => ({ id: a.id, nome: a.nome, criadoEm: a.criadoEm.toISOString(), ultimoAcessoEm: a.ultimoAcessoEm.toISOString(), revogadoEm: a.revogadoEm?.toISOString() ?? null, atual: a.id === s.aparelhoId })));
  });
  app.delete('/aparelhos/:id', { preHandler: exigirDono(db, relogio) }, async (request, reply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const s = request.sessao;
    await db.transaction(async (tx) => {
      // Ordem comum com login: conta antes de qualquer aparelho ou sessão.
      await tx.select({ id: contas.id }).from(contas).where(eq(contas.id, s.contaId)).for('update');
      await tx.select({ id: sessoes.id }).from(sessoes).where(eq(sessoes.id, request.sessaoId)).for('update');
      const agora = relogio.agora();
      await validarDonoAtual(tx, request.sessaoId, s, agora);
      const [aparelho] = await tx.select().from(aparelhos).where(and(eq(aparelhos.id, id), eq(aparelhos.contaId, s.contaId), eq(aparelhos.lojaId, s.lojaId)));
      if (!aparelho) throw new ErroApi(404, 'aparelho_nao_encontrado', 'Aparelho não encontrado.');
      if (!aparelho.revogadoEm) await tx.update(aparelhos).set({ revogadoEm: agora }).where(eq(aparelhos.id, id));
      await tx.update(sessoes).set({ revogadaEm: agora }).where(and(eq(sessoes.aparelhoId, id), eq(sessoes.contaId, s.contaId), eq(sessoes.lojaId, s.lojaId), isNull(sessoes.revogadaEm)));
    }, { isolationLevel: 'read committed' });
    return reply.status(204).send();
  });
}
