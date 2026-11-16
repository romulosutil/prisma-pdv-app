/**
 * Piloto Android, F14 no servidor (docs/roteiro-piloto-android.md, linha 48; CP 148 em docs/checkpoints-roadmap.md).
 * Espelha por PGlite/PostgreSQL os casos de `scripts/homologar-gestao.mts` (que roda por HTTP na homologação).
 *
 * Já coberto em gestao.test.ts (a asserção de status é a mesma; aqui entram a conferência das linhas do banco
 * e as combinações que lá não existem):
 * - baixa simultânea/replay/estoque negativo e devolução acima do vendido (1º teste);
 * - fiado parcial, estorno único, cancelamento condicionado e recebimentos simultâneos de 400 + 400 (3º e 4º testes);
 * - operador não vê o título do dono, nem consolidado (5º teste).
 * Novos aqui: ajuste com motivo, devolução em parcelas, dinheiro no turno do RECEPTOR (dono recebe título de operador),
 * visibilidade entre dois operadores, comando repetido com conteúdo divergente e disputa entre vários recebimentos.
 *
 * Concorrência: em PGlite (conexão única) as requisições são serializadas pelo driver, então a disputa abaixo prova a
 * regra de saldo, não a concorrência de conexões. Com PDV_TEST_POSTGRES_URL (CI) o driver postgres-js usa um pool
 * e as mesmas requisições chegam ao servidor em conexões distintas; a serialização vem do lock da conta e do
 * lock advisory da loja em `executar` (rotas/gestao.ts).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { gerarId, type Sessao } from '@pdv/shared';
import { criarSessao } from '../src/auth';
import type { Conexao } from '../src/db/conexao';
import { aparelhos, clientes, eventosFiado, movimentosCaixa, movimentosEstoque, operadores, produtos, usuarios } from '../src/db/schema';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, INICIO, mutacao, produto, venda, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

const post = (s: Sessao, url: string, corpo: unknown) => chamar(amb, 'POST', url, { token: s.token, corpo });
const get = (s: Sessao, url: string) => chamar(amb, 'GET', url, { token: s.token });

async function funcionario(dono: Sessao, nome = 'Ana') {
  const usuarioId = gerarId(), operadorId = gerarId(), aparelhoId = gerarId();
  await amb.db.insert(usuarios).values({ id: usuarioId, email: `${usuarioId}@exemplo.com`, nome, criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: dono.contaId, lojaId: dono.lojaId, nome, papel: 'operador', criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId: dono.lojaId, nome, criadoEm: INICIO, ultimoAcessoEm: INICIO });
  return criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId, aparelhoId }, INICIO);
}

async function cliente(s: Sessao) {
  const id = gerarId();
  expect((await post(s, '/clientes', { id, nome: 'João', contato: 'Contato informado' })).status).toBe(200);
  return id;
}
async function turno(s: Sessao, trocoInicialCentavos = 1000) {
  const r = await post(s, '/caixas/reservar', { id: gerarId(), trocoInicialCentavos });
  expect(r.status).toBe(200);
  return r.corpo.id as string;
}
/** Fiado de 500 com entrada de 200 em dinheiro (venda de 700) no turno do próprio vendedor. */
async function fiado500(s: Sessao, caixaId: string, clienteId: string) {
  const v = venda(s, { caixaId, fiado: { clienteId, vencimento: '2026-03-09', valorCentavos: 500 }, pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: 200, trocoCentavos: 0 }] });
  expect((await enviar(amb, s, [mutacao('venda', v)])).corpo.rejeitadas).toEqual([]);
  return v;
}
const receber = (s: Sessao, vendaId: string, valorCentavos: number, caixaId: string | null, meio = caixaId ? 'dinheiro' : 'pix', id = gerarId()) =>
  post(s, '/fiado/recebimentos', { id, vendaId, valorCentavos, meio, caixaId, motivo: 'Recebimento' });
const titulo = async (s: Sessao, vendaId: string) => (await get(s, '/fiado')).corpo.titulos.find((t: { vendaId: string }) => t.vendaId === vendaId);
const gaveta = async (s: Sessao, caixaId: string): Promise<number> =>
  (await get(s, '/caixas')).corpo.find((c: { caixa: { id: string } }) => c.caixa.id === caixaId).saldoCentavos;
