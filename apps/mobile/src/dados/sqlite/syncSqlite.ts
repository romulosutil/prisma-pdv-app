import { MutacaoSchema, type SyncPullRes } from '@pdv/shared';
import { confirmarEnvelope, paginaEnvelope, prepararEnvelope, validarEnvelope, vazioSync, visibilidadeEnvelope, type EnvelopeSync } from '../syncAplicacao';
import type { EstadoRepositorioSync, RepositorioSync } from '../syncTipos';
import { escreverFinanceiro, lerFinanceiro, lojaLocal, type ParticaoLocal } from './financeiro';
import type { ArmazenamentoSqlite } from './armazenamentoSqlite';

export class RepositorioSyncSqlite implements RepositorioSync {
  constructor(private readonly armazenamento: ArmazenamentoSqlite, private readonly novoId: () => string, private readonly agora: () => Date) {}
  private async executar<T>(f: (e: EnvelopeSync, p: ParticaoLocal) => T): Promise<T> {
    let resultado!: T;
    await this.armazenamento.transacao(async (tx, p) => {
      const metaChave = JSON.stringify(['sync_v2', p.contaId, lojaLocal(p)]);
      const meta = await tx.getFirstAsync<{ valor_json: string }>('SELECT valor_json FROM estado_local WHERE chave = ?', metaChave);
      const e = vazioSync();
      if (meta) {
        const valor: unknown = JSON.parse(meta.valor_json);
        if (!valor || typeof valor !== 'object' || Array.isArray(valor) || !['entradas', 'cursor', 'ultimaSincronizacaoEm', 'diferidos', 'confirmados', 'preparado'].every((k) => Object.prototype.hasOwnProperty.call(valor, k))) throw new Error('Metadados de sincronização inválidos. Preserve os dados.');
        Object.assign(e, valor);
      }
      for (const c of ['produtos', 'caixas', 'vendas'] as const) (e.agregados as any)[c] = await lerFinanceiro(tx, c, p);
      const antes = JSON.stringify(e.agregados);
      if (meta) validarEnvelope(e, p);
      const linhas = await tx.getAllAsync<{ id: string; payload_json: string }>('SELECT id, payload_json FROM outbox WHERE conta_id = ? AND loja_id = ? ORDER BY sequencia', p.contaId, lojaLocal(p));
      const metadados = new Map(e.entradas.map((x) => [x.mutacao.id, x]));
      e.entradas = linhas.map((l) => { const mutacao = MutacaoSchema.parse(JSON.parse(l.payload_json)); if (mutacao.id !== l.id) throw new Error('Outbox inválida.'); return { tentativas: 0, proximaTentativaEm: null, motivo: null, bloqueada: false, ...metadados.get(l.id), mutacao }; });
      validarEnvelope(e, p);
      resultado = f(e, p);
      validarEnvelope(e, p);
      if (JSON.stringify(e.agregados) !== antes) {
        // Páginas e redução de visibilidade podem retirar pai/filhos no mesmo commit.
        await tx.execAsync('PRAGMA defer_foreign_keys = ON');
        for (const c of ['produtos', 'caixas', 'vendas'] as const) await escreverFinanceiro(tx, c, e.agregados[c], p, true);
      }
      const ids = new Set(e.entradas.map((x) => x.mutacao.id));
      for (const linha of linhas) if (!ids.has(linha.id)) await tx.runAsync('DELETE FROM outbox WHERE conta_id = ? AND loja_id = ? AND id = ?', p.contaId, lojaLocal(p), linha.id);
      const existentes = new Set(linhas.map((l) => l.id));
      for (const entrada of e.entradas) if (!existentes.has(entrada.mutacao.id)) await tx.runAsync('INSERT INTO outbox (conta_id, loja_id, id, payload_json) VALUES (?, ?, ?, ?)', p.contaId, lojaLocal(p), entrada.mutacao.id, JSON.stringify(entrada.mutacao));
      const { agregados: _agregados, ...metadata } = e;
      await tx.runAsync('INSERT INTO estado_local VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor_json = excluded.valor_json', metaChave, JSON.stringify(metadata));
    });
    return resultado;
  }
  preparar(): Promise<void> { return this.executar((e) => prepararEnvelope(e, this.novoId, this.agora)); }
  async estado(): Promise<EstadoRepositorioSync> {
    const conta = await this.armazenamento.obter<{ identidade?: unknown; sessao?: unknown }>('conta');
    if (!conta?.identidade && !conta?.sessao) return { entradas: [], cursor: '0', ultimaSincronizacaoEm: null };
    return this.executar((e) => ({ entradas: e.entradas, cursor: e.cursor, ultimaSincronizacaoEm: e.ultimaSincronizacaoEm }));
  }
  confirmar(ids: readonly string[]): Promise<void> { return this.executar((e) => confirmarEnvelope(e, ids)); }
  adiar(ids: readonly string[], motivo: string, proximaTentativaEm: string): Promise<void> { return this.executar((e) => { for (const x of e.entradas) if (ids.includes(x.mutacao.id)) { x.tentativas++; x.motivo = motivo; x.proximaTentativaEm = proximaTentativaEm; } }); }
  rejeitar(rejeitadas: readonly { id: string; motivo: string }[]): Promise<void> { return this.executar((e) => { for (const x of e.entradas) { const r = rejeitadas.find((r) => r.id === x.mutacao.id); if (r) { x.tentativas++; x.motivo = r.motivo; x.bloqueada = true; x.proximaTentativaEm = null; } } }); }
  aplicarPagina(p: SyncPullRes): Promise<void> { return this.executar((e, particao) => paginaEnvelope(e, p, particao)); }
  finalizar(em: string): Promise<void> { return this.executar((e) => { e.ultimaSincronizacaoEm = em; }); }
  atualizarVisibilidade(operadorId: string | null): Promise<void> { return this.executar(e => visibilidadeEnvelope(e, operadorId)); }
  retentarRejeitadas(): Promise<void> { return this.executar((e) => { for (const x of e.entradas) if (x.bloqueada) { x.bloqueada = false; x.motivo = null; x.tentativas = 0; x.proximaTentativaEm = null; } }); }
  exportar(): Promise<string> { return this.executar((e) => JSON.stringify({ entradas: e.entradas, cursor: e.cursor, ultimaSincronizacaoEm: e.ultimaSincronizacaoEm })); }
}
