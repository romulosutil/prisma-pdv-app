import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => {
  const ordem: string[] = [];
  const app = { listen: vi.fn(async () => { ordem.push('listen'); }), close: vi.fn(async () => { ordem.push('app.close'); }), log: { info: vi.fn() } };
  const db = {};
  const fechar = vi.fn(async () => { ordem.push('db.close'); });
  return { ordem, app, db, fechar, abrir: vi.fn(async () => { ordem.push('db.open'); return { db, fechar }; }), expirar: vi.fn(async () => { ordem.push('expirar'); }), validar: vi.fn(async (..._args: unknown[]) => { ordem.push('validar'); }), criar: vi.fn(async (..._args: unknown[]) => { ordem.push('app'); return app; }), canal: vi.fn((..._args: unknown[]) => { ordem.push('canal'); return {}; }), agendar: vi.fn(), cobranca: vi.fn(() => { ordem.push('cobranca'); return vi.fn(() => { ordem.push('cobranca.stop'); }); }), processar: vi.fn() };
});
vi.mock('../src/db/conexao', () => ({ abrirPglite: m.abrir, abrirPostgres: m.abrir }));
vi.mock('../src/email/filaCodigo', () => ({ encerrarEntregasExpiradas: m.expirar, validarPendenciasEntrega: m.validar, processarEntregasCodigo: m.processar }));
vi.mock('../src/email/smtp', async importOriginal => ({ ...(await importOriginal<typeof import('../src/email/smtp')>()), criarCanalSmtp: m.canal }));
vi.mock('../src/servidor', () => ({ criarApp: m.criar }));
vi.mock('../src/jobs', () => ({ agendarCobranca: m.cobranca }));
vi.mock('../src/jobsEmail', () => ({ agendarEntregasCodigo: m.agendar }));
vi.mock('../src/servicos/retencaoSuporte', () => ({ limparSuporteConcluido: vi.fn(async () => 0), agendarRetencaoSuporte: vi.fn(() => async () => undefined) }));
import { limparSuporteConcluido, agendarRetencaoSuporte } from '../src/servicos/retencaoSuporte';
import { iniciarApi } from '../src/iniciarApi';

