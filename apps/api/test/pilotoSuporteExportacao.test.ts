// F16/F17 (CP 153): exportação confirmada sem credenciais nem pendências, pedido de exclusão que não altera dados,
// resposta manual consultável e protocolo visível só para quem pediu. Integração real com PGlite (ou pdv_test).
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { gerarId, VERSAO_POLITICAS, type Sessao } from '@pdv/shared';
import { criarSessao } from '../src/auth';
import { aparelhos, assinaturas, caixas, codigosLogin, itensVenda, movimentosCaixa, operadores, pagamentosVenda, produtos, sessoes, solicitacoesSuporte, usuarios, vendas } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, INICIO, mutacao, NUMEROS, produto, tokenDoCartao, venda, type Ambiente } from './ajuda';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

const pedido = (extra: Record<string, unknown> = {}) => ({ id: gerarId(), tipo: 'suporte', mensagem: 'Venda aguardando confirmação.', diagnostico: null, versaoPoliticas: VERSAO_POLITICAS, ...extra });
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const chaves = (v: unknown): string[] => Array.isArray(v) ? v.flatMap(chaves) : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...chaves(x)]) : [];

async function operadorComSessao(dono: Sessao, nome: string): Promise<Sessao> {
  const usuarioId = gerarId(), operadorId = gerarId(), aparelhoId = gerarId();
  await amb.db.insert(usuarios).values({ id: usuarioId, email: `${nome}@exemplo.com`, nome, criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: dono.contaId, lojaId: dono.lojaId, nome, papel: 'operador', criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId: dono.lojaId, nome, criadoEm: INICIO, ultimoAcessoEm: INICIO });
  return criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId, aparelhoId }, INICIO);
}

/** Loja com produto com estoque, venda em dinheiro no caixa aberto e uma pessoa na equipe. */
async function lojaComMovimento() {
  const dono = await contaEmTeste(amb, 'pro', NUMEROS.aprova);
  const reserva = await chamar(amb, 'POST', '/caixas/reservar', { token: dono.token, corpo: { id: gerarId(), trocoInicialCentavos: 10000 } });
  expect(reserva.status).toBe(200);
  const p = produto(dono.lojaId, { estoque: 12000 });
  const v = venda(dono, { caixaId: reserva.corpo.id });
  expect((await enviar(amb, dono, [mutacao('produto', p), mutacao('venda', v)])).corpo.rejeitadas).toEqual([]);
  const convite = await chamar(amb, 'POST', '/equipe/convites', { token: dono.token, corpo: { email: 'bruno@exemplo.com', nome: 'bruno', papel: 'operador' } });
  expect(convite.status, JSON.stringify(convite.corpo)).toBe(201);
  return { dono, p, v, caixaId: reserva.corpo.id as string };
}
const get = (token: string, url: string) => chamar(amb, 'GET', url, { token });
async function fotografia(token: string) {
  const sync = (await get(token, '/sync/pull?desde=0')).corpo;
  const exportacao = (await get(token, '/suporte/exportacao')).corpo;
  const { geradoEm: _g, solicitacoes: _s, ...dados } = exportacao;
  return {
    sync, exportacao: dados, estoque: (await get(token, '/estoque')).corpo, caixas: (await get(token, '/caixas')).corpo, equipe: (await get(token, '/equipe')).corpo,
    contagens: {
      produtos: (await amb.db.select().from(produtos)).length, vendas: (await amb.db.select().from(vendas)).length, itens: (await amb.db.select().from(itensVenda)).length,
      pagamentos: (await amb.db.select().from(pagamentosVenda)).length, caixas: (await amb.db.select().from(caixas)).length, movimentosCaixa: (await amb.db.select().from(movimentosCaixa)).length,
      operadores: (await amb.db.select().from(operadores)).length, usuarios: (await amb.db.select().from(usuarios)).length, aparelhos: (await amb.db.select().from(aparelhos)).length,
    },
  };
}

