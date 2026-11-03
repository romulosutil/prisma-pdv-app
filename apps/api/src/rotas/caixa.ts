import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AutorizarTransferenciaReqSchema, CaixaSchema, ConferirCaixaReqSchema, ExecutarTransferenciaReqSchema, OperacaoCaixaReqSchema, ReservarCaixaReqSchema, TrocarAparelhoCaixaReqSchema, avaliar, licencaDe, podeUsar, sinalMovimento, type Caixa, type MovimentoCaixa, type Permissao } from '@pdv/shared';
import { autorizacaoAtual, revalidarSessaoSync } from '../auth';
import type { Db } from '../db/conexao';
import { auditoriaCaixa, caixas, contas, movimentosCaixa, mudancas, operadores } from '../db/schema';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { carregarCaixas, jsonIgual, saldoPersistido } from '../servicos/sync';
import { carregarAssinatura } from '../servicos/assinatura';

const negar = () => { throw new ErroApi(403, 'proibido', 'Seu vínculo não permite esta operação.'); };
const conflito = (mensagem: string): never => { throw new ErroApi(409, 'conflito', mensagem); };
const exigir = (permissoes: Permissao[], p: Permissao) => { if (!permissoes.includes(p)) negar(); };

/** Mesma ordem de locks do push/equipe: conta, loja, revalidação. */
export function rotasCaixa(app: FastifyInstance, { db, relogio }: Deps): void {
  function executar<T>(r: FastifyRequest, tarefa: (tx: Db, permissoes: Permissao[], agora: Date) => Promise<T>): Promise<T> {
    return db.transaction(async tx => {
      await tx.select({ id: contas.id }).from(contas).where(eq(contas.id, r.sessao.contaId)).for('update');
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${r.sessao.lojaId}))`);
      const agora = relogio.agora();
      await revalidarSessaoSync(tx, r.sessaoId, r.sessao, agora);
      const { permissoes } = await autorizacaoAtual(tx, r.sessao.operadorId);
      return tarefa(tx, permissoes, agora);
    });
  }
  async function ler(tx: Db, id: string, lojaId: string): Promise<Caixa> {
    const m = (await carregarCaixas(tx, [id])).get(id);
    if (!m || m.entidade !== 'caixa' || m.operacao !== 'upsert' || m.dados.lojaId !== lojaId) throw new ErroApi(404, 'nao_encontrado', 'Caixa não encontrado nesta loja.');
    return m.dados;
  }
  const idDaRota = (r: FastifyRequest) => z.object({ id: z.uuid() }).parse(r.params).id;
  async function evento(tx: Db, cx: Caixa, m: MovimentoCaixa, agora: Date): Promise<void> {
    await tx.insert(movimentosCaixa).values({ id: m.id, caixaId: cx.id, lojaId: cx.lojaId, tipo: m.tipo, valorCentavos: m.valorCentavos, motivo: m.motivo, detalhes: m, criadoEm: new Date(m.criadoEm) });
    await tx.update(caixas).set({ atualizadoEm: agora, versao: sql`${caixas.versao} + 1` }).where(eq(caixas.id, cx.id));
    await tx.insert(mudancas).values({ lojaId: cx.lojaId, entidade: 'caixa', entidadeId: cx.id, criadoEm: agora });
  }
  function proprio(cx: Caixa, r: FastifyRequest, permissoes: Permissao[]) {
    exigir(permissoes, 'movimentar_proprio_caixa');
    if (cx.operadorId !== r.sessao.operadorId || (cx.aparelhoAtualId ?? cx.aparelhoId) !== r.sessao.aparelhoId) negar();
  }
  async function recurso(tx: Db, r: FastifyRequest, agora: Date) {
    const { assinatura } = await carregarAssinatura(tx, r.sessao.contaId, agora);
    if (!podeUsar(licencaDe(avaliar(assinatura, agora), agora).planoId, 'sangria_suprimento')) throw new ErroApi(403, 'recurso_plano', 'Movimentos disponíveis a partir do plano Negócio.');
  }

  app.post('/caixas/reservar', async r => {
    const req = ReservarCaixaReqSchema.parse(r.body);
    return executar(r, async (tx, permissoes, agora) => {
      exigir(permissoes, 'movimentar_proprio_caixa');
      const [existente] = await tx.select().from(caixas).where(eq(caixas.id, req.id));
      if (existente) {
        if (existente.lojaId !== r.sessao.lojaId || existente.operadorId !== r.sessao.operadorId || existente.aparelhoId !== r.sessao.aparelhoId) negar();
        if (!existente.reservado || existente.detalhes?.aparelhoAtualId !== r.sessao.aparelhoId) conflito('Este turno pertence a outro aparelho ativo. Retome o turno explicitamente.');
        if (existente.fechadoEm || existente.trocoInicialCentavos !== req.trocoInicialCentavos) conflito('Esta abertura já foi usada. Atualize o histórico.');
        return CaixaSchema.parse(await ler(tx, req.id, r.sessao.lojaId));
      }
      const abertos = await tx.select().from(caixas).where(and(eq(caixas.lojaId, r.sessao.lojaId), eq(caixas.operadorId, r.sessao.operadorId), isNull(caixas.fechadoEm)));
      if (abertos.length) conflito('Seu turno anterior ainda está aberto no servidor. Sincronize o fechamento ou retome o turno antes de abrir outro.');
      const detalhes = { versaoContrato: 2 as const, contaId: r.sessao.contaId, aparelhoAtualId: r.sessao.aparelhoId, fechamento: null };
      await tx.insert(caixas).values({ id: req.id, lojaId: r.sessao.lojaId, operadorId: r.sessao.operadorId, aparelhoId: r.sessao.aparelhoId, reservado: true, detalhes, abertoEm: agora, trocoInicialCentavos: req.trocoInicialCentavos, criadoEm: agora, atualizadoEm: agora, versao: 1 });
      await tx.insert(mudancas).values({ lojaId: r.sessao.lojaId, entidade: 'caixa', entidadeId: req.id, criadoEm: agora });
      return CaixaSchema.parse(await ler(tx, req.id, r.sessao.lojaId));
    });
  });

  app.get('/caixas', r => executar(r, async (tx, permissoes) => {
    const linhas = await tx.select({ id: caixas.id, nome: operadores.nome, atualizadoEm: caixas.atualizadoEm }).from(caixas)
      .leftJoin(operadores, and(eq(operadores.id, caixas.operadorId), eq(operadores.lojaId, caixas.lojaId)))
      .where(and(eq(caixas.lojaId, r.sessao.lojaId), permissoes.includes('conferir_caixas') ? undefined : eq(caixas.operadorId, r.sessao.operadorId))).orderBy(asc(caixas.abertoEm));
    const mapa = await carregarCaixas(tx, linhas.map(l => l.id));
    const resultado = [];
    for (const l of linhas) {
      const m = mapa.get(l.id)!;
      if (m.entidade !== 'caixa' || m.operacao !== 'upsert') continue;
      const auditoria = await tx.select().from(auditoriaCaixa).where(and(eq(auditoriaCaixa.lojaId, r.sessao.lojaId), eq(auditoriaCaixa.caixaId, l.id))).orderBy(asc(auditoriaCaixa.criadoEm));
      resultado.push({ caixa: m.dados, nomeOperador: l.nome ?? 'Legado sem vínculo comprovado', saldoCentavos: m.dados.fechamento?.esperadoCentavos ?? await saldoPersistido(tx, m.dados), atualizadoEm: l.atualizadoEm.toISOString(), auditoria: auditoria.map(a => ({ id: a.id, tipo: a.tipo, autorOperadorId: a.autorOperadorId, dados: a.dados, em: a.criadoEm.toISOString() })) });
    }
    return resultado;
  }));

  app.post('/caixas/:id/movimentos', async r => {
    const id = idDaRota(r), req = OperacaoCaixaReqSchema.parse(r.body);
    return executar(r, async (tx, permissoes, agora) => {
      const cx = await ler(tx, id, r.sessao.lojaId);
      if (cx.operadorId === r.sessao.operadorId) proprio(cx, r, permissoes);
      else { exigir(permissoes, 'conferir_caixas'); exigir(permissoes, 'retirar_dinheiro'); }
      if (req.tipo !== 'suprimento') exigir(permissoes, 'retirar_dinheiro');
      if (req.tipo.startsWith('correcao_')) exigir(permissoes, 'conferir_caixas');
      await recurso(tx, r, agora);
      const m: MovimentoCaixa = { ...req, criadoEm: agora.toISOString(), versaoContrato: 2, autorOperadorId: r.sessao.operadorId, responsavelOperadorId: cx.operadorId, aparelhoId: r.sessao.aparelhoId, ...(cx.operadorId !== r.sessao.operadorId ? { aprovadorId: r.sessao.operadorId } : {}) };
      const [anterior] = await tx.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, req.id));
      if (anterior) {
        if (anterior.caixaId !== id || !jsonIgual(anterior.detalhes, { ...m, criadoEm: anterior.criadoEm.toISOString() })) conflito('Identificador já usado por outro movimento.');
        return cx;
      }
      if (cx.fechamento) conflito('Turno encerrado é imutável. Registre o ajuste no turno atual.');
      if (req.tipo.startsWith('correcao_')) {
        if (!req.originalId) conflito('Selecione o movimento original.');
        const [original] = await tx.select().from(movimentosCaixa).where(and(eq(movimentosCaixa.id, req.originalId!), eq(movimentosCaixa.lojaId, cx.lojaId)));
        if (!original) conflito('Movimento original não encontrado nesta loja.');
      } else if (req.originalId) conflito('Referência original é exclusiva de correções.');
      if (sinalMovimento(req.tipo) < 0 && req.valorCentavos > await saldoPersistido(tx, cx)) conflito('Saída maior que o saldo sincronizado da gaveta.');
      await evento(tx, cx, m, agora);
      return ler(tx, id, r.sessao.lojaId);
    });
  });

  app.post('/caixas/transferencias/autorizar', async r => {
    const req = AutorizarTransferenciaReqSchema.parse(r.body);
    return executar(r, async (tx, permissoes, agora) => {
      const destino = await ler(tx, req.destinoId, r.sessao.lojaId);
      proprio(destino, r, permissoes);
      await recurso(tx, r, agora);
      const origem = await ler(tx, req.origemId, r.sessao.lojaId);
      if (origem.id === destino.id || origem.operadorId === destino.operadorId || origem.fechamento || destino.fechamento) conflito('Selecione dois turnos abertos de responsáveis diferentes.');
      const [anterior] = await tx.select().from(auditoriaCaixa).where(eq(auditoriaCaixa.id, req.id));
      const dados = { ...req, expiraEm: new Date(agora.getTime() + 5 * 60_000).toISOString() };
      if (anterior) {
        if (anterior.lojaId !== destino.lojaId || anterior.autorOperadorId !== r.sessao.operadorId || !jsonIgual({ ...anterior.dados, expiraEm: dados.expiraEm }, dados)) conflito('Autorização já usada com outros dados.');
        return { id: anterior.id, expiraEm: anterior.dados.expiraEm };
      }
      await tx.insert(auditoriaCaixa).values({ id: req.id, lojaId: destino.lojaId, caixaId: destino.id, autorOperadorId: r.sessao.operadorId, tipo: 'autorizar_transferencia', dados, criadoEm: agora });
      return { id: req.id, expiraEm: dados.expiraEm };
    });
  });

  app.post('/caixas/transferencias/executar', async r => {
    const req = ExecutarTransferenciaReqSchema.parse(r.body);
    return executar(r, async (tx, permissoes, agora) => {
      const [aprovacao] = await tx.select().from(auditoriaCaixa).where(and(eq(auditoriaCaixa.id, req.autorizacaoId), eq(auditoriaCaixa.lojaId, r.sessao.lojaId), eq(auditoriaCaixa.tipo, 'autorizar_transferencia')));
      if (!aprovacao) conflito('Autorização de recebimento não encontrada.');
      const a = AutorizarTransferenciaReqSchema.parse(Object.fromEntries(Object.entries(aprovacao!.dados).filter(([k]) => k !== 'expiraEm')));
      const origem = await ler(tx, a.origemId, r.sessao.lojaId), destino = await ler(tx, a.destinoId, r.sessao.lojaId);
      proprio(origem, r, permissoes); exigir(permissoes, 'retirar_dinheiro');
      // A aprovação permanece imutável: o débito é a chave de confirmação idempotente.
      const debitos = origem.movimentos.filter(m => m.transferenciaId === a.id && m.tipo === 'transferencia_saida');
      if (debitos.length) return { id: a.id, caixa: origem };
      await recurso(tx, r, agora);
      if (origem.fechamento || destino.fechamento || Date.parse(String(aprovacao!.dados.expiraEm)) <= agora.getTime()) conflito('A autorização expirou ou um dos turnos foi encerrado.');
      const atualDestino = await autorizacaoAtual(tx, destino.operadorId);
      exigir(atualDestino.permissoes, 'movimentar_proprio_caixa');
      if (aprovacao!.autorOperadorId !== destino.operadorId) negar();
      if (a.valorCentavos > await saldoPersistido(tx, origem)) conflito('Transferência maior que o saldo sincronizado da origem.');
      const base = { valorCentavos: a.valorCentavos, motivo: a.motivo, criadoEm: agora.toISOString(), versaoContrato: 2 as const, autorOperadorId: r.sessao.operadorId, aparelhoId: r.sessao.aparelhoId, aprovadorId: destino.operadorId, categoria: 'transferencia', transferenciaId: a.id };
      await evento(tx, origem, { ...base, id: randomUUID(), tipo: 'transferencia_saida', responsavelOperadorId: origem.operadorId, destino: destino.id }, agora);
      await evento(tx, destino, { ...base, id: randomUUID(), tipo: 'transferencia_entrada', responsavelOperadorId: destino.operadorId, destino: origem.id }, agora);
      return { id: a.id, caixa: await ler(tx, origem.id, origem.lojaId) };
    });
  });

  app.post('/caixas/:id/conferir', async r => {
    const id = idDaRota(r), req = ConferirCaixaReqSchema.parse(r.body);
    return executar(r, async (tx, permissoes, agora) => {
      exigir(permissoes, 'conferir_caixas');
      const cx = await ler(tx, id, r.sessao.lojaId);
      if (!cx.fechamento) conflito('Feche o turno antes da conferência final.');
      const dados = { motivo: req.motivo, responsavelOperadorId: cx.operadorId, fechamento: cx.fechamento };
      const [anterior] = await tx.select().from(auditoriaCaixa).where(eq(auditoriaCaixa.id, req.id));
      if (anterior) {
        if (anterior.caixaId !== id || anterior.autorOperadorId !== r.sessao.operadorId || anterior.tipo !== 'conferencia' || !jsonIgual(anterior.dados, dados)) conflito('Identificador já utilizado.');
        return { id: req.id };
      }
      await tx.insert(auditoriaCaixa).values({ id: req.id, lojaId: cx.lojaId, caixaId: id, autorOperadorId: r.sessao.operadorId, tipo: 'conferencia', dados, criadoEm: agora });
      return { id: req.id };
    });
  });

  app.post('/caixas/:id/aparelho', async r => {
    const id = idDaRota(r), req = TrocarAparelhoCaixaReqSchema.parse(r.body);
    return executar(r, async (tx, permissoes, agora) => {
      exigir(permissoes, 'movimentar_proprio_caixa');
      const cx = await ler(tx, id, r.sessao.lojaId);
      if (cx.operadorId !== r.sessao.operadorId) negar();
      if (cx.fechamento) conflito('O turno já foi encerrado.');
      if (cx.aparelhoAtualId === r.sessao.aparelhoId) return cx;
      if (req.aparelhoAnteriorId !== (cx.aparelhoAtualId ?? cx.aparelhoId)) conflito('O aparelho responsável já mudou. Atualize os dados.');
      if (await tx.$count(caixas, and(eq(caixas.lojaId, cx.lojaId), eq(caixas.operadorId, cx.operadorId), eq(caixas.reservado, true), isNull(caixas.fechadoEm), ne(caixas.id, id)))) conflito('Já existe outro turno reservado para você. Encerre-o antes de retomar este histórico.');
      const detalhes = { versaoContrato: 2 as const, contaId: r.sessao.contaId, aparelhoAtualId: r.sessao.aparelhoId, fechamento: null };
      await tx.update(caixas).set({ reservado: true, detalhes, atualizadoEm: agora, versao: sql`${caixas.versao} + 1` }).where(eq(caixas.id, id));
      await tx.insert(auditoriaCaixa).values({ id: randomUUID(), lojaId: cx.lojaId, caixaId: id, autorOperadorId: r.sessao.operadorId, tipo: 'troca_aparelho', dados: { ...req, aparelhoNovoId: r.sessao.aparelhoId }, criadoEm: agora });
      await tx.insert(mudancas).values({ lojaId: cx.lojaId, entidade: 'caixa', entidadeId: id, criadoEm: agora });
      return ler(tx, id, cx.lojaId);
    });
  });
}
