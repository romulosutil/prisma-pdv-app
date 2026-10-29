import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackendHttp } from '../src/servicos/backendHttp';
import { BackendLocal } from '../src/servicos/backendLocal';
import { ErroBackend, mensagemDeErro } from '../src/servicos/backend';
import { criarAmbiente } from './ambiente';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const inicio = { email: 'ana@exemplo.com', codigo: '123456', aparelhoId: id(5), aparelhoNome: 'Novo' };
const confirmacao = { id: id(1), token: 'a'.repeat(43), aparelhoSubstituidoId: id(6), confirmar: true as const };
const desafio = {
  id: id(1), token: confirmacao.token, expiraEm: '2026-10-29T12:05:00.000Z',
  perfil: { contaId: id(2), lojaId: id(3), operadorId: id(4), email: inicio.email, nomeResponsavel: 'Ana', nomeLoja: 'Loja', papel: 'dono' },
  aparelhoNovoId: id(5), aparelhoNovoNome: 'Novo',
  aparelhos: [{ id: id(6), nome: 'Antigo', ultimoAcessoEm: '2026-10-28T12:00:00.000Z' }],
};
const sessao = { token: 'sessao-final', contaId: id(2), lojaId: id(3), operadorId: id(4), aparelhoId: id(5) };
const resposta = (status: number, corpo: unknown) => new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status });
afterEach(() => vi.unstubAllGlobals());

describe('transporte de recuperação AC9', () => {
  it('envia DTOs públicos exatos e valida as duas respostas', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(resposta(200, desafio)).mockResolvedValueOnce(resposta(200, sessao));
    vi.stubGlobal('fetch', fetch);
    const obterToken = vi.fn(() => 'credencial-antiga');
    const backend = new BackendHttp('https://api.example', obterToken);
    expect(await backend.iniciarRecuperacao(inicio)).toEqual(desafio);
    expect(await backend.confirmarRecuperacao(confirmacao)).toEqual(sessao);
    for (const [i, caminho, corpo] of [[0, '/auth/recuperacao', inicio], [1, '/auth/recuperacao/confirmar', confirmacao]] as const) {
      const [url, opcoes] = fetch.mock.calls[i]!;
      expect(url).toBe(`https://api.example${caminho}`);
      expect(opcoes.method).toBe('POST');
      expect(JSON.parse(opcoes.body)).toEqual(corpo);
      expect(opcoes.headers.Authorization).toBeUndefined();
    }
    expect(obterToken).not.toHaveBeenCalled();
  });

  it.each(['iniciar', 'confirmar'])('401 público em %s preserva credencial e não chama callback', async (fase) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(401, { segredo: 'não exibir' })));
    let credencial: string | null = 'antiga';
    const invalidar = vi.fn(() => { credencial = null; });
    const backend = new BackendHttp('', () => credencial, invalidar);
    const promessa = fase === 'iniciar' ? backend.iniciarRecuperacao(inicio) : backend.confirmarRecuperacao(confirmacao);
    await expect(promessa).rejects.toMatchObject({ codigo: 'nao_autorizado', status: 401 });
    expect(invalidar).not.toHaveBeenCalled();
    expect(credencial).toBe('antiga');
  });

  it.each(['limite_aparelhos', 'aparelho_em_uso', 'aparelho_revogado', 'aparelho_ja_autorizado', 'recuperacao_desnecessaria', 'recuperacao_desatualizada'])('reconhece 409 %s com mensagem local', async (codigo) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(409, { codigo, mensagem: 'conteúdo hostil' })));
    const erro = await new BackendHttp('', () => null).iniciarRecuperacao(inicio).catch((e: ErroBackend) => e);
    expect(erro).toMatchObject({ codigo, status: 409 });
    expect(mensagemDeErro(erro)).not.toContain('conteúdo hostil');
    expect(mensagemDeErro(erro).length).toBeGreaterThan(10);
  });

  it.each([[400, 'valor_invalido'], [404, 'nao_encontrado'], [429, 'limite_autenticacao'], [500, 'desconhecido']] as const)('status %s prevalece sobre código de limite adversarial', async (status, codigo) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(status, { codigo: 'limite_aparelhos', mensagem: 'hostil' })));
    const erro = await new BackendHttp('', () => null).confirmarRecuperacao(confirmacao).catch((e: ErroBackend) => e);
    expect(erro).toMatchObject({ codigo, status });
    expect(mensagemDeErro(erro)).not.toContain('hostil');
  });

  it('mantém mensagem fixa de 429 mesmo com JSON inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(429, 'segredo inválido')));
    const erro = await new BackendHttp('', () => null).iniciarRecuperacao(inicio).catch((e: ErroBackend) => e);
    expect(erro).toMatchObject({ codigo: 'limite_autenticacao' });
    expect(mensagemDeErro(erro)).toBe('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
  });

  it.each([{ ...desafio, aparelhos: [] }, 'JSON inválido'])('recusa resposta de desafio fora do contrato', async (corpo) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, corpo)));
    await expect(new BackendHttp('', () => null).iniciarRecuperacao(inicio)).rejects.toMatchObject({ codigo: 'resposta_invalida' });
  });

  it('recusa sessão fora do contrato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, { ...sessao, aparelhoId: 'inválido' })));
    await expect(new BackendHttp('', () => null).confirmarRecuperacao(confirmacao)).rejects.toMatchObject({ codigo: 'resposta_invalida' });
  });

  it('modo demo recusa ambas as operações sem leitura ou escrita', async () => {
    const amb = criarAmbiente();
    const ler = vi.spyOn(amb.armazenamento, 'obter');
    const gravar = vi.spyOn(amb.armazenamento, 'gravar');
    const remover = vi.spyOn(amb.armazenamento, 'remover');
    const backend = new BackendLocal(amb.armazenamento, amb.relogio, amb.novoId);
    for (const promessa of [backend.iniciarRecuperacao(inicio), backend.confirmarRecuperacao(confirmacao)]) {
      await expect(promessa).rejects.toMatchObject({ codigo: 'recuperacao_indisponivel', message: 'Recuperação de aparelho indisponível no modo demo.' });
    }
    expect(ler).not.toHaveBeenCalled();
    expect(gravar).not.toHaveBeenCalled();
    expect(remover).not.toHaveBeenCalled();
  });
});
