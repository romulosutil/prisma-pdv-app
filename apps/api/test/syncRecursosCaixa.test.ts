import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { gerarId, type PlanoId, type Produto, type Mutacao } from '@pdv/shared';
import postgres from 'postgres';
import { aparelhos, caixas, movimentosCaixa, mudancas, mutacoesAplicadas, produtos, sessoes } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { criarApp } from '../src/servidor';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, INICIO, mutacao, NUMEROS, produto, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });
const caixa = (c: { lojaId: string; aparelhoId: string; operadorId: string }) => ({ id: gerarId(), lojaId: c.lojaId, aparelhoId: c.aparelhoId, operadorId: c.operadorId, abertura: { em: INICIO.toISOString(), trocoInicialCentavos: 100 }, fechamento: null, movimentos: [] as Movimento[] });
type Movimento = { id: string; tipo: 'sangria' | 'suprimento'; valorCentavos: number; motivo: string | null; criadoEm: string };
const movimento = (tipo: Movimento['tipo'] = 'sangria'): Movimento => ({ id: gerarId(), tipo, valorCentavos: 100, motivo: 'Teste', criadoEm: INICIO.toISOString() });
async function snapshot() {
  return Promise.all([produtos, caixas, movimentosCaixa, mudancas, mutacoesAplicadas, sessoes, aparelhos].map(async t => (await amb.db.select().from(t)).map(row => JSON.stringify(row)).sort()));
}
async function conferirProduto(p: Produto, m: Mutacao, conta: { lojaId: string; aparelhoId: string }) {
  expect(await amb.db.select().from(produtos).where(eq(produtos.id, p.id))).toEqual([{ ...p, criadoEm: INICIO, atualizadoEm: INICIO, versao: 1 }]);
  expect(await amb.db.select().from(mudancas).where(eq(mudancas.entidadeId, p.id))).toEqual([expect.objectContaining({ lojaId: conta.lojaId, entidade: 'produto', entidadeId: p.id, criadoEm: INICIO })]);
  expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, m.id))).toEqual([{ id: m.id, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: INICIO }]);
}

for (const plano of ['essencial', 'negocio', 'pro'] as PlanoId[]) for (const tipo of ['sangria', 'suprimento'] as const) for (const existente of [false, true]) {
  it(`${plano} ${tipo} em caixa ${existente ? 'existente' : 'novo'}`, async () => {
    const conta = await contaEmTeste(amb, plano);
    const cx = caixa(conta);
    if (existente) expect((await enviar(amb, conta, [mutacao('caixa', cx)])).corpo.rejeitadas).toEqual([]);
    const m = { ...movimento(tipo), criadoEm: '2020-01-01T00:00:00.000Z' };
    const pedido = mutacao('caixa', { ...cx, movimentos: [m], planoId: 'pro' } as typeof cx);
    const antes = await snapshot();
    const res = await enviar(amb, conta, [pedido]);
    expect(res.status).toBe(200);
    if (plano === 'essencial') {
      expect(res.corpo.rejeitadas).toEqual([{ id: pedido.id, motivo: 'recurso_plano' }]);
      expect(res.corpo.aceitas).toEqual([]);
      expect(await snapshot()).toEqual(antes);
    } else {
      expect(res.corpo.aceitas).toEqual([pedido.id]);
      expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, m.id))).toEqual([{ ...m, caixaId: cx.id, lojaId: cx.lojaId, criadoEm: new Date(m.criadoEm) }]);
    }
  });
}