const saldoEstoque = async (s: Sessao, produtoId: string) => (await get(s, '/estoque')).corpo.saldos.find((x: { produtoId: string }) => x.produtoId === produtoId);
const itemDe = (p: { id: string; nome: string }, quantidadeMilesimos: number, precoUnitarioCentavos = 700) =>
  ({ id: gerarId(), produtoId: p.id, descricao: p.nome, precoUnitarioCentavos, quantidadeMilesimos, totalCentavos: Math.round(precoUnitarioCentavos * quantidadeMilesimos / 1000) });
const vendaDeItem = (s: Sessao, item: ReturnType<typeof itemDe>) => venda(s, { itens: [item], totalCentavos: item.totalCentavos, pagamentos: [{ id: gerarId(), meio: 'pix', provedor: null, valorCentavos: item.totalCentavos, trocoCentavos: 0 }] });

describe('F14: estoque', () => {
  it('F14: a venda baixa o estoque uma vez e o reenvio não baixa de novo', async () => {
    const s = await contaEmTeste(amb, 'pro'), p = produto(s.lojaId, { estoque: 5000 });
    await enviar(amb, s, [mutacao('produto', p)]);
    const item = itemDe(p, 1000), v = vendaDeItem(s, item), m = mutacao('venda', v);
    expect((await enviar(amb, s, [m])).corpo.rejeitadas).toEqual([]);
    // Resposta perdida: o mesmo pedido, e depois a mesma venda remontada com outro ID de mutação.
    expect((await enviar(amb, s, [m])).corpo.rejeitadas).toEqual([]);
    expect((await enviar(amb, s, [{ ...m, id: gerarId() }])).corpo.rejeitadas).toEqual([]);
    expect(await saldoEstoque(s, p.id)).toMatchObject({ saldoMilesimos: 4000, negativo: false });
    const movimentos = await amb.db.select().from(movimentosEstoque).where(eq(movimentosEstoque.produtoId, p.id));
    expect(movimentos.map(x => [x.tipo, x.quantidadeMilesimos]).sort()).toEqual([['inicial', 5000], ['venda', -1000]]);
    expect(movimentos.find(x => x.tipo === 'venda')).toMatchObject({ itemVendaId: item.id, operadorId: s.operadorId, aparelhoId: s.aparelhoId });
  });

  it('F14: estoque pode ficar negativo com sinalização de divergência e ajuste com motivo o corrige', async () => {
    const s = await contaEmTeste(amb, 'pro'), p = produto(s.lojaId, { estoque: 3000 });
    await enviar(amb, s, [mutacao('produto', p)]);
    expect((await enviar(amb, s, [mutacao('venda', vendaDeItem(s, itemDe(p, 4000)))])).corpo.rejeitadas).toEqual([]);
    expect(await saldoEstoque(s, p.id)).toMatchObject({ saldoMilesimos: -1000, negativo: true });

    // Ajuste sem motivo (ausente, vazio ou só espaços) é recusado e nada é gravado.
    const antes = await amb.db.select().from(movimentosEstoque);
    for (const motivo of [undefined, '', '   ']) {
      const corpo = { id: gerarId(), produtoId: p.id, tipo: 'ajuste', quantidadeMilesimos: 2000, ...(motivo === undefined ? {} : { motivo }) };
      expect((await post(s, '/estoque/movimentos', corpo)).status).toBe(400);
    }
    expect(await amb.db.select().from(movimentosEstoque)).toHaveLength(antes.length);
    expect(await saldoEstoque(s, p.id)).toMatchObject({ saldoMilesimos: -1000, negativo: true });

    const ajuste = { id: gerarId(), produtoId: p.id, tipo: 'ajuste', quantidadeMilesimos: 2000, motivo: 'Contagem física' };
    expect((await post(s, '/estoque/movimentos', ajuste)).status).toBe(200);
    expect((await post(s, '/estoque/movimentos', ajuste)).status).toBe(200);
    expect((await post(s, '/estoque/movimentos', { ...ajuste, quantidadeMilesimos: 2500 })).status).toBe(409);
    expect(await saldoEstoque(s, p.id)).toMatchObject({ saldoMilesimos: 1000, negativo: false });
    const [gravado] = await amb.db.select().from(movimentosEstoque).where(eq(movimentosEstoque.id, ajuste.id));
    expect(gravado).toMatchObject({ tipo: 'ajuste', quantidadeMilesimos: 2000, motivo: 'Contagem física', operadorId: s.operadorId });
    // Ajuste negativo também entra, assinado, e pode voltar a negativar o saldo.
    expect((await post(s, '/estoque/movimentos', { id: gerarId(), produtoId: p.id, tipo: 'ajuste', quantidadeMilesimos: -1500, motivo: 'Quebra' })).status).toBe(200);
    expect(await saldoEstoque(s, p.id)).toMatchObject({ saldoMilesimos: -500, negativo: true });
  });

  it('F14: devolução acima do vendido é recusada, também quando somada a devoluções anteriores', async () => {
    const s = await contaEmTeste(amb, 'pro'), p = produto(s.lojaId, { estoque: 5000 }), outro = produto(s.lojaId, { estoque: 1000, nome: 'Feijão' });
    await enviar(amb, s, [mutacao('produto', p), mutacao('produto', outro)]);
    const item = itemDe(p, 1000);
    await enviar(amb, s, [mutacao('venda', vendaDeItem(s, item))]);
    expect((await saldoEstoque(s, p.id)).saldoMilesimos).toBe(4000);
    const devolver = (quantidadeMilesimos: number, produtoId = p.id) => post(s, '/estoque/movimentos', { id: gerarId(), produtoId, tipo: 'devolucao', quantidadeMilesimos, motivo: 'Cliente devolveu', itemVendaId: item.id });

    expect((await devolver(1500)).status).toBe(409);
    expect((await devolver(600)).status).toBe(200);
    expect((await devolver(500)).status).toBe(409);
    expect((await devolver(400, outro.id)).status).toBe(409);
    expect((await devolver(400)).status).toBe(200);
    expect((await devolver(1)).status).toBe(409);
    expect((await post(s, '/estoque/movimentos', { id: gerarId(), produtoId: p.id, tipo: 'devolucao', quantidadeMilesimos: 100, motivo: 'Sem item' })).status).toBe(400);
    expect((await saldoEstoque(s, p.id)).saldoMilesimos).toBe(5000);
    expect((await saldoEstoque(s, outro.id)).saldoMilesimos).toBe(1000);
    const devolucoes = await amb.db.select().from(movimentosEstoque).where(eq(movimentosEstoque.tipo, 'devolucao'));
    expect(devolucoes.map(d => d.quantidadeMilesimos).sort()).toEqual([400, 600]);
  });
});

