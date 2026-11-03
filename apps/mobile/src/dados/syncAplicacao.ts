import { MutacaoSchema, SyncPullResSchema, type Mudanca, type Mutacao, type SyncPullRes } from '@pdv/shared';
import type { EntradaSync, EstadoRepositorioSync } from './syncTipos';
import { validarFinanceiro, type ChaveFinanceira, type ParticaoLocal } from './sqlite/financeiro';
import { z } from 'zod';

type Agregados = { produtos: unknown[]; caixas: unknown[]; vendas: { vendas: unknown[]; numeroBase: number } };
export interface EnvelopeSync extends EstadoRepositorioSync { agregados: Agregados; diferidos: Mudanca[]; confirmados: string[]; preparado: boolean }
export const vazioSync = (): EnvelopeSync => ({ agregados: { produtos: [], caixas: [], vendas: { vendas: [], numeroBase: 0 } }, entradas: [], cursor: '0', ultimaSincronizacaoEm: null, diferidos: [], confirmados: [], preparado: false });
export function visibilidadeEnvelope(e: EnvelopeSync, operadorId: string | null): void {
  if (operadorId) {
    e.agregados.caixas = e.agregados.caixas.filter((c: any) => c.operadorId === operadorId);
    e.agregados.vendas.vendas = e.agregados.vendas.vendas.filter((v: any) => v.operadorId === operadorId);
    e.diferidos = e.diferidos.filter(m => m.entidade === 'produto' || (m.operacao === 'upsert' && m.dados.operadorId === operadorId));
  }
  // Preserva outbox, IDs e conteúdo rejeitável. Remoção de cache não gera delete remoto.
  e.cursor = '0';
  e.ultimaSincronizacaoEm = null;
}
const chave = (entidade: string): ChaveFinanceira => entidade === 'produto' ? 'produtos' : entidade === 'caixa' ? 'caixas' : 'vendas';
const lista = (e: EnvelopeSync, c: ChaveFinanceira): any[] => c === 'vendas' ? e.agregados.vendas.vendas : e.agregados[c];
const identidade = (m: Mudanca) => m.entidade + ':' + m.dados.id;
const registro = (m: Mutacao): EntradaSync => ({ mutacao: m, tentativas: 0, proximaTentativaEm: null, motivo: null, bloqueada: false });
export function validarEnvelope(e: EnvelopeSync, p: ParticaoLocal): void {
  const data = z.iso.datetime();
  const entrada = z.object({ mutacao: MutacaoSchema, tentativas: z.number().int().nonnegative(), proximaTentativaEm: data.nullable(), motivo: z.string().nullable(), bloqueada: z.boolean() });
  const estrutura = z.object({ agregados: z.object({ produtos: z.array(z.unknown()), caixas: z.array(z.unknown()), vendas: z.object({ vendas: z.array(z.unknown()), numeroBase: z.number().int().nonnegative() }) }), entradas: z.array(entrada), cursor: z.string().regex(/^\d+$/), ultimaSincronizacaoEm: data.nullable(), diferidos: z.array(z.unknown()), confirmados: z.array(z.string().regex(/^(produto|venda|caixa):[0-9a-f-]{36}$/i)), preparado: z.boolean() });
  if (!estrutura.safeParse(e).success) throw new Error('Envelope de sincronização inválido. Preserve os dados.');
  for (const c of ['produtos', 'caixas', 'vendas'] as const) validarFinanceiro(c, e.agregados[c], p);
  for (const entrada of e.entradas) { const m = MutacaoSchema.parse(entrada.mutacao); if (m.operacao === 'upsert' && m.dados.lojaId !== p.lojaId) throw new Error('Partição inválida.'); }
  if (new Set(e.entradas.map((x) => x.mutacao.id)).size !== e.entradas.length || new Set(e.confirmados).size !== e.confirmados.length) throw new Error('IDs de sincronização duplicados.');
  const diferidos = SyncPullResSchema.parse({ cursor: e.cursor, mudancas: e.diferidos }).mudancas;
  if (diferidos.some((m) => m.operacao === 'upsert' && m.dados.lojaId !== p.lojaId) || new Set(diferidos.map(identidade)).size !== diferidos.length) throw new Error('Alterações remotas inválidas.');
}
export function alterar(e: EnvelopeSync, c: ChaveFinanceira, valor: unknown, p: ParticaoLocal, novoId: () => string, agora: () => Date): void {
  const dados = validarFinanceiro(c, valor, p) as any;
  const antes = lista(e, c); const depois: any[] = c === 'vendas' ? dados.vendas : dados;
  const entidade = c === 'produtos' ? 'produto' : c === 'caixas' ? 'caixa' : 'venda';
  for (const item of depois) if (JSON.stringify(antes.find((a) => a.id === item.id)) !== JSON.stringify(item)) {
    const anterior = antes.find((a) => a.id === item.id);
    const cancelamento = c === 'vendas' && item.cancelamento && !anterior?.cancelamento ? item.cancelamento : null;
    const m = MutacaoSchema.parse({ id: cancelamento?.id ?? novoId(), criadaEm: cancelamento?.em ?? agora().toISOString(), entidade, operacao: 'upsert', dados: item });
    e.entradas.push(registro(m));
  }
  for (const item of antes) if (!depois.some((a) => a.id === item.id)) e.entradas.push(registro(MutacaoSchema.parse({ id: novoId(), criadaEm: agora().toISOString(), entidade, operacao: 'delete', dados: { id: item.id } })));
  (e.agregados as any)[c] = dados;
}
export function prepararEnvelope(e: EnvelopeSync, novoId: () => string, agora: () => Date): void {
  for (const c of ['produtos', 'caixas', 'vendas'] as const) for (const item of lista(e, c)) {
    const entidade = c === 'produtos' ? 'produto' : c === 'caixas' ? 'caixa' : 'venda';
    const k = entidade + ':' + item.id;
    if (!e.confirmados.includes(k) && !e.entradas.some((x) => identidade(x.mutacao) === k)) e.entradas.push(registro(MutacaoSchema.parse({ id: novoId(), criadaEm: agora().toISOString(), entidade, operacao: 'upsert', dados: item })));
  }
  e.preparado = true;
}
function aplicar(e: EnvelopeSync, m: Mudanca): void {
  const c = chave(m.entidade); const itens = lista(e, c); const i = itens.findIndex((x) => x.id === m.dados.id);
  if (m.operacao === 'delete') { if (i >= 0) itens.splice(i, 1); }
  else if (i >= 0) itens[i] = m.dados; else itens.push(m.dados);
}
export function paginaEnvelope(e: EnvelopeSync, pagina: SyncPullRes, p: ParticaoLocal): void {
  const paginaValidada = SyncPullResSchema.parse(pagina);
  if (!/^\d+$/.test(paginaValidada.cursor) || BigInt(paginaValidada.cursor) < BigInt(e.cursor)) throw new Error('Cursor regressivo ou inválido.');
  for (const m of paginaValidada.mudancas) {
    if (m.operacao === 'upsert' && m.dados.lojaId !== p.lojaId) throw new Error('Partição remota inválida.');
    const k = identidade(m);
    if (e.entradas.some((x) => identidade(x.mutacao) === k)) { e.diferidos = e.diferidos.filter((d) => identidade(d) !== k); e.diferidos.push(m); }
    else { aplicar(e, m); if (!e.confirmados.includes(k)) e.confirmados.push(k); }
  }
  e.cursor = paginaValidada.cursor;
}
export function confirmarEnvelope(e: EnvelopeSync, ids: readonly string[]): void {
  const removidos = e.entradas.filter((x) => ids.includes(x.mutacao.id));
  e.entradas = e.entradas.filter((x) => !ids.includes(x.mutacao.id));
  for (const x of removidos) { const k = identidade(x.mutacao); if (!e.confirmados.includes(k)) e.confirmados.push(k); }
  const aplicarAgora = e.diferidos.filter((d) => !e.entradas.some((x) => identidade(x.mutacao) === identidade(d)));
  for (const m of aplicarAgora) aplicar(e, m);
  e.diferidos = e.diferidos.filter((d) => !aplicarAgora.includes(d));
}
