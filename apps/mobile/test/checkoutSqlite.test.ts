import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Armazenamento } from '../src/dados/armazenamento';
import type { RegistroCheckout } from '../src/dados/checkoutTipos';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { CheckoutSqlite } from '../src/dados/sqlite/checkoutSqlite';
import { conectarTransacoes } from '../src/dados/sqlite/conexao';
import { sqliteBanco } from './sqliteBanco';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sessao = { token: 'token', contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) };
class Memoria implements Armazenamento {
  dados = new Map<string, unknown>([['conta', { sessao }]]);
  async obter<T>(chave: string) { return (this.dados.get(chave) as T | undefined) ?? null; }
  async gravar<T>(chave: string, valor: T) { this.dados.set(chave, structuredClone(valor)); }
  async remover(chave: string) { this.dados.delete(chave); }
  async limpar() { this.dados.clear(); }
}
const registro: RegistroCheckout = { vendaId: id(5), criadaEm: '2026-10-28T12:00:00.000Z', caixaId: null,
  estado: { itens: [{ chave: 'linha-1', produtoId: null, descricao: 'Avulso', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, unidade: 'un', ean: null }], parcelas: [{ meio: 'pix', valorCentavos: 1000 }], removido: null, concluidaId: null } };
const completo: RegistroCheckout = { ...registro, estado: { ...registro.estado, parcelas: [...registro.estado.parcelas, { meio: 'dinheiro', valorCentavos: 1500, trocoCentavos: 500 }] } };
function criar(raw: DatabaseSync, legado: Memoria, falhar?: (sql: string) => boolean) {
  let proximo = 20;
  const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw, falhar), legado);
  return new CheckoutSqlite(storage, () => id(proximo++));
}
function contagem(raw: DatabaseSync, tabela: string) { return (raw.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number }).n; }

