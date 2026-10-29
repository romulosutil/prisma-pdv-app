import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { RelogioFalso } from '@pdv/shared';
import { abrirPglite, abrirPostgres, type Conexao } from '../src/db/conexao';
import { contas, codigosLogin, entregasCodigo, lojas, vendas, itensVenda, pagamentosVenda, caixas, movimentosCaixa, assinaturas, faturas, eventosCobranca, testesUsados } from '../src/db/schema';
import { sha256 } from '../src/auth';
import { criarCifradorCodigo } from '../src/email/cifrador';
import { cancelarEntregasDaConta, encerrarEntregasExpiradas, enfileirarCodigo, processarEntregasCodigo, validarPendenciasEntrega } from '../src/email/filaCodigo';
import { ErroCanalEmail } from '../src/email/contrato';

const inicio = new Date('2026-01-01T00:00:00Z');
const chaves = { ativaId: 'a', cifradores: new Map([['a', criarCifradorCodigo(Buffer.alloc(32, 1).toString('base64'))]]) };
async function inserir(c: Conexao, n: number) {
  const contaId = randomUUID(), codigoId = randomUUID(), email = `t${n}@example.com`, codigo = '123456';
  const expiraEm = new Date(inicio.getTime() + 600000);
  await c.db.insert(contas).values({ id: contaId, email, documento: `doc${n}`, nomeResponsavel: 'Teste', criadoEm: inicio, atualizadoEm: inicio });
  await c.db.insert(codigosLogin).values({ id: codigoId, email, codigoHash: sha256(`${email}:${codigo}`), criadoEm: inicio, expiraEm });
  const id = await enfileirarCodigo(c.db, chaves, { contaId, codigoId, email, codigo, dominioRemetente: 'example.com', criadoEm: inicio, expiraEm });
  return { id, contaId, codigoId };
}

describe('fila de código', () => {
  it('persiste cifrado e limpa material ao aceitar', async () => {
    const conexao = await abrirPglite();
    try {
      const agora = new Date('2026-01-01T00:00:00Z');
      const relogio = new RelogioFalso(agora);
      const contaId = randomUUID(), codigoId = randomUUID();
      const email = 'teste@example.com', codigo = '123456';
      const expiraEm = new Date(agora.getTime() + 600000);
      const chaves = { ativaId: 'a', cifradores: new Map([['a', criarCifradorCodigo(Buffer.alloc(32, 1).toString('base64'))]]) };
      await conexao.db.insert(contas).values({ id: contaId, email, documento: 'doc', nomeResponsavel: 'Teste', criadoEm: agora, atualizadoEm: agora });
      await conexao.db.insert(codigosLogin).values({ id: codigoId, email, codigoHash: sha256(`${email}:${codigo}`), criadoEm: agora, expiraEm });
      const id = await enfileirarCodigo(conexao.db, chaves, { contaId, codigoId, email, codigo, dominioRemetente: 'example.com', criadoEm: agora, expiraEm });
      const [antes] = await conexao.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, id));
      expect(JSON.stringify(antes!.envelope)).not.toContain(codigo);
      const mensagens: unknown[] = [];
      const resumo = await processarEntregasCodigo(conexao.db, { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar(m) { mensagens.push(m); } } });
      expect(resumo.aceitas).toBe(1);
      expect(mensagens).toEqual([{ id, codigoId, destinatario: email, codigo, expiraEm: expiraEm.toISOString() }]);
      const [depois] = await conexao.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, id));
      expect([depois!.estado, depois!.envelope, depois!.chaveId, depois!.leaseToken, depois!.leaseExpiraEm]).toEqual(['aceita', null, null, null, null]);
    } finally { await conexao.fechar(); }
  });
});

