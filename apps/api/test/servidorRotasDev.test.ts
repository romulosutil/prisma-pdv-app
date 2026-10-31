import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockBillingProvider, relogioSistema } from '@pdv/shared';
import type { Db } from '../src/db/conexao';
import { criarApp } from '../src/servidor';
import { emissaoTeste } from './emailFixture';

afterEach(() => vi.unstubAllEnvs());

describe('isolamento das ferramentas de desenvolvimento AC5', () => {
  it.each([false, true, undefined])('preserva o padrão fora de produção, opção=%s', async opcao => {
    vi.stubEnv('NODE_ENV', 'test');
    const app = await criarApp({ db: {} as Db, billing: new MockBillingProvider(), relogio: relogioSistema, habilitarRotasDev: opcao, fontesEan: [] });
    try {
      const resposta = await app.inject({ method: 'POST', url: '/dev/relogio/avancar', payload: { dias: 1 } });
      expect(resposta.statusCode).toBe(opcao === false ? 404 : 409);
      expect(resposta.json().erro).toBe(opcao === false ? 'rota_nao_encontrada' : 'relogio_real');
      expect(app.hasRoute({ method: 'POST', url: '/dev/jobs/cobranca' })).toBe(opcao !== false);
      if (opcao === false) {
        const cobranca = await app.inject({ method: 'POST', url: '/dev/jobs/cobranca' });
        expect(cobranca.statusCode).toBe(404);
        expect(cobranca.json().erro).toBe('rota_nao_encontrada');
      }
      expect(app.hasRoute({ method: 'POST', url: '/auth/codigo' })).toBe(true);
      expect(app.hasRoute({ method: 'POST', url: '/auth/login' })).toBe(true);
    } finally { await app.close(); }
  });

  it('não permite habilitar ferramentas em produção com opção true', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    // MockBilling é fixture da fábrica de rotas. O bootstrap de produção continua recusando-o.
    const app = await criarApp({ db: {} as Db, billing: new MockBillingProvider(), relogio: relogioSistema, habilitarRotasDev: true, emissaoCodigo: emissaoTeste, fontesEan: [] });
    try {
      for (const url of ['/dev/relogio/avancar', '/dev/jobs/cobranca']) {
        const resposta = await app.inject({ method: 'POST', url, payload: { dias: 1 } });
        expect(resposta.statusCode).toBe(404);
        expect(resposta.json().erro).toBe('rota_nao_encontrada');
      }
    } finally { await app.close(); }
  });
});
