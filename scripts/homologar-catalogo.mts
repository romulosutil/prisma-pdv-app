import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { abrirPglite } from '../apps/api/src/db/conexao';
import { criarOpenFoodFacts } from '../apps/api/src/fontes/openFoodFacts';
import { consultarEan } from '../apps/api/src/servicos/catalogoEan';

// Fumaça técnica, não uma medição de cobertura de mercadinho ou de rede móvel.
// Três consultas sequenciais; a segunda passagem usa somente o cache próprio.
const amostra = [
  { ean: '3017620422003', referencia: 'Nutella' },
  { ean: '5449000000996', referencia: 'Coca-Cola' },
  { ean: '7894900010015', referencia: 'Coca-Cola Brasil' },
];
const banco = await abrirPglite();
let requisicoes = 0;
const fonte = criarOpenFoodFacts(async (url, init) => {
  requisicoes++;
  return fetch(url, { ...init, headers: { ...init?.headers, 'User-Agent': process.env.OFF_USER_AGENT ?? 'PrismaPDV/0.1 (local catalogue compatibility test)' } });
});
try {
  const linhas = [];
  for (const p of amostra) {
    let falha = false;
    const inicio = performance.now();
    const resultado = await consultarEan(banco.db, p.ean, { fontes: [fonte], agora: new Date(), orcamentoMs: 2000, aviso: () => { falha = true; } });
    const duracaoMs = Math.round(performance.now() - inicio);
    const antes = requisicoes, inicioCache = performance.now();
    const cache = resultado ? await consultarEan(banco.db, p.ean, { fontes: [fonte], agora: new Date(), aviso: () => {} }) : null;
    linhas.push({ ...p, nomeRetornado: resultado?.nome ?? null, fonte: resultado?.fonte ?? null, duracaoMs, falhaOuTimeout: falha,
      cadastroManualDisponivel: resultado === null, cacheMs: cache ? Math.round(performance.now() - inicioCache) : null, cacheSemNovaConsulta: cache ? requisicoes === antes : null });
  }
  const evidencia = { executadoEm: new Date().toISOString(), ambiente: 'Node local + PGlite temporário + HTTPS Open Food Facts',
    redeMovel: false, amostraDeCampo100Produtos: false, requisicoesExternas: requisicoes, resultados: linhas };
  await mkdir(new URL('../builds/', import.meta.url), { recursive: true });
  await writeFile(new URL('../builds/r4-catalogo-externo.json', import.meta.url), JSON.stringify(evidencia, null, 2) + '\n');
  console.log(JSON.stringify(evidencia, null, 2));
} finally { await banco.fechar(); }
