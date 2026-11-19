import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { codigoCurto, MOTIVOS_CONFIRMACAO_MANUAL, rotuloPapel } from '@pdv/shared';

const mocks = vi.hoisted(() => ({
  receber: vi.fn().mockResolvedValue(undefined),
  criarCobrancaIntegrada: vi.fn(),
  acompanharCobrancaIntegrada: vi.fn(),
  cancelarCobrancaIntegrada: vi.fn(),
  toast: vi.fn(),
  conectados: { infinitepay: true, mercadopago: false },
}));

vi.mock('react-native', async () => {
  const R = await import('react');
  const el = (n: string) => (p: any) => R.createElement(n, p, p.children);
  return {
    View: el('view'),
    Pressable: el('pressable'),
    StyleSheet: { create: (s: unknown) => s },
    Platform: { OS: 'android' },
    NativeModules: {},
    Linking: { openURL: vi.fn().mockResolvedValue(undefined) },
    useWindowDimensions: () => ({ width: 360, height: 640, fontScale: 2 }),
  };
});

vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn().mockResolvedValue(undefined) }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }) }));
vi.mock('@/tema', () => ({
  cores: {
    bg: '#FFF',
    surface: '#F4',
    surface2: '#E4',
    ink: '#14112B',
    ink2: '#4A',
    ink3: '#5C',
    line: '#E4',
    anil: '#1D',
    anilSoft: '#E8',
    manga: '#F5',
    mangaSoft: '#FE',
    folha: '#0E',
    folhaSoft: '#E6',
    ambar: '#D9',
    ambarSoft: '#FF',
    pitanga: '#D92',
    pitangaSoft: '#FD',
  },
  raio: { sm: 8, md: 12, lg: 20 },
  texto: { corpo: {}, corpoMedio: {}, corpoL: {}, legenda: {}, codigo: {}, tituloM: {}, tituloXL: {} },
  textoBotao: { L: {}, M: {}, S: {} },
  textoTeclado: {},
}));
vi.mock('@/tema/useFoco', () => ({ useFoco: () => ({ aoFocar: vi.fn(), aoDesfocar: vi.fn(), anel: {} }) }));
vi.mock('@/componentes/Botao', async () => {
  const R = await import('react');
  return { Botao: (p: any) => R.createElement('botao', p) };
});
vi.mock('@/componentes/Banner', async () => {
  const R = await import('react');
  return { Banner: (p: any) => R.createElement('banner', p) };
});
vi.mock('@/componentes/Campo', async () => {
  const R = await import('react');
  return { Campo: (p: any) => R.createElement('campo', p) };
});
vi.mock('@/componentes/Chip', async () => {
  const R = await import('react');
  return { Chip: (p: any) => R.createElement('chip', p) };
});
vi.mock('@/componentes/Dinheiro', async () => {
  const R = await import('react');
  return { Dinheiro: (p: any) => R.createElement('dinheiro', p) };
});
vi.mock('@/componentes/Segmentado', async () => {
  const R = await import('react');
  return { Segmentado: (p: any) => R.createElement('segmentado', p) };
});
vi.mock('@/componentes/TelaBase', async () => {
  const R = await import('react');
  return { TelaBase: (p: any) => R.createElement('tela', null, p.children, p.rodape) };
});
vi.mock('@/componentes/Texto', async () => {
  const R = await import('react');
  return { Texto: (p: any) => R.createElement('texto', p, p.children) };
});
vi.mock('@/componentes/Toast', () => ({ useToast: () => ({ mostrar: mocks.toast }) }));
vi.mock('@/componentes/Icone', () => ({ Icone: () => null }));
vi.mock('@/componentes/Ilustra', async () => {
  const R = await import('react');
  return { Ilustra: (p: any) => R.createElement('ilustra', p) };
});
vi.mock('@/util/dinheiroFalado', () => ({ falarDinheiro: (n: number) => `${n} centavos` }));
vi.mock('../src/telas/pagar/CabecalhoPagamento', () => ({ CabecalhoPagamento: () => null }));
vi.mock('../src/telas/pagar/CartaoQr', () => ({ CartaoQr: () => null }));
vi.mock('../src/telas/pagar/useCobranca', () => ({
  useCobranca: () => ({
    valorCentavos: 4990,
    dividindo: false,
    ocupado: false,
    receber: mocks.receber,
    parametros: vi.fn(),
  }),
}));
vi.mock('@/dados/hooks', () => ({
  useConta: () => ({ nomeLoja: 'Loja Teste' }),
  useDados: () => ({
    backend: {
      modo: 'http',
      criarCobrancaIntegrada: mocks.criarCobrancaIntegrada,
      acompanharCobrancaIntegrada: mocks.acompanharCobrancaIntegrada,
      cancelarCobrancaIntegrada: mocks.cancelarCobrancaIntegrada,
    },
    carrinho: { vendaIdAtual: () => '00000000-0000-4000-8000-000000000001' },
  }),
  usePreferencias: () => ({ preferencias: { conectados: mocks.conectados } }),
}));

