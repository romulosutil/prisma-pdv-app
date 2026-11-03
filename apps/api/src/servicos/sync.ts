import { and, asc, eq, gt, inArray, isNull, max, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  adicionarDias,
  avaliar,
  CARENCIA_INADIMPLENCIA_DIAS,
  dentroDoLimite,
  licencaDe,
  podeUsar,
  controlaEstoque,
  mesclarAjustesEstoque,
  type AjusteEstoque,
  OFFLINE_MAX_DIAS,
  type Assinatura,
  type Caixa,
  type EntidadeSync,
  type Licenca,
  type Mudanca,
  type Mutacao,
  type Produto,
  type Relogio,
  type SyncPullRes,
  type SyncPushReq,
  type SyncPushRes,
  type Venda,
} from '@pdv/shared';
import { revalidarSessaoSync, type SessaoAutenticada } from '../auth';
import type { Db } from '../db/conexao';
import { contas, sessoes, caixas, itensVenda, movimentosCaixa, mudancas, mutacoesAplicadas, pagamentosVenda, produtos, vendas } from '../db/schema';
import { ErroApi } from '../erros';
import { carregarAssinatura } from './assinatura';
import { vendaConsistente } from './valoresVenda';

export const PULL_LIMITE = 500;

/** `null` = mutação aceita; texto = motivo da rejeição. */
type Resultado = string | null;

interface Contexto {
  tx: Db;
  sessao: SessaoAutenticada;
  papel: 'dono' | 'operador';
  agora: Date;
  licenca: Licenca;
  /** Último instante em que o app ainda deixava abrir uma venda; `null` = nunca. */
  vendaPermitidaAte: Date | null;
  /** Produtos não excluídos da loja, atualizado a cada mutação para o limite valer dentro do mesmo lote. */
  produtosAtivos: number;
}

function vendaPermitidaAte(assinatura: Assinatura, licenca: Licenca): Date | null {
  switch (assinatura.status) {
    case 'liberada':
    case 'em_teste':
    case 'ativa':
    case 'cancelada':
      return licenca.validaAte;
    case 'inadimplente':
    case 'suspensa':
      // A suspensão acontece quando a carência acaba: até lá o app vendia normalmente.
      return assinatura.inadimplenteDesde && adicionarDias(assinatura.inadimplenteDesde, CARENCIA_INADIMPLENCIA_DIAS);
    default:
      return null;
  }
}

/** Relógio de aparelho errado não pode ganhar do last-write-wins para sempre. */
const noMaximoAgora = (iso: string, agora: Date): Date => {
  const data = new Date(iso);
  return data > agora ? agora : data;
};

const eventoIgual = (a: NonNullable<Venda['cancelamento']>, b: NonNullable<Venda['cancelamento']>) =>
  a.id === b.id && a.em === b.em && a.operadorId === b.operadorId && a.motivo === b.motivo && a.estorno === b.estorno;
const eventoValido = (evento: NonNullable<Venda['cancelamento']>, criadaEm: Date, agora: Date) =>
  new Date(evento.em) >= criadaEm && new Date(evento.em) <= agora;

async function registrarMudanca(c: Contexto, entidade: EntidadeSync, entidadeId: string): Promise<void> {
  await c.tx.insert(mudancas).values({ lojaId: c.sessao.lojaId, entidade, entidadeId, criadoEm: c.agora });
}

async function posicaoAtual(db: Db, lojaId: string): Promise<number> {
  const [linha] = await db.select({ seq: max(mudancas.seq) }).from(mudancas).where(eq(mudancas.lojaId, lojaId));
  return linha?.seq ?? 0;
}

// ---------- Produto ----------

