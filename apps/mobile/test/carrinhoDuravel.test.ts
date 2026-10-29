import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Venda } from '@pdv/shared';
import type { Armazenamento } from '../src/dados/armazenamento';
import { CarrinhoDuravel } from '../src/dados/carrinhoDuravel';
import { totalDoCarrinho, valorRestante } from '../src/dados/carrinho';
import type { PersistenciaCheckout, RegistroCheckout } from '../src/dados/checkoutTipos';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { CheckoutSqlite } from '../src/dados/sqlite/checkoutSqlite';
import { sqliteBanco } from './sqliteBanco';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const contexto = { novoId: () => id(5), agora: () => '2026-10-28T12:00:00.000Z', caixaId: () => null };
const parcela = { meio: 'pix' as const, valorCentavos: 1000 };
const registro: RegistroCheckout = { vendaId: id(5), criadaEm: contexto.agora(), caixaId: null,
  estado: { itens: [{ chave: 'linha-1', produtoId: null, descricao: 'Avulso', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, unidade: 'un', ean: null }], parcelas: [parcela], removido: null, concluidaId: null } };

function bloqueio() {
  let resolver!: () => void;
  const promessa = new Promise<void>((resolve) => { resolver = resolve; });
  return { promessa, resolver };
}

class Fake implements PersistenciaCheckout {
  registro: RegistroCheckout | null = null;
  salvar = vi.fn(async (valor: RegistroCheckout | null) => { this.registro = structuredClone(valor); });
  carregar = vi.fn(async () => structuredClone(this.registro));
  concluir = vi.fn(async () => ({ id: id(5) }) as Venda);
}
function criar(fake: PersistenciaCheckout) {
  const carrinho = new CarrinhoDuravel();
  carrinho.configurar(fake, contexto);
  return carrinho;
}

