import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { gerarId } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import { caixas, movimentosCaixa, vendas, itensVenda, pagamentosVenda, mudancas, mutacoesAplicadas } from '../src/db/schema';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, criarConta, enviar, INICIO, mutacao, venda, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

function caixa(c: { lojaId: string; aparelhoId: string; operadorId: string }) {
  return { id: gerarId(), ...c, abertura: { em: INICIO.toISOString(), trocoInicialCentavos: 100 }, fechamento: null, movimentos: [] };
}
const snapshot = () => Promise.all([caixas, movimentosCaixa, vendas, itensVenda, pagamentosVenda, mudancas, mutacoesAplicadas].map(t => amb.db.select().from(t)));

it('aplica caixa após venda no lote e conserva vínculo e fechamento no pull', async () => {
  const c = await contaEmTeste(amb);
  const cx = caixa(c);
  const v = venda(c, { caixaId: cx.id });
  const mv = mutacao('venda', v), mc = mutacao('caixa', cx);
  expect((await enviar(amb, c, [mv, mc])).corpo.aceitas).toEqual([mv.id, mc.id]);
  const fechado = { ...cx, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 800, contadoCentavos: 800 } };
  expect((await enviar(amb, c, [mutacao('caixa', fechado)])).corpo.rejeitadas).toEqual([]);
  expect((await enviar(amb, c, [mutacao('caixa', fechado)])).corpo.rejeitadas).toEqual([]);
  expect((await enviar(amb, c, [mutacao('caixa', cx)])).corpo.rejeitadas[0].motivo).toBe('caixa_fechada');
  expect((await enviar(amb, c, [mutacao('venda', { ...v, caixaId: null })])).corpo.rejeitadas[0].motivo).toBe('venda_imutavel');
  const evento = { id: gerarId(), em: INICIO.toISOString(), operadorId: c.operadorId, motivo: 'Erro', estorno: 'nao_realizado' as const };
  expect((await enviar(amb, c, [mutacao('venda', { ...v, cancelamento: evento })])).corpo.rejeitadas[0].motivo).toBe('venda_imutavel');
  const cancelada = { ...v, status: 'cancelada' as const, cancelamento: evento };
  expect((await enviar(amb, c, [mutacao('venda', cancelada)])).corpo.rejeitadas).toEqual([]);
  const reordenado = { estorno: evento.estorno, motivo: evento.motivo, operadorId: evento.operadorId, em: evento.em, id: evento.id };
  const antesReplay = await snapshot();
  const replay = mutacao('venda', { ...cancelada, cancelamento: reordenado });
  expect((await enviar(amb, c, [replay])).corpo.rejeitadas).toEqual([]);
  const depoisReplay = await snapshot();
  expect(depoisReplay.slice(0, 6)).toEqual(antesReplay.slice(0, 6));
  expect(depoisReplay[6]).toEqual(expect.arrayContaining([...antesReplay[6]!, expect.objectContaining({ id: replay.id })]));
  expect(depoisReplay[6]).toHaveLength(antesReplay[6]!.length + 1);
  const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: c.token });
  expect(pull.corpo.mudancas).toEqual(expect.arrayContaining([expect.objectContaining({ entidade: 'venda', dados: expect.objectContaining({ caixaId: cx.id, cancelamento: evento }) }), expect.objectContaining({ entidade: 'caixa', dados: expect.objectContaining({ fechamento: fechado.fechamento }) })]));
});

it('rejeita caixa de outra origem da mesma loja sem qualquer escrita', async () => {
  const c = await contaEmTeste(amb);
  // Fixture de origem histórica: o caixa pertence à mesma loja e a outro aparelho.
  const cx = caixa({ lojaId: c.lojaId, aparelhoId: gerarId(), operadorId: c.operadorId });
  await amb.db.insert(caixas).values({ id: cx.id, lojaId: cx.lojaId, aparelhoId: cx.aparelhoId, operadorId: cx.operadorId, abertoEm: INICIO, trocoInicialCentavos: 100, criadoEm: INICIO, atualizadoEm: INICIO, versao: 1 });
  const antes = await snapshot();
  const m = mutacao('venda', venda(c, { caixaId: cx.id }));
  expect((await enviar(amb, c, [m])).corpo.rejeitadas).toEqual([{ id: m.id, motivo: 'caixa_invalido' }]);
  expect(await snapshot()).toEqual(antes);
});