async function upsertProduto(c: Contexto, p: Produto): Promise<Resultado> {
  if (p.lojaId !== c.sessao.lojaId) return 'loja_invalida';
  const [atual] = await c.tx.select().from(produtos).where(eq(produtos.id, p.id));
  if (atual && atual.lojaId !== p.lojaId) return 'loja_invalida';

  const atualizadoEm = noMaximoAgora(p.atualizadoEm, c.agora);
  let ajustes: AjusteEstoque[];
  try { ajustes = mesclarAjustesEstoque(atual?.ajustesEstoque ?? [], p.ajustesEstoque ?? []); }
  catch { return 'movimento_estoque_invalido'; }
  const novosAjustes = ajustes.length - (atual?.ajustesEstoque?.length ?? 0);
  const velho = atual && atualizadoEm < atual.atualizadoEm;
  // LWW vale para metadados. Novos ajustes imutáveis sobrevivem a um snapshot antigo.
  if (velho && !novosAjustes) return null;
  const vivoAntes = atual !== undefined && atual.excluidoEm === null;
  const vivoDepois = p.excluidoEm === null;
  if (!velho && !vivoAntes && vivoDepois && !dentroDoLimite(c.licenca.planoId, 'produtos', c.produtosAtivos)) return 'limite_plano';
  if (atual?.ajustesEstoque !== null && atual?.ajustesEstoque !== undefined && p.estoque !== atual.estoque) return 'estoque_desatualizado';
  if (atual?.estoque !== null && atual?.estoque !== undefined && (atual.ajustesEstoque !== null || p.ajustesEstoque !== undefined) && p.unidade !== atual.unidade) return 'unidade_estoque_invalida';
  if (p.estoque === null && ajustes.length) return 'movimento_estoque_invalido';
  const estoqueAtivo = p.estoqueAtivo ?? atual?.estoqueAtivo ?? null;
  if (!podeUsar(c.licenca.planoId, 'estoque') && (novosAjustes || (!velho && (
    p.estoque !== (atual?.estoque ?? null) || p.estoqueMinimo !== (atual?.estoqueMinimo ?? null) ||
    (estoqueAtivo ?? true) !== (atual?.estoqueAtivo ?? true))))) return 'recurso_plano';
  if (velho) {
    await c.tx.update(produtos).set({ ajustesEstoque: ajustes, versao: atual.versao + 1 }).where(eq(produtos.id, p.id));
    await registrarMudanca(c, 'produto', p.id);
    return null;
  }

  const campos = {
    nome: p.nome,
    ean: p.ean,
    precoCentavos: p.precoCentavos,
    unidade: p.unidade,
    estoque: p.estoque,
    estoqueMinimo: p.estoqueMinimo,
    ajustesEstoque: p.ajustesEstoque !== undefined || atual?.ajustesEstoque != null ? ajustes : null,
    estoqueAtivo,
    atalho: p.atalho,
    atualizadoEm,
    excluidoEm: p.excluidoEm === null ? null : new Date(p.excluidoEm),
  };
  if (atual) {
    await c.tx.update(produtos).set({ ...campos, versao: atual.versao + 1 }).where(eq(produtos.id, p.id));
  } else {
    await c.tx.insert(produtos).values({ id: p.id, lojaId: p.lojaId, ...campos, criadoEm: new Date(p.criadoEm), versao: 1 });
  }
  c.produtosAtivos += Number(vivoDepois) - Number(vivoAntes);
  await registrarMudanca(c, 'produto', p.id);
  return null;
}

async function excluirProduto(c: Contexto, id: string, criadaEm: string): Promise<Resultado> {
  const [atual] = await c.tx.select().from(produtos).where(eq(produtos.id, id));
  if (!atual || atual.lojaId !== c.sessao.lojaId) return 'nao_encontrado';
  const quando = noMaximoAgora(criadaEm, c.agora);
  if (quando < atual.atualizadoEm || atual.excluidoEm !== null) return null;

  await c.tx
    .update(produtos)
    .set({ excluidoEm: quando, atualizadoEm: quando, versao: atual.versao + 1 })
    .where(eq(produtos.id, id));
  c.produtosAtivos -= 1;
  await registrarMudanca(c, 'produto', id);
  return null;
}

// ---------- Venda ----------

