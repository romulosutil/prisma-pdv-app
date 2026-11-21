import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLANOS, type Assinatura, type ConfiguracaoCobrancaRes } from '@pdv/shared';
import type { OfertaAssinaturaPlay } from '@/servicos/playBilling';

const m = vi.hoisted(() => {
  const configPlay: ConfiguracaoCobrancaRes = {
    modoGratuito: false,
    canal: 'google_play',
    planoPadrao: 'free',
    packageName: 'br.com.pdv.mobile',
    skuProMensal: 'prisma_pro_mensal',
  };
  const ativarPlanoGratuito = vi.fn().mockResolvedValue({});
  const dados = {
    relogio: {},
    listarPlanos: vi.fn(),
    backend: {
      modo: 'http',
      obterConfiguracaoCobranca: vi.fn().mockImplementation(async () => m.configPlay),
      ativarPlanoGratuito,
    },
  };
  return {
    planoRascunho: 'pro' as 'free' | 'pro',
    configPlay,
    dados,
    assinatura: null as Assinatura | null,
    ativarPlanoGratuito,
    confirmarCompraGooglePlay: vi.fn().mockResolvedValue(undefined),
    restaurarCompraGooglePlay: vi.fn().mockResolvedValue(undefined),
    consultarOfertaAssinatura: vi.fn<() => Promise<OfertaAssinaturaPlay | null>>().mockResolvedValue(null),
    rnPlatformOS: 'android' as string,
    nativeModules: {} as Record<string, unknown>,
    openURL: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('react-native', async () => {
  const R = await import('react');
  const el = (n: string) => (p: any) => R.createElement(n, p, p.children);
  return {
    View: el('view'),
    Pressable: el('pressable'),
    AccessibilityInfo: { announceForAccessibility: vi.fn() },
    StyleSheet: { create: (s: unknown) => s },
    get Platform() {
      return { OS: m.rnPlatformOS };
    },
    get NativeModules() {
      return m.nativeModules;
    },
    Linking: { openURL: (...a: unknown[]) => m.openURL(...a) },
  };
});

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/tema', () => ({
  cores: { bg: '#FFF', surface: '#F4', ink: '#14', ink2: '#4A', ink3: '#5C', line: '#E4', anil: '#1D', anilSoft: '#E8', manga: '#F5', folha: '#0E' },
  raio: { sm: 8, md: 12, lg: 20 },
  textoBotao: { S: {} },
}));
vi.mock('@/tema/useFoco', () => ({ useFoco: () => ({ aoFocar: vi.fn(), aoDesfocar: vi.fn(), anel: {} }) }));
vi.mock('@/componentes/Banner', async () => {
  const R = await import('react');
  return { Banner: (p: any) => R.createElement('banner', p) };
});
vi.mock('@/componentes/Botao', async () => {
  const R = await import('react');
  return { Botao: (p: any) => R.createElement('botao', p) };
});
vi.mock('@/componentes/BotaoIcone', () => ({ BotaoIcone: () => null }));
vi.mock('@/componentes/BottomSheet', async () => {
  const R = await import('react');
  return { BottomSheet: (p: any) => R.createElement('sheet', p, p.children) };
});
vi.mock('@/componentes/CabecalhoEtapa', () => ({ CabecalhoEtapa: () => null }));
vi.mock('@/componentes/Icone', () => ({ Icone: () => null }));
vi.mock('@/componentes/Secao', async () => {
  const R = await import('react');
  return { Secao: (p: any) => R.createElement('secao', p, p.children) };
});
vi.mock('@/componentes/StatusPill', async () => {
  const R = await import('react');
  return { StatusPill: (p: any) => R.createElement('statuspill', p) };
});
vi.mock('@/componentes/TelaBase', async () => {
  const R = await import('react');
  return { TelaBase: (p: any) => R.createElement('tela', null, p.children, p.rodape) };
});
vi.mock('@/componentes/Texto', async () => {
  const R = await import('react');
  return { Texto: (p: any) => R.createElement('texto', p, p.children) };
});
vi.mock('@/componentes/Toast', () => ({ useToast: () => ({ mostrar: vi.fn() }) }));
vi.mock('@/dados/observavel', () => ({ useObservavel: () => 0 }));
vi.mock('@/util/cartao', () => ({ rotuloBandeira: () => 'Visa' }));
vi.mock('@/util/dinheiroFalado', () => ({ falarDinheiro: (n: number) => `${n} centavos` }));
vi.mock('@/util/statusAssinatura', () => ({
  STATUS_VISUAL: {
    free: { tipo: 'neutro', texto: 'Gratuito' },
    ativa: { tipo: 'ok', texto: 'Ativa' },
    em_teste: { tipo: 'info', texto: 'Em teste' },
    inadimplente: { tipo: 'erro', texto: 'Em atraso' },
    cancelada: { tipo: 'neutro', texto: 'Cancelada' },
    suspensa: { tipo: 'erro', texto: 'Suspensa' },
    liberada: { tipo: 'ok', texto: 'Liberada' },
    sem_assinatura: { tipo: 'neutro', texto: 'Sem assinatura' },
  },
}));
vi.mock('@/nucleo/rascunho', () => ({
  useRascunho: () => ({ rascunho: { planoId: m.planoRascunho }, alterar: vi.fn() }),
}));
vi.mock('@/dados/hooks', () => ({
  useConta: () => ({ identidade: { contaId: 'c-1' } }),
  useAssinatura: () => ({
    assinatura: m.assinatura,
    agora: new Date('2026-11-21T12:00:00.000Z'),
    modo: 'http',
    servico: {
      ativarPlanoGratuito: m.ativarPlanoGratuito,
      confirmarCompraGooglePlay: m.confirmarCompraGooglePlay,
      restaurarCompraGooglePlay: m.restaurarCompraGooglePlay,
      previaTroca: () => null,
      trocarPlano: vi.fn(),
      cancelar: vi.fn(),
      reativar: vi.fn(),
    },
  }),
  useDados: () => m.dados,
}));

