import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MockBillingProvider, RelogioFalso, relogioSistema, type Relogio } from '@pdv/shared';
import { criarBilling } from '../src/billing';
import type { Conexao } from '../src/db/conexao';
import { criarApp } from '../src/servidor';
import { emissaoTeste } from './emailFixture';
import { abrirBanco, INICIO } from './ajuda';

let banco: Conexao;
beforeAll(async () => {
  banco = await abrirBanco();
});
afterAll(() => banco.fechar());
afterEach(() => vi.unstubAllEnvs());

const criar = (relogio: Relogio) => criarApp({ db: banco.db, relogio, billing: new MockBillingProvider(), fontesEan: [], ...(process.env.NODE_ENV === 'production' ? { emissaoCodigo: emissaoTeste } : {}) });

describe('rotas /dev', () => {
  it('fora de produção: avançam o relógio e rodam o job', async () => {
    const relogio = new RelogioFalso(INICIO);
    const app = await criar(relogio);

    const avancou = await app.inject({ method: 'POST', url: '/dev/relogio/avancar', payload: { dias: 7 } });
    expect(avancou.statusCode).toBe(200);
    expect(avancou.json()).toEqual({ agora: '2026-03-17T12:00:00.000Z' });
    expect(relogio.agora().toISOString()).toBe('2026-03-17T12:00:00.000Z');

    const job = await app.inject({ method: 'POST', url: '/dev/jobs/cobranca' });
    expect(job.json()).toEqual({ cobrancas: 0, aprovadas: 0, recusadas: 0, suspensas: 0, lembretes: 0, erros: 0 });

    const invalido = await app.inject({ method: 'POST', url: '/dev/relogio/avancar', payload: { dias: -1 } });
    expect(invalido.statusCode).toBe(400);
    await app.close();
  });

  it('com relógio real não dá para avançar o tempo', async () => {
    const app = await criar(relogioSistema);
    const res = await app.inject({ method: 'POST', url: '/dev/relogio/avancar', payload: { dias: 1 } });
    expect(res.statusCode).toBe(409);
    expect(res.json().erro).toBe('relogio_real');
    await app.close();
  });

  it('com NODE_ENV=production as rotas não existem', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const app = await criar(new RelogioFalso(INICIO));

    for (const url of ['/dev/relogio/avancar', '/dev/jobs/cobranca']) {
      const res = await app.inject({ method: 'POST', url, payload: { dias: 1 } });
      expect(res.statusCode).toBe(404);
      expect(res.json().erro).toBe('rota_nao_encontrada');
    }
    expect((await app.inject({ method: 'GET', url: '/saude' })).statusCode).toBe(200);
    await app.close();
  });
});

describe('criarBilling', () => {
  it('mock exige seleção explícita e outros providers ainda não existem', () => {
    expect(criarBilling()).not.toBeInstanceOf(MockBillingProvider);
    expect(criarBilling('mock')).toBeInstanceOf(MockBillingProvider);
    expect(() => criarBilling('stripe')).toThrow(/não é suportado/);
  });
});