const smtp = { NODE_ENV: 'test', EMAIL_CODIGO_MODE: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_FROM: 'ENVIO@Example.com', SMTP_MODE: 'local', EMAIL_CODIGO_KEY_ID: 'k', EMAIL_CODIGO_KEYS: JSON.stringify({ k: Buffer.alloc(32, 7).toString('base64') }) };
beforeEach(() => { vi.stubEnv('NODE_ENV', 'test'); for (const k of ['DATABASE_URL', 'PORT', 'BILLING_PROVIDER', 'JOBS', 'EMAIL_CODIGO_MODE', 'EMAIL_CODIGO_KEY_ID', 'EMAIL_CODIGO_KEYS', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM', 'SMTP_MODE', 'SMTP_USER', 'SMTP_PASSWORD']) vi.stubEnv(k, undefined); m.ordem.length = 0; m.agendar.mockImplementation(() => { m.ordem.push('email'); return async () => { m.ordem.push('email.stop'); }; }); });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const env = (valores: Record<string, string>) => { for (const [k, v] of Object.entries(valores)) vi.stubEnv(k, v); };
describe('bootstrap de entrega', () => {
  it('recusa configuração inválida e billing mock de produção antes de abrir banco', async () => {
    env({ EMAIL_CODIGO_MODE: 'smtp' });
    await expect(iniciarApi()).rejects.toThrow(); expect(m.abrir).not.toHaveBeenCalled(); expect(m.canal).not.toHaveBeenCalled();
    env({ ...smtp, NODE_ENV: 'production', DATABASE_URL: 'postgres://localhost/test', PORT: '3333', JOBS: 'off', BILLING_PROVIDER: 'mock' });
    await expect(iniciarApi()).rejects.toThrow('Nenhum provedor de cobrança disponível é permitido em produção.'); expect(m.abrir).not.toHaveBeenCalled();
  });
  it('limpa expiradas e valida pendências antes de servir em desenvolvimento, com JOBS off', async () => {
    env({ JOBS: 'off' }); const { parar } = await iniciarApi();
    expect(m.ordem).toEqual(['db.open', 'expirar', 'validar', 'app', 'listen']);
    expect(m.validar.mock.calls[0]?.[1]).toEqual({ modo: 'desenvolvimento' });
    expect(m.agendar).not.toHaveBeenCalled(); expect(m.cobranca).not.toHaveBeenCalled(); await parar();
    expect(limparSuporteConcluido).toHaveBeenCalledOnce(); expect(agendarRetencaoSuporte).not.toHaveBeenCalled();
    expect(m.ordem.slice(-2)).toEqual(['app.close', 'db.close']);
  });
  it('recusa pendências e fecha banco antes de criar app ou canal', async () => {
    env(smtp); m.validar.mockImplementationOnce(async () => { m.ordem.push('validar'); throw new Error('segredo'); });
    await expect(iniciarApi()).rejects.toThrow();
    expect(m.ordem).toEqual(['db.open', 'expirar', 'validar', 'db.close']);
    expect(m.criar).not.toHaveBeenCalled(); expect(m.canal).not.toHaveBeenCalled();
  });
  it('JOBS off em SMTP preserva a fila sem agendar processador', async () => {
    env({ ...smtp, JOBS: 'off' }); const { parar } = await iniciarApi();
    expect(m.ordem).toEqual(['db.open', 'expirar', 'validar', 'canal', 'app', 'listen']);
    expect(m.agendar).not.toHaveBeenCalled(); expect(m.processar).not.toHaveBeenCalled(); expect(m.cobranca).not.toHaveBeenCalled();
    await parar();
  });
  it('compõe canal e domínio, agenda após listen e aguarda drain antes do banco', async () => {
    env({ ...smtp, BILLING_PROVIDER: 'mock' }); let liberar!: () => void;
    m.agendar.mockImplementation((processar: () => Promise<unknown>) => { m.ordem.push('email'); void processar(); return () => new Promise<void>(resolve => { liberar = resolve; m.ordem.push('email.stop'); }); });
    const { parar } = await iniciarApi();
    expect(m.ordem).toEqual(['db.open', 'expirar', 'validar', 'canal', 'app', 'listen', 'cobranca', 'email']);
    expect(m.validar.mock.calls[0]?.[1]).toMatchObject({ modo: 'email', dominioRemetente: 'example.com' });
    expect(m.criar.mock.calls[0]?.[0]).toMatchObject({ emissaoCodigo: { modo: 'email', dominioRemetente: 'example.com' } });
    expect(m.canal.mock.calls[0]?.[0]).toMatchObject({ remetente: 'envio@example.com' });
    expect(m.processar.mock.calls[0]?.[1]).toMatchObject({ dominioRemetente: 'example.com', canal: expect.any(Object) });
    const espera = parar(); expect(m.fechar).not.toHaveBeenCalled(); await vi.waitFor(() => expect(liberar).toBeTypeOf('function')); liberar(); await espera; await parar(); expect(m.fechar).toHaveBeenCalledTimes(1);
  });
  it('falhas de listen e limpeza liberam todos os recursos com erro sanitizado', async () => {
    m.app.listen.mockRejectedValueOnce(new Error('password')); m.app.close.mockRejectedValueOnce(new Error('sql'));
    await expect(iniciarApi()).rejects.toThrow('Falha ao iniciar a API.');
    expect(m.fechar).toHaveBeenCalledTimes(1);
    const { parar } = await iniciarApi(); m.app.close.mockRejectedValueOnce(new Error('sql'));
    await expect(parar()).rejects.toThrow('Falha ao encerrar a API.'); expect(m.fechar).toHaveBeenCalledTimes(2);
  });
  it('continua a limpeza se parada dos jobs falha', async () => {
    env({ ...smtp, BILLING_PROVIDER: 'mock' });
    m.cobranca.mockImplementationOnce(() => vi.fn(() => { throw new Error('segredo cobrança'); }));
    m.agendar.mockImplementationOnce(() => async () => { throw new Error('segredo email'); });
    const { parar } = await iniciarApi();
    await expect(parar()).rejects.toThrow('Falha ao encerrar a API.');
    expect(m.app.close).toHaveBeenCalledTimes(1); expect(m.fechar).toHaveBeenCalledTimes(1);
    await expect(parar()).rejects.toThrow('Falha ao encerrar a API.'); expect(m.fechar).toHaveBeenCalledTimes(1);
  });
});
