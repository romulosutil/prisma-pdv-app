import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ consultar: vi.fn(), entrar: vi.fn(), pedir: vi.fn(), cancelar: vi.fn(), nav: { setOptions: vi.fn() } }));
vi.mock('expo-router', () => ({ useRouter: () => ({ back: vi.fn(), replace: vi.fn() }), useNavigation: () => m.nav }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children), Pressable: (p: any) => R.createElement('pressable', p, p.children), StyleSheet: { create: (s: any) => s }, BackHandler: { addEventListener: () => ({ remove: vi.fn() }) } }; });
vi.mock('@/tema', () => ({ cores: { ink2: 'ink', surface: 's', surface2: 's2' }, raio: { md: 8 } }));
const dados = { backend: { modo: 'http', consultarVinculos: m.consultar, pedirCodigo: m.pedir }, consultarVinculos: m.consultar, entrar: m.entrar, cancelarRecuperacao: m.cancelar, obterRecuperacaoPendente: () => null };
vi.mock('@/dados/hooks', () => ({ useDados: () => dados, useConta: () => ({ perfil: null, identidade: null, carregandoConta: false, reautenticacaoNecessaria: false }) }));
vi.mock('@/dados/carrinho', () => ({ useCarrinho: () => ({ vazio: true }) }));
vi.mock('@/componentes/Banner', async () => { const R = await import('react'); return { Banner: (p: any) => R.createElement('banner', p) }; });
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: any) => R.createElement('botao', p) }; });
vi.mock('@/componentes/BotaoIcone', async () => { const R = await import('react'); return { BotaoIcone: (p: any) => R.createElement('icone', p) }; });
vi.mock('@/componentes/Campo', async () => { const R = await import('react'); return { Campo: (p: any) => R.createElement('campo', p) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: any) => R.createElement('texto', p, p.children) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: any) => R.createElement('tela', null, p.children, p.rodape) }; });
vi.mock('@/componentes/BottomSheet', async () => { const R = await import('react'); return { BottomSheet: (p: any) => R.createElement('sheet', null, p.visivel ? p.children : null) }; });
import Entrar from '../app/(onboarding)/entrar';
let r: ReactTestRenderer;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const botao = (nome: string) => r.root.findAll(n => n.type === ('botao' as any) && n.props.rotulo === nome)[0]!;
const campo = (nome: string) => r.root.findAll(n => n.type === ('campo' as any) && n.props.rotulo === nome)[0]!;
async function clicar(nome: string) { await act(async () => { botao(nome).props.onPress(); }); }
async function iniciar() {
  await act(async () => { r = create(React.createElement(Entrar)); });
  await act(async () => campo('E-mail').props.onChangeText('ana@exemplo.com'));
  await clicar('Enviar código'); await act(async () => campo('Código').props.onChangeText('123456'));
}
afterEach(async () => { if (r) await act(async () => r.unmount()); vi.resetAllMocks(); });
const convite = { operadorId: 'convite', usuarioId: 'usuario', contaId: 'empresa', lojaId: 'loja', nomeLoja: 'Filial', nome: 'Ana', email: 'ana@exemplo.com', papel: 'operador', estado: 'convidado', permissoes: ['vender'], conviteExpiraEm: '2026-11-08T20:00:00Z' };

it('mostra somente os vínculos comprovados pelo código e exige escolha e aceite explícitos do convite', async () => {
  m.consultar.mockResolvedValue([{ ...convite, operadorId: 'ativo', nomeLoja: 'Matriz', estado: 'ativo' }, convite]);
  await iniciar(); await clicar('Entrar');
  expect(m.consultar).toHaveBeenCalledWith('ana@exemplo.com', '123456');
  expect(m.entrar).not.toHaveBeenCalled(); expect(botao('Entrar na loja').props.desabilitado).toBe(true);
  const opcoes = r.root.findAll(n => n.type === ('pressable' as any) && n.props.accessibilityRole === 'radio');
  expect(opcoes).toHaveLength(2);
  await act(async () => opcoes[1]!.props.onPress());
  expect(JSON.stringify(r.toJSON())).toContain('você aceita participar desta loja');
  expect(m.entrar).not.toHaveBeenCalled(); await clicar('Aceitar convite e entrar');
  expect(m.entrar).toHaveBeenCalledWith('ana@exemplo.com', '123456', convite);
});
it('um convite único também exige aceite; alterar o e-mail descarta a seleção', async () => {
  m.consultar.mockResolvedValue([convite]); await iniciar(); await clicar('Entrar');
  expect(m.entrar).not.toHaveBeenCalled(); expect(botao('Aceitar convite e entrar')).toBeDefined();
  await clicar('Alterar e-mail ou pedir novo código');
  expect(botao('Aceitar convite e entrar')).toBeUndefined(); expect(botao('Enviar código')).toBeDefined();
});
