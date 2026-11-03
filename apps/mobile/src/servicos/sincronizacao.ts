import { SyncPullResSchema, SyncPushResSchema, type Sessao } from '@pdv/shared';
import { Observavel } from '../dados/observavel';
import type { EntradaSync, RepositorioSync } from '../dados/syncTipos';
import { ErroBackend, type Backend } from './backend';

export interface EstadoSincronizacao {
  situacao: 'local' | 'sem_sessao' | 'ocioso' | 'sincronizando' | 'offline' | 'reautenticacao' | 'falha';
  pendentes: number;
  rejeitadas: number;
  ultimaSincronizacaoEm: string | null;
  mensagem: string | null;
}

export interface OpcoesSincronizacao {
  repositorio: RepositorioSync;
  backend: Backend;
  sessao: () => Sessao | null;
  vinculo: () => string | null;
  agora: () => Date;
  aplicarLocal: <T>(tarefa: () => Promise<T>) => Promise<T>;
  revalidar?: () => Promise<void>;
}

class ContextoAlterado extends Error {}

export class SincronizacaoServico extends Observavel<EstadoSincronizacao> {
  private voo: Promise<void> | null = null;

  constructor(private readonly op: OpcoesSincronizacao) {
    super({ situacao: op.backend.modo === 'demo' ? 'local' : 'sem_sessao', pendentes: 0, rejeitadas: 0, ultimaSincronizacaoEm: null, mensagem: null });
  }

  private contexto() {
    const sessao = this.op.sessao();
    const vinculo = this.op.vinculo();
    return { sessao, vinculo };
  }

  private conferir(ctx: ReturnType<SincronizacaoServico['contexto']>): void {
    const atual = this.contexto();
    const credencial = (s: Sessao | null) => s && [s.token, s.contaId, s.lojaId, s.operadorId, s.aparelhoId];
    if (atual.vinculo !== ctx.vinculo || JSON.stringify(credencial(atual.sessao)) !== JSON.stringify(credencial(ctx.sessao))) throw new ContextoAlterado();
  }

  async atualizarEstado(): Promise<void> {
    const ctx = this.contexto();
    const estado = await this.op.repositorio.estado();
    try { this.conferir(ctx); } catch { return; }
    const situacao = this.op.backend.modo === 'demo' ? 'local' : !ctx.sessao || !ctx.vinculo ? 'sem_sessao' : this.obter().situacao === 'sincronizando' ? 'sincronizando' : 'ocioso';
    this.definir({ ...this.obter(), situacao, pendentes: estado.entradas.filter(e => !e.bloqueada).length, rejeitadas: estado.entradas.filter(e => e.bloqueada).length, ultimaSincronizacaoEm: estado.ultimaSincronizacaoEm });
  }

  sincronizar(opcoes: { forcar?: boolean } = {}): Promise<void> {
    if (this.voo) return this.voo;
    const voo = this.executar(opcoes).finally(() => { if (this.voo === voo) this.voo = null; });
    this.voo = voo;
    return voo;
  }

  async retentarRejeitadas(): Promise<void> {
    const ctx = this.contexto();
    if (this.op.backend.modo !== 'http' || !ctx.sessao || !ctx.vinculo) return;
    await this.op.aplicarLocal(async () => { this.conferir(ctx); await this.op.repositorio.retentarRejeitadas(); });
    this.conferir(ctx);
    await this.atualizarEstado();
  }

  async exportar(): Promise<string> {
    const ctx = this.contexto();
    const arquivo = await this.op.repositorio.exportar();
    this.conferir(ctx);
    return arquivo;
  }