it('preserva histórico após downgrade, rejeita novo e aceita o mesmo pedido após upgrade', async () => {
  const conta = await contaEmTeste(amb);
  const cx = caixa(conta);
  const antigos = [movimento('sangria'), movimento('suprimento')];
  expect((await enviar(amb, conta, [mutacao('caixa', { ...cx, movimentos: antigos })])).corpo.rejeitadas).toEqual([]);
  const outroCaixa = caixa(conta), outroHistorico = movimento();
  expect((await enviar(amb, conta, [mutacao('caixa', { ...outroCaixa, movimentos: [outroHistorico] })])).corpo.rejeitadas).toEqual([]);
  expect((await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'essencial' } })).corpo.licenca.planoId).toBe('essencial');
  const replay = mutacao('caixa', { ...cx, movimentos: antigos });
  const omitido = mutacao('caixa', cx);
  expect((await enviar(amb, conta, [replay, omitido])).corpo.aceitas).toEqual([replay.id, omitido.id]);
  const fechamento = mutacao('caixa', { ...outroCaixa, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 100, contadoCentavos: 100 } });
  expect((await enviar(amb, conta, [fechamento])).corpo.aceitas).toEqual([fechamento.id]);
  expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, outroHistorico.id))).toEqual([{ ...outroHistorico, caixaId: outroCaixa.id, lojaId: conta.lojaId, criadoEm: INICIO }]);
  const linhasHistoricas = await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.caixaId, cx.id));
  expect(linhasHistoricas.sort((a, b) => a.id.localeCompare(b.id))).toEqual(antigos.map(m => ({ ...m, caixaId: cx.id, lojaId: conta.lojaId, criadoEm: INICIO })).sort((a, b) => a.id.localeCompare(b.id)));
  const pullEssencial = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: conta.token });
  expect(pullEssencial.status).toBe(200);
  expect(pullEssencial.corpo.mudancas).toHaveLength(2);
  const caixasPull = pullEssencial.corpo.mudancas.map((x: { dados: { id: string; movimentos: Movimento[] } }) => ({ ...x, dados: { ...x.dados, movimentos: [...x.dados.movimentos].sort((a, b) => a.id.localeCompare(b.id)) } })).sort((a: { dados: { id: string } }, b: { dados: { id: string } }) => a.dados.id.localeCompare(b.dados.id));
  expect(caixasPull).toEqual([{ entidade: 'caixa', operacao: 'upsert', dados: { ...cx, movimentos: [...antigos].sort((a, b) => a.id.localeCompare(b.id)) } }, { entidade: 'caixa', operacao: 'upsert', dados: { ...outroCaixa, movimentos: [outroHistorico], fechamento: { em: INICIO.toISOString(), esperadoCentavos: 100, contadoCentavos: 100 } } }].sort((a, b) => a.dados.id.localeCompare(b.dados.id)));
  const novo = movimento();
  const pedido = mutacao('caixa', { ...cx, movimentos: [...antigos, novo] });
  const antes = await snapshot();
  expect((await enviar(amb, conta, [pedido])).corpo.rejeitadas).toEqual([{ id: pedido.id, motivo: 'recurso_plano' }]);
  expect(await snapshot()).toEqual(antes);
  expect((await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'negocio' } })).corpo.licenca.planoId).toBe('negocio');
  expect((await enviar(amb, conta, [pedido])).corpo.aceitas).toEqual([pedido.id]);
  expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.caixaId, cx.id))).toHaveLength(3);
  for (const antigo of antigos) expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, antigo.id))).toEqual([{ ...antigo, caixaId: cx.id, lojaId: conta.lojaId, criadoEm: INICIO }]);
  expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, novo.id))).toEqual([{ ...novo, caixaId: cx.id, lojaId: conta.lojaId, criadoEm: INICIO }]);
  const fechar = mutacao('caixa', { ...cx, movimentos: [], fechamento: { em: INICIO.toISOString(), esperadoCentavos: 100, contadoCentavos: 100 } });
  expect((await enviar(amb, conta, [fechar])).corpo.aceitas).toEqual([fechar.id]);
  const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: conta.token });
  expect(JSON.stringify(pull.corpo)).toContain(antigos[0]!.id);
  expect(JSON.stringify(pull.corpo)).toContain(antigos[1]!.id);
  const final = pull.corpo.mudancas.find((x: { dados: { id: string } }) => x.dados.id === cx.id);
  expect({ ...final.dados, movimentos: [...final.dados.movimentos].sort((a: Movimento, b: Movimento) => a.id.localeCompare(b.id)) })
    .toEqual({ ...fechar.dados, movimentos: [...antigos, novo].sort((a, b) => a.id.localeCompare(b.id)) });
});

