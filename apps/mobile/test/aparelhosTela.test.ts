import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErroBackend } from '../src/servicos/backend';

const mock = vi.hoisted(() => ({ conta: { identidade: { contaId: 'A', lojaId: 'A' }, perfil: { nomeLoja: 'Loja A', email: 'a@example.com' } }, escopo: JSON.stringify(['A', 'A']), modo: 'http', listar: vi.fn(), revogar: vi.fn(), toast: vi.fn() }));
vi.mock('react-native', async () => { const React = await import('react'); return { View: (p: React.PropsWithChildren) => React.createElement('view', p, p.children), ActivityIndicator: (p: object) => React.createElement('loading', p), StyleSheet: { create: (v: unknown) => v } }; });
vi.mock('expo-router', () => ({ useRouter: () => ({ back: vi.fn() }) }));
vi.mock('@/tema', () => ({ cores: { ink2: '#000', surface: '#fff' }, raio: { md: 8 } }));
vi.mock('@/dados/hooks', () => ({ useConta: () => mock.conta, useDados: () => dados }));
vi.mock('@/componentes/Toast', () => ({ useToast: () => ({ mostrar: mock.toast }) }));
vi.mock('@/componentes/Banner', async () => { const R = await import('react'); return { Banner: (p: object) => R.createElement('banner', p) }; });
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: object) => R.createElement('botao', p) }; });
vi.mock('@/componentes/BotaoIcone', async () => { const R = await import('react'); return { BotaoIcone: (p: object) => R.createElement('icone', p) }; });
vi.mock('@/componentes/BottomSheet', async () => { const R = await import('react'); return { BottomSheet: (p: React.PropsWithChildren<{ visivel: boolean }>) => R.createElement('sheet', p, p.visivel ? p.children : null) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: React.PropsWithChildren) => R.createElement('tela', p, p.children) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: React.PropsWithChildren) => R.createElement('texto', p, p.children) }; });
import Tela from '../app/ajustes/aparelhos';

