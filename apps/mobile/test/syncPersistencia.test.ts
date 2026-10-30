import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { RepositorioSyncSqlite } from '../src/dados/sqlite/syncSqlite';
import { ArmazenamentoMemoria, criarContadorDeIds } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

const ids = Array.from({ length: 5 }, (_, i) => '00000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'));
const [contaId, lojaId, aparelhoId, operadorId, produtoId] = ids as [string, string, string, string, string];
const data = '2026-10-28T12:00:00.000Z';
const produto = { id: produtoId, lojaId, nome: 'Arroz', ean: null, precoCentavos: 2500, unidade: 'un' as const, estoque: 3000, estoqueMinimo: null, atalho: false, criadoEm: data, atualizadoEm: data, excluidoEm: null, versao: 1 };

it('reabre fila, protege edição pendente e aplica remoto após último ACK', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pdv-sync-')); const arquivo = join(dir, 'dados.sqlite');
  let raw = new DatabaseSync(arquivo); const base = new ArmazenamentoMemoria(); const novoId = criarContadorDeIds();
  await base.gravar('conta', { sessao: { token: 'segredo', contaId, lojaId, aparelhoId, operadorId } });
  try {
    let storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base); storage.configurarSync(novoId, () => new Date(data));
    let sync = new RepositorioSyncSqlite(storage, novoId, () => new Date(data));
    await storage.gravar('produtos', [produto]); await sync.preparar(); await sync.preparar();
    const primeira = (await sync.estado()).entradas[0]!.mutacao.id;
    await storage.gravar('produtos', [{ ...produto, nome: 'Local' }]);
    await sync.aplicarPagina({ cursor: '1', mudancas: [{ entidade: 'produto', operacao: 'upsert', dados: { ...produto, nome: 'Remoto' } }] });
    await sync.confirmar([primeira]);
    expect(await storage.obter('produtos')).toMatchObject([{ nome: 'Local' }]);
    raw.close(); raw = new DatabaseSync(arquivo);
    storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base); sync = new RepositorioSyncSqlite(storage, novoId, () => new Date(data));
    const estado = await sync.estado(); expect(estado.entradas).toHaveLength(1); expect(estado.cursor).toBe('1');
    expect(await sync.exportar()).not.toContain('segredo');
    await sync.confirmar([estado.entradas[0]!.mutacao.id]);
    expect(await storage.obter('produtos')).toMatchObject([{ nome: 'Remoto' }]);
    await sync.preparar(); expect((await sync.estado()).entradas).toHaveLength(0);
  } finally { raw.close(); rmSync(dir, { recursive: true, force: true }); }
});

it('reverte página e cursor em falha SQLite e não produz eco ao aplicar pull', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pdv-pagina-')); const arquivo = join(dir, 'dados.sqlite');
  let falhar = false; let raw = new DatabaseSync(arquivo); const base = new ArmazenamentoMemoria(); const novoId = criarContadorDeIds();
  await base.gravar('conta', { sessao: { token: 'segredo', contaId, lojaId, aparelhoId, operadorId } });
  try {
    let storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw, (sql) => falhar && sql.startsWith('INSERT INTO estado_local')), base);
    let sync = new RepositorioSyncSqlite(storage, novoId, () => new Date(data)); await sync.preparar();
    const pagina = { cursor: '1', mudancas: [{ entidade: 'produto' as const, operacao: 'upsert' as const, dados: produto }] };
    falhar = true; await expect(sync.aplicarPagina(pagina)).rejects.toThrow(); falhar = false;
    raw.close(); raw = new DatabaseSync(arquivo);
    storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base); sync = new RepositorioSyncSqlite(storage, novoId, () => new Date(data));
    expect(await storage.obter('produtos')).toEqual([]); expect((await sync.estado()).cursor).toBe('0');
    await sync.aplicarPagina(pagina); await sync.preparar();
    expect(await storage.obter('produtos')).toMatchObject([{ nome: 'Arroz' }]); expect((await sync.estado()).entradas).toEqual([]);
  } finally { raw.close(); rmSync(dir, { recursive: true, force: true }); }
});

it('bootstrap legado conserva IDs após reinício e aplica caixa antes de venda com FK', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pdv-bootstrap-')); const arquivo = join(dir, 'dados.sqlite');
  let raw = new DatabaseSync(arquivo); const base = new ArmazenamentoMemoria(); const novoId = criarContadorDeIds();
  await base.gravar('conta', { sessao: { token: 'segredo', contaId, lojaId, aparelhoId, operadorId } }); await base.gravar('produtos', [produto]);
  try {
    let storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base); let sync = new RepositorioSyncSqlite(storage, novoId, () => new Date(data));
    await sync.preparar(); const entradas = (await sync.estado()).entradas;
    raw.close(); raw = new DatabaseSync(arquivo);
    storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base); sync = new RepositorioSyncSqlite(storage, novoId, () => new Date(data));
    await sync.preparar(); expect((await sync.estado()).entradas).toEqual(entradas);
    const caixaId = '00000000-0000-4000-8000-000000000030';
    const caixa = { id: caixaId, lojaId, aparelhoId, operadorId, abertura: { em: data, trocoInicialCentavos: 0 }, fechamento: null, movimentos: [] };
    const venda = { id: '00000000-0000-4000-8000-000000000031', lojaId, aparelhoId, operadorId, caixaId, criadaEm: data, status: 'concluida' as const, totalCentavos: 2500,
      itens: [{ id: '00000000-0000-4000-8000-000000000032', produtoId, descricao: 'Arroz', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, totalCentavos: 2500 }],
      pagamentos: [{ id: '00000000-0000-4000-8000-000000000033', meio: 'dinheiro' as const, provedor: null, valorCentavos: 2500, trocoCentavos: 0 }] };
    await sync.aplicarPagina({ cursor: '2', mudancas: [{ entidade: 'venda', operacao: 'upsert', dados: venda }, { entidade: 'caixa', operacao: 'upsert', dados: caixa }] });
    expect(await storage.obter('vendas')).toMatchObject({ vendas: [{ id: venda.id, caixaId }] });
    expect((await sync.estado()).entradas).toEqual(entradas);
  } finally { raw.close(); rmSync(dir, { recursive: true, force: true }); }
});