it('rejeita duplicatas, divergências e vínculos sem impedir vizinhos ou ACK anterior', async () => {
  const conta = await contaEmTeste(amb);
  const outra = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
  const cx = caixa(conta), m = movimento();
  const inicial = mutacao('caixa', { ...cx, movimentos: [m] });
  expect((await enviar(amb, conta, [inicial])).corpo.aceitas).toEqual([inicial.id]);
  const outro = caixa(outra), externo = movimento();
  expect((await enviar(amb, outra, [mutacao('caixa', { ...outro, movimentos: [externo] })])).corpo.rejeitadas).toEqual([]);
  const nulo = { ...movimento(), motivo: null };
  expect((await enviar(amb, conta, [mutacao('caixa', { ...cx, movimentos: [nulo] })])).corpo.rejeitadas).toEqual([]);
  expect((await enviar(amb, conta, [mutacao('caixa', { ...cx, movimentos: [nulo] })])).corpo.rejeitadas).toEqual([]);
  // Fixture de legado inconsistente: FKs independentes permitem caixa próprio com loja alheia.
  const lojaInconsistente = movimento();
  await amb.db.insert(movimentosCaixa).values({ ...lojaInconsistente, caixaId: cx.id, lojaId: outra.lojaId, criadoEm: INICIO });
  const variacoes = [[m, m], [m, { ...m, motivo: 'Outro' }], [{ ...m, tipo: 'suprimento' as const }], [{ ...m, valorCentavos: 101 }], [{ ...m, motivo: 'Outro' }], [{ ...m, criadoEm: new Date(INICIO.getTime() + 1000).toISOString() }], [externo], [lojaInconsistente], [{ ...nulo, motivo: '' }]];
  for (const movimentos of variacoes) {
    const invalida = mutacao('caixa', { ...cx, movimentos });
    const antes = await snapshot();
    const res = await enviar(amb, conta, [inicial, invalida]);
    expect(res.corpo.aceitas).toEqual([inicial.id]);
    expect(res.corpo.rejeitadas).toEqual([{ id: invalida.id, motivo: 'movimento_invalido' }]);
    expect(await snapshot()).toEqual(antes);
  }
  for (const movimentos of [[m, m], [m, { ...m, motivo: 'Outro' }]]) {
    const novoPai = caixa(conta);
    const invalida = mutacao('caixa', { ...novoPai, movimentos });
    const antes = await snapshot();
    expect((await enviar(amb, conta, [invalida])).corpo.rejeitadas).toEqual([{ id: invalida.id, motivo: 'movimento_invalido' }]);
    expect(await snapshot()).toEqual(antes);
    expect(await amb.db.select().from(caixas).where(eq(caixas.id, novoPai.id))).toEqual([]);
    expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, invalida.id))).toEqual([]);
  }
  const outroCaixa = mutacao('caixa', { ...caixa(conta), movimentos: [m] });
  const produtoVizinho = produto(conta.lojaId);
  const vizinha = mutacao('produto', produtoVizinho);
  const res = await enviar(amb, conta, [outroCaixa, vizinha]);
  expect(res.corpo.rejeitadas).toEqual([{ id: outroCaixa.id, motivo: 'movimento_invalido' }]);
  expect(res.corpo.aceitas).toEqual([vizinha.id]);
  expect(await amb.db.select().from(caixas).where(eq(caixas.id, (outroCaixa.dados as typeof cx).id))).toEqual([]);
  await conferirProduto(produtoVizinho, vizinha, conta);
  const antesRetry = await snapshot();
  expect((await enviar(amb, conta, [vizinha])).corpo.aceitas).toEqual([vizinha.id]);
  expect(await snapshot()).toEqual(antesRetry);
});

it('preserva prioridade de loja, origem e caixa fechado diante de movimentos inválidos', async () => {
  const conta = await contaEmTeste(amb);
  const outra = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
  const cx = caixa(conta), m = movimento();
  expect((await enviar(amb, conta, [mutacao('caixa', cx)])).corpo.rejeitadas).toEqual([]);
  const fechada = caixa(conta);
  expect((await enviar(amb, conta, [mutacao('caixa', { ...fechada, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 100, contadoCentavos: 100 } })])).corpo.rejeitadas).toEqual([]);
  const casos = [
    { dados: { ...cx, lojaId: outra.lojaId, movimentos: [m, m] }, motivo: 'loja_invalida' },
    { dados: { ...cx, aparelhoId: gerarId(), movimentos: [m, m] }, motivo: 'origem_invalida' },
    { dados: { ...cx, operadorId: gerarId(), movimentos: [m, m] }, motivo: 'origem_invalida' },
    { dados: { ...fechada, movimentos: [m, m] }, motivo: 'caixa_fechada' },
  ];
  for (const caso of casos) {
    const pedido = mutacao('caixa', caso.dados);
    const antes = await snapshot();
    expect((await enviar(amb, conta, [pedido])).corpo.rejeitadas).toEqual([{ id: pedido.id, motivo: caso.motivo }]);
    expect(await snapshot()).toEqual(antes);
  }
});