/** Vendas são imutáveis: a única mudança aceita em uma venda existente é concluída -> cancelada. */
async function upsertVenda(c: Contexto, v: Venda): Promise<Resultado> {
  if (v.lojaId !== c.sessao.lojaId) return 'loja_invalida';
  const [atual] = await c.tx.select().from(vendas).where(eq(vendas.id, v.id));

  if (atual) {
    if (atual.lojaId !== v.lojaId) return 'loja_invalida';
    const salva = (await carregarVendas(c.tx, [v.id])).get(v.id);
    if (!salva || salva.entidade !== 'venda' || salva.operacao !== 'upsert') return 'venda_imutavel';
    const financeiro = (x: Venda) => [x.lojaId, x.aparelhoId, x.operadorId, x.caixaId ?? null, x.totalCentavos,
      x.itens.map(i => [i.id, i.produtoId, i.descricao, i.precoUnitarioCentavos, i.quantidadeMilesimos, i.totalCentavos]),
      x.pagamentos.map(p => [p.id, p.meio, p.provedor, p.valorCentavos, p.trocoCentavos])];
    if (JSON.stringify(financeiro(v)) !== JSON.stringify(financeiro(salva.dados))) return 'venda_imutavel';
    if (v.itens.some((i, n) => i.controlaEstoque !== undefined && i.controlaEstoque !== salva.dados.itens[n]?.controlaEstoque)) return 'venda_imutavel';
    if (atual.cancelamento && v.cancelamento && !eventoIgual(atual.cancelamento, v.cancelamento)) return 'venda_imutavel';
    if (v.status === atual.status) {
      if (!atual.cancelamento && v.cancelamento) return 'venda_imutavel';
      return null;
    }
    if (v.status !== 'cancelada') return 'venda_imutavel';
    if (v.cancelamento && v.cancelamento.operadorId !== c.sessao.operadorId) return 'origem_invalida';
    if (v.cancelamento && !eventoValido(v.cancelamento, atual.criadoEm, c.agora)) return 'cancelamento_invalido';
    const cancelamento = v.cancelamento ?? { id: randomUUID(), em: c.agora.toISOString(), operadorId: c.sessao.operadorId, motivo: 'Cancelamento solicitado pelo operador', estorno: 'nao_realizado' as const };
    await c.tx
      .update(vendas)
      .set({ status: 'cancelada', cancelamento, atualizadoEm: c.agora, versao: atual.versao + 1 })
      .where(eq(vendas.id, v.id));
    await registrarMudanca(c, 'venda', v.id);
    return null;
  }

  if (v.aparelhoId !== c.sessao.aparelhoId || v.operadorId !== c.sessao.operadorId) return 'origem_invalida';
  // Vale o momento da venda, não o de agora: venda feita offline enquanto o app permitia nunca se perde.
  const criadoEm = noMaximoAgora(v.criadaEm, c.agora);
  if (v.caixaId) {
    const [caixa] = await c.tx.select().from(caixas).where(eq(caixas.id, v.caixaId));
    const instanteVenda = new Date(v.criadaEm);
    if (!caixa || caixa.lojaId !== v.lojaId || caixa.aparelhoId !== v.aparelhoId || caixa.operadorId !== v.operadorId || instanteVenda < caixa.abertoEm || criadoEm < caixa.abertoEm || (caixa.fechadoEm && (instanteVenda > caixa.fechadoEm || criadoEm > caixa.fechadoEm))) return 'caixa_invalido';
  }
  if (v.status === 'concluida' && v.cancelamento) return 'venda_imutavel';
  if (v.cancelamento && v.cancelamento.operadorId !== c.sessao.operadorId) return 'origem_invalida';
  if (v.cancelamento && !eventoValido(v.cancelamento, criadoEm, c.agora)) return 'cancelamento_invalido';
  const cancelamento = v.status === 'cancelada' ? (v.cancelamento ?? { id: randomUUID(), em: c.agora.toISOString(), operadorId: c.sessao.operadorId, motivo: 'Cancelamento solicitado pelo operador', estorno: 'nao_realizado' as const }) : null;
  if (c.vendaPermitidaAte === null || criadoEm > c.vendaPermitidaAte) return 'assinatura_suspensa';
  // O app não deixa vender offline além da janela: criadaEm mais antigo que isso é retroação.
  if (criadoEm < adicionarDias(c.agora, -OFFLINE_MAX_DIAS)) return 'venda_fora_da_janela_offline';
  if (!vendaConsistente(v)) return 'venda_inconsistente';
  if (v.pagamentos.some(p => p.meio === 'tap' || p.provedor !== null)) return 'pagamento_indisponivel';
  const idsProdutos = [...new Set(v.itens.flatMap(i => i.produtoId ? [i.produtoId] : []))];
  const produtosDaVenda = idsProdutos.length ? await c.tx.select().from(produtos).where(inArray(produtos.id, idsProdutos)) : [];
  const porProduto = new Map(produtosDaVenda.map(p => [p.id, p]));
  if (produtosDaVenda.some(p => p.lojaId !== v.lojaId)) return 'loja_invalida';
  for (const i of v.itens) {
    const p = i.produtoId ? porProduto.get(i.produtoId) : undefined;
    if (i.controlaEstoque === true && (!p || p.estoque === null)) return 'produto_estoque_invalido';
  }
  await c.tx.insert(vendas).values({
    id: v.id,
    lojaId: v.lojaId,
    aparelhoId: v.aparelhoId,
    operadorId: v.operadorId,
    caixaId: v.caixaId ?? null,
    cancelamento,
    totalCentavos: v.totalCentavos,
    status: v.status,
    criadoEm,
    atualizadoEm: c.agora,
    versao: 1,
  });
  if (v.itens.length > 0) {
    await c.tx.insert(itensVenda).values(
      v.itens.map((item, posicao) => ({
        id: item.id,
        vendaId: v.id,
        lojaId: v.lojaId,
        posicao,
        produtoId: item.produtoId,
        descricao: item.descricao,
        precoUnitarioCentavos: item.precoUnitarioCentavos,
        quantidadeMilesimos: item.quantidadeMilesimos,
        controlaEstoque: item.controlaEstoque ?? (item.produtoId && porProduto.has(item.produtoId)
          ? controlaEstoque({ estoque: porProduto.get(item.produtoId)!.estoque, estoqueAtivo: porProduto.get(item.produtoId)!.estoqueAtivo ?? undefined }) : null),
        totalCentavos: item.totalCentavos,
        criadoEm,
      })),
    );
  }
  if (v.pagamentos.length > 0) {
    await c.tx.insert(pagamentosVenda).values(
      v.pagamentos.map((pagamento, posicao) => ({
        id: pagamento.id,
        vendaId: v.id,
        lojaId: v.lojaId,
        posicao,
        meio: pagamento.meio,
        provedor: pagamento.provedor,
        valorCentavos: pagamento.valorCentavos,
        trocoCentavos: pagamento.trocoCentavos,
        criadoEm,
      })),
    );
  }
  // A partir da primeira baixa a base fica fixa, inclusive para clientes antigos.
  for (const p of produtosDaVenda) {
    const marcada = v.itens.some(i => i.produtoId === p.id && (i.controlaEstoque ?? controlaEstoque({ estoque: p.estoque, estoqueAtivo: p.estoqueAtivo ?? undefined })));
    if (marcada && p.ajustesEstoque === null) {
      await c.tx.update(produtos).set({ ajustesEstoque: [], versao: p.versao + 1 }).where(eq(produtos.id, p.id));
      await registrarMudanca(c, 'produto', p.id);
    }
  }
  await registrarMudanca(c, 'venda', v.id);
  return null;
}

