import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { type Mutacao, type PlanoId, type Produto } from '@pdv/shared';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema';
import { criarApp } from '../src/servidor';
import { assinaturas, itensVenda, mudancas, mutacoesAplicadas, pagamentosVenda, produtos, vendas } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, avancarEProcessar, chamar, contaEmTeste, criarAmbiente, criarConta, enviar as enviarOriginal, exclusao, INICIO, mutacao, produto, venda, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });
async function enviar(...args: Parameters<typeof enviarOriginal>) {
  const resposta = await enviarOriginal(...args);
  expect(resposta.status).toBe(200);
  return resposta;
}
async function snapshot() {
  return Promise.all([produtos, vendas, itensVenda, pagamentosVenda, mudancas, mutacoesAplicadas].map(async t => (await amb.db.select().from(t)).map(row => JSON.stringify(row)).sort()));
}
async function conferirProduto(p: Produto, m: Mutacao, conta: { lojaId: string; aparelhoId: string }, versao = 1, instante = INICIO, quantidadeMudancas = 1) {
  expect(await amb.db.select().from(produtos).where(eq(produtos.id, p.id))).toEqual([{ ...p, criadoEm: new Date(p.criadoEm), atualizadoEm: new Date(p.atualizadoEm), excluidoEm: p.excluidoEm ? new Date(p.excluidoEm) : null, versao }]);
  const registros = await amb.db.select().from(mudancas).where(eq(mudancas.entidadeId, p.id)).orderBy(asc(mudancas.seq));
  expect(registros).toHaveLength(quantidadeMudancas);
  expect(registros[registros.length - 1]).toEqual({ seq: expect.any(Number), lojaId: conta.lojaId, entidade: 'produto', entidadeId: p.id, criadoEm: instante });
  expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, m.id))).toEqual([{ id: m.id, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: instante }]);
}

for (const plano of ['essencial', 'negocio', 'pro'] as PlanoId[]) {
  for (const campos of [{ estoque: 0 }, { estoque: 3 }, { estoque: -2 }, { estoqueMinimo: 0 }, { estoqueMinimo: 1 }, { estoqueMinimo: -2 }]) {
    it(`${plano}: novo produto com ${JSON.stringify(campos)}`, async () => {
      const conta = await contaEmTeste(amb, plano);
      const p = produto(conta.lojaId, campos);
      const pedido = mutacao('produto', { ...p, planoId: 'pro' } as typeof p);
      pedido.criadaEm = '2020-01-01T00:00:00.000Z';
      const antes = await snapshot();
      const res = await enviar(amb, conta, [pedido]);
      expect(res.status).toBe(200);
      if (plano === 'essencial') {
        expect(res.corpo.rejeitadas).toEqual([{ id: pedido.id, motivo: 'recurso_plano' }]);
        expect(res.corpo.aceitas).toEqual([]);
        expect(await snapshot()).toEqual(antes);
      } else {
        expect(res.corpo.aceitas).toEqual([pedido.id]);
        await conferirProduto(p, pedido, conta);
      }
    });
  }
}

