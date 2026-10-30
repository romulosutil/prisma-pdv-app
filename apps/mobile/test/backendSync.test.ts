import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackendHttp } from '../src/servicos/backendHttp';

const id = '00000000-0000-4000-8000-000000000001';
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => { vi.unstubAllGlobals(); });

describe('transporte de sincronização', () => {
  it('usa token capturado e valida respostas do push e pull', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(resposta({ aceitas: [], rejeitadas: [], cursor: '9' })).mockResolvedValueOnce(resposta({ cursor: '0', mudancas: [] }));
    vi.stubGlobal('fetch', fetch);
    const backend = new BackendHttp('http://localhost', () => 'outro');
    await backend.enviarMutacoes({ aparelhoId: id, mutacoes: [] }, 'capturado');
    await backend.receberMudancas('0', 'capturado');
    expect(fetch.mock.calls[0]?.[1].headers.Authorization).toBe('Bearer capturado');
    expect(fetch.mock.calls[1]?.[0]).toBe('http://localhost/sync/pull?desde=0');
  });

  it('rejeita resposta malformada e repassa token usado no 401', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(resposta({ aceitas: [] })).mockResolvedValueOnce(resposta({}, 401));
    vi.stubGlobal('fetch', fetch);
    const invalida = vi.fn();
    const backend = new BackendHttp('http://localhost', () => 'novo', invalida);
    await expect(backend.enviarMutacoes({ aparelhoId: id, mutacoes: [] }, 'antigo')).rejects.toMatchObject({ codigo: 'resposta_invalida' });
    await expect(backend.receberMudancas('0', 'antigo')).rejects.toMatchObject({ codigo: 'nao_autorizado' });
    expect(invalida).toHaveBeenCalledWith('antigo');
  });
});
