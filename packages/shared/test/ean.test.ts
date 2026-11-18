import { describe, expect, it } from 'vitest';
import { atribuicaoCatalogo, ConfirmarEanReqSchema, normalizarEan, ProdutoCatalogoSchema, validarEan } from '../src';

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
    // Resposta sem `atribuicao` (API anterior, cache antigo) continua válida e ganha `null`.
    expect(ProdutoCatalogoSchema.parse(base)).toEqual({ ...base, atribuicao: null });
    const minimo = { ...base, marca: null, conteudo: null, imagemUrl: null, fonte: 'proprio', confianca: 'confirmada', atribuicao: null };
    expect(ProdutoCatalogoSchema.parse(minimo)).toEqual(minimo);
  });

  it('aceita as fontes gratuitas novas com atribuição ODbL', () => {
    for (const fonte of ['open_food_facts', 'open_beauty_facts', 'open_products_facts'] as const) {
      const atribuicao = atribuicaoCatalogo(fonte, base.ean);
      expect(atribuicao).toMatchObject({ licenca: 'ODbL-1.0' });
      expect(atribuicao?.texto).toMatch(/Open Food Facts/);
      expect(atribuicao?.url).toMatch(new RegExp(`^https://world\\.open\\w+facts\\.org/product/${base.ean}$`));
      expect(ProdutoCatalogoSchema.parse({ ...base, fonte, atribuicao })).toMatchObject({ fonte, atribuicao });
    }
    expect(atribuicaoCatalogo('proprio', base.ean)).toBeNull();
    // A tela mostra "texto (licença)": nada de "Open Food Facts (Open Food Facts)" nem nome repetido.
    expect(atribuicaoCatalogo('open_food_facts', base.ean)?.texto).toBe('Dados do Open Food Facts, sob a Open Database License');
    expect(atribuicaoCatalogo('open_beauty_facts', base.ean)?.texto).toBe(
      'Dados do Open Beauty Facts, um projeto Open Food Facts, sob a Open Database License',
    );
    expect(atribuicaoCatalogo('open_products_facts', base.ean)?.texto).toBe(
      'Dados do Open Products Facts, um projeto Open Food Facts, sob a Open Database License',
    );
    expect(ProdutoCatalogoSchema.safeParse({ ...base, atribuicao: { texto: 'x', licenca: 'y', url: 'não é url' } }).success).toBe(false);
    // O app abre esta URL com Linking.openURL ao tocar no crédito: só https.
    for (const url of ['javascript:alert(1)', 'intent://x#Intent;end', 'http://world.openfoodfacts.org/product/1']) {
      expect(ProdutoCatalogoSchema.safeParse({ ...base, atribuicao: { texto: 'x', licenca: 'y', url } }).success).toBe(false);
    }
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
