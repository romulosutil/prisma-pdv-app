import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { gerarId, montarRelatorio } from '@pdv/shared';

const m = vi.hoisted(() => ({ operar: vi.fn(), repetir: vi.fn(), obter: vi.fn(), estoque: vi.fn(), fiado: vi.fn(), lojas: vi.fn(), caixas: vi.fn(), relatorio: vi.fn(), compartilhar: vi.fn(), push: vi.fn(), registrar: vi.fn(), cancelar: vi.fn(), pode: true }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children) }; });
vi.mock('@/util/useVoltar', () => ({ useVoltar: () => vi.fn() }));
vi.mock('@/telas/caixa/compartilhar', () => ({ compartilharCsv: m.compartilhar }));
const sessao = { token: 'teste' };
const dados = { backend: { modo: 'http', obterEstoque: m.estoque, obterFiado: m.fiado, listarLojas: m.lojas, listarCaixas: m.caixas, obterRelatorio: m.relatorio }, conta: { obter: () => ({ sessao, identidade: { papel: 'dono' } }) }, pode: () => m.pode, armazenamentoDaLoja: { obter: m.obter }, operacaoGestaoOnline: m.operar, repetirOperacaoGestaoPendente: m.repetir, registrarFiado: m.registrar, vendas: { cancelar: m.cancelar }, sincronizacao: { sincronizar: vi.fn() }, relogio: { agora: () => new Date('2026-11-02T12:00:00Z') } };
vi.mock('@/dados/hooks', () => ({ useDados: () => dados, useConta: () => ({ sessao }), useProdutos: () => ({ produtos: [] }), useCaixa: () => ({ caixa: { id: 'turno-receptor' } }), useVendas: () => ({ vendas: [] }) }));
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: any) => R.createElement('botao', p) }; });
vi.mock('@/componentes/Campo', async () => { const R = await import('react'); return { Campo: (p: any) => R.createElement('campo', p) }; });
vi.mock('@/componentes/CampoPreco', async () => { const R = await import('react'); return { CampoPreco: (p: any) => R.createElement('preco', p) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: any) => R.createElement('texto', p, p.children) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: any) => R.createElement('tela', null, p.children) }; });
vi.mock('@/componentes/CabecalhoTela', async () => { const R = await import('react'); return { CabecalhoTela: (p: any) => R.createElement('cabecalho', p) }; });
vi.mock('@/componentes/Segmentado', async () => { const R = await import('react'); return { Segmentado: (p: any) => R.createElement('segmentado', p) }; });
vi.mock('@/componentes/Confirmacao', async () => { const R = await import('react'); return { Confirmacao: (p: any) => R.createElement('confirmacao', p) }; });
import { Estoque } from '@/telas/gestao/Estoque';
import { Fiado } from '@/telas/gestao/Fiado';
import { Relatorios } from '@/telas/gestao/Relatorios';
import { Lojas } from '@/telas/gestao/Lojas';

let r: ReactTestRenderer;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const elementos = (tipo: string) => r.root.findAll(n => n.type === (tipo as any));
const botao = (rotulo: string) => elementos('botao').find(n => n.props.rotulo === rotulo)!;
const campo = (rotulo: string) => elementos('campo').find(n => n.props.rotulo === rotulo)!;
beforeEach(() => { vi.resetAllMocks(); m.pode = true; m.obter.mockResolvedValue(null); m.estoque.mockResolvedValue({ saldos: [], movimentos: [] }); m.fiado.mockResolvedValue({ clientes: [], titulos: [], eventos: [] }); m.lojas.mockResolvedValue([]); m.caixas.mockResolvedValue([]); m.compartilhar.mockResolvedValue('compartilhado'); });
afterEach(async () => { if (r) await act(async () => r.unmount()); });

it('ajuste usa diferença assinada com motivo e expõe saldo negativo e retomada de comando', async () => {
  m.obter.mockResolvedValue({ acao: 'estoque' });
  m.estoque.mockResolvedValue({ saldos: [{ produtoId: 'p', nome: 'Arroz', saldoMilesimos: -1000, minimoMilesimos: 0, negativo: true }], movimentos: [] });
  await act(async () => { r = create(React.createElement(Estoque)); });
  expect(JSON.stringify(r.toJSON())).toContain('DIVERGÊNCIA');
  await act(async () => botao('Arroz').props.onPress());
  await act(async () => elementos('segmentado')[0]!.props.onChange('ajuste'));
  await act(async () => { campo('Quantidade em un ou kg').props.onChangeText('-2,5'); campo('Motivo do movimento').props.onChangeText('Contagem física'); });
  await act(async () => botao('Registrar movimento').props.onPress());
  expect(m.operar).toHaveBeenCalledWith('estoque', { produtoId: 'p', tipo: 'ajuste', quantidadeMilesimos: -2500, motivo: 'Contagem física' });
  await act(async () => botao('Confirmar operação de gestão pendente').props.onPress());
  expect(m.repetir).toHaveBeenCalledOnce();
});

