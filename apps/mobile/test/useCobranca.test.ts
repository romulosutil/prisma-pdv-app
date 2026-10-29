import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Venda } from '@pdv/shared';
import type { PersistenciaCheckout, RegistroCheckout } from '../src/dados/checkoutTipos';

const ui = vi.hoisted(() => ({
  carrinho: null as any,
  replace: vi.fn(), dismissTo: vi.fn(), mostrar: vi.fn(), registrar: vi.fn(),
}));

// Adaptadores de UI simulados: este teste não executa React Native nem navegação real.
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (inicial: unknown) => [typeof inicial === 'function' ? inicial() : inicial, vi.fn()],
  useRef: (valor: unknown) => ({ current: valor }),
  useCallback: (funcao: unknown) => funcao,
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: ui.replace, dismissTo: ui.dismissTo }),
  useLocalSearchParams: () => ({ valor: '1000', dividir: '1' }),
}));
vi.mock('@/componentes/Toast', () => ({ useToast: () => ({ mostrar: ui.mostrar }) }));
vi.mock('@/dados/hooks', () => ({ useDados: () => ({ carrinho: ui.carrinho }) }));
vi.mock('@/diagnostico/registro', () => ({ registrar: ui.registrar }));
vi.mock('@/dados/carrinho', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/dados/carrinho')>(),
  useCarrinho: () => ({ restanteCentavos: 1000 }),
}));

import { CarrinhoDuravel } from '../src/dados/carrinhoDuravel';
import { totalDoCarrinho, valorRestante } from '../src/dados/carrinho';
import { useCobranca } from '../src/telas/pagar/useCobranca';

const vendaId = '00000000-0000-4000-8000-000000000005';
class PersistenciaFake implements PersistenciaCheckout {
  registro: RegistroCheckout | null = null;
  vendas: Venda[] = [];
  salvar = vi.fn(async (registro: RegistroCheckout | null) => { this.registro = structuredClone(registro); });
  carregar = vi.fn(async () => structuredClone(this.registro));
  concluir = vi.fn(async () => {
    if (!this.registro) throw new Error('Checkout ausente');
    const { itens, parcelas } = this.registro.estado;
    const total = totalDoCarrinho(itens);
    if (valorRestante(total, parcelas) !== 0) throw new Error('Pagamento incompleto');
    const existente = this.vendas.find((v) => v.id === this.registro!.vendaId);
    if (existente) return existente;
    const venda = { id: this.registro.vendaId, totalCentavos: total, pagamentos: structuredClone(parcelas) } as Venda;
    this.vendas.push(venda);
    this.registro = { ...this.registro, estado: { ...this.registro.estado, concluidaId: venda.id } };
    return venda;
  });
}

async function preparar() {
  const persistencia = new PersistenciaFake();
  const carrinho = new CarrinhoDuravel();
  carrinho.configurar(persistencia, { novoId: () => vendaId, agora: () => '2026-10-28T12:00:00.000Z', caixaId: () => null });
  await carrinho.adicionarAvulso(2500, 'Venda');
  await carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1500 });
  ui.carrinho = carrinho;
  return { persistencia, carrinho, cobranca: useCobranca() };
}

beforeEach(() => { vi.clearAllMocks(); ui.carrinho = null; });

describe('useCobranca com adaptadores de UI simulados', () => {
  it('retenta a conclusão sem registrar novamente a parcela final já salva', async () => {
    const { persistencia, carrinho, cobranca } = await preparar();
    persistencia.concluir.mockRejectedValueOnce(new Error('falha na conclusão'));
    await cobranca.receber({ meio: 'dinheiro' });
    expect(carrinho.obter().parcelas.map((p) => p.valorCentavos)).toEqual([1500, 1000]);
    expect(totalDoCarrinho(carrinho.obter().itens)).toBe(2500);
    expect(carrinho.obter().concluidaId).toBeNull();
    expect(ui.replace).not.toHaveBeenCalled();
    expect(ui.mostrar).toHaveBeenCalledWith('falha na conclusão', { tipo: 'erro' });
    const saves = persistencia.salvar.mock.calls.length;
    await cobranca.receber({ meio: 'dinheiro' });
    expect(persistencia.salvar).toHaveBeenCalledTimes(saves);
    expect(carrinho.obter().parcelas.map((p) => p.valorCentavos)).toEqual([1500, 1000]);
    expect(carrinho.obter().concluidaId).toBe(vendaId);
    expect(persistencia.vendas).toHaveLength(1);
    expect(persistencia.vendas[0]).toMatchObject({ id: vendaId, totalCentavos: 2500, pagamentos: [{ valorCentavos: 1500 }, { valorCentavos: 1000 }] });
    expect(ui.replace).toHaveBeenCalledOnce();
    expect(ui.replace).toHaveBeenCalledWith({ pathname: '/pagar/sucesso', params: { venda: vendaId } });
  });

  it('não navega se salvar a parcela falhar e permite nova tentativa', async () => {
    const { persistencia, carrinho, cobranca } = await preparar();
    persistencia.salvar.mockRejectedValueOnce(new Error('falha na parcela'));
    await cobranca.receber({ meio: 'dinheiro' });
    expect(carrinho.obter().parcelas.map((p) => p.valorCentavos)).toEqual([1500]);
    expect(carrinho.obter().concluidaId).toBeNull();
    expect(persistencia.vendas).toHaveLength(0);
    expect(ui.replace).not.toHaveBeenCalled();
    expect(ui.mostrar).toHaveBeenCalledWith('falha na parcela', { tipo: 'erro' });
    await cobranca.receber({ meio: 'dinheiro' });
    expect(carrinho.obter().parcelas.map((p) => p.valorCentavos)).toEqual([1500, 1000]);
    expect(carrinho.obter().concluidaId).toBe(vendaId);
    expect(persistencia.vendas).toHaveLength(1);
    expect(persistencia.vendas[0]).toMatchObject({ id: vendaId, totalCentavos: 2500 });
    expect(ui.replace).toHaveBeenCalledOnce();
    expect(ui.replace).toHaveBeenCalledWith({ pathname: '/pagar/sucesso', params: { venda: vendaId } });
  });
});
