import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackendHttp } from '../src/servicos/backendHttp';
import { mensagemDeErro } from '../src/servicos/backend';

const id = '123e4567-e89b-42d3-a456-426614174000';
const perfil = { contaId: id, lojaId: id, operadorId: id, email: 'a@example.com', nomeResponsavel: 'Ana', nomeLoja: 'Loja', papel: 'dono' };
const aparelho = { id, nome: 'Caixa', criadoEm: '2025-01-01T00:00:00.000Z', ultimoAcessoEm: '2025-01-01T00:00:00.000Z', revogadoEm: null, atual: true };
const resposta = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status });

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('acesso HTTP', () => {
  it.each(['publica', 'protegida'] as const)('orienta limite em chamada %s sem exibir corpo do servidor ou perder a credencial', async (tipo) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(resposta(429, { erro: 'cartao_recusado', mensagem: 'token-secreto: instrução arbitrária' }))
      .mockResolvedValueOnce(tipo === 'publica' ? resposta(204) : resposta(200, perfil));
    vi.stubGlobal('fetch', fetchMock);
    let token: string | null = 'token-secreto';
    const callback = vi.fn(() => { token = null; });
    const backend = new BackendHttp('https://api.example', () => token, callback);
    const chamar = () => tipo === 'publica' ? backend.pedirCodigo(perfil.email) : backend.obterPerfil();
    const erro = await chamar().catch((e) => e);
    expect(erro).toMatchObject({ codigo: 'limite_autenticacao', status: 429 });
    expect(mensagemDeErro(erro)).toBe('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
    expect(erro.message).not.toContain('token-secreto');
    expect(callback).not.toHaveBeenCalled();
    expect(token).toBe('token-secreto');
    expect(await chamar()).toEqual(tipo === 'publica' ? undefined : perfil);
    expect(fetchMock.mock.calls.map(([, init]) => init.headers.Authorization)).toEqual(
      tipo === 'publica' ? [undefined, undefined] : ['Bearer token-secreto', 'Bearer token-secreto'],
    );
  });

  it('usa contratos, rotas e token explícito', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(resposta(200, perfil)).mockResolvedValueOnce(resposta(200, [aparelho])).mockResolvedValueOnce(resposta(204)).mockResolvedValueOnce(resposta(204));
    vi.stubGlobal('fetch', fetchMock);
    const backend = new BackendHttp('https://api.example', () => 'antigo');
    expect(await backend.obterPerfil('novo')).toEqual(perfil);
    expect(await backend.listarAparelhos()).toEqual([aparelho]);
    await backend.revogarAparelho(id);
    await backend.sair();
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method, init.headers.Authorization])).toEqual([
      ['https://api.example/conta', 'GET', 'Bearer novo'],
      ['https://api.example/aparelhos', 'GET', 'Bearer antigo'],
      [`https://api.example/aparelhos/${id}`, 'DELETE', 'Bearer antigo'],
      ['https://api.example/auth/logout', 'POST', 'Bearer antigo'],
    ]);
  });

  it('aguarda callback para 401 protegido e mantém erro sanitizado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(401, { mensagem: 'segredo' })));
    const callback = vi.fn(async () => { throw new Error('segredo'); });
    const backend = new BackendHttp('', () => 'antigo', callback);
    const erro = await backend.obterPerfil('novo').catch((e) => e);
    expect(callback).toHaveBeenCalledWith('novo');
    expect(erro).toMatchObject({ codigo: 'nao_autorizado', status: 401 });
    expect(erro.message).not.toContain('segredo');
  });

  it('não invalida em 403, 401 público ou falha de rede', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(resposta(403)).mockResolvedValueOnce(resposta(401)).mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const callback = vi.fn();
    const backend = new BackendHttp('', () => 'token', callback);
    await expect(backend.listarAparelhos()).rejects.toMatchObject({ codigo: 'nao_autorizado' });
    await expect(backend.entrar({ email: 'a@example.com', codigo: '123456', aparelhoId: id, aparelhoNome: 'Caixa' })).rejects.toMatchObject({ codigo: 'nao_autorizado' });
    await expect(backend.obterPerfil()).rejects.toMatchObject({ codigo: 'rede' });
    expect(callback).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[1]?.[1].headers.Authorization).toBeUndefined();
  });

  it('rejeita dados inválidos e revogação sem confirmação', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(resposta(200, {})).mockResolvedValueOnce(resposta(200, {})).mockResolvedValueOnce(resposta(403));
    vi.stubGlobal('fetch', fetchMock);
    const backend = new BackendHttp('', () => 'token');
    await expect(backend.obterPerfil()).rejects.toMatchObject({ codigo: 'resposta_invalida' });
    await expect(backend.revogarAparelho(id)).rejects.toMatchObject({ codigo: 'resposta_invalida' });
    await expect(backend.revogarAparelho(id)).rejects.toMatchObject({ codigo: 'nao_autorizado' });
    await expect(backend.revogarAparelho('../invalido')).rejects.toMatchObject({ codigo: 'valor_invalido' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('limita também o tempo de leitura do corpo e aborta a chamada', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url, init) => {
      signal = init.signal;
      return Promise.resolve({ status: 200, text: () => new Promise<string>(() => {}) });
    }));
    const chamada = new BackendHttp('', () => 'token').obterPerfil();
    const verificacao = expect(chamada).rejects.toMatchObject({ codigo: 'rede' });
    await vi.advanceTimersByTimeAsync(15_000);
    await verificacao;
    expect(signal?.aborted).toBe(true);
  });

  it('sanitiza falha ao ler corpo e mensagens arbitrárias do servidor', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ status: 200, text: () => Promise.reject(new Error('token-secreto')) })
      .mockResolvedValueOnce(resposta(500, { mensagem: 'token-secreto', codigo: 'valor_invalido' }))
      .mockResolvedValueOnce(new Response('{inválido', { status: 200 })));
    const backend = new BackendHttp('', () => 'token-secreto');
    const erro = await backend.obterPerfil().catch((e) => e);
    expect(erro).toMatchObject({ codigo: 'rede' });
    expect(erro.message).not.toContain('token-secreto');
    const erroServidor = await backend.obterPerfil().catch((e) => e);
    expect(erroServidor).toMatchObject({ codigo: 'desconhecido' });
    expect(erroServidor.message).not.toContain('token-secreto');
    await expect(backend.obterPerfil()).rejects.toMatchObject({ codigo: 'resposta_invalida' });
  });
});
