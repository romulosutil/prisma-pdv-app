import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Produto } from '@pdv/shared';

const m = vi.hoisted(() => ({ produtos: [] as Produto[], itens: [] as any[], editar: vi.fn(), criar: vi.fn(), mostrar: vi.fn(), voltar: vi.fn(), historico: [] as any[] }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children), Pressable: (p: any) => R.createElement('pressable', p, p.children), StyleSheet: { create: (s: unknown) => s } }; });
vi.mock('expo-router', () => ({ useRouter: () => ({ back: m.voltar, replace: vi.fn(), dismissTo: vi.fn() }) }));
vi.mock('@/tema', () => ({ cores: {}, raio: {}, textoBotao: {} }));
vi.mock('@/util/useVoltar', () => ({ useVoltar: () => m.voltar }));
vi.mock('@/dados/hooks', () => ({ useProdutos: () => ({ produtos: m.produtos, criar: m.criar, editar: m.editar, excluir: vi.fn(), buscarPorEan: vi.fn(), historicoEstoque: () => m.historico }), useLicenca: () => ({ planoId: 'pro', podeUsar: () => true, dentroDoLimite: () => true }) }));
vi.mock('@/dados/carrinho', () => ({ useCarrinho: () => ({ itens: m.itens }) }));
vi.mock('@/servicos/catalogoEan', () => ({ confirmarNoCatalogo: vi.fn() }));
vi.mock('@/componentes/Toast', () => ({ useToast: () => ({ mostrar: m.mostrar }) }));
vi.mock('@/componentes/Banner', () => ({ Banner: 'banner' }));
vi.mock('@/componentes/Botao', () => ({ Botao: 'botao' }));
vi.mock('@/componentes/Campo', () => ({ Campo: 'campo' }));
vi.mock('@/componentes/CampoPreco', () => ({ CampoPreco: 'preco' }));
vi.mock('@/componentes/CabecalhoTela', () => ({ CabecalhoTela: 'cabecalho' }));
vi.mock('@/componentes/Confirmacao', () => ({ Confirmacao: 'confirmacao' }));
vi.mock('@/componentes/FolhaDePlano', () => ({ FolhaDePlano: 'folha' }));
vi.mock('@/componentes/Icone', () => ({ Icone: 'icone' }));
vi.mock('@/componentes/Ilustra', () => ({ Ilustra: 'ilustra' }));
vi.mock('@/componentes/Interruptor', () => ({ Interruptor: 'interruptor' }));
vi.mock('@/componentes/LinhaLista', () => ({ LinhaLista: 'linha' }));
vi.mock('@/componentes/Segmentado', () => ({ Segmentado: 'segmentado' }));
vi.mock('@/componentes/StatusPill', () => ({ StatusPill: 'status' }));
vi.mock('@/componentes/Texto', () => ({ Texto: 'texto' }));
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: any) => R.createElement('tela', p, p.children, p.rodape) }; });

import { AvisoEstoque } from '../src/telas/pagar/AvisoEstoque';
import { HistoricoEstoque } from '../src/telas/produtos/HistoricoEstoque';
import { FormularioProduto } from '../src/telas/produtos/FormularioProduto';
import { lerQuantidade, textoDeQuantidade } from '../src/telas/produtos/logica';
const p: Produto = { id: 'produto', lojaId: 'loja', nome: 'Arroz', ean: null, precoCentavos: 1000, unidade: 'un', estoque: 1000, estoqueMinimo: null, ajustesEstoque: [], atalho: false, criadoEm: '2026-11-02T12:00:00.000Z', atualizadoEm: '2026-11-02T12:00:00.000Z', excluidoEm: null, versao: 1 };
let r: ReactTestRenderer | undefined;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => { vi.clearAllMocks(); m.produtos = [p]; m.itens = [{ produtoId: p.id, quantidadeMilesimos: 1000 }, { produtoId: p.id, quantidadeMilesimos: 1000 }]; m.historico = []; });
afterEach(async () => { if (r) await act(async () => r!.unmount()); r = undefined; });
const campo = (rotulo: string) => r!.root.findAll(n => n.type === ('campo' as any) && n.props.rotulo === rotulo)[0]!;
const salvar = async () => { await act(async () => { await r!.root.findAll(n => n.type === ('botao' as any) && n.props.rotulo === 'Salvar')[0]!.props.onPress(); }); };

it('avisa sobre quantidade somada sem adicionar bloqueio ou confirmação', async () => {
  await act(async () => { r = create(React.createElement(AvisoEstoque)); });
  const aviso = r!.root.findByType('banner' as any);
  expect(aviso.props.tipo).toBe('atencao');
  expect(aviso.props.texto).toContain('Arroz: saldo 1 un; nesta venda 2 un.');
  expect(aviso.props.texto).toContain('Você pode continuar');
  expect(r!.root.findAllByType('botao' as any)).toHaveLength(0);
  m.produtos = [{ ...p, estoque: 0 }];
  await act(async () => r!.update(React.createElement(AvisoEstoque)));
  expect(r!.root.findByType('banner' as any).props.texto).toContain('saldo 0 un');
  m.produtos = [{ ...p, estoque: null }];
  await act(async () => r!.update(React.createElement(AvisoEstoque)));
  expect(r!.root.findAllByType('banner' as any)).toHaveLength(0);
});
it('mostra sinais e frações no histórico, preservando motivo e data', async () => {
  const movimentos = [{ id: 'a', tipo: 'venda' as const, quantidadeMilesimos: -350, em: p.criadoEm, motivo: 'Venda concluída' }, { id: 'b', tipo: 'ajuste' as const, quantidadeMilesimos: 1000, em: p.criadoEm, motivo: 'Reposição' }];
  await act(async () => { r = create(React.createElement(HistoricoEstoque, { movimentos, unidade: 'kg' })); });
  const texto = JSON.stringify(r!.toJSON());
  expect(texto).toContain('-0,35 kg'); expect(texto).toContain('+1 kg'); expect(texto).toContain('Reposição'); expect(texto).toContain('02/11');
  expect(textoDeQuantidade(-1350)).toBe('-1,35');
  expect(lerQuantidade('-0,35', true)).toEqual({ valida: true, milesimos: -350 });
  expect(lerQuantidade('-1', false)).toEqual({ valida: false });
});
it('salvar nome com saldo alterado ao fundo não envia estoque nem ajuste', async () => {
  await act(async () => { r = create(React.createElement(FormularioProduto, { produto: p })); });
  await act(async () => campo('Nome').props.onChangeText('Arroz novo'));
  // Props atuais refletem outra venda; campo permaneceu com o valor de abertura.
  await act(async () => r!.update(React.createElement(FormularioProduto, { produto: { ...p, estoque: -1000 } })));
  await salvar();
  expect(m.editar.mock.calls[0]![1]).toMatchObject({ nome: 'Arroz novo' });
  expect(m.editar.mock.calls[0]![1]).not.toHaveProperty('estoque');
  expect(m.editar.mock.calls[0]![1]).not.toHaveProperty('motivoEstoque');
});
it('envia saldo alterado com motivo e aceita valor negativo sem perder campos', async () => {
  await act(async () => { r = create(React.createElement(FormularioProduto, { produto: p })); });
  await act(async () => campo('Estoque atual (un)').props.onChangeText('-0,5'));
  await act(async () => campo('Motivo do ajuste (opcional)').props.onChangeText('Contagem física'));
  await salvar();
  expect(m.editar.mock.calls[0]![1]).toMatchObject({ estoque: -500, estoqueObservado: 1000, motivoEstoque: 'Contagem física', nome: 'Arroz' });
});
