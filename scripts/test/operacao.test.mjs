import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { compararRestauracao } from '../comparar-restauracao.mjs';
import { verificarRelease } from '../verificar-release-mobile.mjs';

const tabelas = ['usuarios', 'operadores', 'caixas', 'vendas', 'movimentos_caixa', 'movimentos_estoque', 'clientes', 'eventos_fiado', 'solicitacoes_suporte'];
const snapshot = () => ['R5_SNAPSHOT_BEGIN', ...tabelas.map(t => `tabela|public.${t}|0|${'a'.repeat(32)}`), 'schema_colunas|a', 'schema_constraints|b', 'schema_indices|c', 'financeiro|{}', 'integridade|{"constraints":0,"caixas":0,"pagamentos":0,"itens":0}', 'R5_SNAPSHOT_END', `dataset|9|0|${'a'.repeat(32)}|xml_validos=true`].join('\n');
test('comparador recusa snapshot parcial, tabela faltante, divergência e integridade inválida mesmo em cópias idênticas', () => {
  const s = snapshot(); assert.equal(compararRestauracao(s, s).resultado, 'PASS');
  for (const invalido of [s.replace('R5_SNAPSHOT_END', ''), s.replace('tabela|public.usuarios|0|', 'incompleto|public.usuarios|0|'), s.replace('"caixas":0', '"caixas":1')]) assert.throws(() => compararRestauracao(invalido, invalido));
  assert.throws(() => compararRestauracao(s, s.replace('schema_colunas|a', 'schema_colunas|x')));
});
test('gate do bundle exige recursos/host e recusa simulador ou fonte de diagnóstico mesmo sem strings', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'pdv-r5-'));
  try {
    const bundle = join(pasta, 'app.hbc'), mapa = join(pasta, 'app.map');
    const texto = 'aladdin-pdv-api-homologacao.jicnzg.easypanel.host /suporte/solicitacoes /suporte/exportacao versaoPoliticas x-pdv-agora pdv_diagnostico_homologacao_v1';
    const fontesPiloto = ['nucleo.ts', 'captura.tsx', 'TelaDiagnostico.tsx'].map(f => `/apps/mobile/src/telemetria/${f}`);
    await writeFile(bundle, texto); await writeFile(mapa, JSON.stringify({ sources: ['/apps/mobile/src/release/registro.ts', ...fontesPiloto] }));
    assert.equal((await verificarRelease(bundle, 'aladdin-pdv-api-homologacao.jicnzg.easypanel.host', mapa)).resultado, 'PASS');
    await writeFile(bundle, texto + ' tok_mock_'); await assert.rejects(verificarRelease(bundle, 'aladdin-pdv-api-homologacao.jicnzg.easypanel.host', mapa));
    await writeFile(bundle, texto); await writeFile(mapa, JSON.stringify({ sources: ['/apps/mobile/src/diagnostico/registro.ts'] }));
    await assert.rejects(verificarRelease(bundle, 'aladdin-pdv-api-homologacao.jicnzg.easypanel.host', mapa));
    await writeFile(mapa, JSON.stringify({ sources: fontesPiloto }));
    assert.equal((await verificarRelease(bundle, 'aladdin-pdv-api-homologacao.jicnzg.easypanel.host', mapa)).resultado, 'PASS');
    await writeFile(bundle, texto.replace('aladdin-pdv-api-homologacao', 'aladdin-pdv-api'));
    await assert.rejects(verificarRelease(bundle, 'aladdin-pdv-api.jicnzg.easypanel.host', mapa));
    await writeFile(bundle, texto.replace('aladdin-pdv-api-homologacao', 'aladdin-pdv-api').replace(' pdv_diagnostico_homologacao_v1', ''));
    await writeFile(mapa, JSON.stringify({ sources: ['/apps/mobile/src/release/telemetria.ts'] }));
    assert.equal((await verificarRelease(bundle, 'aladdin-pdv-api.jicnzg.easypanel.host', mapa)).resultado, 'PASS');
  } finally {
    assert.ok(resolve(pasta).startsWith(resolve(tmpdir()) + sep) && basename(pasta).startsWith('pdv-r5-'), 'Limpeza deve ficar no temporário exclusivo do teste');
    await rm(pasta, { recursive: true, force: true });
  }
});
