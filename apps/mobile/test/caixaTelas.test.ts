import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ listar: vi.fn(), operar: vi.fn(), repetir: vi.fn(), obter: vi.fn(), registrar: vi.fn(), fechar: vi.fn(), toast: vi.fn(), retirar: false, rota: 'retirada' }));
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), useLocalSearchParams: () => ({ tipo: m.rota }) }));
vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn() }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children), StyleSheet: { create: (s: any) => s } }; });
vi.mock('@/tema', () => ({ cores: { ink2: 'ink', surface: 's', folha: 'f', folhaSoft: 'f', anil: 'a', anilSoft: 'a', pitanga: 'p', pitangaSoft: 'p' }, raio: { md: 8 } }));
vi.mock('@/util/useVoltar', () => ({ useVoltar: () => vi.fn() }));
const sessao = { token: 'teste' };
const dados = { backend: { modo: 'http', listarCaixas: m.listar }, conta: { obter: () => ({ sessao }) }, pode: (p: string) => p === 'conferir_caixas' || (p === 'retirar_dinheiro' && m.retirar), armazenamentoDaLoja: { obter: m.obter }, operacaoCaixaOnline: m.operar, repetirOperacaoCaixaPendente: m.repetir };
vi.mock('@/dados/hooks', () => ({ useDados: () => dados, useConta: () => ({ sessao, identidade: { operadorId: 'gerente', aparelhoId: 'aparelho' } }), useCaixa: () => ({ caixa: { id: 'caixa', movimentos: [] }, registrarMovimento: m.registrar, fechar: m.fechar }), useResumoDoDia: () => ({ esperadoNaGavetaCentavos: 1000 }), useLicenca: () => ({ podeUsar: () => true }) }));
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: any) => R.createElement('botao', p) }; });
vi.mock('@/componentes/Campo', async () => { const R = await import('react'); return { Campo: (p: any) => R.createElement('campo', p) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: any) => R.createElement('texto', p, p.children) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: any) => R.createElement('tela', null, p.children) }; });
vi.mock('@/componentes/CabecalhoTela', async () => { const R = await import('react'); return { CabecalhoTela: (p: any) => R.createElement('cabecalho', p) }; });
vi.mock('@/componentes/Segmentado', async () => { const R = await import('react'); return { Segmentado: (p: any) => R.createElement('segmentado', p) }; });
vi.mock('@/componentes/Confirmacao', async () => { const R = await import('react'); return { Confirmacao: (p: any) => R.createElement('confirmacao', p) }; });
vi.mock('@/componentes/Banner', () => ({ Banner: () => null }));
vi.mock('@/componentes/Icone', () => ({ Icone: () => null }));
vi.mock('@/componentes/Toast', () => ({ useToast: () => ({ mostrar: m.toast }) }));
vi.mock('@/telas/caixa/icones', () => ({ IconeCaixa: () => null }));
vi.mock('@/telas/caixa/LinhaValor', () => ({ LinhaValor: () => null }));
vi.mock('@/telas/caixa/TelaDeValor', async () => { const R = await import('react'); return { TelaDeValor: (p: any) => R.createElement('valor', p, p.depois) }; });
import { TurnosCaixa } from '@/telas/caixa/TurnosCaixa';
import { MovimentoDeCaixa } from '@/telas/caixa/MovimentoDeCaixa';
import { FecharCaixa } from '@/telas/caixa/FecharCaixa';

let r: ReactTestRenderer;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const elementos = (tipo: string) => r.root.findAll(n => n.type === (tipo as any));
const botao = (rotulo: string) => elementos('botao').find(n => n.props.rotulo === rotulo)!;
const campo = (rotulo: string) => elementos('campo').find(n => n.props.rotulo === rotulo)!;
beforeEach(() => { vi.resetAllMocks(); m.retirar = false; m.rota = 'retirada'; m.obter.mockResolvedValue(null); m.listar.mockResolvedValue([]); });
afterEach(async () => { if (r) await act(async () => r.unmount()); });

it('saída sem permissão explica a autorização e não confirma uma retirada', async () => {
  await act(async () => { r = create(React.createElement(MovimentoDeCaixa)); });
  await act(async () => elementos('valor')[0]!.props.onChange(100));
  await act(async () => elementos('valor')[0]!.props.acao.onPress());
  expect(elementos('valor')[0]!.props.erro).toContain('exige autorização');
  expect(m.registrar).not.toHaveBeenCalled();
});

it('gerente seleciona Ana, vê os movimentos e registra intervenção no turno escolhido com motivo', async () => {
  m.listar.mockResolvedValue([{ caixa: { id: 'turno-ana', operadorId: 'ana', aparelhoId: 'a', abertura: {}, fechamento: null, movimentos: [{ id: 'evento', tipo: 'retirada', valorCentavos: 100, motivo: 'Despesa', autorOperadorId: 'gerente', responsavelOperadorId: 'ana', aprovadorId: 'gerente' }] }, nomeOperador: 'Ana', saldoCentavos: 900, auditoria: [] }]);
  m.operar.mockResolvedValue({ id: 'confirmacao' });
  await act(async () => { r = create(React.createElement(TurnosCaixa)); });
  await act(async () => botao('Selecionar turno de Ana').props.onPress());
  expect(JSON.stringify(r.toJSON())).toContain('Responsável: ana');
  await act(async () => { campo('Valor (R$)').props.onChangeText('2,00'); campo('Motivo').props.onChangeText('Despesa autorizada'); campo('Origem/destino e responsável pelo recebimento').props.onChangeText('Fornecedor'); });
  await act(async () => botao('Registrar movimento online').props.onPress());
  expect(m.operar).toHaveBeenCalledWith('movimento', { caixaId: 'turno-ana', tipo: 'retirada', valorCentavos: 200, motivo: 'Despesa autorizada', categoria: 'despesa', destino: 'Fornecedor' });
  expect(JSON.stringify(r.toJSON())).toContain('Operação confirmada');
});

it('fechamento informa confirmação pendente e registra a destinação separada da contagem', async () => {
  await act(async () => { r = create(React.createElement(FecharCaixa)); });
  await act(async () => { elementos('valor')[0]!.props.onChange(950); campo('Troco que permanece na gaveta (R$)').props.onChangeText('2,50'); });
  await act(async () => elementos('valor')[0]!.props.acao.onPress());
  expect(elementos('confirmacao')[0]!.props.texto).toContain('servidor precisa confirmar');
  await act(async () => elementos('confirmacao')[0]!.props.onConfirmar());
  expect(m.fechar).toHaveBeenCalledWith(950, 250);
  expect(m.toast).toHaveBeenCalledWith(expect.stringContaining('Sincronize para confirmar'), { tipo: 'sucesso' });
});
