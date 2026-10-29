import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { gerarId, type Mutacao, type Venda } from '@pdv/shared';
import { asc, eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, INICIO, mutacao, venda, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
const mutacaoVenda = (v: Venda) => mutacao('venda', v) as Extract<Mutacao, { entidade: 'venda'; operacao: 'upsert' }>;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(() => banco.fechar());
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(() => amb.fechar());

async function snapshot() {
  return {
    vendas: await amb.db.select().from(schema.vendas).orderBy(asc(schema.vendas.id)),
    itens: await amb.db.select().from(schema.itensVenda).orderBy(asc(schema.itensVenda.id)),
    pagamentos: await amb.db.select().from(schema.pagamentosVenda).orderBy(asc(schema.pagamentosVenda.id)),
    mudancas: await amb.db.select().from(schema.mudancas).orderBy(asc(schema.mudancas.seq)),
    acks: await amb.db.select().from(schema.mutacoesAplicadas).orderBy(asc(schema.mutacoesAplicadas.id)),
    caixas: await amb.db.select().from(schema.caixas).orderBy(asc(schema.caixas.id)),
    movimentos: await amb.db.select().from(schema.movimentosCaixa).orderBy(asc(schema.movimentosCaixa.id)),
  };
}

describe('validação de venda no push', () => {
  it('rejeita sem escrita, aceita vizinhas e permite corrigir e retentar o mesmo ID', async () => {
    const conta = await contaEmTeste(amb);
    const caixa = { id: gerarId(), lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, operadorId: conta.operadorId,
      abertura: { em: INICIO.toISOString(), trocoInicialCentavos: 5000 }, fechamento: null,
      movimentos: [{ id: gerarId(), tipo: 'sangria' as const, valorCentavos: 1000, motivo: 'Cofre', criadoEm: INICIO.toISOString() }] };
    const mc = mutacao('caixa', caixa);
    expect((await enviar(amb, conta, [mc])).corpo.aceitas).toEqual([mc.id]);
    const anterior = venda(conta);
    const ma = mutacao('venda', anterior);
    await enviar(amb, conta, [ma]);
    const antes = await snapshot();
    const ruim = venda(conta, { totalCentavos: 701 });
    const rejeitada = mutacaoVenda(ruim);
    const resposta = await enviar(amb, conta, [rejeitada]);
    expect(resposta.status).toBe(200);
    expect(resposta.corpo.rejeitadas).toEqual([{ id: rejeitada.id, motivo: 'venda_inconsistente' }]);
    expect(await snapshot()).toEqual(antes);

    const a = mutacaoVenda(venda(conta));
    const b = mutacaoVenda(venda(conta));
    const lote = await enviar(amb, conta, [a, rejeitada, b]);
    expect(lote.corpo.aceitas).toEqual([a.id, b.id]);
    expect(lote.corpo.rejeitadas).toEqual([{ id: rejeitada.id, motivo: 'venda_inconsistente' }]);
    const corrigida = { ...rejeitada, dados: { ...ruim, totalCentavos: 700 } };
    const retry = await enviar(amb, conta, [corrigida]);
    expect(retry.corpo.aceitas).toEqual([rejeitada.id]);
    const final = await snapshot();
    expect(final.vendas.map(v => v.id)).toEqual([anterior.id, a.dados.id, b.dados.id, ruim.id].sort());
    expect(final.itens.map(i => i.id)).toEqual([ ...anterior.itens, ...a.dados.itens, ...b.dados.itens, ...ruim.itens ].map(i => i.id).sort());
    expect(final.pagamentos.map(p => p.id)).toEqual([anterior.pagamentos[0]!.id, a.dados.pagamentos[0]!.id, b.dados.pagamentos[0]!.id, ruim.pagamentos[0]!.id].sort());
    expect(final.acks.map(x => x.id)).toEqual([mc.id, ma.id, a.id, b.id, rejeitada.id].sort());
    expect(final.mudancas.map(x => [x.entidade, x.entidadeId])).toEqual([['caixa', caixa.id], ...[anterior.id, a.dados.id, b.dados.id, ruim.id].map(id => ['venda', id])]);
    const aceitas = [anterior, a.dados, b.dados, corrigida.dados];
    const porId = <T extends { id: string }>(xs: T[]) => xs.sort((x, y) => x.id.localeCompare(y.id));
    expect(final.vendas).toEqual(porId(aceitas.map(x => ({ id: x.id, lojaId: x.lojaId, aparelhoId: x.aparelhoId, operadorId: x.operadorId, totalCentavos: x.totalCentavos, status: x.status, criadoEm: INICIO, atualizadoEm: INICIO, excluidoEm: null, versao: 1 }))));
    expect(final.itens).toEqual(porId(aceitas.flatMap(x => x.itens.map((i, posicao) => ({ ...i, vendaId: x.id, lojaId: x.lojaId, posicao, criadoEm: INICIO })))));
    expect(final.pagamentos).toEqual(porId(aceitas.flatMap(x => x.pagamentos.map((p, posicao) => ({ ...p, vendaId: x.id, lojaId: x.lojaId, posicao, criadoEm: INICIO })))));
    expect(final.acks).toEqual(porId([mc.id, ma.id, a.id, b.id, rejeitada.id].map(id => ({ id, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: INICIO }))));
    expect(final.mudancas).toEqual([['caixa', caixa.id], ...aceitas.map(x => ['venda', x.id])].map(([entidade, entidadeId], i) => ({ seq: i + 1, lojaId: conta.lojaId, entidade, entidadeId, criadoEm: INICIO })));
    expect((await enviar(amb, conta, [corrigida])).corpo.aceitas).toEqual([rejeitada.id]);
    expect(await snapshot()).toEqual(final);
    const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: conta.token });
    expect(pull.status).toBe(200);
    expect(pull.corpo.mudancas).toEqual([
      { entidade: 'caixa', operacao: 'upsert', dados: caixa },
      ...[anterior, a.dados, b.dados, corrigida.dados].map(dados => ({ entidade: 'venda', operacao: 'upsert', dados })),
    ]);
    expect(final.caixas).toEqual(antes.caixas);
    expect(final.movimentos).toEqual(antes.movimentos);
  });

  it('preserva história e compara todos os campos, ordem e origem antes de cancelar', async () => {
    const conta = await contaEmTeste(amb);
    const v = venda(conta);
    const m = mutacao('venda', v);
    await enviar(amb, conta, [m]);
    const antes = await snapshot();
    const variantes: Venda[] = [
      { ...v, aparelhoId: gerarId() }, { ...v, operadorId: gerarId() }, { ...v, totalCentavos: 701 },
      ...(['id', 'produtoId', 'descricao', 'precoUnitarioCentavos', 'quantidadeMilesimos', 'totalCentavos'] as const).map(campo => ({ ...v, itens: [{ ...v.itens[0]!, [campo]: campo === 'id' || campo === 'produtoId' ? gerarId() : campo === 'descricao' ? 'Outro' : 1 }, v.itens[1]!] })),
      { ...v, itens: [...v.itens].reverse() },
      ...(['id', 'meio', 'provedor', 'valorCentavos', 'trocoCentavos'] as const).map(campo => ({ ...v, pagamentos: [{ ...v.pagamentos[0]!, [campo]: campo === 'id' ? gerarId() : campo === 'meio' ? 'pix' : campo === 'provedor' ? 'infinitepay' : 1 }] } as Venda)),
    ];
    for (const variante of variantes) {
      const alteracao = mutacao('venda', { ...variante, status: 'cancelada' });
      const res = await enviar(amb, conta, [alteracao]);
      expect(res.corpo.rejeitadas).toEqual([{ id: alteracao.id, motivo: 'venda_imutavel' }]);
      expect(await snapshot()).toEqual(antes);
    }
    const replay = mutacao('venda', { ...v, criadaEm: '2020-01-01T00:00:00.000Z' });
    expect((await enviar(amb, conta, [replay])).corpo.aceitas).toEqual([replay.id]);
    expect((await snapshot()).vendas[0]!.criadoEm).toEqual(antes.vendas[0]!.criadoEm);
    const cancelamento = mutacao('venda', { ...v, status: 'cancelada' });
    expect((await enviar(amb, conta, [cancelamento])).corpo.aceitas).toEqual([cancelamento.id]);
    const reabertura = mutacao('venda', v);
    expect((await enviar(amb, conta, [reabertura])).corpo.rejeitadas).toEqual([{ id: reabertura.id, motivo: 'venda_imutavel' }]);
  });

  it('rejeita alterações em ambas as pontas das listas com status igual ou cancelamento', async () => {
    const conta = await contaEmTeste(amb);
    const original = venda(conta);
    const v: Venda = { ...original, pagamentos: [
      { ...original.pagamentos[0]!, valorCentavos: 200, trocoCentavos: 0 },
      { id: gerarId(), meio: 'pix', provedor: null, valorCentavos: 500, trocoCentavos: 0 },
    ] };
    const inicial = mutacao('venda', v);
    expect((await enviar(amb, conta, [inicial])).corpo.aceitas).toEqual([inicial.id]);
    const variantes: Venda[] = [
      { ...v, aparelhoId: gerarId() }, { ...v, operadorId: gerarId() }, { ...v, totalCentavos: 701 },
      { ...v, itens: [...v.itens].reverse() }, { ...v, pagamentos: [...v.pagamentos].reverse() },
      { ...v, itens: v.itens.slice(0, 1) }, { ...v, itens: [...v.itens, { ...v.itens[0]!, id: gerarId() }] },
      { ...v, pagamentos: v.pagamentos.slice(0, 1) }, { ...v, pagamentos: [...v.pagamentos, { ...v.pagamentos[0]!, id: gerarId() }] },
    ];
    for (const indice of [0, 1]) {
      for (const campo of ['id', 'produtoId', 'descricao', 'precoUnitarioCentavos', 'quantidadeMilesimos', 'totalCentavos'] as const) {
        const itens = v.itens.map((item, i) => i !== indice ? item : { ...item, [campo]: campo === 'id' || campo === 'produtoId' ? gerarId() : campo === 'descricao' ? 'Alterado' : item[campo] + 1 });
        variantes.push({ ...v, itens });
      }
      for (const campo of ['id', 'meio', 'provedor', 'valorCentavos', 'trocoCentavos'] as const) {
        const pagamentos = v.pagamentos.map((p, i) => i !== indice ? p : { ...p, [campo]: campo === 'id' ? gerarId() : campo === 'meio' ? (p.meio === 'pix' ? 'dinheiro' : 'pix') : campo === 'provedor' ? 'infinitepay' : p[campo] + 1 });
        variantes.push({ ...v, pagamentos });
      }
    }
    const verificar = async (status: Venda['status']) => {
      const antes = await snapshot();
      for (const variante of variantes) {
        const alteracao = mutacao('venda', { ...variante, status });
        const res = await enviar(amb, conta, [alteracao]);
        expect(res.status).toBe(200);
        expect(res.corpo.rejeitadas).toEqual([{ id: alteracao.id, motivo: 'venda_imutavel' }]);
        expect(await snapshot()).toEqual(antes);
      }
    };
    await verificar('concluida');
    await verificar('cancelada');
    const replay = mutacao('venda', v);
    expect((await enviar(amb, conta, [replay])).corpo.aceitas).toEqual([replay.id]);
    const cancelar = mutacao('venda', { ...v, status: 'cancelada' });
    expect((await enviar(amb, conta, [cancelar])).corpo.aceitas).toEqual([cancelar.id]);
    await verificar('cancelada');
    const replayCancelado = mutacao('venda', { ...v, status: 'cancelada' });
    expect((await enviar(amb, conta, [replayCancelado])).corpo.aceitas).toEqual([replayCancelado.id]);
  });

  it('aceita parcelas líquidas e gratuidade, rejeita duplicatas e somas incorretas', async () => {
    const conta = await contaEmTeste(amb);
    const v = venda(conta);
    const base: Venda = { ...v, itens: [{ ...v.itens[0]!, precoUnitarioCentavos: 1000, quantidadeMilesimos: 2000, totalCentavos: 2000 }, { ...v.itens[1]!, precoUnitarioCentavos: 500, quantidadeMilesimos: 1000, totalCentavos: 500 }], totalCentavos: 2500,
      pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: 1000, trocoCentavos: 500 }, { id: gerarId(), meio: 'pix', provedor: null, valorCentavos: 1500, trocoCentavos: 0 }] };
    const boa = mutacao('venda', base);
    expect((await enviar(amb, conta, [boa])).corpo.aceitas).toEqual([boa.id]);
    const antes = await snapshot();
    const ordem = mutacao('venda', { ...base, pagamentos: [...base.pagamentos].reverse(), status: 'cancelada' });
    expect((await enviar(amb, conta, [ordem])).corpo.rejeitadas).toEqual([{ id: ordem.id, motivo: 'venda_imutavel' }]);
    expect(await snapshot()).toEqual(antes);
    for (const alterada of [
      { ...base, totalCentavos: 2499, pagamentos: [{ ...base.pagamentos[0]!, valorCentavos: 2499, trocoCentavos: 0 }] },
      { ...base, pagamentos: [base.pagamentos[0]!, { ...base.pagamentos[1]!, valorCentavos: 1499 }] },
      { ...base, pagamentos: [base.pagamentos[0]!, { ...base.pagamentos[1]!, valorCentavos: 1501 }] },
      { ...base, itens: [{ ...base.itens[0]!, precoUnitarioCentavos: 1250, quantidadeMilesimos: 1000, totalCentavos: 1250 }, { ...base.itens[0]!, precoUnitarioCentavos: 1250, quantidadeMilesimos: 1000, totalCentavos: 1250 }] },
      { ...base, pagamentos: [{ ...base.pagamentos[0]!, valorCentavos: 1250, trocoCentavos: 0 }, { ...base.pagamentos[0]!, valorCentavos: 1250, trocoCentavos: 0 }] },
    ]) {
      const m = mutacao('venda', { ...alterada, id: gerarId() });
      expect((await enviar(amb, conta, [m])).corpo.rejeitadas).toEqual([{ id: m.id, motivo: 'venda_inconsistente' }]);
      expect(await snapshot()).toEqual(antes);
    }
    const gratis = mutacao('venda', { ...base, id: gerarId(), itens: [{ ...base.itens[0]!, id: gerarId(), precoUnitarioCentavos: 0, totalCentavos: 0 }], pagamentos: [], totalCentavos: 0 });
    expect((await enviar(amb, conta, [gratis])).corpo.aceitas).toEqual([gratis.id]);
  });

  it('reenvia e cancela legado inconsistente e mantém bypass de ACK', async () => {
    const conta = await contaEmTeste(amb);
    const v = venda(conta);
    const original = mutacaoVenda(v);
    await enviar(amb, conta, [original]);
    await amb.db.update(schema.pagamentosVenda).set({ valorCentavos: 1000 }).where(eq(schema.pagamentosVenda.id, v.pagamentos[0]!.id));
    const legado = { ...v, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: 1000 }] };
    const antes = await snapshot();
    const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: conta.token });
    expect(pull.corpo.mudancas).toEqual([{ entidade: 'venda', operacao: 'upsert', dados: legado }]);
    expect((await enviar(amb, conta, [{ ...original, dados: { ...v, totalCentavos: 1 } }])).corpo.aceitas).toEqual([original.id]);
    expect(await snapshot()).toEqual(antes);
    const replay = mutacao('venda', legado);
    expect((await enviar(amb, conta, [replay])).corpo.aceitas).toEqual([replay.id]);
    const cancelar = mutacao('venda', { ...legado, status: 'cancelada' });
    expect((await enviar(amb, conta, [cancelar])).corpo.aceitas).toEqual([cancelar.id]);
    const depois = await snapshot();
    expect(depois.pagamentos).toEqual(antes.pagamentos);
    expect(depois.itens).toEqual(antes.itens);
    expect(depois.vendas[0]).toMatchObject({ id: v.id, totalCentavos: 700, status: 'cancelada', criadoEm: antes.vendas[0]!.criadoEm });
  });

  it('rejeita valores inválidos no schema sem gravar', async () => {
    const conta = await contaEmTeste(amb);
    const v = venda(conta);
    const antes = await snapshot();
    for (const campo of [
      { ...v, itens: [{ ...v.itens[0]!, precoUnitarioCentavos: -1 }] },
      { ...v, itens: [{ ...v.itens[0]!, quantidadeMilesimos: 0 }] },
      { ...v, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: 0.5 }] },
      { ...v, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: Number.MAX_SAFE_INTEGER + 1 }] },
    ]) {
      expect((await chamar(amb, 'POST', '/sync/push', { token: conta.token, corpo: { aparelhoId: conta.aparelhoId, mutacoes: [mutacao('venda', campo)] } })).status).toBe(400);
      expect(await snapshot()).toEqual(antes);
    }
  });
});
