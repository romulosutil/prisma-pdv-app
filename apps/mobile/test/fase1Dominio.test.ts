import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import type { RegistroCheckout } from '../src/dados/checkoutTipos';
import { CarrinhoDuravel } from '../src/dados/carrinhoDuravel';
import { VendasRepo } from '../src/dados/vendas';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { CheckoutSqlite } from '../src/dados/sqlite/checkoutSqlite';
import { provedoresPagamento, SimuladorProvedores } from '../src/servicos/provedoresPagamento';
import { criarAmbiente } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sessao = { token: 'token', contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) };
const base: RegistroCheckout = { vendaId: id(5), criadaEm: '2026-10-28T12:00:00.000Z', caixaId: null,
  estado: { itens: [{ chave: 'linha-1', produtoId: null, descricao: 'Avulso', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, unidade: 'un', ean: null }], parcelas: [], removido: null, concluidaId: null } };
const integrados = [
  { meio: 'pix' as const, provedor: 'infinitepay' as const, valorCentavos: 2500 },
  { meio: 'cartao_credito' as const, provedor: 'mercadopago' as const, valorCentavos: 2500 },
  { meio: 'tap' as const, provedor: null, valorCentavos: 2500 },
];
function banco() {
  const raw = new DatabaseSync(':memory:');
  const amb = criarAmbiente();
  let seq = 20;
  const checkout = new CheckoutSqlite(new ArmazenamentoSqlite(async () => sqliteBanco(raw), amb.armazenamento), () => id(seq++));
  return { raw, amb, checkout };
}
const snapshot = (raw: DatabaseSync) => Object.fromEntries(['rascunhos', 'vendas', 'itens_venda', 'pagamentos_venda', 'outbox'].map(t => [t, raw.prepare(`SELECT * FROM ${t}`).all()]));

