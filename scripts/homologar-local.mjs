#!/usr/bin/env node
/**
 * Roda os cenários HTTP de scripts/homologar-equipe.mts (F08, --f13, --troca-aparelho) e scripts/homologar-gestao.mts (F14)
 * contra uma API local descartável (scripts/homologar-local-api.mts: PGlite em memória, modo desenvolvimento, porta livre).
 *
 * Uso: node scripts/homologar-local.mjs        (Node >= 24, sem dependências novas; exige `npm ci` feito para o tsx da API)
 *
 * - Cria contas sintéticas (*@example.test) pela própria API: um dono por execução de script (os scripts abrem aparelhos,
 *   turnos e filiais, e o F08 precisa de turnos "alheios"), operador/gerente por convite e uma empresa B existente para o F14.
 * - `--troca-aparelho`: o "celular" é uma sessão criada aqui; ao ver AGUARDANDO_RETOMADA o orquestrador devolve o turno
 *   ao celular (POST /caixas/:id/aparelho) e libera o script com uma linha no stdin.
 * - A API limita pedidos de código a 1 por 60 s por e-mail e 20 por 15 min por IP (todos os scripts usam 127.0.0.1). Os scripts
 *   locais não esperam esse intervalo, então, enquanto um script roda, o relógio de desenvolvimento da API local é avançado
 *   ~61 s a cada 300 ms (POST /dev/relogio/avancar, só existe fora de produção). O relógio é descartável com a API.
 * - Saída: exit 1 se algum script der FAIL ou falhar; INCONCLUSIVO (exit 2 do script) também falha, exceto checks
 *   listados em INCONCLUSIVO_TOLERADO (vazio: nada é tolerado, nenhuma seção fica de fora).
 * - Relatórios JSON/CSV vão para um diretório temporário (removido ao final; PDV_HOMOLOGAR_LOCAL_MANTER=1 preserva).
 *   Nenhum código, token ou e-mail é impresso: só nomes de checks e contagens.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Nomes (substring) de checks INCONCLUSIVO aceitos por não serem suportados localmente. */
const INCONCLUSIVO_TOLERADO = [];
const inicioGeral = Date.now();
const tempo = () => ((Date.now() - inicioGeral) / 1000).toFixed(1) + 's';
const log = (m) => console.log(`[${tempo()}] ${m}`);
const mascarar = (t) => String(t).replace(/\d{6}/g, '######');

const dir = await mkdtemp(join(tmpdir(), 'pdv-homologar-local-'));
let api = null;
let url = '';
let contador = 0;
const unico = Date.now().toString(36);
const email = (papel) => `${papel}-${unico}-${++contador}@example.test`;
const documento = () => String(40_000_000_000 + Math.floor(Math.random() * 9_000_000_000) + (++contador));

async function http(metodo, caminho, { token, corpo } = {}) {
  const r = await fetch(url + caminho, {
    method: metodo,
    headers: { ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(30_000),
  });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* corpo não JSON */ }
  return { status: r.status, corpo: json };
}
function exigir(r, status, etapa) {
  if (r.status !== status) throw new Error(`Preparação falhou em ${etapa}: HTTP ${r.status}/${r.corpo?.erro ?? '?'}`);
  return r.corpo;
}