it('conserva histórico no downgrade e retenta os mesmos IDs após upgrade', async () => {
  const conta = await contaEmTeste(amb);
  const p = produto(conta.lojaId, { estoque: 7, estoqueMinimo: 2 });
  expect((await enviar(amb, conta, [mutacao('produto', p)])).corpo.rejeitadas).toEqual([]);
  expect((await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'essencial' } })).corpo.licenca.planoId).toBe('essencial');
  const editado = { ...p, nome: 'Alterado', precoCentavos: 3000 };
  const edicao = mutacao('produto', editado);
  expect((await enviar(amb, conta, [edicao])).corpo.aceitas).toEqual([edicao.id]);
  await conferirProduto(editado, edicao, conta, 2, INICIO, 2);
  for (const campos of [{ estoque: 8 }, { estoqueMinimo: 3 }, { estoque: null }, { estoqueMinimo: null }]) {
    const pedido = mutacao('produto', { ...editado, ...campos });
    const antes = await snapshot();
    expect((await enviar(amb, conta, [pedido])).corpo.rejeitadas).toEqual([{ id: pedido.id, motivo: 'recurso_plano' }]);
    expect(await snapshot()).toEqual(antes);
  }
  const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: conta.token });
  expect(pull.corpo.mudancas.find((m: { dados: { id: string } }) => m.dados.id === p.id)).toEqual({ entidade: 'produto', operacao: 'upsert', dados: { ...editado, versao: 2 } });
  const pedido = mutacao('produto', { ...editado, estoque: 8 });
  const antes = await snapshot();
  expect((await enviar(amb, conta, [pedido])).corpo.rejeitadas).toEqual([{ id: pedido.id, motivo: 'recurso_plano' }]);
  expect(await snapshot()).toEqual(antes);
  expect((await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'negocio' } })).corpo.licenca.planoId).toBe('negocio');
  expect((await enviar(amb, conta, [pedido])).corpo.aceitas).toEqual([pedido.id]);
  await conferirProduto({ ...editado, estoque: 8 }, pedido, conta, 3, INICIO, 3);
  const depois = await snapshot();
  expect((await enviar(amb, conta, [pedido])).corpo.aceitas).toEqual([pedido.id]);
  expect(await snapshot()).toEqual(depois);
  expect((await amb.db.select().from(produtos).where(eq(produtos.id, p.id)))[0]).toMatchObject({ estoque: 8, estoqueMinimo: 2 });
  expect((await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'essencial' } })).corpo.licenca.planoId).toBe('essencial');
  const del = exclusao('produto', p.id);
  expect((await enviar(amb, conta, [del])).corpo.aceitas).toEqual([del.id]);
  await conferirProduto({ ...editado, estoque: 8, excluidoEm: INICIO.toISOString() }, del, conta, 4, INICIO, 4);
  expect((await amb.db.select().from(produtos).where(eq(produtos.id, p.id)))[0]).toMatchObject({ estoque: 8, estoqueMinimo: 2, excluidoEm: INICIO });
  const restaurar = mutacao('produto', { ...editado, estoque: 8 });
  expect((await enviar(amb, conta, [restaurar])).corpo.aceitas).toEqual([restaurar.id]);
  await conferirProduto({ ...editado, estoque: 8 }, restaurar, conta, 5, INICIO, 5);
  expect((await amb.db.select().from(produtos).where(eq(produtos.id, p.id)))[0]).toMatchObject({ estoque: 8, estoqueMinimo: 2, excluidoEm: null });
});

