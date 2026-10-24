import { describe, expect, it } from 'vitest';
import { dentroDoLimite, limite, PLANOS, PLANOS_ORDEM, planoMinimoPara, podeUsar, RECURSOS } from '../src';

describe('catálogo PLANOS', () => {
  it('tem os preços do doc de produto', () => {
    expect(PLANOS_ORDEM.map((id) => PLANOS[id].precoMensalCentavos)).toEqual([1990, 3490, 4990]);
  });

  it('só o Negócio é o mais escolhido', () => {
    expect(PLANOS_ORDEM.filter((id) => PLANOS[id].maisEscolhido)).toEqual(['negocio']);
  });

  it('limites conforme a tabela', () => {
    expect(PLANOS.essencial.limites).toEqual({ produtos: 500, aparelhos: 1, operadores: 1, lojas: 1, historicoDias: 90 });
    expect(PLANOS.negocio.limites).toEqual({ produtos: null, aparelhos: 3, operadores: 3, lojas: 1, historicoDias: 730 });
    expect(PLANOS.pro.limites).toEqual({ produtos: null, aparelhos: 10, operadores: null, lojas: 3, historicoDias: null });
  });

  it('cada plano contém os recursos do anterior', () => {
    for (let i = 1; i < PLANOS_ORDEM.length; i++) {
      const anterior = PLANOS[PLANOS_ORDEM[i - 1]!].recursos;
      const atual = PLANOS[PLANOS_ORDEM[i]!].recursos;
      expect(atual).toEqual(expect.arrayContaining(anterior));
    }
  });
});

describe('recursos', () => {
  it('podeUsar segue a tabela', () => {
    expect(podeUsar('essencial', 'estoque')).toBe(false);
    expect(podeUsar('negocio', 'estoque')).toBe(true);
    expect(podeUsar('negocio', 'fiado')).toBe(false);
    expect(podeUsar('pro', 'fiado')).toBe(true);
  });

  it('planoMinimoPara acha o primeiro plano que oferece o recurso', () => {
    expect(planoMinimoPara('integracao_pagamentos')).toBe('negocio');
    expect(planoMinimoPara('exportar_csv')).toBe('negocio');
    expect(planoMinimoPara('multiloja')).toBe('pro');
  });

  it('todo recurso existe em algum plano', () => {
    for (const r of RECURSOS) expect(() => planoMinimoPara(r)).not.toThrow();
  });
});

describe('limites', () => {
  it('limite devolve null para ilimitado', () => {
    expect(limite('essencial', 'produtos')).toBe(500);
    expect(limite('negocio', 'produtos')).toBeNull();
    expect(limite('pro', 'operadores')).toBeNull();
  });

  it('Essencial: 499 produtos cabe mais um, 500 bloqueia', () => {
    expect(dentroDoLimite('essencial', 'produtos', 499)).toBe(true);
    expect(dentroDoLimite('essencial', 'produtos', 500)).toBe(false);
    expect(dentroDoLimite('essencial', 'produtos', 600)).toBe(false);
  });

  it('ilimitado sempre cabe', () => {
    expect(dentroDoLimite('negocio', 'produtos', 1_000_000)).toBe(true);
    expect(dentroDoLimite('pro', 'operadores', 99)).toBe(true);
  });

  it('aparelhos e lojas', () => {
    expect(dentroDoLimite('essencial', 'aparelhos', 0)).toBe(true);
    expect(dentroDoLimite('essencial', 'aparelhos', 1)).toBe(false);
    expect(dentroDoLimite('negocio', 'aparelhos', 2)).toBe(true);
    expect(dentroDoLimite('negocio', 'aparelhos', 3)).toBe(false);
    expect(dentroDoLimite('pro', 'lojas', 3)).toBe(false);
  });
});
