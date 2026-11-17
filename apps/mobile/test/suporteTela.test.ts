import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ sessao: { token: 'a', operadorId: 'ana' } as { token: string; operadorId: string } | null, listar: vi.fn(), pendente: vi.fn(), enviar: vi.fn(), compartilhar: vi.fn(), push: vi.fn(), abrir: vi.fn(), extra: { ambiente: 'homologacao', apiUrl: 'https://api.exemplo.com.br' } as Record<string, unknown> }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children), Platform: { OS: 'android' }, Linking: { openURL: (...a: unknown[]) => m.abrir(...a) } }; });
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '0.1.6', get extra() { return m.extra; } } } }));
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
beforeEach(() => { vi.resetAllMocks(); m.sessao = { token: 'a', operadorId: 'ana' }; m.listar.mockResolvedValue([]); m.pendente.mockResolvedValue(null); m.enviar.mockResolvedValue(undefined); m.abrir.mockResolvedValue(undefined); m.extra = { ambiente: 'homologacao', apiUrl: 'https://api.exemplo.com.br/' }; });
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
const botao = (rotulo: string) => tipo('botao').find(n => n.props.rotulo === rotulo);
it('contato por e-mail e links do site aparecem sem sessão, antes do atendimento pessoal, e abrem as URLs da API', async () => {
  m.sessao = null; await act(async () => { r = create(React.createElement(Suporte)); });
  const json = JSON.stringify(r.toJSON());
  expect(json).toContain('Para suporte, privacidade ou exclusão de conta, escreva para contato@prumo.services.');
  expect(json.indexOf('"Contato"')).toBeLessThan(json.indexOf('Atendimento pessoal'));
  expect(botao('Abrir política de privacidade no site')!.props.variante).toBe('terciario');
  expect(botao('Abrir exclusão de conta no site')!.props.variante).toBe('terciario');
  await act(async () => botao('Abrir política de privacidade no site')!.props.onPress());
  await act(async () => botao('Abrir exclusão de conta no site')!.props.onPress());
  expect(m.abrir.mock.calls).toEqual([['https://api.exemplo.com.br/privacidade'], ['https://api.exemplo.com.br/exclusao-de-conta']]);
});
it('falha ao abrir o link mostra aviso e não trava', async () => {
  m.sessao = null; m.abrir.mockRejectedValueOnce(new Error('sem navegador')); m.abrir.mockImplementationOnce(() => { throw new Error('síncrono'); });
  await act(async () => { r = create(React.createElement(Suporte)); });
  await act(async () => botao('Abrir exclusão de conta no site')!.props.onPress());
  expect(JSON.stringify(r.toJSON())).toContain('Não foi possível abrir o link');
  await act(async () => botao('Abrir política de privacidade no site')!.props.onPress());
  expect(tipo('texto').some(n => String(n.props.children).includes('Não foi possível abrir o link'))).toBe(true);
});
it('sem URL da API (modo demo) mostra o e-mail mas não os botões de site', async () => {
  m.extra = { ambiente: 'demo', apiUrl: null }; m.sessao = null;
  await act(async () => { r = create(React.createElement(Suporte)); });
  expect(JSON.stringify(r.toJSON())).toContain('contato@prumo.services');
  expect(botao('Abrir política de privacidade no site')).toBeUndefined(); expect(botao('Abrir exclusão de conta no site')).toBeUndefined();
});
