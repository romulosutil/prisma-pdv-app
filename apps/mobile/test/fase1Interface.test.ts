import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ui = vi.hoisted(() => ({
  push: vi.fn(),
  provider: vi.fn(),
  params: { provedor: 'mercadopago', valor: '1000', dividir: '1' },
}));
vi.hoisted(() => { (globalThis as any).__DEV__ = false; });

vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (value: unknown) => [typeof value === 'function' ? (value as () => unknown)() : value, vi.fn()],
  useEffect: vi.fn(),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: ui.push }),
  useLocalSearchParams: () => ui.params,
  Redirect: 'Redirect',
}));
vi.mock('react-native', () => ({
  View: 'View', Pressable: 'Pressable', StyleSheet: { create: (s: unknown) => s },
  DevSettings: { reload: vi.fn() }, Platform: { OS: 'web' },
}));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));
vi.mock('@/dados/carrinho', () => ({
  useCarrinho: () => ({ totalCentavos: 2500, pagoCentavos: 0, restanteCentavos: 2500, parcelas: [], quantidade: 1, itens: [] }),
  metadeDoValor: (n: number) => Math.floor(n / 2),
  rotuloDaQuantidade: () => '1',
}));
vi.mock('@/tema', () => ({ cores: {}, raio: {}, textoBotao: {} }));
vi.mock('@/tema/useFoco', () => ({ useFoco: () => ({}) }));
vi.mock('@/componentes/Banner', () => ({ Banner: 'Banner' }));
vi.mock('@/componentes/Botao', () => ({ Botao: 'Botao' }));
vi.mock('@/componentes/CabecalhoEtapa', () => ({ CabecalhoEtapa: 'CabecalhoEtapa' }));
vi.mock('@/componentes/Chip', () => ({ Chip: 'Chip' }));
vi.mock('@/componentes/Dinheiro', () => ({ Dinheiro: 'Dinheiro' }));
vi.mock('@/componentes/Icone', () => ({ Icone: 'Icone' }));
vi.mock('@/componentes/TelaBase', () => ({ TelaBase: 'TelaBase' }));
vi.mock('@/componentes/Texto', () => ({ Texto: 'Texto' }));
vi.mock('@/componentes/Interruptor', () => ({ Interruptor: 'Interruptor' }));
vi.mock('@/componentes/LinhaLista', () => ({ LinhaLista: 'LinhaLista' }));
vi.mock('@/componentes/Secao', () => ({ Secao: 'Secao' }));
vi.mock('@/componentes/Segmentado', () => ({ Segmentado: 'Segmentado' }));
vi.mock('@/componentes/StatusPill', () => ({ StatusPill: 'StatusPill' }));
vi.mock('@/componentes/TilePagamento', () => ({ TilePagamento: 'TilePagamento' }));
vi.mock('@/dados/hooks', () => ({
  useAssinatura: () => ({ assinatura: null }),
  useConta: () => ({ perfil: null, primeiroNome: 'Ana' }),
  useDados: () => ({}),
  usePreferencias: () => ({
    preferencias: { conectados: { mercadopago: true, infinitepay: true } },
    alterar: vi.fn(), definirConexao: ui.provider,
  }),
}));
vi.mock('@/diagnostico/registro', () => ({ registrar: vi.fn(), salvarAgora: vi.fn() }));
vi.mock('@/util/ferramentasTeste', () => ({ FERRAMENTAS_TESTE: false }));
vi.mock('@/servicos/provedoresPagamento', () => ({ provedoresPagamento: new Proxy({}, { get: () => ui.provider }) }));
vi.mock('../src/telas/pagar/useCobranca', () => ({ useCobranca: () => ({ finalizar: vi.fn(), ocupado: false }) }));
vi.mock('../src/telas/pagar/PixEstatico', () => ({ PixEstatico: 'PixEstatico' }));
vi.mock('../src/telas/pagar/CabecalhoPagamento', () => ({ CabecalhoPagamento: 'CabecalhoPagamento' }));
vi.mock('../src/telas/pagar/FolhaValorParte', () => ({ FolhaValorParte: 'FolhaValorParte' }));

