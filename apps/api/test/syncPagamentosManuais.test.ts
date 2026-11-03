import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { gerarId, type Mutacao, type Venda } from '@pdv/shared';
import { asc } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, contaEmTeste, criarAmbiente, criarConta, enviar as enviarOriginal, INICIO, mutacao, venda, type Ambiente } from './ajuda';

let banco: Conexao;
const mv = (v: Venda) => mutacao('venda', v) as Extract<Mutacao, { entidade: 'venda'; operacao: 'upsert' }>;
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
  return {
    vendas: await amb.db.select().from(schema.vendas).orderBy(asc(schema.vendas.id)),
    itens: await amb.db.select().from(schema.itensVenda).orderBy(asc(schema.itensVenda.id)),
    pagamentos: await amb.db.select().from(schema.pagamentosVenda).orderBy(asc(schema.pagamentosVenda.id)),
    mudancas: await amb.db.select().from(schema.mudancas).orderBy(asc(schema.mudancas.seq)),
    acks: await amb.db.select().from(schema.mutacoesAplicadas).orderBy(asc(schema.mutacoesAplicadas.id)),
  };
}
const porId = <T extends { id: string }>(xs: T[]) => xs.sort((a, b) => a.id.localeCompare(b.id));
function esperado(vs: Venda[], ids: string[], conta: { lojaId: string; aparelhoId: string }) {
  return {
    vendas: porId(vs.map(v => ({ id: v.id, lojaId: v.lojaId, aparelhoId: v.aparelhoId, operadorId: v.operadorId, caixaId: null, cancelamento: null, totalCentavos: v.totalCentavos, status: v.status, criadoEm: new Date(v.criadaEm), atualizadoEm: INICIO, excluidoEm: null, versao: 1 }))),
    itens: porId(vs.flatMap(v => v.itens.map((i, posicao) => ({ ...i, controlaEstoque: null, vendaId: v.id, lojaId: v.lojaId, posicao, criadoEm: new Date(v.criadaEm) })))),
    pagamentos: porId(vs.flatMap(v => v.pagamentos.map((p, posicao) => ({ ...p, vendaId: v.id, lojaId: v.lojaId, posicao, criadoEm: new Date(v.criadaEm) })))),
    mudancas: vs.map((v, i) => ({ seq: i + 1, lojaId: v.lojaId, entidade: 'venda', entidadeId: v.id, criadoEm: INICIO })),
    acks: porId(ids.map(id => ({ id, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: INICIO }))),
  };
}

for (const plano of ['essencial', 'negocio', 'pro'] as const) {
  it(`rejeita todas as combinações indisponíveis e aceita manuais em ${plano}`, async () => {
    const conta = await contaEmTeste(amb, plano);
    const meios = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'tap'] as const;
    const bloqueadas = meios.flatMap(meio => (meio === 'tap' ? [null, 'infinitepay', 'mercadopago'] as const : ['infinitepay', 'mercadopago'] as const).map(provedor => {
      const v = venda(conta);
      return mv({ ...v, criadaEm: new Date(INICIO.getTime() - 3_600_000).toISOString(), integracaoAtiva: true, planoId: 'pro',
        pagamentos: [{ ...v.pagamentos[0]!, meio, provedor, trocoCentavos: meio === 'dinheiro' ? 300 : 0 }] } as Venda);
    }));
    const base = venda(conta);
    const dividido = mv({ ...base, pagamentos: [{ ...base.pagamentos[0]!, valorCentavos: 200, trocoCentavos: 0 }, { id: gerarId(), meio: 'pix' as const, provedor: 'infinitepay' as const, valorCentavos: 500, trocoCentavos: 0 }] });
    const rejeitadas = [...bloqueadas, dividido];
    const antes = await snapshot();
    const res = await enviar(amb, conta, rejeitadas);
    expect(res.corpo.aceitas).toEqual([]);
    expect(res.corpo.rejeitadas).toEqual(rejeitadas.map(m => ({ id: m.id, motivo: 'pagamento_indisponivel' })));
    expect(await snapshot()).toEqual(antes);
    const manuais = meios.slice(0, 4).map(meio => { const v = venda(conta); return mv({ ...v, pagamentos: [{ ...v.pagamentos[0]!, meio, trocoCentavos: meio === 'dinheiro' ? 300 : 0 }] }); });
    const split = venda(conta);
    const ms = mv({ ...split, pagamentos: [{ ...split.pagamentos[0]!, valorCentavos: 200, trocoCentavos: 0 }, { id: gerarId(), meio: 'pix' as const, provedor: null, valorCentavos: 500, trocoCentavos: 0 }] });
    const corrigidas = rejeitadas.map(m => ({ ...m, dados: { ...m.dados, pagamentos: m.dados.pagamentos.map(p => ({ ...p, meio: p.meio === 'tap' ? 'cartao_credito' as const : p.meio, provedor: null })) } }));
    const vizinhos = [...manuais, ms];
    const misto = await enviar(amb, conta, [vizinhos[0]!, dividido, ...vizinhos.slice(1)]);
    expect(misto.corpo.aceitas).toEqual(vizinhos.map(m => m.id));
    expect(misto.corpo.rejeitadas).toEqual([{ id: dividido.id, motivo: 'pagamento_indisponivel' }]);
    const aposVizinhos = esperado(vizinhos.map(m => m.dados), vizinhos.map(m => m.id), conta);
    expect(await snapshot()).toEqual(aposVizinhos);
    expect((await enviar(amb, conta, [vizinhos[0]!, dividido, ...vizinhos.slice(1)])).corpo.rejeitadas).toEqual([{ id: dividido.id, motivo: 'pagamento_indisponivel' }]);
    expect(await snapshot()).toEqual(aposVizinhos);
    const lote = [...vizinhos, ...corrigidas];
    const resposta = await enviar(amb, conta, corrigidas);
    expect(resposta.corpo.aceitas).toEqual(corrigidas.map(m => m.id));
    expect(resposta.corpo.rejeitadas).toEqual([]);
    const final = esperado(lote.map(m => m.dados), lote.map(m => m.id), conta);
    expect(await snapshot()).toEqual(final);
    expect((await enviar(amb, conta, lote)).corpo.aceitas).toEqual(lote.map(m => m.id));
    expect(await snapshot()).toEqual(final);
  });
}

