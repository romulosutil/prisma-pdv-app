import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ sessao: { token: 'a', operadorId: 'ana' } as { token: string; operadorId: string } | null, listar: vi.fn(), pendente: vi.fn(), enviar: vi.fn(), compartilhar: vi.fn(), push: vi.fn() }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children), Platform: { OS: 'android' } }; });
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '0.1.6', extra: { ambiente: 'homologacao' } } } }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('@/util/useVoltar', () => ({ useVoltar: () => vi.fn() }));
vi.mock('@/telas/suporte/compartilhar', () => ({ compartilharJson: m.compartilhar }));
vi.mock('@/dados/hooks', () => ({
  useConta: () => ({ sessao: m.sessao }), useSincronizacao: () => ({ pendentes: 1, rejeitadas: 0, ultimaSincronizacaoEm: null }),
  useDados: () => ({ backend: { modo: 'http', listarSolicitacoesSuporte: m.listar }, suporte: { pendente: m.pendente, enviar: m.enviar }, conta: { obter: () => ({ sessao: m.sessao }) } }),
}));
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: any) => R.createElement('botao', p) }; });
vi.mock('@/componentes/Campo', async () => { const R = await import('react'); return { Campo: (p: any) => R.createElement('campo', p) }; });
vi.mock('@/componentes/Segmentado', async () => { const R = await import('react'); return { Segmentado: (p: any) => R.createElement('segmentado', p) }; });
vi.mock('@/componentes/Interruptor', async () => { const R = await import('react'); return { Interruptor: (p: any) => R.createElement('interruptor', p) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: any) => R.createElement('texto', p, p.children) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: any) => R.createElement('tela', p, p.children) }; });
vi.mock('@/componentes/CabecalhoTela', async () => { const R = await import('react'); return { CabecalhoTela: (p: any) => R.createElement('cabecalho', p) }; });
import { Suporte } from '@/telas/suporte/Suporte';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let r: ReactTestRenderer;
beforeEach(() => { vi.resetAllMocks(); m.sessao = { token: 'a', operadorId: 'ana' }; m.listar.mockResolvedValue([]); m.pendente.mockResolvedValue(null); m.enviar.mockResolvedValue(undefined); });
afterEach(async () => { if (r) await act(async () => r.unmount()); });
const tipo = (nome: string) => r.root.findAll(n => n.type === (nome as any));
it('políticas aparecem sem sessão e nenhum atendimento ou arquivo é enviado automaticamente', async () => {
  m.sessao = null; await act(async () => { r = create(React.createElement(Suporte)); });
  expect(JSON.stringify(r.toJSON())).toContain('Privacidade'); expect(m.listar).not.toHaveBeenCalled();
  expect(m.enviar).not.toHaveBeenCalled(); expect(m.compartilhar).not.toHaveBeenCalled();
});
it('resposta atrasada de Ana não reaparece após trocar para outro acesso', async () => {
  let resolver!: (valor: unknown[]) => void;
  m.listar.mockImplementationOnce(() => new Promise<unknown[]>(r => { resolver = r; }));
  await act(async () => { r = create(React.createElement(Suporte)); });
  m.sessao = { token: 'b', operadorId: 'bruno' };
  await act(async () => r.update(React.createElement(Suporte)));
  await act(async () => resolver([{ id: 'a', tipo: 'suporte', estado: 'aberto', mensagem: 'Mensagem privada de Ana' }]));
  expect(JSON.stringify(r.toJSON())).not.toContain('Mensagem privada de Ana');
});
it('exclusão envia pedido de análise com diagnóstico desligado por padrão e preserva arquivos', async () => {
  await act(async () => { r = create(React.createElement(Suporte)); });
  await act(async () => { tipo('segmentado')[0]!.props.onChange('exclusao'); tipo('campo')[0]!.props.onChangeText('Quero analisar a exclusão dos meus dados.'); });
  expect(JSON.stringify(r.toJSON())).toContain('não acontece ao tocar em enviar');
  await act(async () => tipo('botao').find(n => n.props.rotulo === 'Enviar pedido de análise de exclusão')!.props.onPress());
  expect(m.enviar).toHaveBeenCalledWith({ tipo: 'exclusao', mensagem: 'Quero analisar a exclusão dos meus dados.', diagnostico: null });
  expect(m.compartilhar).not.toHaveBeenCalled();
});
