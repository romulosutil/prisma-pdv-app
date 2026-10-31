import { afterEach, expect, it, vi } from 'vitest';
import { relogioSistema } from '@pdv/shared';
const m = vi.hoisted(() => ({ fechar: vi.fn(), criar: vi.fn(), cobrar: vi.fn(), email: vi.fn(), listen: vi.fn(), close: vi.fn() }));
vi.mock('../src/db/conexao', () => ({ abrirPostgres: async () => ({ db: {}, fechar: m.fechar }) }));
vi.mock('../src/email/filaCodigo', () => ({ encerrarEntregasExpiradas: vi.fn(), validarPendenciasEntrega: vi.fn(), processarEntregasCodigo: vi.fn() }));
vi.mock('../src/email/smtp', async original => ({ ...await original<typeof import('../src/email/smtp')>(), criarCanalSmtp: vi.fn(() => ({})) }));
vi.mock('../src/servidor', () => ({ criarApp: m.criar }));
vi.mock('../src/jobs', () => ({ agendarCobranca: m.cobrar }));
vi.mock('../src/jobsEmail', () => ({ agendarEntregasCodigo: m.email }));
import { iniciarApi } from '../src/iniciarApi';
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('produção disabled mantém relógio real e e-mail ativo sem job comercial', async () => {
  for (const [k, v] of Object.entries({ NODE_ENV: 'production', BILLING_PROVIDER: 'disabled', PORT: '3333', DATABASE_URL: 'postgres://db/pdv',
    EMAIL_CODIGO_MODE: 'smtp', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_MODE: 'tls', SMTP_USER: 'user', SMTP_PASSWORD: 'fixture', SMTP_FROM: 'acesso@example.com',
    EMAIL_CODIGO_KEY_ID: 'k', EMAIL_CODIGO_KEYS: JSON.stringify({ k: Buffer.alloc(32, 2).toString('base64') }) })) vi.stubEnv(k, v);
  vi.stubEnv('JOBS', undefined);
  m.criar.mockResolvedValue({ listen: m.listen, close: m.close, log: { info: vi.fn() } });
  m.email.mockReturnValue(async () => undefined);
  const { parar } = await iniciarApi();
  expect(m.criar).toHaveBeenCalledWith(expect.objectContaining({ relogio: relogioSistema, cobrancaDesativada: true, emissaoCodigo: expect.objectContaining({ modo: 'email' }) }));
  expect(m.listen).toHaveBeenCalledWith({ port: 3333, host: '0.0.0.0' });
  expect(m.email).toHaveBeenCalledTimes(1); expect(m.cobrar).not.toHaveBeenCalled();
  await parar(); expect(m.close).toHaveBeenCalledTimes(1); expect(m.fechar).toHaveBeenCalledTimes(1);
});
