/**
 * Evidência HTTP do cenário F08 (docs/roteiro-piloto-android.md): isolamento entre operadores e entre empresas.
 *
 * Uso (Node >= 22.6 com remoção de tipos; no Node 24 a flag é opcional):
 *   node --experimental-strip-types scripts/homologar-equipe.mts <urlApi> <arquivoRelatorio> \
 *     --dono <email> --operador <email> --empresa-b <email> [--somente-leitura]
 *
 * --somente-leitura: só saúde, login do dono e snapshot de turnos/relatório (não exige --operador/--empresa-b;
 * pode ser repetido para a conciliação de IDs e centavos).
 *
 * Modos opt-in (exigem --dono e --operador; --empresa-b dispensado; podem ser combinados; pulam as escritas F08 e a empresa B):
 *   --f13             reservas concorrentes/repetidas do operador a partir do aparelho HTTP devem ser recusadas
 *   --troca-aparelho  move o turno aberto do operador para o aparelho HTTP (POST /caixas/:id/aparelho), imprime
 *                     `aparelhoHttpId=<id>` e `AGUARDANDO_RETOMADA`; lê uma linha do stdin após o celular retomar o turno
 *                     e só então o dono revoga o aparelho HTTP do operador.
 *
 * Códigos: sempre que um código é necessário, imprime `AGUARDANDO_CODIGO <dono|operador|empresa-b|cadastro-b>`
 * e lê UMA linha do stdin (6 dígitos). Códigos, tokens e e-mails nunca são impressos nem gravados.
 * Efeitos: login do dono/operador cria aparelhos descartáveis na empresa A (revogados ao final pelo dono);
 * a empresa B é uma conta NOVA e permanece na homologação (descartável; ids no relatório para limpeza).
 * Nenhuma venda ou movimento é criado em turno legítimo; escritas são dirigidas só ao turno alheio e,
 * se algum for aceito, o resultado é FAIL.
 * Saída: exit 1 se houver FAIL; exit 2 se não houver FAIL mas houver INCONCLUSIVO.
 * Validação local opcional: PDV_HOMOLOGAR_LOCAL=1 com URL http://127.0.0.1:<porta> (API em modo dev, que devolve o código
 * no corpo; ele é usado em silêncio e as esperas de 60 s são puladas).
 */
import assert from 'node:assert/strict';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { stdin } from 'node:process';
import { unlink, writeFile } from 'node:fs/promises';

const HOST_HOMOLOGACAO = 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host';
const INTERVALO_CODIGO_MS = 61_000;

// ---------- argumentos ----------
const argv = process.argv.slice(2);
const posicionais: string[] = [];
const opcoes: Record<string, string | true> = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--somente-leitura') opcoes.somenteLeitura = true;
  else if (a === '--f13' || a === '--troca-aparelho') opcoes[a.slice(2)] = true;
  else if (a === '--dono' || a === '--operador' || a === '--empresa-b') opcoes[a.slice(2)] = argv[++i] ?? '';
  else posicionais.push(a);
}
const [urlApi, arquivo] = posicionais;
const local = process.env.PDV_HOMOLOGAR_LOCAL === '1' && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(urlApi ?? '');
if (!local) assert.equal(urlApi, HOST_HOMOLOGACAO, 'Este roteiro só pode usar a API de homologação.');
assert.ok(arquivo, 'Informe o arquivo de relatório.');
const somenteLeitura = opcoes.somenteLeitura === true;
const modoEquipe = opcoes.f13 === true || opcoes['troca-aparelho'] === true;
let manterAparelhoOperador = false;
const emailValido = (e: unknown): e is string => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
assert.ok(emailValido(opcoes.dono), 'Informe --dono <email>.');
if (!somenteLeitura) {
  assert.ok(emailValido(opcoes.operador), 'Informe --operador <email>.');
  if (!modoEquipe) assert.ok(emailValido(opcoes['empresa-b']), 'Informe --empresa-b <email>.');
  assert.notEqual(opcoes.dono, opcoes.operador, 'Dono e operador devem ser contas diferentes.');
}
const emailDono = opcoes.dono as string;

// ---------- utilidades ----------
const hash = (prefixo: string, valor: string) => prefixo + '_' + createHash('sha256').update(valor).digest('hex').slice(0, 10);
const dormir = (ms: number) => new Promise(r => setTimeout(r, ms));
type Resposta = { status: number; corpo: any; erro: string | null };

async function http(metodo: string, caminho: string, o: { token?: string | null; corpo?: unknown; query?: Record<string, string> } = {}): Promise<Resposta> {
  const q = o.query ? '?' + new URLSearchParams(o.query).toString() : '';
  const cabecalhos: Record<string, string> = {};
  if (o.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (o.token) cabecalhos.Authorization = 'Bearer ' + o.token;
  const r = await fetch(urlApi + caminho + q, { method: metodo, headers: cabecalhos, body: o.corpo === undefined ? undefined : JSON.stringify(o.corpo), signal: AbortSignal.timeout(30_000) });
  const texto = await r.text();
  let corpo: any = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = null; }
  return { status: r.status, corpo, erro: typeof corpo?.erro === 'string' ? corpo.erro : null };
}

// ---------- registro de verificações ----------
type Resultado = 'PASS' | 'FAIL' | 'SKIP' | 'INCONCLUSIVO';
const checks: { nome: string; esperado: string; obtido: string; resultado: Resultado }[] = [];
const dados: Record<string, unknown> = {};
const notas: string[] = [];
const inicio = new Date().toISOString();
const montarRelatorio = (concluido: boolean) => ({ executadoEm: inicio, concluido, api: local ? 'local' : urlApi, modo: somenteLeitura ? 'somente-leitura' : 'completo', checks, ...dados, notas });
async function persistirProgresso() { await writeFile(arquivo + '.pendente.json', JSON.stringify(montarRelatorio(false), null, 2) + '\n'); }
async function registrar(nome: string, esperado: string, obtido: string, resultado: Resultado) {
  checks.push({ nome, esperado, obtido, resultado });
  console.log(resultado + ' ' + nome + (resultado === 'PASS' ? '' : ' -> ' + obtido));
  await persistirProgresso();
}
const descrever = (r: Resposta) => r.status + (r.erro ? '/' + r.erro : '');
/** Recusa autorizada: status esperado e (opcionalmente) código de erro do contrato. */
async function recusa(nome: string, r: Resposta, status: number, codigo?: string) {
  const ok = r.status === status && (!codigo || r.erro === codigo);
  const schema = r.status === 400 && r.erro === 'requisicao_invalida';
  await registrar(nome, status + (codigo ? '/' + codigo : ''), descrever(r) + (schema ? ' (validação de schema: NÃO é evidência de autorização)' : ''), ok ? 'PASS' : schema ? 'INCONCLUSIVO' : 'FAIL');
  return ok;
}