describe.each(['pglite', ...(process.env.PDV_TEST_POSTGRES_URL ? ['postgres'] : [])])('fila %s', (motor) => {
  async function abrir() {
    if (motor === 'pglite') return abrirPglite();
    const url = process.env.PDV_TEST_POSTGRES_URL!;
    const parsed = new URL(url);
    if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname) || parsed.pathname !== '/pdv_test') throw new Error('Banco de teste inválido');
    const c = await abrirPostgres(url);
    await c.db.execute('TRUNCATE TABLE entregas_codigo, codigos_login, contas CASCADE');
    return c;
  }
  it('retenta com prazos fixos e encerra na quinta falha', async () => {
    const c = await abrir();
    try {
      const { id } = await inserir(c, 1); const relogio = new RelogioFalso(inicio); const mensagens: unknown[] = [];
      const op = { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar(m: unknown) { mensagens.push(m); throw new ErroCanalEmail('temporario'); } } };
      let t = inicio.getTime();
      for (const delay of [5000, 30000, 120000, 300000]) {
        expect((await processarEntregasCodigo(c.db, op)).retentativas).toBe(1);
        t += delay;
        const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, id));
        expect(e!.proximaTentativaEm.getTime()).toBe(t);
        relogio.definir(new Date(t));
      }
      expect((await processarEntregasCodigo(c.db, op)).falhas).toBe(1);
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, id));
      expect([e!.estado, e!.motivo, e!.tentativas, e!.envelope]).toEqual(['falhou', 'tentativas_esgotadas', 5, null]);
      expect(mensagens).toHaveLength(5); expect(mensagens.every(m => JSON.stringify(m) === JSON.stringify(mensagens[0]))).toBe(true);
    } finally { await c.fechar(); }
  });
  it.each([undefined, null, false, 0, ''])('rejeição falsy %s agenda retry sem aceitar', async (erro) => {
    const c = await abrir();
    try {
      const item = await inserir(c, 113); const relogio = new RelogioFalso(inicio);
      const resultado = await processarEntregasCodigo(c.db, { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar() { return Promise.reject(erro); } } });
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([resultado.aceitas, resultado.retentativas]).toEqual([0, 1]);
      expect([e!.estado, e!.tentativas, e!.motivo, e!.proximaTentativaEm.getTime()]).toEqual(['pendente', 1, 'temporario', inicio.getTime() + 5000]);
      expect(e!.envelope).not.toBeNull(); expect(e!.chaveId).toBe('a');
    } finally { await c.fechar(); }
  });
  it('avança além de bloqueados sem adiar disponibilidade e valida rotação', async () => {
    const c = await abrir();
    try {
      for (let i = 0; i < 25; i++) { const item = await inserir(c, i); await c.db.update(entregasCodigo).set({ chaveId: 'antiga' }).where(eq(entregasCodigo.id, item.id)); }
      const valido = await inserir(c, 25); const relogio = new RelogioFalso(inicio); let enviados = 0;
      const op = { chaves, dominioRemetente: 'example.com', relogio, limite: 20, canal: { async enviar() { enviados++; } } };
      await expect(validarPendenciasEntrega(c.db, { modo: 'email', chaves, dominioRemetente: 'example.com' }, relogio)).rejects.toMatchObject({ tipo: 'configuracao' });
      expect((await processarEntregasCodigo(c.db, op)).bloqueadas).toBe(20);
      expect((await processarEntregasCodigo(c.db, op)).aceitas).toBe(1);
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, valido.id));
      expect(e!.estado).toBe('aceita'); expect(enviados).toBe(1);
      const bloqueadas = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.motivo, 'chave_ausente'));
      expect(bloqueadas).toHaveLength(25); expect(bloqueadas.every(x => x.proximaTentativaEm.getTime() === inicio.getTime() && x.tentativas === 0 && x.envelope)).toBe(true);
      relogio.definir(new Date(inicio.getTime() + 600000));
      expect(await encerrarEntregasExpiradas(c.db, relogio)).toBe(25);
      await expect(validarPendenciasEntrega(c.db, { modo: 'desenvolvimento' }, relogio)).resolves.toBeUndefined();
    } finally { await c.fechar(); }
  });
  it('cancelamento durante envio impede ACK antigo', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 99); const relogio = new RelogioFalso(inicio);
      const resumo = await processarEntregasCodigo(c.db, { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar() { await cancelarEntregasDaConta(c.db, item.contaId, inicio); } } });
      expect(resumo.ignoradas).toBe(1);
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([e!.estado, e!.motivo, e!.envelope, e!.leaseToken]).toEqual(['cancelada', 'substituida', null, null]);
    } finally { await c.fechar(); }
  });
  it('lease impede concorrente e sucessor impede ACK antigo', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 101); const relogio = new RelogioFalso(inicio);
      let liberar!: () => void, iniciou!: () => void;
      const aguardando = new Promise<void>(r => { liberar = r; });
      const iniciado = new Promise<void>(r => { iniciou = r; });
      const mensagens: unknown[] = [];
      const op = { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar(m: unknown) { mensagens.push(m); if (mensagens.length === 1) { iniciou(); await aguardando; } } } };
      const primeiro = processarEntregasCodigo(c.db, op); await iniciado;
      expect((await processarEntregasCodigo(c.db, op)).aceitas).toBe(0);
      relogio.definir(new Date(inicio.getTime() + 60001));
      expect((await processarEntregasCodigo(c.db, op)).aceitas).toBe(1);
      liberar(); expect((await primeiro).ignoradas).toBe(1);
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([e!.estado, e!.tentativas, e!.envelope]).toEqual(['aceita', 2, null]);
      expect(mensagens).toHaveLength(2); expect(mensagens[0]).toEqual(mensagens[1]);
    } finally { await c.fechar(); }
  });
  it.each(['sucesso', 'temporario', 'permanente'])('resultado antigo %s não altera claim ainda ativa do sucessor', async (resultadoAntigo) => {
    const c = await abrir();
    let liberarPrimeiro!: () => void, liberarSegundo!: () => void;
    const esperaPrimeiro = new Promise<void>(r => { liberarPrimeiro = r; });
    const esperaSegundo = new Promise<void>(r => { liberarSegundo = r; });
    try {
      const item = await inserir(c, 120); const relogio = new RelogioFalso(inicio);
      let iniciouPrimeiro!: () => void, iniciouSegundo!: () => void;
      const primeiroIniciado = new Promise<void>(r => { iniciouPrimeiro = r; });
      const segundoIniciado = new Promise<void>(r => { iniciouSegundo = r; });
      let chamadas = 0; const mensagens: unknown[] = [];
      const op = { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar(m: unknown) {
        mensagens.push(m);
        if (++chamadas === 1) {
          iniciouPrimeiro(); await esperaPrimeiro;
          if (resultadoAntigo !== 'sucesso') throw new ErroCanalEmail(resultadoAntigo as 'temporario' | 'permanente');
        } else { iniciouSegundo(); await esperaSegundo; }
      } } };
      const primeiro = processarEntregasCodigo(c.db, op); await primeiroIniciado;
      const [claimAntiga] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      relogio.definir(new Date(inicio.getTime() + 60001));
      const segundo = processarEntregasCodigo(c.db, op); await segundoIniciado;
      const [claimNova] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect(claimNova!.estado).toBe('enviando'); expect(claimNova!.tentativas).toBe(2);
      expect(claimNova!.leaseToken).not.toBeNull(); expect(claimNova!.leaseToken).not.toBe(claimAntiga!.leaseToken);
      expect(claimNova!.leaseExpiraEm!.getTime()).toBe(inicio.getTime() + 120001);
      liberarPrimeiro();
      expect((await primeiro).ignoradas).toBe(1);
      const [aposAntigo] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect(aposAntigo).toEqual(claimNova);
      liberarSegundo(); expect((await segundo).aceitas).toBe(1);
      const [final] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([final!.estado, final!.tentativas, final!.envelope, final!.chaveId, final!.leaseToken, final!.leaseExpiraEm]).toEqual(['aceita', 2, null, null, null, null]);
      expect(mensagens).toHaveLength(2); expect(mensagens[0]).toEqual(mensagens[1]);
    } finally { liberarPrimeiro(); liberarSegundo(); await c.fechar(); }
  });
  it('recupera envio aceito sem ACK após lease', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 102); const relogio = new RelogioFalso(inicio); const mensagens: unknown[] = [];
      const op = { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar(m: unknown) { mensagens.push(m); relogio.definir(new Date(inicio.getTime() + 60001)); } } };
      expect((await processarEntregasCodigo(c.db, op)).ignoradas).toBe(1);
      const [antes] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([antes!.estado, antes!.tentativas]).toEqual(['enviando', 1]); expect(antes!.envelope).not.toBeNull();
      expect((await processarEntregasCodigo(c.db, op)).aceitas).toBe(1);
      expect(mensagens[0]).toEqual(mensagens[1]);
    } finally { await c.fechar(); }
  });
  it('bloqueia domínio e payload incompatíveis sem consumir tentativa', async () => {
    const c = await abrir();
    try {
      const a = await inserir(c, 103), b = await inserir(c, 104); const relogio = new RelogioFalso(inicio);
      await c.db.update(entregasCodigo).set({ dominioRemetente: 'outro.example' }).where(eq(entregasCodigo.id, a.id));
      await c.db.update(codigosLogin).set({ codigoHash: 'incorreto' }).where(eq(codigosLogin.id, b.codigoId));
      let envios = 0;
      const resumo = await processarEntregasCodigo(c.db, { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar() { envios++; } } });
      expect(resumo.bloqueadas).toBe(2); expect(envios).toBe(0);
      const linhas = await c.db.select().from(entregasCodigo);
      expect(linhas.map(x => x.motivo).sort()).toEqual(['canal_incompativel', 'payload_invalido']);
      expect(linhas.every(x => x.tentativas === 0 && x.envelope && x.proximaTentativaEm.getTime() === inicio.getTime())).toBe(true);
      await expect(validarPendenciasEntrega(c.db, { modo: 'desenvolvimento' }, relogio)).rejects.toMatchObject({ tipo: 'configuracao' });
    } finally { await c.fechar(); }
  });
  it('cancela OTP usado, esgotado ou expirado antes de consultar chave', async () => {
    const c = await abrir();
    try {
      const a = await inserir(c, 105), b = await inserir(c, 106), d = await inserir(c, 107); const relogio = new RelogioFalso(inicio);
      await c.db.update(codigosLogin).set({ usadoEm: inicio }).where(eq(codigosLogin.id, a.codigoId));
      await c.db.update(codigosLogin).set({ tentativas: 5 }).where(eq(codigosLogin.id, b.codigoId));
      await c.db.update(entregasCodigo).set({ expiraEm: inicio }).where(eq(entregasCodigo.id, d.id));
      let envios = 0;
      const resumo = await processarEntregasCodigo(c.db, { chaves: { ativaId: 'x', cifradores: new Map() }, dominioRemetente: 'example.com', relogio, canal: { async enviar() { envios++; } } });
      expect(resumo.canceladas).toBe(3); expect(envios).toBe(0);
      const linhas = await c.db.select().from(entregasCodigo);
      expect(linhas.map(x => x.motivo).sort()).toEqual(['esgotado', 'expirado', 'usado']);
      expect(linhas.every(x => x.envelope === null && x.chaveId === null)).toBe(true);
    } finally { await c.fechar(); }
  });
  it('mantém lease após falha de banco no ACK e permite recuperação', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 108); const relogio = new RelogioFalso(inicio); let falharAck = false; const mensagens: unknown[] = [];
      const db = new Proxy(c.db, { get(target, key, receiver) {
        if (key === 'transaction') return (...args: Parameters<typeof target.transaction>) => {
          if (falharAck) throw new Error('detalhes privados do banco');
          return target.transaction(...args);
        };
        return Reflect.get(target, key, receiver);
      } });
      const op = { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar(m: unknown) { mensagens.push(m); falharAck = true; } } };
      await expect(processarEntregasCodigo(db, op)).rejects.toMatchObject({ tipo: 'temporario', message: 'O canal de e-mail está temporariamente indisponível.' });
      const [antes] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect(antes!.estado).toBe('enviando'); expect(antes!.envelope).not.toBeNull();
      falharAck = false; relogio.definir(new Date(inicio.getTime() + 60001));
      const recuperacao = { ...op, canal: { async enviar(m: unknown) { mensagens.push(m); } } };
      expect((await processarEntregasCodigo(c.db, recuperacao)).aceitas).toBe(1);
      expect(mensagens[0]).toEqual(mensagens[1]);
    } finally { await c.fechar(); }
  });
  it('permite chave antiga até drenagem e encerra falha permanente', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 109); const relogio = new RelogioFalso(inicio);
      const novas = { ativaId: 'nova', cifradores: new Map([['nova', criarCifradorCodigo(Buffer.alloc(32, 2).toString('base64'))]]) };
      await expect(validarPendenciasEntrega(c.db, { modo: 'email', chaves: novas, dominioRemetente: 'example.com' }, relogio)).rejects.toMatchObject({ tipo: 'configuracao' });
      const ring = { ativaId: 'nova', cifradores: new Map([...novas.cifradores, ...chaves.cifradores]) };
      await expect(validarPendenciasEntrega(c.db, { modo: 'email', chaves: ring, dominioRemetente: 'example.com' }, relogio)).resolves.toBeUndefined();
      const resumo = await processarEntregasCodigo(c.db, { chaves: ring, dominioRemetente: 'example.com', relogio, canal: { async enviar() { throw new ErroCanalEmail('permanente'); } } });
      expect(resumo.falhas).toBe(1);
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([e!.estado, e!.motivo, e!.tentativas, e!.chaveId, e!.envelope]).toEqual(['falhou', 'permanente', 1, null, null]);
      await expect(validarPendenciasEntrega(c.db, { modo: 'email', chaves: novas, dominioRemetente: 'example.com' }, relogio)).resolves.toBeUndefined();
    } finally { await c.fechar(); }
  });
  it('guarda recusa domínio divergente sem alterar pendências', async () => {
    const c = await abrir();
    try {
      await inserir(c, 115); const relogio = new RelogioFalso(inicio);
      const antes = await c.db.select().from(entregasCodigo);
      await expect(validarPendenciasEntrega(c.db, { modo: 'email', chaves, dominioRemetente: 'diferente.example' }, relogio)).rejects.toMatchObject({ tipo: 'configuracao' });
      expect(await c.db.select().from(entregasCodigo)).toEqual(antes);
    } finally { await c.fechar(); }
  });
  it('emite com chave nova e drena mensagens das duas chaves', async () => {
    const c = await abrir();
    try {
      const antiga = await inserir(c, 116); const outro = await inserir(c, 117);
      await c.db.delete(entregasCodigo).where(eq(entregasCodigo.id, outro.id));
      const nova = criarCifradorCodigo(Buffer.alloc(32, 2).toString('base64'));
      const ring = { ativaId: 'nova', cifradores: new Map([['a', chaves.cifradores.get('a')!], ['nova', nova]]) };
      const expiraEm = new Date(inicio.getTime() + 600000);
      const idNovo = await enfileirarCodigo(c.db, ring, { contaId: outro.contaId, codigoId: outro.codigoId, email: 't117@example.com', codigo: '123456', dominioRemetente: 'example.com', criadoEm: inicio, expiraEm });
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, idNovo));
      expect(e!.chaveId).toBe('nova');
      expect(nova.decifrar(e!.envelope, { id: idNovo, codigoId: outro.codigoId })).toEqual({ id: idNovo, codigoId: outro.codigoId, destinatario: 't117@example.com', codigo: '123456', expiraEm: expiraEm.toISOString() });
      const apenasNova = { ativaId: 'nova', cifradores: new Map([['nova', nova]]) }; const relogio = new RelogioFalso(inicio);
      await expect(validarPendenciasEntrega(c.db, { modo: 'email', chaves: apenasNova, dominioRemetente: 'example.com' }, relogio)).rejects.toMatchObject({ tipo: 'configuracao' });
      const mensagens: string[] = [];
      expect((await processarEntregasCodigo(c.db, { chaves: ring, dominioRemetente: 'example.com', relogio, canal: { async enviar(m) { mensagens.push(m.id); } } })).aceitas).toBe(2);
      expect(mensagens.sort()).toEqual([antiga.id, idNovo].sort());
      await expect(validarPendenciasEntrega(c.db, { modo: 'email', chaves: apenasNova, dominioRemetente: 'example.com' }, relogio)).resolves.toBeUndefined();
    } finally { await c.fechar(); }
  });
  it('bloqueia envelope adulterado e recupera ao restaurá-lo', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 118); const relogio = new RelogioFalso(inicio);
      const [original] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      const envelope = { ...original!.envelope!, tag: Buffer.alloc(16).toString('base64') };
      await c.db.update(entregasCodigo).set({ envelope }).where(eq(entregasCodigo.id, item.id));
      let envios = 0; const op = { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar() { envios++; } } };
      expect((await processarEntregasCodigo(c.db, op)).bloqueadas).toBe(1);
      const [bloqueada] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([bloqueada!.estado, bloqueada!.motivo, bloqueada!.tentativas, bloqueada!.proximaTentativaEm.getTime(), envios]).toEqual(['pendente', 'payload_invalido', 0, inicio.getTime(), 0]);
      expect(bloqueada!.envelope).toEqual(envelope);
      await c.db.update(entregasCodigo).set({ envelope: original!.envelope }).where(eq(entregasCodigo.id, item.id));
      expect((await processarEntregasCodigo(c.db, op)).aceitas).toBe(1); expect(envios).toBe(1);
    } finally { await c.fechar(); }
  });
  it('dois workers disputam a mesma entrega sem duplicar claim', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 110); const relogio = new RelogioFalso(inicio); let envios = 0;
      const op = { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar() { envios++; } } };
      const resultados = await Promise.all([processarEntregasCodigo(c.db, op), processarEntregasCodigo(c.db, op)]);
      expect(resultados.reduce((n, x) => n + x.aceitas, 0)).toBe(1); expect(envios).toBe(1);
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([e!.estado, e!.tentativas, e!.leaseToken]).toEqual(['aceita', 1, null]);
    } finally { await c.fechar(); }
  });
  it('cancelamento preserva integralmente registros financeiros', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 111); const lojaId = randomUUID();
      await c.db.insert(lojas).values({ id: lojaId, contaId: item.contaId, nome: 'Loja', criadoEm: inicio, atualizadoEm: inicio });
      await c.db.insert(vendas).values({ id: randomUUID(), lojaId, aparelhoId: randomUUID(), operadorId: randomUUID(), totalCentavos: 1234, status: 'concluida', criadoEm: inicio, atualizadoEm: inicio, versao: 1 });
      const snapshot = async () => Promise.all([c.db.select().from(vendas), c.db.select().from(itensVenda), c.db.select().from(pagamentosVenda), c.db.select().from(caixas), c.db.select().from(movimentosCaixa), c.db.select().from(assinaturas), c.db.select().from(faturas), c.db.select().from(eventosCobranca), c.db.select().from(testesUsados)]);
      const antes = await snapshot(); await cancelarEntregasDaConta(c.db, item.contaId, inicio);
      expect(await snapshot()).toEqual(antes); expect(antes[0]).toHaveLength(1);
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id)); expect(e!.estado).toBe('cancelada');
    } finally { await c.fechar(); }
  });
  if (motor === 'postgres') it('observa dois workers aguardando a conta e lê relógio após a trava', async () => {
    const c = await abrir();
    const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
    try {
      const item = await inserir(c, 112); const relogio = new RelogioFalso(inicio); let liberar!: () => void, travada!: () => void;
      const espera = new Promise<void>(r => { liberar = r; }); const pronto = new Promise<void>(r => { travada = r; });
      let pid = 0;
      const bloqueio = c.db.transaction(async tx => { const rows = await tx.execute(sql`select pg_backend_pid() as pid`) as { pid: number }[]; pid = Number(rows[0]!.pid); await tx.select().from(contas).where(eq(contas.id, item.contaId)).for('update'); travada(); await espera; });
      await pronto;
      let envios = 0;
      const op = { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar() { envios++; } } };
      const primeiro = processarEntregasCodigo(c.db, op), segundo = processarEntregasCodigo(c.db, op);
      let esperas: { pid: number; blockers: number[] }[] = [];
      try {
        const prazo = Date.now() + 5000;
        while (Date.now() < prazo) {
          esperas = await observador`select pid, pg_blocking_pids(pid) as blockers from pg_stat_activity where datname = 'pdv_test' and wait_event_type = 'Lock' and query like '%contas%'` as unknown as typeof esperas;
          if (esperas.length >= 2 && esperas.some(x => x.blockers.includes(pid))) break;
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        expect(esperas).toHaveLength(2);
        expect(esperas.some(x => x.blockers.includes(pid))).toBe(true);
        expect(esperas.every(x => x.blockers.length > 0)).toBe(true);
        relogio.definir(new Date(inicio.getTime() + 600000));
      } finally { liberar(); }
      await bloqueio;
      const resultados = await Promise.all([primeiro, segundo]);
      expect(resultados.reduce((n, x) => n + x.canceladas, 0)).toBe(1); expect(envios).toBe(0);
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([e!.estado, e!.motivo, e!.envelope]).toEqual(['cancelada', 'expirado', null]);
    } finally { await observador.end(); await c.fechar(); }
  });
  if (motor === 'postgres') it('recupera falha SQL real no ACK após aceitação', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 114); const relogio = new RelogioFalso(inicio); const mensagens: unknown[] = [];
      await c.db.execute(sql.raw(`CREATE OR REPLACE FUNCTION teste_falha_ack() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.estado = 'aceita' THEN RAISE EXCEPTION 'segredo simulado'; END IF; RETURN NEW; END $$`));
      await c.db.execute(sql.raw('CREATE TRIGGER teste_falha_ack BEFORE UPDATE ON entregas_codigo FOR EACH ROW EXECUTE FUNCTION teste_falha_ack()'));
      const op = { chaves, dominioRemetente: 'example.com', relogio, canal: { async enviar(m: unknown) { mensagens.push(m); } } };
      const erro = await processarEntregasCodigo(c.db, op).catch(e => e);
      expect(erro).toBeInstanceOf(ErroCanalEmail); expect(erro.tipo).toBe('temporario');
      expect(JSON.stringify(erro)).not.toContain('segredo simulado'); expect(erro.cause).toBeUndefined();
      const [e] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      expect([e!.estado, e!.tentativas, e!.chaveId]).toEqual(['enviando', 1, 'a']);
      expect(e!.envelope).not.toBeNull(); expect(e!.leaseToken).not.toBeNull(); expect(e!.leaseExpiraEm!.getTime()).toBe(inicio.getTime() + 60000);
      await c.db.execute(sql.raw('DROP TRIGGER teste_falha_ack ON entregas_codigo'));
      relogio.definir(new Date(inicio.getTime() + 60001));
      expect((await processarEntregasCodigo(c.db, op)).aceitas).toBe(1); expect(mensagens[0]).toEqual(mensagens[1]);
      expect(await c.db.select().from(entregasCodigo)).toHaveLength(1); expect(await c.db.select().from(codigosLogin)).toHaveLength(1);
    } finally {
      await c.db.execute(sql.raw('DROP TRIGGER IF EXISTS teste_falha_ack ON entregas_codigo'));
      await c.db.execute(sql.raw('DROP FUNCTION IF EXISTS teste_falha_ack()'));
      await c.fechar();
    }
  });
  if (motor === 'postgres') it('impõe unicidade e ambas chaves estrangeiras sem escrita parcial', async () => {
    const c = await abrir();
    try {
      const item = await inserir(c, 119);
      const [existente] = await c.db.select().from(entregasCodigo).where(eq(entregasCodigo.id, item.id));
      const { ordemFila: _ordem, ...base } = existente!;
      const antes = await c.db.select().from(entregasCodigo);
      await expect(c.db.insert(entregasCodigo).values({ ...base, id: randomUUID() })).rejects.toThrow();
      await expect(c.db.insert(entregasCodigo).values({ ...base, id: randomUUID(), codigoId: randomUUID() })).rejects.toThrow();
      const codigoId = randomUUID();
      await c.db.insert(codigosLogin).values({ id: codigoId, email: 'outro@example.com', codigoHash: 'hash', criadoEm: inicio, expiraEm: new Date(inicio.getTime() + 600000) });
      await expect(c.db.insert(entregasCodigo).values({ ...base, id: randomUUID(), codigoId, contaId: randomUUID() })).rejects.toThrow();
      expect(await c.db.select().from(entregasCodigo)).toEqual(antes);
    } finally { await c.fechar(); }
  });
});
