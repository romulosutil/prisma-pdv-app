import { describe, expect, it } from 'vitest';
import { crc16, gerarBrCodeDinamico, gerarBrCodeEstatico, interpretarChavePix } from '@/util/brcode';

// Exemplo público do Manual do BR Code (Banco Central), com CRC 1D3D.
const EXEMPLO_DO_MANUAL =
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';

describe('crc16', () => {
  it('bate com o valor de verificação padrão do CRC-16/CCITT-FALSE', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('bate com o BR Code de exemplo do manual do Banco Central', () => {
    expect(crc16(EXEMPLO_DO_MANUAL.slice(0, -4))).toBe('1D3D');
  });

  it('completa com zeros à esquerda', () => {
    expect(crc16('')).toBe('FFFF');
    expect(crc16('x')).toHaveLength(4);
  });
});

describe('gerarBrCodeEstatico', () => {
  it('reproduz o exemplo do manual (sem valor)', () => {
    const codigo = gerarBrCodeEstatico({
      chave: '123e4567-e12b-12d1-a456-426655440000',
      nomeRecebedor: 'Fulano de Tal',
      cidade: 'BRASILIA',
    });
    expect(codigo).toBe(EXEMPLO_DO_MANUAL);
  });

  it('inclui o valor em reais com ponto e termina com o CRC correto', () => {
    const codigo = gerarBrCodeEstatico({ chave: '12345678909', valorCentavos: 5605, nomeRecebedor: 'Mercadinho Bom Preço', cidade: 'São Paulo' });
    expect(codigo).toContain('0014br.gov.bcb.pix011112345678909');
    expect(codigo).toContain('540556.05');
    expect(codigo).toContain('5920Mercadinho Bom Preco');
    expect(codigo).toContain('6009Sao Paulo');
    expect(codigo).toContain('62070503***');
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
    expect(codigo.slice(-8, -4)).toBe('6304');
  });

  it('trunca nome (25) e cidade (15) e valida o tamanho dos campos', () => {
    const codigo = gerarBrCodeEstatico({ chave: 'a@b.co', valorCentavos: 100, nomeRecebedor: 'N'.repeat(40), cidade: 'C'.repeat(40) });
    expect(codigo).toContain(`5925${'N'.repeat(25)}`);
    expect(codigo).toContain(`6015${'C'.repeat(15)}`);
    expect(codigo).toContain('54041.00');
  });

  it('usa só ASCII mesmo com acentos e emojis', () => {
    const codigo = gerarBrCodeEstatico({ chave: 'a@b.co', nomeRecebedor: 'Pão de Açúcar 🍞', cidade: 'Belém' });
    expect(codigo).toContain('Pao de Acucar');
    expect(codigo).toContain('Belem');
    expect([...codigo].every((c) => c.charCodeAt(0) < 128)).toBe(true);
  });
});

describe('gerarBrCodeDinamico', () => {
  it('usa a URL da cobrança no lugar da chave e o txid informado', () => {
    const codigo = gerarBrCodeDinamico({ url: 'pix.exemplo.invalid/cob/abc', valorCentavos: 1250, nomeRecebedor: 'Loja', cidade: 'BRASIL', txid: 'abc-123' });
    expect(codigo).toContain('0014br.gov.bcb.pix2527pix.exemplo.invalid/cob/abc');
    expect(codigo).toContain('540512.50');
    expect(codigo).toContain('0506abc123');
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });
});

describe('interpretarChavePix', () => {
  it('reconhece e normaliza cada tipo', () => {
    expect(interpretarChavePix('529.982.247-25')).toEqual({ tipo: 'cpf', chave: '52998224725' });
    expect(interpretarChavePix('11.222.333/0001-81')).toEqual({ tipo: 'cnpj', chave: '11222333000181' });
    expect(interpretarChavePix(' Loja@Exemplo.com.br ')).toEqual({ tipo: 'email', chave: 'loja@exemplo.com.br' });
    expect(interpretarChavePix('(11) 99999-8888')).toEqual({ tipo: 'telefone', chave: '+5511999998888' });
    expect(interpretarChavePix('+55 11 99999-8888')).toEqual({ tipo: 'telefone', chave: '+5511999998888' });
    expect(interpretarChavePix('123E4567-E12B-12D1-A456-426655440000')).toEqual({ tipo: 'aleatoria', chave: '123e4567-e12b-12d1-a456-426655440000' });
  });

  it('rejeita o que não é chave', () => {
    expect(interpretarChavePix('')).toBeNull();
    expect(interpretarChavePix('123')).toBeNull();
    expect(interpretarChavePix('111.111.111-11')).toBeNull();
    expect(interpretarChavePix('sem arroba')).toBeNull();
  });
});