if (process.env.PDV_TEST_POSTGRES_URL) for (const limite of [false, true]) it(`usa plano reduzido após aguardar a conta: ${limite ? 'limite' : 'estoque'}`, async () => {
  const conta = await contaEmTeste(amb);
  if (limite) {
    const lote = Array.from({ length: 500 }, () => produto(conta.lojaId));
    await amb.db.insert(produtos).values(lote.map(p => ({ ...p, criadoEm: INICIO, atualizadoEm: INICIO, excluidoEm: null })));
  }
  const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const cliente = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const app = await criarApp({ db: drizzle(cliente, { schema }), relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
  let pendente: Promise<{ statusCode: number; json(): any }> | undefined;
  try {
    const pid = Number((await cliente`select pg_backend_pid() as pid`)[0]!.pid);
    await controle`begin`;
    await controle`select id from contas where id = ${conta.contaId} for update`;
    const antes = await snapshot();
    const assinaturaAntes = (await amb.db.select().from(assinaturas).where(eq(assinaturas.contaId, conta.contaId)))[0]!;
    const pedido = mutacao('produto', produto(conta.lojaId, { estoque: 1 }));
    pendente = app.inject({ method: 'POST', url: '/sync/push', headers: { authorization: `Bearer ${conta.token}` }, payload: { aparelhoId: conta.aparelhoId, mutacoes: [pedido] } });
    let bloqueado = false;
    for (let i = 0; i < 200 && !bloqueado; i++) {
      bloqueado = (await observador`select pid from pg_stat_activity where pid = ${pid} and wait_event_type = 'Lock' and query ilike '%for update%'`).length === 1;
      if (!bloqueado) await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(bloqueado).toBe(true);
    await controle`update assinaturas set plano_id = 'essencial' where conta_id = ${conta.contaId}`;
    await controle`commit`;
    const resposta = await pendente;
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().rejeitadas).toEqual([{ id: pedido.id, motivo: limite ? 'limite_plano' : 'recurso_plano' }]);
    expect(await snapshot()).toEqual(antes);
    expect(await amb.db.select().from(assinaturas).where(eq(assinaturas.contaId, conta.contaId))).toEqual([{ ...assinaturaAntes, planoId: 'essencial' }]);
  } finally {
    await controle`rollback`.catch(() => undefined);
    await pendente?.catch(() => undefined);
    await app.close();
    await cliente.end();
    await controle.end();
    await observador.end();
  }
});

if (process.env.PDV_TEST_POSTGRES_URL) it('serializa a última vaga entre dois pushes', async () => {
  const conta = await contaEmTeste(amb, 'essencial');
  const lote = Array.from({ length: 499 }, () => produto(conta.lojaId));
  await amb.db.insert(produtos).values(lote.map(p => ({ ...p, criadoEm: INICIO, atualizadoEm: INICIO, excluidoEm: null })));
  const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const clientes = [postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 }), postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 })];
  const apps = await Promise.all(clientes.map(cliente => criarApp({ db: drizzle(cliente, { schema }), relogio: amb.relogio, billing: amb.billing, fontesEan: [] })));
  let pendentes: Promise<{ statusCode: number; json(): any }>[] = [];
  try {
    const pids = await Promise.all(clientes.map(async cliente => Number((await cliente`select pg_backend_pid() as pid`)[0]!.pid)));
    await controle`begin`;
    await controle`select id from contas where id = ${conta.contaId} for update`;
    const antes = await snapshot();
    const pedidos = [mutacao('produto', produto(conta.lojaId)), mutacao('produto', produto(conta.lojaId))];
    pendentes = apps.map((app, i) => app.inject({ method: 'POST', url: '/sync/push', headers: { authorization: `Bearer ${conta.token}` }, payload: { aparelhoId: conta.aparelhoId, mutacoes: [pedidos[i]!] } }));
    let bloqueados = false;
    for (let i = 0; i < 200 && !bloqueados; i++) {
      const linhas = await observador`select pid from pg_stat_activity where pid in ${observador(pids)} and wait_event_type = 'Lock' and query ilike '%for update%'`;
      bloqueados = linhas.length === 2;
      if (!bloqueados) await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(bloqueados).toBe(true);
    await controle`commit`;
    const recebidas = await Promise.all(pendentes);
    expect(recebidas.map(r => r.statusCode)).toEqual([200, 200]);
    const respostas = recebidas.map(r => r.json());
    expect(respostas.flatMap(r => r.aceitas)).toHaveLength(1);
    expect(respostas.flatMap(r => r.rejeitadas)).toEqual([{ id: expect.any(String), motivo: 'limite_plano' }]);
    const vencedor = respostas.flatMap(r => r.aceitas)[0];
    const perdedor = pedidos.find(p => p.id !== vencedor)!;
    const vencedorPedido = pedidos.find(p => p.id === vencedor)!;
    expect(respostas.flatMap(r => r.rejeitadas)[0].id).toBe(perdedor.id);
    expect(await amb.db.select().from(produtos)).toHaveLength(500);
    expect(await amb.db.select().from(produtos).where(eq(produtos.id, perdedor.dados.id))).toEqual([]);
    expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, perdedor.id))).toEqual([]);
    expect(await amb.db.select().from(mudancas).where(eq(mudancas.entidadeId, perdedor.dados.id))).toEqual([]);
    const p = vencedorPedido.dados as ReturnType<typeof produto>;
    expect(await amb.db.select().from(produtos).where(eq(produtos.id, p.id))).toEqual([{ ...p, criadoEm: INICIO, atualizadoEm: INICIO, versao: 1 }]);
    expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, vencedor))).toEqual([{ id: vencedor, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: INICIO }]);
    await conferirProduto(p, vencedorPedido, conta);
    const depois = await snapshot();
    expect(depois[0]!.filter(row => JSON.parse(row).id !== p.id)).toEqual(antes[0]);
    expect(depois.slice(1, 4)).toEqual(antes.slice(1, 4));
    expect(depois[4]).toHaveLength(antes[4]!.length + 1);
    expect(depois[5]).toHaveLength(antes[5]!.length + 1);
  } finally {
    await controle`rollback`.catch(() => undefined);
    await Promise.all(pendentes.map(p => p.catch(() => undefined)));
    await Promise.all(apps.map(app => app.close()));
    await Promise.all(clientes.map(cliente => cliente.end()));
    await controle.end();
    await observador.end();
  }
});

