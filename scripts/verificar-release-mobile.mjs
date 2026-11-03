import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function verificarRelease(bundle, host, mapa) {
  assert.match(host, /^(aladdin-pdv-api(?:-homologacao)?\.jicnzg\.easypanel\.host)$/);
  const bytes = await readFile(bundle), texto = bytes.toString('utf8');
  assert.ok(texto.includes(host), 'Host conectado ausente');
  const diagnosticoPiloto = host === 'aladdin-pdv-api-homologacao.jicnzg.easypanel.host';
  assert.equal(texto.includes('pdv_diagnostico_homologacao_v1'), diagnosticoPiloto, diagnosticoPiloto ? 'Diagnóstico de homologação ausente' : 'Diagnóstico de homologação presente em produção');
  for (const marca of ['tok_mock_', 'txn_mock_', 'pix.simulado.invalid', 'Simular bip', 'Simular pagamento recebido', 'Zerar dados do app', 'Copiar diagn', 'Limpar diagn', 'Relógio de teste']) assert.ok(!texto.includes(marca), `Ferramenta/simulação no release: ${marca}`);
  for (const marca of ['/suporte/solicitacoes', '/suporte/exportacao', 'versaoPoliticas', 'x-pdv-agora']) assert.ok(texto.includes(marca), `Recurso do piloto ausente: ${marca}`);
  let fontes = null;
  if (mapa) {
    const { sources } = JSON.parse(await readFile(mapa, 'utf8'));
    assert.ok(Array.isArray(sources)); fontes = sources.length;
    if (diagnosticoPiloto) for (const modulo of ['nucleo.ts', 'captura.tsx', 'TelaDiagnostico.tsx']) assert.ok(sources.some(f => f.endsWith(`/telemetria/${modulo}`)), `Módulo de diagnóstico ausente: ${modulo}`);
    for (const fonte of sources) {
      assert.ok(!/\/(?:servicos\/(?:backendLocal|catalogoDemo|provedoresPagamento)|dados\/(?:semente|relogio)|componentes\/FormularioCartao|diagnostico\/[^/]+)\.[tj]sx?$/.test(fonte) && !/packages\/shared\/src\/billing\.ts$/.test(fonte), `Implementação de teste no grafo: ${fonte}`);
      if (host === 'aladdin-pdv-api.jicnzg.easypanel.host') assert.ok(!/\/telemetria\/[^/]+\.[tj]sx?$/.test(fonte), `Diagnóstico de homologação no grafo de produção: ${fonte}`);
    }
  }
  return { resultado: 'PASS', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), host, fontes, escopo: 'inspeção estática; não comprova Android físico, assinatura ou API compatível' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [bundle, host, mapa, saida] = process.argv.slice(2);
  const resultado = await verificarRelease(bundle, host, mapa);
  if (saida) await writeFile(saida, JSON.stringify(resultado, null, 2) + '\n');
  console.log(JSON.stringify(resultado, null, 2));
}