// ---------- entrada de códigos ----------
const leitor = createInterface({ input: stdin });
const linhas = leitor[Symbol.asyncIterator]();
async function lerCodigo(rotulo: string): Promise<string> {
  console.log('AGUARDANDO_CODIGO ' + rotulo);
  const { value, done } = await linhas.next();
  const codigo = done ? '' : String(value).trim();
  if (!/^\d{6}$/.test(codigo)) throw new Error('Código ' + rotulo + ' ausente ou fora do formato de 6 dígitos.');
  return codigo;
}
const ultimoPedido = new Map<string, number>();
async function respeitarIntervalo(email: string) {
  const chave = hash('e', email.toLowerCase());
  const anterior = ultimoPedido.get(chave);
  if (anterior && !local) { const falta = INTERVALO_CODIGO_MS - (Date.now() - anterior); if (falta > 0) await dormir(falta); }
  ultimoPedido.set(chave, Date.now());
}

type Sessao = { token: string; contaId: string; lojaId: string; operadorId: string; aparelhoId: string; permissoes: string[]; papel: string };
async function entrar(rotulo: string, email: string, aparelhoNome: string): Promise<Sessao> {
  const aparelhoId = randomUUID();
  await respeitarIntervalo(email);
  const pedido = await http('POST', '/auth/codigo', { corpo: { email } });
  if (pedido.status !== 204 && !(local && pedido.status === 200 && pedido.corpo?.codigo)) throw new Error('Pedido de código ' + rotulo + ' falhou: ' + descrever(pedido));
  const codigo = local && pedido.corpo?.codigo ? String(pedido.corpo.codigo) : await lerCodigo(rotulo);
  let corpo: Record<string, unknown> = { email, codigo, aparelhoId, aparelhoNome };
  let login = await http('POST', '/auth/login', { corpo });
  if (login.status === 409 && login.erro === 'aceitar_convite') {
    notas.push(rotulo + ': convite ainda pendente; login repetido com aceitarConvite=true (o convite foi aceito por este script).');
    corpo = { ...corpo, aceitarConvite: true };
    login = await http('POST', '/auth/login', { corpo });
  }
  if (login.status !== 200) throw new Error('Login ' + rotulo + ' falhou: ' + descrever(login) + (login.erro === 'selecionar_vinculo' ? ' (usuário com mais de um vínculo; este script não escolhe vínculo)' : ''));
  const s = login.corpo;
  const perfil = await http('GET', '/conta', { token: s.token });
  assert.equal(perfil.status, 200, 'GET /conta falhou para ' + rotulo);
  return { token: s.token, contaId: s.contaId, lojaId: s.lojaId, operadorId: s.operadorId, aparelhoId: s.aparelhoId, permissoes: perfil.corpo.permissoes ?? s.permissoes ?? [], papel: perfil.corpo.papel ?? s.papel };
}

// ---------- datas e CPF ----------
function intervaloHojeSaoPaulo() {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  // America/Sao_Paulo é UTC-3 fixo desde 2019 (sem horário de verão).
  const inicioDia = new Date(dia + 'T03:00:00.000Z');
  return { dia, inicio: inicioDia.toISOString(), fim: new Date(inicioDia.getTime() + 86_400_000).toISOString() };
}
function cpfSintetico(): string {
  for (;;) {
    const d = Array.from({ length: 9 }, () => randomInt(0, 10));
    if (new Set(d).size === 1) continue;
    for (const n of [10, 11]) { const s = d.reduce((acc, x, i) => acc + x * (n - i), 0); d.push((s * 10) % 11 % 10); }
    return d.join('');
  }
}

// ---------- coleta ----------
type Turno = {
  id: string; operadorHash: string; operadorRef: 'dono' | 'operador' | 'outro'; status: 'aberto' | 'fechado'; hoje: boolean; abertoEm: string;
  aberturaCentavos: number; saldoCentavos: number; movimentosCentavosPorTipo: Record<string, number>; movimentos: number;
  fechamento: null | { em: string; esperadoCentavos: number; contadoCentavos: number; diferencaCentavos: number };
  vendas: { concluidas: number; canceladas: number; totalCentavos: number; porMeioCentavos: Record<string, number>};
};
type PainelItem = { caixa: any; saldoCentavos: number; [k: string]: unknown };

async function puxarTudo(token: string) {
  const mapa = new Map<string, any>();
  let cursor = '0';
  for (let pagina = 0; pagina < 500; pagina++) {
    const r = await http('GET', '/sync/pull', { token, query: { desde: cursor } });
    if (r.status !== 200) return { status: r.status, erro: r.erro, mudancas: [] as any[] };
    if (!r.corpo.mudancas.length) break;
    for (const m of r.corpo.mudancas) { const chave = m.entidade + ':' + (m.dados.id); if (m.operacao === 'delete') mapa.delete(chave); else mapa.set(chave, m); }
    if (r.corpo.cursor === cursor) break;
    cursor = r.corpo.cursor;
  }
  return { status: 200, erro: null, mudancas: [...mapa.values()] };
}
const relatorioHoje = (token: string, extra: Record<string, string> = {}) => { const h = intervaloHojeSaoPaulo(); return http('GET', '/relatorios', { token, query: { inicio: h.inicio, fim: h.fim, ...extra } }); };

