import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const ORIGENS_CONHECIDAS = ['https://aladdin-pdv-api.jicnzg.easypanel.host', 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host'];
export const CONTATO_PUBLICO = 'contato@prumo.services';
// Páginas exigidas pela Play (política, exclusão de conta e termos). Ausência (404) conta como FAIL: sem elas o piloto não pode expandir.
export const PAGINAS_PUBLICAS = ['/privacidade', '/exclusao-de-conta', '/termos'];
const CASOS_HTTP = [['/saude', 200], ['/dev/relogio/avancar', 404], ['/suporte/solicitacoes', 401], ['/suporte/exportacao', 401]];

/** Só GET, sem redirecionamento para outro host, sem relaxar TLS e sem enviar e-mail. `buscar` existe para teste sem rede. */
export async function verificarOperacao(origem, buscar = fetch) {
  assert.ok(ORIGENS_CONHECIDAS.includes(origem), 'Use somente uma origem PDV conhecida.');
  const requisitar = caminho => buscar(origem + caminho, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  const casos = [];
  for (const [caminho, status] of CASOS_HTTP) {
    const inicio = performance.now();
    const resposta = await requisitar(caminho);
    let valido = resposta.status === status;
    const horaServidor = caminho === '/saude' ? resposta.headers.get('x-pdv-agora') : null;
    if (caminho === '/saude' && valido) valido = JSON.stringify(await resposta.json()) === JSON.stringify({ status: 'ok' }) && typeof horaServidor === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(horaServidor) && Number.isFinite(Date.parse(horaServidor));
    casos.push({ caminho, esperado: status, status: resposta.status, resultado: valido ? 'PASS' : 'FAIL', ...(horaServidor ? { horaServidor } : {}), duracaoMs: Math.round(performance.now() - inicio) });
  }
  for (const caminho of PAGINAS_PUBLICAS) {
    const inicio = performance.now();
    const resposta = await requisitar(caminho);
    const tipo = resposta.headers.get('content-type') ?? '';
    const corpo = resposta.status === 200 ? await resposta.text() : '';
    const falhas = [];
    if (resposta.status !== 200) falhas.push(`status ${resposta.status}`);
    else {
      if (!/^text\/html\b/i.test(tipo)) falhas.push('content-type não é text/html');
      if (!corpo.toLowerCase().includes(CONTATO_PUBLICO)) falhas.push('sem contato público');
    }
    // O corpo nunca é impresso; só o motivo da falha.
    casos.push({ caminho, esperado: 200, status: resposta.status, resultado: falhas.length ? 'FAIL' : 'PASS', ...(falhas.length ? { motivo: falhas.join('; ') } : {}), duracaoMs: Math.round(performance.now() - inicio) });
  }
  return { coletadoEm: new Date().toISOString(), origem, resultado: casos.every(c => c.resultado === 'PASS') ? 'PASS' : 'FAIL', casos, limite: 'HTTP sem sessão; não valida OTP, worker, backup, migrações ou Android físico' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [origem, saida] = process.argv.slice(2);
  const resultado = await verificarOperacao(origem);
  if (saida) await writeFile(saida, JSON.stringify(resultado, null, 2) + '\n');
  console.log(JSON.stringify(resultado, null, 2));
  if (resultado.resultado !== 'PASS') process.exitCode = 1;
}
