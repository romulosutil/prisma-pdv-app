import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Venda } from '@pdv/shared';
import { CarrinhoDuravel } from '../src/dados/carrinhoDuravel';
import type { PersistenciaCheckout, RegistroCheckout } from '../src/dados/checkoutTipos';

// Achados de UX do CP 148 (Android físico, 0.1.13).
const m = vi.hoisted(() => ({ operar: vi.fn(), obter: vi.fn(), estoque: vi.fn(), fiado: vi.fn(), registrar: vi.fn(), sincronizar: vi.fn() }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children) }; });
vi.mock('@/util/useVoltar', () => ({ useVoltar: () => vi.fn() }));
const sessao = { token: 'teste' };
const produto = { id: 'prod', nome: 'Arroz', precoCentavos: 500, unidade: 'un' };
const dados = { backend: { modo: 'http', obterEstoque: m.estoque, obterFiado: m.fiado }, conta: { obter: () => ({ sessao, identidade: { papel: 'dono' } }) }, pode: () => true, armazenamentoDaLoja: { obter: m.obter }, operacaoGestaoOnline: m.operar, registrarFiado: m.registrar, vendas: { cancelar: vi.fn() }, sincronizacao: { sincronizar: m.sincronizar } };
vi.mock('@/dados/hooks', () => ({ useDados: () => dados, useConta: () => ({ sessao }), useProdutos: () => ({ produtos: [produto] }), useCaixa: () => ({ caixa: { id: 'turno' } }), useVendas: () => ({ vendas: [] }) }));
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: any) => R.createElement('botao', p) }; });
vi.mock('@/componentes/Campo', async () => { const R = await import('react'); return { Campo: (p: any) => R.createElement('campo', p) }; });
vi.mock('@/componentes/CampoPreco', async () => { const R = await import('react'); return { CampoPreco: (p: any) => R.createElement('preco', p) }; });
vi.mock('@/componentes/Segmentado', async () => { const R = await import('react'); return { Segmentado: (p: any) => R.createElement('segmentado', p) }; });
vi.mock('@/componentes/Confirmacao', async () => { const R = await import('react'); return { Confirmacao: (p: any) => R.createElement('confirmacao', p) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: any) => R.createElement('texto', p, p.children) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: any) => R.createElement('tela', null, p.children) }; });
vi.mock('@/componentes/CabecalhoTela', async () => { const R = await import('react'); return { CabecalhoTela: (p: any) => R.createElement('cabecalho', p) }; });
import { Estoque } from '@/telas/gestao/Estoque';
import { Fiado } from '@/telas/gestao/Fiado';

let r: ReactTestRenderer;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const elementos = (tipo: string) => r.root.findAll(n => n.type === (tipo as any));
const botao = (rotulo: string) => elementos('botao').find(n => n.props.rotulo === rotulo)!;
const campo = (rotulo: string) => elementos('campo').find(n => n.props.rotulo === rotulo)!;
const texto = () => JSON.stringify(r.toJSON());
beforeEach(() => {
  vi.resetAllMocks(); m.obter.mockResolvedValue(null);
  m.estoque.mockResolvedValue({ saldos: [{ produtoId: 'prod', nome: 'Arroz', saldoMilesimos: 1000, minimoMilesimos: null, negativo: false }], movimentos: [] });
  m.fiado.mockResolvedValue({ clientes: [{ id: 'cli', nome: 'Maria', contato: '' }], titulos: [], eventos: [] }); m.sincronizar.mockResolvedValue(undefined);
});
afterEach(async () => { if (r) await act(async () => r.unmount()); });

async function prepararVendaFiada() {
  await act(async () => { r = create(React.createElement(Fiado)); });
  await act(async () => elementos('botao').find(n => n.props.rotulo.includes('Maria'))!.props.onPress());
  await act(async () => elementos('botao').find(n => n.props.rotulo.startsWith('Adicionar Arroz'))!.props.onPress());
}