describe('CheckoutSqlite', () => {
  it('preserva arredondamento exato na fronteira em venda, filhos e outbox após reabrir', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'checkout-arredondamento-'));
    const caminho = join(dir, 'db.sqlite');
    const legado = new Memoria();
    let raw = new DatabaseSync(caminho);
    const limite: RegistroCheckout = { ...completo, estado: { ...completo.estado,
      itens: [{ ...completo.estado.itens[0]!, precoUnitarioCentavos: 9007199254740499, quantidadeMilesimos: 1, unidade: 'kg' }],
      parcelas: [{ meio: 'dinheiro', valorCentavos: 9007199254740, trocoCentavos: 0 }],
    } };
    try {
      const checkout = criar(raw, legado);
      await checkout.salvar(limite);
      const venda = await checkout.concluir();
      expect(venda.totalCentavos).toBe(9007199254740);
      expect(venda.itens).toMatchObject([{ precoUnitarioCentavos: 9007199254740499, quantidadeMilesimos: 1, totalCentavos: 9007199254740 }]);
      expect(venda.pagamentos).toMatchObject([{ meio: 'dinheiro', valorCentavos: 9007199254740, trocoCentavos: 0 }]);
      raw.close(); raw = new DatabaseSync(caminho);
      expect(await criar(raw, legado).concluir()).toEqual(venda);
      expect(['vendas', 'itens_venda', 'pagamentos_venda', 'outbox'].map(t => contagem(raw, t))).toEqual([1, 1, 1, 1]);
      const pai = raw.prepare('SELECT payload_json FROM vendas').get() as { payload_json: string };
      const itens = raw.prepare('SELECT payload_json FROM itens_venda ORDER BY posicao').all() as { payload_json: string }[];
      const pagamentos = raw.prepare('SELECT payload_json FROM pagamentos_venda ORDER BY posicao').all() as { payload_json: string }[];
      expect(JSON.parse(pai.payload_json)).toEqual(venda);
      expect(itens.map(i => JSON.parse(i.payload_json))).toEqual(venda.itens);
      expect(pagamentos.map(p => JSON.parse(p.payload_json))).toEqual(venda.pagamentos);
      const linha = raw.prepare('SELECT payload_json FROM outbox').get() as { payload_json: string };
      expect(JSON.parse(linha.payload_json)).toMatchObject({ entidade: 'venda', operacao: 'upsert', dados: venda });
    } finally { raw.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it('recupera parcela, itens e saldo após reabrir arquivo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'checkout-'));
    const caminho = join(dir, 'db.sqlite');
    const legado = new Memoria();
    let raw = new DatabaseSync(caminho);
    try {
      await criar(raw, legado).salvar(registro);
      raw.close(); raw = new DatabaseSync(caminho);
      const retomado = await criar(raw, legado).carregar();
      expect(retomado).toEqual(registro);
      expect(retomado!.estado.itens[0]!.precoUnitarioCentavos - retomado!.estado.parcelas[0]!.valorCentavos).toBe(1500);
    } finally { raw.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it('conclui uma vez e recupera a mesma venda após perda da resposta', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'checkout-'));
    const caminho = join(dir, 'db.sqlite');
    const legado = new Memoria();
    let raw = new DatabaseSync(caminho);
    try {
      const checkout = criar(raw, legado);
      await checkout.salvar(completo);
      const venda = await checkout.concluir();
      raw.close(); raw = new DatabaseSync(caminho);
      const retomado = criar(raw, legado);
      expect(await retomado.concluir()).toEqual(venda);
      expect(venda.id).toBe(registro.vendaId);
      expect(venda.totalCentavos).toBe(2500);
      expect(venda.pagamentos.map((p) => p.valorCentavos)).toEqual([1000, 1500]);
      expect((await retomado.carregar())?.estado.concluidaId).toBe(venda.id);
      expect(['vendas', 'itens_venda', 'pagamentos_venda', 'outbox'].map((t) => contagem(raw, t))).toEqual([1, 1, 2, 1]);
      const mutacao = JSON.parse((raw.prepare('SELECT payload_json FROM outbox').get() as { payload_json: string }).payload_json);
      expect(mutacao).toMatchObject({ entidade: 'venda', operacao: 'upsert', dados: venda });
    } finally { raw.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it.each([1, 2, 3, 4, 5, 6])('reverte falha na fronteira de escrita %i', async (fronteira) => {
    const raw = new DatabaseSync(':memory:');
    const legado = new Memoria();
    let ativa = false; let escrita = 0;
    try {
      const checkout = criar(raw, legado, () => ativa && ++escrita === fronteira);
      await checkout.salvar(completo);
      ativa = true;
      await expect(checkout.concluir()).rejects.toThrow('falha injetada');
      ativa = false;
      expect(await checkout.carregar()).toEqual(completo);
      expect(['vendas', 'itens_venda', 'pagamentos_venda', 'outbox'].map((t) => contagem(raw, t))).toEqual([0, 0, 0, 0]);
      const venda = await checkout.concluir();
      expect(venda.id).toBe(registro.vendaId);
      expect(['vendas', 'itens_venda', 'pagamentos_venda', 'outbox'].map((t) => contagem(raw, t))).toEqual([1, 1, 2, 1]);
    } finally { raw.close(); }
  });

  it('recusa saldo aberto e mudanças ou descarte após recebimento', async () => {
    const raw = new DatabaseSync(':memory:');
    try {
      const checkout = criar(raw, new Memoria());
      await checkout.salvar(registro);
      await expect(checkout.concluir()).rejects.toThrow();
      await expect(checkout.salvar(null)).rejects.toThrow();
      await expect(checkout.salvar({ ...registro, estado: { ...registro.estado, itens: [] } })).rejects.toThrow();
      await expect(checkout.salvar({ ...registro, estado: { ...registro.estado, parcelas: [{ meio: 'pix', valorCentavos: 999 }] } })).rejects.toThrow();
      expect(await checkout.carregar()).toEqual(registro);
      expect(contagem(raw, 'vendas')).toBe(0);
      expect(contagem(raw, 'outbox')).toBe(0);
    } finally { raw.close(); }
  });

  it('recusa rascunho corrompido e múltiplos rascunhos sem descartá-los', async () => {
    const raw = new DatabaseSync(':memory:');
    try {
      const checkout = criar(raw, new Memoria());
      await checkout.salvar(registro);
      raw.prepare('UPDATE rascunhos SET payload_json = ?').run('{inválido');
      await expect(checkout.carregar()).rejects.toThrow();
      raw.prepare('UPDATE rascunhos SET payload_json = ?').run(JSON.stringify(registro));
      raw.prepare('INSERT INTO rascunhos VALUES (?, ?, ?, ?)').run(sessao.contaId, sessao.lojaId, id(6), JSON.stringify({ ...registro, vendaId: id(6) }));
      await expect(checkout.carregar()).rejects.toThrow();
      expect(contagem(raw, 'rascunhos')).toBe(2);
    } finally { raw.close(); }
  });

  it('preserva caixa vinculado e permite limpar apenas depois da conclusão', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = new Memoria();
    const caixa = { id: id(7), lojaId: sessao.lojaId, aparelhoId: sessao.aparelhoId, operadorId: sessao.operadorId, abertura: { em: registro.criadaEm, trocoInicialCentavos: 0 }, fechamento: null, movimentos: [] };
    try {
      await legado.gravar('caixas', [caixa]);
      const checkout = criar(raw, legado);
      const comCaixa = { ...completo, caixaId: caixa.id };
      await checkout.salvar(comCaixa);
      await expect(checkout.salvar({ ...comCaixa, caixaId: null })).rejects.toThrow();
      const venda = await checkout.concluir();
      expect(raw.prepare('SELECT caixa_id FROM vendas WHERE id = ?').get(venda.id)).toMatchObject({ caixa_id: caixa.id });
      await expect(checkout.salvar(comCaixa)).rejects.toThrow();
      await checkout.salvar(null);
      expect(await checkout.carregar()).toBeNull();
      expect(contagem(raw, 'vendas')).toBe(1);
      expect(contagem(raw, 'outbox')).toBe(1);
    } finally { raw.close(); }
  });

  it('preserva caixa ao regravar venda cancelada e recupera checkout concluído', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = new Memoria();
    const caixa = { id: id(7), lojaId: sessao.lojaId, aparelhoId: sessao.aparelhoId, operadorId: sessao.operadorId, abertura: { em: registro.criadaEm, trocoInicialCentavos: 0 }, fechamento: null, movimentos: [] };
    let proximo = 20;
    try {
      await legado.gravar('caixas', [caixa]);
      const armazenamento = new ArmazenamentoSqlite(async () => sqliteBanco(raw), legado);
      const checkout = new CheckoutSqlite(armazenamento, () => id(proximo++));
      await checkout.salvar({ ...completo, caixaId: caixa.id });
      const venda = await checkout.concluir();
      const estado = await armazenamento.obter<{ vendas: typeof venda[]; numeroBase: number }>('vendas');
      expect(estado).not.toBeNull();
      await armazenamento.gravar('vendas', { ...estado!, vendas: estado!.vendas.map((v) => ({ ...v, status: 'cancelada' })) });
      expect(raw.prepare('SELECT caixa_id FROM vendas WHERE id = ?').get(venda.id)).toMatchObject({ caixa_id: caixa.id });
      expect((await checkout.carregar())?.estado.concluidaId).toBe(venda.id);
      expect((await checkout.concluir()).status).toBe('cancelada');
    } finally { raw.close(); }
  });

  it('rejeita id divergente na coluna e conclusão sem venda', async () => {
    const raw = new DatabaseSync(':memory:');
    try {
      const checkout = criar(raw, new Memoria());
      await checkout.salvar(registro);
      raw.prepare('UPDATE rascunhos SET venda_id = ?').run(id(6));
      await expect(checkout.carregar()).rejects.toThrow();
      raw.prepare('UPDATE rascunhos SET venda_id = ?, payload_json = ?').run(registro.vendaId, JSON.stringify({ ...registro, estado: { ...registro.estado, concluidaId: registro.vendaId } }));
      await expect(checkout.carregar()).rejects.toThrow();
      await expect(checkout.concluir()).rejects.toThrow();
      await expect(checkout.salvar(null)).rejects.toThrow();
      expect(contagem(raw, 'rascunhos')).toBe(1);
    } finally { raw.close(); }
  });

  it('recusa recuperação quando o conteúdo da venda diverge do rascunho', async () => {
    const raw = new DatabaseSync(':memory:');
    try {
      const checkout = criar(raw, new Memoria());
      await checkout.salvar(completo);
      await checkout.concluir();
      const alterado = { ...completo, estado: { ...completo.estado, concluidaId: completo.vendaId, itens: [{ ...completo.estado.itens[0]!, descricao: 'Outro' }] } };
      raw.prepare('UPDATE rascunhos SET payload_json = ?').run(JSON.stringify(alterado));
      await expect(checkout.carregar()).rejects.toThrow();
      await expect(checkout.concluir()).rejects.toThrow();
      await expect(checkout.salvar(null)).rejects.toThrow();
      expect(contagem(raw, 'rascunhos')).toBe(1);
      expect(contagem(raw, 'vendas')).toBe(1);
      expect(contagem(raw, 'outbox')).toBe(1);
    } finally { raw.close(); }
  });

  it('reverte falha antes do COMMIT e conclui uma vez na tentativa seguinte', async () => {
    const raw = new DatabaseSync(':memory:');
    const legado = new Memoria();
    let falhaCommit = false;
    let proximo = 20;
    try {
      const conexao = sqliteBanco(raw);
      const banco = conectarTransacoes({ ...conexao, async execAsync(sql) {
        if (sql === 'COMMIT' && falhaCommit) throw new Error('falha no commit');
        await conexao.execAsync(sql);
      } });
      const checkout = new CheckoutSqlite(new ArmazenamentoSqlite(async () => banco, legado), () => id(proximo++));
      await checkout.salvar(completo);
      falhaCommit = true;
      await expect(checkout.concluir()).rejects.toThrow('falha no commit');
      falhaCommit = false;
      expect(await checkout.carregar()).toEqual(completo);
      expect(['vendas', 'itens_venda', 'pagamentos_venda', 'outbox'].map((t) => contagem(raw, t))).toEqual([0, 0, 0, 0]);
      const venda = await checkout.concluir();
      expect(await checkout.concluir()).toEqual(venda);
      expect(['vendas', 'itens_venda', 'pagamentos_venda', 'outbox'].map((t) => contagem(raw, t))).toEqual([1, 1, 2, 1]);
    } finally { raw.close(); }
  });

  it.each(['aparelhoId', 'operadorId'] as const)('recusa troca de %s durante a conclusão', async (campo) => {
    const raw = new DatabaseSync(':memory:');
    const legado = new Memoria();
    try {
      const checkout = criar(raw, legado);
      await checkout.salvar(completo);
      const obterOriginal = legado.obter.bind(legado);
      let leituras = 0;
      legado.obter = async <T>(chave: string) => {
        const valor = await obterOriginal<T>(chave);
        if (chave === 'conta' && ++leituras === 2) await legado.gravar('conta', { sessao: { ...sessao, [campo]: id(9) } });
        return valor;
      };
      await expect(checkout.concluir()).rejects.toThrow('Sessão alterada');
      expect(contagem(raw, 'vendas')).toBe(0);
      expect(contagem(raw, 'outbox')).toBe(0);
      expect(contagem(raw, 'rascunhos')).toBe(1);
    } finally { raw.close(); }
  });
});
