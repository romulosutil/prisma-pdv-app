import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { SMTPServer, type SMTPServerOptions } from 'smtp-server';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer, type Socket } from 'node:net';
import { ErroCanalEmail } from '../src/email/contrato';
import { criarCanalSmtp, lerConfiguracaoSmtp, type ConfiguracaoSmtp } from '../src/email/smtp';

const mensagem = { id: '00000000-0000-4000-8000-000000000001', codigoId: '00000000-0000-4000-8000-000000000002', destinatario: '  DONA@EXEMPLO.COM ', codigo: '012345', expiraEm: '2026-10-29T12:10:00Z' };
const env = { NODE_ENV: 'test', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_FROM: ' ENVIO@EXEMPLO.COM ', SMTP_MODE: 'local' };
const servidores: SMTPServer[] = [];

async function servidor(options: SMTPServerOptions = {}) {
  const instancia = new SMTPServer({ disabledCommands: ['AUTH', 'STARTTLS'], ...options });
  servidores.push(instancia);
  await new Promise<void>(resolve => instancia.listen(0, '127.0.0.1', resolve));
  const endereco = instancia.server.address();
  if (!endereco || typeof endereco === 'string') throw new Error('Endereço local inválido');
  return endereco.port;
}
function config(porta: number): ConfiguracaoSmtp {
  return { ambiente: 'test', host: '127.0.0.1', porta, remetente: 'envio@exemplo.com', modo: 'local' };
}
afterEach(async () => { await Promise.all(servidores.splice(0).map(s => new Promise<void>(resolve => s.close(() => resolve())))); });

