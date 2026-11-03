import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const [origem, saida] = process.argv.slice(2);
assert.ok(['https://aladdin-pdv-api.jicnzg.easypanel.host', 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host'].includes(origem), 'Use somente uma origem PDV conhecida.');
const casos = [];
for (const [caminho, status] of [['/saude', 200], ['/dev/relogio/avancar', 404], ['/suporte/solicitacoes', 401], ['/suporte/exportacao', 401]]) {
  const inicio = performance.now();
  // Sem redirecionamento para outro host e sem relaxar TLS; GET não altera dados nem envia e-mail.
  const resposta = await fetch(origem + caminho, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  let valido = resposta.status === status;
  if (caminho === '/saude' && valido) valido = JSON.stringify(await resposta.json()) === JSON.stringify({ status: 'ok' });
  casos.push({ caminho, esperado: status, status: resposta.status, resultado: valido ? 'PASS' : 'FAIL', duracaoMs: Math.round(performance.now() - inicio) });
}
const resultado = { coletadoEm: new Date().toISOString(), origem, resultado: casos.every(c => c.resultado === 'PASS') ? 'PASS' : 'FAIL', casos, limite: 'HTTP sem sessão; não valida OTP, worker, backup, migrações ou Android físico' };
if (saida) await writeFile(saida, JSON.stringify(resultado, null, 2) + '\n');
console.log(JSON.stringify(resultado, null, 2));
if (resultado.resultado !== 'PASS') process.exitCode = 1;
