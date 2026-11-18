import React from 'react';
import { act, create } from 'react-test-renderer';
import { atribuicaoCatalogo } from '@pdv/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ buscar: vi.fn(), abrir: vi.fn().mockResolvedValue(true) }));
vi.mock('@/servicos/catalogoEan', () => ({ buscarNoCatalogo: m.buscar }));
vi.mock('react-native', async () => {
  const R = await import('react');
  return {
    Pressable: (p: React.PropsWithChildren) => R.createElement('pressable', p, p.children),
    StyleSheet: { create: (v: unknown) => v },
    Linking: { openURL: m.abrir },
  };
});
vi.mock('@/tema', () => ({ cores: { ink2: '#000' } }));
vi.mock('@/componentes/Texto', async () => {
  const R = await import('react');
  return { Texto: (p: React.PropsWithChildren) => R.createElement('texto', p, p.children) };
});
import { AtribuicaoCatalogo } from '../src/telas/produtos/AtribuicaoCatalogo';
import { sugestaoParaCadastro } from '../src/telas/produtos/sugestao';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const EAN = '7891000100103';

describe('sugestaoParaCadastro com atribuição', () => {
  beforeEach(() => m.buscar.mockReset());

  it('fonte externa traz a atribuição com a URL do produto', () => {
    const s = sugestaoParaCadastro(EAN, 'Leite', false, 'open_food_facts');
    expect(s?.origem).toBe('catalogo');
    expect(s?.atribuicao?.url).toBe(`https://world.openfoodfacts.org/product/${EAN}`);
    expect(s?.atribuicao?.licenca).toBe('ODbL-1.0');
    expect(sugestaoParaCadastro(EAN, 'Creme', false, 'open_beauty_facts')?.atribuicao?.url).toBe(`https://world.openbeautyfacts.org/product/${EAN}`);
  });

  it('fonte própria não tem atribuição', () => {
    expect(sugestaoParaCadastro(EAN, 'Leite', false, 'proprio')?.atribuicao).toBeNull();
  });

  it('fonte inválida ou ausente na rota é ignorada sem quebrar', () => {
    expect(sugestaoParaCadastro(EAN, 'Leite', false, 'qualquer_coisa')).toMatchObject({ origem: 'catalogo', nome: 'Leite', atribuicao: null });
    expect(sugestaoParaCadastro(EAN, 'Leite')?.atribuicao).toBeNull();
    expect(m.buscar).not.toHaveBeenCalled();
  });

  it('caminho do cache carrega a atribuição, ou a deriva da fonte', () => {
    const atr = atribuicaoCatalogo('open_food_facts', EAN);
    m.buscar.mockReturnValueOnce({ achou: true, nome: 'Arroz', fonte: 'open_food_facts', atribuicao: atr });
    expect(sugestaoParaCadastro(EAN)?.atribuicao).toEqual(atr);
    m.buscar.mockReturnValueOnce({ achou: true, nome: 'Arroz', fonte: 'open_products_facts' });
    expect(sugestaoParaCadastro(EAN)?.atribuicao?.url).toBe(`https://world.openproductsfacts.org/product/${EAN}`);
    m.buscar.mockReturnValueOnce({ achou: true, nome: 'Arroz', fonte: 'proprio', atribuicao: null });
    expect(sugestaoParaCadastro(EAN)?.atribuicao).toBeNull();
    m.buscar.mockReturnValueOnce({ achou: false });
    expect(sugestaoParaCadastro(EAN)).toEqual({ ean: EAN, nome: '', origem: 'ausente' });
  });
});

describe('AtribuicaoCatalogo (linha)', () => {
  it('não renderiza sem atribuição', () => {
    const r = create(React.createElement(AtribuicaoCatalogo, { atribuicao: null }));
    expect(r.toJSON()).toBeNull();
  });

  it('renderiza como link e abre a URL ao tocar', () => {
    const atr = atribuicaoCatalogo('open_food_facts', EAN);
    let r!: ReturnType<typeof create>;
    act(() => { r = create(React.createElement(AtribuicaoCatalogo, { atribuicao: atr })); });
    const link = r.root.findByType('pressable' as never);
    expect(link.props.accessibilityRole).toBe('link');
    expect(r.root.findByType('texto' as never).props.children).toBe(`${atr!.texto} (ODbL-1.0)`);
    act(() => link.props.onPress());
    expect(m.abrir).toHaveBeenCalledWith(atr!.url);
  });
});