it('recebimento parcial de fiado confirma antes de creditar o turno atual e mostra vencimento', async () => {
  m.fiado.mockResolvedValue({ clientes: [{ id: 'cliente', nome: 'João', contato: '' }], titulos: [{ vendaId: 'v', clienteId: 'cliente', saldoCentavos: 500, recebidoCentavos: 0, valorCentavos: 500, vencimento: '2026-11-01', vencido: true, cancelado: false }], eventos: [] });
  await act(async () => { r = create(React.createElement(Fiado)); });
  const titulo = elementos('botao').find(n => n.props.rotulo.includes('João ·') && n.props.rotulo.includes('Vencido'))!;
  await act(async () => titulo.props.onPress());
  await act(async () => { elementos('preco').find(n => n.props.rotulo === 'Valor recebido agora')!.props.onChange(200); campo('Motivo ou observação do recebimento/correção').props.onChangeText('Recebido no balcão'); });
  await act(async () => botao('Registrar recebimento parcial ou total').props.onPress());
  expect(m.operar).not.toHaveBeenCalled();
  expect(elementos('confirmacao')[0]!.props.texto).toContain('turno');
  await act(async () => elementos('confirmacao')[0]!.props.onConfirmar());
  expect(m.operar).toHaveBeenCalledWith('recebimento', { vendaId: 'v', valorCentavos: 200, meio: 'dinheiro', caixaId: 'turno-receptor', motivo: 'Recebido no balcão' });
});

it('CSV exporta o resultado exibido mesmo se o usuário editar filtros sem gerar outro relatório', async () => {
  const lojaId = gerarId(), operadorId = gerarId();
  const relatorio = montarRelatorio([{ id: 'evento', lojaId, operadorId, caixaId: null, em: '2026-11-02T12:00:00.000Z', categoria: 'venda', meio: 'dinheiro', valorCentavos: 500, descricao: 'Arroz' }], { inicio: '2026-11-02T03:00:00.000Z', fim: '2026-11-03T03:00:00.000Z', lojaId }, '2026-11-02T13:00:00.000Z');
  m.relatorio.mockResolvedValue(relatorio);
  await act(async () => { r = create(React.createElement(Relatorios)); });
  await act(async () => botao('Gerar relatório com estes filtros').props.onPress());
  expect(m.relatorio).toHaveBeenCalledWith({ inicio: '2026-11-02T03:00:00.000Z', fim: '2026-11-03T03:00:00.000Z' }, 'teste');
  await act(async () => campo('Data inicial (DD/MM/AAAA)').props.onChangeText('01/10/2026'));
  await act(async () => botao('Exportar este resultado em CSV').props.onPress());
  const conteudo = m.compartilhar.mock.calls[0]![1];
  expect(conteudo).toContain('2026-11-02T03:00:00.000Z'); expect(conteudo).not.toContain('2026-10-01');
  expect(m.relatorio).toHaveBeenCalledOnce();
});

it('nova loja usa comando durável e seleção encaminha ao acesso pessoal', async () => {
  await act(async () => { r = create(React.createElement(Lojas)); });
  await act(async () => campo('Nome da nova loja').props.onChangeText('Filial Centro'));
  await act(async () => botao('Cadastrar loja').props.onPress());
  expect(m.operar).toHaveBeenCalledWith('loja', { nome: 'Filial Centro' });
  await act(async () => botao('Selecionar loja com meu acesso pessoal').props.onPress());
  expect(m.push).toHaveBeenCalledWith('/entrar');
});

it('falha ao ler pendência na montagem e no finally é visível sem rejeição não tratada', async () => {
  m.obter.mockRejectedValue(new Error('armazenamento indisponível'));
  await act(async () => { r = create(React.createElement(Lojas)); });
  expect(JSON.stringify(r.toJSON())).toContain('Não foi possível consultar a operação local');
  await act(async () => campo('Nome da nova loja').props.onChangeText('Filial'));
  await act(async () => botao('Cadastrar loja').props.onPress());
  expect(m.operar).toHaveBeenCalledOnce();
  expect(JSON.stringify(r.toJSON())).toContain('Não foi possível consultar a operação local');
  expect(botao('Cadastrar loja').props.carregando).toBe(false);
});

it('lista grande de produtos não monta todos os botões de seleção e permite alcançar a última página', async () => {
  const clientes = Array.from({ length: 1000 }, (_, n) => ({ id: `c${n}`, nome: `Cliente ${n}`, contato: '' }));
  m.fiado.mockResolvedValue({ clientes, titulos: [], eventos: [] });
  await act(async () => { r = create(React.createElement(Fiado)); });
  expect(elementos('botao').filter(n => n.props.rotulo.includes('Cliente '))).toHaveLength(25);
  for (let n = 0; n < 39; n++) await act(async () => botao('Próxima página').props.onPress());
  expect(JSON.stringify(r.toJSON())).toContain('Cliente 999');
  expect(elementos('botao').filter(n => n.props.rotulo.includes('Cliente '))).toHaveLength(25);
});