function resumirTurnos(painel: PainelItem[], vendasPorCaixa: Map<string, any[]>, refs: { dono: string; operador: string | null }, hoje: { inicio: string; fim: string }): Turno[] {
  return painel.map(p => {
    const c = p.caixa;
    const porTipo: Record<string, number> = {};
    for (const m of c.movimentos) porTipo[m.tipo] = (porTipo[m.tipo] ?? 0) + m.valorCentavos;
    const vs = vendasPorCaixa.get(c.id) ?? [];
    const porMeio: Record<string, number> = {};
    let total = 0, canceladas = 0;
    for (const v of vs) { if (v.status === 'cancelada') { canceladas++; continue; } total += v.totalCentavos; for (const pg of v.pagamentos) porMeio[pg.meio] = (porMeio[pg.meio] ?? 0) + pg.valorCentavos; }
    const f = c.fechamento;
    return {
      id: c.id, operadorHash: hash('op', c.operadorId), operadorRef: c.operadorId === refs.dono ? 'dono' : c.operadorId === refs.operador ? 'operador' : 'outro',
      status: f ? 'fechado' : 'aberto', hoje: c.abertura.em >= hoje.inicio && c.abertura.em < hoje.fim, abertoEm: c.abertura.em,
      aberturaCentavos: c.abertura.trocoInicialCentavos, saldoCentavos: p.saldoCentavos, movimentosCentavosPorTipo: porTipo, movimentos: c.movimentos.length,
      fechamento: f ? { em: f.em, esperadoCentavos: f.esperadoCentavos, contadoCentavos: f.contadoCentavos, diferencaCentavos: f.diferencaCentavos ?? f.contadoCentavos - f.esperadoCentavos } : null,
      vendas: { concluidas: vs.length - canceladas, canceladas, totalCentavos: total, porMeioCentavos: porMeio },
    } as Turno;
  });
}
const agruparVendas = (mudancas: any[]) => { const m = new Map<string, any[]>(); for (const x of mudancas) if (x.entidade === 'venda' && x.operacao === 'upsert' && x.dados.caixaId) { const l = m.get(x.dados.caixaId) ?? []; l.push(x.dados); m.set(x.dados.caixaId, l); } return m; };
const compactarRelatorio = (r: any, refs: { dono: string; operador: string | null }) => ({
  filtros: r.filtros, confirmadoEm: r.confirmadoEm, totaisCentavos: r.totais, quantidadeLinhas: r.linhas.length,
  linhas: r.linhas.map((l: any) => ({ id: l.id, caixaId: l.caixaId, operadorRef: l.operadorId === refs.dono ? 'dono' : l.operadorId === refs.operador ? 'operador' : hash('op', l.operadorId), categoria: l.categoria, meio: l.meio, valorCentavos: l.valorCentavos, em: l.em })),
});

