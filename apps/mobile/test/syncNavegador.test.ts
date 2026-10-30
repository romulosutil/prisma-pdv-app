import { expect, it } from 'vitest';
import { ArmazenamentoSyncNavegador } from '../src/dados/syncNavegador';
import type { IdentidadeLocal } from '../src/dados/estadoConta';
import { ArmazenamentoMemoria, criarContadorDeIds } from './ambiente';

const ids = Array.from({ length: 5 }, (_, i) => '00000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'));
const [contaId, lojaId, aparelhoId, operadorId, produtoId] = ids as [string, string, string, string, string];
const data = '2026-10-28T12:00:00.000Z';
const produto = { id: produtoId, lojaId, nome: 'Arroz', ean: null, precoCentavos: 2500, unidade: 'un' as const, estoque: 3000, estoqueMinimo: null, atalho: false, criadoEm: data, atualizadoEm: data, excluidoEm: null, versao: 1 };

it('persiste fila e cursor juntos e preserva pendências ao confirmar subconjunto', async () => {
  const base = new ArmazenamentoMemoria(); const novoId = criarContadorDeIds();
  const sync = new ArmazenamentoSyncNavegador(base, () => ({ contaId, lojaId, aparelhoId, operadorId }), novoId, () => new Date(data));
  await sync.gravar('produtos', [produto]); await sync.preparar();
  const id = (await sync.estado()).entradas[0]!.mutacao.id;
  await sync.gravar('produtos', [{ ...produto, nome: 'Local' }]);
  await sync.aplicarPagina({ cursor: '1', mudancas: [{ entidade: 'produto', operacao: 'upsert', dados: { ...produto, nome: 'Remoto' } }] });
  await sync.confirmar([id]); expect(await sync.obter('produtos')).toMatchObject([{ nome: 'Local' }]);
  const restante = (await sync.estado()).entradas; expect(restante).toHaveLength(1);
  await expect(sync.aplicarPagina({ cursor: '0', mudancas: [] })).rejects.toThrow();
  expect((await sync.estado()).cursor).toBe('1');
  await sync.confirmar([restante[0]!.mutacao.id]); expect(await sync.obter('produtos')).toMatchObject([{ nome: 'Remoto' }]);
});

it('isola contas e não grava ao consultar antes do login', async () => {
  const base = new ArmazenamentoMemoria(); let identidade: IdentidadeLocal | null = null;
  const sync = new ArmazenamentoSyncNavegador(base, () => identidade, criarContadorDeIds(), () => new Date(data));
  expect(await sync.obter('produtos')).toBeNull(); expect((await sync.estado()).entradas).toEqual([]); expect(base.dados.size).toBe(0);
  await expect(sync.gravar('produtos', [produto])).rejects.toThrow();
  identidade = { contaId, lojaId, aparelhoId, operadorId };
  await sync.gravar('produtos', [produto]); const a = await sync.estado();
  identidade = { contaId: '00000000-0000-4000-8000-000000000011', lojaId: '00000000-0000-4000-8000-000000000012', aparelhoId, operadorId };
  expect((await sync.estado()).entradas).toEqual([]);
  await sync.gravar('produtos', [{ ...produto, lojaId: identidade.lojaId, nome: 'B' }]);
  identidade = { contaId, lojaId, aparelhoId, operadorId };
  expect((await sync.estado()).entradas).toEqual(a.entradas); expect(await sync.obter('produtos')).toMatchObject([{ nome: 'Arroz' }]);
});

it('recusa metadados corrompidos sem sobrescrever a origem', async () => {
  const base = new ArmazenamentoMemoria();
  const sync = new ArmazenamentoSyncNavegador(base, () => ({ contaId, lojaId, aparelhoId, operadorId }), criarContadorDeIds(), () => new Date(data));
  await sync.gravar('produtos', [produto]);
  const endereco = 'sync_v1:' + JSON.stringify([contaId, lojaId]);
  const registro = JSON.parse(base.dados.get(endereco)!); registro.entradas[0].tentativas = -1;
  base.dados.set(endereco, JSON.stringify(registro)); const original = base.dados.get(endereco);
  await expect(sync.estado()).rejects.toThrow(); expect(base.dados.get(endereco)).toBe(original);
});

it('falha no commit não publica agregado nem cursor', async () => {
  class Falhavel extends ArmazenamentoMemoria {
    falhar = false;
    override async gravar<T>(chave: string, valor: T): Promise<void> {
      if (this.falhar && chave.startsWith('sync_v1:')) throw new Error('falha');
      await super.gravar(chave, valor);
    }
  }
  const base = new Falhavel();
  const sync = new ArmazenamentoSyncNavegador(base, () => ({ contaId, lojaId, aparelhoId, operadorId }), criarContadorDeIds(), () => new Date(data));
  await sync.preparar(); base.falhar = true;
  await expect(sync.gravar('produtos', [produto])).rejects.toThrow('falha');
  await expect(sync.aplicarPagina({ cursor: '1', mudancas: [{ entidade: 'produto', operacao: 'upsert', dados: produto }] })).rejects.toThrow('falha');
  base.falhar = false;
  expect(await sync.obter('produtos')).toEqual([]);
  expect(await sync.estado()).toMatchObject({ cursor: '0', entradas: [] });
});