it('F17: a exportação confirmada é JSON válido sem credenciais (chaves e valores) e sem campo de pendências', async () => {
  const { dono, p, v } = await lojaComMovimento();
  const otp = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: dono.email } })).corpo.codigo as string;
  expect(otp).toMatch(/^\d{6}$/);
  expect((await chamar(amb, 'POST', '/suporte/solicitacoes', { token: dono.token, corpo: pedido() })).status).toBe(200);

  const res = await get(dono.token, '/suporte/exportacao');
  expect(res.status).toBe(200);
  // O arquivo que o app grava é exatamente JSON.stringify(corpo, null, 2): precisa fazer ida e volta sem perda.
  const texto = JSON.stringify(res.corpo, null, 2);
  expect(JSON.parse(texto)).toEqual(res.corpo);
  expect(res.corpo.produtos.map((x: any) => x.id)).toContain(p.id);
  expect(res.corpo.vendas.map((x: any) => x.id)).toContain(v.id);

  // Sem credenciais: por nome de campo (padrões, não valores fixos)...
  const ruins = chaves(res.corpo).filter(k => /token|senha|password|otp|hash|codigo|cvv|fingerprint|envelope|segredo|bearer|cartao|autoriza/i.test(k));
  expect(ruins).toEqual([]);
  // ... e por conteúdo: a exportação não carrega a sessão, os hashes do banco, o código de acesso nem dados de cartão.
  const semIds = texto.replace(UUID, '');
  expect(texto).not.toContain(dono.token);
  expect(semIds).not.toContain(otp);
  const hashesSessao = await amb.db.select().from(sessoes), hashesCodigo = await amb.db.select().from(codigosLogin);
  expect(hashesSessao.length).toBeGreaterThan(0); expect(hashesCodigo.length).toBeGreaterThan(0);
  for (const s of hashesSessao) expect(texto).not.toContain(s.tokenHash);
  for (const c of hashesCodigo) expect(texto).not.toContain(c.codigoHash);
  for (const a of await amb.db.select().from(assinaturas)) if (a.cartaoFingerprint) expect(texto).not.toContain(a.cartaoFingerprint);
  expect(texto).not.toContain(tokenDoCartao(NUMEROS.aprova));
  expect(semIds).not.toMatch(/\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}\b|\b\d{13,19}\b/);
  expect(semIds).not.toMatch(/eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/);
  expect(semIds).not.toMatch(/bearer\s/i);

  // Exportação confirmada não promete pendências: o campo não existe e o aviso manda exportar no aparelho de origem.
  expect(Object.keys(res.corpo).sort()).toEqual(['aviso', 'caixas', 'clientes', 'escopo', 'eventosFiado', 'geradoEm', 'movimentosEstoque', 'produtos', 'solicitacoes', 'usuario', 'vendas']);
  expect(chaves(res.corpo).filter(k => /pendenc|fila|mutaco|rejeitad/i.test(k))).toEqual([]);
  expect(res.corpo.aviso).toMatch(/pendências no aparelho de origem/);
  expect(res.corpo.aviso).toMatch(/Não é um backup restaurável/);
});