describe('F14: fiado', () => {
  it('F14: fiado com entrada e saldo, recebimento parcial, estorno único e cancelamento só com líquido zerado', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await turno(s), cli = await cliente(s);
    const v = await fiado500(s, cx, cli);
    // Venda 700 = entrada 200 em dinheiro + dívida 500; a gaveta recebe só a entrada.
    expect(await titulo(s, v.id)).toMatchObject({ valorCentavos: 500, recebidoCentavos: 0, saldoCentavos: 500, cancelado: false });
    expect(await gaveta(s, cx)).toBe(1200);

    const r = await receber(s, v.id, 300, cx);
    expect(r.status).toBe(200);
    expect(await titulo(s, v.id)).toMatchObject({ recebidoCentavos: 300, saldoCentavos: 200 });
    expect(await gaveta(s, cx)).toBe(1500);
    expect(await receber(s, v.id, 300, cx, 'dinheiro', r.corpo.id).then(x => x.status)).toBe(200);
    expect(await gaveta(s, cx)).toBe(1500);

    // Cancelar com recebimento líquido não zerado é recusado e nada muda.
    const cancelar = mutacao('venda', { ...v, status: 'cancelada' });
    expect((await enviar(amb, s, [cancelar])).corpo.rejeitadas).toEqual([{ id: cancelar.id, motivo: 'fiado_com_recebimentos' }]);

    const estorno = { id: gerarId(), recebimentoId: r.corpo.id, caixaId: cx, motivo: 'Dinheiro devolvido' };
    expect((await post(s, '/fiado/estornos', estorno)).status).toBe(200);
    expect((await post(s, '/fiado/estornos', estorno)).status).toBe(200);
    expect((await post(s, '/fiado/estornos', { ...estorno, id: gerarId() })).status).toBe(409);
    expect(await gaveta(s, cx)).toBe(1200);
    const eventos = await amb.db.select().from(eventosFiado).where(eq(eventosFiado.vendaId, v.id));
    expect(eventos.map(e => [e.tipo, e.valorCentavos, e.caixaId]).sort()).toEqual([['estorno', 300, cx], ['recebimento', 300, cx]]);
    const lancamentos = await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.caixaId, cx));
    expect(lancamentos.map(m => [m.tipo, m.valorCentavos]).sort()).toEqual([['estorno_fiado', 300], ['recebimento_fiado', 300]]);

    expect((await enviar(amb, s, [cancelar])).corpo.rejeitadas).toEqual([]);
    expect(await titulo(s, v.id)).toMatchObject({ cancelado: true, saldoCentavos: 0 });
    expect(await gaveta(s, cx)).toBe(1200);
    expect(await amb.db.select().from(eventosFiado)).toHaveLength(2);
  });

  it('F14: o dinheiro do recebimento entra no turno do receptor e não no do dono do título', async () => {
    const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'Ana');
    const cxDono = await turno(dono, 2000), cxAna = await turno(ana, 500), cli = await cliente(dono);
    const v = await fiado500(ana, cxAna, cli);
    expect(await gaveta(ana, cxAna)).toBe(700);

    // Ana não pode usar o turno do dono, nem o dono o turno da Ana.
    expect((await receber(dono, v.id, 100, cxAna)).status).toBe(409);
    expect((await receber(ana, v.id, 100, cxDono)).status).toBe(409);
    expect(await amb.db.select().from(eventosFiado)).toHaveLength(0);

    const r = await receber(dono, v.id, 120, cxDono);
    expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({ operadorId: dono.operadorId, aparelhoId: dono.aparelhoId, caixaId: cxDono, valorCentavos: 120 });
    expect(await gaveta(dono, cxDono)).toBe(2120);
    expect(await gaveta(ana, cxAna)).toBe(700);
    const [lancamento] = await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, r.corpo.id));
    expect(lancamento).toMatchObject({ caixaId: cxDono, tipo: 'recebimento_fiado', valorCentavos: 120 });
    expect(lancamento!.detalhes).toMatchObject({ autorOperadorId: dono.operadorId, responsavelOperadorId: dono.operadorId, destino: v.id });
    expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.caixaId, cxAna))).toHaveLength(0);
    // O título continua da Ana; o saldo cai para 380.
    expect(await titulo(ana, v.id)).toMatchObject({ operadorId: ana.operadorId, recebidoCentavos: 120, saldoCentavos: 380 });
    // Recebimento por Pix não toca nenhuma gaveta.
    expect((await receber(dono, v.id, 80, null, 'pix')).status).toBe(200);
    expect(await gaveta(dono, cxDono)).toBe(2120);
    expect(await gaveta(ana, cxAna)).toBe(700);
  });

  it('F14: operador não vê nem recebe o título de outro operador; o dono vê todos', async () => {
    const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'Ana'), bia = await funcionario(dono, 'Bia');
    const cxAna = await turno(ana), cli = await cliente(dono);
    const v = await fiado500(ana, cxAna, cli);
    expect((await get(ana, '/fiado')).corpo.titulos.map((t: { vendaId: string }) => t.vendaId)).toEqual([v.id]);
    expect((await get(bia, '/fiado')).corpo.titulos).toEqual([]);
    expect((await get(bia, '/fiado')).corpo.eventos).toEqual([]);
    expect((await get(dono, '/fiado')).corpo.titulos.map((t: { vendaId: string }) => t.vendaId)).toEqual([v.id]);

    const cxBia = await turno(bia);
    expect((await receber(bia, v.id, 100, cxBia)).status).toBe(403);
    expect((await receber(bia, v.id, 100, null, 'pix')).status).toBe(403);
    expect(await amb.db.select().from(eventosFiado)).toHaveLength(0);
    expect(await gaveta(bia, cxBia)).toBe(1000);
    expect(await titulo(ana, v.id)).toMatchObject({ saldoCentavos: 500 });
  });

  it('F14: cliente repetido com o mesmo ID é idempotente e conteúdo diferente é recusado', async () => {
    const s = await contaEmTeste(amb, 'pro');
    const corpo = { id: gerarId(), nome: 'João', contato: 'Contato informado' };
    expect((await post(s, '/clientes', corpo)).status).toBe(200);
    expect((await post(s, '/clientes', corpo)).status).toBe(200);
    expect((await post(s, '/clientes', { ...corpo, nome: 'Outro' })).status).toBe(409);
    expect(await amb.db.select().from(clientes).where(eq(clientes.id, corpo.id))).toHaveLength(1);
    expect((await amb.db.select().from(clientes).where(eq(clientes.id, corpo.id)))[0]!.nome).toBe('João');
  });

  it('F14: recebimento repetido com a mesma chave e conteúdo diferente não regrava o valor', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await turno(s), cli = await cliente(s), v = await fiado500(s, cx, cli);
    const id = gerarId();
    expect((await receber(s, v.id, 200, cx, 'dinheiro', id)).status).toBe(200);
    for (const outro of [{ valorCentavos: 100 }, { meio: 'pix', caixaId: null }, { motivo: 'Outro' }]) {
      const res = await post(s, '/fiado/recebimentos', { id, vendaId: v.id, valorCentavos: 200, meio: 'dinheiro', caixaId: cx, motivo: 'Recebimento', ...outro });
      expect(res.status).toBe(409);
    }
    expect((await amb.db.select().from(eventosFiado).where(eq(eventosFiado.id, id)))[0]).toMatchObject({ valorCentavos: 200, meio: 'dinheiro' });
    expect(await titulo(s, v.id)).toMatchObject({ recebidoCentavos: 200, saldoCentavos: 300 });
    expect(await gaveta(s, cx)).toBe(1400);
  });
});

