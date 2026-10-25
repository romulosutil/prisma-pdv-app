import { describe, expect, it } from 'vitest';
import { ConfirmarEanReqSchema, normalizarEan, ProdutoCatalogoSchema, validarEan } from '../src';

const VALIDOS = ['7896009765148', '7891000100103', '8843163765148', '7890000000017'];

function trocarUltimoDigito(ean: string): string {
  const ultimo = Number(ean.at(-1));
  return ean.slice(0, -1) + String((ultimo + 1) % 10);
}

describe('validarEan', () => {
  it.each(VALIDOS)('aceita %s', (ean) => {
    expect(validarEan(ean)).toBe(true);
  });

  it.each(VALIDOS)('rejeita %s com o último dígito trocado', (ean) => {
    expect(validarEan(trocarUltimoDigito(ean))).toBe(false);
  });

  it('aceita EAN-8, UPC-A e GTIN-14 válidos', () => {
    expect(validarEan('96385074')).toBe(true);
    expect(validarEan('036000291452')).toBe(true);
    expect(validarEan('10012345678902')).toBe(true);
  });

  it('rejeita comprimentos inválidos', () => {
    expect(validarEan('1234567')).toBe(false);
    expect(validarEan('123456789')).toBe(false);
    expect(validarEan('123456789012345')).toBe(false);
  });

  it('rejeita letras, espaços e vazio', () => {
    expect(validarEan('789600976514A')).toBe(false);
    expect(validarEan('7896009 65148')).toBe(false);
    expect(validarEan('')).toBe(false);
  });
});

describe('normalizarEan', () => {
  it('remove espaços e hífens e devolve os dígitos', () => {
    expect(normalizarEan(' 789 6009-765148 ')).toBe('7896009765148');
  });

  it('devolve null para código inválido', () => {
    expect(normalizarEan('7896009-765149')).toBeNull();
    expect(normalizarEan('abc')).toBeNull();
  });
});

describe('ProdutoCatalogoSchema', () => {
  const base = {
    ean: '7896009765148',
    nome: 'Biscoito recheado 140g',
    marca: 'Marca X',
    conteudo: '140 g',
    imagemUrl: 'https://exemplo.com/foto.jpg',
    fonte: 'open_food_facts',
    confianca: 'externa',
  };

  it('aceita um produto válido, com campos opcionais nulos', () => {
    expect(ProdutoCatalogoSchema.parse(base)).toEqual(base);
    const minimo = { ...base, marca: null, conteudo: null, imagemUrl: null, fonte: 'proprio', confianca: 'confirmada' };
    expect(ProdutoCatalogoSchema.parse(minimo)).toEqual(minimo);
  });

  it('não carrega preço: campos de preço são descartados', () => {
    const resultado = ProdutoCatalogoSchema.parse({ ...base, precoCentavos: 999 });
    expect(resultado).not.toHaveProperty('precoCentavos');
    expect(Object.keys(ProdutoCatalogoSchema.shape)).not.toContain('precoCentavos');
  });

  it('rejeita imagemUrl inválida, nome vazio e fonte desconhecida', () => {
    expect(ProdutoCatalogoSchema.safeParse({ ...base, imagemUrl: 'não é url' }).success).toBe(false);
    expect(ProdutoCatalogoSchema.safeParse({ ...base, nome: '   ' }).success).toBe(false);
    expect(ProdutoCatalogoSchema.safeParse({ ...base, fonte: 'cosmos' }).success).toBe(false);
  });
});

describe('ConfirmarEanReqSchema', () => {
  it('aceita e apara o nome', () => {
    expect(ConfirmarEanReqSchema.parse({ nome: '  Arroz 5kg ' })).toEqual({ nome: 'Arroz 5kg' });
  });

  it('rejeita nome curto demais ou longo demais', () => {
    expect(ConfirmarEanReqSchema.safeParse({ nome: 'A' }).success).toBe(false);
    expect(ConfirmarEanReqSchema.safeParse({ nome: ' A ' }).success).toBe(false);
    expect(ConfirmarEanReqSchema.safeParse({ nome: 'x'.repeat(201) }).success).toBe(false);
  });
});