it('F16: pedido de exclusão não apaga nem altera vendas, estoque, caixa e equipe; a resposta manual aparece ao atualizar', async () => {
  const { dono, caixaId } = await lojaComMovimento();
  const antes = await fotografia(dono.token);
  expect(antes.contagens).toMatchObject({ produtos: 1, vendas: 1, caixas: 1, operadores: 2 });
  expect(antes.equipe).toHaveLength(2);

  const req = pedido({ tipo: 'exclusao', mensagem: 'Quero analisar a exclusão dos dados da loja.' });
  expect((await chamar(amb, 'POST', '/suporte/solicitacoes', { token: dono.token, corpo: req })).status).toBe(200);
  expect((await get(dono.token, '/suporte/solicitacoes')).corpo[0]).toMatchObject({ id: req.id, tipo: 'exclusao', estado: 'aberto', resposta: null });
  expect(await fotografia(dono.token)).toEqual(antes);

  // A equipe responde à mão (estado em_analise e depois concluído): a consulta reflete e nada de negócio muda.
  await amb.db.update(solicitacoesSuporte).set({ estado: 'em_analise', resposta: 'Escopo, prazo e retenção serão informados aqui.' }).where(eq(solicitacoesSuporte.id, req.id));
  expect((await get(dono.token, '/suporte/solicitacoes')).corpo[0]).toMatchObject({ estado: 'em_analise', resposta: 'Escopo, prazo e retenção serão informados aqui.' });
  await amb.db.update(solicitacoesSuporte).set({ estado: 'concluido', resposta: 'Pedido analisado; nenhuma exclusão foi executada.' }).where(eq(solicitacoesSuporte.id, req.id));
  expect((await get(dono.token, '/suporte/solicitacoes')).corpo[0]).toMatchObject({ estado: 'concluido', resposta: 'Pedido analisado; nenhuma exclusão foi executada.' });
  expect(await fotografia(dono.token)).toEqual(antes);

  // A conta segue utilizável: o mesmo caixa continua aberto e a mesma sessão continua válida.
  expect((await get(dono.token, '/conta')).status).toBe(200);
  expect(antes.caixas.map((c: any) => c.caixa.id)).toEqual([caixaId]);
  expect((await amb.db.select().from(caixas).where(eq(caixas.id, caixaId)))[0]).toBeTruthy();
});

it('F16: o protocolo de exclusão de um operador não aparece para o dono nem para outro operador, nem na exportação deles', async () => {
  const dono = await contaEmTeste(amb, 'pro');
  const ana = await operadorComSessao(dono, 'ana'), bruno = await operadorComSessao(dono, 'bruno');
  const segredo = 'Mensagem privada de exclusão da Ana';
  const req = pedido({ tipo: 'exclusao', mensagem: segredo });
  expect((await chamar(amb, 'POST', '/suporte/solicitacoes', { token: ana.token, corpo: req })).status).toBe(200);
  expect((await get(ana.token, '/suporte/solicitacoes')).corpo.map((s: any) => s.id)).toEqual([req.id]);
  for (const outro of [dono, bruno]) {
    expect((await get(outro.token, '/suporte/solicitacoes')).corpo).toEqual([]);
    const ex = (await get(outro.token, '/suporte/exportacao')).corpo;
    expect(ex.solicitacoes).toEqual([]);
    expect(JSON.stringify(ex)).not.toContain(segredo);
    expect(JSON.stringify(ex)).not.toContain(req.id);
    // Reenviar o mesmo protocolo com outra identidade não revela nem altera o pedido alheio.
    expect((await chamar(amb, 'POST', '/suporte/solicitacoes', { token: outro.token, corpo: req })).status).toBe(409);
  }
  expect(await amb.db.select().from(solicitacoesSuporte)).toHaveLength(1);
});

it('F16: resumo técnico opcional só aceita o schema fechado e fica gravado exatamente como enviado', async () => {
  const s = await contaEmTeste(amb, 'pro');
  const resumo = { versao: '0.1.17', ambiente: 'homologacao', plataforma: 'android', pendentes: 2, rejeitadas: 0, ultimaSincronizacaoEm: '2026-11-03T14:00:00.000Z' };
  const enviarPedido = (corpo: unknown) => chamar(amb, 'POST', '/suporte/solicitacoes', { token: s.token, corpo });
  for (const extra of [{ token: 'x' }, { email: 'alguem@exemplo.com' }, { estado: { a: 1 } }, { mensagemDeErro: 'falha interna' }]) {
    expect((await enviarPedido(pedido({ diagnostico: { ...resumo, ...extra } }))).status).toBe(400);
  }
  expect(await amb.db.select().from(solicitacoesSuporte)).toHaveLength(0);
  const ok = pedido({ diagnostico: resumo });
  expect((await enviarPedido(ok)).status).toBe(200);
  expect((await get(s.token, '/suporte/solicitacoes')).corpo[0].diagnostico).toEqual(resumo);
  expect((await amb.db.select().from(solicitacoesSuporte))[0]!.diagnostico).toEqual(resumo);
});
