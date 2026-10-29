import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { gerarId } from '@pdv/shared';
import { aparelhos, caixas, itensVenda, movimentosCaixa, mudancas, mutacoesAplicadas, operadores, pagamentosVenda, produtos, sessoes, vendas } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { criarSessao } from '../src/auth';
import { criarApp } from '../src/servidor';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, criarConta, enviar, exclusao, INICIO, mutacao, produto, reautenticar, venda, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });
async function snapshot() {
  const tabelas = [produtos, vendas, itensVenda, pagamentosVenda, caixas, movimentosCaixa, mudancas, mutacoesAplicadas, sessoes, aparelhos];
  return Promise.all(tabelas.map(async tabela => (await amb.db.select().from(tabela)).map(row => JSON.stringify(row)).sort()));
}
function caixa(conta: { lojaId: string; aparelhoId: string; operadorId: string }) {
  return { id: gerarId(), lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, operadorId: conta.operadorId, abertura: { em: INICIO.toISOString(), trocoInicialCentavos: 100 }, fechamento: null, movimentos: [] };
}
it('rejeita escrita por operador e confirma ACK anterior', async () => {
  const conta = await contaEmTeste(amb);
  const anterior = mutacao('venda', venda(conta));
  expect((await enviar(amb, conta, [anterior])).corpo.aceitas).toEqual([anterior.id]);
  await amb.db.update(operadores).set({ papel: 'operador' }).where(eq(operadores.id, conta.operadorId));
  const nova = mutacao('venda', venda(conta));
  const antes = await snapshot();
  const res = await enviar(amb, conta, [anterior, nova]);
  expect(res.status).toBe(200);
  expect(res.corpo.aceitas).toEqual([anterior.id]);
  expect(res.corpo.rejeitadas).toEqual([{ id: nova.id, motivo: 'permissao_negada' }]);
  expect(await snapshot()).toEqual(antes);
  await amb.db.update(operadores).set({ papel: 'dono' }).where(eq(operadores.id, conta.operadorId));
  expect((await enviar(amb, conta, [nova])).corpo.aceitas).toEqual([nova.id]);
});
it('nega todas as mutações novas de operador e papel desconhecido, mantendo pull', async () => {
  const dono = await contaEmTeste(amb);
  const p = produto(dono.lojaId);
  const base = mutacao('produto', p);
  expect((await enviar(amb, dono, [base])).corpo.aceitas).toEqual([base.id]);
  const operadorId = gerarId();
  await amb.db.insert(operadores).values({ id: operadorId, contaId: dono.contaId, lojaId: dono.lojaId, nome: 'Operador fixture', papel: 'operador', criadoEm: INICIO, atualizadoEm: INICIO });
  const sessao = await criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId, aparelhoId: dono.aparelhoId }, INICIO);
  const operador = { ...dono, operadorId, token: sessao.token };
  const caixaExistente = caixa(operador);
  await amb.db.update(operadores).set({ papel: 'dono' }).where(eq(operadores.id, operadorId));
  const abertura = mutacao('caixa', caixaExistente);
  expect((await enviar(amb, operador, [abertura])).corpo.aceitas).toEqual([abertura.id]);
  await amb.db.update(operadores).set({ papel: 'operador' }).where(eq(operadores.id, operadorId));
  const suprimento = { id: gerarId(), tipo: 'suprimento' as const, valorCentavos: 50, motivo: 'Reforço de troco', criadoEm: INICIO.toISOString() };
  const lote = [mutacao('produto', produto(dono.lojaId)), exclusao('produto', p.id), mutacao('venda', venda(operador)), mutacao('caixa', caixa(operador)), mutacao('caixa', { ...caixaExistente, movimentos: [suprimento] })];
  for (const papel of ['operador', 'desconhecido']) {
    if (papel === 'desconhecido') await amb.db.execute(sql`update operadores set papel = 'desconhecido' where id = ${operadorId}`);
    const antes = await snapshot();
    const res = await enviar(amb, operador, lote);
    expect(res.status).toBe(200);
    expect(res.corpo.aceitas).toEqual([]);
    expect(res.corpo.rejeitadas).toEqual(lote.map(m => ({ id: m.id, motivo: 'permissao_negada' })));
    expect(await snapshot()).toEqual(antes);
    const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: operador.token });
    expect(pull.status).toBe(200);
    expect(JSON.stringify(pull.corpo)).toContain(p.id);
  }
  await amb.db.update(operadores).set({ papel: 'dono' }).where(eq(operadores.id, operadorId));
  expect((await enviar(amb, operador, lote)).corpo.aceitas).toEqual(lote.map(m => m.id));
  expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, suprimento.id))).toEqual([
    { ...suprimento, lojaId: dono.lojaId, caixaId: caixaExistente.id, criadoEm: INICIO },
  ]);
});
it('exige origem da sessão em venda e caixa novos', async () => {
  const conta = await contaEmTeste(amb);
  const outra = await criarConta(amb);
  const segundoId = gerarId();
  await reautenticar(amb, { email: conta.email, aparelhoId: segundoId });
  const outroOperadorId = gerarId();
  await amb.db.insert(operadores).values({ id: outroOperadorId, contaId: conta.contaId, lojaId: conta.lojaId, nome: 'Outro operador fixture', papel: 'operador', criadoEm: INICIO, atualizadoEm: INICIO });
  for (const campo of ['aparelhoId', 'operadorId'] as const) {
    for (const id of [gerarId(), outra[campo], campo === 'aparelhoId' ? segundoId : outroOperadorId]) {
      const vendaValida = venda(conta);
      const caixaValido = caixa(conta);
      const v = mutacao('venda', { ...vendaValida, [campo]: id });
      const cx = mutacao('caixa', { ...caixaValido, [campo]: id });
      const antes = await snapshot();
      const res = await enviar(amb, conta, [v, cx]);
      expect(res.status).toBe(200);
      expect(res.corpo.aceitas).toEqual([]);
      expect(res.corpo.rejeitadas).toEqual([v, cx].map(m => ({ id: m.id, motivo: 'origem_invalida' })));
      expect(await snapshot()).toEqual(antes);
      const corrigidas = [mutacao('venda', vendaValida), mutacao('caixa', caixaValido)];
      expect((await enviar(amb, conta, corrigidas)).corpo.aceitas).toEqual(corrigidas.map(m => m.id));
    }
  }
  const validas = [mutacao('venda', venda(conta)), mutacao('caixa', caixa(conta))];
  expect((await enviar(amb, conta, validas)).corpo.aceitas).toEqual(validas.map(m => m.id));
});
it('não permite alterar origem de caixa aberto', async () => {
  const conta = await contaEmTeste(amb);
  const original = caixa(conta);
  const inicial = mutacao('caixa', original);
  expect((await enviar(amb, conta, [inicial])).corpo.aceitas).toEqual([inicial.id]);
  for (const campo of ['aparelhoId', 'operadorId'] as const) {
    const alterada = mutacao('caixa', { ...original, [campo]: gerarId() });
    const antes = await snapshot();
    expect((await enviar(amb, conta, [alterada])).corpo.rejeitadas).toEqual([{ id: alterada.id, motivo: 'origem_invalida' }]);
    expect(await snapshot()).toEqual(antes);
  }
  const atualizacao = mutacao('caixa', original);
  expect((await enviar(amb, conta, [atualizacao])).corpo.aceitas).toEqual([atualizacao.id]);
  const fechamento = mutacao('caixa', { ...original, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 100, contadoCentavos: 100 } });
  expect((await enviar(amb, conta, [fechamento])).corpo.aceitas).toEqual([fechamento.id]);
  const antes = await snapshot();
  const nova = mutacao('caixa', original);
  const res = await enviar(amb, conta, [fechamento, nova]);
  expect(res.corpo.aceitas).toEqual([fechamento.id]);
  expect(res.corpo.rejeitadas).toEqual([{ id: nova.id, motivo: 'caixa_fechada' }]);
  expect(await snapshot()).toEqual(antes);
});

