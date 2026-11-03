import type { SyncPullRes } from '@pdv/shared';
import type { Armazenamento } from './armazenamento';
import { ArmazenamentoEscopo } from './armazenamentoEscopo';
import { escopoDoPerfil, perfilFinanceiro, type IdentidadeLocal } from './estadoConta';
import { alterar, confirmarEnvelope, paginaEnvelope, prepararEnvelope, validarEnvelope, vazioSync, visibilidadeEnvelope, type EnvelopeSync } from './syncAplicacao';
import type { EstadoRepositorioSync, RepositorioSync } from './syncTipos';
import { ehFinanceira, type ParticaoLocal } from './sqlite/financeiro';

export class ArmazenamentoSyncNavegador implements Armazenamento, RepositorioSync {
  private fila: Promise<void> = Promise.resolve();
  constructor(private readonly base: Armazenamento, private readonly identidade: () => IdentidadeLocal | null, private readonly novoId: () => string, private readonly agora: () => Date) {}
  obterEscopo = (): string | null => { const i = this.identidade(); return i ? escopoDoPerfil(i) : null; };
  retirarCredencial(token: string): Promise<void> { return this.base.retirarCredencial?.(token) ?? Promise.resolve(); }
  private executar<T>(f: (e: EnvelopeSync, p: ParticaoLocal) => T, gravar = true): Promise<T> {
    const escopo = this.obterEscopo();
    const trabalho = this.fila.then(async () => {
      if (!escopo || escopo !== this.obterEscopo()) throw new Error('Conta alterada ou ausente.');
      const [contaId, lojaId] = JSON.parse(escopo) as [string, string];
      const p = { contaId, lojaId, perfilId: this.identidade() ? perfilFinanceiro(this.identidade()!) : undefined }; const endereco = 'sync_v1:' + escopo;
      let e = await this.base.obter<EnvelopeSync>(endereco);
      if (e === null) {
        e = vazioSync();
        const legado = new ArmazenamentoEscopo(this.base, this.identidade, false);
        for (const c of ['produtos', 'caixas', 'vendas'] as const) {
          const valor = await legado.obter(c);
          if (valor !== null) (e.agregados as any)[c] = valor;
        }
      }
      e = JSON.parse(JSON.stringify(e)) as EnvelopeSync;
      validarEnvelope(e, p);
      const resultado = f(e, p);
      validarEnvelope(e, p);
      if (escopo !== this.obterEscopo()) throw new Error('Conta alterada durante a operação.');
      if (gravar) await this.base.gravar(endereco, e);
      return resultado;
    });
    this.fila = trabalho.then(() => undefined, () => undefined);
    return trabalho;
  }
  obter<T>(c: string): Promise<T | null> { return ehFinanceira(c) ? (!this.obterEscopo() ? Promise.resolve(null) : this.executar((e) => e.agregados[c] as T, false)) : this.base.obter(c); }
  gravar<T>(c: string, v: T): Promise<void> { return ehFinanceira(c) ? this.executar((e, p) => alterar(e, c, v, p, this.novoId, this.agora)) : this.base.gravar(c, v); }
  remover(c: string): Promise<void> { return ehFinanceira(c) ? this.gravar(c, c === 'vendas' ? { vendas: [], numeroBase: 0 } : []) : this.base.remover(c); }
  limpar(): Promise<void> { return this.base.limpar(); }
  preparar(): Promise<void> { return this.executar((e) => prepararEnvelope(e, this.novoId, this.agora)); }
  estado(): Promise<EstadoRepositorioSync> { return !this.obterEscopo() ? Promise.resolve({ entradas: [], cursor: '0', ultimaSincronizacaoEm: null }) : this.executar((e) => ({ entradas: e.entradas, cursor: e.cursor, ultimaSincronizacaoEm: e.ultimaSincronizacaoEm }), false); }
  confirmar(ids: readonly string[]): Promise<void> { return this.executar((e) => confirmarEnvelope(e, ids)); }
  adiar(ids: readonly string[], motivo: string, proximaTentativaEm: string): Promise<void> { return this.executar((e) => { for (const x of e.entradas) if (ids.includes(x.mutacao.id)) { x.tentativas++; x.motivo = motivo; x.proximaTentativaEm = proximaTentativaEm; } }); }
  rejeitar(rejeitadas: readonly { id: string; motivo: string }[]): Promise<void> { return this.executar((e) => { for (const x of e.entradas) { const r = rejeitadas.find((r) => r.id === x.mutacao.id); if (r) { x.tentativas++; x.motivo = r.motivo; x.bloqueada = true; x.proximaTentativaEm = null; } } }); }
  aplicarPagina(p: SyncPullRes): Promise<void> { return this.executar((e, particao) => paginaEnvelope(e, p, particao)); }
  finalizar(em: string): Promise<void> { return this.executar((e) => { e.ultimaSincronizacaoEm = em; }); }
  atualizarVisibilidade(operadorId: string | null): Promise<void> { return this.executar(e => visibilidadeEnvelope(e, operadorId)); }
  retentarRejeitadas(): Promise<void> { return this.executar((e) => { for (const x of e.entradas) if (x.bloqueada) { x.bloqueada = false; x.motivo = null; x.tentativas = 0; x.proximaTentativaEm = null; } }); }
  exportar(): Promise<string> { return this.executar((e) => JSON.stringify({ entradas: e.entradas, cursor: e.cursor, ultimaSincronizacaoEm: e.ultimaSincronizacaoEm }), false); }
}