import Planos from '../app/(onboarding)/planos';
import AssinaturaTela from '../app/(tabs)/ajustes/assinatura';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: ReactTestRenderer;

const OFERTA_COM_TRIAL: OfertaAssinaturaPlay = {
  productId: 'prisma_pro_mensal',
  titulo: 'Prisma Pro',
  basePlanId: 'mensal',
  offerId: 'trial-14d',
  offerToken: 'tok-trial-14d',
  precoFormatado: 'R$ 59,90',
  precoMicros: 59_900_000,
  moeda: 'BRL',
  periodoCobranca: 'P1M',
  temTesteGratis: true,
  periodoTesteGratis: 'P14D',
  ciclosTesteGratis: 1,
  precoIntrodutorioFormatado: null,
  periodoIntrodutorio: null,
  ciclosIntrodutorio: 0,
};

const OFERTA_SEM_TRIAL: OfertaAssinaturaPlay = {
  ...OFERTA_COM_TRIAL,
  offerId: null,
  temTesteGratis: false,
  periodoTesteGratis: null,
  ciclosTesteGratis: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  m.dados.listarPlanos.mockResolvedValue([PLANOS.free, PLANOS.pro]);
  m.dados.backend.obterConfiguracaoCobranca.mockImplementation(async () => m.configPlay);
  m.planoRascunho = 'pro';
  m.rnPlatformOS = 'android';
  m.nativeModules = {
    PdvPlayBilling: {
      comprarAssinatura: vi.fn(),
      consultarComprasAssinatura: vi.fn(),
      consultarOfertaAssinatura: m.consultarOfertaAssinatura,
    },
  };
  m.consultarOfertaAssinatura.mockResolvedValue(null);
  m.assinatura = {
    id: 'a-1',
    contaId: 'c-1',
    planoId: 'free',
    planoAgendado: null,
    status: 'ativa',
    cartao: null,
    cupom: null,
    criadaEm: new Date('2026-11-01T12:00:00.000Z'),
    testeTerminaEm: new Date('2026-11-01T12:00:00.000Z'),
    periodoAtualInicio: new Date('2026-11-01T12:00:00.000Z'),
    periodoAtualFim: new Date('2036-11-01T12:00:00.000Z'),
    acessoAte: null,
    inadimplenteDesde: null,
    tentativasFalhas: 0,
    proximaTentativaEm: null,
    canceladaEm: null,
  };
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});