describe('SMTP AC4–8', () => {
  it('normaliza remetente e exige modo explícito, com ambiente padrão development', () => {
    expect(lerConfiguracaoSmtp({ ...env, NODE_ENV: undefined })).toEqual({ ambiente: 'development', host: '127.0.0.1', porta: 2525, remetente: 'envio@exemplo.com', modo: 'local', usuario: undefined, senha: undefined });
    expect(lerConfiguracaoSmtp({ ...env, SMTP_MODE: 'tls', SMTP_USER: 'user', SMTP_PASSWORD: 'senha' }).modo).toBe('tls');
  });
  it.each([
    { SMTP_HOST: undefined }, { SMTP_HOST: 'localhost' }, { SMTP_HOST: 'smtp.exemplo.com' },
    { SMTP_PORT: undefined }, { SMTP_PORT: '0' }, { SMTP_PORT: '65536' }, { SMTP_PORT: '1.5' },
    { SMTP_FROM: undefined }, { SMTP_FROM: 'a@exemplo.com,b@exemplo.com' }, { SMTP_MODE: undefined },
    { SMTP_MODE: 'starttls' }, { SMTP_MODE: 'tls', SMTP_USER: 'user' },
    { NODE_ENV: 'production' }, { SMTP_USER: 'user' }, { SMTP_PASSWORD: 'senha' },
  ])('recusa configuração inválida %j', alteracao => {
    expect(() => lerConfiguracaoSmtp({ ...env, ...alteracao })).toThrow(new ErroCanalEmail('configuracao'));
  });
  it('revalida a configuração na fábrica antes de abrir conexão', () => {
    expect(() => criarCanalSmtp({ ...config(2525), host: 'localhost' })).toThrow(new ErroCanalEmail('configuracao'));
    expect(() => criarCanalSmtp({ ...config(2525), modo: 'tls' })).toThrow(new ErroCanalEmail('configuracao'));
  });
  it('envia envelope único, conteúdo e Message-ID estável, com aceitação local', async () => {
    const entregas: { from: string; to: string[]; data: string }[] = [];
    const porta = await servidor({ onData(stream, sessao, callback) {
      let data = ''; stream.on('data', chunk => { data += chunk.toString(); });
      stream.on('end', () => { entregas.push({ from: sessao.envelope.mailFrom && sessao.envelope.mailFrom.address || '', to: sessao.envelope.rcptTo.map(r => r.address), data }); callback(); });
    } });
    const canal = criarCanalSmtp(config(porta));
    await canal.enviar(mensagem); await canal.enviar(mensagem);
    expect(entregas).toHaveLength(2);
    for (const entrega of entregas) {
      expect(entrega.from).toBe('envio@exemplo.com'); expect(entrega.to).toEqual(['dona@exemplo.com']);
      expect(entrega.data).toContain('Subject: =?UTF-8?Q?Seu_c=C3=B3digo_de_acesso_Prisma_PDV?=');
      const texto = (entrega.data.split('\r\n\r\n')[1] ?? '').replace(/=\r\n/g, '').replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
      expect(Buffer.from(texto, 'latin1').toString('utf8')).toBe('Seu código de acesso é 012345.\r\nEle expira em 2026-10-29T12:10:00.000Z.\r\nSe você não pediu este código, ignore esta mensagem.\r\n');
      expect(entrega.data).toContain('Message-ID: <codigo-00000000-0000-4000-8000-000000000001@exemplo.com>');
    }
  });
  it.each([[450, 'temporario'], [550, 'permanente']] as const)('classifica resposta %i sem expor resposta ou dados', async (status, tipo) => {
    const porta = await servidor({ onRcptTo(_address, _session, callback) { const erro = Object.assign(new Error('TLS certificate segredo do provedor 012345'), { responseCode: status }); callback(erro); } });
    const erro = await criarCanalSmtp(config(porta)).enviar(mensagem).catch(e => e);
    expect(erro).toMatchObject({ name: 'ErroCanalEmail', tipo, message: new ErroCanalEmail(tipo).message });
    expect(Object.keys(erro).sort()).toEqual(['name', 'tipo']); expect(erro).not.toHaveProperty('cause'); expect(erro).not.toHaveProperty('response');
    expect(erro.stack).not.toContain('012345'); expect(erro.stack).not.toContain('dona@exemplo.com'); expect(erro.stack).not.toContain('segredo do provedor');
  });
  it('recusa mensagem inválida antes da conexão', async () => {
    let conexoes = 0;
    const porta = await servidor({ onConnect(_session, callback) { conexoes++; callback(); } });
    await expect(criarCanalSmtp(config(porta)).enviar({ ...mensagem, codigo: '123' })).rejects.toMatchObject({ tipo: 'mensagem_invalida' });
    expect(conexoes).toBe(0);
  });
  it.each(['ausente', 'certificado'] as const)('recusa STARTTLS %s sem transmitir DATA', async cenario => {
    let dados = 0; let autenticacoes = 0;
    const porta = await servidor({ disabledCommands: cenario === 'ausente' ? ['STARTTLS'] : [], allowInsecureAuth: true,
      onAuth(_auth, _session, callback) { autenticacoes++; callback(null, { user: 'teste' }); },
      onData(stream, _session, callback) { dados++; stream.resume(); stream.on('end', () => callback()); } });
    const canal = criarCanalSmtp({ ...config(porta), modo: 'starttls', usuario: 'user', senha: 'senha' });
    await expect(canal.enviar(mensagem)).rejects.toMatchObject({ tipo: 'permanente' });
    expect(autenticacoes).toBe(0); expect(dados).toBe(0);
  });
  it('classifica falha de autenticação como permanente', async () => {
    const spy = vi.spyOn(nodemailer, 'createTransport').mockReturnValueOnce({
      sendMail: async () => { throw Object.assign(new Error('senha secreta'), { code: 'EAUTH', responseCode: 454 }); },
    } as unknown as ReturnType<typeof nodemailer.createTransport>);
    try {
      const canal = criarCanalSmtp({ ...config(2525), modo: 'starttls', usuario: 'user', senha: 'senha' });
      const erro = await canal.enviar(mensagem).catch(e => e);
      expect(erro).toMatchObject({ tipo: 'permanente', message: new ErroCanalEmail('permanente').message });
      expect(erro.stack).not.toContain('senha secreta'); expect(erro).not.toHaveProperty('cause');
    } finally { spy.mockRestore(); }
  });
  it('aplica opções de segurança e limites fixos ao transporte real', async () => {
    const spy = vi.spyOn(nodemailer, 'createTransport');
    try {
      const porta = await servidor({ onData(stream, _session, callback) { stream.resume(); stream.on('end', () => callback()); } });
      await criarCanalSmtp(config(porta)).enviar(mensagem);
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0]?.[0]).toMatchObject({ host: '127.0.0.1', port: porta, secure: false,
        requireTLS: false, opportunisticTLS: false, ignoreTLS: true, pool: false, logger: false, debug: false,
        disableFileAccess: true, disableUrlAccess: true, dnsTimeout: 5000, connectionTimeout: 5000,
        greetingTimeout: 5000, socketTimeout: 5000, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' } });
      criarCanalSmtp({ ...config(porta), modo: 'starttls', usuario: 'user', senha: 'senha' });
      expect(spy.mock.calls[1]?.[0]).toMatchObject({ secure: false, requireTLS: true, opportunisticTLS: false, ignoreTLS: false });
      criarCanalSmtp({ ...config(porta), modo: 'tls', usuario: 'user', senha: 'senha' });
      expect(spy.mock.calls[2]?.[0]).toMatchObject({ secure: true, requireTLS: false, ignoreTLS: false });
    } finally { spy.mockRestore(); }
  });
  it('classifica conexão recusada como temporária', async () => {
    const porta = await servidor();
    const instancia = servidores.pop()!;
    await new Promise<void>(resolve => instancia.close(() => resolve()));
    await expect(criarCanalSmtp(config(porta)).enviar(mensagem)).rejects.toMatchObject({ tipo: 'temporario' });
  });
  it.each([false, true])('autenticação TCP com TLS local confiável, rejeição=%s', async rejeitar => {
    const certificado = resolve('test/fixtures/email/cert.pem');
    const chave = resolve('test/fixtures/email/key.pem');
    let autenticacoes = 0; let dados = 0;
    const porta = await servidor({ secure: true, key: readFileSync(chave), cert: readFileSync(certificado), disabledCommands: [],
      onAuth(auth, _session, callback) {
        expect(auth.username).toBe('usuario-teste'); expect(auth.password).toBe('senha-teste'); autenticacoes++;
        if (rejeitar) callback(Object.assign(new Error('rejeitado'), { responseCode: 535 }));
        else callback(null, { user: 'teste' });
      },
      onData(stream, _session, callback) { dados++; stream.resume(); stream.on('end', () => callback()); },
    });
    const codigo = `import { criarCanalSmtp } from './src/email/smtp.ts';
      const canal = criarCanalSmtp({ ambiente:'test', host:'127.0.0.1', porta:${porta}, remetente:'envio@exemplo.com', modo:'tls', usuario:'usuario-teste', senha:'senha-teste' });
      try { await canal.enviar(${JSON.stringify(mensagem)}); process.stdout.write('aceito'); }
      catch (erro) { process.stdout.write(erro.tipo); }`;
    const resultado = await new Promise<{ codigo: number | null; saida: string }>((resolvePromise, reject) => {
      const filho = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', codigo], {
        cwd: process.cwd(), env: { ...process.env, NODE_EXTRA_CA_CERTS: certificado }, stdio: ['ignore', 'pipe', 'pipe'],
      });
      const limite = setTimeout(() => filho.kill(), 10000);
      filho.stderr.resume();
      let saida = ''; filho.stdout.on('data', bloco => { saida += bloco.toString(); });
      filho.on('error', erro => { clearTimeout(limite); reject(erro); });
      filho.on('close', codigo => { clearTimeout(limite); resolvePromise({ codigo, saida }); });
    });
    expect(resultado).toEqual({ codigo: 0, saida: rejeitar ? 'permanente' : 'aceito' });
    expect(autenticacoes).toBe(1); expect(dados).toBe(rejeitar ? 0 : 1);
  });
  it.each([
    { accepted: [], rejected: [] },
    { accepted: ['dona@exemplo.com'], rejected: ['dona@exemplo.com'] },
  ])('recusa resultado do transporte sem aceitação exclusiva %j', async resultado => {
    const spy = vi.spyOn(nodemailer, 'createTransport').mockReturnValueOnce({
      sendMail: async () => resultado,
    } as unknown as ReturnType<typeof nodemailer.createTransport>);
    try {
      await expect(criarCanalSmtp(config(2525)).enviar(mensagem)).rejects.toMatchObject({ tipo: 'permanente' });
    } finally { spy.mockRestore(); }
  });
  it.each([
    { html: '<b>teste</b>' }, { attachments: [{ path: 'arquivo' }] },
    { headers: { 'X-Test': 'teste' } }, { cc: 'outro@exemplo.com' }, { bcc: 'outro@exemplo.com' },
  ])('recusa campo externo antes de conectar %j', async extra => {
    let conexoes = 0;
    const porta = await servidor({ onConnect(_session, callback) { conexoes++; callback(); } });
    await expect(criarCanalSmtp(config(porta)).enviar({ ...mensagem, ...extra })).rejects.toMatchObject({ tipo: 'mensagem_invalida' });
    expect(conexoes).toBe(0);
  });
  it('classifica timeout real de greeting como temporário', async () => {
    const sockets = new Set<Socket>();
    const instancia = createServer(socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
    await new Promise<void>(resolvePromise => instancia.listen(0, '127.0.0.1', resolvePromise));
    const endereco = instancia.address();
    if (!endereco || typeof endereco === 'string') throw new Error('Endereço local inválido');
    try {
      await expect(criarCanalSmtp(config(endereco.port)).enviar(mensagem)).rejects.toMatchObject({ tipo: 'temporario' });
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>(resolvePromise => instancia.close(() => resolvePromise()));
    }
  }, 12000);
});