const dados = { backend: { get modo() { return mock.modo; }, listarAparelhos: mock.listar }, armazenamentoDaLoja: { obterEscopo: () => mock.escopo }, revogarAparelho: mock.revogar, sair: vi.fn() };
const aparelho = (nome: string): { id: string; nome: string; atual: boolean; revogadoEm: string | null; criadoEm: string; ultimoAcessoEm: string } => ({ id: nome, nome, atual: false, revogadoEm: null, criadoEm: '2026-01-01T00:00:00Z', ultimoAcessoEm: '2026-01-01T00:00:00Z' });
function pendente<T>() { let resolve!: (v: T) => void; let reject!: (e: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
let renderer: ReactTestRenderer | undefined;
const tela = () => renderer!.root;
const botao = (rotulo: string) => tela().findAll((n) => (n.type as unknown) === 'botao' && n.props.rotulo === rotulo)[0];
const contem = (s: string) => JSON.stringify(renderer!.toJSON()).includes(s);
async function montar() { await act(async () => { renderer = create(React.createElement(Tela)); }); }
async function trocarB() { mock.conta = { identidade: { contaId: 'B', lojaId: 'B' }, perfil: { nomeLoja: 'Loja B', email: 'b@example.com' } }; mock.escopo = JSON.stringify(['B', 'B']); await act(async () => { renderer!.update(React.createElement(Tela)); }); }
async function clicar(rotulo: string) { const b = botao(rotulo); expect(b).toBeDefined(); await act(async () => { b!.props.onPress(); }); }
afterEach(async () => { if (renderer) await act(async () => renderer!.unmount()); renderer = undefined; vi.clearAllMocks(); mock.conta = { identidade: { contaId: 'A', lojaId: 'A' }, perfil: { nomeLoja: 'Loja A', email: 'a@example.com' } }; mock.escopo = JSON.stringify(['A', 'A']); mock.modo = 'http'; });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('tela de aparelhos com hooks React', () => {
  it('oculta lista A imediatamente enquanto B carrega', async () => {
    const novo = pendente<ReturnType<typeof aparelho>[]>();
    mock.listar.mockResolvedValueOnce([aparelho('Aparelho A')]).mockReturnValueOnce(novo.promise);
    await montar(); expect(contem('Aparelho A')).toBe(true);
    await trocarB(); expect(contem('Aparelho A')).toBe(false); expect(tela().findAllByType('loading' as never)).toHaveLength(1);
    await act(async () => novo.resolve([aparelho('Aparelho B')]));
    expect(contem('Aparelho B')).toBe(true); expect(contem('Aparelho A')).toBe(false);
  });
  it.each(['resolve', 'rejeita'])('ignora consulta antiga que %s após trocar de conta', async (fim) => {
    const antigo = pendente<ReturnType<typeof aparelho>[]>(); const novo = pendente<ReturnType<typeof aparelho>[]>();
    mock.listar.mockReturnValueOnce(antigo.promise).mockReturnValueOnce(novo.promise);
    await montar(); await trocarB();
    await act(async () => { if (fim === 'resolve') antigo.resolve([aparelho('Aparelho A')]); else antigo.reject(new ErroBackend('rede', '')); });
    expect(contem('Aparelho A')).toBe(false); expect(contem('Sem conexão')).toBe(false); expect(tela().findAllByType('loading' as never)).toHaveLength(1);
    await act(async () => novo.resolve([aparelho('Aparelho B')]));
    expect(contem('Aparelho B')).toBe(true); expect(tela().findAllByType('loading' as never)).toHaveLength(0);
  });
  it.each(['resolve', 'rejeita'])('ignora revogação A atrasada que %s', async (fim) => {
    const revogacao = pendente<void>(); const listaB = pendente<ReturnType<typeof aparelho>[]>();
    mock.listar.mockResolvedValueOnce([aparelho('Aparelho A')]).mockReturnValueOnce(listaB.promise);
    mock.revogar.mockReturnValueOnce(revogacao.promise);
    await montar(); await clicar('Revogar Aparelho A'); await clicar('Confirmar revogação');
    expect(mock.revogar).toHaveBeenCalledWith('Aparelho A');
    await trocarB(); await act(async () => listaB.resolve([aparelho('Aparelho B')]));
    await act(async () => { if (fim === 'resolve') revogacao.resolve(); else revogacao.reject(new ErroBackend('rede', '')); });
    expect(contem('Aparelho B')).toBe(true); expect(contem('Aparelho A')).toBe(false);
    expect(botao('Revogar Aparelho B')?.props.desabilitado).toBe(false);
    expect(mock.toast).not.toHaveBeenCalled(); expect(mock.listar).toHaveBeenCalledTimes(2);
  });
  it('só anuncia sucesso após revogação e atualiza a lista', async () => {
    const revogacao = pendente<void>(); const refresh = pendente<ReturnType<typeof aparelho>[]>();
    mock.listar.mockResolvedValueOnce([aparelho('Aparelho A')]).mockReturnValueOnce(refresh.promise);
    mock.revogar.mockReturnValueOnce(revogacao.promise);
    await montar(); await clicar('Revogar Aparelho A'); await clicar('Confirmar revogação');
    expect(mock.toast).not.toHaveBeenCalled(); expect(mock.listar).toHaveBeenCalledTimes(1);
    await act(async () => revogacao.resolve());
    expect(mock.toast).toHaveBeenCalledWith('Acesso do aparelho revogado no servidor.', { tipo: 'sucesso' });
    expect(mock.listar).toHaveBeenCalledTimes(2);
    await act(async () => refresh.resolve([{ ...aparelho('Aparelho A'), revogadoEm: '2026-01-01T00:00:00Z' }]));
    expect(contem('Acesso revogado')).toBe(true); expect(botao('Revogar Aparelho A')).toBeUndefined();
  });
  it.each(['nao_autorizado', 'rede'] as const)('falha %s não anuncia sucesso', async (codigo) => {
    mock.listar.mockResolvedValue([aparelho('Aparelho A')]); mock.revogar.mockRejectedValue(new ErroBackend(codigo, ''));
    await montar(); await clicar('Revogar Aparelho A'); await clicar('Confirmar revogação');
    expect(mock.toast).toHaveBeenCalledWith(expect.any(String), { tipo: 'erro' });
    expect(mock.toast).not.toHaveBeenCalledWith(expect.any(String), { tipo: 'sucesso' });
    expect(contem('Aparelho A')).toBe(true); expect(mock.listar).toHaveBeenCalledTimes(1);
  });
  it('desabilita revogação no modo demo', async () => {
    mock.modo = 'demo'; mock.listar.mockResolvedValue([aparelho('Aparelho A')]);
    await montar(); expect(botao('Revogar Aparelho A')?.props.desabilitado).toBe(true);
    expect(mock.revogar).not.toHaveBeenCalled(); expect(mock.toast).not.toHaveBeenCalled();
  });
});
