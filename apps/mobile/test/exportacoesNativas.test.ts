import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ arquivos: new Map<string, { texto: string; em: number }>(), pastas: new Set(['cache']), compartilhar: vi.fn(), disponivel: vi.fn(), id: 0 }));
vi.mock('@/util/ids', () => ({ novoId: () => `id-${++m.id}` }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-sharing', () => ({ shareAsync: m.compartilhar, isAvailableAsync: m.disponivel }));
vi.mock('expo-file-system', () => {
  const juntar = (partes: any[]) => partes.map(p => typeof p === 'string' ? p : p.uri).join('/');
  class File {
    uri: string; constructor(...partes: any[]) { this.uri = juntar(partes); }
    get name() { return this.uri.split('/').at(-1)!; }
    get exists() { return m.arquivos.has(this.uri); }
    get lastModified() { return m.arquivos.get(this.uri)?.em ?? null; }
    create() { if (this.exists) throw new Error('existe'); m.arquivos.set(this.uri, { texto: '', em: Date.now() }); }
    write(texto: string) { m.arquivos.set(this.uri, { texto, em: Date.now() }); }
    delete() { m.arquivos.delete(this.uri); }
  }
  class Directory {
    uri: string; constructor(...partes: any[]) { this.uri = juntar(partes); }
    get exists() { return m.pastas.has(this.uri); }
    create() { m.pastas.add(this.uri); }
    list() { return [...m.arquivos.keys()].filter(f => f.slice(0, f.lastIndexOf('/')) === this.uri).map(f => new File(f)); }
  }
  return { Directory, File, Paths: { cache: 'cache' } };
});
import { compartilharJson } from '@/telas/suporte/compartilhar';
import { compartilharCsv } from '@/telas/caixa/compartilhar';
import { limparExportacoesExpiradas, PRAZO_EXPORTACAO_MS } from '@/util/exportacoes';
beforeEach(() => { m.arquivos.clear(); m.pastas.clear(); m.pastas.add('cache'); m.id = 0; vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-03T15:00:00Z')); m.disponivel.mockResolvedValue(true); m.compartilhar.mockReset().mockResolvedValue(undefined); });
afterEach(() => vi.useRealTimers());
it('destino pode ler JSON após shareAsync resolver; CSV usa outro arquivo sem sobrescrever o JSON', async () => {
  await compartilharJson('mesmo.json', '{"formato":1}');
  const uri = m.compartilhar.mock.calls[0]![0];
  expect(m.arquivos.get(uri)?.texto).toBe('{"formato":1}');
  await compartilharJson('mesmo.json', '{"formato":2}');
  expect(m.compartilhar.mock.calls[1]![0]).not.toBe(uri);
  await compartilharCsv('pdv-relatorio.csv', 'total\n100');
  expect(m.arquivos.size).toBe(3);
  expect(m.arquivos.get(uri)?.texto).toBe('{"formato":1}');
});
it('limpa só exportações vencidas, preservando as recentes e outros arquivos do cache', async () => {
  await compartilharJson('teste.json', '{}');
  const antigo = m.compartilhar.mock.calls[0]![0];
  m.arquivos.set('cache/outro.csv', { texto: 'de outro recurso', em: 0 });
  m.arquivos.set('cache/pdv-vendas.csv', { texto: 'legado', em: Date.now() });
  vi.advanceTimersByTime(PRAZO_EXPORTACAO_MS + 1);
  await compartilharCsv('novo.csv', 'novo');
  const recente = m.compartilhar.mock.calls.at(-1)![0];
  limparExportacoesExpiradas();
  expect(m.arquivos.has(antigo)).toBe(false);
  expect(m.arquivos.has('cache/pdv-vendas.csv')).toBe(false);
  expect(m.arquivos.has('cache/outro.csv')).toBe(true);
  expect(m.arquivos.has(recente)).toBe(true);
});
it('erro do chooser não elimina arquivo que já possa estar sendo consumido; expira depois', async () => {
  m.compartilhar.mockRejectedValueOnce(new Error('chooser'));
  await expect(compartilharJson('teste.json', '{}')).rejects.toThrow('chooser');
  expect(m.arquivos.size).toBe(1);
  vi.advanceTimersByTime(PRAZO_EXPORTACAO_MS + 1); limparExportacoesExpiradas();
  expect(m.arquivos.size).toBe(0);
});