it('prioriza loja inválida e preserva imutabilidade da origem da venda existente', async () => {
  const conta = await contaEmTeste(amb);
  const outra = await criarConta(amb);
  const original = venda(conta);
  const inicial = mutacao('venda', original);
  expect((await enviar(amb, conta, [inicial])).corpo.aceitas).toEqual([inicial.id]);
  const alteracoes = (['aparelhoId', 'operadorId'] as const).map(campo => mutacao('venda', { ...original, [campo]: gerarId() }));
  const erradas = [mutacao('venda', venda(conta, { lojaId: outra.lojaId, aparelhoId: outra.aparelhoId })), mutacao('caixa', { ...caixa(conta), lojaId: outra.lojaId, aparelhoId: outra.aparelhoId })];
  const antes = await snapshot();
  const res = await enviar(amb, conta, [...alteracoes, ...erradas]);
  expect(res.status).toBe(200);
  expect(res.corpo.aceitas).toEqual([]);
  expect(res.corpo.rejeitadas).toEqual([...alteracoes.map(m => ({ id: m.id, motivo: 'venda_imutavel' })), ...erradas.map(m => ({ id: m.id, motivo: 'loja_invalida' }))]);
  expect(await snapshot()).toEqual(antes);
});

it('preserva origem histórica após troca e revogação do aparelho', async () => {
  const a = await contaEmTeste(amb);
  const original = venda(a);
  const abertura = caixa(a);
  const iniciais = [mutacao('venda', original), mutacao('caixa', abertura)];
  expect((await enviar(amb, a, iniciais)).corpo.aceitas).toEqual(iniciais.map(m => m.id));
  const bId = gerarId();
  const login = await reautenticar(amb, { email: a.email, aparelhoId: bId });
  const b = { ...a, ...login, aparelhoId: bId };
  const rev = await amb.app.inject({ method: 'DELETE', url: `/aparelhos/${a.aparelhoId}`, headers: { authorization: `Bearer ${b.token}` } });
  expect(rev.statusCode).toBe(204);
  const filhosAntes = { itens: await amb.db.select().from(itensVenda).orderBy(itensVenda.id), pagamentos: await amb.db.select().from(pagamentosVenda).orderBy(pagamentosVenda.id) };
  const credenciaisAntes = { aparelhos: await amb.db.select().from(aparelhos).orderBy(aparelhos.id), sessoes: await amb.db.select().from(sessoes).orderBy(sessoes.id) };
  const replay = mutacao('venda', original);
  const cancelamento = mutacao('venda', { ...original, status: 'cancelada' });
  const suprimento = { id: gerarId(), tipo: 'suprimento' as const, valorCentavos: 200, motivo: 'Troco após recuperação', criadoEm: INICIO.toISOString() };
  const alteracaoCaixa = mutacao('caixa', { ...abertura, movimentos: [suprimento] });
  expect((await enviar(amb, b, [replay, cancelamento, alteracaoCaixa])).corpo.aceitas).toEqual([replay.id, cancelamento.id, alteracaoCaixa.id]);
  expect((await amb.db.select().from(vendas).where(eq(vendas.id, original.id)))[0]).toMatchObject({ aparelhoId: a.aparelhoId, operadorId: a.operadorId, status: 'cancelada' });
  expect(await amb.db.select().from(caixas).where(eq(caixas.id, abertura.id))).toEqual([{
    id: abertura.id, lojaId: a.lojaId, aparelhoId: a.aparelhoId, operadorId: a.operadorId,
    abertoEm: INICIO, trocoInicialCentavos: 100, fechadoEm: null, esperadoCentavos: null,
    contadoCentavos: null, criadoEm: INICIO, atualizadoEm: INICIO, excluidoEm: null, versao: 2,
  }]);
  expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.caixaId, abertura.id))).toEqual([
    { ...suprimento, caixaId: abertura.id, lojaId: a.lojaId, criadoEm: INICIO },
  ]);
  expect(await amb.db.select().from(itensVenda).orderBy(itensVenda.id)).toEqual(filhosAntes.itens);
  expect(await amb.db.select().from(pagamentosVenda).orderBy(pagamentosVenda.id)).toEqual(filhosAntes.pagamentos);
  expect(await amb.db.select().from(aparelhos).orderBy(aparelhos.id)).toEqual(credenciaisAntes.aparelhos);
  expect(await amb.db.select().from(sessoes).orderBy(sessoes.id)).toEqual(credenciaisAntes.sessoes);
  const nova = mutacao('venda', venda(a));
  const novoCaixa = mutacao('caixa', caixa(a));
  const antes = await snapshot();
  expect((await enviar(amb, b, [nova, novoCaixa])).corpo.rejeitadas).toEqual([nova, novoCaixa].map(m => ({ id: m.id, motivo: 'origem_invalida' })));
  expect(await snapshot()).toEqual(antes);
  const valida = mutacao('venda', venda(b));
  expect((await enviar(amb, b, [valida])).corpo.aceitas).toEqual([valida.id]);
  expect((await enviar(amb, a, [iniciais[0]!])).status).toBe(401);
});

