import { afterEach, describe, expect, it } from 'vitest';
import {
  configurarPlano,
  dentroDoLimite,
  limite,
  PLANO_PADRAO,
  PLANOS,
  PLANOS_DISPONIVEIS,
  PLANOS_ORDEM,
  planoMinimoPara,
  podeUsar,
  RECURSOS,
  restaurarPlanosPadrao,
} from '../src';

afterEach(() => {
  restaurarPlanosPadrao();
});

describe('catálogo PLANOS Free + Pago', () => {
  it('tem Free como padrão e oferta disponível Free + Pro', () => {
    expect(PLANO_PADRAO).toBe('free');
    expect(PLANOS_DISPONIVEIS).toEqual(['free', 'pro']);
    expect(PLANOS_ORDEM.map((id) => PLANOS[id].precoMensalCentavos)).toEqual([0, 1990, 3490, 4990]);
  });

  it('só o Pro é o mais escolhido', () => {
    expect(PLANOS_ORDEM.filter((id) => PLANOS[id].maisEscolhido)).toEqual(['pro']);
  });

  it('limites conforme o modelo Free + Pago e legados preservados', () => {
    expect(PLANOS.free.limites).toEqual({ produtos: 500, aparelhos: 1, operadores: 1, lojas: 1, historicoDias: 90 });
    expect(PLANOS.essencial.limites).toEqual({ produtos: 500, aparelhos: 1, operadores: 1, lojas: 1, historicoDias: 90 });
    expect(PLANOS.negocio.limites).toEqual({ produtos: null, aparelhos: 3, operadores: 3, lojas: 1, historicoDias: 730 });
    expect(PLANOS.pro.limites).toEqual({ produtos: null, aparelhos: 10, operadores: null, lojas: 3, historicoDias: null });
  });

  it('cada plano disponível contém os recursos do anterior', () => {
    expect(PLANOS.pro.recursos).toEqual(expect.arrayContaining(PLANOS.free.recursos));
    expect(PLANOS.pro.recursos).toEqual(expect.arrayContaining(PLANOS.negocio.recursos));
  });

  it('limites e preço de Free e Pro são configuráveis', () => {
    configurarPlano('free', { limites: { produtos: 300 } });
    configurarPlano('pro', { precoMensalCentavos: 5990, limites: { lojas: 5 } });
    expect(limite('free', 'produtos')).toBe(300);
    expect(PLANOS.pro.precoMensalCentavos).toBe(5990);
    expect(limite('pro', 'lojas')).toBe(5);
  });
});

describe('recursos', () => {
  it('podeUsar segue Free, legados e Pro', () => {
    expect(podeUsar('free', 'estoque')).toBe(true);
    expect(podeUsar('free', 'sangria_suprimento')).toBe(true);
    expect(podeUsar('free', 'fiado')).toBe(false);
    expect(podeUsar('essencial', 'estoque')).toBe(false);
    expect(podeUsar('negocio', 'estoque')).toBe(true);
    expect(podeUsar('negocio', 'fiado')).toBe(false);
    expect(podeUsar('pro', 'fiado')).toBe(true);
    expect(podeUsar('pro', 'integracao_pagamentos')).toBe(true);
  });

  it('planoMinimoPara prioriza os planos disponíveis Free e Pro', () => {
    expect(planoMinimoPara('estoque')).toBe('free');
    expect(planoMinimoPara('sangria_suprimento')).toBe('free');
    expect(planoMinimoPara('exportar_csv')).toBe('pro');
    expect(planoMinimoPara('integracao_pagamentos')).toBe('pro');
    expect(planoMinimoPara('multiloja')).toBe('pro');
  });

  it('todo recurso existe em algum plano', () => {
    for (const r of RECURSOS) expect(() => planoMinimoPara(r)).not.toThrow();
  });
});

describe('limites', () => {
  it('limite devolve null para ilimitado', () => {
    expect(limite('free', 'produtos')).toBe(500);
    expect(limite('essencial', 'produtos')).toBe(500);
    expect(limite('negocio', 'produtos')).toBeNull();
    expect(limite('pro', 'operadores')).toBeNull();
  });

  it('Free e Essencial: 499 produtos cabe mais um, 500 bloqueia', () => {
    for (const plano of ['free', 'essencial'] as const) {
      expect(dentroDoLimite(plano, 'produtos', 499)).toBe(true);
      expect(dentroDoLimite(plano, 'produtos', 500)).toBe(false);
      expect(dentroDoLimite(plano, 'produtos', 600)).toBe(false);
    }
  });

  it('ilimitado sempre cabe', () => {
    expect(dentroDoLimite('negocio', 'produtos', 1_000_000)).toBe(true);
    expect(dentroDoLimite('pro', 'operadores', 99)).toBe(true);
  });

  it('aparelhos e lojas', () => {
    expect(dentroDoLimite('free', 'aparelhos', 0)).toBe(true);
    expect(dentroDoLimite('free', 'aparelhos', 1)).toBe(false);
    expect(dentroDoLimite('negocio', 'aparelhos', 2)).toBe(true);
    expect(dentroDoLimite('negocio', 'aparelhos', 3)).toBe(false);
    expect(dentroDoLimite('pro', 'lojas', 3)).toBe(false);
  });
});
