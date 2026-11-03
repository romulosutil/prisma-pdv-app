import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ editar: vi.fn(), criar: vi.fn(), push: vi.fn() }));
const produto = { id: 'p', nome: 'Arroz', precoCentavos: 1000, estoque: 5000, unidade: 'un' };
vi.mock('expo-router', () => ({ useIsFocused: () => true, useRouter: () => ({ push: m.push }) }));
vi.mock('react-native', () => ({ View: 'view', StyleSheet: { create: (s: any) => s } }));
vi.mock('@/tema', () => ({ cores: {} }));
vi.mock('@/dados/hooks', () => ({ useDados: () => ({ backend: { modo: 'http' } }), useProdutos: () => ({ buscarPorEan: () => produto, criar: m.criar, editar: m.editar }), useLicenca: () => ({ podeUsar: () => true }) }));
vi.mock('@/servicos/catalogoEan', () => ({ buscarNoCatalogo: () => ({ achou: false }), catalogoComApi: () => false, confirmarNoCatalogo: vi.fn() }));
vi.mock('@/util/useVoltar', () => ({ useVoltar: () => vi.fn() }));
vi.mock('@/componentes/Toast', () => ({ useToast: () => ({ mostrar: vi.fn() }) }));
vi.mock('@/componentes/TelaBase', () => ({ TelaBase: ({ children }: any) => children }));
vi.mock('@/componentes/BottomSheet', () => ({ BottomSheet: ({ visivel, children }: any) => visivel ? children : null }));
vi.mock('@/componentes/Scanner', () => ({ Scanner: 'scanner' }));
vi.mock('@/componentes/Botao', () => ({ Botao: 'botao' }));
vi.mock('@/componentes/Campo', () => ({ Campo: 'campo' }));
vi.mock('@/componentes/Texto', () => ({ Texto: 'texto' }));
vi.mock('@/componentes/Ilustra', () => ({ Ilustra: 'ilustra' }));
vi.mock('@/componentes/StatusPill', () => ({ StatusPill: 'status' }));
vi.mock('@/componentes/Stepper', () => ({ Stepper: 'stepper' }));
vi.mock('@/componentes/EntradaDeValor', () => ({ EntradaDeValor: 'valor' }));
import { CadastroRapido } from '@/telas/produtos/CadastroRapido';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('produto existente no conectado salva preço sem saldo absoluto e encaminha entrada à gestão', async () => {
  let r!: ReactTestRenderer; m.editar.mockResolvedValue(undefined);
  try {
    await act(async () => { r = create(React.createElement(CadastroRapido)); });
    await act(async () => r.root.findByType('scanner' as any).props.onLer('7894900010015'));
    expect(r.root.findAll(n => n.type === 'stepper' as any)).toHaveLength(0);
    await act(async () => r.root.findByType('valor' as any).props.onChange(1200));
    await act(async () => r.root.findAll(n => n.type === 'botao' as any).find(n => n.props.rotulo === 'Salvar')!.props.onPress());
    expect(m.editar).toHaveBeenCalledWith('p', { precoCentavos: 1200 });
    expect(m.criar).not.toHaveBeenCalled();
  } finally { if (r) await act(async () => r.unmount()); }
});
