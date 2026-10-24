import { describe, expect, it } from 'vitest';
import { decimalBR, escaparCelula, montarCsv, neutralizarFormula, quantidadeBR } from '@/util/csv';

describe('escaparCelula', () => {
  it('deixa campos simples como estão', () => {
    expect(escaparCelula('Arroz tipo 1 5kg')).toBe('Arroz tipo 1 5kg');
    expect(escaparCelula('')).toBe('');
  });

  it('põe aspas quando há ponto e vírgula, aspas ou quebra de linha', () => {
    expect(escaparCelula('Sal; fino')).toBe('"Sal; fino"');
    expect(escaparCelula('Leite "A"')).toBe('"Leite ""A"""');
    expect(escaparCelula('linha 1\nlinha 2')).toBe('"linha 1\nlinha 2"');
    expect(escaparCelula('a\r\nb')).toBe('"a\r\nb"');
  });

  it('não põe aspas por causa de vírgula, que não é separador', () => {
    expect(escaparCelula('1,5 kg')).toBe('1,5 kg');
  });
});

describe('neutralizarFormula', () => {
  it('prefixa texto que a planilha leria como fórmula', () => {
    expect(neutralizarFormula('=SOMA(A1)')).toBe("'=SOMA(A1)");
    expect(neutralizarFormula('+55 11')).toBe("'+55 11");
    expect(neutralizarFormula('-cupom')).toBe("'-cupom");
    expect(neutralizarFormula('@fulano')).toBe("'@fulano");
    expect(neutralizarFormula('Pão')).toBe('Pão');
  });
});

describe('montarCsv', () => {
  it('começa com BOM, usa ; e CRLF e termina com quebra de linha', () => {
    const csv = montarCsv([
      ['Item', 'Valor'],
      ['Pão; francês', '16,90'],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('Item;Valor\r\n"Pão; francês";16,90\r\n');
  });
});

describe('formatação brasileira', () => {
  it('escreve centavos com vírgula decimal e sem milhar', () => {
    expect(decimalBR(2790)).toBe('27,90');
    expect(decimalBR(5)).toBe('0,05');
    expect(decimalBR(128450)).toBe('1284,50');
    expect(decimalBR(-230)).toBe('-2,30');
  });

  it('escreve quantidades em milésimos', () => {
    expect(quantidadeBR(1000)).toBe('1');
    expect(quantidadeBR(3000)).toBe('3');
    expect(quantidadeBR(350)).toBe('0,350');
    expect(quantidadeBR(1200)).toBe('1,200');
  });
});
