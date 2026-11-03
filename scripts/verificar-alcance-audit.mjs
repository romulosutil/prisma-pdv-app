import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path/posix';
const [auditPath, mapPath, saida] = process.argv.slice(2);
const audit = JSON.parse(await readFile(auditPath, 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const mapa = JSON.parse(await readFile(mapPath, 'utf8'));
if (!audit.vulnerabilities || !Array.isArray(mapa.sources)) throw new Error('Auditoria ou source map inválido.');
const visitados = new Set();
function resolver(origem, nome) {
  let pasta = origem;
  while (true) {
    const chave = path.join(pasta, 'node_modules', nome);
    if (lock.packages[chave]) return lock.packages[chave].link ? lock.packages[chave].resolved : chave;
    if (!pasta || pasta === '.') break;
    const proxima = path.dirname(pasta); pasta = proxima === '.' ? '' : proxima;
  }
  throw new Error(`Dependência sem resolução no lock: ${nome}`);
}
function visitar(chave) {
  if (visitados.has(chave)) return;
  const pacote = lock.packages[chave]; if (!pacote) throw new Error(`Pacote ausente: ${chave}`);
  visitados.add(chave);
  for (const nome of Object.keys({ ...pacote.dependencies, ...pacote.optionalDependencies })) visitar(resolver(chave, nome));
}
visitar('apps/api'); visitar('packages/shared');
const avisos = Object.entries(audit.vulnerabilities).map(([pacote, v]) => ({
  pacote, severidade: v.severity,
  avisosDiretos: v.via.filter(via => typeof via === 'object').map(via => ({ titulo: via.title, url: via.url, faixa: via.range })),
  caminhos: v.nodes.map(n => ({ caminho: n, versao: lock.packages[n]?.version ?? null, api: visitados.has(n), mobile: mapa.sources.some(s => s.replaceAll('\\', '/').includes(`/${n}/`)) })),
}));
// npm propaga a severidade de dependências de build ao pacote que também contém código runtime.
// Somente caminhos das próprias bibliotecas com advisory direto comprovam alcance desse advisory.
const alcancaveis = avisos.filter(v => v.avisosDiretos.length && v.caminhos.some(n => n.api || n.mobile));
const resultado = { coletadoEm: new Date().toISOString(), resultado: alcancaveis.length ? 'FAIL' : 'PASS', pacotesApi: visitados.size, fontesMobile: mapa.sources.length, avisos, limite: 'Análise do lock para dependências diretas/transitivas de produção API/shared e do grafo JS mobile. Não audita imagem base, bibliotecas nativas, Gradle, sistema operacional ou ferramentas de compilação; não declara npm audit global limpo.' };
if (saida) await writeFile(saida, JSON.stringify(resultado, null, 2) + '\n');
console.log(JSON.stringify({ resultado: resultado.resultado, pacotesApi: resultado.pacotesApi, fontesMobile: resultado.fontesMobile, avisosGlobais: avisos.length, avisosAlcancaveis: alcancaveis.map(v => v.pacote), limite: resultado.limite }, null, 2));
if (alcancaveis.length) process.exitCode = 1;
