import { describe, expect, it } from 'vitest';
import { lerConfiguracaoEntregaCodigo } from '../src/email/configuracaoEntrega';
import { criarCifradorCodigo } from '../src/email/cifrador';

const chave = Buffer.alloc(32, 7).toString('base64');
const outra = Buffer.alloc(32, 8).toString('base64');
const smtp = { NODE_ENV: 'test', EMAIL_CODIGO_MODE: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_FROM: 'envio@example.com', SMTP_MODE: 'local', EMAIL_CODIGO_KEY_ID: 'nova', EMAIL_CODIGO_KEYS: JSON.stringify({ antiga: chave, nova: outra }) };

describe('configuração de entrega', () => {
  it.each(['development', 'test'])('assume desenvolvimento em %s', ambiente => {
    expect(lerConfiguracaoEntregaCodigo({ NODE_ENV: ambiente })).toEqual({ modo: 'desenvolvimento' });
  });
  it('assume desenvolvimento quando NODE_ENV está ausente', () => {
    expect(lerConfiguracaoEntregaCodigo({})).toEqual({ modo: 'desenvolvimento' });
  });
  it('aceita SMTP autenticado em produção sem abrir rede', () => {
    const config = lerConfiguracaoEntregaCodigo({ ...smtp, NODE_ENV: 'production', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_MODE: 'tls', SMTP_USER: 'usuario', SMTP_PASSWORD: 'senha' });
    expect(config.modo).toBe('smtp');
    if (config.modo !== 'smtp') throw new Error('modo incorreto');
    expect(config.smtp).toEqual({ ambiente: 'production', host: 'smtp.example.com', porta: 465, remetente: 'envio@example.com', modo: 'tls', usuario: 'usuario', senha: 'senha' });
    expect(config.chaves.ativaId).toBe('nova');
  });
  it.each([undefined, '', 'a'.repeat(65)])('recusa ID ativo inválido', id => {
    expect(() => lerConfiguracaoEntregaCodigo({ ...smtp, EMAIL_CODIGO_KEY_ID: id })).toThrow('Configuração do canal de e-mail inválida.');
  });
  it('recusa NODE_ENV vazio', () => {
    expect(() => lerConfiguracaoEntregaCodigo({ NODE_ENV: '' })).toThrow('Configuração do canal de e-mail inválida.');
  });
  it.each([{ NODE_ENV: 'production' }, { NODE_ENV: 'invalid' }, { NODE_ENV: 'test', EMAIL_CODIGO_MODE: 'invalido' }, { NODE_ENV: 'production', EMAIL_CODIGO_MODE: 'desenvolvimento' }, { NODE_ENV: 'test', SMTP_HOST: '' }, { NODE_ENV: 'test', EMAIL_CODIGO_KEY_ID: '' }, { NODE_ENV: 'test', EMAIL_CODIGO_KEYS: '' }])('recusa modo ou ambiente inválido: %o', env => {
    expect(() => lerConfiguracaoEntregaCodigo(env)).toThrow('Configuração do canal de e-mail inválida.');
  });
  it.each([1, 4])('aceita ring com %i chaves', quantidade => {
    const keys = Object.fromEntries(Array.from({ length: quantidade }, (_, i) => [`k${i}`, chave]));
    const config = lerConfiguracaoEntregaCodigo({ ...smtp, EMAIL_CODIGO_KEY_ID: 'k0', EMAIL_CODIGO_KEYS: JSON.stringify(keys) });
    expect(config.modo === 'smtp' && config.chaves.cifradores.size).toBe(quantidade);
  });
  it('aceita rotação com cifradores antigos e novo sem retornar as chaves', () => {
    const config = lerConfiguracaoEntregaCodigo(smtp);
    expect(config.modo).toBe('smtp');
    if (config.modo !== 'smtp') throw new Error('modo incorreto');
    expect(config.chaves.ativaId).toBe('nova');
    const msg = { id: '00000000-0000-4000-8000-000000000001', codigoId: '00000000-0000-4000-8000-000000000002', destinatario: 'a@example.com', codigo: '123456', expiraEm: '2030-01-01T00:00:00.000Z' };
    for (const id of ['antiga', 'nova']) {
      const cifrador = config.chaves.cifradores.get(id)!;
      expect(cifrador.decifrar(cifrador.cifrar(msg), { id: msg.id, codigoId: msg.codigoId })).toEqual(msg);
      const independente = criarCifradorCodigo(id === 'antiga' ? chave : outra);
      expect(independente.decifrar(cifrador.cifrar(msg), { id: msg.id, codigoId: msg.codigoId })).toEqual(msg);
    }
    expect(JSON.stringify(config)).not.toContain(chave);
    expect(JSON.stringify(config)).not.toContain(outra);
  });
  it.each(['null', JSON.stringify({ nova: null }), JSON.stringify({ nova: 123 })])('recusa objeto ou valor de chave inválido', keys => {
    expect(() => lerConfiguracaoEntregaCodigo({ ...smtp, EMAIL_CODIGO_KEYS: keys })).toThrow('Configuração do canal de e-mail inválida.');
  });
  it.each(['{', '[]', '{}', JSON.stringify({ a: chave, b: chave, c: chave, d: chave, e: chave }), JSON.stringify({ nova: 'segredo' }), JSON.stringify({ nova: chave.slice(0, -1) }), JSON.stringify({ 'bad.id': chave }), '{"__proto__":"' + chave + '","nova":"' + chave + '"}', JSON.stringify({ constructor: chave, nova: chave }), JSON.stringify({ prototype: chave, nova: chave }), JSON.stringify({ antiga: chave })])('recusa ring inválido sem divulgar conteúdo', keys => {
    try { lerConfiguracaoEntregaCodigo({ ...smtp, EMAIL_CODIGO_KEYS: keys }); throw new Error('aceitou'); } catch (erro) {
      expect(erro).toMatchObject({ name: 'ErroCanalEmail', tipo: 'configuracao', message: 'Configuração do canal de e-mail inválida.' });
      expect(JSON.stringify(erro)).not.toContain(chave);
      expect(JSON.stringify(erro)).not.toContain('segredo');
    }
  });
  it('recusa SMTP inválido sem divulgar senha', () => {
    try { lerConfiguracaoEntregaCodigo({ ...smtp, SMTP_MODE: 'tls', SMTP_PASSWORD: 'senha-secreta' }); throw new Error('aceitou'); } catch (erro) {
      expect(erro).toMatchObject({ tipo: 'configuracao' });
      expect(JSON.stringify(erro)).not.toContain('senha-secreta');
    }
  });
});
