import { describe, expect, it } from 'vitest';
import { lerConfiguracaoRevisorPlay, validarConfiguracao } from '../src/configuracao';
import { criarBilling } from '../src/billing';

const producao = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://usuario:senha@localhost/banco', PORT: '3333' };

describe('configuração da API', () => {
  it.each([
    [{ NODE_ENV: 'production', PORT: '3333' }, 'DATABASE_URL é obrigatória'],
    [{ ...producao, DATABASE_URL: 'https://usuario:segredo@localhost/banco' }, 'DATABASE_URL deve ser'],
    [{ ...producao, DATABASE_URL: 'invalida-segredo' }, 'DATABASE_URL deve ser'],
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
    expect(validarConfiguracao({ NODE_ENV: ambiente })).toEqual({ ambiente, porta: 3333, databaseUrl: undefined, billingProvider: 'disabled' });
    expect(validarConfiguracao({ NODE_ENV: ambiente, PORT: '8080', BILLING_PROVIDER: 'mock', DATABASE_URL: 'postgres://localhost/banco' }))
      .toEqual({ ambiente, porta: 8080, databaseUrl: 'postgres://localhost/banco', billingProvider: 'mock' });
  });

  it('assume development quando NODE_ENV está ausente', () => {
    expect(validarConfiguracao({}).ambiente).toBe('development');
  });

  it('sanitiza nomes desconhecidos também na fábrica de billing', () => {
    expect(() => criarBilling('provedor-segredo')).toThrow('BILLING_PROVIDER não é suportado. Valores aceitos: disabled, mock.');
    try { criarBilling('provedor-segredo'); } catch (erro) { expect((erro as Error).message).not.toContain('segredo'); }
  });

  it('produção sem seleção de gateway não simula verificação, cobrança ou estorno', async () => {
    expect(validarConfiguracao(producao).billingProvider).toBe('disabled');
    expect(validarConfiguracao({ ...producao, BILLING_PROVIDER: 'google_play' }).billingProvider).toBe('google_play');
    const billing = criarBilling();
    await expect(billing.verificarCartao('qualquer-token')).rejects.toMatchObject({ codigo: 'cobranca_desativada' });
    await expect(billing.cobrar({ clienteRef: 'cliente', valorCentavos: 100, descricao: 'Teste', chaveIdempotencia: 'pedido' })).rejects.toMatchObject({ codigo: 'cobranca_desativada' });
    await expect(billing.estornar('transacao')).rejects.toMatchObject({ codigo: 'cobranca_desativada' });
  });

  it('lê e valida PDV_PLAY_REVIEW_EMAIL e PDV_PLAY_REVIEW_CODE sem expor valores', () => {
    expect(lerConfiguracaoRevisorPlay({})).toBeNull();
    expect(lerConfiguracaoRevisorPlay({
      PDV_PLAY_REVIEW_EMAIL: '  Revisor.Play@Exemplo.COM.BR ',
      PDV_PLAY_REVIEW_CODE: ' 049281 ',
    })).toEqual({
      email: 'revisor.play@exemplo.com.br',
      codigo: '049281',
    });

    const invalidos: Array<[NodeJS.ProcessEnv, string, string]> = [
      [{ PDV_PLAY_REVIEW_EMAIL: 'segredo@exemplo.com' }, 'definidas juntas', 'segredo@exemplo.com'],
      [{ PDV_PLAY_REVIEW_CODE: '654321' }, 'definidas juntas', '654321'],
      [{ PDV_PLAY_REVIEW_EMAIL: 'invalido-segredo', PDV_PLAY_REVIEW_CODE: '654321' }, 'e-mail válido', 'invalido-segredo'],
      [{ PDV_PLAY_REVIEW_EMAIL: 'revisor@exemplo.com', PDV_PLAY_REVIEW_CODE: '12345' }, '6 dígitos numéricos', '12345'],
      [{ PDV_PLAY_REVIEW_EMAIL: 'revisor@exemplo.com', PDV_PLAY_REVIEW_CODE: '12ab56' }, '6 dígitos numéricos', '12ab56'],
      [{ PDV_PLAY_REVIEW_EMAIL: 'revisor@exemplo.com', PDV_PLAY_REVIEW_CODE: '1234567' }, '6 dígitos numéricos', '1234567'],
    ];

    for (const [env, trechoEsperado, segredo] of invalidos) {
      let mensagem = '';
      try {
        lerConfiguracaoRevisorPlay(env);
        throw new Error('configuração inválida aceita');
      } catch (erro) {
        mensagem = (erro as Error).message;
      }
      expect(mensagem).toContain(trechoEsperado);
      expect(mensagem).not.toContain(segredo);
    }
  });
});
