import { describe, expect, it } from 'vitest';
import { ErroCanalEmail, lerMensagemCodigo } from '../src/email/contrato';

const mensagem = {
  id: '00000000-0000-4000-8000-000000000001',
  codigoId: '00000000-0000-4000-8000-000000000002',
  destinatario: '  DONA@EXEMPLO.COM  ',
  codigo: '012345',
  expiraEm: '2026-10-29T12:10:00.000Z',
};

describe('contrato do canal de código AC1/7', () => {
  it('conserva IDs, código com zero inicial e validade, normalizando destinatário', () => {
    expect(lerMensagemCodigo(mensagem)).toEqual({ ...mensagem, destinatario: 'dona@exemplo.com' });
  });

  it.each([
    ['2026-10-29T12:10:00Z', '2026-10-29T12:10:00.000Z'],
    ['2026-10-29T12:10:00.1Z', '2026-10-29T12:10:00.100Z'],
  ])('normaliza precisão UTC para milissegundos %s', (entrada, esperado) => {
    expect(lerMensagemCodigo({ ...mensagem, expiraEm: entrada }).expiraEm).toBe(esperado);
  });

  it.each([
    { id: 'inválido' }, { codigoId: 'inválido' }, { destinatario: 'segredo-inválido' },
    { codigo: '12345' }, { codigo: '1234567' }, { codigo: 123456 }, { codigo: 'a23456' },
    { codigo: '１２３４５６' }, { expiraEm: 'amanhã' }, { expiraEm: '2026-10-29T09:10:00-03:00' },
    { anexos: ['segredo-inválido'] }, { destinatario: 'dona@exemplo.com\r\nBcc: outro@exemplo.com' },
  ])('recusa campos inválidos ou extras sem refletir conteúdo %j', (alteracao) => {
    const entrada = { ...mensagem, ...alteracao };
    let recebido: unknown;
    try { lerMensagemCodigo(entrada); } catch (erro) { recebido = erro; }
    expect(recebido).toBeInstanceOf(ErroCanalEmail);
    expect(recebido).toMatchObject({ tipo: 'mensagem_invalida', message: 'Mensagem de código inválida.' });
    expect(recebido).not.toHaveProperty('cause');
    const erro = recebido as Error;
    expect(erro.stack).not.toContain(mensagem.codigo);
    expect(erro.stack).not.toContain(mensagem.destinatario);
    expect(JSON.stringify(recebido)).not.toContain('segredo-inválido');
  });

  it.each(['id', 'codigoId', 'destinatario', 'codigo', 'expiraEm'] as const)('exige o campo %s', campo => {
    const entrada: Record<string, unknown> = { ...mensagem };
    delete entrada[campo];
    expect(() => lerMensagemCodigo(entrada)).toThrow(new ErroCanalEmail('mensagem_invalida'));
  });

  it.each([
    ['configuracao', 'Configuração do canal de e-mail inválida.'],
    ['mensagem_invalida', 'Mensagem de código inválida.'],
    ['temporario', 'O canal de e-mail está temporariamente indisponível.'],
    ['permanente', 'O canal de e-mail recusou a operação.'],
  ] as const)('expõe somente categoria e mensagem local %s', (tipo, message) => {
    const erro = new ErroCanalEmail(tipo);
    expect(erro).toMatchObject({ tipo, name: 'ErroCanalEmail', message });
    expect(Object.keys(erro).sort()).toEqual(['name', 'tipo']);
    expect(erro).not.toHaveProperty('cause');
    expect(erro).not.toHaveProperty('response');
  });
});