  private async executar(opcoes: { forcar?: boolean }): Promise<void> {
    const ctx = this.contexto();
    if (this.op.backend.modo === 'demo' || !ctx.sessao || !ctx.vinculo) { await this.atualizarEstado(); return; }
    const sessao = ctx.sessao;
    let enviadas: EntradaSync[] = [];
    let pendenciasEmEspera = false;
    try {
      if (!this.op.backend.enviarMutacoes || !this.op.backend.receberMudancas) throw new Error('Sincronização indisponível.');
      this.conferir(ctx);
      this.definir({ ...this.obter(), situacao: 'sincronizando', mensagem: null });
      await this.op.revalidar?.();
      // Permissões podem ter mudado na revalidação; a credencial e o vínculo permanecem.
      this.conferir(ctx);
      await this.op.aplicarLocal(async () => { this.conferir(ctx); await this.op.repositorio.preparar(); });
      this.conferir(ctx);
      while (true) {
        const estado = await this.op.repositorio.estado();
        this.conferir(ctx);
        const vistas = new Set<string>();
        const elegiveis = estado.entradas.filter(e => {
          const chave = `${e.mutacao.entidade}:${e.mutacao.dados.id}`;
          if (vistas.has(chave)) return false;
          vistas.add(chave);
          const m = e.mutacao;
          if (m.entidade === 'caixa' && m.operacao === 'upsert' && m.dados.versaoContrato === 2 && m.dados.fechamento && estado.entradas.some(x => x.mutacao.entidade === 'venda' && x.mutacao.operacao === 'upsert' && x.mutacao.dados.caixaId === m.dados.id)) return false;
          return !e.bloqueada && (opcoes.forcar || !e.proximaTentativaEm || Date.parse(e.proximaTentativaEm) <= this.op.agora().getTime());
        });
        const prioridade = (e: EntradaSync) => e.mutacao.entidade === 'produto' ? 0 : e.mutacao.entidade === 'caixa' && e.mutacao.operacao === 'upsert' && e.mutacao.dados.versaoContrato !== 2 ? 1 : e.mutacao.entidade === 'venda' ? 2 : 3;
        enviadas = elegiveis.sort((a, b) => prioridade(a) - prioridade(b)).slice(0, 100);
        if (!enviadas.length) {
          pendenciasEmEspera = estado.entradas.some(e => !e.bloqueada);
          break;
        }
        const resposta = SyncPushResSchema.parse(await this.op.backend.enviarMutacoes({ aparelhoId: sessao.aparelhoId, mutacoes: enviadas.map(e => e.mutacao) }, sessao.token));
        this.conferir(ctx);
        const ids = new Set(enviadas.map(e => e.mutacao.id));
        const recebidos = [...resposta.aceitas, ...resposta.rejeitadas.map(r => r.id)];
        if (recebidos.length !== ids.size || new Set(recebidos).size !== ids.size || recebidos.some(id => !ids.has(id))) throw new Error('ACK inválido.');
        await this.op.aplicarLocal(async () => {
          this.conferir(ctx);
          if (resposta.aceitas.length) await this.op.repositorio.confirmar(resposta.aceitas);
          this.conferir(ctx);
          if (resposta.rejeitadas.length) await this.op.repositorio.rejeitar(resposta.rejeitadas);
        });
        this.conferir(ctx);
        enviadas = [];
      }
      let cursor = (await this.op.repositorio.estado()).cursor;
      this.conferir(ctx);
      while (true) {
        if (!/^\d+$/.test(cursor)) throw new Error('Cursor inválido.');
        const pagina = SyncPullResSchema.parse(await this.op.backend.receberMudancas(cursor, sessao.token));
        this.conferir(ctx);
        if (!/^\d+$/.test(pagina.cursor) || BigInt(pagina.cursor) < BigInt(cursor) || (pagina.mudancas.length > 0 && BigInt(pagina.cursor) <= BigInt(cursor))) throw new Error('Cursor sem progresso.');
        await this.op.aplicarLocal(async () => { this.conferir(ctx); await this.op.repositorio.aplicarPagina(pagina); });
        this.conferir(ctx);
        cursor = pagina.cursor;
        if (pagina.mudancas.length < 500) break;
      }
      const restantes = (await this.op.repositorio.estado()).entradas;
      if (!pendenciasEmEspera && !restantes.length) await this.op.aplicarLocal(async () => { this.conferir(ctx); await this.op.repositorio.finalizar(this.op.agora().toISOString()); });
      this.conferir(ctx);
      await this.atualizarEstado();
      this.conferir(ctx);
      this.definir({ ...this.obter(), situacao: 'ocioso', mensagem: null });
    } catch (erro) {
      if (erro instanceof ContextoAlterado) return;
      if (erro instanceof ErroBackend && erro.codigo === 'nao_autorizado' && this.op.vinculo() === ctx.vinculo && !this.op.sessao()) {
        await this.atualizarEstado();
        this.definir({ ...this.obter(), situacao: 'reautenticacao', mensagem: 'Entre novamente neste perfil. As operações foram preservadas.' });
        return;
      }
      try { this.conferir(ctx); } catch { return; }
      const auth = erro instanceof ErroBackend && erro.codigo === 'nao_autorizado';
      const rede = erro instanceof ErroBackend && erro.codigo === 'rede';
      if (!auth && enviadas.length) {
        try {
          await this.op.aplicarLocal(async () => {
            this.conferir(ctx);
            for (const entrada of enviadas) {
              const espera = [1000, 5000, 30000, 60000][Math.min(entrada.tentativas, 3)] ?? 60000;
              await this.op.repositorio.adiar([entrada.mutacao.id], 'Sem conexão com o servidor.', new Date(this.op.agora().getTime() + espera).toISOString());
            }
          });
        } catch (e) { if (e instanceof ContextoAlterado) return; }
      }
      try { this.conferir(ctx); await this.atualizarEstado(); this.conferir(ctx); } catch { return; }
      this.definir({ ...this.obter(), situacao: auth ? 'reautenticacao' : rede ? 'offline' : 'falha', mensagem: auth ? 'Entre novamente para sincronizar.' : rede ? 'Sem conexão com o servidor.' : 'Não foi possível sincronizar.' });
    }
  }
}