it('permite null, preserva LWW e aceita venda manual após downgrade', async () => {
  const conta = await contaEmTeste(amb);
  const p = produto(conta.lojaId, { estoque: 4 });
  expect((await enviar(amb, conta, [mutacao('produto', p)])).corpo.rejeitadas).toEqual([]);
  const linhaAntes = await amb.db.select().from(produtos).where(eq(produtos.id, p.id));
  const mudancasAntes = await amb.db.select().from(mudancas).where(eq(mudancas.entidadeId, p.id));
  const manual = mutacao('venda', venda(conta));
  amb.relogio.avancarHoras(1);
  const agora = amb.relogio.agora();
  await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'essencial' } });
  const antigo = mutacao('produto', { ...p, estoque: 99, atualizadoEm: '2020-01-01T00:00:00.000Z' });
  const vizinho = mutacao('produto', produto(conta.lojaId));
  const res = await enviar(amb, conta, [antigo, vizinho, manual]);
  expect(res.status).toBe(200);
  expect(res.corpo.aceitas).toEqual([antigo.id, vizinho.id, manual.id]);
  expect(res.corpo.rejeitadas).toEqual([]);
  expect((await amb.db.select().from(produtos).where(eq(produtos.id, p.id)))[0]).toMatchObject({ estoque: 4 });
  expect(await amb.db.select().from(produtos).where(eq(produtos.id, p.id))).toEqual(linhaAntes);
  expect(await amb.db.select().from(mudancas).where(eq(mudancas.entidadeId, p.id))).toEqual(mudancasAntes);
  expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, antigo.id))).toEqual([{ id: antigo.id, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: agora }]);
  await conferirProduto(vizinho.dados as Produto, vizinho, conta, 1, agora);
  const v = manual.dados as ReturnType<typeof venda>;
  expect(await amb.db.select().from(vendas).where(eq(vendas.id, v.id))).toEqual([{ id: v.id, lojaId: v.lojaId, aparelhoId: v.aparelhoId, operadorId: v.operadorId, totalCentavos: v.totalCentavos, status: v.status, criadoEm: INICIO, atualizadoEm: agora, excluidoEm: null, versao: 1 }]);
  expect(await amb.db.select().from(itensVenda).where(eq(itensVenda.vendaId, v.id)).orderBy(asc(itensVenda.posicao))).toEqual(v.itens.map((item, posicao) => ({ ...item, vendaId: v.id, lojaId: v.lojaId, posicao, criadoEm: INICIO })));
  expect(await amb.db.select().from(pagamentosVenda).where(eq(pagamentosVenda.vendaId, v.id)).orderBy(asc(pagamentosVenda.posicao))).toEqual(v.pagamentos.map((pagamento, posicao) => ({ ...pagamento, vendaId: v.id, lojaId: v.lojaId, posicao, criadoEm: INICIO })));
  expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, manual.id))).toEqual([{ id: manual.id, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: agora }]);
  expect(await amb.db.select().from(mudancas).where(eq(mudancas.entidadeId, v.id))).toEqual([{ seq: expect.any(Number), lojaId: conta.lojaId, entidade: 'venda', entidadeId: v.id, criadoEm: agora }]);
  const depois = await snapshot();
  expect((await enviar(amb, conta, [vizinho])).corpo.aceitas).toEqual([vizinho.id]);
  expect(await snapshot()).toEqual(depois);
});