if (process.env.PDV_TEST_POSTGRES_URL) it('reverte o push concorrente e permite progresso no retry', async () => {
  const perdedora = await contaEmTeste(amb);
  const vencedora = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
  const evento = movimento();
  const eventoSemDisputa = movimento('suprimento');
  const cxPerdedora = caixa(perdedora), cxVencedora = caixa(vencedora);
  const produtoVizinho = produto(perdedora.lojaId);
  const vizinha = mutacao('produto', produtoVizinho);
  const conflito = mutacao('caixa', { ...cxPerdedora, movimentos: [eventoSemDisputa, evento] });
  const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const segunda = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
  const iniciarPush = () => segunda.inject({ method: 'POST', url: '/sync/push', headers: { authorization: `Bearer ${perdedora.token}` }, payload: { aparelhoId: perdedora.aparelhoId, mutacoes: [vizinha, conflito] } });
  let pendente: ReturnType<typeof iniciarPush> | undefined;
  try {
    await controle.unsafe(`create function teste_bloqueio_movimento() returns trigger language plpgsql as $$ begin if NEW.loja_id = '${perdedora.lojaId}' then perform pg_advisory_xact_lock(87654321); end if; return NEW; end $$`);
    await controle.unsafe('create trigger teste_bloqueio_movimento before insert on movimentos_caixa for each row execute function teste_bloqueio_movimento()');
    await controle`select pg_advisory_lock(87654321)`;
    const pid = Number((await controle`select pg_backend_pid() as pid`)[0]!.pid);
    pendente = iniciarPush();
    let bloqueado = false;
    for (let i = 0; i < 200 && !bloqueado; i++) {
      bloqueado = (await observador`select pid from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid)) and wait_event = 'advisory'`).length > 0;
      if (!bloqueado) await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(bloqueado).toBe(true);
    const vencedor = mutacao('caixa', { ...cxVencedora, movimentos: [evento] });
    expect((await enviar(amb, vencedora, [vencedor])).corpo.aceitas).toEqual([vencedor.id]);
    const eventoPersistido = [{ ...evento, caixaId: cxVencedora.id, lojaId: vencedora.lojaId, criadoEm: INICIO }];
    expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, evento.id))).toEqual(eventoPersistido);
    const antes = await snapshot();
    await controle`select pg_advisory_unlock(87654321)`;
    const resposta = await pendente;
    expect(resposta.statusCode).toBe(409);
    expect(resposta.json()).toEqual({ erro: 'conflito_movimento', mensagem: 'Movimento de caixa alterado durante a sincronização. Tente novamente.' });
    expect(await snapshot()).toEqual(antes);
    expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, eventoSemDisputa.id))).toEqual([]);
    expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, evento.id))).toEqual(eventoPersistido);
    const retry = await enviar(amb, perdedora, [vizinha, conflito]);
    expect(retry.corpo.aceitas).toEqual([vizinha.id]);
    expect(retry.corpo.rejeitadas).toEqual([{ id: conflito.id, motivo: 'movimento_invalido' }]);
    expect(await amb.db.select().from(caixas).where(eq(caixas.id, cxPerdedora.id))).toEqual([]);
    expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, conflito.id))).toEqual([]);
    await conferirProduto(produtoVizinho, vizinha, perdedora);
    expect(await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, evento.id))).toEqual(eventoPersistido);
    const depoisRetry = await snapshot();
    expect((await enviar(amb, perdedora, [vizinha, conflito])).corpo).toMatchObject({ aceitas: [vizinha.id], rejeitadas: [{ id: conflito.id, motivo: 'movimento_invalido' }] });
    expect(await snapshot()).toEqual(depoisRetry);
  } finally {
    await controle`select pg_advisory_unlock(87654321)`.catch(() => undefined);
    await pendente?.catch(() => undefined);
    await controle.unsafe('drop trigger if exists teste_bloqueio_movimento on movimentos_caixa');
    await controle.unsafe('drop function if exists teste_bloqueio_movimento()');
    await segunda.close();
    await controle.end();
    await observador.end();
  }
});
