import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ClienteReqSchema, ClienteSchema, EstoqueResSchema, EventoFiadoSchema, FiadoResSchema, FiltrosRelatorioSchema,
  MovimentoEstoqueReqSchema, ReceberFiadoReqSchema, EstornarFiadoReqSchema, LojaReqSchema, LojaSchema, OpcoesRelatorioSchema,
  dentroDoLimite, licencaDe, podeUsar, montarRelatorio, type LinhaRelatorio, type Permissao, type Recurso,
} from '@pdv/shared';
import { autorizacaoAtual, revalidarSessaoSync } from '../auth';
import type { Db } from '../db/conexao';
import { aparelhos, caixas, clientes, contas, eventosFiado, itensVenda, lojas, movimentosCaixa, movimentosEstoque, mudancas, operadores, produtos, vendas } from '../db/schema';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { carregarAssinatura } from '../servicos/assinatura';
import { carregarCaixas, carregarVendas, jsonIgual, saldoPersistido } from '../servicos/sync';

const negar = () => { throw new ErroApi(403, 'permissao_negada', 'Seu vínculo não permite esta operação.'); };
const conflito = (mensagem: string): never => { throw new ErroApi(409, 'conflito', mensagem); };
const naoEncontrado = (): never => { throw new ErroApi(404, 'nao_encontrado', 'Registro não encontrado nesta loja.'); };
const data = <T extends { criadoEm: Date }>(r: T) => ({ ...r, criadoEm: r.criadoEm.toISOString() });
const saldoFiado = (es: (typeof eventosFiado.$inferSelect)[]) => es.reduce((s, e) => s + (e.tipo === 'recebimento' ? 1 : -1) * e.valorCentavos, 0);