// ---------- Caixa ----------

async function upsertCaixa(c: Contexto, cx: Caixa): Promise<Resultado> {
  if (cx.lojaId !== c.sessao.lojaId) return 'loja_invalida';
  if (new Date(cx.abertura.em) > c.agora || (cx.fechamento && new Date(cx.fechamento.em) < new Date(cx.abertura.em))) return 'caixa_invalido';
  const [atual] = await c.tx.select().from(caixas).where(eq(caixas.id, cx.id));
  if (atual && atual.lojaId !== cx.lojaId) return 'loja_invalida';
  const origem = atual ?? c.sessao;
  if (cx.aparelhoId !== origem.aparelhoId || cx.operadorId !== origem.operadorId) return 'origem_invalida';
  if (atual && (atual.abertoEm.getTime() !== new Date(cx.abertura.em).getTime() || atual.trocoInicialCentavos !== cx.abertura.trocoInicialCentavos)) return 'caixa_imutavel';
  if (atual?.fechadoEm) {
    const salva = (await carregarCaixas(c.tx, [cx.id])).get(cx.id);
    if (salva?.entidade === 'caixa' && salva.operacao === 'upsert' && JSON.stringify(salva.dados) === JSON.stringify(cx)) return null;
    return 'caixa_fechada';
  }

  const ids = cx.movimentos.map((m) => m.id);
  if (new Set(ids).size !== ids.length) return 'movimento_invalido';
  const confirmados = ids.length ? await c.tx.select().from(movimentosCaixa).where(inArray(movimentosCaixa.id, ids)) : [];
  const porId = new Map(confirmados.map((m) => [m.id, m]));
  for (const m of cx.movimentos) {
    const anterior = porId.get(m.id);
    if (anterior && (anterior.caixaId !== cx.id || anterior.lojaId !== cx.lojaId || anterior.tipo !== m.tipo || anterior.valorCentavos !== m.valorCentavos || anterior.motivo !== m.motivo || anterior.criadoEm.getTime() !== new Date(m.criadoEm).getTime())) return 'movimento_invalido';
  }
  const novos = cx.movimentos.filter((m) => !porId.has(m.id));
  if (novos.length && !podeUsar(c.licenca.planoId, 'sangria_suprimento')) return 'recurso_plano';

  const campos = {
    aparelhoId: cx.aparelhoId,
    operadorId: cx.operadorId,
    abertoEm: new Date(cx.abertura.em),
    trocoInicialCentavos: cx.abertura.trocoInicialCentavos,
    fechadoEm: cx.fechamento ? new Date(cx.fechamento.em) : null,
    esperadoCentavos: cx.fechamento?.esperadoCentavos ?? null,
    contadoCentavos: cx.fechamento?.contadoCentavos ?? null,
    atualizadoEm: c.agora,
  };
  if (atual) {
    await c.tx.update(caixas).set({ ...campos, versao: atual.versao + 1 }).where(eq(caixas.id, cx.id));
  } else {
    await c.tx.insert(caixas).values({ id: cx.id, lojaId: cx.lojaId, ...campos, criadoEm: c.agora, versao: 1 });
  }
  // Movimentos só se acrescentam: reenvios do mesmo caixa não duplicam nem alteram os antigos.
  if (novos.length > 0) {
    const inseridos = await c.tx
      .insert(movimentosCaixa)
      .values(
        novos.map((m) => ({
          id: m.id,
          caixaId: cx.id,
          lojaId: cx.lojaId,
          tipo: m.tipo,
          valorCentavos: m.valorCentavos,
          motivo: m.motivo,
          criadoEm: new Date(m.criadoEm),
        })),
      )
      .onConflictDoNothing().returning({ id: movimentosCaixa.id });
    if (inseridos.length !== novos.length) throw new ErroApi(409, 'conflito_movimento', 'Movimento de caixa alterado durante a sincronização. Tente novamente.');
  }
  await registrarMudanca(c, 'caixa', cx.id);
  return null;
}

