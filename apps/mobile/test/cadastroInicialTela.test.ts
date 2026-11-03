import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ErroBackend } from '@/servicos/backend';

const m = vi.hoisted(() => ({ pedir: vi.fn(), verificar: vi.fn(), prova: null as null | { email: string; documento: string }, criar: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn(), rascunho: null as any }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children), StyleSheet: { create: (v: unknown) => v } }; });
vi.mock('expo-router', () => ({ useRouter: () => ({ push: m.push, replace: m.replace, back: m.back }) }));
vi.mock('@/dados/hooks', () => ({ useDados: () => dados }));
vi.mock('@/tema', () => ({ cores: { ink2: 'ink' } }));
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: any) => R.createElement('botao', p) }; });
vi.mock('@/componentes/Campo', async () => { const R = await import('react'); return { Campo: (p: any) => R.createElement('campo', p) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: any) => R.createElement('texto', p, p.children) }; });
vi.mock('@/componentes/Banner', async () => { const R = await import('react'); return { Banner: (p: any) => R.createElement('banner', p) }; });
vi.mock('@/componentes/Chip', async () => { const R = await import('react'); return { Chip: (p: any) => R.createElement('chip', p) }; });
vi.mock('@/componentes/CabecalhoEtapa', async () => { const R = await import('react'); return { CabecalhoEtapa: (p: any) => R.createElement('cabecalho', p) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: any) => R.createElement('tela', null, p.children, p.rodape) }; });
import CriarConta from '../app/(onboarding)/criar-conta';
import Loja from '../app/(onboarding)/loja';
import { RascunhoProvider, useRascunho } from '@/nucleo/rascunho';

const dados = { backend: { modo: 'http' }, pedirCodigoCadastro: m.pedir, verificarCadastro: m.verificar, cancelarCadastro: () => { m.prova = null; }, cadastroConfirmado: (email: string, documento: string) => m.prova?.email === email && m.prova?.documento === documento, criarConta: m.criar, assinatura: { obter: () => ({ assinatura: { status: 'liberada' } }) } };
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let r: ReactTestRenderer;
function Capturar() { m.rascunho = useRascunho().rascunho; return null; }
const tela = (Componente: typeof CriarConta) => React.createElement(RascunhoProvider, null, React.createElement(Componente), React.createElement(Capturar));
const campo = (rotulo: string) => r.root.findAll(n => n.type === ('campo' as any) && n.props.rotulo === rotulo)[0]!;
const botao = (rotulo: string) => r.root.findAll(n => n.type === ('botao' as any) && n.props.rotulo === rotulo)[0]!;
const clicar = async (rotulo: string) => { await act(async () => { await botao(rotulo).props.onPress(); }); };
async function preparar() {
  await act(async () => { r = create(tela(CriarConta)); });
  await act(async () => { campo('Seu nome').props.onChangeText('Ana'); campo('E-mail').props.onChangeText('ana@example.com'); campo('CPF ou CNPJ').props.onChangeText('52998224725'); });
}
beforeEach(() => { m.pedir.mockResolvedValue({ desafioId: 'desafio' }); m.verificar.mockImplementation(async (email: string, documento: string) => { m.prova = { email, documento }; }); });
afterEach(async () => { if (r) await act(async () => r.unmount()); vi.resetAllMocks(); m.prova = null; });
const confirmar = async () => { await act(async () => campo('Código de confirmação do e-mail').props.onChangeText('123456')); await clicar('Confirmar e continuar'); };

it('recusa email na primeira etapa sem avançar para a loja e oferece entrada direta', async () => {
  m.pedir.mockRejectedValue(new ErroBackend('email_ja_cadastrado', '', 409));
  await preparar(); await clicar('Continuar e enviar código');
  expect(m.pedir).toHaveBeenCalledWith('ana@example.com');
  expect(campo('E-mail').props.erro).toMatch(/já/);
  expect(m.push).not.toHaveBeenCalled(); expect(m.criar).not.toHaveBeenCalled();
  await clicar('Já tenho conta'); expect(m.replace).toHaveBeenCalledWith('/entrar');
});
it('recusa CPF na primeira etapa após OTP, sem pedir dados de loja ou criar conta', async () => {
  m.verificar.mockRejectedValue(new ErroBackend('documento_ja_cadastrado', '', 409));
  await preparar(); await clicar('Continuar e enviar código');
  expect(m.push).not.toHaveBeenCalled(); await confirmar();
  expect(m.verificar).toHaveBeenCalledWith('ana@example.com', '52998224725', 'desafio', '123456');
  expect(campo('CPF ou CNPJ').props.erro).toMatch(/existe/);
  expect(m.push).not.toHaveBeenCalled(); expect(m.criar).not.toHaveBeenCalled();
});
it('confirma na primeira etapa e chega à loja sem pedir outro código nem guardá-lo no rascunho', async () => {
  m.criar.mockResolvedValue(undefined);
  await preparar(); await clicar('Continuar e enviar código'); await confirmar();
  expect(m.push).toHaveBeenCalledWith('/loja');
  await act(async () => r.update(tela(Loja)));
  expect(campo('Código de confirmação do e-mail')).toBeUndefined(); await clicar('Criar minha conta');
  expect(m.pedir).toHaveBeenCalledTimes(1);
  expect(m.criar).toHaveBeenCalledWith(expect.objectContaining({ documento: '52998224725' }));
  expect(JSON.stringify(m.rascunho)).not.toContain('123456'); expect(m.replace).toHaveBeenCalledWith('/pagamentos');
});
it('voltar sem mudar os dados reaproveita a confirmação; outro documento exige nova confirmação', async () => {
  await preparar(); await clicar('Continuar e enviar código'); await confirmar();
  await act(async () => r.update(tela(Loja)));
  await act(async () => r.update(tela(CriarConta)));
  await clicar('Continuar'); expect(m.pedir).toHaveBeenCalledTimes(1);
  await act(async () => campo('CPF ou CNPJ').props.onChangeText('11144477735'));
  m.push.mockClear(); await clicar('Continuar e enviar código'); expect(m.push).not.toHaveBeenCalled();
  await confirmar(); expect(m.verificar).toHaveBeenLastCalledWith('ana@example.com', '11144477735', 'desafio', '123456');
});
it('bloqueia dois toques e ignora resposta recebida após sair', async () => {
  let resolver!: (v: { desafioId: string }) => void;
  m.pedir.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
  await preparar(); let primeira!: Promise<void>;
  await act(async () => { primeira = botao('Continuar e enviar código').props.onPress(); void botao('Continuar e enviar código').props.onPress(); });
  expect(m.pedir).toHaveBeenCalledTimes(1); expect(campo('E-mail').props.editable).toBe(false);
  await act(async () => r.unmount());
  await act(async () => { resolver({ desafioId: 'desafio' }); await primeira; }); expect(m.push).not.toHaveBeenCalled();
});
it('se a confirmação expirou, a loja retorna aos dados sem enviar criação', async () => {
  await preparar(); await clicar('Continuar e enviar código'); await confirmar();
  m.prova = null; await act(async () => r.update(tela(Loja))); await clicar('Criar minha conta');
  expect(m.criar).not.toHaveBeenCalled(); expect(m.replace).toHaveBeenCalledWith('/criar-conta');
});
