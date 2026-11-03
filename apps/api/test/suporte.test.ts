import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { gerarId, VERSAO_POLITICAS } from '@pdv/shared';
import { criarSessao } from '../src/auth';
import { aparelhos, operadores, solicitacoesSuporte, usuarios } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { limparSuporteConcluido } from '../src/servicos/retencaoSuporte';
import { abrirBanco, chamar, criarAmbiente, criarConta, contaEmTeste, NUMEROS, enviar, INICIO, mutacao, produto, venda, type Ambiente } from './ajuda';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });
const pedido = () => ({ id: gerarId(), tipo: 'suporte', mensagem: 'Venda aguardando confirmação.', diagnostico: null, versaoPoliticas: VERSAO_POLITICAS });

it('suporte exige sessão, mantém protocolo no replay e rejeita troca de conteúdo ou identidade', async () => {
  expect((await chamar(amb, 'GET', '/suporte/solicitacoes')).status).toBe(401);
  const a = (await criarConta(amb)), b = (await criarConta(amb)), req = pedido();
  const enviarPedido = (token: string, corpo: unknown) => chamar(amb, 'POST', '/suporte/solicitacoes', { token, corpo });
  const rs = await Promise.all([enviarPedido(a.token, req), enviarPedido(a.token, req)]);
  expect(rs.map(r => r.status)).toEqual([200, 200]);
  expect(rs[0]!.corpo).toMatchObject({ id: req.id, estado: 'aberto', resposta: null });
  expect((await enviarPedido(a.token, { ...req, mensagem: 'Conteúdo diferente' })).status).toBe(409);
  expect((await enviarPedido(b.token, req)).status).toBe(409);
  expect((await chamar(amb, 'GET', '/suporte/solicitacoes', { token: b.token })).corpo).toEqual([]);
  expect(await amb.db.select().from(solicitacoesSuporte)).toHaveLength(1);
  expect((await enviarPedido(a.token, { ...pedido(), diagnostico: { token: 'nao-persistir' } })).status).toBe(400);
  expect((await enviarPedido(a.token, { ...pedido(), contaId: b.contaId })).status).toBe(400);
});

it('pedido de exclusão preserva conta e dados e a resposta da equipe é consultável', async () => {
  const s = await contaEmTeste(amb, 'pro'), p = produto(s.lojaId);
  await enviar(amb, s, [mutacao('produto', p)]);
  const req = { ...pedido(), tipo: 'exclusao' };
  expect((await chamar(amb, 'POST', '/suporte/solicitacoes', { token: s.token, corpo: req })).status).toBe(200);
  expect((await chamar(amb, 'GET', '/conta', { token: s.token })).status).toBe(200);
  await amb.db.update(solicitacoesSuporte).set({ estado: 'em_analise', resposta: 'Confira o escopo no atendimento.' }).where(eq(solicitacoesSuporte.id, req.id));
  expect((await chamar(amb, 'GET', '/suporte/solicitacoes', { token: s.token })).corpo[0]).toMatchObject({ estado: 'em_analise', resposta: 'Confira o escopo no atendimento.' });
  const ex = await chamar(amb, 'GET', '/suporte/exportacao', { token: s.token });
  expect(ex.corpo.produtos.map((v: any) => v.id)).toContain(p.id);
  expect(JSON.stringify(ex.corpo)).not.toContain(s.token);
  expect(JSON.stringify(ex.corpo)).not.toMatch(/tokenHash|envelope|fingerprint|codigoHash/);
});

it('exportação e atendimento de operador excluem dados financeiros e protocolos de terceiros', async () => {
  const a = await contaEmTeste(amb, 'pro'), b = await contaEmTeste(amb, 'pro', NUMEROS.outroAprova);
  const usuarioId = gerarId(), operadorId = gerarId(), aparelhoId = gerarId();
  await amb.db.insert(usuarios).values({ id: usuarioId, email: 'ana@exemplo.com', nome: 'Ana', criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: a.contaId, lojaId: a.lojaId, nome: 'Ana', papel: 'operador', criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: a.contaId, lojaId: a.lojaId, nome: 'Ana', criadoEm: INICIO, ultimoAcessoEm: INICIO });
  const ana = await criarSessao(amb.db, { contaId: a.contaId, lojaId: a.lojaId, operadorId, aparelhoId }, INICIO);
  for (const s of [a, b, ana]) { expect((await enviar(amb, s, [mutacao('venda', venda(s))])).corpo.rejeitadas).toEqual([]); expect((await chamar(amb, 'POST', '/suporte/solicitacoes', { token: s.token, corpo: pedido() })).status).toBe(200); }
  const ex = (await chamar(amb, 'GET', '/suporte/exportacao', { token: ana.token })).corpo;
  expect(ex.escopo.financeiro).toBe('proprio'); expect(ex.vendas).toHaveLength(1);
  expect(ex.vendas[0].operadorId).toBe(ana.operadorId); expect(ex.usuario.email).toBe('ana@exemplo.com');
  expect(ex.solicitacoes).toHaveLength(1);
  expect((await chamar(amb, 'GET', '/suporte/solicitacoes', { token: a.token })).corpo).toHaveLength(1);
  expect(JSON.stringify(ex)).not.toContain(b.contaId);
  await amb.db.update(operadores).set({ estado: 'suspenso' }).where(eq(operadores.id, operadorId));
  expect((await chamar(amb, 'GET', '/suporte/exportacao', { token: ana.token })).status).toBe(401);
});

it('limita protocolos abertos e remove somente concluídos há mais de 90 dias', async () => {
  const s = (await criarConta(amb));
  for (let i = 0; i < 10; i++) expect((await chamar(amb, 'POST', '/suporte/solicitacoes', { token: s.token, corpo: pedido() })).status).toBe(200);
  expect((await chamar(amb, 'POST', '/suporte/solicitacoes', { token: s.token, corpo: pedido() })).status).toBe(409);
  const rows = await amb.db.select().from(solicitacoesSuporte);
  await amb.db.update(solicitacoesSuporte).set({ estado: 'concluido' }).where(eq(solicitacoesSuporte.id, rows[0]!.id));
  amb.relogio.avancarDias(91);
  expect(await limparSuporteConcluido(amb.db, amb.relogio)).toBe(1);
  expect(await amb.db.select().from(solicitacoesSuporte)).toHaveLength(9);
});

it('falha interna não registra SQL, parâmetros ou mensagem pessoal no logger', async () => {
  const logs: unknown[] = [];
  amb.app.addHook('onRequest', async request => { vi.spyOn(request.log, 'error').mockImplementation((...args: unknown[]) => { logs.push(args); }); });
  amb.app.get('/falha-privada-de-teste', async () => { throw new Error('SQL params: mensagem pessoal, token de acesso'); });
  try {
    expect((await chamar(amb, 'GET', '/falha-privada-de-teste')).status).toBe(500);
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toMatch(/SQL|params|mensagem pessoal|token de acesso/);
  } finally { vi.restoreAllMocks(); }
});