async function subirApi() {
  api = spawn(process.execPath, ['--import', 'tsx', join(RAIZ, 'scripts', 'homologar-local-api.mts')], {
    cwd: RAIZ, stdio: ['pipe', 'pipe', 'inherit'], env: { ...process.env, NODE_ENV: 'development' },
  });
  const porta = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('API local não ficou pronta em 90 s.')), 90_000);
    api.once('exit', (c) => { clearTimeout(t); reject(new Error('API local encerrou antes de ficar pronta (código ' + c + ').')); });
    createInterface({ input: api.stdout }).on('line', (l) => { const m = /^PDV_API_PORTA=(\d+)$/.exec(l); if (m) { clearTimeout(t); resolve(Number(m[1])); } });
  });
  url = 'http://127.0.0.1:' + porta;
  for (let i = 0; i < 50; i++) {
    try { const s = await http('GET', '/saude'); if (s.status === 200 && s.corpo?.status === 'ok') return; } catch { /* aguardando */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('GET /saude não respondeu ok.');
}
async function pararApi() {
  if (!api || api.exitCode !== null) return;
  const saiu = new Promise((r) => api.once('exit', r));
  api.stdin.end();
  api.kill('SIGTERM');
  await Promise.race([saiu, new Promise((r) => setTimeout(r, 5000))]);
  if (api.exitCode === null) api.kill('SIGKILL');
}

// ---------- preparação de contas ----------
async function criarDono(rotulo) {
  const e = email(rotulo);
  const s = exigir(await http('POST', '/contas', { corpo: { email: e, nomeResponsavel: 'Dono Sintetico', nomeLoja: 'Loja sintetica ' + rotulo, documento: documento(), aparelhoId: randomUUID(), aparelhoNome: 'preparacao ' + rotulo } }), 201, 'criar dono ' + rotulo);
  return { email: e, sessao: s };
}
async function convidar(dono, papel) {
  const e = email(papel);
  const c = exigir(await http('POST', '/equipe/convites', { token: dono.sessao.token, corpo: { email: e, nome: papel + ' sintetico', papel } }), 201, 'convidar ' + papel);
  return { email: e, operadorId: c.operadorId };
}
/** Login de pessoa convidada em um aparelho próprio (o "celular"), aceitando o convite. */
async function loginCelular(pessoa) {
  const cod = exigir(await http('POST', '/auth/codigo', { corpo: { email: pessoa.email } }), 200, 'pedir código');
  if (!cod?.codigo) throw new Error('A API local não devolveu o código de desenvolvimento.');
  return exigir(await http('POST', '/auth/login', { corpo: { email: pessoa.email, codigo: cod.codigo, aparelhoId: randomUUID(), aparelhoNome: 'celular sintetico', operadorId: pessoa.operadorId, aceitarConvite: true } }), 200, 'login celular');
}
/** Avança o relógio da API local para vencer os limites de emissão de código (ver cabeçalho). */
function iniciarRelogioRapido() {
  let ocupado = false;
  const t = setInterval(() => {
    if (ocupado) return;
    ocupado = true;
    http('POST', '/dev/relogio/avancar', { corpo: { dias: 61 / 86_400 } }).catch(() => {}).finally(() => { ocupado = false; });
  }, 300);
  return () => clearInterval(t);
}
async function abrirTurno(token, troco = 5000) {
  const id = randomUUID();
  exigir(await http('POST', '/caixas/reservar', { token, corpo: { id, trocoInicialCentavos: troco } }), 200, 'abrir turno');
  return id;
}

// ---------- execução dos scripts ----------
async function executar(nome, script, args, relatorio, aoLinha) {
  const inicio = Date.now();
  const arquivo = join(dir, relatorio);
  log(`>>> ${nome}`);
  const filho = spawn(process.execPath, [join(RAIZ, 'scripts', script), url, arquivo, ...args], {
    cwd: RAIZ, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PDV_HOMOLOGAR_LOCAL: '1' },
  });
  await http('POST', '/dev/relogio/avancar', { corpo: { dias: 61 / 86_400 } });
  const pararRelogio = iniciarRelogioRapido();
  const escrever = (linha) => filho.stdin.write(linha + '\n');
  createInterface({ input: filho.stdout }).on('line', (l) => aoLinha?.(l, escrever));
  createInterface({ input: filho.stderr }).on('line', (l) => console.log('    [stderr] ' + mascarar(l)));
  if (!aoLinha) filho.stdin.end();
  const codigo = await new Promise((resolve) => {
    const t = setTimeout(() => { filho.kill('SIGKILL'); resolve(-1); }, 10 * 60_000);
    filho.once('exit', (c) => { clearTimeout(t); resolve(c ?? -1); });
  });
  pararRelogio();
  let checks = [];
  try { checks = JSON.parse(await readFile(arquivo, 'utf8')).checks ?? []; } catch { /* relatório ausente: falha abaixo */ }
  const cont = { PASS: 0, FAIL: 0, SKIP: 0, INCONCLUSIVO: 0 };
  for (const c of checks) cont[c.resultado]++;
  const toleraveis = checks.filter((c) => c.resultado === 'INCONCLUSIVO' && INCONCLUSIVO_TOLERADO.some((t) => c.nome.includes(t)));
  const inconclusivosReais = cont.INCONCLUSIVO - toleraveis.length;
  const ok = checks.length > 0 && cont.FAIL === 0 && inconclusivosReais === 0 && (codigo === 0 || codigo === 2);
  for (const c of checks.filter((x) => x.resultado === 'FAIL' || (x.resultado === 'INCONCLUSIVO' && !toleraveis.includes(x)))) {
    console.log(`    ${c.resultado}: ${mascarar(c.nome)} -> esperado ${mascarar(c.esperado)}; obtido ${mascarar(c.obtido)}`);
  }
  log(`<<< ${nome}: exit=${codigo} PASS=${cont.PASS} FAIL=${cont.FAIL} SKIP=${cont.SKIP} INCONCLUSIVO=${cont.INCONCLUSIVO} (${((Date.now() - inicio) / 1000).toFixed(1)}s) ${ok ? 'OK' : 'FALHOU'}`);
  return { nome, ok, cont };
}

