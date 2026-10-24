import { describe, expect, it, vi } from 'vitest';

// Só o mapa de kinds é testado: o módulo nativo não é carregado (sem renderizar).
vi.mock('react-native-svg', () => {
  const stub = () => null;
  return {
    default: stub,
    Circle: stub,
    ClipPath: stub,
    Defs: stub,
    Ellipse: stub,
    G: stub,
    LinearGradient: stub,
    Mask: stub,
    Path: stub,
    Polygon: stub,
    RadialGradient: stub,
    Rect: stub,
    Stop: stub,
  };
});

import { ILUSTRACOES } from '@/componentes/ilustracoes';

const KINDS = [
  'scanner', 'cesta', 'moedas', 'tap', 'pix', 'produto', 'check',
  'offline', 'recibo', 'lanterna', 'loja', 'pausa', 'busca', 'grafico',
];

describe('ilustracoes', () => {
  it('tem exatamente os 14 kinds do contrato', () => {
    expect(Object.keys(ILUSTRACOES).sort()).toEqual([...KINDS].sort());
  });

  it.each(KINDS)('tem um componente para o kind %s', (kind) => {
    expect(typeof (ILUSTRACOES as Record<string, unknown>)[kind]).toBe('function');
  });
});