// ---------- execução ----------
const sessoes: { dono?: Sessao; operador?: Sessao; empresaB?: Sessao } = {};
let falhaFatal: unknown = null;
try {
  // 1. Saúde e rotas de desenvolvimento
  const saude = await http('GET', '/saude');
  await registrar('GET /saude responde ok', '200 {status:ok}', descrever(saude), saude.status === 200 && saude.corpo?.status === 'ok' ? 'PASS' : 'FAIL');
  if (local) await registrar('Rotas /dev ausentes', '404', 'API local em modo dev: verificação não aplicável', 'SKIP');
  else {
    const d1 = await http('POST', '/dev/relogio/avancar', { corpo: { dias: 1 } }), d2 = await http('POST', '/dev/jobs/cobranca', { corpo: {} });
    await registrar('Rotas /dev ausentes', '404 e 404', descrever(d1) + ' e ' + descrever(d2), d1.status === 404 && d2.status === 404 ? 'PASS' : 'FAIL');
  }

  // 2. Login do dono
  sessoes.dono = await entrar('dono', emailDono, 'homologar-equipe dono');
  const dono = sessoes.dono;
  await registrar('Dono autenticado com papel dono', 'papel=dono', 'papel=' + dono.papel, dono.papel === 'dono' ? 'PASS' : 'FAIL');
  dados.empresaA = { contaId: dono.contaId, lojaId: dono.lojaId, donoOperadorHash: hash('op', dono.operadorId) };

  // 3. Login do operador (somente no modo completo)
  if (!somenteLeitura) {
    sessoes.operador = await entrar('operador', opcoes.operador as string, 'homologar-equipe operador');
    const op = sessoes.operador;
    await registrar('Operador pertence à mesma empresa/loja do dono', 'contaId e lojaId iguais', 'iguais=' + (op.contaId === dono.contaId && op.lojaId === dono.lojaId), op.contaId === dono.contaId && op.lojaId === dono.lojaId ? 'PASS' : 'FAIL');
    await registrar('Operador não é o dono', 'operadorId diferente e papel != dono', 'papel=' + op.papel, op.operadorId !== dono.operadorId && op.papel !== 'dono' ? 'PASS' : 'FAIL');
    dados.operador = { papel: op.papel, permissoes: op.permissoes, operadorHash: hash('op', op.operadorId) };
  }
  const refs = { dono: dono.operadorId, operador: sessoes.operador?.operadorId ?? null };
  const hoje = intervaloHojeSaoPaulo();

  // 4. Snapshot do dono: turnos, vendas por turno e relatório consolidado de hoje
  const painelDono = await http('GET', '/caixas', { token: dono.token });
  await registrar('Dono lista os turnos da loja', '200 array', descrever(painelDono), painelDono.status === 200 && Array.isArray(painelDono.corpo) ? 'PASS' : 'FAIL');
  const pullDono = await puxarTudo(dono.token);
  await registrar('Dono baixa o histórico (sync/pull)', '200', String(pullDono.status), pullDono.status === 200 ? 'PASS' : 'FAIL');
  const painel: PainelItem[] = Array.isArray(painelDono.corpo) ? painelDono.corpo : [];
  const turnos = resumirTurnos(painel, agruparVendas(pullDono.mudancas), refs, hoje);
  dados.turnos = turnos;
  dados.diaSaoPaulo = hoje.dia;
  const relDono = await relatorioHoje(dono.token, { lojaId: 'todas' });
  await registrar('Dono obtém o relatório consolidado de hoje (todas as lojas)', '200', descrever(relDono), relDono.status === 200 ? 'PASS' : 'FAIL');
  if (relDono.status === 200) dados.relatorioHoje = compactarRelatorio(relDono.corpo, refs);
  const filtrosDono = await http('GET', '/relatorios/filtros', { token: dono.token });
  if (filtrosDono.status === 200) {
    const a = new Set(turnos.map(t => t.id)), b = new Set<string>(filtrosDono.corpo.turnos.map((t: any) => t.id));
    await registrar('Turnos de /caixas e /relatorios/filtros coincidem (dono)', 'mesmo conjunto', `caixas=${a.size} filtros=${b.size}`, a.size === b.size && [...a].every(i => b.has(i)) ? 'PASS' : 'FAIL');
  } else await registrar('Dono lê /relatorios/filtros', '200', descrever(filtrosDono), 'FAIL');

  if (!somenteLeitura) {
    const op = sessoes.operador!;
    const gestor = op.permissoes.includes('conferir_caixas');
    const alheios = turnos.filter(t => t.operadorRef !== 'operador');
    const proprios = turnos.filter(t => t.operadorRef === 'operador');

    // 5a. Escopo de leitura do operador
    const semToken = await http('GET', '/caixas'), tokenRuim = await http('GET', '/caixas', { token: 'x'.repeat(43) });
    await registrar('Sem token ou com token inválido a API recusa', '401 e 401', descrever(semToken) + ' e ' + descrever(tokenRuim), semToken.status === 401 && tokenRuim.status === 401 ? 'PASS' : 'FAIL');
    const painelOp = await http('GET', '/caixas', { token: op.token });
    const listaOp: any[] = Array.isArray(painelOp.corpo) ? painelOp.corpo : [];
    const idsOp = listaOp.map(i => i.caixa.id as string);
    if (gestor) {
      await registrar('Operador possui conferir_caixas (escopo de gestor): checagens de recusa por turno alheio não se aplicam', 'n/a', 'permissões=' + op.permissoes.join(','), 'SKIP');
      await registrar('Gestor vê somente turnos da própria loja', 'todos com lojaId da loja A', 'estrangeiros=' + listaOp.filter(i => i.caixa.lojaId !== dono.lojaId).length, listaOp.every(i => i.caixa.lojaId === dono.lojaId) ? 'PASS' : 'FAIL');
    } else {
      const estrangeiros = listaOp.filter(i => i.caixa.operadorId !== op.operadorId);
      await registrar('Operador lista apenas os próprios turnos em GET /caixas', '200 e 0 turnos de outro operador', `${descrever(painelOp)} estrangeiros=${estrangeiros.length} proprios=${listaOp.length - estrangeiros.length}`, painelOp.status === 200 && estrangeiros.length === 0 ? 'PASS' : 'FAIL');
      await registrar('GET /caixas do operador cobre exatamente os turnos próprios conhecidos pelo dono', 'mesmo conjunto', `operador=${idsOp.length} dono(proprios)=${proprios.length}`, idsOp.length === proprios.length && proprios.every(t => idsOp.includes(t.id)) ? 'PASS' : 'FAIL');
      const pullOp = await puxarTudo(op.token);
      const alheiosPull = pullOp.mudancas.filter(m => (m.entidade === 'caixa' || m.entidade === 'venda') && m.operacao === 'upsert' && m.dados.operadorId !== op.operadorId);
      await registrar('sync/pull do operador não traz turno nem venda de outro operador', '200 e 0 registros alheios', `${pullOp.status} alheios=${alheiosPull.length} (de ${pullOp.mudancas.length})`, pullOp.status === 200 && alheiosPull.length === 0 ? 'PASS' : 'FAIL');
      const relOp = await relatorioHoje(op.token);
      const linhasAlheias = relOp.status === 200 ? relOp.corpo.linhas.filter((l: any) => l.operadorId !== op.operadorId).length : -1;
      await registrar('Relatório de hoje do operador só tem linhas próprias', '200 e 0 linhas alheias', `${descrever(relOp)} alheias=${linhasAlheias}`, relOp.status === 200 && linhasAlheias === 0 ? 'PASS' : 'FAIL');
      const filtrosOp = await http('GET', '/relatorios/filtros', { token: op.token });
      const fAlheio = filtrosOp.status === 200 ? filtrosOp.corpo.turnos.filter((t: any) => t.operadorId !== op.operadorId).length + filtrosOp.corpo.usuarios.filter((u: any) => u.id !== op.operadorId).length : -1;
      await registrar('/relatorios/filtros do operador só expõe turnos e usuário próprios', '200 e 0 alheios', `${descrever(filtrosOp)} alheios=${fAlheio}`, filtrosOp.status === 200 && fAlheio === 0 ? 'PASS' : 'FAIL');
      const outroOperador = alheios.find(t => t.operadorRef === 'dono') ? dono.operadorId : null;
      const outroId = painel.map(p => p.caixa.operadorId as string).find(id => id !== op.operadorId) ?? outroOperador;
      if (outroId) await recusa('Relatório filtrado por outro operador é recusado', (await relatorioHoje(op.token, { operadorId: outroId })), 403, 'permissao_negada');
      await recusa('Relatório de todas as lojas é recusado ao operador', await relatorioHoje(op.token, { lojaId: 'todas' }), 403, 'permissao_negada');
    }

    // 5b. Tentativas diretas contra um turno alheio (somente quando o vínculo não é de gestor)
    const alvo = alheios.find(t => t.status === 'aberto') ?? alheios[0];
    dados.turnoAlheioAlvo = alvo ? { id: alvo.id, status: alvo.status, operadorRef: alvo.operadorRef } : null;
    if (modoEquipe) {
      notas.push('Modo --f13/--troca-aparelho: escritas F08 em turno alheio e seção da empresa B puladas; leituras F08 mantidas.');
    } else if (gestor || !alvo) {
      if (!gestor) { await registrar('Existe turno de outro operador para as tentativas diretas', 'ao menos 1 turno alheio', 'nenhum turno alheio (peça ao dono/outro operador para abrir um turno e repita)', 'INCONCLUSIVO'); }
    } else {
      if (alvo.status !== 'aberto') notas.push('Nenhum turno alheio aberto: tentativas direcionadas a turno alheio fechado (a recusa de autorização precede a checagem de turno encerrado).');
      const original = painel.find(p => p.caixa.id === alvo.id)!.caixa;
      const antes = JSON.stringify(original);
      const movimentoBody = { id: randomUUID(), tipo: 'suprimento', valorCentavos: 1, motivo: 'homologar-equipe F08 (deve ser recusado)', categoria: 'teste', destino: 'gaveta' };
      const mov = await http('POST', `/caixas/${alvo.id}/movimentos`, { token: op.token, corpo: movimentoBody });
      if (mov.status >= 200 && mov.status < 300) { await registrar('POST movimento (suprimento) em turno alheio', '403/proibido', descrever(mov) + ' ACEITO: efeito financeiro indevido no turno ' + alvo.id, 'FAIL'); }
      else await recusa('POST movimento (suprimento) em turno alheio é recusado', mov, 403, 'proibido');
      await recusa('POST conferir em turno alheio é recusado', await http('POST', `/caixas/${alvo.id}/conferir`, { token: op.token, corpo: { id: randomUUID(), motivo: 'homologar-equipe F08 (deve ser recusado)' } }), 403, 'proibido');
      await recusa('POST troca de aparelho em turno alheio é recusada', await http('POST', `/caixas/${alvo.id}/aparelho`, { token: op.token, corpo: { aparelhoAnteriorId: original.aparelhoAtualId ?? original.aparelhoId, motivo: 'homologar-equipe F08 (deve ser recusado)', confirmarSincronizacaoAnterior: true } }), 403, 'proibido');
      // Fechamento via sync/push (não existe rota de fechamento dedicada): mutação bem formada do turno alheio, já com fechamento.
      const fechamento = original.fechamento ?? { em: new Date().toISOString(), esperadoCentavos: painel.find(p => p.caixa.id === alvo.id)!.saldoCentavos, contadoCentavos: painel.find(p => p.caixa.id === alvo.id)!.saldoCentavos, diferencaCentavos: 0 };
      const mutacaoId = randomUUID();
      const push = await http('POST', '/sync/push', { token: op.token, corpo: { aparelhoId: op.aparelhoId, mutacoes: [{ id: mutacaoId, criadaEm: new Date().toISOString(), entidade: 'caixa', operacao: 'upsert', dados: { ...original, fechamento } }] } });
      const rej = push.status === 200 ? push.corpo.rejeitadas.find((r: any) => r.id === mutacaoId) : null;
      const aceita = push.status === 200 && push.corpo.aceitas.includes(mutacaoId);
      const motivosAutz = ['permissao_negada', 'origem_invalida'];
      if (aceita) await registrar('sync/push de fechamento do turno alheio', 'rejeitada por autorização', 'ACEITA: turno ' + alvo.id + ' alterado indevidamente', 'FAIL');
      else if (push.status === 400) await registrar('sync/push de fechamento do turno alheio', 'rejeitada por autorização', descrever(push) + ' (schema: NÃO é evidência de autorização)', 'INCONCLUSIVO');
      else await registrar('sync/push de fechamento do turno alheio é rejeitado por autorização', 'rejeitada com ' + motivosAutz.join('|'), push.status + ' rejeitada=' + (rej?.motivo ?? 'não encontrada'), push.status === 200 && rej && motivosAutz.includes(rej.motivo) ? 'PASS' : push.status === 200 && rej ? 'INCONCLUSIVO' : 'FAIL');
      // Prova de integridade: o turno alheio permanece idêntico para o dono.
      const painelDepois = await http('GET', '/caixas', { token: dono.token });
      const depois = Array.isArray(painelDepois.corpo) ? painelDepois.corpo.find((p: any) => p.caixa.id === alvo.id)?.caixa : null;
      await registrar('Turno alheio permanece inalterado após as tentativas do operador', 'JSON idêntico', depois ? 'idêntico=' + (JSON.stringify(depois) === antes) : 'turno não encontrado', depois && JSON.stringify(depois) === antes ? 'PASS' : 'FAIL');
    }

    // ---------- Modos opt-in: o aparelho HTTP faz o papel de "segundo aparelho" do operador ----------
    if (modoEquipe) {
      const lerPainel = async () => { const r = await http('GET', '/caixas', { token: dono.token }); return Array.isArray(r.corpo) ? r.corpo as PainelItem[] : []; };
      const abertosDoOperador = (p: PainelItem[]) => p.filter(i => i.caixa.operadorId === op.operadorId && !i.caixa.fechamento);
      const titular = (c: any) => (c.aparelhoAtualId ?? c.aparelhoId) as string;
      const vistoPeloOp = await http('GET', '/caixas', { token: op.token });
      const proprioAberto = (Array.isArray(vistoPeloOp.corpo) ? vistoPeloOp.corpo : []).find((i: any) => i.caixa.operadorId === op.operadorId && !i.caixa.fechamento)?.caixa;
      const painelAntes = await lerPainel();
      const abertosAntes = abertosDoOperador(painelAntes);
      if (!proprioAberto || abertosAntes.length !== 1) {
        await registrar('Operador tem exatamente um turno aberto próprio (pré-condição)', '1 turno aberto', `operador vê ${proprioAberto ? 1 : 0}; dono vê ${abertosAntes.length}`, 'INCONCLUSIVO');
      } else {
        const turnoId: string = proprioAberto.id;
        const titularAntes = titular(abertosAntes[0]!.caixa);
        dados.turnoOperador = { id: turnoId, titularAntesHash: hash('ap', titularAntes), aberturaCentavos: proprioAberto.abertura.trocoInicialCentavos };
        dados.aparelhoHttpId = op.aparelhoId;
        console.log('aparelhoHttpId=' + op.aparelhoId);
        await registrar('Aparelho HTTP do operador é diferente do titular do turno', 'ids diferentes', 'diferentes=' + (op.aparelhoId !== titularAntes), op.aparelhoId !== titularAntes ? 'PASS' : 'FAIL');
        const criados = new Set<string>();
        // Reserva é recusada se 2xx; aceitamos 403/proibido (turno de outro aparelho, caixa.ts:56) ou 409/conflito (caixa.ts:57/62/58).
        const tentar = async (nome: string, corpo: { id: string; trocoInicialCentavos: number }, aceitos: string[]) => {
          const r = await http('POST', '/caixas/reservar', { token: op.token, corpo });
          if (r.status >= 200 && r.status < 300) { criados.add(corpo.id); await registrar(nome, aceitos.join('|'), descrever(r) + ' ACEITO (turno ' + corpo.id + ')', 'FAIL'); return r; }
          const ok = aceitos.includes(descrever(r));
          await registrar(nome, aceitos.join('|'), descrever(r) + (r.corpo?.mensagem ? ' "' + r.corpo.mensagem + '"' : ''), ok ? 'PASS' : r.status === 400 ? 'INCONCLUSIVO' : 'FAIL');
          return r;
        };
        if (opcoes.f13) {
          const mesmo = { id: turnoId, trocoInicialCentavos: proprioAberto.abertura.trocoInicialCentavos };
          const aceitosA = ['403/proibido', '409/conflito'], aceitosB = ['409/conflito'];
          await tentar('F13a: reservar de novo o turno aberto a partir de outro aparelho é recusado', mesmo, aceitosA);
          await tentar('F13b: reservar um novo turno com o anterior aberto é recusado', { id: randomUUID(), trocoInicialCentavos: 0 }, aceitosB);
          for (let rodada = 1; rodada <= 2; rodada++) {
            await Promise.all([
              tentar(`F13c rodada ${rodada}: reserva simultânea do turno existente é recusada`, mesmo, aceitosA),
              tentar(`F13c rodada ${rodada}: reserva simultânea de novo turno é recusada`, { id: randomUUID(), trocoInicialCentavos: 0 }, aceitosB),
            ]);
          }
          const depois = await lerPainel(), abertosDepois = abertosDoOperador(depois);
          const idsCriados = depois.filter(i => criados.has(i.caixa.id)).map(i => i.caixa.id);
          await registrar('F13d: dono vê exatamente um turno aberto do operador, com o mesmo id', '1 turno, id inalterado', `abertos=${abertosDepois.length} mesmoId=${abertosDepois[0]?.caixa.id === turnoId}`, abertosDepois.length === 1 && abertosDepois[0]!.caixa.id === turnoId ? 'PASS' : 'FAIL');
          await registrar('F13d: aparelho titular do turno inalterado', 'igual ao anterior', 'igual=' + (abertosDepois[0] ? titular(abertosDepois[0].caixa) === titularAntes : 'turno ausente'), abertosDepois[0] && titular(abertosDepois[0].caixa) === titularAntes ? 'PASS' : 'FAIL');
          await registrar('F13: nenhum turno criado acidentalmente', '0 turnos novos', 'criados=' + (idsCriados.join(',') || 'nenhum'), idsCriados.length === 0 ? 'PASS' : 'FAIL');
          dados.f13 = { turnosCriadosAcidentalmente: idsCriados };
        }
        if (opcoes['troca-aparelho']) {
          const corpoTroca = { aparelhoAnteriorId: titularAntes, motivo: 'Bloco 6: troca de aparelho por HTTP (2º aparelho simulado)', confirmarSincronizacaoAnterior: true };
          const troca = await http('POST', `/caixas/${turnoId}/aparelho`, { token: op.token, corpo: corpoTroca });
          await registrar('Troca de aparelho do próprio turno pelo aparelho HTTP', '200', descrever(troca) + (troca.status === 200 ? '' : ' "' + (troca.corpo?.mensagem ?? '') + '"'), troca.status === 200 ? 'PASS' : troca.status === 400 ? 'INCONCLUSIVO' : 'FAIL');
          if (troca.status === 200) manterAparelhoOperador = true; // não revogar: o turno agora está neste aparelho
          const posTroca = await lerPainel();
          const item = posTroca.find(i => i.caixa.id === turnoId);
          await registrar('Dono vê o turno no aparelho HTTP, ainda aberto e único', 'titular=HTTP, aberto, 1 aberto', item ? `titularHttp=${titular(item.caixa) === op.aparelhoId} aberto=${!item.caixa.fechamento} abertos=${abertosDoOperador(posTroca).length}` : 'turno ausente', item && titular(item.caixa) === op.aparelhoId && !item.caixa.fechamento && abertosDoOperador(posTroca).length === 1 ? 'PASS' : 'FAIL');
          const trilha = ((item as any)?.auditoria ?? []).filter((a: any) => a.tipo === 'troca_aparelho');
          await registrar('Auditoria registra a troca de aparelho', 'ao menos 1 linha troca_aparelho', 'linhas=' + trilha.length, trilha.length >= 1 ? 'PASS' : 'FAIL');
          dados.trocaAparelho = { turnoId, de: hash('ap', titularAntes), para: 'aparelhoHttpId', auditoria: trilha.map((a: any) => ({ id: a.id, em: a.em, autorRef: a.autorOperadorId === op.operadorId ? 'operador' : 'outro' })) };
          const idemp = await http('POST', '/caixas/reservar', { token: op.token, corpo: { id: turnoId, trocoInicialCentavos: proprioAberto.abertura.trocoInicialCentavos } });
          const refusado = idemp.status === 409 || (idemp.status === 403 && idemp.erro === 'proibido');
          dados.reservarAposTroca = descrever(idemp);
          await registrar('Reservar o mesmo turno após a troca: idempotente (2xx) ou recusa (409/403) — registrado', '2xx idempotente ou 409/403', descrever(idemp) + (idemp.corpo?.mensagem ? ' "' + idemp.corpo.mensagem + '"' : ''), (idemp.status >= 200 && idemp.status < 300) || refusado ? 'PASS' : 'FAIL');
          if (troca.status === 200) {
            console.log('AGUARDANDO_RETOMADA');
            await linhas.next();
            const pos = await lerPainel();
            const it2 = pos.find(i => i.caixa.id === turnoId), abertos2 = abertosDoOperador(pos);
            const noCelular = it2 ? titular(it2.caixa) === titularAntes : false;
            await registrar('Após retomada: turno de volta ao celular, aberto, sem duplicata', 'titular=celular, aberto, 1 aberto, mesmo id', it2 ? `noCelular=${noCelular} aberto=${!it2.caixa.fechamento} abertos=${abertos2.length}` : 'turno ausente', it2 && noCelular && !it2.caixa.fechamento && abertos2.length === 1 ? 'PASS' : 'FAIL');
            const rev = await http('DELETE', '/aparelhos/' + op.aparelhoId, { token: dono.token });
            if (rev.status === 204) manterAparelhoOperador = false;
            await registrar('Aparelho HTTP do operador revogado pelo dono', '204', descrever(rev), rev.status === 204 ? 'PASS' : 'FAIL');
            const fim = await lerPainel(), it3 = fim.find(i => i.caixa.id === turnoId);
            await registrar('Revogar o aparelho HTTP não afeta o turno no celular', 'titular=celular, aberto', it3 ? `noCelular=${titular(it3.caixa) === titularAntes} aberto=${!it3.caixa.fechamento}` : 'turno ausente', it3 && titular(it3.caixa) === titularAntes && !it3.caixa.fechamento ? 'PASS' : 'FAIL');
          }
        }
      }
    }
  }

  // 6. Empresa B
  if (!somenteLeitura && !modoEquipe) {
    const emailB = opcoes['empresa-b'] as string;
    const cfg = await http('GET', '/auth/cadastro/configuracao');
    await registrar('Configuração de cadastro disponível', '200', descrever(cfg), cfg.status === 200 ? 'PASS' : 'FAIL');
    const aparelhoIdB = randomUUID(), documento = cpfSintetico();
    await respeitarIntervalo(emailB);
    const desafio = await http('POST', '/auth/cadastro/codigo', { corpo: { email: emailB, aparelhoId: aparelhoIdB } });
    if (desafio.status !== 200 || !desafio.corpo?.desafioId) throw new Error('Desafio de cadastro B falhou: ' + descrever(desafio));
    const codigoB = local && desafio.corpo.codigo ? String(desafio.corpo.codigo) : await lerCodigo('cadastro-b');
    const prova = { desafioCadastroId: desafio.corpo.desafioId, codigoCadastro: codigoB };
    const verificar = await http('POST', '/auth/cadastro/verificar', { corpo: { email: emailB, documento, aparelhoId: aparelhoIdB, ...prova } });
    await registrar('Cadastro B: código verificado', '204', descrever(verificar), verificar.status === 204 ? 'PASS' : 'FAIL');
    if (verificar.status !== 204) throw new Error('Cadastro B interrompido.');
    const conta = await http('POST', '/contas', { corpo: { ...prova, email: emailB, nomeResponsavel: 'Homologar Equipe B', nomeLoja: 'homologar-equipe empresa B', documento, aparelhoId: aparelhoIdB, aparelhoNome: 'homologar-equipe empresa B' } });
    await registrar('Cadastro B: conta criada', '201', descrever(conta), conta.status === 201 ? 'PASS' : 'FAIL');
    if (conta.status !== 201) throw new Error('Criação da empresa B falhou.');
    const b = conta.corpo;
    sessoes.empresaB = { token: b.token, contaId: b.contaId, lojaId: b.lojaId, operadorId: b.operadorId, aparelhoId: b.aparelhoId, permissoes: [], papel: 'dono' };
    dados.empresaB = { contaId: b.contaId, lojaId: b.lojaId, operadorHash: hash('op', b.operadorId), observacao: 'conta descartável criada por este script; permanece na homologação' };
    const idsA = new Set(turnos.map(t => t.id));
    const alvoA = turnos.find(t => t.status === 'aberto') ?? turnos[0];

    const painelB = await http('GET', '/caixas', { token: b.token });
    await registrar('B lista /caixas sem nenhum turno da empresa A', '200 e 0 turnos de A', `${descrever(painelB)} total=${Array.isArray(painelB.corpo) ? painelB.corpo.length : '?'} deA=${Array.isArray(painelB.corpo) ? painelB.corpo.filter((i: any) => idsA.has(i.caixa.id)).length : '?'}`, painelB.status === 200 && Array.isArray(painelB.corpo) && !painelB.corpo.some((i: any) => idsA.has(i.caixa.id)) ? 'PASS' : 'FAIL');
    const pullB = await puxarTudo(b.token);
    const vazaB = pullB.mudancas.filter(m => (m.dados.lojaId && m.dados.lojaId === dono.lojaId) || idsA.has(m.dados.id));
    await registrar('sync/pull de B não traz dados da empresa A', '200 e 0 registros de A', `${pullB.status} deA=${vazaB.length} (de ${pullB.mudancas.length})`, pullB.status === 200 && vazaB.length === 0 ? 'PASS' : 'FAIL');
    await recusa('B pede relatório da loja de A (lojaId de A)', await relatorioHoje(b.token, { lojaId: dono.lojaId }), 403, 'permissao_negada');
    if (alvoA) {
      const relFiltro = await relatorioHoje(b.token, { caixaId: alvoA.id });
      await registrar('B filtra relatório pelo turno de A: resultado vazio', '200 e 0 linhas', `${descrever(relFiltro)} linhas=${relFiltro.corpo?.linhas?.length ?? '?'}`, relFiltro.status === 200 && relFiltro.corpo.linhas.length === 0 ? 'PASS' : 'FAIL');
    }
    const filtrosB = await http('GET', '/relatorios/filtros', { token: b.token });
    await registrar('B em /relatorios/filtros não vê lojas, usuários ou turnos de A', '200 e 0 de A', filtrosB.status === 200 ? `lojasA=${filtrosB.corpo.lojas.filter((l: any) => l.id === dono.lojaId).length} turnosA=${filtrosB.corpo.turnos.filter((t: any) => idsA.has(t.id)).length}` : descrever(filtrosB), filtrosB.status === 200 && !filtrosB.corpo.lojas.some((l: any) => l.id === dono.lojaId) && !filtrosB.corpo.turnos.some((t: any) => idsA.has(t.id)) ? 'PASS' : 'FAIL');
    const lojasB = await http('GET', '/lojas', { token: b.token });
    await registrar('B em /lojas só vê a própria loja', '200 e nenhuma loja de A', descrever(lojasB), lojasB.status === 200 && lojasB.corpo.every((l: any) => l.contaId === b.contaId) ? 'PASS' : 'FAIL');
    const equipeB = await http('GET', '/equipe', { token: b.token });
    const idsEquipeA = new Set([dono.operadorId, sessoes.operador!.operadorId]);
    await registrar('B em /equipe não vê vínculos de A', '200 e 0 vínculos de A', descrever(equipeB), equipeB.status === 200 && JSON.stringify(equipeB.corpo).indexOf(dono.operadorId) < 0 && ![...idsEquipeA].some(i => JSON.stringify(equipeB.corpo).includes(i)) ? 'PASS' : 'FAIL');
    const aparelhosB = await http('GET', '/aparelhos', { token: b.token });
    await registrar('B em /aparelhos não vê aparelhos de A', '200 e 0 de A', descrever(aparelhosB), aparelhosB.status === 200 && !aparelhosB.corpo.some((a: any) => a.id === dono.aparelhoId || a.id === sessoes.operador!.aparelhoId) ? 'PASS' : 'FAIL');
    if (alvoA) {
      const original = painel.find(p => p.caixa.id === alvoA.id)!.caixa;
      const antes = JSON.stringify(original);
      const mov = await http('POST', `/caixas/${alvoA.id}/movimentos`, { token: b.token, corpo: { id: randomUUID(), tipo: 'suprimento', valorCentavos: 1, motivo: 'homologar-equipe F08 (deve ser recusado)', categoria: 'teste', destino: 'gaveta' } });
      if (mov.status >= 200 && mov.status < 300) await registrar('B: POST movimento em turno de A', '404/nao_encontrado', descrever(mov) + ' ACEITO', 'FAIL');
      else await recusa('B: POST movimento em turno de A é recusado', mov, 404, 'nao_encontrado');
      await recusa('B: POST conferir em turno de A é recusado', await http('POST', `/caixas/${alvoA.id}/conferir`, { token: b.token, corpo: { id: randomUUID(), motivo: 'homologar-equipe F08 (deve ser recusado)' } }), 404, 'nao_encontrado');
      await recusa('B: POST troca de aparelho em turno de A é recusada', await http('POST', `/caixas/${alvoA.id}/aparelho`, { token: b.token, corpo: { aparelhoAnteriorId: original.aparelhoAtualId ?? original.aparelhoId, motivo: 'homologar-equipe F08 (deve ser recusado)', confirmarSincronizacaoAnterior: true } }), 404, 'nao_encontrado');
      const mutacaoId = randomUUID();
      const fechamento = original.fechamento ?? { em: new Date().toISOString(), esperadoCentavos: 0, contadoCentavos: 0, diferencaCentavos: 0 };
      const push = await http('POST', '/sync/push', { token: b.token, corpo: { aparelhoId: b.aparelhoId, mutacoes: [{ id: mutacaoId, criadaEm: new Date().toISOString(), entidade: 'caixa', operacao: 'upsert', dados: { ...original, fechamento } }] } });
      const rej = push.status === 200 ? push.corpo.rejeitadas.find((r: any) => r.id === mutacaoId) : null;
      if (push.status === 200 && push.corpo.aceitas.includes(mutacaoId)) await registrar('B: sync/push de turno de A', 'rejeitada por loja_invalida', 'ACEITA', 'FAIL');
      else if (push.status === 400) await registrar('B: sync/push de turno de A', 'rejeitada por loja_invalida', descrever(push) + ' (schema: NÃO é evidência)', 'INCONCLUSIVO');
      else await registrar('B: sync/push de turno de A é rejeitado por autorização', 'rejeitada com loja_invalida', push.status + ' rejeitada=' + (rej?.motivo ?? 'não encontrada'), push.status === 200 && rej?.motivo === 'loja_invalida' ? 'PASS' : push.status === 200 && rej ? 'INCONCLUSIVO' : 'FAIL');
      const depoisRes = await http('GET', '/caixas', { token: dono.token });
      const depois = Array.isArray(depoisRes.corpo) ? depoisRes.corpo.find((p: any) => p.caixa.id === alvoA.id)?.caixa : null;
      await registrar('Turno de A permanece inalterado após as tentativas de B', 'JSON idêntico', depois ? 'idêntico=' + (JSON.stringify(depois) === antes) : 'turno não encontrado', depois && JSON.stringify(depois) === antes ? 'PASS' : 'FAIL');
    } else await registrar('Existe turno de A para as tentativas de B', 'ao menos 1 turno', 'empresa A sem turnos', 'INCONCLUSIVO');
  }
} catch (e) {
  falhaFatal = e;
  await registrar('Execução interrompida', 'sem exceção', (e instanceof Error ? e.message : String(e)).replace(/\d{6}/g, '######'), 'FAIL');
} finally {
  // Limpeza: logout de B/operador; o dono revoga os aparelhos descartáveis que este script criou e por fim o próprio.
  try {
    if (sessoes.empresaB) await http('POST', '/auth/logout', { token: sessoes.empresaB.token });
    if (sessoes.operador) await http('POST', '/auth/logout', { token: sessoes.operador.token });
    if (sessoes.dono) {
      for (const id of [manterAparelhoOperador ? null : sessoes.operador?.aparelhoId].filter(Boolean) as string[]) await http('DELETE', '/aparelhos/' + id, { token: sessoes.dono.token });
      const rev = await http('DELETE', '/aparelhos/' + sessoes.dono.aparelhoId, { token: sessoes.dono.token });
      if (rev.status !== 204) await http('POST', '/auth/logout', { token: sessoes.dono.token });
    }
  } catch { notas.push('Falha ao encerrar sessões/aparelhos descartáveis; revogue manualmente os aparelhos "homologar-equipe".'); }
  const falhas = checks.filter(c => c.resultado === 'FAIL').length, inconclusivos = checks.filter(c => c.resultado === 'INCONCLUSIVO').length;
  dados.resumo = { total: checks.length, pass: checks.filter(c => c.resultado === 'PASS').length, fail: falhas, inconclusivo: inconclusivos, skip: checks.filter(c => c.resultado === 'SKIP').length };
  notas.push('Evidência HTTP; não substitui a verificação por UI no aparelho. Não existe GET de turno por id: o acesso direto é coberto por listagem, pull e relatório.');
  await writeFile(arquivo, JSON.stringify(montarRelatorio(!falhaFatal), null, 2) + '\n');
  await unlink(arquivo + '.pendente.json').catch(() => undefined);
  console.log(JSON.stringify(dados.resumo));
  console.log(falhas ? 'HOMOLOGACAO_EQUIPE_COM_FALHAS' : inconclusivos ? 'HOMOLOGACAO_EQUIPE_INCONCLUSIVA' : 'HOMOLOGACAO_EQUIPE_CONCLUIDA');
  process.exitCode = falhas ? 1 : inconclusivos ? 2 : 0;
  leitor.close(); stdin.pause();
}
