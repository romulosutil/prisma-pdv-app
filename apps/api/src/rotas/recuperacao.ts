import { randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { ConfirmarRecuperacaoReqSchema, IniciarRecuperacaoReqSchema, RecuperacaoAparelhoSchema, SessaoSchema, dentroDoLimite, gerarId, licencaDe } from '@pdv/shared';
import type { FastifyInstance } from 'fastify';
import { criarSessao, sha256 } from '../auth';
import { aparelhos, codigosLogin, contas, lojas, operadores, recuperacoesAparelho, sessoes } from '../db/schema';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { carregarAssinatura } from '../servicos/assinatura';
import { limiteAuth, normalizarEmail, verificarCodigo } from '../servicos/codigoLogin';
import { limitarAuth } from '../servicos/limitesAuth';

const conflito = (codigo: string) => new ErroApi(409, codigo, 'Não foi possível recuperar o aparelho.');
const invalida = () => new ErroApi(401, 'recuperacao_invalida', 'Recuperação inválida ou expirada.');

export function rotasRecuperacao(app: FastifyInstance, { db, relogio }: Deps): void {
  app.post('/auth/recuperacao', async (request) => {
    const req = IniciarRecuperacaoReqSchema.parse(request.body);
    const resultado = await db.transaction(async (tx) => {
      if (!await limitarAuth(tx, 'login_ip', request.ip, relogio)) return limiteAuth();
      const prova = await verificarCodigo(tx, normalizarEmail(req.email), req.codigo, relogio);
      if (prova instanceof ErroApi) return prova;
      const { conta, pendente, agora } = prova;
      const [dono] = await tx.select().from(operadores).where(and(eq(operadores.contaId, conta.id), eq(operadores.papel, 'dono')));
      if (!dono) throw new Error('Conta sem dono');
      const [loja] = await tx.select().from(lojas).where(and(eq(lojas.id, dono.lojaId), eq(lojas.contaId, conta.id)));
      if (!loja) throw new Error('Conta sem loja');
      const [existente] = await tx.select().from(aparelhos).where(eq(aparelhos.id, req.aparelhoId));
      if (existente && (existente.contaId !== conta.id || existente.lojaId !== loja.id)) return conflito('aparelho_em_uso');
      if (existente?.revogadoEm) return conflito('aparelho_revogado');
      if (existente) return conflito('aparelho_ja_autorizado');
      const ativos = await tx.select().from(aparelhos).where(and(eq(aparelhos.contaId, conta.id), isNull(aparelhos.revogadoEm)));
      const { assinatura } = await carregarAssinatura(tx, conta.id, agora);
      if (dentroDoLimite(licencaDe(assinatura, agora).planoId, 'aparelhos', ativos.length)) return conflito('recuperacao_desnecessaria');
      const candidatos = ativos.filter((a) => a.lojaId === loja.id);
      if (!candidatos.length) return conflito('recuperacao_desnecessaria');
      const token = randomBytes(32).toString('base64url');
      const id = gerarId();
      const expiraEm = new Date(agora.getTime() + 300_000);
      await tx.update(recuperacoesAparelho).set({ invalidadoEm: agora }).where(and(eq(recuperacoesAparelho.contaId, conta.id), isNull(recuperacoesAparelho.confirmadoEm), isNull(recuperacoesAparelho.invalidadoEm)));
      await tx.insert(recuperacoesAparelho).values({ id, tokenHash: sha256(token), contaId: conta.id, lojaId: loja.id, operadorId: dono.id, aparelhoNovoId: req.aparelhoId, aparelhoNovoNome: req.aparelhoNome, aparelhosPermitidos: candidatos.map((a) => a.id), criadoEm: agora, expiraEm });
      await tx.update(codigosLogin).set({ usadoEm: agora }).where(eq(codigosLogin.id, pendente.id));
      return RecuperacaoAparelhoSchema.parse({ id, token, expiraEm: expiraEm.toISOString(), perfil: { contaId: conta.id, lojaId: loja.id, operadorId: dono.id, email: conta.email, nomeResponsavel: conta.nomeResponsavel, nomeLoja: loja.nome, papel: 'dono' }, aparelhoNovoId: req.aparelhoId, aparelhoNovoNome: req.aparelhoNome, aparelhos: candidatos.map((a) => ({ id: a.id, nome: a.nome, ultimoAcessoEm: a.ultimoAcessoEm.toISOString() })) });
    });
    if (resultado instanceof ErroApi) throw resultado;
    return resultado;
  });

  app.post('/auth/recuperacao/confirmar', async (request) => {
    const req = ConfirmarRecuperacaoReqSchema.parse(request.body);
    const resultado = await db.transaction(async (tx) => {
      if (!await limitarAuth(tx, 'login_ip', request.ip, relogio)) return limiteAuth();
      const [identidade] = await tx.select({ contaId: recuperacoesAparelho.contaId }).from(recuperacoesAparelho).where(and(eq(recuperacoesAparelho.id, req.id), eq(recuperacoesAparelho.tokenHash, sha256(req.token))));
      if (!identidade) return invalida();
      await tx.select({ id: contas.id }).from(contas).where(eq(contas.id, identidade.contaId)).for('update');
      const [r] = await tx.select().from(recuperacoesAparelho).where(eq(recuperacoesAparelho.id, req.id)).for('update');
      const agora = relogio.agora();
      if (!r || r.invalidadoEm || r.expiraEm <= agora) return invalida();
      const [dono] = await tx.select().from(operadores).where(and(eq(operadores.id, r.operadorId), eq(operadores.contaId, r.contaId), eq(operadores.lojaId, r.lojaId), eq(operadores.papel, 'dono')));
      const [loja] = await tx.select().from(lojas).where(and(eq(lojas.id, r.lojaId), eq(lojas.contaId, r.contaId)));
      if (!dono || !loja) return invalida();
      const token = sha256('pdv:recuperacao:sessao:v1:' + req.token);
      if (r.confirmadoEm) {
        if (r.aparelhoSubstituidoId !== req.aparelhoSubstituidoId) return conflito('recuperacao_desatualizada');
        const [sessao] = await tx.select().from(sessoes).where(eq(sessoes.id, r.sessaoId!));
        const [novo] = await tx.select().from(aparelhos).where(eq(aparelhos.id, r.aparelhoNovoId));
        if (!sessao || sessao.revogadaEm || sessao.expiraEm <= agora || sessao.tokenHash !== sha256(token) || sessao.contaId !== r.contaId || sessao.lojaId !== r.lojaId || sessao.operadorId !== r.operadorId || sessao.aparelhoId !== r.aparelhoNovoId || !novo || novo.revogadoEm || novo.contaId !== r.contaId || novo.lojaId !== r.lojaId) return invalida();
        return SessaoSchema.parse({ token, contaId: r.contaId, lojaId: r.lojaId, operadorId: r.operadorId, aparelhoId: r.aparelhoNovoId });
      }
      if (!r.aparelhosPermitidos.includes(req.aparelhoSubstituidoId)) return conflito('recuperacao_desatualizada');
      const [alvo] = await tx.select().from(aparelhos).where(and(eq(aparelhos.id, req.aparelhoSubstituidoId), eq(aparelhos.contaId, r.contaId), eq(aparelhos.lojaId, r.lojaId), isNull(aparelhos.revogadoEm)));
      if (!alvo) return conflito('recuperacao_desatualizada');
      const [ocupado] = await tx.select({ id: aparelhos.id }).from(aparelhos).where(eq(aparelhos.id, r.aparelhoNovoId));
      if (ocupado) return conflito('aparelho_em_uso');
      const total = await tx.$count(aparelhos, and(eq(aparelhos.contaId, r.contaId), isNull(aparelhos.revogadoEm)));
      const { assinatura } = await carregarAssinatura(tx, r.contaId, agora);
      if (!dentroDoLimite(licencaDe(assinatura, agora).planoId, 'aparelhos', total - 1)) return conflito('limite_aparelhos');
      try {
        return await tx.transaction(async (sp) => {
          await sp.update(aparelhos).set({ revogadoEm: agora }).where(eq(aparelhos.id, alvo.id));
          await sp.update(sessoes).set({ revogadaEm: agora }).where(and(eq(sessoes.aparelhoId, alvo.id), eq(sessoes.contaId, r.contaId), eq(sessoes.lojaId, r.lojaId), isNull(sessoes.revogadaEm)));
          await sp.insert(aparelhos).values({ id: r.aparelhoNovoId, contaId: r.contaId, lojaId: r.lojaId, nome: r.aparelhoNovoNome, criadoEm: agora, ultimoAcessoEm: agora });
          const sessao = await criarSessao(sp, { contaId: r.contaId, lojaId: r.lojaId, operadorId: r.operadorId, aparelhoId: r.aparelhoNovoId }, agora, token);
          const [linha] = await sp.select({ id: sessoes.id }).from(sessoes).where(eq(sessoes.tokenHash, sha256(token)));
          if (!linha) throw new Error('Sessão não encontrada');
          await sp.update(recuperacoesAparelho).set({ confirmadoEm: agora, aparelhoSubstituidoId: alvo.id, sessaoId: linha.id }).where(eq(recuperacoesAparelho.id, r.id));
          return sessao;
        });
      } catch (erro) {
        const causa = (erro as { cause?: unknown }).cause ?? erro;
        if ((causa as { code?: string; constraint_name?: string }).code === '23505' && (causa as { constraint_name?: string }).constraint_name === 'aparelhos_pkey') return conflito('aparelho_em_uso');
        throw erro;
      }
    });
    if (resultado instanceof ErroApi) throw resultado;
    return SessaoSchema.parse(resultado);
  });
}
