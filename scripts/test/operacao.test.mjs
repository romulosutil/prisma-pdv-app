import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { compararRestauracao } from '../comparar-restauracao.mjs';
import { verificarRelease } from '../verificar-release-mobile.mjs';
import { verificarOperacao, PAGINAS_PUBLICAS, CONTATO_PUBLICO } from '../verificar-operacao.mjs';

const tabelas = ['usuarios', 'operadores', 'caixas', 'vendas', 'movimentos_caixa', 'movimentos_estoque', 'clientes', 'eventos_fiado', 'solicitacoes_suporte'];
const snapshot = () => ['R5_SNAPSHOT_BEGIN', ...tabelas.map(t => `tabela|public.${t}|0|${'a'.repeat(32)}`), 'schema_colunas|a', 'schema_constraints|b', 'schema_indices|c', 'financeiro|{}', 'integridade|{"constraints":0,"caixas":0,"pagamentos":0,"itens":0}', 'R5_SNAPSHOT_END', `dataset|9|0|${'a'.repeat(32)}|xml_validos=true`].join('\n');
test('comparador recusa snapshot parcial, tabela faltante, divergência e integridade inválida mesmo em cópias idênticas', () => {
  const s = snapshot(); assert.equal(compararRestauracao(s, s).resultado, 'PASS');
  for (const invalido of [s.replace('R5_SNAPSHOT_END', ''), s.replace('tabela|public.usuarios|0|', 'incompleto|public.usuarios|0|'), s.replace('"caixas":0', '"caixas":1')]) assert.throws(() => compararRestauracao(invalido, invalido));
  assert.throws(() => compararRestauracao(s, s.replace('schema_colunas|a', 'schema_colunas|x')));
});
test('snapshot de restauração ordena texto com COLLATE "C" (CP 152: banco restaurado en_US.utf8 x origem C mudou o checksum)', async () => {
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile(new URL('../verificar-restauracao-r5.sql', import.meta.url), 'utf8');
  const ordensDeTexto = [...sql.matchAll(/ORDER BY (to_jsonb\(t\)::text|tabela)\b([^),]*)/g)];
  assert.equal(ordensDeTexto.length, 3, 'Esperadas 3 ordenações de texto: checksum por tabela, dataset e checksum do dataset');
  for (const [trecho, , resto] of ordensDeTexto) assert.match(resto, /^\s*COLLATE "C"/, `Ordenação dependente da collation do banco: ${trecho}`);
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

// Verificador operacional: fetch simulado, sem rede. Cada rota devolve [status, content-type, corpo, cabeçalhos extras].
const ORIGEM = 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host';
const HORA = '2026-11-17T12:00:00.000Z';
const html = `<html><body>Fale com ${CONTATO_PUBLICO}</body></html>`;
const rotasOk = () => ({
  '/saude': [200, 'application/json', JSON.stringify({ status: 'ok' }), { 'x-pdv-agora': HORA }],
  '/dev/relogio/avancar': [404, 'application/json', '{}'],
  '/suporte/solicitacoes': [401, 'application/json', '{}'],
  '/suporte/exportacao': [401, 'application/json', '{}'],
  ...Object.fromEntries(PAGINAS_PUBLICAS.map(p => [p, [200, 'text/html; charset=utf-8', html]])),
});
const buscaSimulada = rotas => {
  const chamadas = [];
  const buscar = async (url, opcoes) => {
    chamadas.push({ url, opcoes });
    const caminho = new URL(url).pathname, [status, tipo, corpo, extras = {}] = rotas[caminho] ?? [404, 'text/plain', ''];
    return new Response(corpo, { status, headers: { 'content-type': tipo, ...extras } });
  };
  return { buscar, chamadas };
};
const caso = (r, caminho) => r.casos.find(c => c.caminho === caminho);

test('verificador operacional: tudo certo passa e confere saúde, rotas /dev e /suporte e as três páginas públicas, só com GET', async () => {
  const { buscar, chamadas } = buscaSimulada(rotasOk());
  const r = await verificarOperacao(ORIGEM, buscar);
  assert.equal(r.resultado, 'PASS');
  assert.deepEqual(r.casos.map(c => c.caminho), ['/saude', '/dev/relogio/avancar', '/suporte/solicitacoes', '/suporte/exportacao', ...PAGINAS_PUBLICAS]);
  assert.deepEqual(PAGINAS_PUBLICAS, ['/privacidade', '/exclusao-de-conta', '/termos']);
  assert.ok(r.casos.every(c => c.resultado === 'PASS'));
  assert.ok(chamadas.every(c => c.opcoes.method === undefined && c.opcoes.redirect === 'error' && !c.opcoes.body), 'Somente GET, sem corpo e sem seguir redirecionamento');
  assert.ok(!JSON.stringify(r).includes(CONTATO_PUBLICO), 'O corpo das páginas não é copiado para a saída');
});
test('verificador operacional: página pública ausente (404) falha com motivo e derruba o resultado', async () => {
  const rotas = rotasOk(); delete rotas['/termos'];
  const r = await verificarOperacao(ORIGEM, buscaSimulada(rotas).buscar);
  assert.equal(r.resultado, 'FAIL');
  assert.equal(caso(r, '/termos').resultado, 'FAIL');
  assert.match(caso(r, '/termos').motivo, /status 404/);
  assert.equal(caso(r, '/privacidade').resultado, 'PASS');
});
test('verificador operacional: página sem o contato público ou sem text/html falha', async () => {
  const semContato = rotasOk(); semContato['/privacidade'] = [200, 'text/html', '<html>sem contato</html>'];
  const r1 = await verificarOperacao(ORIGEM, buscaSimulada(semContato).buscar);
  assert.equal(r1.resultado, 'FAIL'); assert.match(caso(r1, '/privacidade').motivo, /sem contato público/);
  const json = rotasOk(); json['/exclusao-de-conta'] = [200, 'application/json', html];
  const r2 = await verificarOperacao(ORIGEM, buscaSimulada(json).buscar);
  assert.equal(r2.resultado, 'FAIL'); assert.match(caso(r2, '/exclusao-de-conta').motivo, /content-type/);
});
test('verificador operacional: saúde ruim (status, corpo ou hora do servidor inválidos) falha mesmo com páginas boas', async () => {
  for (const saude of [[503, 'application/json', '{}'], [200, 'application/json', JSON.stringify({ status: 'erro' }), { 'x-pdv-agora': HORA }], [200, 'application/json', JSON.stringify({ status: 'ok' })]]) {
    const r = await verificarOperacao(ORIGEM, buscaSimulada({ ...rotasOk(), '/saude': saude }).buscar);
    assert.equal(r.resultado, 'FAIL'); assert.equal(caso(r, '/saude').resultado, 'FAIL');
    assert.ok(PAGINAS_PUBLICAS.every(p => caso(r, p).resultado === 'PASS'));
  }
});
test('verificador operacional: rota /dev exposta ou suporte sem 401 falha, e origem desconhecida é recusada antes de qualquer requisição', async () => {
  const r = await verificarOperacao(ORIGEM, buscaSimulada({ ...rotasOk(), '/dev/relogio/avancar': [200, 'application/json', '{}'] }).buscar);
  assert.equal(r.resultado, 'FAIL');
  const { buscar, chamadas } = buscaSimulada(rotasOk());
  await assert.rejects(verificarOperacao('https://exemplo.invalid', buscar), /origem PDV conhecida/);
  assert.equal(chamadas.length, 0);
});
test('verificar-operacao.sql é somente leitura, traz as filas de e-mail e suporte e não seleciona dados pessoais', async () => {
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile(new URL('../verificar-operacao.sql', import.meta.url), 'utf8');
  assert.match(sql, /BEGIN TRANSACTION READ ONLY/);
  assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE)\b/i);
  for (const coluna of ['email_na_fila_mais_15min', 'email_idade_max_fila_min', 'email_falhou_24h', 'suporte_aberto_mais_24h', 'suporte_idade_max_aberto_h']) assert.ok(sql.includes(coluna), coluna);
  assert.doesNotMatch(sql, /\b(envelope|mensagem|resposta|diagnostico|email|codigo_id|conta_id)\b\s*[,\n]/i);
});
