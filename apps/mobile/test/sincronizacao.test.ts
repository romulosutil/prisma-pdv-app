import { describe, expect, it, vi } from 'vitest';
import type { Sessao, SyncPullRes, SyncPushReq, SyncPushRes } from '@pdv/shared';
import type { EntradaSync, RepositorioSync } from '../src/dados/syncTipos';
import type { Backend } from '../src/servicos/backend';
import { ErroBackend } from '../src/servicos/backend';
import { SincronizacaoServico } from '../src/servicos/sincronizacao';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const agora = '2026-10-30T12:00:00.000Z';
const sessao: Sessao = { token: 'token', contaId: id(1), lojaId: id(2), operadorId: id(3), aparelhoId: id(4) };
const entrada = (n: number): EntradaSync => ({ mutacao: { id: id(n), entidade: 'produto', operacao: 'delete', dados: { id: id(n + 100) }, criadaEm: agora }, tentativas: 0, proximaTentativaEm: null, motivo: null, bloqueada: false });

function montar(iniciais: EntradaSync[] = [entrada(10)]) {
  const estado = { entradas: iniciais, cursor: '0', ultimaSincronizacaoEm: null as string | null };
  const repo: RepositorioSync = {
    preparar: vi.fn(async () => {}), estado: vi.fn(async () => estado),
    confirmar: vi.fn(async ids => { estado.entradas = estado.entradas.filter(e => !ids.includes(e.mutacao.id)); }),
    adiar: vi.fn(async (ids, motivo, proximaTentativaEm) => { estado.entradas = estado.entradas.map(e => ids.includes(e.mutacao.id) ? { ...e, motivo, proximaTentativaEm, tentativas: e.tentativas + 1 } : e); }),
    rejeitar: vi.fn(async (rejeitadas: readonly { id: string; motivo: string }[]) => { estado.entradas = estado.entradas.map(e => { const r = rejeitadas.find(x => x.id === e.mutacao.id); return r ? { ...e, bloqueada: true, motivo: r.motivo } : e; }); }),
    aplicarPagina: vi.fn(async pagina => { estado.cursor = pagina.cursor; }), finalizar: vi.fn(async em => { estado.ultimaSincronizacaoEm = em; }),
    retentarRejeitadas: vi.fn(async () => {}), exportar: vi.fn(async () => JSON.stringify(estado)),
  };
  const enviar = vi.fn(async (req: SyncPushReq, _token?: string): Promise<SyncPushRes> => ({ aceitas: req.mutacoes.map(m => m.id), rejeitadas: [], cursor: '999' }));
  const receber = vi.fn(async (_desde: string, _token?: string): Promise<SyncPullRes> => ({ cursor: '0', mudancas: [] }));
  const backend = { modo: 'http', enviarMutacoes: enviar, receberMudancas: receber } as unknown as Backend;
  let atual: Sessao | null = sessao;
  const motor = new SincronizacaoServico({ repositorio: repo, backend, sessao: () => atual, vinculo: () => 'loja', agora: () => new Date(agora), aplicarLocal: async tarefa => tarefa() });
  return { motor, repo, estado, enviar, receber, backend, mudar: (s: Sessao | null) => { atual = s; } };
}

