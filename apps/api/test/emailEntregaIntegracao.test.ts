import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SMTPServer } from 'smtp-server';
import type { Server, Socket } from 'node:net';
import { gerarId } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import { caixas, codigosLogin, entregasCodigo, itensVenda, movimentosCaixa, pagamentosVenda, vendas } from '../src/db/schema';
import { criarCanalSmtp } from '../src/email/smtp';
import { processarEntregasCodigo } from '../src/email/filaCodigo';
import { criarApp } from '../src/servidor';
import { abrirBanco, criarAmbiente, criarConta, type Ambiente } from './ajuda';
import { emissaoTeste } from './emailFixture';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });
afterAll(async () => { await banco.fechar(); });

async function servidorSmtp(perderPrimeiro = false) {
  const mensagens: string[] = [];
  let socket: Socket | undefined;
  const servidor = new SMTPServer({ authOptional: true, disabledCommands: ['STARTTLS', 'AUTH'], onData(stream, _sessao, callback) {
    let dados = ''; stream.setEncoding('utf8'); stream.on('data', bloco => { dados += bloco; });
    stream.on('end', () => { mensagens.push(dados); if (perderPrimeiro && mensagens.length === 1) socket!.destroy(); else callback(); });
  } });
  (servidor as unknown as { server: Server }).server.on('connection', s => { socket = s; });
  await new Promise<void>(resolve => servidor.listen(0, '127.0.0.1', resolve));
  const endereco = servidor.server.address();
  if (!endereco || typeof endereco === 'string') throw new Error('endereço inválido');
  const canal = criarCanalSmtp({ ambiente: 'test', host: '127.0.0.1', porta: endereco.port, remetente: 'envio@example.com', modo: 'local' });
  return { mensagens, canal, fechar: () => new Promise<void>(resolve => servidor.close(resolve)) };
}
function codigo(mensagem: string): string { const corpo = mensagem.split(/\r?\n\r?\n/).slice(1).join('\n'); const resultado = corpo.match(/\b\d{6}\b/); if (!resultado) throw new Error('código ausente no SMTP'); return resultado[0]; }
function messageId(mensagem: string): string { const resultado = mensagem.match(/^Message-ID:\s*(.+)$/im); if (!resultado) throw new Error('Message-ID ausente'); return resultado[1]!.trim(); }

describe('entrega por SMTP local', () => {
  it('recebe código no protocolo, autentica uma vez e preserva finanças completas', async () => {
    const conta = await criarConta(amb); const data = amb.relogio.agora(); const vendaId = gerarId(), caixaId = gerarId();
    await amb.db.insert(vendas).values({ id: vendaId, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, operadorId: conta.operadorId, totalCentavos: 200, status: 'concluida', criadoEm: data, atualizadoEm: data, versao: 1 });
    await amb.db.insert(itensVenda).values({ id: gerarId(), vendaId, lojaId: conta.lojaId, posicao: 0, descricao: 'Produto', precoUnitarioCentavos: 200, quantidadeMilesimos: 1000, totalCentavos: 200, criadoEm: data });
    await amb.db.insert(pagamentosVenda).values({ id: gerarId(), vendaId, lojaId: conta.lojaId, posicao: 0, meio: 'dinheiro', valorCentavos: 200, trocoCentavos: 0, criadoEm: data });
    await amb.db.insert(caixas).values({ id: caixaId, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, operadorId: conta.operadorId, abertoEm: data, trocoInicialCentavos: 100, criadoEm: data, atualizadoEm: data, versao: 1 });
    await amb.db.insert(movimentosCaixa).values({ id: gerarId(), caixaId, lojaId: conta.lojaId, tipo: 'suprimento', valorCentavos: 100, criadoEm: data });
    const snapshot = async () => [await amb.db.select().from(vendas), await amb.db.select().from(itensVenda), await amb.db.select().from(pagamentosVenda), await amb.db.select().from(caixas), await amb.db.select().from(movimentosCaixa)];
    const antes = await snapshot(); expect(antes.map(linhas => linhas.length)).toEqual([1, 1, 1, 1, 1]);
    const smtp = await servidorSmtp(); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    try {
      for (const email of [conta.email, 'ausente@example.com']) { const r = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email } }); expect([r.statusCode, r.body]).toEqual([204, '']); }
      if (emissaoTeste.modo !== 'email') throw new Error();
      expect((await processarEntregasCodigo(amb.db, { chaves: emissaoTeste.chaves, canal: smtp.canal, dominioRemetente: 'example.com', relogio: amb.relogio })).aceitas).toBe(1);
      expect(smtp.mensagens).toHaveLength(1); const recebido = codigo(smtp.mensagens[0]!);
      const payload = { email: conta.email, codigo: recebido, aparelhoId: conta.aparelhoId, aparelhoNome: 'Caixa' };
      const login = await app.inject({ method: 'POST', url: '/auth/login', payload }); expect(login.statusCode).toBe(200);
      const perfil = await app.inject({ method: 'GET', url: '/conta', headers: { authorization: `Bearer ${login.json().token}` } });
      expect(perfil.statusCode).toBe(200); expect(perfil.json()).toMatchObject({ contaId: conta.contaId, lojaId: conta.lojaId, email: conta.email });
      expect((await app.inject({ method: 'POST', url: '/auth/login', payload })).statusCode).toBe(401);
      expect(await snapshot()).toEqual(antes);
    } finally { await app.close(); await smtp.fechar(); }
  });
  it('retenta após perda de ACK com o mesmo código e Message-ID sem renovar prazo', async () => {
    const conta = await criarConta(amb); const smtp = await servidorSmtp(true); const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
    try {
      expect((await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: conta.email } })).statusCode).toBe(204);
      const [antes] = await amb.db.select().from(entregasCodigo); if (emissaoTeste.modo !== 'email') throw new Error();
      const opcoes = { chaves: emissaoTeste.chaves, canal: smtp.canal, dominioRemetente: 'example.com', relogio: amb.relogio };
      expect((await processarEntregasCodigo(amb.db, opcoes)).retentativas).toBe(1);
      amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 5000));
      expect((await processarEntregasCodigo(amb.db, opcoes)).aceitas).toBe(1);
      expect(smtp.mensagens).toHaveLength(2); expect(codigo(smtp.mensagens[0]!)).toBe(codigo(smtp.mensagens[1]!)); expect(messageId(smtp.mensagens[0]!)).toBe(messageId(smtp.mensagens[1]!));
      const otps = await amb.db.select().from(codigosLogin); const entregas = await amb.db.select().from(entregasCodigo);
      expect(otps).toHaveLength(1); expect(entregas).toHaveLength(1); expect(entregas[0]!.expiraEm).toEqual(antes!.expiraEm); expect(entregas[0]!.codigoId).toBe(otps[0]!.id);
    } finally { await app.close(); await smtp.fechar(); }
  });
});