export function rotasGestao(app: FastifyInstance, { db, relogio }: Deps): void {
  async function executar<T>(r: FastifyRequest, tarefa: (tx: Db, permissoes: Permissao[], agora: Date, papel: string) => Promise<T>): Promise<T> {
    return db.transaction(async tx => {
      await tx.select({ id: contas.id }).from(contas).where(eq(contas.id, r.sessao.contaId)).for('update');
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${r.sessao.lojaId}))`);
      const agora = relogio.agora();
      const papel = await revalidarSessaoSync(tx, r.sessaoId, r.sessao, agora);
      const { permissoes } = await autorizacaoAtual(tx, r.sessao.operadorId);
      return tarefa(tx, permissoes, agora, papel);
    });
  }
  async function recurso(tx: Db, r: FastifyRequest, agora: Date, nome: Recurso) {
    const { assinatura } = await carregarAssinatura(tx, r.sessao.contaId, agora);
    const licenca = licencaDe(assinatura, agora);
    if (!podeUsar(licenca.planoId, nome) || licenca.validaAte < agora) conflito('Recurso indisponível no acesso atual. O histórico permanece disponível.');
    return licenca;
  }
  const exigir = (ps: Permissao[], p: Permissao) => { if (!ps.includes(p)) negar(); };
  async function eventos(tx: Db, lojaId: string) { return tx.select().from(eventosFiado).where(eq(eventosFiado.lojaId, lojaId)).orderBy(asc(eventosFiado.criadoEm), asc(eventosFiado.id)); }

  app.get('/estoque', async r => executar(r, async (tx, ps) => {
    const prods = await tx.select().from(produtos).where(and(eq(produtos.lojaId, r.sessao.lojaId), isNull(produtos.excluidoEm)));
    const movimentos = ps.includes('cadastrar_produto') ? await tx.select().from(movimentosEstoque).where(eq(movimentosEstoque.lojaId, r.sessao.lojaId)).orderBy(asc(movimentosEstoque.criadoEm), asc(movimentosEstoque.id)) : [];
    return EstoqueResSchema.parse({ saldos: prods.map(p => ({ produtoId: p.id, nome: p.nome, saldoMilesimos: p.estoque, minimoMilesimos: p.estoqueMinimo, negativo: (p.estoque ?? 0) < 0 })), movimentos: movimentos.map(data) });
  }));
  app.post('/estoque/movimentos', async r => {
    const req = MovimentoEstoqueReqSchema.parse(r.body);
    return executar(r, async (tx, ps, agora) => {
      exigir(ps, 'cadastrar_produto');
      const [anterior] = await tx.select().from(movimentosEstoque).where(eq(movimentosEstoque.id, req.id));
      const identidade = { ...req, lojaId: r.sessao.lojaId, operadorId: r.sessao.operadorId, aparelhoId: r.sessao.aparelhoId, itemVendaId: req.itemVendaId ?? null };
      if (anterior) {
        if (!jsonIgual({ ...data(anterior), criadoEm: undefined }, { ...identidade, criadoEm: undefined })) conflito('Identificador já usado por outro movimento.');
        return { id: req.id };
      }
      await recurso(tx, r, agora, 'estoque');
      const [p] = await tx.select().from(produtos).where(and(eq(produtos.id, req.produtoId), eq(produtos.lojaId, r.sessao.lojaId), isNull(produtos.excluidoEm)));
      if (!p) naoEncontrado();
      if (req.tipo === 'devolucao') {
        const [item] = await tx.select().from(itensVenda).where(and(eq(itensVenda.id, req.itemVendaId!), eq(itensVenda.lojaId, r.sessao.lojaId), eq(itensVenda.produtoId, p!.id)));
        if (!item) conflito('Item não pertence a uma venda deste produto e loja.');
        const devolucoes = await tx.select().from(movimentosEstoque).where(and(eq(movimentosEstoque.itemVendaId, req.itemVendaId!), eq(movimentosEstoque.tipo, 'devolucao')));
        if (req.quantidadeMilesimos + devolucoes.reduce((s, d) => s + d.quantidadeMilesimos, 0) > item!.quantidadeMilesimos) conflito('A devolução excede a quantidade vendida.');
      }
      const saldo = (p!.estoque ?? 0) + req.quantidadeMilesimos;
      if (!Number.isSafeInteger(saldo)) conflito('Saldo fora do limite seguro.');
      await tx.insert(movimentosEstoque).values({ ...identidade, criadoEm: agora });
      await tx.update(produtos).set({ estoque: saldo, versao: p!.versao + 1 }).where(eq(produtos.id, p!.id));
      await tx.insert(mudancas).values({ lojaId: p!.lojaId, entidade: 'produto', entidadeId: p!.id, criadoEm: agora });
      return { id: req.id };
    });
  });

  app.post('/clientes', async r => {
    const req = ClienteReqSchema.parse(r.body);
    return executar(r, async (tx, ps, agora) => {
      exigir(ps, 'vender');
      const [anterior] = await tx.select().from(clientes).where(eq(clientes.id, req.id));
      if (anterior) {
        if (!jsonIgual({ id: anterior.id, nome: anterior.nome, contato: anterior.contato, lojaId: anterior.lojaId }, { ...req, lojaId: r.sessao.lojaId })) conflito('Identificador de cliente já utilizado.');
        return ClienteSchema.parse(data(anterior));
      }
      await recurso(tx, r, agora, 'fiado');
      const cliente = { ...req, lojaId: r.sessao.lojaId, criadoEm: agora };
      await tx.insert(clientes).values(cliente);
      return ClienteSchema.parse(data(cliente));
    });
  });
  app.get('/fiado', async r => executar(r, async (tx, ps, agora) => {
    exigir(ps, 'vender');
    const es = await eventos(tx, r.sessao.lojaId);
    const vs = await tx.select().from(vendas).where(and(eq(vendas.lojaId, r.sessao.lojaId), ps.includes('conferir_caixas') ? undefined : eq(vendas.operadorId, r.sessao.operadorId)));
    const ids = new Set(vs.map(v => v.id));
    return FiadoResSchema.parse({ clientes: (await tx.select().from(clientes).where(eq(clientes.lojaId, r.sessao.lojaId))).map(data),
      titulos: vs.filter(v => v.fiado).map(v => {
        const f = v.fiado!, recebido = saldoFiado(es.filter(e => e.vendaId === v.id)), saldo = v.status === 'cancelada' ? 0 : f.valorCentavos - recebido;
        const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
        return { vendaId: v.id, clienteId: f.clienteId, operadorId: v.operadorId, vencimento: f.vencimento, valorCentavos: f.valorCentavos, recebidoCentavos: recebido, saldoCentavos: saldo, cancelado: v.status === 'cancelada', vencido: saldo > 0 && f.vencimento < hoje };
      }), eventos: es.filter(e => ids.has(e.vendaId)).map(data) });
  }));

  async function caixaDoRecebimento(tx: Db, r: FastifyRequest, ps: Permissao[], caixaId: string | null) {
    if (!caixaId) return null;
    exigir(ps, 'movimentar_proprio_caixa');
    const [cx] = await tx.select().from(caixas).where(and(eq(caixas.id, caixaId), eq(caixas.lojaId, r.sessao.lojaId), eq(caixas.operadorId, r.sessao.operadorId)));
    if (!cx || !cx.reservado || cx.fechadoEm || (cx.detalhes?.aparelhoAtualId ?? cx.aparelhoId) !== r.sessao.aparelhoId) conflito('Escolha seu turno aberto neste aparelho.');
    return cx!;
  }
  async function registrarRecebimento(tx: Db, r: FastifyRequest, e: typeof eventosFiado.$inferInsert, agora: Date) {
    await tx.insert(eventosFiado).values(e);
    if (e.caixaId && e.meio === 'dinheiro') {
      const tipo = e.tipo === 'recebimento' ? 'recebimento_fiado' as const : 'estorno_fiado' as const;
      const detalhes = { id: e.id, tipo, valorCentavos: e.valorCentavos, motivo: e.motivo, criadoEm: agora.toISOString(), versaoContrato: 2 as const,
        autorOperadorId: r.sessao.operadorId, responsavelOperadorId: r.sessao.operadorId, aparelhoId: r.sessao.aparelhoId,
        categoria: 'fiado', destino: e.vendaId, ...(e.originalId ? { originalId: e.originalId } : {}) };
      await tx.insert(movimentosCaixa).values({ id: e.id, caixaId: e.caixaId, lojaId: e.lojaId, tipo, valorCentavos: e.valorCentavos, motivo: e.motivo, detalhes, criadoEm: agora });
      await tx.update(caixas).set({ atualizadoEm: agora, versao: sql`${caixas.versao} + 1` }).where(eq(caixas.id, e.caixaId));
      await tx.insert(mudancas).values({ lojaId: e.lojaId, entidade: 'caixa', entidadeId: e.caixaId, criadoEm: agora });
    }
    return EventoFiadoSchema.parse(data(e as typeof eventosFiado.$inferSelect));
  }
  app.post('/fiado/recebimentos', async r => {
    const req = ReceberFiadoReqSchema.parse(r.body);
    return executar(r, async (tx, ps, agora) => {
      exigir(ps, 'vender');
      const base = { ...req, lojaId: r.sessao.lojaId, operadorId: r.sessao.operadorId, aparelhoId: r.sessao.aparelhoId, tipo: 'recebimento' as const, originalId: null };
      const [anterior] = await tx.select().from(eventosFiado).where(eq(eventosFiado.id, req.id));
      if (anterior) {
        if (!jsonIgual({ ...data(anterior), criadoEm: undefined }, { ...base, criadoEm: undefined })) conflito('Identificador de recebimento já utilizado.');
        return EventoFiadoSchema.parse(data(anterior));
      }
      await recurso(tx, r, agora, 'fiado');
      const [v] = await tx.select().from(vendas).where(and(eq(vendas.id, req.vendaId), eq(vendas.lojaId, r.sessao.lojaId)));
      if (!v?.fiado) naoEncontrado();
      if (v!.operadorId !== r.sessao.operadorId && !ps.includes('conferir_caixas')) negar();
      if (v!.status !== 'concluida') conflito('Venda cancelada não pode receber.');
      const recebido = saldoFiado((await eventos(tx, r.sessao.lojaId)).filter(e => e.vendaId === v!.id));
      if (req.valorCentavos > v!.fiado!.valorCentavos - recebido) conflito('Recebimento excede o saldo devedor.');
      await caixaDoRecebimento(tx, r, ps, req.caixaId);
      return registrarRecebimento(tx, r, { ...base, criadoEm: agora }, agora);
    });
  });
  app.post('/fiado/estornos', async r => {
    const req = EstornarFiadoReqSchema.parse(r.body);
    return executar(r, async (tx, ps, agora) => {
      exigir(ps, 'cancelar_venda');
      const [original] = await tx.select().from(eventosFiado).where(and(eq(eventosFiado.id, req.recebimentoId), eq(eventosFiado.lojaId, r.sessao.lojaId), eq(eventosFiado.tipo, 'recebimento')));
      if (!original) naoEncontrado();
      const base = { id: req.id, lojaId: r.sessao.lojaId, vendaId: original!.vendaId, operadorId: r.sessao.operadorId, aparelhoId: r.sessao.aparelhoId,
        tipo: 'estorno' as const, valorCentavos: original!.valorCentavos, meio: original!.meio, caixaId: req.caixaId, originalId: original!.id, motivo: req.motivo };
      const [anterior] = await tx.select().from(eventosFiado).where(eq(eventosFiado.id, req.id));
      if (anterior) {
        if (!jsonIgual({ ...data(anterior), criadoEm: undefined }, { ...base, criadoEm: undefined })) conflito('Identificador de estorno já utilizado.');
        return EventoFiadoSchema.parse(data(anterior));
      }
      if (original!.operadorId !== r.sessao.operadorId && !ps.includes('conferir_caixas')) negar();
      if ((await eventos(tx, r.sessao.lojaId)).some(e => e.originalId === original!.id)) conflito('Recebimento já estornado.');
      if (original!.meio === 'dinheiro') {
        exigir(ps, 'retirar_dinheiro');
        if (!req.caixaId) conflito('Devolução em dinheiro exige turno.');
      }
      const cx = await caixaDoRecebimento(tx, r, ps, req.caixaId);
      if (cx && original!.meio === 'dinheiro') {
        const m = (await carregarCaixas(tx, [cx.id])).get(cx.id)!;
        if (m.entidade !== 'caixa' || m.operacao !== 'upsert' || await saldoPersistido(tx, m.dados) < original!.valorCentavos) conflito('Saldo insuficiente para devolver dinheiro.');
      }
      // Reversão é um registro manual; a tela exige confirmação do estorno externo para Pix/cartão.
      return registrarRecebimento(tx, r, { ...base, criadoEm: agora }, agora);
    });
  });

  app.get('/lojas', async r => executar(r, async (tx, _ps, _agora, papel) => {
    const [atual] = await tx.select().from(operadores).where(eq(operadores.id, r.sessao.operadorId));
    const lista = await tx.select({ l: lojas, o: operadores }).from(lojas).innerJoin(operadores, and(eq(operadores.lojaId, lojas.id), eq(operadores.contaId, lojas.contaId)))
      .where(and(eq(lojas.contaId, r.sessao.contaId), eq(operadores.usuarioId, atual!.usuarioId!), eq(operadores.estado, 'ativo')));
    return z.array(LojaSchema).parse(lista.map(({ l, o }) => ({ ...l, operadorId: o.id, papel: o.papel })));
  }));
  app.post('/lojas', async r => {
    const req = LojaReqSchema.parse(r.body);
    return executar(r, async (tx, _ps, agora, papel) => {
      if (papel !== 'dono') negar();
      const [dono] = await tx.select().from(operadores).where(eq(operadores.id, r.sessao.operadorId));
      const [existente] = await tx.select().from(lojas).where(eq(lojas.id, req.id));
      if (existente) {
        if (existente.contaId !== r.sessao.contaId || existente.nome !== req.nome) conflito('Identificador de loja já utilizado.');
        const [o] = await tx.select().from(operadores).where(and(eq(operadores.lojaId, req.id), eq(operadores.usuarioId, dono!.usuarioId!)));
        if (!o || o.papel !== 'dono') negar();
        return LojaSchema.parse({ ...existente, operadorId: o!.id, papel: o!.papel });
      }
      const licenca = await recurso(tx, r, agora, 'multiloja');
      if (!dentroDoLimite(licenca.planoId, 'lojas', await tx.$count(lojas, eq(lojas.contaId, r.sessao.contaId)))) conflito('Limite de lojas do plano atingido.');
      const operadorId = randomUUID();
      await tx.insert(lojas).values({ ...req, contaId: r.sessao.contaId, criadoEm: agora, atualizadoEm: agora });
      await tx.insert(operadores).values({ id: operadorId, contaId: r.sessao.contaId, lojaId: req.id, nome: dono!.nome, usuarioId: dono!.usuarioId, papel: 'dono', estado: 'ativo', criadoEm: agora, atualizadoEm: agora });
      return LojaSchema.parse({ ...req, contaId: r.sessao.contaId, operadorId, papel: 'dono' });
    });
  });

  app.get('/relatorios/filtros', async r => executar(r, async (tx, ps, _agora, papel) => {
    const ls = await tx.select({ id: lojas.id, nome: lojas.nome }).from(lojas).where(and(eq(lojas.contaId, r.sessao.contaId), papel === 'dono' ? undefined : eq(lojas.id, r.sessao.lojaId)));
    const ids = ls.map(l => l.id);
    const us = await tx.select({ id: operadores.id, nome: operadores.nome, lojaId: operadores.lojaId }).from(operadores).where(and(inArray(operadores.lojaId, ids), ps.includes('conferir_caixas') ? undefined : eq(operadores.id, r.sessao.operadorId)));
    const cs = await tx.select().from(caixas).where(and(inArray(caixas.lojaId, ids), ps.includes('conferir_caixas') ? undefined : eq(caixas.operadorId, r.sessao.operadorId)));
    return OpcoesRelatorioSchema.parse({ lojas: ls, usuarios: us, turnos: cs.map(c => ({ id: c.id, operadorId: c.operadorId, lojaId: c.lojaId, abertoEm: c.abertoEm.toISOString(), fechadoEm: c.fechadoEm?.toISOString() ?? null })) });
  }));
  app.get('/relatorios', async r => {
    const filtros = FiltrosRelatorioSchema.parse(r.query);
    return executar(r, async (tx, ps, agora, papel) => {
      if (filtros.lojaId === 'todas' && papel !== 'dono') negar();
      if (filtros.lojaId && filtros.lojaId !== 'todas' && filtros.lojaId !== r.sessao.lojaId) {
        if (papel !== 'dono') negar();
        const [permitida] = await tx.select({ id: lojas.id }).from(lojas).where(and(eq(lojas.id, filtros.lojaId), eq(lojas.contaId, r.sessao.contaId)));
        if (!permitida) negar();
      }
      if (!ps.includes('conferir_caixas') && filtros.operadorId && filtros.operadorId !== r.sessao.operadorId) negar();
      const autorizadas = filtros.lojaId === 'todas' ? (await tx.select().from(lojas).where(eq(lojas.contaId, r.sessao.contaId))).map(l => l.id) : [filtros.lojaId ?? r.sessao.lojaId];
      const idsV = await tx.select({ id: vendas.id }).from(vendas).where(and(inArray(vendas.lojaId, autorizadas), ps.includes('conferir_caixas') ? undefined : eq(vendas.operadorId, r.sessao.operadorId)));
      const idsC = await tx.select({ id: caixas.id }).from(caixas).where(and(inArray(caixas.lojaId, autorizadas), ps.includes('conferir_caixas') ? undefined : eq(caixas.operadorId, r.sessao.operadorId)));
      const linhas: LinhaRelatorio[] = [];
      for (const m of (await carregarVendas(tx, idsV.map(v => v.id))).values()) if (m.entidade === 'venda' && m.operacao === 'upsert') {
        const v = m.dados, base = { lojaId: v.lojaId, operadorId: v.operadorId, caixaId: v.caixaId ?? null, em: v.criadaEm, descricao: v.itens.map(i => i.descricao).join(', ') };
        // Distribuir a venda pelos meios permite que o filtro preserve a parcela correspondente.
        for (const p of v.pagamentos) {
          linhas.push({ ...base, id: `${p.id}:venda`, categoria: 'venda', meio: p.meio, valorCentavos: p.valorCentavos });
          linhas.push({ ...base, id: p.id, categoria: 'recebimento_venda', meio: p.meio, valorCentavos: p.valorCentavos });
        }
        if (v.fiado) {
          linhas.push({ ...base, id: `${v.id}:venda-fiado`, categoria: 'venda', meio: null, valorCentavos: v.fiado.valorCentavos });
          linhas.push({ ...base, id: v.id, categoria: 'fiado_emitido', meio: null, valorCentavos: v.fiado.valorCentavos });
        }
        if (v.cancelamento) {
          for (const p of v.pagamentos) linhas.push({ ...base, id: `${v.cancelamento.id}:${p.id}`, em: v.cancelamento.em, autorOperadorId: v.cancelamento.operadorId, categoria: 'cancelamento', meio: p.meio, valorCentavos: p.valorCentavos });
          if (v.fiado) linhas.push({ ...base, id: v.cancelamento.id, em: v.cancelamento.em, autorOperadorId: v.cancelamento.operadorId, categoria: 'cancelamento', meio: null, valorCentavos: v.fiado.valorCentavos });
        }
      }
      for (const m of (await carregarCaixas(tx, idsC.map(c => c.id))).values()) if (m.entidade === 'caixa' && m.operacao === 'upsert') {
        const cx = m.dados, base = { lojaId: cx.lojaId, operadorId: cx.operadorId, caixaId: cx.id, descricao: `Turno ${cx.id}` };
        for (const mov of cx.movimentos) if (!['recebimento_fiado', 'estorno_fiado'].includes(mov.tipo)) linhas.push({ ...base, id: mov.id, em: mov.criadoEm, autorOperadorId: mov.autorOperadorId, categoria: mov.tipo as LinhaRelatorio['categoria'], meio: 'dinheiro', valorCentavos: mov.valorCentavos, descricao: mov.motivo ?? base.descricao });
        if (cx.fechamento) linhas.push({ ...base, id: `${cx.id}:diferenca`, em: cx.fechamento.em, categoria: 'diferenca', meio: 'dinheiro', valorCentavos: cx.fechamento.contadoCentavos - cx.fechamento.esperadoCentavos });
      }
      const recebimentos = await tx.select().from(eventosFiado).where(and(inArray(eventosFiado.lojaId, autorizadas), ps.includes('conferir_caixas') ? undefined : eq(eventosFiado.operadorId, r.sessao.operadorId)));
      for (const e of recebimentos) linhas.push({ id: e.id, lojaId: e.lojaId, operadorId: e.operadorId, caixaId: e.caixaId, em: e.criadoEm.toISOString(), categoria: e.tipo === 'recebimento' ? 'recebimento_fiado' : 'estorno_fiado', meio: e.meio, valorCentavos: e.valorCentavos, descricao: e.motivo });
      return montarRelatorio(linhas, { ...filtros, lojaId: filtros.lojaId ?? r.sessao.lojaId, ...(!ps.includes('conferir_caixas') ? { operadorId: r.sessao.operadorId } : {}) }, agora.toISOString());
    });
  });
}