describe('fase 1: fronteiras manuais', () => {
  it.each(integrados)('recusa nova parcela na fachada sem salvar ou publicar: $meio $provedor', async parcela => {
    const salvar = vi.fn(async () => {});
    const persistencia = { salvar, carregar: async () => base, concluir: vi.fn() };
    const carrinho = new CarrinhoDuravel();
    carrinho.configurar(persistencia, { novoId: () => id(5), agora: () => base.criadaEm, caixaId: () => null });
    await carrinho.carregar();
    const antes = carrinho.obter(); const ouvinte = vi.fn(); carrinho.assinar(ouvinte);
    await expect(carrinho.adicionarParcela(parcela)).rejects.toThrow(/indispon/i);
    expect(carrinho.obter()).toBe(antes); expect(ouvinte).not.toHaveBeenCalled(); expect(salvar).not.toHaveBeenCalled();
  });

  it.each(integrados)('recusa venda integrada no repositório: $meio $provedor', async pagamento => {
    const amb = criarAmbiente(); const repo = new VendasRepo(amb, { sessao: () => sessao });
    const antes = repo.obter(); const ouvinte = vi.fn(); repo.assinar(ouvinte);
    await expect(repo.registrar({ itens: [{ produtoId: null, descricao: 'A', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000 }], pagamentos: [pagamento] })).rejects.toThrow(/indispon/i);
    expect(repo.obter()).toBe(antes); expect(ouvinte).not.toHaveBeenCalled(); expect(await amb.armazenamento.obter('vendas')).toBeNull();
  });

  it.each(integrados)('SQLite recusa gravação nova e conclusão de legado: $meio $provedor', async parcela => {
    const { raw, amb, checkout } = banco();
    try {
      await amb.armazenamento.gravar('conta', { sessao });
      await checkout.salvar(base);
      const antes = snapshot(raw); const integrado = { ...base, estado: { ...base.estado, parcelas: [parcela] } };
      await expect(checkout.salvar(integrado)).rejects.toThrow(/indispon/i);
      expect(snapshot(raw)).toEqual(antes);
      raw.prepare('UPDATE rascunhos SET payload_json = ?').run(JSON.stringify(integrado));
      const legado = snapshot(raw);
      expect(await checkout.carregar()).toEqual(integrado);
      await expect(checkout.concluir()).rejects.toThrow(/indispon/i);
      expect(snapshot(raw)).toEqual(legado);
    } finally { raw.close(); }
  });

  it('conclui split manual uma vez, normaliza provedor e preserva troco', async () => {
    const { raw, amb, checkout } = banco();
    try {
      await amb.armazenamento.gravar('conta', { sessao });
      await checkout.salvar({ ...base, estado: { ...base.estado, parcelas: [{ meio: 'pix', valorCentavos: 1000 }, { meio: 'dinheiro', provedor: null, valorCentavos: 1500, trocoCentavos: 500 }] } });
      const venda = await checkout.concluir();
      expect(venda.pagamentos).toMatchObject([{ meio: 'pix', provedor: null }, { meio: 'dinheiro', provedor: null, trocoCentavos: 500 }]);
      expect(await checkout.concluir()).toEqual(venda);
      expect(raw.prepare('SELECT COUNT(*) AS n FROM outbox').get()).toMatchObject({ n: 1 });
    } finally { raw.close(); }
  });

  it('recupera e repete conclusão integrada histórica sem alterar o banco', async () => {
    const { raw, amb, checkout } = banco();
    try {
      await amb.armazenamento.gravar('conta', { sessao });
      await checkout.salvar({ ...base, estado: { ...base.estado, parcelas: [{ meio: 'pix', valorCentavos: 2500 }] } });
      const manual = await checkout.concluir();
      const parcela = integrados[0]!;
      const venda = { ...manual, pagamentos: manual.pagamentos.map(p => ({ ...p, provedor: parcela.provedor })) };
      const registro = { ...base, estado: { ...base.estado, parcelas: [parcela], concluidaId: base.vendaId } };
      raw.prepare('UPDATE vendas SET payload_json = ?').run(JSON.stringify(venda));
      raw.prepare('UPDATE pagamentos_venda SET payload_json = ?').run(JSON.stringify(venda.pagamentos[0]));
      raw.prepare('UPDATE rascunhos SET payload_json = ?').run(JSON.stringify(registro));
      const antes = snapshot(raw);
      expect(await checkout.carregar()).toEqual(registro);
      expect(await checkout.concluir()).toEqual(venda);
      expect(snapshot(raw)).toEqual(antes);

      const carrinho = new CarrinhoDuravel();
      carrinho.configurar(checkout, { novoId: () => id(5), agora: () => base.criadaEm, caixaId: () => null });
      await carrinho.carregar();
      expect(await carrinho.concluir()).toEqual(venda);
      expect(snapshot(raw)).toEqual(antes);
      const repo = new VendasRepo(amb, { sessao: () => sessao });
      await repo.substituirTodas({ vendas: [venda], numeroBase: 0 });
      expect(await repo.registrar({ itens: [], pagamentos: [parcela] }, venda.id)).toEqual(venda);
    } finally { raw.close(); }
  });

  it('fachada preserva rascunho integrado e recusa conclusão antes de chamar persistência', async () => {
    const registro = { ...base, estado: { ...base.estado, parcelas: [integrados[0]!] } };
    const concluir = vi.fn();
    const carrinho = new CarrinhoDuravel();
    carrinho.configurar({ carregar: async () => registro, salvar: vi.fn(), concluir }, { novoId: () => id(5), agora: () => base.criadaEm, caixaId: () => null });
    await carrinho.carregar(); const antes = carrinho.obter(); const ouvinte = vi.fn(); carrinho.assinar(ouvinte);
    await expect(carrinho.concluir()).rejects.toThrow(/indispon/i);
    expect(carrinho.obter()).toBe(antes); expect(ouvinte).not.toHaveBeenCalled(); expect(concluir).not.toHaveBeenCalled();
  });

  it('singleton indisponível não simula sucesso', () => {
    expect(provedoresPagamento).not.toBeInstanceOf(SimuladorProvedores);
    expect(() => provedoresPagamento.criarCobrancaPix({ provedor: 'infinitepay', valorCentavos: 100, nomeRecebedor: 'Loja' })).toThrow(/indispon/i);
    expect(() => provedoresPagamento.iniciarTap({ provedor: 'mercadopago', valorCentavos: 100 })).toThrow(/indispon/i);
  });
});
