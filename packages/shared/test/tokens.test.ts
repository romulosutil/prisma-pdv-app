import { describe, expect, it } from 'vitest';
import { cores, semanticos } from '../src/tokens';

function hexParaRgb(hex: string): [number, number, number] {
  const limpo = hex.replace('#', '');
  return [
    parseInt(limpo.slice(0, 2), 16),
    parseInt(limpo.slice(2, 4), 16),
    parseInt(limpo.slice(4, 6), 16),
  ];
}

function luminancia(hex: string): number {
  const canais = hexParaRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canais[0]! + 0.7152 * canais[1]! + 0.0722 * canais[2]!;
}

function contraste(fg: string, bg: string): number {
  const l1 = luminancia(fg);
  const l2 = luminancia(bg);
  const maior = Math.max(l1, l2);
  const menor = Math.min(l1, l2);
  return (maior + 0.05) / (menor + 0.05);
}

describe('design tokens WCAG AA', () => {
  it('ink3 tem contraste >= 4.5:1 em bg, surface e surface2', () => {
    expect(contraste(cores.ink3, cores.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(cores.ink3, cores.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(cores.ink3, cores.surface2)).toBeGreaterThanOrEqual(4.5);
  });

  it('todos os pares fg/bg e status nos temas claro e escuro atendem WCAG AA (>= 4.5:1)', () => {
    for (const [nome, tema] of Object.entries(semanticos)) {
      const fundos = [tema.bg.canvas, tema.bg.surface, tema.bg.surfacePressed, tema.bg.elevated];
      const textos = [tema.fg.primary, tema.fg.secondary, tema.fg.muted];
      for (const bg of fundos) {
        for (const fg of textos) {
          expect(contraste(fg, bg), `${nome}: ${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contraste(tema.action.primary.fg, tema.action.primary.bg), `${nome} primary`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(tema.action.danger.fg, tema.action.danger.bg), `${nome} danger`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(tema.status.success.fg, tema.status.success.bg), `${nome} success`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(tema.status.warning.fg, tema.status.warning.bg), `${nome} warning`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(tema.status.danger.fg, tema.status.danger.bg), `${nome} status danger`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(tema.action.focusRing, tema.action.focusSoft), `${nome} focus`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
