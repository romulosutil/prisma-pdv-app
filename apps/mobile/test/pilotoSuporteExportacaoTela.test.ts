// F16/F17 (CP 153): a tela de Suporte entrega a exportação confirmada pelo caminho real
// (exportarDadosSuporte -> compartilharJson -> arquivo temporário -> shareAsync) e só envia o resumo técnico quando ligado.
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  sessao: { token: 'tok-secreto-da-sessao-do-aparelho', operadorId: 'ana' } as { token: string; operadorId: string } | null,
  exportar: vi.fn(), listar: vi.fn(), pendente: vi.fn(), enviar: vi.fn(), push: vi.fn(),
  arquivos: new Map<string, string>(), compartilhar: vi.fn(), disponivel: vi.fn(), id: 0,
}));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children), Platform: { OS: 'android' }, Linking: { openURL: vi.fn() } }; });
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '0.1.17', extra: { ambiente: 'homologacao' } } } }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('@/util/useVoltar', () => ({ useVoltar: () => vi.fn() }));
vi.mock('@/util/ids', () => ({ novoId: () => `id-${++m.id}` }));
vi.mock('expo-sharing', () => ({ shareAsync: m.compartilhar, isAvailableAsync: m.disponivel }));
vi.mock('expo-file-system', () => {
  const juntar = (partes: any[]) => partes.map(p => typeof p === 'string' ? p : p.uri).join('/');
  class File {
    uri: string; constructor(...partes: any[]) { this.uri = juntar(partes); }
    get name() { return this.uri.split('/').at(-1)!; }
    get exists() { return m.arquivos.has(this.uri); }
    get lastModified() { return Date.now(); }
    create() { m.arquivos.set(this.uri, ''); }
    write(texto: string) { m.arquivos.set(this.uri, texto); }
    delete() { m.arquivos.delete(this.uri); }
  }
  class Directory {
    uri: string; constructor(...partes: any[]) { this.uri = juntar(partes); }
    get exists() { return true; }
    create() {}
    list() { return []; }
  }
  return { Directory, File, Paths: { cache: 'cache' } };
});
vi.mock('@/dados/hooks', () => ({
  useConta: () => ({ sessao: m.sessao }), useSincronizacao: () => ({ pendentes: 3, rejeitadas: 1, ultimaSincronizacaoEm: '2026-11-03T14:00:00.000Z' }),
  useDados: () => ({ backend: { modo: 'http', listarSolicitacoesSuporte: m.listar, exportarDadosSuporte: m.exportar }, suporte: { pendente: m.pendente, enviar: m.enviar }, conta: { obter: () => ({ sessao: m.sessao }) } }),
}));
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: any) => R.createElement('botao', p) }; });
vi.mock('@/componentes/Campo', async () => { const R = await import('react'); return { Campo: (p: any) => R.createElement('campo', p) }; });
vi.mock('@/componentes/Segmentado', async () => { const R = await import('react'); return { Segmentado: (p: any) => R.createElement('segmentado', p) }; });
vi.mock('@/componentes/Interruptor', async () => { const R = await import('react'); return { Interruptor: (p: any) => R.createElement('interruptor', p) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: any) => R.createElement('texto', p, p.children) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: any) => R.createElement('tela', p, p.children) }; });
vi.mock('@/componentes/CabecalhoTela', async () => { const R = await import('react'); return { CabecalhoTela: (p: any) => R.createElement('cabecalho', p) }; });
import { ResumoSuporteSchema } from '@pdv/shared';
import { Suporte } from '@/telas/suporte/Suporte';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let r: ReactTestRenderer;
const EXPORTACAO = { geradoEm: '2026-11-03T15:00:00.000Z', escopo: { financeiro: 'loja' }, aviso: 'Somente dados confirmados.', produtos: [{ id: 'p1', nome: 'Pão' }], vendas: [], caixas: [] };
beforeEach(() => {
  vi.resetAllMocks(); m.arquivos.clear(); m.id = 0;
  m.sessao = { token: 'tok-secreto-da-sessao-do-aparelho', operadorId: 'ana' };
  m.listar.mockResolvedValue([]); m.pendente.mockResolvedValue(null); m.enviar.mockResolvedValue(undefined);
  m.exportar.mockResolvedValue(EXPORTACAO); m.disponivel.mockResolvedValue(true); m.compartilhar.mockResolvedValue(undefined);
});
afterEach(async () => { if (r) await act(async () => r.unmount()); });
const tipo = (nome: string) => r.root.findAll(n => n.type === (nome as any));
const botao = (rotulo: string) => tipo('botao').find(n => n.props.rotulo === rotulo)!;
const texto = () => JSON.stringify(r.toJSON());