describe('Telas Planos e Assinatura com preço/oferta real do BillingClient', () => {
  it('planos.tsx exibe preço e teste grátis reais do BillingClient quando elegível', async () => {
    m.consultarOfertaAssinatura.mockResolvedValueOnce(OFERTA_COM_TRIAL);
    await act(async () => {
      renderer = create(React.createElement(Planos));
    });
    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON());
      expect(json).toContain('R$ 59,90');
      expect(json).toContain('Começar 14 dias grátis na Google Play');
      expect(json).toContain('14 dias grátis, depois R$ 59,90/mês');
    });
  });

  it('planos.tsx não promete teste grátis quando a oferta Play retornada não tem trial ou quando consulta retorna null', async () => {
    m.consultarOfertaAssinatura.mockResolvedValueOnce(OFERTA_SEM_TRIAL);
    await act(async () => {
      renderer = create(React.createElement(Planos));
    });
    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON());
      expect(json).toContain('Assinar Pro na Google Play (R$ 59,90/mês)');
      expect(json).toContain('Cobrança de R$ 59,90 por mês na Google Play');
      expect(json).not.toContain('dias grátis');
      expect(json).not.toContain('teste grátis');
    });

    await act(async () => renderer.unmount());
    m.consultarOfertaAssinatura.mockResolvedValueOnce(null);
    await act(async () => {
      renderer = create(React.createElement(Planos));
    });
    const jsonFallback = JSON.stringify(renderer.toJSON());
    expect(jsonFallback).toContain('Assinar Pro na Google Play (R$ 49,90/mês)');
    expect(jsonFallback).toContain('Cobrança de referência');
    expect(jsonFallback).not.toContain('7 dias grátis');
  });

  it('assinatura.tsx usa oferta real no modo Free, oculta "Voltar para o plano gratuito" enquanto Pro está ativo e orienta gerenciamento pela Play', async () => {
    m.consultarOfertaAssinatura.mockResolvedValueOnce(OFERTA_COM_TRIAL);
    await act(async () => {
      renderer = create(React.createElement(AssinaturaTela));
    });
    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON());
      expect(json).toContain('Assinar Pro (14 dias grátis)');
      expect(json).toContain('R$ 59,90 por mês');
    });

    await act(async () => renderer.unmount());
    m.assinatura = { ...m.assinatura!, planoId: 'pro', status: 'ativa' };
    m.consultarOfertaAssinatura.mockResolvedValueOnce(OFERTA_SEM_TRIAL);
    await act(async () => {
      renderer = create(React.createElement(AssinaturaTela));
    });
    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON());
      expect(json).toContain('Gerenciar assinatura na Google Play');
      expect(json).toContain('R$ 59,90 por mês');
      expect(json).not.toContain('Voltar para o plano gratuito');
    });

    await act(async () => renderer.unmount());
    m.assinatura = { ...m.assinatura!, planoId: 'pro', status: 'suspensa' };
    m.consultarOfertaAssinatura.mockResolvedValueOnce(OFERTA_SEM_TRIAL);
    await act(async () => {
      renderer = create(React.createElement(AssinaturaTela));
    });
    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON());
      expect(json).toContain('Assinar Plano Pro (R$ 59,90/mês)');
      expect(json).toContain('Voltar para o plano gratuito');
    });
  });
});
