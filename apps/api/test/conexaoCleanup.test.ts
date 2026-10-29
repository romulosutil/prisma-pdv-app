import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ migrate: vi.fn(), close: vi.fn(), end: vi.fn(), db: {} }));
vi.mock('@electric-sql/pglite', () => ({ PGlite: class { close = m.close; } }));
vi.mock('drizzle-orm/pglite', () => ({ drizzle: () => m.db }));
vi.mock('drizzle-orm/pglite/migrator', () => ({ migrate: m.migrate }));
vi.mock('postgres', () => ({ default: () => ({ end: m.end }) }));
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: () => m.db }));
vi.mock('drizzle-orm/postgres-js/migrator', () => ({ migrate: m.migrate }));
import { abrirPglite, abrirPostgres } from '../src/db/conexao';

beforeEach(() => { vi.resetAllMocks(); m.migrate.mockResolvedValue(undefined); m.close.mockResolvedValue(undefined); m.end.mockResolvedValue(undefined); });
describe.each([
  ['PGlite', () => abrirPglite(), m.close],
  ['PostgreSQL', () => abrirPostgres('postgres://localhost/pdv_test'), m.end],
] as const)('limpeza de conexão %s', (_nome, abrir, fechar) => {
  it('mantém cliente aberto após sucesso e fecha ao chamar fechar', async () => {
    const conexao = await abrir();
    expect(conexao.db).toBe(m.db); expect(fechar).not.toHaveBeenCalled();
    await conexao.fechar(); expect(fechar).toHaveBeenCalledTimes(1);
  });
  it('fecha cliente quando migração falha e preserva o erro original', async () => {
    const erro = new Error('falha de migração'); m.migrate.mockRejectedValueOnce(erro);
    await expect(abrir()).rejects.toBe(erro); expect(fechar).toHaveBeenCalledTimes(1);
  });
  it('preserva erro de migração mesmo quando fechar falha', async () => {
    const erro = new Error('falha de migração'); m.migrate.mockRejectedValueOnce(erro); fechar.mockRejectedValueOnce(new Error('falha ao fechar'));
    await expect(abrir()).rejects.toBe(erro); expect(fechar).toHaveBeenCalledTimes(1);
  });
});
