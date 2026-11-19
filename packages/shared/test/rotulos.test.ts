import { describe, expect, it } from 'vitest';
import {
  CATEGORIAS_MOVIMENTO_CAIXA,
  codigoCurto,
  MOTIVOS_CONFIRMACAO_MANUAL,
  rotuloCategoriaMovimento,
  rotuloPapel,
  rotuloTipoMovimentoCaixa,
} from '../src/rotulos';

describe('rótulos canônicos', () => {
  it('capitaliza papéis', () => {
    expect(rotuloPapel('dono')).toBe('Dono');
    expect(rotuloPapel('gerente')).toBe('Gerente');
    expect(rotuloPapel('operador')).toBe('Operador');
  });

  it('mapeia tipos de movimento de caixa usando Entrada de troco', () => {
    expect(rotuloTipoMovimentoCaixa('suprimento')).toBe('Entrada de troco');
    expect(rotuloTipoMovimentoCaixa('sangria')).toBe('Sangria');
    expect(rotuloTipoMovimentoCaixa('retirada')).toBe('Retirada');
  });

  it('oculta códigos técnicos de categoria de movimento', () => {
    expect(CATEGORIAS_MOVIMENTO_CAIXA.length).toBeGreaterThanOrEqual(4);
    expect(rotuloCategoriaMovimento('reforco_troco')).toBe('Reforço de troco');
    expect(rotuloCategoriaMovimento('cofre_deposito')).toBe('Cofre ou depósito');
    expect(rotuloCategoriaMovimento('despesa')).toBe('Despesa da loja');
    expect(rotuloCategoriaMovimento('outra_saida')).toBe('Outra saída');
  });

  it('formata código curto de 4 caracteres a partir de UUID', () => {
    expect(codigoCurto('01a1c53e-1234-4000-8000-00000000c53e')).toBe('#C53E');
    expect(codigoCurto(null)).toBe('#----');
  });

  it('traz motivos documentais para confirmação manual', () => {
    expect(MOTIVOS_CONFIRMACAO_MANUAL.stone).toContain('parceria');
    expect(MOTIVOS_CONFIRMACAO_MANUAL.infinitetap).toContain('aparelho');
  });
});