const resultados = [];
let erroFatal = null;
try {
  log('Subindo a API local descartável');
  await subirApi();
  log('API pronta');

  // F08: o dono precisa de um turno aberto para o operador tentar acessar um turno alheio.
  {
    const dono = await criarDono('dono-f08');
    const op = await convidar(dono, 'operador');
    await abrirTurno(dono.sessao.token);
    resultados.push(await executar('Equipe F08 (isolamento entre operadores e empresas)', 'homologar-equipe.mts',
      ['--dono', dono.email, '--operador', op.email, '--empresa-b', email('empresa-b')], 'equipe-f08.json'));
  }
  // F13: o operador tem turno aberto em outro aparelho (o celular); o aparelho HTTP tenta reservar de novo.
  {
    const dono = await criarDono('dono-f13');
    const op = await convidar(dono, 'operador');
    const celular = await loginCelular(op);
    await abrirTurno(celular.token);
    resultados.push(await executar('Equipe F13 (reservas concorrentes recusadas)', 'homologar-equipe.mts',
      ['--dono', dono.email, '--operador', op.email, '--f13'], 'equipe-f13.json'));
  }
  // Troca de aparelho: o script move o turno para o aparelho HTTP; aqui o "celular" o retoma.
  {
    const dono = await criarDono('dono-troca');
    const op = await convidar(dono, 'operador');
    const celular = await loginCelular(op);
    const turnoId = await abrirTurno(celular.token);
    let aparelhoHttp = null;
    resultados.push(await executar('Equipe troca de aparelho (retomada pelo celular)', 'homologar-equipe.mts',
      ['--dono', dono.email, '--operador', op.email, '--troca-aparelho'], 'equipe-troca.json', (l, escrever) => {
        const m = /^aparelhoHttpId=([0-9a-f-]{36})$/.exec(l);
        if (m) aparelhoHttp = m[1];
        if (l === 'AGUARDANDO_RETOMADA') {
          void http('POST', `/caixas/${turnoId}/aparelho`, { token: celular.token, corpo: { aparelhoAnteriorId: aparelhoHttp, motivo: 'Retomada pelo celular sintetico', confirmarSincronizacaoAnterior: true } })
            .then((r) => { if (r.status !== 200) console.log('    retomada pelo celular falhou: HTTP ' + r.status + '/' + (r.corpo?.erro ?? '?')); })
            .finally(() => escrever(''));
        }
      }));
  }
  // F14 gestão: dono, gerente (caixa), operador comum e dono de outra empresa já existente.
  {
    const dono = await criarDono('dono-f14');
    const gerente = await convidar(dono, 'gerente');
    const op = await convidar(dono, 'operador');
    const b = await criarDono('dono-b-f14');
    resultados.push(await executar('Gestão F14 (estoque, fiado, concorrência, relatório/CSV, lojas)', 'homologar-gestao.mts',
      ['--dono', dono.email, '--gerente', gerente.email, '--operador', op.email, '--empresa-b', b.email], 'gestao-f14.json'));
  }
} catch (e) {
  erroFatal = e;
  console.error('ERRO: ' + mascarar(e instanceof Error ? e.message : e));
} finally {
  await pararApi();
  if (process.env.PDV_HOMOLOGAR_LOCAL_MANTER === '1') log('Relatórios mantidos em ' + dir);
  else await rm(dir, { recursive: true, force: true });
}

console.log('\nResumo (' + tempo() + ')');
for (const r of resultados) console.log(`  ${r.ok ? 'OK    ' : 'FALHOU'} ${r.nome}: PASS=${r.cont.PASS} FAIL=${r.cont.FAIL} SKIP=${r.cont.SKIP} INCONCLUSIVO=${r.cont.INCONCLUSIVO}`);
process.exit(erroFatal || resultados.length < 4 || resultados.some((r) => !r.ok) ? 1 : 0);