if (process.env.PDV_TEST_POSTGRES_URL) it('usa papel atual após esperar lock da conta', async () => {
  const conta = await contaEmTeste(amb);
  const anterior = mutacao('venda', venda(conta));
  expect((await enviar(amb, conta, [anterior])).corpo.aceitas).toEqual([anterior.id]);
  const nova = mutacao('venda', venda(conta));
  const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const segunda = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
  const iniciarPush = () => segunda.inject({ method: 'POST', url: '/sync/push', headers: { authorization: `Bearer ${conta.token}` }, payload: { aparelhoId: conta.aparelhoId, mutacoes: [anterior, nova] } });
  let pendente: ReturnType<typeof iniciarPush> | undefined;
  try {
    const antes = await snapshot();
    await controle`begin`;
    const pid = Number((await controle`select pg_backend_pid() as pid`)[0]!.pid);
    await controle`select id from contas where id = ${conta.contaId} for update`;
    pendente = iniciarPush();
    let bloqueado = false;
    for (let i = 0; i < 200 && !bloqueado; i++) {
      bloqueado = (await observador`select pid from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid)) and query like '%contas%' and query like '%for update%'`).length > 0;
      if (!bloqueado) await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(bloqueado).toBe(true);
    await controle`update operadores set papel = 'operador' where id = ${conta.operadorId}`;
    await controle`commit`;
    const resposta = await pendente;
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().aceitas).toEqual([anterior.id]);
    expect(resposta.json().rejeitadas).toEqual([{ id: nova.id, motivo: 'permissao_negada' }]);
    expect(await snapshot()).toEqual(antes);
    expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
    expect((await amb.db.select().from(operadores).where(eq(operadores.id, conta.operadorId)))[0]?.papel).toBe('operador');
  } finally {
    await controle`rollback`.catch(() => undefined);
    await pendente?.catch(() => undefined);
    await segunda.close();
    await controle.end();
    await observador.end();
  }
});