it('isola contas e mantém leitura vazia antes de login', async () => {
  const raw = new DatabaseSync(':memory:'); const base = new ArmazenamentoMemoria(); const novoId = criarContadorDeIds();
  const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base); storage.configurarSync(novoId, () => new Date(data));
  const sync = new RepositorioSyncSqlite(storage, novoId, () => new Date(data));
  try {
    expect(await sync.estado()).toMatchObject({ entradas: [], cursor: '0' }); expect(await storage.obter('produtos')).toBeNull();
    await base.gravar('conta', { sessao: { token: 'a', contaId, lojaId, aparelhoId, operadorId } });
    await storage.gravar('produtos', [produto]); const a = await sync.estado();
    const contaB = '00000000-0000-4000-8000-000000000011'; const lojaB = '00000000-0000-4000-8000-000000000012';
    await base.gravar('conta', { sessao: { token: 'b', contaId: contaB, lojaId: lojaB, aparelhoId, operadorId } });
    expect((await sync.estado()).entradas).toEqual([]); await storage.gravar('produtos', [{ ...produto, lojaId: lojaB, nome: 'B' }]);
    expect((await sync.estado()).entradas).toHaveLength(1);
    await base.gravar('conta', { sessao: { token: 'a', contaId, lojaId, aparelhoId, operadorId } });
    expect((await sync.estado()).entradas).toEqual(a.entradas); expect(await storage.obter('produtos')).toMatchObject([{ nome: 'Arroz' }]);
  } finally { raw.close(); }
});

it('reverte alteração local se a gravação da outbox falhar', async () => {
  const raw = new DatabaseSync(':memory:'); const base = new ArmazenamentoMemoria(); const novoId = criarContadorDeIds(); let falhar = false;
  await base.gravar('conta', { sessao: { token: 'segredo', contaId, lojaId, aparelhoId, operadorId } });
  const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw, (sql) => falhar && sql.startsWith('INSERT INTO outbox')), base);
  storage.configurarSync(novoId, () => new Date(data)); const sync = new RepositorioSyncSqlite(storage, novoId, () => new Date(data));
  try {
    await sync.preparar(); falhar = true; await expect(storage.gravar('produtos', [produto])).rejects.toThrow(); falhar = false;
    expect(await storage.obter('produtos')).toEqual([]); expect((await sync.estado()).entradas).toEqual([]);
  } finally { raw.close(); }
});

it('reverte alteração e preserva outbox quando ID de mutação colide com outro conteúdo', async () => {
  const raw = new DatabaseSync(':memory:'); const base = new ArmazenamentoMemoria();
  const mesmoId = '00000000-0000-4000-8000-000000000090';
  await base.gravar('conta', { sessao: { token: 'segredo', contaId, lojaId, aparelhoId, operadorId } });
  const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base); storage.configurarSync(() => mesmoId, () => new Date(data));
  const sync = new RepositorioSyncSqlite(storage, () => mesmoId, () => new Date(data));
  try {
    await storage.gravar('produtos', [produto]); const anterior = await sync.estado();
    await expect(storage.gravar('produtos', [{ ...produto, nome: 'Alterado' }])).rejects.toThrow('ID de mutação');
    expect(await storage.obter('produtos')).toEqual([produto]); expect(await sync.estado()).toEqual(anterior);
  } finally { raw.close(); }
});

it('preserva venda antiga e motivo em rejeição e retry, sem exportar credenciais', async () => {
  const raw = new DatabaseSync(':memory:'); const base = new ArmazenamentoMemoria(); const novoId = criarContadorDeIds();
  const antiga = '2026-10-20T12:00:00.000Z';
  const venda = { id: '00000000-0000-4000-8000-000000000020', lojaId, aparelhoId, operadorId, criadaEm: antiga, status: 'concluida', totalCentavos: 2500,
    itens: [{ id: '00000000-0000-4000-8000-000000000021', produtoId, descricao: 'Arroz', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, totalCentavos: 2500 }],
    pagamentos: [{ id: '00000000-0000-4000-8000-000000000022', meio: 'dinheiro', provedor: null, valorCentavos: 2500, trocoCentavos: 0 }] };
  await base.gravar('conta', { sessao: { token: 'segredo', contaId, lojaId, aparelhoId, operadorId } });
  await base.gravar('vendas', { vendas: [venda], numeroBase: 1 });
  const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base); const sync = new RepositorioSyncSqlite(storage, novoId, () => new Date(data));
  try {
    await sync.preparar(); const entrada = (await sync.estado()).entradas[0]!;
    await sync.rejeitar([{ id: entrada.mutacao.id, motivo: 'Venda antiga' }]);
    const exportado = await sync.exportar(); expect(exportado).toContain('Venda antiga'); expect(exportado).not.toContain('segredo');
    expect(JSON.parse(exportado).entradas[0].mutacao.dados).toMatchObject(venda);
    await sync.retentarRejeitadas(); expect((await sync.estado()).entradas[0]).toMatchObject({ mutacao: entrada.mutacao, bloqueada: false, tentativas: 0 });
  } finally { raw.close(); }
});