// ---------- Push ----------

async function aplicar(c: Contexto, m: Mutacao): Promise<Resultado> {
  if (c.papel !== 'dono') return 'permissao_negada';
  if (m.operacao === 'delete') {
    return m.entidade === 'produto' ? excluirProduto(c, m.dados.id, m.criadaEm) : 'exclusao_nao_permitida';
  }
  switch (m.entidade) {
    case 'produto':
      return upsertProduto(c, m.dados);
    case 'venda':
      return upsertVenda(c, m.dados);
    case 'caixa':
      return upsertCaixa(c, m.dados);
  }
}

/**
 * Aplica o lote numa transação por loja (lock advisory): os `seq` de uma loja
 * são gravados em ordem de commit, então nenhum pull enxerga um buraco que depois se preenche.
 */
export function aplicarPush(db: Db, sessaoId: string, sessao: SessaoAutenticada, req: SyncPushReq, relogio: Relogio): Promise<SyncPushRes> {
  return db.transaction(async (tx) => {
    const [conta] = await tx.select({ id: contas.id }).from(contas).where(eq(contas.id, sessao.contaId)).for('update');
    const [linha] = await tx.select({ id: sessoes.id }).from(sessoes).where(eq(sessoes.id, sessaoId)).for('update');
    if (!conta || !linha) throw new ErroApi(401, 'nao_autenticado', 'Sessão inválida. Entre novamente.');
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${sessao.lojaId}))`);
    const agora = relogio.agora();
    const papel = await revalidarSessaoSync(tx, sessaoId, sessao, agora);

    const { assinatura: salva } = await carregarAssinatura(tx, sessao.contaId, agora);
    const assinatura = avaliar(salva, agora);
    const licenca = licencaDe(assinatura, agora);
    const contexto: Contexto = {
      tx,
      sessao,
      papel,
      agora,
      licenca,
      vendaPermitidaAte: vendaPermitidaAte(assinatura, licenca),
      produtosAtivos: await tx.$count(produtos, and(eq(produtos.lojaId, sessao.lojaId), isNull(produtos.excluidoEm))),
    };

    const ids = req.mutacoes.map((m) => m.id);
    const jaAplicadas = new Set<string>(
      ids.length === 0
        ? []
        : (
            await tx
              .select({ id: mutacoesAplicadas.id })
              .from(mutacoesAplicadas)
              .where(and(eq(mutacoesAplicadas.lojaId, sessao.lojaId), inArray(mutacoesAplicadas.id, ids)))
          ).map((r) => r.id),
    );

    const aceitas: string[] = [];
    const rejeitadas: SyncPushRes['rejeitadas'] = [];
    const novas: (typeof mutacoesAplicadas.$inferInsert)[] = [];
    const resultados = new Map<number, Resultado>();
    const prioridade = { caixa: 0, produto: 1, venda: 2 };
    const ordem = req.mutacoes.map((m, i) => ({ m, i })).sort((a, b) => prioridade[a.m.entidade] - prioridade[b.m.entidade]);
    for (const { m, i } of ordem) {
      if (jaAplicadas.has(m.id)) {
        resultados.set(i, null);
        continue;
      }
      const motivo = await aplicar(contexto, m);
      if (motivo) {
        resultados.set(i, motivo);
        continue;
      }
      jaAplicadas.add(m.id);
      resultados.set(i, null);
      novas.push({ id: m.id, lojaId: sessao.lojaId, aparelhoId: req.aparelhoId, criadoEm: agora });
    }
    req.mutacoes.forEach((m, i) => {
      const motivo = resultados.get(i);
      if (motivo) rejeitadas.push({ id: m.id, motivo });
      else aceitas.push(m.id);
    });
    if (novas.length > 0) await tx.insert(mutacoesAplicadas).values(novas);

    return { aceitas, rejeitadas, cursor: String(await posicaoAtual(tx, sessao.lojaId)) };
  }, { isolationLevel: 'read committed' });
}

// ---------- Pull ----------

/**
 * Mudanças da loja depois de `desde`, em ordem de `seq`, no máximo `PULL_LIMITE`.
 * Cada entidade aparece uma vez, no estado atual (a última mudança vence). O cliente
 * repete a chamada com o cursor devolvido enquanto vierem `PULL_LIMITE` mudanças.
 */
export async function buscarMudancas(db: Db, lojaId: string, desde: number): Promise<SyncPullRes> {
  const ultimaSeq = max(mudancas.seq);
  const pagina = await db
    .select({ entidade: mudancas.entidade, id: mudancas.entidadeId, seq: ultimaSeq })
    .from(mudancas)
    .where(and(eq(mudancas.lojaId, lojaId), gt(mudancas.seq, desde)))
    .groupBy(mudancas.entidade, mudancas.entidadeId)
    .orderBy(asc(ultimaSeq))
    .limit(PULL_LIMITE);

  const idsDe = (entidade: EntidadeSync): string[] => pagina.filter((p) => p.entidade === entidade).map((p) => p.id);
  const [prods, vends, cxs] = await Promise.all([
    carregarProdutos(db, idsDe('produto')),
    carregarVendas(db, idsDe('venda')),
    carregarCaixas(db, idsDe('caixa')),
  ]);
  const porEntidade = { produto: prods, venda: vends, caixa: cxs };

  const lista: Mudanca[] = [];
  for (const { entidade, id } of pagina) {
    const mudanca = porEntidade[entidade].get(id);
    if (mudanca) lista.push(mudanca);
  }
  const ultima = pagina.at(-1);
  return { cursor: String(ultima?.seq ?? desde), mudancas: lista };
}

const iso = (d: Date): string => d.toISOString();

async function carregarProdutos(db: Db, ids: string[]): Promise<Map<string, Mudanca>> {
  const resultado = new Map<string, Mudanca>();
  if (ids.length === 0) return resultado;
  for (const p of await db.select().from(produtos).where(inArray(produtos.id, ids))) {
    resultado.set(
      p.id,
      p.excluidoEm
        ? { entidade: 'produto', operacao: 'delete', dados: { id: p.id } }
        : {
            entidade: 'produto',
            operacao: 'upsert',
            dados: {
              id: p.id,
              lojaId: p.lojaId,
              nome: p.nome,
              ean: p.ean,
              precoCentavos: p.precoCentavos,
              unidade: p.unidade,
              estoque: p.estoque,
              estoqueMinimo: p.estoqueMinimo,
              ...(p.ajustesEstoque !== null ? { ajustesEstoque: p.ajustesEstoque } : {}),
              ...(p.estoqueAtivo !== null ? { estoqueAtivo: p.estoqueAtivo } : {}),
              atalho: p.atalho,
              criadoEm: iso(p.criadoEm),
              atualizadoEm: iso(p.atualizadoEm),
              excluidoEm: null,
              versao: p.versao,
            },
          },
    );
  }
  return resultado;
}

async function carregarVendas(db: Db, ids: string[]): Promise<Map<string, Mudanca>> {
  const resultado = new Map<string, Mudanca>();
  if (ids.length === 0) return resultado;
  const [linhas, itens, pagamentos] = await Promise.all([
    db.select().from(vendas).where(inArray(vendas.id, ids)),
    db.select().from(itensVenda).where(inArray(itensVenda.vendaId, ids)).orderBy(asc(itensVenda.posicao)),
    db.select().from(pagamentosVenda).where(inArray(pagamentosVenda.vendaId, ids)).orderBy(asc(pagamentosVenda.posicao)),
  ]);
  for (const v of linhas) {
    resultado.set(v.id, {
      entidade: 'venda',
      operacao: 'upsert',
      dados: {
        id: v.id,
        lojaId: v.lojaId,
        aparelhoId: v.aparelhoId,
        operadorId: v.operadorId,
        ...(v.caixaId ? { caixaId: v.caixaId } : {}),
        ...(v.cancelamento ? { cancelamento: v.cancelamento } : {}),
        itens: itens
          .filter((i) => i.vendaId === v.id)
          .map((i) => ({
            id: i.id,
            produtoId: i.produtoId,
            descricao: i.descricao,
            precoUnitarioCentavos: i.precoUnitarioCentavos,
            quantidadeMilesimos: i.quantidadeMilesimos,
            ...(i.controlaEstoque !== null ? { controlaEstoque: i.controlaEstoque } : {}),
            totalCentavos: i.totalCentavos,
          })),
        pagamentos: pagamentos
          .filter((p) => p.vendaId === v.id)
          .map((p) => ({
            id: p.id,
            meio: p.meio,
            provedor: p.provedor,
            valorCentavos: p.valorCentavos,
            trocoCentavos: p.trocoCentavos,
          })),
        totalCentavos: v.totalCentavos,
        status: v.status,
        criadaEm: iso(v.criadoEm),
      },
    });
  }
  return resultado;
}

async function carregarCaixas(db: Db, ids: string[]): Promise<Map<string, Mudanca>> {
  const resultado = new Map<string, Mudanca>();
  if (ids.length === 0) return resultado;
  const [linhas, movimentos] = await Promise.all([
    db.select().from(caixas).where(inArray(caixas.id, ids)),
    db.select().from(movimentosCaixa).where(inArray(movimentosCaixa.caixaId, ids)).orderBy(asc(movimentosCaixa.criadoEm)),
  ]);
  for (const cx of linhas) {
    resultado.set(cx.id, {
      entidade: 'caixa',
      operacao: 'upsert',
      dados: {
        id: cx.id,
        lojaId: cx.lojaId,
        aparelhoId: cx.aparelhoId,
        operadorId: cx.operadorId,
        abertura: { em: iso(cx.abertoEm), trocoInicialCentavos: cx.trocoInicialCentavos },
        fechamento:
          cx.fechadoEm && cx.esperadoCentavos !== null && cx.contadoCentavos !== null
            ? { em: iso(cx.fechadoEm), esperadoCentavos: cx.esperadoCentavos, contadoCentavos: cx.contadoCentavos }
            : null,
        movimentos: movimentos
          .filter((m) => m.caixaId === cx.id)
          .map((m) => ({
            id: m.id,
            tipo: m.tipo,
            valorCentavos: m.valorCentavos,
            motivo: m.motivo,
            criadoEm: iso(m.criadoEm),
          })),
      },
    });
  }
  return resultado;
}