it('rejeita venda depois do fechamento sem escrita e mantém caixas simultâneos separados no pull', async () => {
  const c = await contaEmTeste(amb), a = caixa(c), b = caixa(c);
  const fim = { em: INICIO.toISOString(), esperadoCentavos: 800, contadoCentavos: 800 };
  const va = venda(c, { caixaId: a.id }), vb = venda(c, { caixaId: b.id });
  const lote = [mutacao('venda', va), mutacao('venda', vb), mutacao('caixa', { ...a, fechamento: fim }), mutacao('caixa', { ...b, fechamento: fim })];
  expect((await enviar(amb, c, lote)).corpo.aceitas).toEqual(lote.map(m => m.id));
  amb.relogio.avancarHoras(1);
  const posterior = venda(c, { caixaId: a.id, criadaEm: new Date(INICIO.getTime() + 1000).toISOString() });
  const antes = await snapshot();
  const m = mutacao('venda', posterior);
  expect((await enviar(amb, c, [m])).corpo.rejeitadas).toEqual([{ id: m.id, motivo: 'caixa_invalido' }]);
  expect(await snapshot()).toEqual(antes);
  const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: c.token });
  expect(pull.corpo.mudancas).toEqual(expect.arrayContaining([
    expect.objectContaining({ entidade: 'venda', dados: expect.objectContaining({ id: va.id, caixaId: a.id }) }),
    expect.objectContaining({ entidade: 'venda', dados: expect.objectContaining({ id: vb.id, caixaId: b.id }) }),
  ]));
});

it('rejeita caixa ausente ou de outra loja sem escrita parcial', async () => {
  const c = await contaEmTeste(amb), outra = await criarConta(amb);
  const cx = caixa(outra);
  await enviar(amb, outra, [mutacao('caixa', cx)]);
  for (const caixaId of [gerarId(), cx.id]) {
    const v = venda(c, { caixaId });
    const antes = await Promise.all([vendas, itensVenda, pagamentosVenda, mudancas, mutacoesAplicadas].map(t => amb.db.select().from(t)));
    const res = await enviar(amb, c, [mutacao('venda', v)]);
    expect(res.corpo.rejeitadas[0].motivo).toBe('caixa_invalido');
    expect(await Promise.all([vendas, itensVenda, pagamentosVenda, mudancas, mutacoesAplicadas].map(t => amb.db.select().from(t)))).toEqual(antes);
  }
});

it('audita cancelamento legado uma vez e rejeita adulteração', async () => {
  const c = await contaEmTeste(amb), v = venda(c);
  await enviar(amb, c, [mutacao('venda', v)]);
  const cancelada = { ...v, status: 'cancelada' as const };
  const evento = { id: gerarId(), em: new Date(INICIO.getTime() - 1000).toISOString(), operadorId: c.operadorId, motivo: 'Erro', estorno: 'nao_realizado' as const };
  expect((await enviar(amb, c, [mutacao('venda', { ...cancelada, cancelamento: evento })])).corpo.rejeitadas[0].motivo).toBe('cancelamento_invalido');
  expect((await enviar(amb, c, [mutacao('venda', cancelada)])).corpo.rejeitadas).toEqual([]);
  const [salva] = await amb.db.select().from(vendas).where(eq(vendas.id, v.id));
  if (!salva) throw new Error('Venda não encontrada');
  expect(salva.cancelamento).toMatchObject({ operadorId: c.operadorId, estorno: 'nao_realizado', motivo: 'Cancelamento solicitado pelo operador' });
  expect((await enviar(amb, c, [mutacao('venda', cancelada)])).corpo.rejeitadas).toEqual([]);
  expect((await enviar(amb, c, [mutacao('venda', { ...cancelada, cancelamento: { ...salva.cancelamento!, motivo: 'alterado' } })])).corpo.rejeitadas[0].motivo).toBe('venda_imutavel');
  const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: c.token });
  expect(pull.corpo.mudancas[0].dados.cancelamento).toEqual(salva.cancelamento);
});

it('preserva abertura e aceita venda offline apenas no intervalo do caixa', async () => {
  const c = await contaEmTeste(amb), cx = caixa(c);
  const futuro = new Date(INICIO.getTime() + 1000).toISOString();
  expect((await enviar(amb, c, [mutacao('caixa', { ...cx, abertura: { ...cx.abertura, em: futuro } })])).corpo.rejeitadas[0].motivo).toBe('caixa_invalido');
  expect((await enviar(amb, c, [mutacao('caixa', { ...cx, fechamento: { em: new Date(INICIO.getTime() - 1000).toISOString(), esperadoCentavos: 100, contadoCentavos: 100 } })])).corpo.rejeitadas[0].motivo).toBe('caixa_invalido');
  const fechado = { ...cx, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 100, contadoCentavos: 100 } };
  expect((await enviar(amb, c, [mutacao('caixa', cx)])).corpo.rejeitadas).toEqual([]);
  expect((await enviar(amb, c, [mutacao('caixa', { ...cx, abertura: { ...cx.abertura, trocoInicialCentavos: 101 } })])).corpo.rejeitadas[0].motivo).toBe('caixa_imutavel');
  await enviar(amb, c, [mutacao('caixa', fechado)]);
  expect((await enviar(amb, c, [mutacao('venda', venda(c, { caixaId: cx.id }))])).corpo.rejeitadas).toEqual([]);
  const anterior = new Date(INICIO.getTime() - 1000).toISOString();
  expect((await enviar(amb, c, [mutacao('venda', venda(c, { caixaId: cx.id, criadaEm: anterior }))])).corpo.rejeitadas[0].motivo).toBe('caixa_invalido');
});