describe('F14: recebimentos concorrentes contra o mesmo saldo', () => {
  const liquidoRecebido = async (vendaId: string) =>
    (await amb.db.select().from(eventosFiado).where(eq(eventosFiado.vendaId, vendaId))).reduce((soma, e) => soma + (e.tipo === 'recebimento' ? 1 : -1) * e.valorCentavos, 0);

  it('F14: dois recebimentos simultâneos que juntos passam do saldo recebem no máximo o saldo', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await turno(s), cli = await cliente(s), v = await fiado500(s, cx, cli);
    const rs = await Promise.all([receber(s, v.id, 300, cx), receber(s, v.id, 300, cx)]);
    expect(rs.map(r => r.status).sort()).toEqual([200, 409]);
    expect(await liquidoRecebido(v.id)).toBe(300);
    expect(await titulo(s, v.id)).toMatchObject({ recebidoCentavos: 300, saldoCentavos: 200 });
    expect(await gaveta(s, cx)).toBe(1500);
    expect(await amb.db.select().from(eventosFiado)).toHaveLength(1);
    expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.caixaId, cx))).toHaveLength(1);
  });

  it('F14: dois recebimentos que cabem no saldo são aceitos juntos e zeram o título, nunca abaixo de zero', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await turno(s), cli = await cliente(s), v = await fiado500(s, cx, cli);
    const rs = await Promise.all([receber(s, v.id, 250, cx), receber(s, v.id, 250, null, 'pix')]);
    expect(rs.map(r => r.status)).toEqual([200, 200]);
    expect(await titulo(s, v.id)).toMatchObject({ recebidoCentavos: 500, saldoCentavos: 0 });
    expect((await receber(s, v.id, 1, cx)).status).toBe(409);
    expect(await gaveta(s, cx)).toBe(1450);
  });

  it('F14: vários recebimentos simultâneos de aparelhos e turnos diferentes nunca passam do saldo', async () => {
    const dono = await contaEmTeste(amb, 'pro'), cli = await cliente(dono);
    const ana = await funcionario(dono, 'Ana'), cxAna = await turno(ana, 500), cxDono = await turno(dono, 1000);
    const v = await fiado500(ana, cxAna, cli);
    const tentativas = Array.from({ length: 12 }, (_, i) => i % 2 === 0
      ? receber(dono, v.id, 100, i % 4 === 0 ? cxDono : null, i % 4 === 0 ? 'dinheiro' : 'pix')
      : receber(ana, v.id, 100, i % 4 === 1 ? cxAna : null, i % 4 === 1 ? 'dinheiro' : 'pix'));
    const rs = await Promise.all(tentativas);
    const aceitas = rs.filter(r => r.status === 200), recusadas = rs.filter(r => r.status === 409);
    // Saldo de 500 comporta exatamente 5 recebimentos de 100; os outros 7 são recusados, sem nenhum 5xx.
    expect(aceitas).toHaveLength(5);
    expect(recusadas).toHaveLength(7);
    expect(rs.filter(r => r.status !== 200 && r.status !== 409)).toEqual([]);
    expect(await liquidoRecebido(v.id)).toBe(500);
    expect(await titulo(ana, v.id)).toMatchObject({ recebidoCentavos: 500, saldoCentavos: 0 });
    // Cada gaveta recebeu apenas os dinheiros aceitos no próprio turno.
    const dinheiro = (caixaId: string) => aceitas.filter(r => r.corpo.caixaId === caixaId).length * 100;
    expect(await gaveta(dono, cxDono)).toBe(1000 + dinheiro(cxDono));
    expect(await gaveta(ana, cxAna)).toBe(700 + dinheiro(cxAna));
    const lancamentos = await amb.db.select().from(movimentosCaixa);
    expect(lancamentos.filter(m => m.tipo === 'recebimento_fiado').reduce((n, m) => n + m.valorCentavos, 0)).toBe(dinheiro(cxDono) + dinheiro(cxAna));
  });

  it('F14: recebimento repetido em corrida com o original aplica um efeito só', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await turno(s), cli = await cliente(s), v = await fiado500(s, cx, cli);
    const id = gerarId();
    const rs = await Promise.all([receber(s, v.id, 300, cx, 'dinheiro', id), receber(s, v.id, 300, cx, 'dinheiro', id), receber(s, v.id, 300, cx, 'dinheiro', id)]);
    expect(rs.map(r => r.status)).toEqual([200, 200, 200]);
    expect(await amb.db.select().from(eventosFiado)).toHaveLength(1);
    expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.caixaId, cx))).toHaveLength(1);
    expect(await gaveta(s, cx)).toBe(1500);
    expect(await titulo(s, v.id)).toMatchObject({ recebidoCentavos: 300, saldoCentavos: 200 });
  });

  it('F14: estorno repetido em corrida aplica um efeito só e a gaveta devolve uma vez', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await turno(s), cli = await cliente(s), v = await fiado500(s, cx, cli);
    const r = await receber(s, v.id, 300, cx);
    const estornos = [gerarId(), gerarId(), gerarId()].map(id => ({ id, recebimentoId: r.corpo.id, caixaId: cx, motivo: 'Devolvido' }));
    const rs = await Promise.all([...estornos.map(e => post(s, '/fiado/estornos', e)), post(s, '/fiado/estornos', estornos[0])]);
    // Em corrida real (PostgreSQL) qualquer um dos três IDs pode vencer; só o vencedor (e sua repetição idempotente) recebe 200.
    expect(rs.filter(x => x.status !== 200 && x.status !== 409)).toEqual([]);
    const enviados = [...estornos, estornos[0]!];
    const vencedores = new Set(rs.flatMap((x, i) => (x.status === 200 ? [enviados[i]!.id] : [])));
    expect(vencedores.size).toBe(1);
    const vencedor = [...vencedores][0]!;
    rs.forEach((x, i) => expect(x.status).toBe(enviados[i]!.id === vencedor ? 200 : 409));
    const gravados = (await amb.db.select().from(eventosFiado)).filter(e => e.tipo === 'estorno');
    expect(gravados).toHaveLength(1);
    expect(gravados[0]!.id).toBe(vencedor);
    expect(await liquidoRecebido(v.id)).toBe(0);
    expect(await gaveta(s, cx)).toBe(1200);
  });

  it('F14: venda e baixa de estoque simultâneas somam e o saldo final é exato', async () => {
    const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono), p = produto(dono.lojaId, { estoque: 10_000 });
    await enviar(amb, dono, [mutacao('produto', p)]);
    const vendas = [dono, ana, dono, ana].map(s => mutacao('venda', vendaDeItem(s, itemDe(p, 1000))));
    const rs = await Promise.all(vendas.map((m, i) => enviar(amb, i % 2 === 0 ? dono : ana, [m])));
    expect(rs.map(r => r.corpo.rejeitadas)).toEqual([[], [], [], []]);
    // Reenvio simultâneo de todas, em corrida: nenhuma baixa extra.
    await Promise.all(vendas.map((m, i) => enviar(amb, i % 2 === 0 ? dono : ana, [m])));
    expect((await saldoEstoque(dono, p.id)).saldoMilesimos).toBe(6000);
    expect((await amb.db.select().from(produtos).where(eq(produtos.id, p.id)))[0]!.estoque).toBe(6000);
    expect((await amb.db.select().from(movimentosEstoque).where(eq(movimentosEstoque.tipo, 'venda')))).toHaveLength(4);
  });
});
