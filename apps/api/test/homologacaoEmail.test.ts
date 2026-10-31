import { beforeEach, describe, expect, it, vi } from 'vitest';
import { relogioSistema } from '@pdv/shared';

const m = vi.hoisted(() => {
  const ordem: string[] = [];
  const db = {};
  const fechar = vi.fn(async () => { ordem.push('db'); });
  const close = vi.fn(async () => { ordem.push('app'); });
  const listen = vi.fn(async () => { ordem.push('listen'); });
  const app = { listen, close, log: { info: vi.fn() } };
  const pararEmail = vi.fn(async () => { ordem.push('email'); });
  return { ordem, db, fechar, close, listen, app, pararEmail,
    abrir: vi.fn(async () => ({ db, fechar })), criarApp: vi.fn(async (_config: unknown) => app),
    expirar: vi.fn(async () => { ordem.push('expirar'); }), validar: vi.fn(async () => { ordem.push('validar'); }),
    canalObjeto: {}, canal: vi.fn(), cobranca: vi.fn(), agendar: vi.fn((_processar: () => unknown, _registrar: (mensagem: string) => void) => { ordem.push('agendar'); return pararEmail; }), processar: vi.fn((_db: unknown, _opcoes: unknown) => undefined) };
});
vi.mock('../src/db/conexao', () => ({ abrirPostgres: m.abrir }));
vi.mock('../src/servidor', () => ({ criarApp: m.criarApp }));
vi.mock('../src/email/filaCodigo', () => ({ encerrarEntregasExpiradas: m.expirar, validarPendenciasEntrega: m.validar, processarEntregasCodigo: m.processar }));
vi.mock('../src/email/smtp', async (importOriginal) => ({ ...await importOriginal<typeof import('../src/email/smtp')>(), criarCanalSmtp: m.canal }));
vi.mock('../src/jobs', () => ({ agendarCobranca: m.cobranca }));
vi.mock('../src/jobsEmail', () => ({ agendarEntregasCodigo: m.agendar }));
import { iniciarHomologacaoEmail, lerConfiguracaoHomologacaoEmail } from '../src/homologacaoEmail';

const env = (): NodeJS.ProcessEnv => ({ NODE_ENV: 'development', HOMOLOGACAO_EMAIL_CONFIRMAR: 'sim',
  DATABASE_URL: 'postgres://local:senha@127.0.0.1:5432/pdv_homologacao_email', EMAIL_CODIGO_MODE: 'smtp',
  EMAIL_CODIGO_KEY_ID: 'k1', EMAIL_CODIGO_KEYS: JSON.stringify({ k1: Buffer.alloc(32, 1).toString('base64') }),
  SMTP_HOST: 'smtp.resend.com', SMTP_PORT: '465', SMTP_MODE: 'tls', SMTP_USER: 'resend',
  SMTP_PASSWORD: 'segredo', SMTP_FROM: 'acesso@prumo.services' });

beforeEach(() => { vi.clearAllMocks(); m.ordem.length = 0; m.canal.mockReturnValue(m.canalObjeto); });

