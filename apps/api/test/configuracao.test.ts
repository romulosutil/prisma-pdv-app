import { describe, expect, it } from 'vitest';
import { validarConfiguracao } from '../src/configuracao';
import { criarBilling } from '../src/billing';

const producao = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://usuario:senha@localhost/banco', PORT: '3333' };

describe('configuração da API', () => {
  it.each([
    [{ NODE_ENV: 'production', PORT: '3333' }, 'DATABASE_URL é obrigatória'],
    [{ ...producao, DATABASE_URL: 'https://usuario:segredo@localhost/banco' }, 'DATABASE_URL deve ser'],
    [{ ...producao, DATABASE_URL: 'invalida-segredo' }, 'DATABASE_URL deve ser'],
    [{ ...producao }, 'Nenhum provedor'],
    [{ ...producao, BILLING_PROVIDER: 'mock', JOBS: 'off' }, 'Nenhum provedor'],
    [{ ...producao, BILLING_PROVIDER: 'provedor-segredo' }, 'BILLING_PROVIDER não é suportado'],
    [{ ...producao, PORT: '' }, 'PORT deve ser'],
    [{ ...producao, PORT: '0' }, 'PORT deve ser'],
    [{ ...producao, PORT: '65536' }, 'PORT deve ser'],
    [{ ...producao, PORT: '1.5' }, 'PORT deve ser'],
    [{ ...producao, PORT: undefined }, 'PORT deve ser'],
    [{ NODE_ENV: 'prodution' }, 'NODE_ENV deve ser'],
    [{ NODE_ENV: 'test', DATABASE_URL: '' }, 'DATABASE_URL deve ser'],
  ])('rejeita configuração inválida sem revelar valores', (env, mensagem) => {
    try {
      validarConfiguracao(env);
      throw new Error('configuração aceita indevidamente');
    } catch (erro) {
      expect((erro as Error).message).toContain(mensagem);
      expect((erro as Error).message).not.toContain('segredo');
      expect((erro as Error).message).not.toContain(producao.DATABASE_URL);
    }
  });

  it.each(['development', 'test'])('mantém defaults e aceita PostgreSQL em %s', (ambiente) => {
    expect(validarConfiguracao({ NODE_ENV: ambiente })).toEqual({ ambiente, porta: 3333, databaseUrl: undefined, billingProvider: 'mock' });
    expect(validarConfiguracao({ NODE_ENV: ambiente, PORT: '8080', BILLING_PROVIDER: 'mock', DATABASE_URL: 'postgres://localhost/banco' }))
      .toEqual({ ambiente, porta: 8080, databaseUrl: 'postgres://localhost/banco', billingProvider: 'mock' });
  });

  it('assume development quando NODE_ENV está ausente', () => {
    expect(validarConfiguracao({}).ambiente).toBe('development');
  });

  it('sanitiza nomes desconhecidos também na fábrica de billing', () => {
    expect(() => criarBilling('provedor-segredo')).toThrow('BILLING_PROVIDER não é suportado. Valores aceitos: mock.');
    try { criarBilling('provedor-segredo'); } catch (erro) { expect((erro as Error).message).not.toContain('segredo'); }
  });
});
