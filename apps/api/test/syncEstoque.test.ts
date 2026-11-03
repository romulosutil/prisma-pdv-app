import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { gerarId, saldoEstoque, type AjusteEstoque, type Produto, type Venda } from '@pdv/shared';
import { eq } from 'drizzle-orm';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, INICIO, NUMEROS, mutacao, produto, venda, type Ambiente } from './ajuda';
import type { Conexao } from '../src/db/conexao';
import { assinaturas, produtos, itensVenda } from '../src/db/schema';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); }, 30000);
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });
afterAll(async () => { await banco.fechar(); });
const ajuste = (quantidadeMilesimos: number): AjusteEstoque => ({ id: gerarId(), criadoEm: INICIO.toISOString(), motivo: 'Contagem', quantidadeMilesimos });
async function ler(c: { token: string }) {
  const r = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: c.token });
  expect(r.status).toBe(200);
  return r.corpo.mudancas as ({ entidade: string; dados: Produto | Venda })[];
}
function vender(c: Parameters<typeof venda>[0], p: Produto, quantidade = 2000): Venda {
  const v = venda(c, { itens: [{ id: gerarId(), produtoId: p.id, descricao: p.nome, precoUnitarioCentavos: 1000, quantidadeMilesimos: quantidade, totalCentavos: quantidade, controlaEstoque: true }], pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: quantidade, trocoCentavos: 0 }], totalCentavos: quantidade });
  return v;
}