describe('homologação isolada', () => {
  it('aceita configuração explícita e localhost', () => {
    const e = env(); e.DATABASE_URL = 'postgresql://localhost/pdv_homologacao_email';
    expect(lerConfiguracaoHomologacaoEmail(e).entrega.modo).toBe('smtp');
  });
  it.each([
    ['NODE_ENV', undefined], ['NODE_ENV', 'production'], ['HOMOLOGACAO_EMAIL_CONFIRMAR', 'não'],
    ['DATABASE_URL', 'postgres://remote/pdv_homologacao_email'], ['DATABASE_URL', 'postgres://localhost/demo8087'],
    ['DATABASE_URL', 'postgres://localhost/pdv_homologacao_email?sslmode=disable'],
    ['DATABASE_URL', 'postgres://localhost/pdv_homologacao_email#x'], ['DATABASE_URL', 'postgres://127.1/pdv_homologacao_email'],
    ['EMAIL_CODIGO_MODE', 'desenvolvimento'], ['SMTP_HOST', 'localhost'], ['SMTP_PORT', '587'],
    ['SMTP_MODE', 'starttls'], ['SMTP_USER', 'outro'], ['SMTP_FROM', 'outro@prumo.services'],
    ['SMTP_PASSWORD', ''], ['EMAIL_CODIGO_KEYS', 'segredo'], ['EMAIL_CODIGO_KEY_ID', 'ausente'],
  ])('rejeita %s=%s antes de efeitos', async (chave, valor) => {
    const e = env(); e[chave] = valor;
    await expect(iniciarHomologacaoEmail(e)).rejects.toThrow('Configuração de homologação de e-mail inválida.');
    expect(m.abrir).not.toHaveBeenCalled(); expect(m.canal).not.toHaveBeenCalled();
  });
  it('compõe apenas a API e o worker de e-mail após as guardas e listen', async () => {
    const { parar } = await iniciarHomologacaoEmail(env());
    expect(m.ordem).toEqual(['expirar', 'validar', 'listen', 'agendar']);
    expect(m.criarApp).toHaveBeenCalledWith(expect.objectContaining({ db: m.db, relogio: relogioSistema,
      fontesEan: [], habilitarRotasDev: false, emissaoCodigo: expect.objectContaining({ modo: 'email', dominioRemetente: 'prumo.services' }) }));
    expect(m.listen).toHaveBeenCalledWith({ host: '127.0.0.1', port: 3339 });
    expect(m.canal).toHaveBeenCalledWith(lerConfiguracaoHomologacaoEmail(env()).entrega.smtp);
    expect(m.cobranca).not.toHaveBeenCalled();
    m.agendar.mock.calls[0]![0]();
    expect(m.processar).toHaveBeenCalledWith(m.db, { chaves: expect.objectContaining({ ativaId: 'k1' }),
      canal: m.canalObjeto, dominioRemetente: 'prumo.services', relogio: relogioSistema });
    expect((m.processar.mock.calls[0]![1] as { chaves: unknown }).chaves).toBe(
      (m.criarApp.mock.calls[0]![0] as { emissaoCodigo: { chaves: unknown } }).emissaoCodigo.chaves);
    await Promise.all([parar(), parar()]);
    expect(m.ordem.slice(-3)).toEqual(['email', 'app', 'db']);
    expect(m.pararEmail).toHaveBeenCalledTimes(1); expect(m.close).toHaveBeenCalledTimes(1); expect(m.fechar).toHaveBeenCalledTimes(1);
  });
  it('aguarda worker antes de fechar e limpa tudo mesmo quando drain falha', async () => {
    let liberar!: () => void;
    m.pararEmail.mockImplementationOnce(() => new Promise<void>(resolve => { liberar = resolve; }));
    const { parar } = await iniciarHomologacaoEmail(env());
    const parada = parar(); expect(m.close).not.toHaveBeenCalled(); liberar(); await parada;
    expect(m.ordem.slice(-2)).toEqual(['app', 'db']);
    m.pararEmail.mockRejectedValueOnce(new Error('segredo'));
    const outro = await iniciarHomologacaoEmail(env());
    await expect(outro.parar()).rejects.toThrow('Falha ao encerrar a homologação de e-mail.');
    expect(m.close).toHaveBeenCalledTimes(2); expect(m.fechar).toHaveBeenCalledTimes(2);
  });
  it('limpa recursos em falha de inicialização sem expor erro', async () => {
    m.listen.mockRejectedValueOnce(new Error('segredo'));
    await expect(iniciarHomologacaoEmail(env())).rejects.toThrow('Falha ao iniciar a homologação de e-mail.');
    expect(m.close).toHaveBeenCalledTimes(1); expect(m.fechar).toHaveBeenCalledTimes(1); expect(m.agendar).not.toHaveBeenCalled();
  });
  it('sanitiza falha ao abrir banco antes de criar canal ou app', async () => {
    m.abrir.mockRejectedValueOnce(new Error('segredo'));
    await expect(iniciarHomologacaoEmail(env())).rejects.toThrow('Falha ao iniciar a homologação de e-mail.');
    expect(m.abrir).toHaveBeenCalledTimes(1); expect(m.canal).not.toHaveBeenCalled();
    expect(m.criarApp).not.toHaveBeenCalled(); expect(m.fechar).not.toHaveBeenCalled();
  });
  it('fecha banco quando criação do canal falha antes de listen', async () => {
    m.canal.mockImplementationOnce(() => { throw new Error('segredo'); });
    await expect(iniciarHomologacaoEmail(env())).rejects.toThrow('Falha ao iniciar a homologação de e-mail.');
    expect(m.canal).toHaveBeenCalledTimes(1); expect(m.fechar).toHaveBeenCalledTimes(1);
    expect(m.criarApp).not.toHaveBeenCalled(); expect(m.listen).not.toHaveBeenCalled();
  });
  it('fecha banco quando criação do app falha', async () => {
    m.criarApp.mockRejectedValueOnce(new Error('segredo'));
    await expect(iniciarHomologacaoEmail(env())).rejects.toThrow('Falha ao iniciar a homologação de e-mail.');
    expect(m.criarApp).toHaveBeenCalledTimes(1); expect(m.fechar).toHaveBeenCalledTimes(1);
    expect(m.listen).not.toHaveBeenCalled(); expect(m.close).not.toHaveBeenCalled();
  });
  it('fecha banco mesmo se fechamento do app falhar', async () => {
    m.close.mockRejectedValueOnce(new Error('segredo'));
    const { parar } = await iniciarHomologacaoEmail(env());
    await expect(parar()).rejects.toThrow('Falha ao encerrar a homologação de e-mail.');
    expect(m.pararEmail).toHaveBeenCalledTimes(1); expect(m.close).toHaveBeenCalledTimes(1);
    expect(m.fechar).toHaveBeenCalledTimes(1); expect(m.ordem.slice(-2)).toEqual(['email', 'db']);
  });
  it('fecha banco se guarda de pendências falhar antes de servir', async () => {
    m.validar.mockRejectedValueOnce(new Error('segredo'));
    await expect(iniciarHomologacaoEmail(env())).rejects.toThrow('Falha ao iniciar a homologação de e-mail.');
    expect(m.fechar).toHaveBeenCalledTimes(1); expect(m.canal).not.toHaveBeenCalled(); expect(m.listen).not.toHaveBeenCalled();
  });
});