it('F17: "Exportar dados confirmados" entrega JSON válido com nome e mime corretos, sem acrescentar a sessão, e avisa sem prometer pendências', async () => {
  await act(async () => { r = create(React.createElement(Suporte)); });
  await act(async () => { botao('Exportar dados confirmados desta loja').props.onPress(); });
  await vi.waitFor(() => expect(m.compartilhar).toHaveBeenCalledOnce());
  const [uri, opcoes] = m.compartilhar.mock.calls[0]!;
  expect(m.exportar).toHaveBeenCalledWith('tok-secreto-da-sessao-do-aparelho');
  expect(uri).toMatch(/pdv-dados-confirmados\.json$/);
  expect(opcoes).toMatchObject({ mimeType: 'application/json' });
  const conteudo = m.arquivos.get(uri)!;
  expect(JSON.parse(conteudo)).toEqual(EXPORTACAO);
  expect(conteudo).not.toContain('tok-secreto');
  expect(JSON.parse(conteudo)).not.toHaveProperty('pendencias');
  await vi.waitFor(() => expect(texto()).toContain('Arquivo entregue ao compartilhamento'));
  expect(texto()).toContain('Pendências não estão neste arquivo');
});

it('F17-e: destino indisponível mostra erro em português, não cria arquivo e não afirma que entregou', async () => {
  m.disponivel.mockResolvedValue(false);
  await act(async () => { r = create(React.createElement(Suporte)); });
  await act(async () => { botao('Exportar dados confirmados desta loja').props.onPress(); });
  await vi.waitFor(() => expect(texto()).toContain('Não foi possível concluir'));
  expect(m.compartilhar).not.toHaveBeenCalled();
  expect(m.arquivos.size).toBe(0);
  expect(texto()).not.toContain('Arquivo entregue ao compartilhamento');
});

it('F16: resumo técnico desligado envia diagnostico null; ligado envia só os seis campos aceitos pelo schema estrito', async () => {
  await act(async () => { r = create(React.createElement(Suporte)); });
  await act(async () => { tipo('campo')[0]!.props.onChangeText('Venda aguardando confirmação.'); });
  await act(async () => { botao('Enviar solicitação de suporte').props.onPress(); });
  await vi.waitFor(() => expect(m.enviar).toHaveBeenCalledTimes(1));
  expect(m.enviar.mock.calls[0]![0]).toEqual({ tipo: 'suporte', mensagem: 'Venda aguardando confirmação.', diagnostico: null });

  await act(async () => { tipo('interruptor')[0]!.props.onChange(true); tipo('campo')[0]!.props.onChangeText('Venda aguardando confirmação de novo.'); });
  expect(tipo('interruptor')[0]!.props.rotulo).toBe('Incluir resumo técnico sem credenciais');
  await act(async () => { botao('Enviar solicitação de suporte').props.onPress(); });
  await vi.waitFor(() => expect(m.enviar).toHaveBeenCalledTimes(2));
  const diagnostico = m.enviar.mock.calls[1]![0].diagnostico;
  expect(Object.keys(diagnostico).sort()).toEqual(['ambiente', 'pendentes', 'plataforma', 'rejeitadas', 'ultimaSincronizacaoEm', 'versao']);
  expect(ResumoSuporteSchema.safeParse(diagnostico).success).toBe(true);
  expect(diagnostico).toMatchObject({ versao: '0.1.17', ambiente: 'homologacao', plataforma: 'android', pendentes: 3, rejeitadas: 1 });
  expect(JSON.stringify(diagnostico)).not.toContain('tok-secreto');
});

it('F16: o schema do resumo técnico recusa qualquer campo extra (credencial, e-mail, estado)', () => {
  const base = { versao: '0.1.17', ambiente: 'homologacao', plataforma: 'android', pendentes: 0, rejeitadas: 0, ultimaSincronizacaoEm: null };
  expect(ResumoSuporteSchema.safeParse(base).success).toBe(true);
  for (const extra of [{ token: 'x' }, { email: 'a@b.co' }, { estado: {} }, { mensagemDeErro: 'falha' }]) expect(ResumoSuporteSchema.safeParse({ ...base, ...extra }).success).toBe(false);
});