describe('CarrinhoDuravel com persistência simulada', () => {
  it('publica somente após salvar', async () => {
    const fake = new Fake(); const trava = bloqueio();
    fake.salvar.mockImplementationOnce(async (r) => { await trava.promessa; fake.registro = r; });
    const carrinho = criar(fake); const anterior = carrinho.obter(); const ouvinte = vi.fn();
    carrinho.assinar(ouvinte);
    const escrita = carrinho.adicionarAvulso(2500, 'Avulso');
    await Promise.resolve();
    expect(carrinho.obter()).toBe(anterior); expect(ouvinte).not.toHaveBeenCalled();
    trava.resolver(); await escrita;
    expect(carrinho.obter().itens).toHaveLength(1); expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('preserva o snapshot após erro e permite tentar novamente', async () => {
    const fake = new Fake(); fake.salvar.mockRejectedValueOnce(new Error('falha'));
    const carrinho = criar(fake); const anterior = carrinho.obter(); const ouvinte = vi.fn(); carrinho.assinar(ouvinte);
    await expect(carrinho.adicionarAvulso(2500, 'Avulso')).rejects.toThrow('falha');
    expect(carrinho.obter()).toBe(anterior); expect(ouvinte).not.toHaveBeenCalled();
    await carrinho.adicionarAvulso(2500, 'Avulso');
    expect(carrinho.obter().itens).toHaveLength(1); expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('compõe adições em fila sem repetir chaves restauradas', async () => {
    const fake = new Fake(); fake.registro = { ...registro, estado: { ...registro.estado, parcelas: [] } };
    const carrinho = criar(fake); await carrinho.carregar();
    const trava = bloqueio();
    fake.salvar.mockImplementationOnce(async (r) => { await trava.promessa; fake.registro = structuredClone(r); });
    const a = carrinho.adicionarAvulso(100, 'A'); const b = carrinho.adicionarAvulso(200, 'B');
    trava.resolver(); await Promise.all([a, b]);
    expect(carrinho.obter().itens.map((i) => i.chave)).toEqual(['linha-3', 'linha-2', 'linha-1']);
    expect(fake.registro?.estado.itens).toEqual(carrinho.obter().itens);
  });

  it('não publica parcela quando salvar falha', async () => {
    const fake = new Fake(); const carrinho = criar(fake); await carrinho.adicionarAvulso(2500, 'Avulso');
    const anterior = carrinho.obter(); const ouvinte = vi.fn(); carrinho.assinar(ouvinte);
    fake.salvar.mockRejectedValueOnce(new Error('falha'));
    await expect(carrinho.adicionarParcela(parcela)).rejects.toThrow('falha');
    expect(carrinho.obter()).toBe(anterior); expect(ouvinte).not.toHaveBeenCalled();
    await carrinho.adicionarParcela(parcela); expect(carrinho.obter().parcelas).toEqual([parcela]);
  });

  it('recupera pagamento parcial e recusa alteração ou descarte dos itens', async () => {
    const fake = new Fake(); fake.registro = structuredClone(registro); const carrinho = criar(fake); await carrinho.carregar();
    expect(carrinho.obter()).toEqual(registro.estado);
    expect(valorRestante(totalDoCarrinho(carrinho.obter().itens), carrinho.obter().parcelas)).toBe(1500);
    await expect(carrinho.adicionarAvulso(100, 'extra')).rejects.toThrow();
    await expect(carrinho.remover('linha-1')).rejects.toThrow();
    await expect(carrinho.definirQuantidade('linha-1', 2000)).rejects.toThrow();
    await expect(carrinho.limpar()).rejects.toThrow();
    expect(carrinho.obter()).toEqual(registro.estado);
    await carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1500 });
    expect(valorRestante(totalDoCarrinho(carrinho.obter().itens), carrinho.obter().parcelas)).toBe(0);
  });

  it('não publica conclusão com falha e devolve a mesma venda em tentativas repetidas', async () => {
    const fake = new Fake(); fake.registro = structuredClone(registro); const carrinho = criar(fake); await carrinho.carregar();
    const anterior = carrinho.obter(); const ouvinte = vi.fn(); carrinho.assinar(ouvinte);
    fake.concluir.mockRejectedValueOnce(new Error('falha'));
    await expect(carrinho.concluir()).rejects.toThrow('falha');
    expect(carrinho.obter()).toBe(anterior); expect(ouvinte).not.toHaveBeenCalled();
    const venda = await carrinho.concluir(); expect(carrinho.obter().concluidaId).toBe(venda.id);
    expect(await carrinho.concluir()).toEqual(venda);
    await expect(carrinho.adicionarParcela(parcela)).rejects.toThrow();
  });
});

describe('CarrinhoDuravel com SQLite local', () => {
  it('reabre pagamento parcial e conclui uma única venda após falha e retry', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fachada-checkout-')); const caminho = join(dir, 'db.sqlite');
    const sessao = { token: 'token', contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) };
    const legado: Armazenamento = { obter: async <T>(chave: string) => (chave === 'conta' ? { sessao } as T : null), gravar: async () => {}, remover: async () => {}, limpar: async () => {} };
    let raw = new DatabaseSync(caminho); let falhar = false; let proximo = 20;
    const servico = () => new CheckoutSqlite(new ArmazenamentoSqlite(async () => sqliteBanco(raw, () => falhar), legado), () => id(proximo++));
    try {
      let carrinho = criar(servico()); await carrinho.adicionarAvulso(2500, 'Avulso'); await carrinho.adicionarParcela(parcela);
      raw.close(); raw = new DatabaseSync(caminho);
      carrinho = criar(servico()); await carrinho.carregar();
      expect(valorRestante(totalDoCarrinho(carrinho.obter().itens), carrinho.obter().parcelas)).toBe(1500);
      await expect(carrinho.concluir()).rejects.toThrow('Pagamento incompleto');
      expect(carrinho.obter().concluidaId).toBeNull();
      await carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1500 });
      falhar = true; await expect(carrinho.concluir()).rejects.toThrow();
      expect(carrinho.obter().concluidaId).toBeNull(); falhar = false;
      const venda = await carrinho.concluir(); expect((await carrinho.concluir()).id).toBe(venda.id);
      expect((raw.prepare('SELECT COUNT(*) AS n FROM outbox').get() as { n: number }).n).toBe(1);
      raw.close(); raw = new DatabaseSync(caminho);
      carrinho = criar(servico()); await carrinho.carregar();
      expect(carrinho.obter().concluidaId).toBe(venda.id);
      await expect(carrinho.adicionarParcela(parcela)).rejects.toThrow();
    } finally { raw.close(); rmSync(dir, { recursive: true, force: true }); }
  });
});