describe('sincronização', () => {
  it('mantém ID após resposta perdida e respeita backoff até retry forçado', async () => {
    const t = montar();
    t.enviar.mockRejectedValueOnce(new ErroBackend('rede', 'offline'));
    await t.motor.sincronizar();
    expect(t.estado.entradas[0]?.mutacao.id).toBe(id(10));
    expect(t.estado.entradas[0]?.proximaTentativaEm).toBe('2026-10-30T12:00:01.000Z');
    await t.motor.sincronizar();
    expect(t.enviar).toHaveBeenCalledTimes(1);
    await t.motor.sincronizar({ forcar: true });
    expect(t.enviar.mock.calls[1]?.[0].mutacoes[0]?.id).toBe(id(10));
  });

  it('não confirma ACK parcial, desconhecido ou duplicado', async () => {
    for (const aceitas of [[], [id(99)], [id(10), id(10)]]) {
      const t = montar();
      t.enviar.mockResolvedValueOnce({ aceitas, rejeitadas: [], cursor: '1' });
      await t.motor.sincronizar();
      expect(t.repo.confirmar).not.toHaveBeenCalled();
      expect(t.estado.entradas).toHaveLength(1);
    }
  });

  it('rejeita individualmente e confirma vizinho', async () => {
    const t = montar([entrada(10), entrada(11)]);
    t.enviar.mockResolvedValueOnce({ aceitas: [id(11)], rejeitadas: [{ id: id(10), motivo: 'venda antiga' }], cursor: '40' });
    await t.motor.sincronizar();
    expect(t.estado.entradas[0]?.motivo).toBe('venda antiga');
    expect(t.receber).toHaveBeenCalledWith('0', 'token');
  });

  it('descarta resposta de credencial anterior e compartilha voo', async () => {
    const t = montar();
    let resolver!: (v: { aceitas: string[]; rejeitadas: never[]; cursor: string }) => void;
    t.enviar.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
    const a = t.motor.sincronizar();
    const b = t.motor.sincronizar();
    expect(a).toBe(b);
    await vi.waitFor(() => expect(t.enviar).toHaveBeenCalled());
    t.mudar({ ...sessao, token: 'novo' });
    resolver({ aceitas: [id(10)], rejeitadas: [], cursor: '1' });
    await a;
    expect(t.repo.confirmar).not.toHaveBeenCalled();
  });

  it('não prepara bootstrap após troca de conta enquanto aguarda a fila local', async () => {
    const t = montar();
    let liberar!: () => void;
    const fila = new Promise<void>(resolve => { liberar = resolve; });
    let atual: Sessao | null = sessao;
    const motor = new SincronizacaoServico({ repositorio: t.repo, backend: t.backend, sessao: () => atual, vinculo: () => 'loja', agora: () => new Date(agora), aplicarLocal: async tarefa => { await fila; return tarefa(); } });
    const execucao = motor.sincronizar();
    atual = { ...sessao, token: 'novo' };
    liberar();
    await execucao;
    expect(t.repo.preparar).not.toHaveBeenCalled();
    expect(t.enviar).not.toHaveBeenCalled();
  });

  it('demo não acessa rede nem confirma', async () => {
    const t = montar();
    Object.assign(t.backend, { modo: 'demo' });
    await t.motor.sincronizar();
    expect(t.enviar).not.toHaveBeenCalled();
    expect(t.repo.confirmar).not.toHaveBeenCalled();
    expect(t.motor.obter().situacao).toBe('local');
  });

  it('percorre páginas de 500 e ignora cursor do push', async () => {
    const t = montar();
    const mudanca = { entidade: 'produto' as const, operacao: 'delete' as const, dados: { id: id(12) } };
    t.receber.mockResolvedValueOnce({ cursor: '500', mudancas: Array(500).fill(mudanca) }).mockResolvedValueOnce({ cursor: '501', mudancas: [mudanca] });
    await t.motor.sincronizar();
    expect(t.receber.mock.calls.map(c => c[0])).toEqual(['0', '500']);
    expect(t.estado.cursor).toBe('501');
  });

  it('falha ao aplicar página sem finalizar ciclo', async () => {
    const t = montar([]);
    vi.mocked(t.repo.aplicarPagina).mockRejectedValueOnce(new Error('disco'));
    await t.motor.sincronizar();
    expect(t.estado.cursor).toBe('0');
    expect(t.repo.finalizar).not.toHaveBeenCalled();
    expect(t.motor.obter().situacao).toBe('falha');
  });

  it('preserva entradas em 401', async () => {
    const t = montar();
    t.enviar.mockRejectedValueOnce(new ErroBackend('nao_autorizado', '', 401));
    await t.motor.sincronizar();
    expect(t.estado.entradas).toHaveLength(1);
    expect(t.motor.obter().situacao).toBe('reautenticacao');
  });
});
