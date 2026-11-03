import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function compararRestauracao(origem, destino) {
  function ler(texto) {
    assert.ok(texto.includes('R5_SNAPSHOT_BEGIN') && texto.includes('R5_SNAPSHOT_END'), 'Snapshot incompleto');
    const linhas = texto.split(/\r?\n/).map(s => s.trim()).filter(s => /^(tabela|schema_colunas|schema_constraints|schema_indices|sequencia|financeiro|integridade|dataset)\|/.test(s));
    const dataset = linhas.filter(s => s.startsWith('dataset|'));
    assert.equal(dataset.length, 1, 'Dataset ausente ou repetido');
    assert.match(dataset[0], /^dataset\|\d+\|\d+\|[a-f0-9]{32}\|xml_validos=true$/);
    const tabelas = linhas.filter(s => s.startsWith('tabela|'));
    assert.equal(tabelas.length, Number(dataset[0].split('|')[1]), 'Número de tabelas incompleto');
    for (const tabela of ['usuarios', 'operadores', 'caixas', 'vendas', 'movimentos_caixa', 'movimentos_estoque', 'clientes', 'eventos_fiado', 'solicitacoes_suporte']) assert.ok(tabelas.some(s => s.startsWith(`tabela|public.${tabela}|`)), `Tabela R5 ausente: ${tabela}`);
    for (const prefixo of ['schema_colunas|', 'schema_constraints|', 'schema_indices|', 'financeiro|', 'integridade|']) assert.equal(linhas.filter(s => s.startsWith(prefixo)).length, 1, `Verificação ausente: ${prefixo}`);
    const integridade = JSON.parse(linhas.find(s => s.startsWith('integridade|')).slice('integridade|'.length));
    assert.ok(Object.keys(integridade).length >= 4 && Object.values(integridade).every(v => v === 0), 'Integridade financeira divergente');
    return linhas.sort();
  }
  const a = ler(origem), b = ler(destino);
  assert.deepEqual(b, a, 'Restauração diverge da origem');
  return { resultado: 'PASS', verificacoes: a.length, limite: 'Comparação de snapshots; origem deve permanecer sem escritas entre backup e coleta' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [origem, destino, saida] = process.argv.slice(2);
  const resultado = compararRestauracao(await readFile(origem, 'utf8'), await readFile(destino, 'utf8'));
  if (saida) await writeFile(saida, JSON.stringify(resultado, null, 2) + '\n');
  console.log(JSON.stringify(resultado, null, 2));
}