it('mantém plano atual apesar de plano agendado e preserva prioridade de loja', async () => {
  const conta = await contaEmTeste(amb);
  const outra = await criarConta(amb);
  await avancarEProcessar(amb, 7);
  const agendar = await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'essencial' } });
  expect(agendar.status).toBe(200);
  expect(agendar.corpo.assinatura).toMatchObject({ status: 'ativa', planoId: 'negocio', planoAgendado: 'essencial' });
  expect((await amb.db.select().from(assinaturas).where(eq(assinaturas.contaId, conta.contaId)))[0]).toMatchObject({ status: 'ativa', planoId: 'negocio', planoAgendado: 'essencial' });
  const valido = mutacao('produto', produto(conta.lojaId, { estoque: 0, estoqueMinimo: 1 }));
  const invalido = mutacao('produto', produto(outra.lojaId, { estoque: 4 }));
  const res = await enviar(amb, conta, [invalido, valido]);
  expect(res.status).toBe(200);
  expect(res.corpo.rejeitadas).toEqual([{ id: invalido.id, motivo: 'loja_invalida' }]);
  expect(res.corpo.aceitas).toEqual([valido.id]);
  expect(await amb.db.select().from(produtos).where(eq(produtos.id, invalido.dados.id))).toEqual([]);
  expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, invalido.id))).toEqual([]);
  expect((await amb.db.select().from(produtos).where(eq(produtos.id, valido.dados.id)))[0]).toMatchObject({ estoque: 0, estoqueMinimo: 1 });
  await conferirProduto(valido.dados as Produto, valido, conta, 1, amb.relogio.agora());
  // Estado consolidado controlado para verificar a prioridade no Essencial, sem simular renovação.
  await amb.db.update(assinaturas).set({ planoId: 'essencial', planoAgendado: null }).where(eq(assinaturas.contaId, conta.contaId));
  const semLoja = mutacao('produto', produto(outra.lojaId, { estoque: 4 }));
  const vizinho = mutacao('produto', produto(conta.lojaId));
  const depois = await enviar(amb, conta, [semLoja, vizinho]);
  expect(depois.status).toBe(200);
  expect(depois.corpo.rejeitadas).toEqual([{ id: semLoja.id, motivo: 'loja_invalida' }]);
  expect(depois.corpo.aceitas).toEqual([vizinho.id]);
  expect(await amb.db.select().from(produtos).where(eq(produtos.id, semLoja.dados.id))).toEqual([]);
  expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, semLoja.id))).toEqual([]);
  expect((await amb.db.select().from(produtos).where(eq(produtos.id, vizinho.dados.id)))[0]).toMatchObject({ estoque: null, estoqueMinimo: null });
  await conferirProduto(vizinho.dados as Produto, vizinho, conta, 1, amb.relogio.agora());
});

it('respeita a fronteira após downgrade acima do limite', async () => {
  const conta = await contaEmTeste(amb);
  // Seed apenas prepara o catálogo acima do limite; as operações avaliadas passam pela API.
  const lote = Array.from({ length: 501 }, (_, i) => produto(conta.lojaId, { nome: `Produto ${i}`, estoque: 1 }));
  await amb.db.insert(produtos).values(lote.map(p => ({ ...p, criadoEm: INICIO, atualizadoEm: INICIO, excluidoEm: null })));
  await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'essencial' } });
  const editar = mutacao('produto', { ...lote[0]!, nome: 'Editado' });
  expect((await enviar(amb, conta, [editar])).corpo.aceitas).toEqual([editar.id]);
  await conferirProduto(editar.dados as Produto, editar, conta, 1, INICIO, 1);
  const novo = mutacao('produto', produto(conta.lojaId, { estoque: 1 }));
  let antes = await snapshot();
  expect((await enviar(amb, conta, [novo])).corpo.rejeitadas).toEqual([{ id: novo.id, motivo: 'limite_plano' }]);
  expect(await snapshot()).toEqual(antes);
  for (const p of lote.slice(1, 3)) {
    const del = exclusao('produto', p.id);
    expect((await enviar(amb, conta, [del])).corpo.aceitas).toEqual([del.id]);
  }
  const restaurar = mutacao('produto', lote[1]!);
  expect((await enviar(amb, conta, [restaurar])).corpo.aceitas).toEqual([restaurar.id]);
  await conferirProduto(lote[1]!, restaurar, conta, 2, INICIO, 2);
  expect((await amb.db.select().from(produtos).where(eq(produtos.id, lote[1]!.id)))[0]).toMatchObject({ estoque: 1, excluidoEm: null });
  const semVaga = mutacao('produto', lote[2]!);
  antes = await snapshot();
  expect((await enviar(amb, conta, [semVaga])).corpo.rejeitadas).toEqual([{ id: semVaga.id, motivo: 'limite_plano' }]);
  expect(await snapshot()).toEqual(antes);
  expect((await amb.db.select().from(produtos).where(eq(produtos.id, lote[2]!.id)))[0]).toMatchObject({ estoque: 1, excluidoEm: INICIO });
});