import { Cartao } from '@/componentes/Cartao';
import { Divisor } from '@/componentes/Divisor';
import { EstadoVazio } from '@/componentes/EstadoVazio';
import {
  gerenciarAssinaturaPlayUrl,
  iniciarAssinaturaPlay,
  playBillingDisponivel,
  restaurarComprasPlay,
} from '@/servicos/playBilling';
import { rotuloDaParcela } from '../src/telas/pagar/rotulos';
import { TelaCartao } from '../src/telas/pagar/TelaCartao';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks();
});

describe('Etapa 2 Solar Balcão, Cartão identificado e Google Play Billing', () => {
  it('formata rótulos legíveis e código curto', () => {
    expect(rotuloPapel('dono')).toBe('Dono');
    expect(codigoCurto('12345678-1234-4123-8123-abcdef123456')).toBe('#3456');
    expect(rotuloDaParcela({ meio: 'cartao_credito', provedor: 'stone', maquininha: 'Stone S920' })).toBe(
      'Cartão de crédito · Stone S920',
    );
    expect(MOTIVOS_CONFIRMACAO_MANUAL.stone).toContain('Stone');
  });

  it('TelaCartao registra Stone manual identificado com NSU e motivo documental e valida NSU no InfiniteTap', async () => {
    await act(async () => {
      renderer = create(React.createElement(TelaCartao));
    });

    const chipStone = renderer.root.findAllByType('chip' as any).find((c) => c.props.rotulo === 'Stone')!;
    await act(async () => chipStone.props.onPress());

    const campoNsu = renderer.root
      .findAllByType('campo' as any)
      .find((c) => c.props.rotulo.includes('NSU'))!;
    await act(async () => campoNsu.props.onChangeText('NSU-STONE-777'));

    const botaoAprovar = renderer.root
      .findAllByType('botao' as any)
      .find((b) => b.props.rotulo === 'Aprovado na maquininha')!;
    await act(async () => botaoAprovar.props.onPress());

    expect(mocks.receber).toHaveBeenCalledWith({
      meio: 'cartao_credito',
      provedor: 'stone',
      confirmacao: 'manual',
      identificadorExterno: 'NSU-STONE-777',
      maquininha: 'Stone',
    });

    // Alternar para InfinitePay -> InfiniteTap exige NSU obrigatório
    const chipIp = renderer.root.findAllByType('chip' as any).find((c) => c.props.rotulo === 'InfinitePay')!;
    await act(async () => chipIp.props.onPress());
    await act(async () => renderer.root.findByType('segmentado' as any).props.onChange('tap'));
    const campoTapNsu = renderer.root
      .findAllByType('campo' as any)
      .find((c) => c.props.rotulo.includes('InfiniteTap'))!;
    await act(async () => campoTapNsu.props.onChangeText(''));

    const botaoTap = renderer.root
      .findAllByType('botao' as any)
      .find((b) => b.props.rotulo === 'Aprovado no InfiniteTap')!;
    await act(async () => botaoTap.props.onPress());
    expect(mocks.receber).toHaveBeenCalledTimes(1);

    await act(async () => campoTapNsu.props.onChangeText('NSU-TAP-999'));
    await act(async () => botaoTap.props.onPress());
    expect(mocks.receber).toHaveBeenLastCalledWith({
      meio: 'tap',
      provedor: 'infinitepay',
      confirmacao: 'aparelho',
      identificadorExterno: 'NSU-TAP-999',
      maquininha: 'InfiniteTap',
    });
  });

  it('monta os átomos Solar Balcão e integra ponte injetada da Google Play Billing', async () => {
    await act(async () => {
      renderer = create(
        React.createElement(
          Cartao,
          null,
          React.createElement(EstadoVazio, { titulo: 'Vazio', descricao: 'Nada aqui' }),
          React.createElement(Divisor),
        ),
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('Vazio');

    expect(gerenciarAssinaturaPlayUrl('br.com.pdv.mobile', 'prisma_pro_mensal')).toContain(
      'https://play.google.com/store/account/subscriptions?sku=prisma_pro_mensal&package=br.com.pdv.mobile',
    );
    expect(playBillingDisponivel(null)).toBe(false);

    const ponte = {
      comprarAssinatura: vi.fn().mockResolvedValue({
        purchaseToken: 'tok-play-1',
        productId: 'prisma_pro_mensal',
        packageName: 'br.com.pdv.mobile',
      }),
      consultarComprasAssinatura: vi.fn().mockResolvedValue([
        { purchaseToken: 'tok-play-1', productId: 'prisma_pro_mensal', packageName: 'br.com.pdv.mobile' },
      ]),
    };
    expect(playBillingDisponivel(ponte)).toBe(true);
    await expect(
      iniciarAssinaturaPlay({ packageName: 'br.com.pdv.mobile', sku: 'prisma_pro_mensal', contaId: 'c1' }, ponte),
    ).resolves.toMatchObject({ purchaseToken: 'tok-play-1' });
    await expect(
      restaurarComprasPlay({ packageName: 'br.com.pdv.mobile', sku: 'prisma_pro_mensal' }, ponte),
    ).resolves.toMatchObject({ purchaseToken: 'tok-play-1' });
  });
});