describe('UX2/UX3: fiado e ajuste validam antes de abrir a folha', () => {
  it('UX3: o vencimento mostra um placeholder que não parece valor preenchido', async () => {
    await act(async () => { r = create(React.createElement(Fiado)); });
    expect(campo('Vencimento (DD/MM/AAAA)').props.placeholder).toBe('dd/mm/aaaa');
  });

  it('UX2: vencimento vazio não abre a folha e mostra aviso em português', async () => {
    await prepararVendaFiada();
    await act(async () => botao('Registrar venda fiada').props.onPress());
    expect(elementos('confirmacao')[0]!.props.visivel).toBe(false);
    expect(texto()).toContain('DD/MM/AAAA');
    expect(m.registrar).not.toHaveBeenCalled();
  });

  it('UX2: vencimento válido abre a folha e a confirmação grava a venda', async () => {
    await prepararVendaFiada();
    await act(async () => campo('Vencimento (DD/MM/AAAA)').props.onChangeText('30/11/2026'));
    await act(async () => botao('Registrar venda fiada').props.onPress());
    expect(elementos('confirmacao')[0]!.props.visivel).toBe(true);
    await act(async () => elementos('confirmacao')[0]!.props.onConfirmar());
    expect(m.registrar).toHaveBeenCalledOnce();
    expect(elementos('confirmacao')[0]!.props.visivel).toBe(false);
  });

  it('UX2: falha na confirmação fecha a folha para o erro ficar visível', async () => {
    await prepararVendaFiada();
    m.registrar.mockRejectedValueOnce(new Error('Falha simulada'));
    await act(async () => campo('Vencimento (DD/MM/AAAA)').props.onChangeText('30/11/2026'));
    await act(async () => botao('Registrar venda fiada').props.onPress());
    await act(async () => elementos('confirmacao')[0]!.props.onConfirmar());
    expect(elementos('confirmacao')[0]!.props.visivel).toBe(false);
    expect(texto()).toContain('Falha simulada');
  });

  it('UX2: recebimento de fiado sem motivo não abre a folha', async () => {
    m.fiado.mockResolvedValue({ clientes: [{ id: 'cli', nome: 'Maria', contato: '' }], titulos: [{ vendaId: 'v', clienteId: 'cli', saldoCentavos: 500, recebidoCentavos: 0, valorCentavos: 500, vencimento: '2026-12-01', vencido: false, cancelado: false }], eventos: [] });
    await act(async () => { r = create(React.createElement(Fiado)); });
    await act(async () => elementos('botao').find(n => n.props.rotulo.includes('Maria ·'))!.props.onPress());
    await act(async () => elementos('preco').find(n => n.props.rotulo === 'Valor recebido agora')!.props.onChange(200));
    await act(async () => botao('Registrar recebimento parcial ou total').props.onPress());
    expect(elementos('confirmacao')[0]!.props.visivel).toBe(false);
    expect(texto()).toContain('motivo');
    expect(m.operar).not.toHaveBeenCalled();
  });

  it('UX2: ajuste de estoque sem motivo não envia e mostra aviso em português', async () => {
    await act(async () => { r = create(React.createElement(Estoque)); });
    await act(async () => botao('Arroz').props.onPress());
    await act(async () => { elementos('segmentado')[0]!.props.onChange('ajuste'); campo('Quantidade em un ou kg').props.onChangeText('-1'); });
    await act(async () => botao('Registrar movimento').props.onPress());
    expect(m.operar).not.toHaveBeenCalled();
    expect(texto()).toContain('motivo');
    expect(texto()).not.toContain('Too small');
  });
});

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const item = { chave: 'linha-1', produtoId: null, descricao: 'Avulso', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, unidade: 'un' as const, ean: null };
const parcela = { meio: 'pix' as const, valorCentavos: 2500 };
class Fake implements PersistenciaCheckout {
  registro: RegistroCheckout | null = null;
  salvar = vi.fn(async (v: RegistroCheckout | null) => { this.registro = structuredClone(v); });
  carregar = vi.fn(async () => structuredClone(this.registro));
  concluir = vi.fn(async () => ({ id: id(5) }) as Venda);
}
function criar(fake: Fake) {
  const c = new CarrinhoDuravel(); let n = 7;
  c.configurar(fake, { novoId: () => id(n++), agora: () => '2026-11-16T12:00:00.000Z', caixaId: () => null }); return c;
}
const concluido = (): RegistroCheckout => ({ vendaId: id(5), criadaEm: '2026-11-16T12:00:00.000Z', caixaId: null, estado: { itens: [item], parcelas: [parcela], removido: null, concluidaId: id(5) } });

describe('UX1: reabrir o app não reapresenta a venda já concluída', () => {
  it('carrinho concluído e persistido é descartado ao carregar e uma nova venda começa vazia', async () => {
    const fake = new Fake(); fake.registro = concluido();
    const carrinho = criar(fake); await carrinho.carregar();
    expect(carrinho.obter().concluidaId).toBeNull(); expect(carrinho.obter().itens).toEqual([]);
    expect(fake.registro).toBeNull();
    await carrinho.adicionarAvulso(1000, 'Nova'); // antes: "Esta venda já foi concluída"
    expect(carrinho.obter().itens).toHaveLength(1); expect(fake.registro!.vendaId).not.toBe(id(5));
    expect(fake.concluir).not.toHaveBeenCalled();
  });

  it('venda em andamento (não concluída) continua restaurada, com itens e pagamento parcial', async () => {
    const fake = new Fake(); const andamento: RegistroCheckout = { vendaId: id(6), criadaEm: '2026-11-16T12:00:00.000Z', caixaId: null, estado: { itens: [item], parcelas: [{ meio: 'dinheiro', valorCentavos: 1000 }], removido: null, concluidaId: null } };
    fake.registro = structuredClone(andamento);
    const carrinho = criar(fake); await carrinho.carregar();
    expect(carrinho.obter()).toEqual(andamento.estado); expect(fake.registro).toEqual(andamento); expect(fake.salvar).not.toHaveBeenCalled();
  });

  it('não duplica: carregar de novo não conclui a venda outra vez', async () => {
    const fake = new Fake(); fake.registro = concluido();
    const carrinho = criar(fake); await carrinho.carregar(); await carrinho.carregar();
    expect(fake.concluir).not.toHaveBeenCalled(); expect(carrinho.obter().itens).toEqual([]);
  });

  it('se a limpeza falhar, preserva o estado concluído em vez de perder dados', async () => {
    const fake = new Fake(); fake.registro = concluido(); fake.salvar.mockRejectedValueOnce(new Error('falha'));
    const carrinho = criar(fake); await expect(carrinho.carregar()).rejects.toThrow('falha');
    expect(fake.registro).toEqual(concluido());
  });
});