import { TelaCheckout } from '../src/telas/pagar/TelaCheckout';
import { TelaDividir } from '../src/telas/pagar/TelaDividir';
import { TelaPix } from '../src/telas/pagar/TelaPix';
import { TelaPixPago } from '../src/telas/pagar/TelaPixPago';
import { TelaTap } from '../src/telas/pagar/TelaTap';
import { TelaTapFalha } from '../src/telas/pagar/TelaTapFalha';
import { PLANOS } from '@pdv/shared';
import { destaquesDoPlano } from '../src/util/planos';
import Ajustes from '../app/(tabs)/ajustes/index';
import Pagamentos from '../app/(onboarding)/pagamentos';

function elementos(node: React.ReactNode): React.ReactElement<any>[] {
  if (!React.isValidElement<any>(node)) return [];
  const elemento = node as React.ReactElement<{ children?: React.ReactNode }>;
  return [elemento, ...React.Children.toArray(elemento.props.children).flatMap(elementos)];
}

beforeEach(() => vi.clearAllMocks());

describe('cobrança manual na interface', () => {
  it('oferece Pix, cartão, dinheiro e divisão no checkout', () => {
    const tiles = elementos(TelaCheckout()).filter((e) => e.type === TileMeio);
    expect(tiles.map((e) => e.props.titulo)).toEqual(['Pix', 'Cartão', 'Dinheiro', 'Dividir pagamento']);
    tiles[0]!.props.onPress();
    expect(ui.push).toHaveBeenCalledWith('/pagar/pix');
  });

  it('mantém as opções manuais na divisão e encaminha o valor escolhido', () => {
    const opcoes = elementos(TelaDividir()).filter((e) => e.props.rotulo && e.props.icone);
    const pix = opcoes.find((e) => e.props.rotulo === 'Pix')!;
    expect(opcoes.map((e) => e.props.rotulo)).toEqual(['Pix', 'Cartão', 'Dinheiro']);
    pix.props.onPress();
    expect(ui.push).toHaveBeenCalledWith({ pathname: '/pagar/pix', params: { valor: '1250', dividir: '1' } });
  });

  it('ignora o provedor em rotas diretas e não inicia simulador', () => {
    expect(TelaPix().type).toBe('PixEstatico');
    for (const tela of [TelaTap, TelaTapFalha, TelaPixPago]) {
      const destino = tela();
      expect(destino.type).toBe('Redirect');
      expect(destino.props.href).toBe('/pagar');
    }
    expect(ui.provider).not.toHaveBeenCalled();
  });

  it('não oferece conexões nos ajustes mesmo com preferências antigas conectadas', () => {
    const elementosAjustes = elementos(Ajustes());
    const recebimentos = elementosAjustes.filter((e) => e.type === 'TilePagamento');
    expect(recebimentos.map((e) => e.props.titulo)).toEqual(['Pix', 'Cartão', 'Dinheiro']);
    expect(elementosAjustes.some((e) => e.props.rotuloGrupo === 'Pix sai por padrão em')).toBe(false);
    expect(ui.provider).not.toHaveBeenCalled();
  });

  it('não anuncia integrações e recursos avançados nos destaques', () => {
    for (const plano of Object.values(PLANOS)) {
      expect(destaquesDoPlano(plano).join(' ')).not.toMatch(/tap|automátic|fiado|lojas/i);
    }
  });

  it('apresenta somente meios manuais no onboarding, sem conectar provedores', () => {
    const tiles = elementos(Pagamentos()).filter((e) => e.type === 'TilePagamento');
    expect(tiles.map((e) => [e.props.titulo, e.props.estado, e.props.onPress])).toEqual([
      ['Pix', 'sempre_ativo', undefined], ['Cartão', 'sempre_ativo', undefined], ['Dinheiro', 'sempre_ativo', undefined],
    ]);
    expect(ui.provider).not.toHaveBeenCalled();
  });
});

import { TileMeio } from '../src/telas/pagar/TileMeio';
