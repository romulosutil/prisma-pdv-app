// F17 (CP 153): destino indisponível, JSON entregue, expiração de 1 h do cache e arquivo de pendências separado.
// Os mocks de expo-sharing/expo-file-system seguem exportacoesNativas.test.ts; o relógio é simulado.
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
    create(opcoes?: { overwrite?: boolean }) { if (this.exists && !opcoes?.overwrite) throw new Error('existe'); m.arquivos.set(this.uri, { texto: '', em: Date.now() }); }
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
import { exportarPendencias } from '@/telas/caixa/exportarPendencias';
import { criarExportacaoTemporaria, limparExportacoesExpiradas, PRAZO_EXPORTACAO_MS } from '@/util/exportacoes';

const MIN = 60 * 1000;
beforeEach(() => {
  m.arquivos.clear(); m.pastas.clear(); m.pastas.add('cache'); m.id = 0;
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-03T15:00:00Z'));
  m.disponivel.mockResolvedValue(true); m.compartilhar.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

it('F17-e: destino indisponível lança "Compartilhamento indisponível." e não cria arquivo temporário nem pasta', async () => {
  m.disponivel.mockResolvedValue(false);
  await expect(compartilharJson('pdv-dados-confirmados.json', '{"formato":1}')).rejects.toThrow('Compartilhamento indisponível.');
  expect(m.compartilhar).not.toHaveBeenCalled();
  expect(m.arquivos.size).toBe(0);
  expect(m.pastas.has('cache/pdv-exportacoes')).toBe(false);
});

it('F17-e: falha ao consultar a disponibilidade também não deixa arquivo e a mensagem do sistema chega ao chamador', async () => {
  m.disponivel.mockRejectedValue(new Error('módulo nativo ausente'));
  await expect(compartilharJson('pdv-dados-confirmados.json', '{}')).rejects.toThrow('módulo nativo ausente');
  expect(m.compartilhar).not.toHaveBeenCalled(); expect(m.arquivos.size).toBe(0);
});

it('F17-e: indisponível, depois disponível: a segunda tentativa entrega o arquivo e só então ele existe', async () => {
  m.disponivel.mockResolvedValueOnce(false);
  await expect(compartilharJson('pdv-dados-confirmados.json', '{"n":1}')).rejects.toThrow('Compartilhamento indisponível.');
  expect(m.arquivos.size).toBe(0);
  await compartilharJson('pdv-dados-confirmados.json', '{"n":1}');
  expect(m.compartilhar).toHaveBeenCalledOnce(); expect(m.arquivos.size).toBe(1);
});

it('F17-e: erro do chooser mantém o arquivo íntegro e legível para um destino que já o abriu', async () => {
  m.compartilhar.mockRejectedValueOnce(new Error('seletor fechado'));
  await expect(compartilharJson('pdv-dados-confirmados.json', '{"formato":1}')).rejects.toThrow('seletor fechado');
  const [uri] = [...m.arquivos.keys()];
  expect(m.arquivos.get(uri!)?.texto).toBe('{"formato":1}');
});

it('F17 JSON: entrega nome seguro, mime application/json, conteúdo JSON válido e título padrão', async () => {
  const conteudo = JSON.stringify({ formato: 1, produtos: [{ nome: 'Pão' }] }, null, 2);
  await compartilharJson('pdv-dados-confirmados.json', conteudo);
  const [uri, opcoes] = m.compartilhar.mock.calls[0]!;
  expect(uri).toMatch(/^cache\/pdv-exportacoes\/\d+-id-1-pdv-dados-confirmados\.json$/);
  expect(opcoes).toMatchObject({ mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Exportar dados pessoais e comerciais' });
  expect(JSON.parse(m.arquivos.get(uri)!.texto)).toEqual({ formato: 1, produtos: [{ nome: 'Pão' }] });
});

it('F17 JSON: nome com caracteres perigosos vira nome seguro dentro da pasta de exportações', async () => {
  await compartilharJson('../../pdv dados:confirmados.json', '{}');
  const uri = m.compartilhar.mock.calls[0]![0] as string;
  expect(uri.startsWith('cache/pdv-exportacoes/')).toBe(true);
  expect(uri.slice('cache/pdv-exportacoes/'.length)).not.toMatch(/[\\/: ]/);
});

it('F17 expiração: 59 min permanece, 60 min é apagado, e arquivos recentes e de outros recursos não são tocados', async () => {
  await compartilharJson('pdv-dados-confirmados.json', '{"a":1}');
  const velho = m.compartilhar.mock.calls[0]![0] as string;
  m.arquivos.set('cache/foto-produto.json', { texto: 'outro recurso', em: 0 });
  m.arquivos.set('cache/pdv-vendas.txt', { texto: 'extensão fora do padrão', em: 0 });
  vi.advanceTimersByTime(59 * MIN);
  await compartilharJson('pdv-dados-confirmados.json', '{"b":2}');
  const recente = m.compartilhar.mock.calls[1]![0] as string;
  limparExportacoesExpiradas();
  expect(m.arquivos.has(velho)).toBe(true);
  vi.advanceTimersByTime(MIN);
  limparExportacoesExpiradas();
  expect(m.arquivos.has(velho)).toBe(false);
  expect(m.arquivos.has(recente)).toBe(true);
  expect(m.arquivos.has('cache/foto-produto.json')).toBe(true);
  expect(m.arquivos.has('cache/pdv-vendas.txt')).toBe(true);
  expect(PRAZO_EXPORTACAO_MS).toBe(60 * MIN);
});

it('F17 expiração: criar uma nova exportação já limpa as vencidas antes de gravar, sem chamada explícita', async () => {
  m.pastas.add('cache/pdv-exportacoes');
  const agora = Date.now();
  m.arquivos.set(`cache/pdv-exportacoes/${agora - 61 * MIN}-id-x-velho.json`, { texto: 'v', em: agora - 61 * MIN });
  m.arquivos.set(`cache/pdv-exportacoes/${agora - 59 * MIN}-id-y-quase.json`, { texto: 'q', em: agora - 59 * MIN });
  m.arquivos.set('cache/pdv-exportacoes/sem-data-no-nome.json', { texto: 's', em: 0 });
  const arquivo = criarExportacaoTemporaria('novo.json', '{}');
  expect([...m.arquivos.keys()].some(k => k.includes('-id-x-velho'))).toBe(false);
  expect([...m.arquivos.keys()].some(k => k.includes('-id-y-quase'))).toBe(true);
  expect(m.arquivos.has('cache/pdv-exportacoes/sem-data-no-nome.json')).toBe(true);
  expect(m.arquivos.has(arquivo.uri)).toBe(true);
});

it('F17 expiração: exportações legadas do cache raiz seguem a mesma regra de 1 h pela data de modificação', async () => {
  const agora = Date.now();
  m.arquivos.set('cache/pdv-pendencias-para-revisao.json', { texto: 'p', em: agora - 59 * MIN });
  m.arquivos.set('cache/pdv-dados-confirmados.json', { texto: 'd', em: agora - 60 * MIN });
  m.arquivos.set('cache/pdv-relatorio-mensal.csv', { texto: 'r', em: agora - 90 * MIN });
  m.arquivos.set('cache/relatorio-de-outro-app.csv', { texto: 'o', em: 0 });
  limparExportacoesExpiradas();
  expect(m.arquivos.has('cache/pdv-pendencias-para-revisao.json')).toBe(true);
  expect(m.arquivos.has('cache/pdv-dados-confirmados.json')).toBe(false);
  expect(m.arquivos.has('cache/pdv-relatorio-mensal.csv')).toBe(false);
  expect(m.arquivos.has('cache/relatorio-de-outro-app.csv')).toBe(true);
});

it('F17 pendências: a exportação do aparelho usa outro arquivo e não se mistura com a exportação confirmada', async () => {
  await compartilharJson('pdv-dados-confirmados.json', '{"escopo":"confirmado"}');
  const confirmado = m.compartilhar.mock.calls[0]![0] as string;
  await exportarPendencias('{"escopo":"pendencias"}');
  const [uriPend, opcoesPend] = m.compartilhar.mock.calls[1]!;
  expect(uriPend).toBe('cache/pdv-pendencias-para-revisao.json');
  expect(uriPend).not.toBe(confirmado);
  expect(confirmado).toContain('pdv-dados-confirmados.json');
  expect(opcoesPend).toMatchObject({ mimeType: 'application/json', dialogTitle: 'Exportar pendências para revisão' });
  expect(m.arquivos.get(confirmado)?.texto).toBe('{"escopo":"confirmado"}');
  expect(m.arquivos.get(uriPend)?.texto).toBe('{"escopo":"pendencias"}');
  await exportarPendencias('{"escopo":"pendencias","n":2}');
  expect(m.arquivos.get(uriPend)?.texto).toBe('{"escopo":"pendencias","n":2}');
  expect(m.arquivos.get(confirmado)?.texto).toBe('{"escopo":"confirmado"}');
});

it('F17 pendências: destino indisponível não cria o arquivo de pendências', async () => {
  m.disponivel.mockResolvedValue(false);
  await expect(exportarPendencias('{"escopo":"pendencias"}')).rejects.toThrow('Compartilhamento indisponível.');
  expect(m.arquivos.size).toBe(0); expect(m.compartilhar).not.toHaveBeenCalled();
});