it('preserva histórico integrado, imutabilidade e ACK anterior', async () => {
  const conta = await contaEmTeste(amb);
  const base = venda(conta);
  const legado: Venda = { ...base, pagamentos: [{ ...base.pagamentos[0]!, meio: 'tap', provedor: 'mercadopago', trocoCentavos: 0 }] };
  // Precondição SQL de histórico confirmado; não representa cobrança real.
  await amb.db.insert(schema.vendas).values({ id: legado.id, lojaId: legado.lojaId, aparelhoId: legado.aparelhoId, operadorId: legado.operadorId, totalCentavos: legado.totalCentavos, status: legado.status, criadoEm: INICIO, atualizadoEm: INICIO, versao: 1 });
  await amb.db.insert(schema.itensVenda).values(legado.itens.map((i, posicao) => ({ ...i, vendaId: legado.id, lojaId: legado.lojaId, posicao, criadoEm: INICIO })));
  await amb.db.insert(schema.pagamentosVenda).values(legado.pagamentos.map((p, posicao) => ({ ...p, vendaId: legado.id, lojaId: legado.lojaId, posicao, criadoEm: INICIO })));
  const ack = mv(legado);
  await amb.db.insert(schema.mutacoesAplicadas).values({ id: ack.id, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: INICIO });
  const antes = await snapshot();
  expect((await enviar(amb, conta, [{ ...ack, dados: { ...legado, totalCentavos: 1 } }])).corpo.aceitas).toEqual([ack.id]);
  expect(await snapshot()).toEqual(antes);
  const alterada = mv({ ...legado, pagamentos: [{ ...legado.pagamentos[0]!, provedor: null }] });
  expect((await enviar(amb, conta, [alterada])).corpo.rejeitadas).toEqual([{ id: alterada.id, motivo: 'venda_imutavel' }]);
  expect(await snapshot()).toEqual(antes);
  const replay = mv({ ...legado, criadaEm: '2020-01-01T00:00:00.000Z' });
  const cancelamento = mv({ ...legado, status: 'cancelada' });
  expect((await enviar(amb, conta, [replay, cancelamento])).corpo.aceitas).toEqual([replay.id, cancelamento.id]);
  const depois = await snapshot();
  expect(depois.itens).toEqual(antes.itens);
  expect(depois.pagamentos).toEqual(antes.pagamentos);
  expect(depois.vendas).toEqual([{ ...antes.vendas[0]!, status: 'cancelada', versao: 2, cancelamento: { id: expect.any(String), em: INICIO.toISOString(), operadorId: conta.operadorId, motivo: 'Cancelamento solicitado pelo operador', estorno: 'nao_realizado' } }]);
  expect(depois.mudancas).toEqual([{ seq: 1, lojaId: conta.lojaId, entidade: 'venda', entidadeId: legado.id, criadoEm: INICIO }]);
  expect(depois.acks).toEqual(porId([ack.id, replay.id, cancelamento.id].map(id => ({ id, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: INICIO }))));
});

it('prioriza licença ausente sobre pagamento indisponível', async () => {
  const conta = await criarConta(amb);
  const v = venda(conta);
  const m = mv({ ...v, pagamentos: [{ ...v.pagamentos[0]!, meio: 'tap', trocoCentavos: 0 }] });
  const antes = await snapshot();
  const res = await enviar(amb, conta, [m]);
  expect(res.corpo.aceitas).toEqual([]);
  expect(res.corpo.rejeitadas).toEqual([{ id: m.id, motivo: 'assinatura_suspensa' }]);
  expect(await snapshot()).toEqual(antes);
});

it('preserva prioridades anteriores ao corte sem escrita', async () => {
  const conta = await contaEmTeste(amb);
  const outra = await criarConta(amb);
  const v = venda(conta);
  const indisponivel: Venda = { ...v, pagamentos: [{ ...v.pagamentos[0]!, meio: 'tap', trocoCentavos: 0 }] };
  const casos = [
    [mv({ ...indisponivel, lojaId: outra.lojaId }), 'loja_invalida'],
    [mv({ ...indisponivel, aparelhoId: gerarId() }), 'origem_invalida'],
    [mv({ ...indisponivel, operadorId: gerarId() }), 'origem_invalida'],
    [mv({ ...indisponivel, criadaEm: '2020-01-01T00:00:00.000Z' }), 'venda_fora_da_janela_offline'],
    [mv({ ...indisponivel, totalCentavos: 701 }), 'venda_inconsistente'],
  ] as const;
  const antes = await snapshot();
  const res = await enviar(amb, conta, casos.map(([m]) => m));
  expect(res.corpo.aceitas).toEqual([]);
  expect(res.corpo.rejeitadas).toEqual(casos.map(([m, motivo]) => ({ id: m.id, motivo })));
  expect(await snapshot()).toEqual(antes);
});
