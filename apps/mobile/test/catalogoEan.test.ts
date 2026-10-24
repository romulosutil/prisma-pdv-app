import { describe, expect, it } from 'vitest';
import { buscarNoCatalogo, consultarCatalogo } from '@/servicos/catalogoEan';
import { sugestaoParaCadastro } from '@/telas/produtos/sugestao';

describe('catálogo de EAN (base local simulada)', () => {
  it('acha o nome de um código conhecido, ignorando separadores', () => {
    expect(buscarNoCatalogo('7896543210987')).toEqual({ achou: true, nome: 'Achocolatado em pó 400g' });
    expect(buscarNoCatalogo('789 6543 210987')).toEqual({ achou: true, nome: 'Achocolatado em pó 400g' });
  });

  it('não acha código fora do catálogo', () => {
    expect(buscarNoCatalogo('7891234567895')).toEqual({ achou: false });
  });

  it('responde depois do atraso artificial', async () => {
    const inicio = Date.now();
    const r = await consultarCatalogo('7890000000048', { atrasoMs: 30 });
    expect(r).toEqual({ achou: true, nome: 'Café torrado 500g' });
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(25);
  });

  it('o cenário "não encontrado" também passa pelo atraso', async () => {
    await expect(consultarCatalogo('7891234567895', { atrasoMs: 5 })).resolves.toEqual({ achou: false });
  });

  it('rejeita quando a consulta é cancelada', async () => {
    const controle = new AbortController();
    const espera = consultarCatalogo('7890000000048', { atrasoMs: 1000, sinal: controle.signal });
    controle.abort();
    await expect(espera).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejeita na hora se já chegou cancelada', async () => {
    const controle = new AbortController();
    controle.abort();
    await expect(consultarCatalogo('7890000000048', { atrasoMs: 1000, sinal: controle.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('sugestaoParaCadastro', () => {
  it('usa o nome já consultado', () => {
    expect(sugestaoParaCadastro('7896543210987', 'Achocolatado')).toEqual({ ean: '7896543210987', nome: 'Achocolatado', origem: 'catalogo' });
  });

  it('consulta a base quando só chega o código (fluxo de Vender)', () => {
    expect(sugestaoParaCadastro('7890000000048')).toEqual({ ean: '7890000000048', nome: 'Café torrado 500g', origem: 'catalogo' });
    expect(sugestaoParaCadastro('7891234567895')).toEqual({ ean: '7891234567895', nome: '', origem: 'ausente' });
  });

  it('respeita o preenchimento manual', () => {
    expect(sugestaoParaCadastro('7890000000048', undefined, true)).toEqual({ ean: '7890000000048', nome: '', origem: 'manual' });
  });

  it('ignora código ausente ou inválido', () => {
    expect(sugestaoParaCadastro(undefined)).toBeUndefined();
    expect(sugestaoParaCadastro('123')).toBeUndefined();
  });
});
