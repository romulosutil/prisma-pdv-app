import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { gerarId } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import { aparelhos, codigosLogin, entregasCodigo, limitesAuth, recuperacoesAparelho, sessoes } from '../src/db/schema';
import { sha256 } from '../src/auth';
import { criarApp } from '../src/servidor';
import { abrirBanco, chamar, criarAmbiente, criarConta, type Ambiente } from './ajuda';
import { emissaoTeste } from './emailFixture';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { vi.unstubAllEnvs(); await amb.fechar(); });
afterAll(async () => { await banco.fechar(); });

describe('emissão de código', () => {
  it('produção exige modo email explícito', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] })).rejects.toThrow();
    await expect(criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: { modo: 'desenvolvimento' } })).rejects.toThrow();
  });
  it('email conhecido e desconhecido respondem vazio, com OTP e envelope apenas para conhecido', async () => {
    const conta = await criarConta(amb); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    try {
      const logs: unknown[] = [];
      app.addHook('onRequest', async request => { vi.spyOn(request.log, 'info').mockImplementation((...args: unknown[]) => { logs.push(args); }); vi.spyOn(request.log, 'error').mockImplementation((...args: unknown[]) => { logs.push(args); }); });
      for (const email of [conta.email, 'ausente@example.com']) { const r = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email } }); expect([r.statusCode, r.body]).toEqual([204, '']); }
      const otps = await amb.db.select().from(codigosLogin); const filas = await amb.db.select().from(entregasCodigo);
      expect(otps).toHaveLength(1); expect(filas).toHaveLength(1);
      const e = filas[0]!, otp = otps[0]!;
      expect([e.codigoId, e.contaId, e.chaveId, e.estado, e.dominioRemetente]).toEqual([otp.id, conta.contaId, 'teste', 'pendente', 'example.com']);
      if (emissaoTeste.modo !== 'email') throw new Error();
      const mensagem = emissaoTeste.chaves.cifradores.get('teste')!.decifrar(e.envelope, { id: e.id, codigoId: e.codigoId });
      expect(mensagem.destinatario).toBe(conta.email); expect(otp.codigoHash).toBe(sha256(`${conta.email}:${mensagem.codigo}`));
      expect(JSON.stringify(e)).not.toContain(mensagem.codigo); expect(JSON.stringify(e)).not.toContain(conta.email);
      expect(JSON.stringify(logs)).not.toContain(mensagem.codigo); expect(JSON.stringify(logs)).not.toContain(conta.email); expect(JSON.stringify(logs)).not.toContain(Buffer.alloc(32, 7).toString('base64'));
    } finally { await app.close(); vi.restoreAllMocks(); }
  });
  it('desenvolvimento mantém código no corpo sem criar fila', async () => {
    const conta = await criarConta(amb); const r = await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } });
    expect(r.status).toBe(200); expect(r.corpo.codigo).toMatch(/^\d{6}$/); expect(await amb.db.select().from(entregasCodigo)).toEqual([]);
  });
  it('não escreve código ou erro original no logger da requisição', async () => {
    const conta = await criarConta(amb); const logs: unknown[] = [];
    const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
    try {
      app.addHook('onRequest', async request => { vi.spyOn(request.log, 'info').mockImplementation((...args: unknown[]) => { logs.push(args); }); vi.spyOn(request.log, 'error').mockImplementation((...args: unknown[]) => { logs.push(args); }); });
      const r = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } });
      expect(r.statusCode).toBe(200); const codigo = r.json().codigo as string;
      expect(JSON.stringify(logs)).not.toContain(codigo); expect(JSON.stringify(logs)).not.toContain(conta.email);
    } finally { await app.close(); vi.restoreAllMocks(); }
  });
  it('login consome e cancela entrega; quinta falha cancela sem consumir', async () => {
    const conta = await criarConta(amb); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    try {
      const pedir = async () => { await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } }); const [e] = await amb.db.select().from(entregasCodigo).where(eq(entregasCodigo.estado, 'pendente')); if (emissaoTeste.modo !== 'email') throw new Error(); return { e: e!, mensagem: emissaoTeste.chaves.cifradores.get('teste')!.decifrar(e!.envelope, { id: e!.id, codigoId: e!.codigoId }) }; };
      const primeiro = await pedir();
      const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: conta.email, codigo: primeiro.mensagem.codigo, aparelhoId: conta.aparelhoId, aparelhoNome: 'C' } });
      expect(login.statusCode).toBe(200);
      const [usada] = await amb.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, primeiro.e.id)); expect([usada!.estado, usada!.motivo, usada!.envelope]).toEqual(['cancelada', 'usado', null]);
      amb.relogio.avancarHoras(1); const segundo = await pedir(); const errado = segundo.mensagem.codigo === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email: conta.email, codigo: errado, aparelhoId: gerarId(), aparelhoNome: 'C' } })).statusCode).toBe(401);
      const [esgotada] = await amb.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, segundo.e.id)); expect([esgotada!.estado, esgotada!.motivo, esgotada!.envelope]).toEqual(['cancelada', 'esgotado', null]);
    } finally { await app.close(); }
  });
  it('recuperação consome entrega e conflito de aparelho conserva a prova', async () => {
    const conta = await criarConta(amb); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    try {
      await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } });
      const [e] = await amb.db.select().from(entregasCodigo); if (emissaoTeste.modo !== 'email') throw new Error();
      const mensagem = emissaoTeste.chaves.cifradores.get('teste')!.decifrar(e!.envelope, { id: e!.id, codigoId: e!.codigoId });
      const conflito = await app.inject({ method: 'POST', url: '/auth/recuperacao', payload: { email: conta.email, codigo: mensagem.codigo, aparelhoId: conta.aparelhoId, aparelhoNome: 'C' } });
      expect(conflito.statusCode).toBe(409);
      const [antes] = await amb.db.select().from(entregasCodigo); const [otpAntes] = await amb.db.select().from(codigosLogin);
      expect([antes!.estado, antes!.envelope, otpAntes!.usadoEm]).toEqual(['pendente', e!.envelope, null]);
      const resposta = await app.inject({ method: 'POST', url: '/auth/recuperacao', payload: { email: conta.email, codigo: mensagem.codigo, aparelhoId: gerarId(), aparelhoNome: 'Novo' } });
      expect(resposta.statusCode).toBe(200);
      const [depois] = await amb.db.select().from(entregasCodigo); const [otpDepois] = await amb.db.select().from(codigosLogin);
      expect([depois!.estado, depois!.motivo, depois!.envelope, depois!.chaveId, depois!.leaseToken, depois!.leaseExpiraEm]).toEqual(['cancelada', 'usado', null, null, null, null]);
      expect(otpDepois!.usadoEm).not.toBeNull();
    } finally { await app.close(); }
  });
  it('conflito de limite no login conserva código e entrega', async () => {
    const conta = await criarConta(amb); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    try {
      await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } });
      const [e] = await amb.db.select().from(entregasCodigo); if (emissaoTeste.modo !== 'email') throw new Error();
      const mensagem = emissaoTeste.chaves.cifradores.get('teste')!.decifrar(e!.envelope, { id: e!.id, codigoId: e!.codigoId });
      const r = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: conta.email, codigo: mensagem.codigo, aparelhoId: gerarId(), aparelhoNome: 'Novo' } });
      expect(r.statusCode).toBe(409); expect(r.json().erro).toBe('limite_aparelhos');
      const [depois] = await amb.db.select().from(entregasCodigo); const [otp] = await amb.db.select().from(codigosLogin);
      expect(depois).toEqual(e); expect(otp!.usadoEm).toBeNull();
    } finally { await app.close(); }
  });
  it('429 mantém entrega e OTP anteriores', async () => {
    const conta = await criarConta(amb); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    try {
      await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } });
      const antes = [await amb.db.select().from(codigosLogin), await amb.db.select().from(entregasCodigo)];
      const r = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } });
      expect(r.statusCode).toBe(429); expect(r.json().erro).toBe('limite_autenticacao');
      expect([await amb.db.select().from(codigosLogin), await amb.db.select().from(entregasCodigo)]).toEqual(antes);
    } finally { await app.close(); }
  });
  it('nova emissão invalida OTP, desafio e entrega anteriores', async () => {
    const conta = await criarConta(amb); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    try {
      await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } });
      const [e] = await amb.db.select().from(entregasCodigo); const agora = amb.relogio.agora();
      await amb.db.insert(recuperacoesAparelho).values({ id: gerarId(), tokenHash: sha256('teste'), contaId: conta.contaId, lojaId: conta.lojaId, operadorId: conta.operadorId, aparelhoNovoId: gerarId(), aparelhoNovoNome: 'Novo', aparelhosPermitidos: [conta.aparelhoId], criadoEm: agora, expiraEm: new Date(agora.getTime() + 300000) });
      amb.relogio.avancarHoras(1);
      expect((await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } })).statusCode).toBe(204);
      const [antiga] = await amb.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, e!.id));
      const [otp] = await amb.db.select().from(codigosLogin).where(eq(codigosLogin.id, e!.codigoId));
      const [desafio] = await amb.db.select().from(recuperacoesAparelho);
      expect([antiga!.estado, antiga!.motivo, antiga!.envelope, antiga!.chaveId]).toEqual(['cancelada', 'substituida', null, null]);
      expect(otp!.usadoEm).not.toBeNull(); expect(desafio!.invalidadoEm).not.toBeNull();
      expect((await amb.db.select().from(entregasCodigo)).filter(x => x.estado === 'pendente')).toHaveLength(1);
    } finally { await app.close(); }
  });
  it.each(['login', 'recuperacao', 'quinta_falha'])('reverte consumo e negócio quando cancelamento falha em %s', async (cenario) => {
    const conta = await criarConta(amb); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    try {
      await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } });
      const [entrega] = await amb.db.select().from(entregasCodigo);
      if (emissaoTeste.modo !== 'email') throw new Error();
      const codigo = emissaoTeste.chaves.cifradores.get('teste')!.decifrar(entrega!.envelope, { id: entrega!.id, codigoId: entrega!.codigoId }).codigo;
      const errado = codigo === '000000' ? '111111' : '000000';
      const corpo = { email: conta.email, codigo: cenario === 'quinta_falha' ? errado : codigo, aparelhoId: cenario === 'recuperacao' ? gerarId() : conta.aparelhoId, aparelhoNome: 'Novo' };
      const rota = cenario === 'recuperacao' ? '/auth/recuperacao' : '/auth/login';
      if (cenario === 'quinta_falha') for (let i = 0; i < 4; i++) expect((await app.inject({ method: 'POST', url: rota, payload: corpo })).statusCode).toBe(401);
      const snapshot = async () => [await amb.db.select().from(codigosLogin), await amb.db.select().from(entregasCodigo), await amb.db.select().from(recuperacoesAparelho), await amb.db.select().from(aparelhos), await amb.db.select().from(sessoes), await amb.db.select().from(limitesAuth)];
      const antes = await snapshot();
      if (cenario === 'quinta_falha') expect((await amb.db.select().from(codigosLogin))[0]!.tentativas).toBe(4);
      await amb.db.execute(sql.raw("CREATE OR REPLACE FUNCTION teste_cancelamento_falha() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.estado = 'cancelada' THEN RAISE EXCEPTION 'falha simulada'; END IF; RETURN NEW; END $$"));
      await amb.db.execute(sql.raw('CREATE TRIGGER teste_cancelamento_falha BEFORE UPDATE ON entregas_codigo FOR EACH ROW EXECUTE FUNCTION teste_cancelamento_falha()'));
      expect((await app.inject({ method: 'POST', url: rota, payload: corpo })).statusCode).toBe(500);
      expect(await snapshot()).toEqual(antes);
      if (cenario === 'quinta_falha') expect((await amb.db.select().from(codigosLogin))[0]!.tentativas).toBe(4);
      await amb.db.execute(sql.raw('DROP TRIGGER teste_cancelamento_falha ON entregas_codigo'));
      await amb.db.execute(sql.raw('DROP FUNCTION teste_cancelamento_falha()'));
      expect((await app.inject({ method: 'POST', url: rota, payload: corpo })).statusCode).toBe(cenario === 'quinta_falha' ? 401 : 200);
      const [depois] = await amb.db.select().from(entregasCodigo);
      expect([depois!.estado, depois!.motivo, depois!.envelope, depois!.chaveId, depois!.leaseToken, depois!.leaseExpiraEm]).toEqual(['cancelada', cenario === 'quinta_falha' ? 'esgotado' : 'usado', null, null, null, null]);
      if (cenario === 'quinta_falha') expect((await amb.db.select().from(codigosLogin))[0]!.tentativas).toBe(5);
    } finally {
      await amb.db.execute(sql.raw('DROP TRIGGER IF EXISTS teste_cancelamento_falha ON entregas_codigo'));
      await amb.db.execute(sql.raw('DROP FUNCTION IF EXISTS teste_cancelamento_falha()'));
      await app.close();
    }
  });
  it.each(['cifra', 'otp_update', 'recuperacao_update', 'fila_update', 'otp_insert', 'fila_insert'])('falha %s reverte OTP, desafio, fila e orçamentos', async (ponto) => {
    const conta = await criarConta(amb); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    let falho: typeof app | undefined;
    try {
      await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } });
      const [entregaAnterior] = await amb.db.select().from(entregasCodigo);
      if (emissaoTeste.modo !== 'email') throw new Error();
      const codigoAnterior = emissaoTeste.chaves.cifradores.get('teste')!.decifrar(entregaAnterior!.envelope, { id: entregaAnterior!.id, codigoId: entregaAnterior!.codigoId }).codigo;
      const agora = amb.relogio.agora();
      await amb.db.insert(recuperacoesAparelho).values({ id: gerarId(), tokenHash: sha256('token-teste'), contaId: conta.contaId, lojaId: conta.lojaId, operadorId: conta.operadorId, aparelhoNovoId: gerarId(), aparelhoNovoNome: 'Novo', aparelhosPermitidos: [conta.aparelhoId], criadoEm: agora, expiraEm: new Date(agora.getTime() + 300000) });
      amb.relogio.definir(new Date(agora.getTime() + 60000));
      const snapshot = async () => [await amb.db.select().from(codigosLogin), await amb.db.select().from(recuperacoesAparelho), await amb.db.select().from(entregasCodigo), await amb.db.select().from(limitesAuth)];
      const antes = await snapshot();
      if (ponto !== 'cifra') {
        const alvo: Record<string, [string, string]> = { otp_update: ['codigos_login', 'UPDATE'], recuperacao_update: ['recuperacoes_aparelho', 'UPDATE'], fila_update: ['entregas_codigo', 'UPDATE'], otp_insert: ['codigos_login', 'INSERT'], fila_insert: ['entregas_codigo', 'INSERT'] };
        const [tabela, operacao] = alvo[ponto]!;
        await amb.db.execute(sql.raw(`CREATE OR REPLACE FUNCTION teste_emissao_falha() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'segredo original'; END $$`));
        await amb.db.execute(sql.raw(`CREATE TRIGGER teste_emissao_falha BEFORE ${operacao} ON ${tabela} FOR EACH ROW EXECUTE FUNCTION teste_emissao_falha()`));
      }
      if (emissaoTeste.modo !== 'email') throw new Error();
      const cifrador = emissaoTeste.chaves.cifradores.get('teste')!;
      const emissao = ponto === 'cifra' ? { ...emissaoTeste, chaves: { ativaId: 'teste', cifradores: new Map([['teste', { ...cifrador, cifrar() { throw new Error('segredo original'); } }]]) } } : emissaoTeste;
      falho = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissao });
      const logs: unknown[] = [];
      falho.addHook('onRequest', async request => { vi.spyOn(request.log, 'error').mockImplementation((...args: unknown[]) => { logs.push(args); }); vi.spyOn(request.log, 'info').mockImplementation((...args: unknown[]) => { logs.push(args); }); });
      const r = await falho.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } });
      expect(r.statusCode).toBe(503); expect(r.json().erro).toBe('codigo_indisponivel'); expect(r.body).not.toContain('segredo original'); expect(r.body).not.toContain(conta.email);
      expect(JSON.stringify(logs)).not.toContain('segredo original'); expect(JSON.stringify(logs)).not.toContain(conta.email);
      expect(await snapshot()).toEqual(antes);
      for (const tabela of ['codigos_login', 'recuperacoes_aparelho', 'entregas_codigo']) await amb.db.execute(sql.raw(`DROP TRIGGER IF EXISTS teste_emissao_falha ON ${tabela}`));
      await amb.db.execute(sql.raw('DROP FUNCTION IF EXISTS teste_emissao_falha()'));
      const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: conta.email, codigo: codigoAnterior, aparelhoId: conta.aparelhoId, aparelhoNome: 'C' } });
      expect(login.statusCode).toBe(200);
      const [cancelada] = await amb.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, entregaAnterior!.id));
      expect([cancelada!.estado, cancelada!.motivo, cancelada!.envelope, cancelada!.chaveId]).toEqual(['cancelada', 'usado', null, null]);
    } finally {
      for (const tabela of ['codigos_login', 'recuperacoes_aparelho', 'entregas_codigo']) await amb.db.execute(sql.raw(`DROP TRIGGER IF EXISTS teste_emissao_falha ON ${tabela}`));
      await amb.db.execute(sql.raw('DROP FUNCTION IF EXISTS teste_emissao_falha()'));
      await falho?.close(); await app.close(); vi.restoreAllMocks();
    }
  });
});