describe('sync do estoque', () => {
  it('persiste marcador, baixa uma vez e preserva cancelamento/replay', async () => {
    const c = await contaEmTeste(amb);
    const p = produto(c.lojaId, { estoque: 10000, ajustesEstoque: [] });
    const v = vender(c, p);
    const ms = [mutacao('venda', v), mutacao('produto', p)]; // servidor ordena dependência
    expect((await enviar(amb, c, ms)).corpo.rejeitadas).toEqual([]);
    expect((await enviar(amb, c, ms)).corpo.aceitas).toEqual(ms.map(m => m.id));
    let mudancas = await ler(c);
    let recebido = mudancas.find(m => m.entidade === 'venda')!.dados as Venda;
    const recebidoProduto = mudancas.find(m => m.entidade === 'produto')!.dados as Produto;
    expect(recebido.itens[0]!.controlaEstoque).toBe(true);
    expect(saldoEstoque(recebidoProduto, [recebido])).toBe(8000);
    const cancelada: Venda = { ...v, status: 'cancelada', cancelamento: { id: gerarId(), em: INICIO.toISOString(), operadorId: c.operadorId, motivo: 'Devolução', estorno: 'nao_realizado' } };
    const mc = mutacao('venda', cancelada);
    expect((await enviar(amb, c, [mc, mc])).corpo.rejeitadas).toEqual([]);
    mudancas = await ler(c); recebido = mudancas.find(m => m.entidade === 'venda')!.dados as Venda;
    expect(saldoEstoque(recebidoProduto, [recebido])).toBe(10000);
    expect(await amb.db.select().from(itensVenda)).toHaveLength(1);
  });
  it('une ajustes concorrentes mesmo com metadados antigos e preserva eventos omitidos', async () => {
    const c = await contaEmTeste(amb);
    const p = produto(c.lojaId, { estoque: 10000, ajustesEstoque: [] });
    await enviar(amb, c, [mutacao('produto', p), mutacao('venda', vender(c, p))]);
    const a = ajuste(4000), b = ajuste(-1000);
    amb.relogio.avancarDias(1);
    const novo = { ...p, nome: 'Nome novo', atualizadoEm: amb.relogio.agora().toISOString(), ajustesEstoque: [a] };
    expect((await enviar(amb, c, [mutacao('produto', novo)])).corpo.rejeitadas).toEqual([]);
    const antigo = { ...p, ajustesEstoque: [b] };
    const m = mutacao('produto', antigo);
    expect((await enviar(amb, c, [m, m])).corpo.rejeitadas).toEqual([]);
    const lista = await ler(c), rp = lista.find(m => m.entidade === 'produto')!.dados as Produto;
    expect(rp.nome).toBe('Nome novo');
    expect(rp.ajustesEstoque).toHaveLength(2);
    expect(saldoEstoque(rp, lista.filter(m => m.entidade === 'venda').map(m => m.dados as Venda))).toBe(11000);
    const semEventos: Produto = { ...novo, nome: 'Outro nome' }; delete semEventos.ajustesEstoque;
    await enviar(amb, c, [mutacao('produto', semEventos)]);
    expect(((await ler(c)).find(m => m.entidade === 'produto')!.dados as Produto).ajustesEstoque).toHaveLength(2);
  });
  it('recusa adulterar ajuste, base e unidade sem alterar produto confirmado', async () => {
    const c = await contaEmTeste(amb), a = ajuste(4000);
    const p = produto(c.lojaId, { estoque: 10000, ajustesEstoque: [a] });
    await enviar(amb, c, [mutacao('produto', p)]);
    const antes = await amb.db.select().from(produtos);
    const casos: [Produto, string][] = [
      [{ ...p, ajustesEstoque: [{ ...a, quantidadeMilesimos: 9000 }] }, 'movimento_estoque_invalido'],
      [{ ...p, estoque: 30000 }, 'estoque_desatualizado'],
      [{ ...p, unidade: 'kg' }, 'unidade_estoque_invalida'],
    ];
    for (const [dados, motivo] of casos) {
      const m = mutacao('produto', dados);
      expect((await enviar(amb, c, [m])).corpo.rejeitadas).toEqual([{ id: m.id, motivo }]);
      expect(await amb.db.select().from(produtos)).toEqual(antes);
    }
  });
  it('não altera histórico anterior; classifica nova venda de cliente antigo e conserva marcador omitido no cancelamento', async () => {
    const c = await contaEmTeste(amb), p = produto(c.lojaId, { estoque: 10000 });
    await enviar(amb, c, [mutacao('produto', p)]);
    const antiga = vender(c, p); delete antiga.itens[0]!.controlaEstoque;
    // Fixture de venda anterior à atualização, já confirmada, sem reprocessamento pela API.
    const semProduto = venda(c);
    await enviar(amb, c, [mutacao('venda', semProduto)]);
    const nova = mutacao('venda', antiga);
    expect((await enviar(amb, c, [nova])).corpo.rejeitadas).toEqual([]);
    const lista = await ler(c), vs = lista.filter(m => m.entidade === 'venda').map(m => m.dados as Venda);
    expect(vs.find(v => v.id === semProduto.id)!.itens.every(i => i.controlaEstoque === undefined)).toBe(true);
    expect(vs.find(v => v.id === antiga.id)!.itens[0]!.controlaEstoque).toBe(true);
    const adulterada = { ...antiga, itens: [{ ...antiga.itens[0]!, controlaEstoque: false }] };
    const m = mutacao('venda', adulterada);
    expect((await enviar(amb, c, [m])).corpo.rejeitadas).toEqual([{ id: m.id, motivo: 'venda_imutavel' }]);
    const cancelar = mutacao('venda', { ...antiga, status: 'cancelada' });
    expect((await enviar(amb, c, [cancelar])).corpo.rejeitadas).toEqual([]);
    expect(((await ler(c)).find(m => m.dados.id === antiga.id)!.dados as Venda).itens[0]!.controlaEstoque).toBe(true);
  });
  it('rejeita produto controlado de outra loja e aceita avulso/sem controle', async () => {
    const c = await contaEmTeste(amb), outra = await contaEmTeste(amb, 'negocio', NUMEROS.outroAprova);
    const p = produto(outra.lojaId, { estoque: 10000, ajustesEstoque: [] });
    await enviar(amb, outra, [mutacao('produto', p)]);
    const m = mutacao('venda', vender(c, p));
    expect((await enviar(amb, c, [m])).corpo.rejeitadas).toEqual([{ id: m.id, motivo: 'loja_invalida' }]);
    expect((await enviar(amb, c, [mutacao('venda', venda(c))])).corpo.rejeitadas).toEqual([]);
  });
  it('recusa novos ajustes/desativação no downgrade e preserva eventos confirmados', async () => {
    const c = await contaEmTeste(amb), a = ajuste(4000);
    const p = produto(c.lojaId, { estoque: 10000, ajustesEstoque: [a], estoqueAtivo: true });
    await enviar(amb, c, [mutacao('produto', p)]);
    await amb.db.update(assinaturas).set({ planoId: 'essencial' }).where(eq(assinaturas.contaId, c.contaId));
    const ms = [mutacao('produto', { ...p, ajustesEstoque: [a, ajuste(1000)] }), mutacao('produto', { ...p, estoqueAtivo: false })];
    expect((await enviar(amb, c, ms)).corpo.rejeitadas).toEqual(ms.map(m => ({ id: m.id, motivo: 'recurso_plano' })));
    expect((await enviar(amb, c, [mutacao('produto', { ...p, nome: 'Outro nome' })])).corpo.rejeitadas).toEqual([]);
    expect(((await ler(c)).find(m => m.entidade === 'produto')!.dados as Produto).ajustesEstoque).toEqual([a]);
  });
  it('preserva venda controlada anterior à migração sem inventar baixa ou reposição', async () => {
    const c = await contaEmTeste(amb), p = produto(c.lojaId, { estoque: 10000 });
    const v = vender(c, p); delete v.itens[0]!.controlaEstoque;
    await enviar(amb, c, [mutacao('produto', p), mutacao('venda', v)]);
    // Representa linha financeira já existente antes da migração aditiva, que deixa a coluna NULL.
    await amb.db.update(itensVenda).set({ controlaEstoque: null }).where(eq(itensVenda.vendaId, v.id));
    const antes = (await ler(c)).find(m => m.entidade === 'venda')!.dados as Venda;
    expect(antes.itens[0]!.controlaEstoque).toBeUndefined();
    expect(saldoEstoque(p, [antes])).toBe(10000);
    expect((await enviar(amb, c, [mutacao('venda', { ...v, status: 'cancelada' })])).corpo.rejeitadas).toEqual([]);
    const depois = (await ler(c)).find(m => m.entidade === 'venda')!.dados as Venda;
    expect(depois.itens[0]!.controlaEstoque).toBeUndefined();
    expect(saldoEstoque(p, [depois])).toBe(10000);
  });
  it('serializa dois ajustes simultâneos e não perde eventos com o mesmo timestamp', async () => {
    const c = await contaEmTeste(amb), p = produto(c.lojaId, { estoque: 10000, ajustesEstoque: [] });
    await enviar(amb, c, [mutacao('produto', p)]);
    const a = ajuste(4000), b = ajuste(-1000);
    const rs = await Promise.all([enviar(amb, c, [mutacao('produto', { ...p, ajustesEstoque: [a] })]), enviar(amb, c, [mutacao('produto', { ...p, ajustesEstoque: [b] })])]);
    expect(rs.map(r => r.corpo.rejeitadas)).toEqual([[], []]);
    const recebido = (await ler(c)).find(m => m.entidade === 'produto')!.dados as Produto;
    expect(recebido.ajustesEstoque?.map(a => a.id).sort()).toEqual([a.id, b.id].sort());
    expect(saldoEstoque(recebido, [])).toBe(13000);
  });
  it('recusa estouro do saldo composto antes de persistir ajuste, venda ou cancelamento', async () => {
    const c = await contaEmTeste(amb);
    const p = produto(c.lojaId, { estoque: Number.MAX_SAFE_INTEGER, ajustesEstoque: [] });
    await enviar(amb, c, [mutacao('produto', p)]);
    const excesso = mutacao('produto', { ...p, ajustesEstoque: [ajuste(1)] });
    expect((await enviar(amb, c, [excesso])).corpo.rejeitadas).toEqual([{ id: excesso.id, motivo: 'estoque_fora_do_limite' }]);
    const v = vender(c, p, 1000); await enviar(amb, c, [mutacao('venda', v)]);
    // A baixa libera capacidade; este ajuste cabe no saldo composto, apesar de base+ajuste exceder o limite.
    const a = ajuste(1000);
    expect((await enviar(amb, c, [mutacao('produto', { ...p, ajustesEstoque: [a] })])).corpo.rejeitadas).toEqual([]);
    const cancelar = mutacao('venda', { ...v, status: 'cancelada' });
    expect((await enviar(amb, c, [cancelar])).corpo.rejeitadas).toEqual([{ id: cancelar.id, motivo: 'estoque_fora_do_limite' }]);
    const negativo = produto(c.lojaId, { estoque: -Number.MAX_SAFE_INTEGER, ajustesEstoque: [] });
    await enviar(amb, c, [mutacao('produto', negativo)]);
    const mv = mutacao('venda', vender(c, negativo));
    const antes = await amb.db.select().from(itensVenda);
    expect((await enviar(amb, c, [mv])).corpo.rejeitadas).toEqual([{ id: mv.id, motivo: 'estoque_fora_do_limite' }]);
    expect(await amb.db.select().from(itensVenda)).toEqual(antes);
    expect(((await ler(c)).find(m => m.dados.id === v.id)!.dados as Venda).status).toBe('concluida');
  });
});
