/**
 * Evidência HTTP do cenário F14 (docs/roteiro-piloto-android.md): estoque, fiado parcial/estorno,
 * recebimentos concorrentes, relatório/CSV e loja filial.
 *
 * Uso (Node >= 22.6 com remoção de tipos; no Node 24 a flag é opcional):
 *   node --experimental-strip-types scripts/homologar-gestao.mts <urlApi> <arquivoRelatorio> \
 *     --dono <email> [--gerente <email>] [--operador <email>] [--empresa-b <email>] \
 *     [--vinculo <operadorId do dono na loja principal>] [--filial <operadorId da filial F14 anterior>] \
 *     [--secoes estoque,fiado,concorrencia,relatorio,lojas]
 *
 * Papéis (cada papel não informado faz SKIP dos checks que o exigem):
 *   --dono        obrigatório. Cria a filial, lê o consolidado e é o 2º aparelho das corridas quando há gerente.
 *   --gerente     opcional. É o "caixa" do roteiro (abre turnos, vende e recebe fiado) para não tocar no turno do dono;
 *                 sem gerente o dono assume o papel (e um 2º aparelho do dono é autenticado, com 1 código a mais).
 *   --operador    opcional, conta de operador comum (sem cadastrar_produto/cancelar_venda/conferir_caixas): checagens de recusa.
 *   --empresa-b   opcional, e-mail do dono de OUTRA empresa JÁ EXISTENTE (ex.: criada pelo homologar-equipe): login normal.
 *   --vinculo     só se o dono tiver várias lojas e a principal não for a única sem prefixo "F14 ".
 *   --filial      reutiliza uma filial "F14 ..." já criada (operadorId em lojas.filial do relatório anterior): a API não exclui lojas e o
 *                 plano Pro admite 3, então uma conta suporta no máximo 2 execuções completas sem reutilizar.
 *   --secoes      subconjunto das seções (padrão: todas). "relatorio" usa apenas as linhas das seções executadas.
 *
 * Códigos: sempre que um código é necessário, imprime `AGUARDANDO_CODIGO <dono|gerente|operador|empresa-b|dono-aparelho2|dono-filial>`
 * e lê UMA linha do stdin (6 dígitos). Ordem: dono, gerente, operador, empresa-b, dono-aparelho2 (só sem gerente) e,
 * no meio da seção "lojas", dono-filial. Mesmo e-mail respeita 61 s entre pedidos (e a API aceita no máximo 3 por 15 min).
 * E-mails, códigos e tokens nunca são impressos nem gravados (apenas hashes).
 *
 * Efeitos na homologação (dados F14, valores em centavos inteiros): produto/venda/cliente/turnos/recebimentos/estornos,
 * uma loja FILIAL "F14 Filial ..." (não há rota para excluir lojas; conta no limite de 3 do plano Pro), 1 título fiado aberto
 * (venda "F14 ... 2") e aparelhos descartáveis revogados ao final. Os turnos abertos são fechados (contado = esperado).
 * Nenhuma operação financeira é repetida para contornar divergência: passo que falha vira FAIL e o roteiro segue pelos independentes.
 *
 * Saída: <arquivo> (JSON com checks e `dados` para comparar com a tela), <arquivo>.csv (relatório do dia civil de Brasília
 * da loja principal, gerado pela MESMA csvRelatorio do app) e, se houver filial, <arquivo>.consolidado.csv.
 * exit 1 se houver FAIL; exit 2 se não houver FAIL mas houver INCONCLUSIVO.
 * Validação local: PDV_HOMOLOGAR_LOCAL=1 com URL http://127.0.0.1:<porta> (API em modo dev, que devolve o código no corpo;
 * ele é usado em silêncio e as esperas de 61 s são puladas).
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { stdin } from 'node:process';
import { unlink, writeFile } from 'node:fs/promises';
// Mesma função que o app usa (@pdv/shared reexporta gestao.ts). Import direto: o pacote usa imports sem extensão.
import { CATEGORIAS_RELATORIO, EstoqueResSchema, FiadoResSchema, RelatorioSchema, csvRelatorio } from '../packages/shared/src/gestao.ts';

const HOST_HOMOLOGACAO = 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host';
const INTERVALO_CODIGO_MS = 61_000;
const SECOES_TODAS = ['estoque', 'fiado', 'concorrencia', 'relatorio', 'lojas'];

// ---------- argumentos ----------
const argv = process.argv.slice(2);
const posicionais: string[] = [];
const opcoes: Record<string, string> = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (['--dono', '--gerente', '--operador', '--empresa-b', '--vinculo', '--secoes', '--filial'].includes(a)) opcoes[a.slice(2)] = argv[++i] ?? '';
  else posicionais.push(a);
}
const [urlApi, arquivo] = posicionais;
const local = process.env.PDV_HOMOLOGAR_LOCAL === '1' && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(urlApi ?? '');
if (!local) assert.equal(urlApi, HOST_HOMOLOGACAO, 'Este roteiro só pode usar a API de homologação.');
assert.ok(arquivo, 'Informe o arquivo de relatório.');
const emailValido = (e: unknown): e is string => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
assert.ok(emailValido(opcoes.dono), 'Informe --dono <email>.');
for (const papel of ['gerente', 'operador', 'empresa-b']) if (papel in opcoes) assert.ok(emailValido(opcoes[papel]), `--${papel} exige um e-mail válido.`);
const emails = [opcoes.dono, opcoes.gerente, opcoes.operador, opcoes['empresa-b']].filter(Boolean).map(e => e!.toLowerCase());
assert.equal(new Set(emails).size, emails.length, 'Os papéis devem usar contas (e-mails) diferentes.');
const secoes = new Set((opcoes.secoes ? opcoes.secoes.split(',') : SECOES_TODAS).map(s => s.trim()));
for (const s of secoes) assert.ok(SECOES_TODAS.includes(s), 'Seção desconhecida: ' + s);

// ---------- utilidades ----------
const hash = (prefixo: string, valor: string) => prefixo + '_' + createHash('sha256').update(valor).digest('hex').slice(0, 10);
const dormir = (ms: number) => new Promise(r => setTimeout(r, ms));
type Resposta = { status: number; corpo: any; erro: string | null };
/** Último instante informado pelo servidor (x-pdv-agora): vendas, fechamentos e cancelamentos usam o relógio da API, não o da máquina. */
let relogioServidor: number | null = null;
const agoraIso = () => new Date(relogioServidor ?? Date.now()).toISOString();
const diaCivilSP = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const somarDiasData = (dia: string, n: number) => new Date(Date.parse(dia + 'T12:00:00Z') + n * 86_400_000).toISOString().slice(0, 10);

async function http(metodo: string, caminho: string, o: { token?: string | null; corpo?: unknown; query?: Record<string, string> } = {}): Promise<Resposta> {
  const q = o.query ? '?' + new URLSearchParams(o.query).toString() : '';
  const cabecalhos: Record<string, string> = {};
  if (o.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (o.token) cabecalhos.Authorization = 'Bearer ' + o.token;
  const r = await fetch(urlApi + caminho + q, { method: metodo, headers: cabecalhos, body: o.corpo === undefined ? undefined : JSON.stringify(o.corpo), signal: AbortSignal.timeout(60_000) });
  const h = Date.parse(r.headers.get('x-pdv-agora') ?? '');
  if (Number.isFinite(h)) relogioServidor = Math.max(relogioServidor ?? 0, h);
  const texto = await r.text();
  let corpo: any = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = null; }
  return { status: r.status, corpo, erro: typeof corpo?.erro === 'string' ? corpo.erro : null };
}

// ---------- registro de verificações ----------
type Resultado = 'PASS' | 'FAIL' | 'SKIP' | 'INCONCLUSIVO';
const checks: { nome: string; esperado: string; obtido: string; resultado: Resultado }[] = [];
const dados: Record<string, any> = {};
const notas: string[] = [];
const inicio = new Date().toISOString();
const montarRelatorio = (concluido: boolean) => ({ executadoEm: inicio, concluido, api: local ? 'local' : urlApi, secoes: [...secoes], checks, ...dados, notas });
async function persistirProgresso() { await writeFile(arquivo + '.pendente.json', JSON.stringify(montarRelatorio(false), null, 2) + '\n'); }
async function registrar(nome: string, esperado: string, obtido: string, resultado: Resultado) {
  checks.push({ nome, esperado, obtido, resultado });
  console.log(resultado + ' ' + nome + (resultado === 'PASS' ? '' : ' -> ' + obtido));
  await persistirProgresso();
}
const conferir = (nome: string, esperado: string, obtido: string, cond: boolean) => registrar(nome, esperado, obtido, cond ? 'PASS' : 'FAIL');
const pular = (nome: string, motivo: string) => registrar(nome, 'n/a', motivo, 'SKIP');
const descrever = (r: Resposta) => r.status + (r.erro ? '/' + r.erro : '');
const ok2xx = (r: Resposta) => r.status >= 200 && r.status < 300;
/** Recusa autorizada: PASS se status/código estiver entre os aceitos; 2xx é FAIL (efeito indevido); 400 de schema não prova autorização. */
async function recusaEm(nome: string, r: Resposta, aceitos: string[]) {
  const d = descrever(r);
  const schema = r.status === 400 && r.erro === 'requisicao_invalida';
  const recurso = r.status === 409 && String(r.corpo?.mensagem ?? '').startsWith('Recurso indisponível');
  const resultado: Resultado = aceitos.includes(d) ? 'PASS' : ok2xx(r) ? 'FAIL' : schema || recurso ? 'INCONCLUSIVO' : 'FAIL';
  await registrar(nome, aceitos.join('|'), d + (ok2xx(r) ? ' ACEITO (efeito indevido)' : schema ? ' (validação de schema: NÃO é evidência de autorização)' : recurso ? ' (recurso/plano indisponível: não prova isolamento)' : ''), resultado);
  return resultado === 'PASS';
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
  if (anterior) { const falta = (local ? 700 : INTERVALO_CODIGO_MS) - (Date.now() - anterior); if (falta > 0) await dormir(falta); }
  ultimoPedido.set(chave, Date.now());
}

type Sessao = { token: string; contaId: string; lojaId: string; operadorId: string; aparelhoId: string; permissoes: string[]; papel: string };
async function entrar(rotulo: string, email: string, aparelhoNome: string, operadorId?: string): Promise<Sessao> {
  const aparelhoId = randomUUID();
  await respeitarIntervalo(email);
  const pedido = await http('POST', '/auth/codigo', { corpo: { email } });
  if (pedido.status !== 204 && !(local && pedido.status === 200 && pedido.corpo?.codigo)) throw new Error('Pedido de código ' + rotulo + ' falhou: ' + descrever(pedido));
  const codigo = local && pedido.corpo?.codigo ? String(pedido.corpo.codigo) : await lerCodigo(rotulo);
  let corpo: Record<string, unknown> = { email, codigo, aparelhoId, aparelhoNome, ...(operadorId ? { operadorId } : {}) };
  let login = await http('POST', '/auth/login', { corpo });
  if (login.status === 409 && login.erro === 'selecionar_vinculo') {
    // O código não é consumido por /auth/vinculos nem pelo login recusado: escolhe o vínculo sem pedir outro código.
    const lista = await http('POST', '/auth/vinculos', { corpo: { email, codigo } });
    const ativos: any[] = Array.isArray(lista.corpo) ? lista.corpo.filter((v: any) => ['ativo', 'convidado'].includes(v.estado)) : [];
    const preferido = rotulo === 'dono' && opcoes.vinculo ? ativos.filter(v => v.operadorId === opcoes.vinculo) : ativos.filter(v => !String(v.nomeLoja).startsWith('F14 '));
    if (preferido.length !== 1) throw new Error(`Login ${rotulo}: ${ativos.length} vínculos, ${preferido.length} elegíveis; informe --vinculo <operadorId> (lojas: ${ativos.map(v => v.nomeLoja + '=' + v.operadorId).join(', ')}).`);
    corpo = { ...corpo, operadorId: preferido[0].operadorId };
    login = await http('POST', '/auth/login', { corpo });
  }
  if (login.status === 409 && login.erro === 'aceitar_convite') {
    notas.push(rotulo + ': convite ainda pendente; login repetido com aceitarConvite=true (o convite foi aceito por este script).');
    corpo = { ...corpo, aceitarConvite: true };
    login = await http('POST', '/auth/login', { corpo });
  }
  if (login.status !== 200) throw new Error('Login ' + rotulo + ' falhou: ' + descrever(login));
  const s = login.corpo;
  const perfil = await http('GET', '/conta', { token: s.token });
  assert.equal(perfil.status, 200, 'GET /conta falhou para ' + rotulo);
  return { token: s.token, contaId: s.contaId, lojaId: s.lojaId, operadorId: s.operadorId, aparelhoId: s.aparelhoId, permissoes: perfil.corpo.permissoes ?? s.permissoes ?? [], papel: perfil.corpo.papel ?? s.papel };
}

// ---------- construção de payloads ----------
const sufixo = new Date().toISOString().slice(5, 16).replace(/[-:T]/g, '');
const mut = (entidade: 'produto' | 'venda' | 'caixa', dadosMut: any) => ({ id: randomUUID(), criadaEm: agoraIso(), entidade, operacao: 'upsert', dados: dadosMut });
const pushar = (s: Sessao, mutacoes: any[]) => http('POST', '/sync/push', { token: s.token, corpo: { aparelhoId: s.aparelhoId, mutacoes } });
const aceita = (r: Resposta, id: string) => r.status === 200 && Array.isArray(r.corpo?.aceitas) && r.corpo.aceitas.includes(id);
const motivoDe = (r: Resposta, id: string): string | null => r.status === 200 ? (r.corpo?.rejeitadas ?? []).find((x: any) => x.id === id)?.motivo ?? null : null;
const descPush = (r: Resposta, id: string) => aceita(r, id) ? 'aceita' : r.status === 200 ? 'rejeitada=' + (motivoDe(r, id) ?? '?') : descrever(r);
function produtoNovo(lojaId: string, nome: string, precoCentavos: number, estoque: number | null, minimo: number | null) {
  const agora = agoraIso();
  return { id: randomUUID(), lojaId, nome, ean: null, precoCentavos, unidade: 'un', estoque, estoqueMinimo: minimo, atalho: false, criadoEm: agora, atualizadoEm: agora, excluidoEm: null, versao: 0 };
}
const itemVenda = (descricao: string, preco: number, qtdMilesimos: number, produtoId: string | null = null) =>
  ({ id: randomUUID(), produtoId, descricao, precoUnitarioCentavos: preco, quantidadeMilesimos: qtdMilesimos, totalCentavos: Math.floor((preco * qtdMilesimos + 500) / 1000) });
const pagamento = (meio: string, valorCentavos: number) => ({ id: randomUUID(), meio, provedor: null, valorCentavos, trocoCentavos: 0 });
function vendaNova(s: Sessao, o: { caixaId?: string | null; itens: any[]; pagamentos?: any[]; fiado?: { clienteId: string; vencimento: string; valorCentavos: number } }) {
  return { id: randomUUID(), lojaId: s.lojaId, aparelhoId: s.aparelhoId, operadorId: s.operadorId, ...(o.caixaId ? { caixaId: o.caixaId } : {}), ...(o.fiado ? { fiado: o.fiado } : {}),
    itens: o.itens, pagamentos: o.pagamentos ?? [], totalCentavos: o.itens.reduce((t, i) => t + i.totalCentavos, 0), status: 'concluida', criadaEm: agoraIso() };
}
const cancelamentoDe = (s: Sessao, motivo: string) => ({ id: randomUUID(), em: agoraIso(), operadorId: s.operadorId, motivo, estorno: 'nao_realizado' });

// ---------- linhas esperadas de relatório (somente operações aceitas) ----------
type Linha = { id: string; categoria: string; valorCentavos: number; meio: string | null; lojaId: string; caixaId: string | null };
const esperadas: Linha[] = [];
function esperarVenda(v: any) {
  const base = { lojaId: v.lojaId, caixaId: v.caixaId ?? null };
  for (const p of v.pagamentos) esperadas.push({ ...base, id: p.id + ':venda', categoria: 'venda', meio: p.meio, valorCentavos: p.valorCentavos }, { ...base, id: p.id, categoria: 'recebimento_venda', meio: p.meio, valorCentavos: p.valorCentavos });
  if (v.fiado) esperadas.push({ ...base, id: v.id + ':venda-fiado', categoria: 'venda', meio: null, valorCentavos: v.fiado.valorCentavos }, { ...base, id: v.id, categoria: 'fiado_emitido', meio: null, valorCentavos: v.fiado.valorCentavos });
}
function esperarCancelamento(v: any) {
  const c = v.cancelamento, base = { lojaId: v.lojaId, caixaId: v.caixaId ?? null };
  for (const p of v.pagamentos) esperadas.push({ ...base, id: c.id + ':' + p.id, categoria: 'cancelamento', meio: p.meio, valorCentavos: p.valorCentavos });
  if (v.fiado) esperadas.push({ ...base, id: c.id, categoria: 'cancelamento', meio: null, valorCentavos: v.fiado.valorCentavos });
}
const esperarEvento = (e: any) => esperadas.push({ id: e.id, categoria: e.tipo === 'recebimento' ? 'recebimento_fiado' : 'estorno_fiado', meio: e.meio, valorCentavos: e.valorCentavos, lojaId: e.lojaId, caixaId: e.caixaId ?? null });

// ---------- estado compartilhado ----------
const S: { dono?: Sessao; gerente?: Sessao; operador?: Sessao; empresaB?: Sessao; dono2?: Sessao; filial?: Sessao } = {};
const turnosAbertos: { s: Sessao; id: string }[] = [];
const ids = { A: { produtos: new Set<string>(), clientes: new Set<string>(), vendas: new Set<string>(), eventos: new Set<string>() }, F: { produtos: new Set<string>(), clientes: new Set<string>(), vendas: new Set<string>(), eventos: new Set<string>() } };
const estado: { caixa: Sessao | null; t2: string | null; vf2: any | null; filialId: string | null } = { caixa: null, t2: null, vf2: null, filialId: null };
let janelaInicio = '';

const painel = async (s: Sessao): Promise<any[]> => { const r = await http('GET', '/caixas', { token: s.token }); return Array.isArray(r.corpo) ? r.corpo : []; };
const saldoTurno = async (visor: Sessao, id: string): Promise<number | null> => (await painel(visor)).find(i => i.caixa.id === id)?.saldoCentavos ?? null;
const titulo = async (s: Sessao, vendaId: string) => { const r = await http('GET', '/fiado', { token: s.token }); return { r, t: (r.corpo?.titulos ?? []).find((x: any) => x.vendaId === vendaId) ?? null, eventos: (r.corpo?.eventos ?? []).filter((e: any) => e.vendaId === vendaId) }; };
const tituloTxt = (t: any) => t ? `valor=${t.valorCentavos} recebido=${t.recebidoCentavos} saldo=${t.saldoCentavos} cancelado=${t.cancelado}` : 'título ausente';
function passo(secao: string, nome: string, valores: Record<string, unknown>) { (dados[secao] ??= { passos: [] }).passos.push({ passo: nome, ...valores }); }

/** Abre turno v2 do ator, exceto se ele já tem um turno aberto em outro aparelho (não toca no turno real do piloto). */
async function abrirTurno(s: Sessao, rotulo: string, troco: number): Promise<string | null> {
  const aberto = (await painel(s)).find(i => i.caixa.operadorId === s.operadorId && !i.caixa.fechamento);
  if (aberto) { await registrar(`Turno ${rotulo}: ator sem turno aberto prévio`, 'nenhum turno aberto', 'já existe turno aberto em outro aparelho; checks de dinheiro desse ator ficam INCONCLUSIVOS (feche-o ou use --gerente)', 'INCONCLUSIVO'); return null; }
  const id = randomUUID();
  const r = await http('POST', '/caixas/reservar', { token: s.token, corpo: { id, trocoInicialCentavos: troco } });
  const aprovado = r.status === 200 && r.corpo?.aparelhoAtualId === s.aparelhoId && r.corpo?.fechamento === null;
  await conferir(`Turno ${rotulo}: reservado neste aparelho com troco ${troco}`, '200, aparelhoAtual=este aparelho, aberto', descrever(r), aprovado);
  if (!aprovado) return null;
  turnosAbertos.push({ s, id });
  return id;
}
async function fecharTurno(s: Sessao, id: string): Promise<Resposta | null> {
  const item = (await painel(s)).find(i => i.caixa.id === id);
  if (!item || item.caixa.fechamento) return null;
  const saldo: number = item.saldoCentavos;
  const fechamento = { em: agoraIso(), esperadoCentavos: saldo, contadoCentavos: saldo, diferencaCentavos: 0, conferenteId: s.operadorId, recolhidoCentavos: saldo, trocoRestanteCentavos: 0 };
  const m = mut('caixa', { ...item.caixa, fechamento });
  const r = await pushar(s, [m]);
  if (aceita(r, m.id)) { const i = turnosAbertos.findIndex(t => t.id === id); if (i >= 0) turnosAbertos.splice(i, 1); }
  return r;
}
const receber = (s: Sessao, vendaId: string, valorCentavos: number, meio: string, caixaId: string | null, id: string = randomUUID(), motivo = 'F14 recebimento de fiado') =>
  http('POST', '/fiado/recebimentos', { token: s.token, corpo: { id, vendaId, valorCentavos, meio, caixaId, motivo } });
const estornar = (s: Sessao, recebimentoId: string, caixaId: string | null, id: string = randomUUID(), motivo = 'F14 estorno integral de recebimento') =>
  http('POST', '/fiado/estornos', { token: s.token, corpo: { id, recebimentoId, caixaId, motivo } });
const evento = (r: Resposta) => r.corpo;

async function puxarTudo(token: string) {
  const mapa = new Map<string, any>();
  let cursor = '0';
  for (let pagina = 0; pagina < 500; pagina++) {
    const r = await http('GET', '/sync/pull', { token, query: { desde: cursor } });
    if (r.status !== 200) return { status: r.status, mudancas: [] as any[] };
    if (!r.corpo.mudancas.length) break;
    for (const m of r.corpo.mudancas) { const chave = m.entidade + ':' + m.dados.id; if (m.operacao === 'delete') mapa.delete(chave); else mapa.set(chave, m); }
    if (r.corpo.cursor === cursor) break;
    cursor = r.corpo.cursor;
  }
  return { status: 200, mudancas: [...mapa.values()] };
}

// ---------- seção 1: estoque ----------
async function secaoEstoque() {
  const d = S.dono!;
  const p = produtoNovo(d.lojaId, `F14 Estoque ${sufixo}`, 250, 5000, 1000);
  const lerEstoque = async () => {
    const r = await http('GET', '/estoque', { token: d.token });
    const parse = EstoqueResSchema.safeParse(r.corpo);
    return { r, parse, saldo: (r.corpo?.saldos ?? []).find((x: any) => x.produtoId === p.id), movs: (r.corpo?.movimentos ?? []).filter((m: any) => m.produtoId === p.id) as any[] };
  };
  const mp = mut('produto', p), rp = await pushar(d, [mp]);
  await conferir('Estoque: produto com controle criado (5 un, mínimo 1 un)', 'push aceito', descPush(rp, mp.id), aceita(rp, mp.id));
  if (!aceita(rp, mp.id)) return;
  ids.A.produtos.add(p.id);
  let e = await lerEstoque();
  await conferir('Estoque: contrato de GET /estoque e abertura única do produto', 'schema ok; 1 movimento inicial de 5000; saldo 5000',
    `schema=${e.parse.success} movimentos=${e.movs.map(m => m.tipo + ':' + m.quantidadeMilesimos).join(',')} saldo=${e.saldo?.saldoMilesimos}`,
    e.parse.success && e.movs.length === 1 && e.movs[0].tipo === 'inicial' && e.movs[0].quantidadeMilesimos === 5000 && e.saldo?.saldoMilesimos === 5000);
  passo('estoque', 'produto criado', { produtoId: p.id, nome: p.nome, precoCentavos: 250, saldoMilesimos: e.saldo?.saldoMilesimos, minimoMilesimos: 1000 });

  // venda de 1 unidade (Pix, sem turno) -> exatamente uma baixa
  const v1 = vendaNova(d, { itens: [itemVenda(p.nome, 250, 1000, p.id)], pagamentos: [pagamento('pix', 250)] });
  const m1 = mut('venda', v1), r1 = await pushar(d, [m1]);
  await conferir('Estoque: venda de 1 un enviada por sync é aceita', 'aceita', descPush(r1, m1.id), aceita(r1, m1.id));
  if (!aceita(r1, m1.id)) return;
  ids.A.vendas.add(v1.id); esperarVenda(v1);
  const baixas = (x: typeof e) => x.movs.filter(m => m.tipo === 'venda');
  e = await lerEstoque();
  await conferir('Estoque: exatamente UMA baixa de -1000 ligada ao item vendido', '1 baixa, -1000, saldo 4000', `baixas=${baixas(e).length} qtd=${baixas(e)[0]?.quantidadeMilesimos} item=${baixas(e)[0]?.itemVendaId === v1.itens[0].id} saldo=${e.saldo?.saldoMilesimos}`,
    baixas(e).length === 1 && baixas(e)[0].quantidadeMilesimos === -1000 && baixas(e)[0].itemVendaId === v1.itens[0].id && e.saldo?.saldoMilesimos === 4000);
  passo('estoque', 'apos venda de 1 un', { vendaId: v1.id, saldoMilesimos: e.saldo?.saldoMilesimos, baixas: baixas(e).length });
  const rr = await pushar(d, [m1]);
  e = await lerEstoque();
  await conferir('Estoque: reenvio do MESMO lote (mesma mutação) mantém uma baixa e o saldo', 'aceita; 1 baixa; saldo 4000', `${descPush(rr, m1.id)} baixas=${baixas(e).length} saldo=${e.saldo?.saldoMilesimos}`, aceita(rr, m1.id) && baixas(e).length === 1 && e.saldo?.saldoMilesimos === 4000);
  const m1b = { ...m1, id: randomUUID() }, rn = await pushar(d, [m1b]);
  e = await lerEstoque();
  await conferir('Estoque: reenvio com NOVO id de mutação para o mesmo item de venda mantém uma baixa e o saldo', 'aceita; 1 baixa; saldo 4000', `${descPush(rn, m1b.id)} baixas=${baixas(e).length} saldo=${e.saldo?.saldoMilesimos}`, aceita(rn, m1b.id) && baixas(e).length === 1 && e.saldo?.saldoMilesimos === 4000);
  passo('estoque', 'apos reenvios', { saldoMilesimos: e.saldo?.saldoMilesimos, baixas: baixas(e).length });

  // venda além do saldo -> estoque negativo aceito e visível
  const v2 = vendaNova(d, { itens: [itemVenda(p.nome, 250, 5000, p.id)], pagamentos: [pagamento('pix', 1250)] });
  const m2 = mut('venda', v2), r2 = await pushar(d, [m2]);
  await conferir('Estoque: venda de 5 un com saldo de 4 un é aceita (negativo permitido)', 'aceita', descPush(r2, m2.id), aceita(r2, m2.id));
  if (aceita(r2, m2.id)) { ids.A.vendas.add(v2.id); esperarVenda(v2); }
  e = await lerEstoque();
  await conferir('Estoque: saldo -1000 e divergência (negativo=true) visíveis em GET /estoque', 'saldo -1000, negativo=true, 2 baixas', `saldo=${e.saldo?.saldoMilesimos} negativo=${e.saldo?.negativo} baixas=${baixas(e).length}`, e.saldo?.saldoMilesimos === -1000 && e.saldo?.negativo === true && baixas(e).length === 2);
  passo('estoque', 'estoque negativo', { vendaId: v2.id, saldoMilesimos: e.saldo?.saldoMilesimos, negativo: e.saldo?.negativo, baixas: baixas(e).length });

  // ajuste = diferença assinada, idempotente
  const chave = randomUUID(), ajuste = { id: chave, produtoId: p.id, tipo: 'ajuste', quantidadeMilesimos: 3000, motivo: 'F14 inventário: contagem física corrigiu o saldo negativo em +3 un' };
  const a1 = await http('POST', '/estoque/movimentos', { token: d.token, corpo: ajuste });
  const a2 = await http('POST', '/estoque/movimentos', { token: d.token, corpo: ajuste });
  e = await lerEstoque();
  await conferir('Estoque: ajuste (+3000) com a mesma chave enviado 2x vira UM movimento', '200/200, 1 movimento, saldo 2000', `${a1.status}/${a2.status} movimentos=${e.movs.filter(m => m.id === chave).length} saldo=${e.saldo?.saldoMilesimos}`, a1.status === 200 && a2.status === 200 && e.movs.filter(m => m.id === chave).length === 1 && e.saldo?.saldoMilesimos === 2000);
  const aDif = await http('POST', '/estoque/movimentos', { token: d.token, corpo: { ...ajuste, quantidadeMilesimos: 3001 } });
  e = await lerEstoque();
  await conferir('Estoque: mesma chave com payload diferente é recusada e não altera o saldo', '409/conflito; saldo 2000', `${descrever(aDif)} saldo=${e.saldo?.saldoMilesimos}`, aDif.status === 409 && aDif.erro === 'conflito' && e.saldo?.saldoMilesimos === 2000);
  const abs1 = await http('POST', '/estoque/movimentos', { token: d.token, corpo: { id: randomUUID(), produtoId: p.id, tipo: 'ajuste', saldoMilesimos: 2000, motivo: 'F14 ajuste absoluto não pode existir' } });
  const abs2 = await http('POST', '/estoque/movimentos', { token: d.token, corpo: { ...ajuste, id: randomUUID(), saldoAbsolutoMilesimos: 1 } });
  e = await lerEstoque();
  await conferir('Estoque: ajuste com saldo absoluto não existe no contrato (strict)', '400/requisicao_invalida x2; saldo 2000', `${descrever(abs1)} e ${descrever(abs2)} saldo=${e.saldo?.saldoMilesimos}`, abs1.status === 400 && abs2.status === 400 && e.saldo?.saldoMilesimos === 2000);
  passo('estoque', 'apos ajuste', { ajusteId: chave, saldoMilesimos: e.saldo?.saldoMilesimos, negativo: e.saldo?.negativo });

  // devolução de estoque referenciada ao item vendido
  const dev = { id: randomUUID(), produtoId: p.id, tipo: 'devolucao', quantidadeMilesimos: 500, motivo: 'F14 devolução parcial de 0,5 un', itemVendaId: v1.itens[0].id };
  const d1 = await http('POST', '/estoque/movimentos', { token: d.token, corpo: dev }), d2 = await http('POST', '/estoque/movimentos', { token: d.token, corpo: dev });
  const dEx = await http('POST', '/estoque/movimentos', { token: d.token, corpo: { ...dev, id: randomUUID(), quantidadeMilesimos: 600 } });
  e = await lerEstoque();
  await conferir('Estoque: devolução de 0,5 un do item vendido (repetida = 1 movimento) e excesso recusado', '200/200; excesso 409; saldo 2500', `${d1.status}/${d2.status}; excesso=${descrever(dEx)}; saldo=${e.saldo?.saldoMilesimos}; devolucoes=${e.movs.filter(m => m.tipo === 'devolucao').length}`,
    d1.status === 200 && d2.status === 200 && dEx.status === 409 && e.saldo?.saldoMilesimos === 2500 && e.movs.filter(m => m.tipo === 'devolucao').length === 1);
  passo('estoque', 'apos devolução', { saldoMilesimos: e.saldo?.saldoMilesimos, movimentosPorTipo: e.movs.reduce((a: Record<string, number>, m) => ({ ...a, [m.tipo]: (a[m.tipo] ?? 0) + 1 }), {}) });
  dados.estoque.produto = { id: p.id, nome: p.nome };
  dados.estoque.saldoFinalMilesimos = e.saldo?.saldoMilesimos;

  // operador comum não ajusta nem vê o histórico de movimentos
  const o = S.operador;
  if (!o) await pular('Estoque: operador comum não cadastra movimentos', 'sem --operador');
  else if (o.permissoes.some(x => ['cadastrar_produto', 'conferir_caixas'].includes(x))) await pular('Estoque: operador comum não cadastra movimentos', 'o operador informado tem cadastrar_produto/conferir_caixas (não é operador comum)');
  else {
    await recusaEm('Estoque: operador não registra ajuste', await http('POST', '/estoque/movimentos', { token: o.token, corpo: { ...ajuste, id: randomUUID() } }), ['403/permissao_negada']);
    const eo = await http('GET', '/estoque', { token: o.token });
    await conferir('Estoque: operador não recebe o histórico de movimentos', '200 e 0 movimentos', `${descrever(eo)} movimentos=${eo.corpo?.movimentos?.length}`, eo.status === 200 && eo.corpo.movimentos.length === 0);
  }
}

// ---------- seção 2: fiado ----------
const atorCaixa = (): Sessao => {
  const g = S.gerente;
  if (g && ['vender', 'movimentar_proprio_caixa', 'cancelar_venda', 'retirar_dinheiro'].every(x => g.permissoes.includes(x))) return g;
  if (g) notas.push('O gerente informado não tem todas as permissões de caixa/estorno; o dono assumiu o papel de caixa.');
  return S.dono!;
};
async function secaoFiado() {
  const c = estado.caixa ??= atorCaixa(), d = S.dono!;
  const rotulo = c === d ? 'dono' : 'gerente';
  const t1 = await abrirTurno(c, `T1 (${rotulo})`, 1000);
  const cash = t1 !== null;
  const meioRec = cash ? 'dinheiro' : 'pix';
  const cli = { id: randomUUID(), nome: `F14 Cliente ${sufixo}`, contato: 'F14 contato de teste' };
  const rc = await http('POST', '/clientes', { token: c.token, corpo: cli }), rc2 = await http('POST', '/clientes', { token: c.token, corpo: cli });
  await conferir('Fiado: cliente novo criado (POST /clientes) e repetição idempotente', '200/200 mesmo cadastro', `${rc.status}/${rc2.status} igual=${JSON.stringify(rc.corpo) === JSON.stringify(rc2.corpo)}`, rc.status === 200 && rc2.status === 200 && rc.corpo?.id === cli.id && JSON.stringify(rc.corpo) === JSON.stringify(rc2.corpo));
  if (rc.status !== 200) return;
  ids.A.clientes.add(cli.id);
  const hojeSP = diaCivilSP(relogioServidor ?? Date.now());
  const fiadoDe = (valor: number, dias: number) => ({ clienteId: cli.id, vencimento: somarDiasData(hojeSP, dias), valorCentavos: valor });
  const item1 = itemVenda(`F14 Venda fiada ${sufixo}`, 1000, 1000);

  // vendas inconsistentes/clientes inválidos são rejeitados sem efeito
  const vBad = vendaNova(c, { caixaId: t1, itens: [item1], pagamentos: [pagamento(meioRec, 300)], fiado: fiadoDe(600, 7) });
  const mBad = mut('venda', vBad), rBad = await pushar(c, [mBad]);
  await conferir('Fiado: entrada + crédito diferente do total é rejeitada (venda_inconsistente)', 'rejeitada=venda_inconsistente', descPush(rBad, mBad.id), motivoDe(rBad, mBad.id) === 'venda_inconsistente');
  const vCli = vendaNova(c, { caixaId: t1, itens: [item1], pagamentos: [pagamento(meioRec, 300)], fiado: { ...fiadoDe(700, 7), clienteId: randomUUID() } });
  const mCli = mut('venda', vCli), rCli = await pushar(c, [mCli]);
  await conferir('Fiado: cliente inexistente é rejeitado (cliente_invalido)', 'rejeitada=cliente_invalido', descPush(rCli, mCli.id), motivoDe(rCli, mCli.id) === 'cliente_invalido');

  // VF1: total 1000 = entrada 300 + crédito 700
  const vf1 = vendaNova(c, { caixaId: t1, itens: [item1], pagamentos: [pagamento(meioRec, 300)], fiado: fiadoDe(700, 7) });
  const mf1 = mut('venda', vf1), rf1 = await pushar(c, [mf1]);
  await conferir('Fiado: venda parcialmente fiada (entrada 300 + crédito 700 = 1000) é aceita', 'aceita', descPush(rf1, mf1.id), aceita(rf1, mf1.id));
  if (!aceita(rf1, mf1.id)) return;
  ids.A.vendas.add(vf1.id); esperarVenda(vf1);
  let ti = await titulo(c, vf1.id);
  const contratoFiado = FiadoResSchema.safeParse(ti.r.corpo);
  await conferir('Fiado: título criado com saldo devedor 700 (contrato GET /fiado válido)', 'schema ok; valor 700 recebido 0 saldo 700', `schema=${contratoFiado.success} ${tituloTxt(ti.t)}`, contratoFiado.success && ti.t?.valorCentavos === 700 && ti.t.recebidoCentavos === 0 && ti.t.saldoCentavos === 700 && ti.t.cancelado === false);
  passo('fiado', 'venda fiada criada', { vendaId: vf1.id, clienteId: cli.id, clienteNome: cli.nome, totalCentavos: 1000, entradaCentavos: 300, entradaMeio: meioRec, creditoCentavos: 700, vencimento: vf1.fiado!.vencimento, saldoDevedorCentavos: ti.t?.saldoCentavos });

  let t2: string | null = null;
  const esperadoT1Antes = cash ? await saldoTurno(d, t1!) : null;
  if (cash) {
    await conferir('Fiado: gaveta do turno T1 = troco 1000 + entrada 300', 'esperado 1300', 'esperado=' + esperadoT1Antes, esperadoT1Antes === 1300);
    const fx = await fecharTurno(c, t1!);
    const e1 = await saldoTurno(d, t1!), pn = (await painel(d)).find(i => i.caixa.id === t1);
    await conferir('Fiado: turno T1 fechado (contado = esperado = 1300)', 'fechado, esperado 1300', `${fx ? descrever(fx) : 'não fechado'} esperado=${e1} fechado=${!!pn?.caixa.fechamento}`, !!fx && !!pn?.caixa.fechamento && e1 === 1300 && pn.caixa.fechamento.esperadoCentavos === 1300);
    t2 = await abrirTurno(c, `T2 (${rotulo}, receptor)`, 500);
    estado.t2 = t2;
  } else notas.push('Fiado: sem turno disponível para o ator de caixa; recebimentos em dinheiro substituídos por Pix e checks de gaveta omitidos.');
  const cashRec = cash && t2 !== null;
  const meioR1 = cashRec ? 'dinheiro' : 'pix';
  const gavetaT2 = async () => (cashRec ? await saldoTurno(d, t2!) : null);
  const t2Antes = await gavetaT2();
  if (cashRec) await conferir('Fiado: gaveta do turno receptor T2 começa com o troco de 500', 'esperado 500', 'esperado=' + t2Antes, t2Antes === 500);

  // recebimento parcial 300
  const r1 = await receber(c, vf1.id, 300, meioR1, cashRec ? t2 : null);
  const e1 = evento(r1);
  await conferir(`Fiado: recebimento parcial online de 300 (${meioR1})${cashRec ? ' no turno T2 (receptor)' : ''}`, '200 e evento recebimento 300', descrever(r1), r1.status === 200 && e1?.tipo === 'recebimento' && e1.valorCentavos === 300 && (!cashRec || e1.caixaId === t2));
  if (r1.status === 200) esperarEvento(e1);
  if (r1.status === 200) ids.A.eventos.add(e1.id);
  ti = await titulo(c, vf1.id);
  await conferir('Fiado: saldo devedor após o recebimento parcial = 400', 'recebido 300 saldo 400', tituloTxt(ti.t), ti.t?.recebidoCentavos === 300 && ti.t.saldoCentavos === 400);
  if (cashRec) {
    const t2Dep = await gavetaT2(), t1Dep = await saldoTurno(d, t1!);
    const pn = await painel(d), mv = (id: string) => (pn.find(i => i.caixa.id === id)?.caixa.movimentos ?? []).map((m: any) => m.id);
    await conferir('Fiado: dinheiro entra no turno RECEPTOR T2 (300) e não no turno da venda T1', 'T2 500->800; T1 fechado em 1300; movimento só em T2', `T2 ${t2Antes}->${t2Dep}; T1=${t1Dep}; movT2=${mv(t2!).includes(e1?.id)} movT1=${mv(t1!).includes(e1?.id)}`, t2Dep === 800 && t1Dep === 1300 && mv(t2!).includes(e1?.id) && !mv(t1!).includes(e1?.id));
    passo('fiado', 'recebimento parcial em dinheiro (turno receptor)', { recebimentoId: e1?.id, turnoVendaId: t1, turnoVendaEsperadoCentavos: t1Dep, turnoReceptorId: t2, turnoReceptorAntesCentavos: t2Antes, turnoReceptorDepoisCentavos: t2Dep, saldoDevedorCentavos: ti.t?.saldoCentavos });
    const rT1 = await receber(c, vf1.id, 100, 'dinheiro', t1!);
    await recusaEm('Fiado: dinheiro em turno FECHADO (T1) é recusado', rT1, ['409/conflito']);
  } else passo('fiado', 'recebimento parcial (Pix)', { recebimentoId: e1?.id, saldoDevedorCentavos: ti.t?.saldoCentavos });
  const rep = await receber(c, vf1.id, 300, meioR1, cashRec ? t2 : null, e1?.id);
  ti = await titulo(c, vf1.id);
  await conferir('Fiado: reenvio da mesma chave devolve o mesmo evento sem novo crédito', '200, mesmo id, saldo 400', `${descrever(rep)} mesmoId=${evento(rep)?.id === e1?.id} ${tituloTxt(ti.t)} gaveta=${cashRec ? await gavetaT2() : 'n/a'}`, rep.status === 200 && evento(rep)?.id === e1?.id && ti.t?.saldoCentavos === 400 && (!cashRec || (await gavetaT2()) === 800));
  await recusaEm('Fiado: recebimento acima do saldo (401 > 400) é recusado', await receber(c, vf1.id, 401, 'pix', null), ['409/conflito']);

  // Pix manual não mexe na gaveta
  const gAntesPix = await gavetaT2();
  const r2 = await receber(c, vf1.id, 100, 'pix', null, randomUUID(), 'F14 recebimento Pix manual');
  const e2 = evento(r2);
  if (r2.status === 200) { esperarEvento(e2); ids.A.eventos.add(e2.id); }
  ti = await titulo(c, vf1.id);
  const gDepPix = await gavetaT2();
  await conferir('Fiado: recebimento Pix manual de 100 não altera a gaveta; saldo devedor 300', '200; gaveta igual; saldo 300', `${descrever(r2)} gaveta ${gAntesPix}->${gDepPix} ${tituloTxt(ti.t)}`, r2.status === 200 && gAntesPix === gDepPix && ti.t?.saldoCentavos === 300 && ti.t.recebidoCentavos === 400);
  passo('fiado', 'recebimento Pix manual', { recebimentoId: e2?.id, gavetaTurnoReceptorCentavos: gDepPix, saldoDevedorCentavos: ti.t?.saldoCentavos });
  if (r1.status !== 200 || r2.status !== 200) return;

  // estorno integral do recebimento 1
  const estId = randomUUID();
  const s1 = await estornar(c, e1.id, cashRec ? t2 : null, estId);
  const s1b = await estornar(c, e1.id, cashRec ? t2 : null, estId);
  const s2 = await estornar(c, e1.id, cashRec ? t2 : null);
  if (s1.status === 200) { esperarEvento(evento(s1)); ids.A.eventos.add(estId); }
  ti = await titulo(c, vf1.id);
  const gDepEst = await gavetaT2();
  await conferir('Fiado: estorno integral referenciado do recebimento 1 (300): aceito, repetível pela chave', '200 tipo=estorno valor 300 original=recebimento; replay 200 mesmo id', `${descrever(s1)} replay=${descrever(s1b)} mesmoId=${evento(s1b)?.id === estId} tipo=${evento(s1)?.tipo} orig=${evento(s1)?.originalId === e1.id}`, s1.status === 200 && s1b.status === 200 && evento(s1b)?.id === estId && evento(s1)?.tipo === 'estorno' && evento(s1)?.valorCentavos === 300 && evento(s1)?.originalId === e1.id);
  await recusaEm('Fiado: SEGUNDO estorno do mesmo recebimento é recusado (um por original)', s2, ['409/conflito']);
  await conferir('Fiado: após o estorno, saldo devedor 600 e dinheiro devolvido sai do turno receptor', cashRec ? 'saldo 600; T2 800->500' : 'saldo 600', `${tituloTxt(ti.t)} gaveta=${gDepEst}`, ti.t?.saldoCentavos === 600 && ti.t.recebidoCentavos === 100 && (!cashRec || gDepEst === 500));
  passo('fiado', 'apos estorno do recebimento 1', { estornoId: estId, saldoDevedorCentavos: ti.t?.saldoCentavos, gavetaTurnoReceptorCentavos: gDepEst });

  // cancelamento: recusado com recebimento líquido, aceito depois do estorno
  const cancTent = { ...vf1, status: 'cancelada', cancelamento: cancelamentoDe(c, 'F14 tentativa de cancelamento com recebimento líquido') };
  const mC1 = mut('venda', cancTent), rC1 = await pushar(c, [mC1]);
  await conferir('Fiado: cancelamento recusado enquanto há recebimento líquido (Pix 100)', 'rejeitada=fiado_com_recebimentos', descPush(rC1, mC1.id), motivoDe(rC1, mC1.id) === 'fiado_com_recebimentos');
  const s3 = await estornar(c, e2.id, null);
  if (s3.status === 200) { esperarEvento(evento(s3)); ids.A.eventos.add(evento(s3).id); }
  ti = await titulo(c, vf1.id);
  await conferir('Fiado: estorno do recebimento Pix (registro manual) zera o líquido recebido', '200; recebido 0; saldo 700', `${descrever(s3)} ${tituloTxt(ti.t)}`, s3.status === 200 && ti.t?.recebidoCentavos === 0 && ti.t.saldoCentavos === 700);
  const canc = { ...vf1, status: 'cancelada', cancelamento: cancelamentoDe(c, 'F14 cancelamento da venda fiada após estornos') };
  const mC2 = mut('venda', canc), rC2 = await pushar(c, [mC2]);
  await conferir('Fiado: cancelamento aceito depois do estorno', 'aceita', descPush(rC2, mC2.id), aceita(rC2, mC2.id));
  if (aceita(rC2, mC2.id)) esperarCancelamento(canc);
  ti = await titulo(c, vf1.id);
  const pull = await puxarTudo(c.token), vSrv = pull.mudancas.find(m => m.entidade === 'venda' && m.dados.id === vf1.id)?.dados;
  const entrada = vSrv?.pagamentos?.find((p: any) => p.valorCentavos === 300);
  const t1Final = await saldoTurno(d, t1 ?? ''), t2Final = await gavetaT2();
  await conferir('Fiado: após o cancelamento o saldo devedor é zero e a entrada original (300) permanece na venda', 'cancelado, saldo 0, crédito 700 preservado, entrada 300 preservada', `${tituloTxt(ti.t)} vendaStatus=${vSrv?.status} entrada=${entrada?.valorCentavos}/${entrada?.meio} total=${vSrv?.totalCentavos}`, ti.t?.cancelado === true && ti.t.saldoCentavos === 0 && ti.t.valorCentavos === 700 && vSrv?.status === 'cancelada' && entrada?.meio === meioRec && vSrv.totalCentavos === 1000);
  if (cash) await conferir('Fiado: cancelar não devolve dinheiro automaticamente (T1 continua 1300; T2 500)', 'T1 1300; T2 500', `T1=${t1Final} T2=${t2Final}`, t1Final === 1300 && (!cashRec || t2Final === 500));
  passo('fiado', 'apos cancelamento', { vendaId: vf1.id, saldoDevedorCentavos: ti.t?.saldoCentavos, creditoOriginalCentavos: ti.t?.valorCentavos, cancelado: ti.t?.cancelado, turnoVendaEsperadoCentavos: t1Final, turnoReceptorEsperadoCentavos: t2Final });
  dados.fiado.cliente = { id: cli.id, nome: cli.nome };
  dados.fiado.turnos = { vendaT1: t1, receptorT2: t2 };
}

// ---------- seção 3: recebimentos concorrentes ----------
async function secaoConcorrencia() {
  const c = estado.caixa ??= atorCaixa(), d = S.dono!;
  const rotulo = c === d ? 'dono' : 'gerente';
  if (!estado.t2) estado.t2 = await abrirTurno(c, `T3 (${rotulo}, concorrência)`, 500);
  const t2 = estado.t2;
  // 2º aparelho: o dono (quando o caixa é o gerente) ou 2ª sessão do dono em outro aparelhoId
  const outro: Sessao | undefined = c === d ? S.dono2 : d;
  if (!outro) { await pular('Concorrência: dois aparelhos distintos', 'sem 2º aparelho (autenticação do dono-aparelho2 indisponível)'); return; }
  let tOutro: string | null = null;
  if (outro === d && c !== d) tOutro = await abrirTurno(d, 'dono (2º receptor)', 300);
  const dev1 = { rotulo: 'aparelho 1 (' + rotulo + ')', s: c, caixa: t2 }, dev2 = { rotulo: 'aparelho 2', s: outro, caixa: tOutro };
  const meioDe = (x: { caixa: string | null }) => (x.caixa ? 'dinheiro' : 'pix');
  await conferir('Concorrência: aparelhos distintos e sessões distintas', 'aparelhoId diferentes', `distintos=${dev1.s.aparelhoId !== dev2.s.aparelhoId} operadoresDistintos=${dev1.s.operadorId !== dev2.s.operadorId}`, dev1.s.aparelhoId !== dev2.s.aparelhoId);

  const cli = { id: randomUUID(), nome: `F14 Cliente concorrência ${sufixo}`, contato: 'F14 contato de teste' };
  const rc = await http('POST', '/clientes', { token: c.token, corpo: cli });
  if (rc.status !== 200) { await conferir('Concorrência: cliente criado', '200', descrever(rc), false); return; }
  ids.A.clientes.add(cli.id);
  const vf2 = vendaNova(c, { caixaId: t2, itens: [itemVenda(`=F14 Venda fiada 2 ${sufixo} (teste de fórmula)`, 1000, 1000)], fiado: { clienteId: cli.id, vencimento: somarDiasData(diaCivilSP(relogioServidor ?? Date.now()), -1), valorCentavos: 1000 } });
  const mv = mut('venda', vf2), rv = await pushar(c, [mv]);
  await conferir('Concorrência: venda 100% fiada de 1000 (vencida) criada para a corrida', 'aceita', descPush(rv, mv.id), aceita(rv, mv.id));
  if (!aceita(rv, mv.id)) return;
  ids.A.vendas.add(vf2.id); esperarVenda(vf2); estado.vf2 = vf2;
  dados.concorrencia = { passos: [], clienteNome: cli.nome, vendaId: vf2.id, creditoCentavos: 1000, vencimento: vf2.fiado!.vencimento };

  // negativo: dinheiro do 2º aparelho no turno do 1º é recusado (turno de outro aparelho/operador)
  if (t2) await recusaEm('Concorrência: dinheiro do 2º aparelho no turno do 1º é recusado', await receber(dev2.s, vf2.id, 50, 'dinheiro', t2), ['409/conflito', '403/permissao_negada']);

  const gaveta = async () => ({ t1: dev1.caixa ? await saldoTurno(d, dev1.caixa) : null, t2: dev2.caixa ? await saldoTurno(d, dev2.caixa) : null });
  // corrida 1: 700 + 700 contra saldo 1000
  const antes = await gaveta();
  const k1 = randomUUID(), k2 = randomUUID();
  const [x1, x2] = await Promise.all([receber(dev1.s, vf2.id, 700, meioDe(dev1), dev1.caixa, k1, 'F14 corrida 1'), receber(dev2.s, vf2.id, 700, meioDe(dev2), dev2.caixa, k2, 'F14 corrida 1')]);
  const aceitos1 = [[dev1, x1, k1], [dev2, x2, k2]].filter(([, r]) => (r as Resposta).status === 200) as [typeof dev1, Resposta, string][];
  for (const [, r] of aceitos1) { esperarEvento(r.corpo); ids.A.eventos.add(r.corpo.id); }
  let ti = await titulo(c, vf2.id);
  const depois = await gaveta();
  await conferir('Concorrência 1: dois recebimentos de 700 contra saldo 1000: exatamente um aceito', 'um 200 e um 409; recebido 700; saldo 300', `${x1.status}/${x2.status} ${tituloTxt(ti.t)}`, [x1.status, x2.status].sort().join() === '200,409' && ti.t?.recebidoCentavos === 700 && ti.t.saldoCentavos === 300);
  await conferir('Concorrência 1: saldo devedor nunca negativo e total aceito <= saldo', 'saldo >= 0; recebido <= 1000', tituloTxt(ti.t), (ti.t?.saldoCentavos ?? -1) >= 0 && (ti.t?.recebidoCentavos ?? 9e9) <= 1000);
  const cashAceito = aceitos1.filter(([dv]) => dv.caixa).length;
  const dinheiroOk = (dev: typeof dev1, antesV: number | null, depoisV: number | null, aceitoNeste: boolean) => !dev.caixa || (aceitoNeste ? depoisV === (antesV ?? 0) + 700 : depoisV === antesV);
  if (dev1.caixa || dev2.caixa) await conferir('Concorrência 1: dinheiro aceito entra só no turno RECEPTOR do aparelho vencedor', 'turno vencedor +700; perdedor igual', `T(ap1) ${antes.t1}->${depois.t1}; T(ap2) ${antes.t2}->${depois.t2}; aceitos em dinheiro=${cashAceito}`,
    dinheiroOk(dev1, antes.t1, depois.t1, x1.status === 200) && dinheiroOk(dev2, antes.t2, depois.t2, x2.status === 200));
  else await pular('Concorrência 1: dinheiro no turno receptor', 'nenhum dos aparelhos tem turno aberto (corrida feita em Pix)');
  const venceu = x1.status === 200 ? { dev: dev1, r: x1, k: k1 } : { dev: dev2, r: x2, k: k2 };
  const perdeu = x1.status === 200 ? { dev: dev2, k: k2 } : { dev: dev1, k: k1 };
  passo('concorrencia', 'corrida 1 (700 x 700 / saldo 1000)', { statusAp1: x1.status, statusAp2: x2.status, saldoDevedorCentavos: ti.t?.saldoCentavos, recebidoCentavos: ti.t?.recebidoCentavos, gavetaAntes: antes, gavetaDepois: depois, meios: [meioDe(dev1), meioDe(dev2)] });
  if (x1.status === 200 || x2.status === 200) {
    const reV = await receber(venceu.dev.s, vf2.id, 700, meioDe(venceu.dev), venceu.dev.caixa, venceu.k, 'F14 corrida 1');
    const reP = await receber(perdeu.dev.s, vf2.id, 700, meioDe(perdeu.dev), perdeu.dev.caixa, perdeu.k, 'F14 corrida 1');
    ti = await titulo(c, vf2.id);
    const depois2 = await gaveta();
    await conferir('Concorrência 1: reenvio da mesma chave devolve o mesmo resultado (vencedora 200 igual; perdedora segue 409) sem novo efeito', 'vencedora 200 mesmo id; perdedora 409; saldo 300; gaveta igual', `${descrever(reV)} mesmoId=${reV.corpo?.id === venceu.r.corpo.id}; ${descrever(reP)}; ${tituloTxt(ti.t)}; gaveta ${JSON.stringify(depois)}->${JSON.stringify(depois2)}`,
      reV.status === 200 && reV.corpo?.id === venceu.r.corpo.id && reP.status === 409 && ti.t?.saldoCentavos === 300 && JSON.stringify(depois) === JSON.stringify(depois2));
  }

  // corrida 2: saldo 300; chave K3 enviada 2x + chave K4, todas de 200
  const k3 = randomUUID(), k4 = randomUUID();
  const antes2 = await gaveta();
  const [y1, y1b, y2] = await Promise.all([receber(dev1.s, vf2.id, 200, meioDe(dev1), dev1.caixa, k3, 'F14 corrida 2'), receber(dev1.s, vf2.id, 200, meioDe(dev1), dev1.caixa, k3, 'F14 corrida 2'), receber(dev2.s, vf2.id, 200, meioDe(dev2), dev2.caixa, k4, 'F14 corrida 2')]);
  for (const r of [y1, y2]) if (r.status === 200) { esperarEvento(r.corpo); ids.A.eventos.add(r.corpo.id); }
  ti = await titulo(c, vf2.id);
  const aplicados = ti.eventos.filter((e: any) => [k3, k4].includes(e.id));
  const depois3 = await gaveta();
  await conferir('Concorrência 2: duas chaves de 200 contra saldo 300 (uma enviada 2x): cada chave aplica no máximo uma vez e só uma é aceita', 'exatamente 1 evento entre K3/K4; saldo 100', `K3=${y1.status}/${y1b.status} K4=${y2.status} eventos=${aplicados.length} ${tituloTxt(ti.t)}`,
    aplicados.length === 1 && ti.t?.saldoCentavos === 100 && ti.t.recebidoCentavos === 900 && (y1.status === 200) === (y1b.status === 200) && (y1.status === 200 ? y1.corpo.id === y1b.corpo.id : true));
  const k3Ok = y1.status === 200;
  if (dev1.caixa || dev2.caixa) await conferir('Concorrência 2: dinheiro aceito entra só no turno receptor vencedor', 'vencedor +200; outro igual', `T(ap1) ${antes2.t1}->${depois3.t1}; T(ap2) ${antes2.t2}->${depois3.t2}`,
    (!dev1.caixa || depois3.t1 === (antes2.t1 ?? 0) + (k3Ok ? 200 : 0)) && (!dev2.caixa || depois3.t2 === (antes2.t2 ?? 0) + (k3Ok ? 0 : 200)));
  passo('concorrencia', 'corrida 2 (K3 x2 + K4, 200 cada / saldo 300)', { statusK3: [y1.status, y1b.status], statusK4: y2.status, saldoDevedorCentavos: ti.t?.saldoCentavos, recebidoCentavos: ti.t?.recebidoCentavos, gavetaAntes: antes2, gavetaDepois: depois3 });
  dados.concorrencia.saldoFinalCentavos = ti.t?.saldoCentavos;
  dados.concorrencia.turnos = { aparelho1: dev1.caixa, aparelho2: dev2.caixa };

  // operador comum: não recebe nem estorna em venda alheia
  const o = S.operador;
  if (!o) await pular('Concorrência: operador comum não recebe/estorna venda de outro responsável', 'sem --operador');
  else if (o.permissoes.some(x => ['conferir_caixas', 'cancelar_venda'].includes(x))) await pular('Concorrência: operador comum não recebe/estorna venda de outro responsável', 'o operador informado tem conferir_caixas/cancelar_venda');
  else {
    await recusaEm('Concorrência: operador comum não recebe fiado de venda alheia', await receber(o, vf2.id, 10, 'pix', null), ['403/permissao_negada']);
    const eventoQualquer = ti.eventos[0]?.id;
    if (eventoQualquer) await recusaEm('Concorrência: operador comum não estorna recebimento', await estornar(o, eventoQualquer, null), ['403/permissao_negada']);
    const fo = await http('GET', '/fiado', { token: o.token });
    await conferir('Concorrência: operador comum não vê títulos nem eventos de outros responsáveis', '0 títulos e 0 eventos de F14', `${descrever(fo)} titulos=${fo.corpo?.titulos?.length} eventos=${fo.corpo?.eventos?.length}`, fo.status === 200 && fo.corpo.titulos.every((t: any) => t.operadorId === o.operadorId) && fo.corpo.eventos.every((e: any) => e.operadorId === o.operadorId));
  }
  ti = await titulo(c, vf2.id);
  dados.concorrencia.saldoDevedorCentavosFinal = ti.t?.saldoCentavos;
}

// ---------- CSV ----------
function lerCsv(texto: string): { v: string; aspas: boolean }[][] {
  const t = texto.replace(/^﻿/, ''), linhasOut: { v: string; aspas: boolean }[][] = [];
  let linha: { v: string; aspas: boolean }[] = [], campo = '', aspas = false, dentro = false, i = 0;
  const fim = () => { linha.push({ v: campo, aspas }); campo = ''; aspas = false; };
  while (i < t.length) {
    const ch = t[i]!;
    if (dentro) { if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else dentro = false; } else campo += ch; }
    else if (ch === '"') { dentro = true; aspas = true; }
    else if (ch === ';') fim();
    else if (ch === '\r' && t[i + 1] === '\n') { fim(); linhasOut.push(linha); linha = []; i++; }
    else campo += ch;
    i++;
  }
  fim(); linhasOut.push(linha);
  return linhasOut;
}
const FORMULA = /^[\s﻿]*[=+@-]/;
async function validarCsv(rotulo: string, rel: any, destino: string | null) {
  const csv = csvRelatorio(rel), linhasCsv = lerCsv(csv);
  const cab = linhasCsv[0]!.map(c => c.v).join(';');
  const eventos = linhasCsv.filter(l => l[0]?.v === 'evento'), totais = linhasCsv.filter(l => l[0]?.v === 'total');
  await conferir(`CSV ${rotulo}: BOM, cabeçalho, linha de filtros e 11 colunas em todas as linhas`, 'BOM; cabeçalho esperado; 11 colunas', `bom=${csv.startsWith('﻿')} colunas=${new Set(linhasCsv.map(l => l.length)).size === 1 ? linhasCsv[0]!.length : 'irregular'} linhas=${linhasCsv.length}`,
    csv.startsWith('﻿') && cab === 'tipo;id;loja;operador;turno;instante;categoria;meio;centavos;descricao;autor' && linhasCsv[1]?.[0]?.v === 'filtros' && linhasCsv.every(l => l.length === 11) && linhasCsv.length === 2 + rel.linhas.length + CATEGORIAS_RELATORIO.length);
  const tabelaCsv: Record<string, number> = Object.fromEntries(totais.map(l => [l[6]!.v, Number(l[8]!.v)]));
  const centavosNumericos = [...eventos, ...totais].every(l => !l[8]!.aspas && /^-?\d+$/.test(l[8]!.v));
  await conferir(`CSV ${rotulo}: totais do CSV == totais do JSON da API (todas as categorias)`, 'iguais, centavos inteiros sem aspas', `categorias=${totais.length} iguais=${CATEGORIAS_RELATORIO.every(c => tabelaCsv[c] === rel.totais[c])} numericos=${centavosNumericos}`, CATEGORIAS_RELATORIO.every(c => tabelaCsv[c] === rel.totais[c]) && centavosNumericos);
  const somaEv: Record<string, number> = {};
  for (const l of eventos) somaEv[l[6]!.v] = (somaEv[l[6]!.v] ?? 0) + Number(l[8]!.v);
  await conferir(`CSV ${rotulo}: soma das linhas "evento" por categoria == linhas "total"`, 'iguais', 'iguais=' + CATEGORIAS_RELATORIO.every(c => (somaEv[c] ?? 0) === tabelaCsv[c]) + ` eventos=${eventos.length}`, eventos.length === rel.linhas.length && CATEGORIAS_RELATORIO.every(c => (somaEv[c] ?? 0) === tabelaCsv[c]));
  const idsCsv = new Set(eventos.map(l => l[1]!.v)), idsApi = new Set(rel.linhas.map((l: any) => l.id));
  await conferir(`CSV ${rotulo}: mesmos IDs de evento da API`, 'conjuntos iguais', `csv=${idsCsv.size} api=${idsApi.size}`, idsCsv.size === idsApi.size && [...idsApi].every(i => idsCsv.has(i as string)));
  const formulasCruas = [...eventos].flatMap(l => l.filter(c => c.aspas && FORMULA.test(c.v)));
  const originais = rel.linhas.filter((l: any) => FORMULA.test(l.descricao));
  const neutralizadas = originais.every((l: any) => eventos.some(e => e[1]!.v === l.id && e[9]!.v === "'" + l.descricao));
  await conferir(`CSV ${rotulo}: nenhuma célula de texto começa com fórmula (=,+,-,@) e as descrições-fórmula reais saem com apóstrofo`, '0 células perigosas; descrições-fórmula neutralizadas', `perigosas=${formulasCruas.length} descricoesFormulaNaAPI=${originais.length} neutralizadas=${neutralizadas}`, formulasCruas.length === 0 && neutralizadas);
  if (destino) { await writeFile(destino, csv); notas.push(`CSV ${rotulo} gravado em ${destino} (sem credenciais).`); }
  return { linhas: eventos.length, bytes: Buffer.byteLength(csv) };
}
async function validarEscapeSintetico(base: any) {
  const hostis = ['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\t=1', ' =HYPERLINK("http://x";"y")', 'diz "oi"; tchau', 'duas\r\nlinhas'];
  const modelo = base.linhas[0] ?? { id: 'x', lojaId: randomUUID(), operadorId: randomUUID(), caixaId: null, em: agoraIso(), categoria: 'venda', meio: null, valorCentavos: -150, descricao: '' };
  const rel = { ...base, linhas: hostis.map((descricao, n) => ({ ...modelo, id: 'hostil-' + n, valorCentavos: n === 0 ? -150 : 100 + n, descricao })) };
  const parsed = lerCsv(csvRelatorio(rel)).filter(l => l[0]?.v === 'evento');
  const dores: string[] = [];
  hostis.forEach((h, n) => {
    const cel = parsed[n]?.[9];
    const esperado = FORMULA.test(h) ? "'" + h : h;
    if (!cel || cel.v !== esperado || !cel.aspas) dores.push(`#${n}`);
  });
  const neg = parsed[0]?.[8];
  await conferir('CSV (função compartilhada): escape de aspas/;/quebras e neutralização de =,+,-,@ e espaços antes da fórmula; negativo numérico', 'todos os casos hostis idênticos ao esperado; -150 sem aspas', `divergentes=${dores.join(',') || 'nenhum'} negativo=${neg?.v}/${neg?.aspas ? 'aspas' : 'numérico'} linhasLidas=${parsed.length}`, dores.length === 0 && parsed.length === hostis.length && neg?.v === '-150' && !neg.aspas);
}

// ---------- seção 4: relatório / CSV ----------
const relatorio = (s: Sessao, extra: Record<string, string>, janela: { inicio: string; fim: string }) => http('GET', '/relatorios', { token: s.token, query: { inicio: janela.inicio, fim: janela.fim, ...extra } });
const intervaloDia = (ms: number) => { const dia = diaCivilSP(ms), i = new Date(dia + 'T03:00:00.000Z'); return { dia, inicio: i.toISOString(), fim: new Date(i.getTime() + 86_400_000).toISOString() }; };
const somaPorCategoria = (linhasRel: any[]) => { const t: Record<string, number> = Object.fromEntries(CATEGORIAS_RELATORIO.map(c => [c, 0])); for (const l of linhasRel) t[l.categoria] = (t[l.categoria] ?? 0) + l.valorCentavos; return t; };
async function conferirLinhas(rotulo: string, rel: any, quais: Linha[]) {
  if (quais.length === 0) { await pular(`Relatório ${rotulo}: linhas F14 esperadas`, 'nenhuma operação aceita nas seções executadas'); return; }
  const porId = new Map<string, any>(rel.linhas.map((l: any) => [l.id, l])), problemas: string[] = [];
  for (const e of quais) {
    const l = porId.get(e.id);
    if (!l) problemas.push(e.id.slice(0, 8) + ':ausente');
    else if (l.categoria !== e.categoria || l.valorCentavos !== e.valorCentavos || l.meio !== e.meio || l.lojaId !== e.lojaId || (l.caixaId ?? null) !== e.caixaId) problemas.push(`${e.id.slice(0, 8)}:${l.categoria}/${l.valorCentavos}/${l.meio}/${l.caixaId === e.caixaId}`);
  }
  await conferir(`Relatório ${rotulo}: ${quais.length} linhas F14 esperadas presentes com categoria, valor, meio, loja e turno corretos`, 'nenhuma divergência', problemas.length ? problemas.slice(0, 6).join(' | ') : 'nenhuma', problemas.length === 0 && quais.length > 0);
}
async function secaoRelatorio() {
  const d = S.dono!, agora = relogioServidor ?? Date.now();
  const janela = { inicio: janelaInicio, fim: new Date(agora + 3_600_000).toISOString() };
  const dia = intervaloDia(agora), diaJanela = { inicio: dia.inicio, fim: dia.fim };
  dados.relatorios = { janelaExecucao: janela, diaCivilSaoPaulo: dia.dia, diaCivilJanela: diaJanela };
  const lojaA = d.lojaId, minhas = esperadas.filter(l => l.lojaId === lojaA);
  const rj = await relatorio(d, {}, janela);
  const parse = RelatorioSchema.safeParse(rj.corpo);
  await conferir('Relatório (janela da execução): contrato válido', '200 e schema ok', `${descrever(rj)} schema=${parse.success}`, rj.status === 200 && parse.success);
  if (!parse.success) return;
  const rel = rj.corpo, soma = somaPorCategoria(rel.linhas);
  await conferir('Relatório: totais por categoria == soma das linhas', 'iguais em todas as categorias', 'iguais=' + CATEGORIAS_RELATORIO.every(c => soma[c] === rel.totais[c]), CATEGORIAS_RELATORIO.every(c => soma[c] === rel.totais[c]));
  await conferir('Relatório: IDs de linha únicos (nada contado em dobro)', 'sem duplicatas', `linhas=${rel.linhas.length} únicos=${new Set(rel.linhas.map((l: any) => l.id)).size}`, new Set(rel.linhas.map((l: any) => l.id)).size === rel.linhas.length);
  await conferirLinhas('(janela, loja principal)', rel, minhas);
  const conhecidos = new Set(minhas.map(l => l.id)), estranhas = rel.linhas.filter((l: any) => !conhecidos.has(l.id) && !String(l.id).endsWith(':diferenca'));
  const esperadoF14 = somaPorCategoria(minhas), somaDosF14 = somaPorCategoria(rel.linhas.filter((l: any) => conhecidos.has(l.id)));
  await conferir('Relatório: totais por categoria das linhas F14 batem com as operações aceitas nas seções 1-3', 'iguais', 'iguais=' + CATEGORIAS_RELATORIO.every(c => esperadoF14[c] === somaDosF14[c]), CATEGORIAS_RELATORIO.every(c => esperadoF14[c] === somaDosF14[c]));
  await registrar('Relatório: janela da execução sem linhas de outras atividades', '0 linhas estranhas', `estranhas=${estranhas.length}`, estranhas.length === 0 ? 'PASS' : 'INCONCLUSIVO');
  dados.relatorios.janela = { totaisCentavos: rel.totais, totaisEsperadosF14Centavos: esperadoF14, quantidadeLinhas: rel.linhas.length, confirmadoEm: rel.confirmadoEm, filtros: rel.filtros };
  // filtros
  const rPix = await relatorio(d, { meio: 'pix' }, janela), rDin = await relatorio(d, { meio: 'dinheiro' }, janela);
  const doMeio = (m: string) => rel.linhas.filter((l: any) => l.meio === m);
  await conferir('Relatório: filtro por meio (Pix, dinheiro) devolve só as parcelas do meio, com totais iguais ao subconjunto', 'linhas e totais coerentes', `pix=${rPix.corpo?.linhas?.length}/${doMeio('pix').length} dinheiro=${rDin.corpo?.linhas?.length}/${doMeio('dinheiro').length}`,
    rPix.status === 200 && rDin.status === 200 && rPix.corpo.linhas.length === doMeio('pix').length && rDin.corpo.linhas.length === doMeio('dinheiro').length && rPix.corpo.linhas.every((l: any) => l.meio === 'pix') && CATEGORIAS_RELATORIO.every(c => rPix.corpo.totais[c] === somaPorCategoria(doMeio('pix'))[c] && rDin.corpo.totais[c] === somaPorCategoria(doMeio('dinheiro'))[c]));
  if (estado.t2) {
    const rT2 = await relatorio(d, { caixaId: estado.t2 }, janela);
    const doT2 = rel.linhas.filter((l: any) => l.caixaId === estado.t2);
    const recT2 = (rT2.corpo?.linhas ?? []).filter((l: any) => l.categoria === 'recebimento_fiado' && l.meio === 'dinheiro');
    await conferir('Relatório: filtro por turno receptor T2 separa seus recebimentos/estornos em dinheiro da venda original', 'linhas só de T2; recebimentos em dinheiro no turno T2', `linhas=${rT2.corpo?.linhas?.length}/${doT2.length} recebimentosDinheiroT2=${recT2.length}`, rT2.status === 200 && rT2.corpo.linhas.length === doT2.length && rT2.corpo.linhas.every((l: any) => l.caixaId === estado.t2));
  }
  const rOp = await relatorio(d, { operadorId: (estado.caixa ?? d).operadorId }, janela);
  await conferir('Relatório: filtro por responsável devolve só o responsável', 'todas as linhas do operador', `${descrever(rOp)} linhas=${rOp.corpo?.linhas?.length}`, rOp.status === 200 && rOp.corpo.linhas.every((l: any) => l.operadorId === (estado.caixa ?? d).operadorId));
  const fil = await http('GET', '/relatorios/filtros', { token: d.token });
  dados.relatorios.filtrosDisponiveis = fil.status === 200 ? { lojas: fil.corpo.lojas.map((l: any) => l.nome), turnos: fil.corpo.turnos.length, usuarios: fil.corpo.usuarios.map((u: any) => u.nome) } : descrever(fil);
  // dia civil (o que a tela mostra) + CSV
  const rd = await relatorio(d, {}, diaJanela);
  await conferir('Relatório (dia civil de Brasília): contrato válido e linhas F14 presentes', '200, schema ok e linhas esperadas', `${descrever(rd)} schema=${RelatorioSchema.safeParse(rd.corpo).success}`, rd.status === 200 && RelatorioSchema.safeParse(rd.corpo).success && minhas.every(e => rd.corpo.linhas.some((l: any) => l.id === e.id && l.categoria === e.categoria && l.valorCentavos === e.valorCentavos)));
  dados.relatorios.diaCivil = { totaisCentavos: rd.corpo?.totais, quantidadeLinhas: rd.corpo?.linhas?.length, confirmadoEm: rd.corpo?.confirmadoEm, filtros: rd.corpo?.filtros };
  dados.relatorios.csv = { janela: await validarCsv('(janela)', rel, null), diaCivil: rd.status === 200 ? await validarCsv('(dia civil, gravado)', rd.corpo, arquivo + '.csv') : null };
  await validarEscapeSintetico(rel);
  dados.relatorios.csvArquivo = arquivo + '.csv';
}

// ---------- seção 5: lojas ----------
async function semVazamento(rotulo: string, s: Sessao, proibido: { produtos: Set<string>; clientes: Set<string>; vendas: Set<string>; eventos: Set<string>; lojas: Set<string> }, janela: { inicio: string; fim: string }, donoDaEmpresa = false) {
  const est = await http('GET', '/estoque', { token: s.token });
  const vEst = (est.corpo?.saldos ?? []).filter((x: any) => proibido.produtos.has(x.produtoId)).length + (est.corpo?.movimentos ?? []).filter((m: any) => proibido.produtos.has(m.produtoId) || proibido.lojas.has(m.lojaId)).length;
  await conferir(`Lojas: ${rotulo} não enxerga estoque de outra loja`, '200 e 0 itens proibidos', `${descrever(est)} proibidos=${vEst}`, est.status === 200 && vEst === 0);
  const fi = await http('GET', '/fiado', { token: s.token });
  const vFi = (fi.corpo?.clientes ?? []).filter((x: any) => proibido.clientes.has(x.id) || proibido.lojas.has(x.lojaId)).length + (fi.corpo?.titulos ?? []).filter((t: any) => proibido.vendas.has(t.vendaId)).length + (fi.corpo?.eventos ?? []).filter((e: any) => proibido.eventos.has(e.id) || proibido.vendas.has(e.vendaId)).length;
  await conferir(`Lojas: ${rotulo} não enxerga clientes/fiado de outra loja`, '200 e 0 itens proibidos', `${descrever(fi)} proibidos=${vFi}`, fi.status === 200 && vFi === 0);
  const pull = await puxarTudo(s.token);
  const vPull = pull.mudancas.filter(m => proibido.vendas.has(m.dados.id) || proibido.produtos.has(m.dados.id) || proibido.lojas.has(m.dados.lojaId)).length;
  await conferir(`Lojas: sync/pull de ${rotulo} não traz dados de outra loja`, '200 e 0 registros proibidos', `${pull.status} proibidos=${vPull} (de ${pull.mudancas.length})`, pull.status === 200 && vPull === 0);
  const rel = await relatorio(s, {}, janela);
  const vRel = (rel.corpo?.linhas ?? []).filter((l: any) => proibido.lojas.has(l.lojaId)).length;
  await conferir(`Lojas: relatório padrão de ${rotulo} não contém linhas de outra loja`, '200 e 0 linhas proibidas', `${descrever(rel)} proibidas=${vRel}`, rel.status === 200 && vRel === 0);
  const fl = await http('GET', '/relatorios/filtros', { token: s.token }), lj = await http('GET', '/lojas', { token: s.token }), cx = await painel(s);
  const vMeta = donoDaEmpresa ? cx.filter(i => proibido.lojas.has(i.caixa.lojaId)).length : (fl.corpo?.lojas ?? []).filter((l: any) => proibido.lojas.has(l.id)).length + (fl.corpo?.turnos ?? []).filter((t: any) => proibido.lojas.has(t.lojaId)).length + (Array.isArray(lj.corpo) ? lj.corpo : []).filter((l: any) => proibido.lojas.has(l.id)).length + cx.filter(i => proibido.lojas.has(i.caixa.lojaId)).length;
  await conferir(`Lojas: filtros, /lojas e turnos de ${rotulo} não listam outra loja`, '0 itens proibidos', `filtros=${fl.status} lojas=${lj.status} proibidos=${vMeta}`, fl.status === 200 && lj.status === 200 && vMeta === 0);
}
async function tentativasDeEscrita(rotulo: string, s: Sessao, alvo: { lojaId: string; produtoId: string; vendaId: string; eventoId: string }, naoDono = false) {
  const vCross = vendaNova(s, { itens: [itemVenda('F14 venda cruzada (deve ser recusada)', 100, 1000, alvo.produtoId)], pagamentos: [pagamento('pix', 100)] });
  const mCross = mut('venda', { ...vCross, lojaId: alvo.lojaId }), rCross = await pushar(s, [mCross]);
  await conferir(`Lojas: ${rotulo} não grava venda na outra loja (sync/push)`, 'rejeitada=loja_invalida', descPush(rCross, mCross.id), motivoDe(rCross, mCross.id) === 'loja_invalida');
  const pCross = { ...produtoNovo(alvo.lojaId, 'F14 produto cruzado (deve ser recusado)', 100, null, null) }, mp = mut('produto', pCross), rp = await pushar(s, [mp]);
  await conferir(`Lojas: ${rotulo} não grava produto na outra loja (sync/push)`, 'rejeitada=loja_invalida ou permissao_negada', descPush(rp, mp.id), ['loja_invalida', 'permissao_negada'].includes(motivoDe(rp, mp.id) ?? ''));
  await recusaEm(`Lojas: ${rotulo} não movimenta estoque de produto da outra loja`, await http('POST', '/estoque/movimentos', { token: s.token, corpo: { id: randomUUID(), produtoId: alvo.produtoId, tipo: 'entrada', quantidadeMilesimos: 1000, motivo: 'F14 movimento cruzado (deve ser recusado)' } }), ['404/nao_encontrado', '403/permissao_negada']);
  await recusaEm(`Lojas: ${rotulo} não recebe fiado de venda da outra loja`, await receber(s, alvo.vendaId, 10, 'pix', null), ['404/nao_encontrado', ...(naoDono ? ['403/permissao_negada'] : [])]);
  await recusaEm(`Lojas: ${rotulo} não estorna recebimento da outra loja`, await estornar(s, alvo.eventoId, null), ['404/nao_encontrado', '403/permissao_negada']);
  if (naoDono) await recusaEm(`Lojas: ${rotulo} não consulta relatório da outra loja (lojaId explícito)`, await http('GET', '/relatorios', { token: s.token, query: { inicio: janelaInicio, fim: new Date((relogioServidor ?? Date.now()) + 3_600_000).toISOString(), lojaId: alvo.lojaId } }), ['403/permissao_negada']);
  else await pular(`Lojas: ${rotulo} não consulta relatório da outra loja`, 'o dono da empresa PODE consultar qualquer loja da própria empresa (consolidado); verificado no bloco consolidado');
}
async function secaoLojas() {
  const d = S.dono!, janela = { inicio: janelaInicio, fim: new Date((relogioServidor ?? Date.now()) + 3_600_000).toISOString() };
  const antes = await http('GET', '/lojas', { token: d.token });
  const qtdAntes = Array.isArray(antes.corpo) ? antes.corpo.length : -1;
  await conferir('Lojas: dono lista as lojas da empresa', '200 array', `${descrever(antes)} lojas=${qtdAntes}`, antes.status === 200 && qtdAntes >= 1);
  dados.lojas = { passos: [], lojasAntes: qtdAntes };
  let req = { id: randomUUID(), nome: `F14 Filial ${sufixo}` };
  let criada: Resposta;
  const reutilizada = opcoes.filial ? (Array.isArray(antes.corpo) ? antes.corpo : []).find((l: any) => l.operadorId === opcoes.filial && String(l.nome).startsWith('F14 ')) : null;
  if (opcoes.filial && !reutilizada) { await conferir('Lojas: --filial aponta para uma filial "F14 ..." do dono', 'vínculo encontrado em GET /lojas', 'não encontrado', false); return; }
  if (reutilizada) { req = { id: reutilizada.id, nome: reutilizada.nome }; criada = { status: 200, corpo: reutilizada, erro: null }; notas.push('Filial F14 reutilizada (--filial): nenhuma loja nova foi criada nesta execução.'); await registrar('Lojas: filial F14 anterior reutilizada (--filial)', 'vínculo do dono na filial', `papel=${reutilizada.papel}`, reutilizada.papel === 'dono' ? 'PASS' : 'FAIL'); }
  else {
    criada = await http('POST', '/lojas', { token: d.token, corpo: req });
    if (criada.status === 409 && qtdAntes >= 3) { await registrar('Lojas: criar filial dentro do limite do plano', '200', `${descrever(criada)}: limite de lojas já atingido por filiais anteriores (a API não exclui lojas); repita com --filial <operadorId da filial F14 anterior, no relatório antigo em lojas.filial.operadorId>`, 'INCONCLUSIVO'); return; }
    await conferir('Lojas: dono cria a filial dentro do limite do plano (vínculo próprio de dono)', '200, papel dono, operadorId novo', `${descrever(criada)} papel=${criada.corpo?.papel} vinculoNovo=${criada.corpo?.operadorId !== d.operadorId}`, criada.status === 200 && criada.corpo?.papel === 'dono' && criada.corpo.operadorId !== d.operadorId && criada.corpo.id === req.id);
    if (criada.status !== 200) return;
    const rep = await http('POST', '/lojas', { token: d.token, corpo: req }), depois = await http('GET', '/lojas', { token: d.token });
    await conferir('Lojas: repetir o cadastro é idempotente e a empresa passa a ter uma loja a mais', '200 igual; lojas +1', `${descrever(rep)} igual=${JSON.stringify(rep.corpo) === JSON.stringify(criada.corpo)} lojas=${depois.corpo?.length}`, rep.status === 200 && JSON.stringify(rep.corpo) === JSON.stringify(criada.corpo) && depois.corpo?.length === qtdAntes + 1);
  }
  estado.filialId = req.id;
  dados.lojas.filial = { lojaId: req.id, nome: req.nome, operadorId: criada.corpo.operadorId, reutilizada: !!reutilizada };
  const totalLojas = reutilizada ? qtdAntes : qtdAntes + 1;
  if (totalLojas === 3) await recusaEm('Lojas: criar uma 4ª loja (acima do limite do plano Pro) é recusado', await http('POST', '/lojas', { token: d.token, corpo: { id: randomUUID(), nome: `F14 Filial excedente ${sufixo}` } }), ['409/conflito']);
  else await pular('Lojas: limite de 3 lojas do plano', `a empresa ficou com ${totalLojas} loja(s); o limite só é exercitado ao chegar a 3`);
  for (const [rot, s] of [['gerente', S.gerente], ['operador', S.operador]] as const) if (s) {
    await recusaEm(`Lojas: ${rot} não cria loja`, await http('POST', '/lojas', { token: s.token, corpo: { id: randomUUID(), nome: 'F14 Filial indevida' } }), ['403/permissao_negada']);
    const lj = await http('GET', '/lojas', { token: s.token });
    await conferir(`Lojas: ${rot} lista somente a própria loja`, '200 e 1 loja (a principal)', `${descrever(lj)} lojas=${lj.corpo?.length}`, lj.status === 200 && lj.corpo.length === 1 && lj.corpo[0].id === s.lojaId);
  }

  // sessão do dono na filial (novo código do dono: 61 s após o anterior)
  const f = S.filial = await entrar('dono-filial', opcoes.dono!, 'homologar-gestao dono filial', criada.corpo.operadorId);
  await conferir('Lojas: dono entra na filial com vínculo próprio', 'lojaId=filial, papel dono, mesmo aparelho NÃO reutilizado', `lojaFilial=${f.lojaId === req.id} papel=${f.papel} aparelhoNovo=${f.aparelhoId !== d.aparelhoId}`, f.lojaId === req.id && f.papel === 'dono' && f.aparelhoId !== d.aparelhoId);
  if (f.lojaId !== req.id) return;
  const pf = produtoNovo(f.lojaId, `F14 Filial Produto ${sufixo}`, 400, 3000, null), mpf = mut('produto', pf), rpf = await pushar(f, [mpf]);
  await conferir('Lojas: produto com estoque criado na filial', 'aceito', descPush(rpf, mpf.id), aceita(rpf, mpf.id));
  ids.F.produtos.add(pf.id);
  const cf = { id: randomUUID(), nome: `F14 Cliente Filial ${sufixo}`, contato: 'F14 contato de teste' }, rcf = await http('POST', '/clientes', { token: f.token, corpo: cf });
  await conferir('Lojas: cliente criado na filial', '200', descrever(rcf), rcf.status === 200);
  ids.F.clientes.add(cf.id);
  const vfl1 = vendaNova(f, { itens: [itemVenda(pf.nome, 400, 1000, pf.id)], pagamentos: [pagamento('pix', 400)] }), mfl1 = mut('venda', vfl1), rfl1 = await pushar(f, [mfl1]);
  const vfl2 = vendaNova(f, { itens: [itemVenda(`F14 Filial fiado ${sufixo}`, 500, 1000)], fiado: { clienteId: cf.id, vencimento: somarDiasData(diaCivilSP(relogioServidor ?? Date.now()), 5), valorCentavos: 500 } }), mfl2 = mut('venda', vfl2), rfl2 = await pushar(f, [mfl2]);
  await conferir('Lojas: venda com estoque e venda fiada criadas na filial', 'ambas aceitas', `${descPush(rfl1, mfl1.id)} / ${descPush(rfl2, mfl2.id)}`, aceita(rfl1, mfl1.id) && aceita(rfl2, mfl2.id));
  if (aceita(rfl1, mfl1.id)) { ids.F.vendas.add(vfl1.id); esperarVenda(vfl1); }
  if (aceita(rfl2, mfl2.id)) { ids.F.vendas.add(vfl2.id); esperarVenda(vfl2); }
  const rf = await receber(f, vfl2.id, 200, 'pix', null, randomUUID(), 'F14 recebimento na filial');
  if (rf.status === 200) { ids.F.eventos.add(rf.corpo.id); esperarEvento(rf.corpo); }
  await conferir('Lojas: recebimento Pix parcial (200) na filial', '200', descrever(rf), rf.status === 200);
  const estF = await http('GET', '/estoque', { token: f.token }), tiF = await titulo(f, vfl2.id);
  const saldoPf = (estF.corpo?.saldos ?? []).find((x: any) => x.produtoId === pf.id)?.saldoMilesimos;
  await conferir('Lojas: filial tem estoque 2000 (uma baixa) e saldo devedor 300', 'saldo 2000; título saldo 300', `estoque=${saldoPf} ${tituloTxt(tiF.t)}`, saldoPf === 2000 && tiF.t?.saldoCentavos === 300);
  passo('lojas', 'dados da filial', { lojaId: f.lojaId, nome: req.nome, produtoNome: pf.nome, estoqueMilesimos: saldoPf, clienteNome: cf.nome, vendaEstoqueId: vfl1.id, vendaFiadoId: vfl2.id, saldoDevedorCentavos: tiF.t?.saldoCentavos });

  const proibidoParaA = { produtos: ids.F.produtos, clientes: ids.F.clientes, vendas: ids.F.vendas, eventos: ids.F.eventos, lojas: new Set([f.lojaId]) };
  const proibidoParaF = { produtos: ids.A.produtos, clientes: ids.A.clientes, vendas: ids.A.vendas, eventos: ids.A.eventos, lojas: new Set([d.lojaId]) };
  const alvoF = { lojaId: f.lojaId, produtoId: pf.id, vendaId: vfl2.id, eventoId: rf.corpo?.id ?? randomUUID() };
  const vA = [...ids.A.vendas][0], pA = [...ids.A.produtos][0], eA = [...ids.A.eventos][0];
  for (const [rot, s] of [['gerente da loja A', S.gerente], ['operador da loja A', S.operador]] as const) {
    if (!s) { await pular(`Lojas: ${rot} não enxerga nem escreve na filial`, 'papel não informado'); continue; }
    await semVazamento(rot, s, proibidoParaA, janela);
    await tentativasDeEscrita(rot, s, alvoF, true);
  }
  await semVazamento('dono na loja A (sessão da loja A)', d, proibidoParaA, janela, true);
  await tentativasDeEscrita('dono na loja A (sessão da loja A)', d, alvoF);
  await semVazamento('dono na filial (sessão da filial)', f, proibidoParaF, janela, true);
  if (vA && pA && eA) await tentativasDeEscrita('dono na filial (sessão da filial)', f, { lojaId: d.lojaId, produtoId: pA, vendaId: vA, eventoId: eA });
  else await pular('Lojas: sessão da filial não escreve na loja A', 'seções 1-3 não geraram alvos na loja A');

  // consolidado e filtro por loja
  const rA = await relatorio(d, {}, janela), rF = await relatorio(d, { lojaId: f.lojaId }, janela), rT = await relatorio(d, { lojaId: 'todas' }, janela);
  const okR = [rA, rF, rT].every(r => r.status === 200 && RelatorioSchema.safeParse(r.corpo).success);
  await conferir('Lojas: relatórios loja A, filial e consolidado (todas) obtidos com contrato válido', '200 x3', `${descrever(rA)} ${descrever(rF)} ${descrever(rT)}`, okR);
  if (!okR) return;
  const lojasConta: any[] = (await http('GET', '/lojas', { token: d.token })).corpo ?? [];
  const porLoja = new Map<string, any>();
  for (const l of lojasConta) porLoja.set(l.id, (await relatorio(d, { lojaId: l.id }, janela)).corpo);
  const soma = CATEGORIAS_RELATORIO.map(c => [c, lojasConta.reduce((t, l) => t + (porLoja.get(l.id)?.totais?.[c] ?? 0), 0), rT.corpo.totais[c]] as const);
  await conferir('Lojas: consolidado do dono = soma dos relatórios de cada loja da empresa (todas as categorias)', 'iguais', soma.filter(([, a, b]) => a !== b).map(([c, a, b]) => `${c}:${a}!=${b}`).join(' ') || `iguais em ${soma.length} categorias (${lojasConta.length} lojas)`, soma.every(([, a, b]) => a === b));
  const linhasA = esperadas.filter(l => l.lojaId === d.lojaId), linhasF = esperadas.filter(l => l.lojaId === f.lojaId);
  await conferirLinhas('(filial)', rF.corpo, linhasF);
  await conferirLinhas('(consolidado: loja A + filial)', rT.corpo, [...linhasA, ...linhasF]);
  const fSep = rF.corpo.linhas.every((l: any) => l.lojaId === f.lojaId), aSep = rA.corpo.linhas.every((l: any) => l.lojaId === d.lojaId);
  const vazaAF = rA.corpo.linhas.filter((l: any) => linhasF.some(x => x.id === l.id)).length + rF.corpo.linhas.filter((l: any) => linhasA.some(x => x.id === l.id)).length;
  await conferir('Lojas: filtro por loja separa as duas lojas (sem linha da outra)', 'cada relatório só da própria loja', `A só A=${aSep} filial só filial=${fSep} cruzadas=${vazaAF}`, fSep && aSep && vazaAF === 0);
  const f14A = somaPorCategoria(rA.corpo.linhas.filter((l: any) => linhasA.some(x => x.id === l.id))), f14F = somaPorCategoria(rF.corpo.linhas.filter((l: any) => linhasF.some(x => x.id === l.id))), f14T = somaPorCategoria(rT.corpo.linhas.filter((l: any) => [...linhasA, ...linhasF].some(x => x.id === l.id)));
  await conferir('Lojas: totais F14 do consolidado = loja A + filial por categoria', 'iguais', 'iguais=' + CATEGORIAS_RELATORIO.every(c => f14T[c] === f14A[c] + f14F[c]), CATEGORIAS_RELATORIO.every(c => f14T[c] === f14A[c] + f14F[c]));
  dados.lojas.relatorios = { janela, lojaA: { totaisCentavos: rA.corpo.totais, f14: f14A }, filial: { totaisCentavos: rF.corpo.totais, f14: f14F }, consolidado: { totaisCentavos: rT.corpo.totais, f14: f14T, lojas: lojasConta.length } };
  const dia = intervaloDia(relogioServidor ?? Date.now()), rDia = await relatorio(d, { lojaId: 'todas' }, { inicio: dia.inicio, fim: dia.fim });
  if (rDia.status === 200 && RelatorioSchema.safeParse(rDia.corpo).success) {
    dados.lojas.relatorios.consolidadoDiaCivil = { dia: dia.dia, totaisCentavos: rDia.corpo.totais, quantidadeLinhas: rDia.corpo.linhas.length };
    await validarCsv('consolidado (dia civil, gravado)', rDia.corpo, arquivo + '.consolidado.csv');
  }
}

// ---------- seção B: outra empresa ----------
async function secaoEmpresaB() {
  const b = S.empresaB, d = S.dono!;
  if (!b) { await pular('Empresa B: não enxerga nem escreve na empresa A', 'sem --empresa-b'); return; }
  await conferir('Empresa B: conta diferente da empresa A', 'contaId diferente', 'diferente=' + (b.contaId !== d.contaId), b.contaId !== d.contaId);
  const janela = { inicio: janelaInicio, fim: new Date((relogioServidor ?? Date.now()) + 3_600_000).toISOString() };
  const lojasA = new Set<string>([d.lojaId]); if (S.filial) lojasA.add(S.filial.lojaId);
  const proibido = { produtos: new Set([...ids.A.produtos, ...ids.F.produtos]), clientes: new Set([...ids.A.clientes, ...ids.F.clientes]), vendas: new Set([...ids.A.vendas, ...ids.F.vendas]), eventos: new Set([...ids.A.eventos, ...ids.F.eventos]), lojas: lojasA };
  await semVazamento('empresa B', b, proibido, janela);
  const tod = await relatorio(b, { lojaId: 'todas' }, janela);
  await conferir('Empresa B: consolidado de B não contém linhas de A nem da filial', '200 e 0 linhas de A', `${descrever(tod)} deA=${(tod.corpo?.linhas ?? []).filter((l: any) => lojasA.has(l.lojaId)).length}`, tod.status === 200 && !tod.corpo.linhas.some((l: any) => lojasA.has(l.lojaId)));
  const alvoA = { lojaId: d.lojaId, produtoId: [...ids.A.produtos][0] ?? randomUUID(), vendaId: [...ids.A.vendas][0] ?? randomUUID(), eventoId: [...ids.A.eventos][0] ?? randomUUID() };
  await tentativasDeEscrita('empresa B → loja A', b, alvoA, true);
  if (S.filial) await tentativasDeEscrita('empresa B → filial', b, { lojaId: S.filial.lojaId, produtoId: [...ids.F.produtos][0] ?? randomUUID(), vendaId: [...ids.F.vendas][0] ?? randomUUID(), eventoId: [...ids.F.eventos][0] ?? randomUUID() }, true);
}

// ---------- execução ----------
let falhaFatal: unknown = null;
async function secao(nome: string, fn: () => Promise<void>) {
  if (!secoes.has(nome)) return;
  try { await fn(); } catch (e) { await registrar(`Seção "${nome}" interrompida`, 'sem exceção', (e instanceof Error ? e.message : String(e)).replace(/\d{6}/g, '######'), 'FAIL'); }
}
try {
  const saude = await http('GET', '/saude');
  await conferir('GET /saude responde ok', '200 {status:ok}', descrever(saude), saude.status === 200 && saude.corpo?.status === 'ok');
  if (relogioServidor === null) throw new Error('A API não informou x-pdv-agora; sem o relógio do servidor o roteiro não é seguro.');
  janelaInicio = new Date(relogioServidor - 1000).toISOString();
  dados.execucao = { sufixo, relogioServidorInicio: new Date(relogioServidor).toISOString(), papeisInformados: { gerente: !!opcoes.gerente, operador: !!opcoes.operador, empresaB: !!opcoes['empresa-b'] } };
  if (local) await registrar('Rotas /dev ausentes', '404', 'API local em modo dev: verificação não aplicável', 'SKIP');
  else {
    const d1 = await http('POST', '/dev/relogio/avancar', { corpo: { dias: 1 } }), d2 = await http('POST', '/dev/jobs/cobranca', { corpo: {} });
    await conferir('Rotas /dev ausentes', '404 e 404', descrever(d1) + ' e ' + descrever(d2), d1.status === 404 && d2.status === 404);
  }

  // logins na ordem: dono, gerente, operador, empresa-b, 2º aparelho do dono
  const tentar = async (rotulo: string, chave: 'dono' | 'gerente' | 'operador' | 'empresaB' | 'dono2', email: string, nome: string, operadorId?: string) => {
    try { S[chave] = await entrar(rotulo, email, nome, operadorId); } catch (e) { await registrar(`Login ${rotulo}`, 'sessão aberta', (e instanceof Error ? e.message : String(e)).replace(/\d{6}/g, '######'), chave === 'dono' ? 'FAIL' : 'INCONCLUSIVO'); }
  };
  await tentar('dono', 'dono', opcoes.dono!, 'homologar-gestao dono');
  if (!S.dono) throw new Error('Sem sessão do dono não há roteiro.');
  const dono = S.dono;
  await conferir('Dono autenticado com papel dono', 'papel=dono', 'papel=' + dono.papel, dono.papel === 'dono');
  dados.empresaA = { contaId: dono.contaId, lojaId: dono.lojaId, donoOperadorHash: hash('op', dono.operadorId) };
  if (opcoes.gerente) await tentar('gerente', 'gerente', opcoes.gerente, 'homologar-gestao gerente');
  if (opcoes.operador) await tentar('operador', 'operador', opcoes.operador, 'homologar-gestao operador');
  if (opcoes['empresa-b']) await tentar('empresa-b', 'empresaB', opcoes['empresa-b'], 'homologar-gestao empresa B');
  if (!S.gerente && secoes.has('concorrencia')) await tentar('dono-aparelho2', 'dono2', opcoes.dono!, 'homologar-gestao dono aparelho 2', dono.operadorId);
  for (const [rot, s] of [['gerente', S.gerente], ['operador', S.operador]] as const) if (s) {
    await conferir(`${rot[0]!.toUpperCase() + rot.slice(1)} pertence à mesma empresa/loja do dono, com outro vínculo e papel compatível`, 'mesma conta e loja; operadorId diferente', `mesmaConta=${s.contaId === dono.contaId} mesmaLoja=${s.lojaId === dono.lojaId} papel=${s.papel}`, s.contaId === dono.contaId && s.lojaId === dono.lojaId && s.operadorId !== dono.operadorId && s.papel === rot);
    dados[rot === 'gerente' ? 'gerente' : 'operador'] = { papel: s.papel, permissoes: s.permissoes, operadorHash: hash('op', s.operadorId) };
  }
  if (S.empresaB) dados.empresaB = { contaId: S.empresaB.contaId, lojaId: S.empresaB.lojaId, operadorHash: hash('op', S.empresaB.operadorId) };
  if (!S.gerente) notas.push(opcoes.gerente ? 'Gerente informado mas indisponível.' : 'Sem --gerente: o dono é o ator de caixa (turnos, vendas e recebimentos) e um 2º aparelho do dono serve às corridas.');

  await secao('estoque', secaoEstoque);
  await secao('fiado', secaoFiado);
  await secao('concorrencia', secaoConcorrencia);
  await secao('relatorio', secaoRelatorio);
  await secao('lojas', secaoLojas);
  await secao('lojas', secaoEmpresaB);
} catch (e) {
  falhaFatal = e;
  await registrar('Execução interrompida', 'sem exceção', (e instanceof Error ? e.message : String(e)).replace(/\d{6}/g, '######'), 'FAIL');
} finally {
  // Limpeza: fecha turnos abertos por este script (contado = esperado) e revoga os aparelhos descartáveis.
  try {
    for (const t of [...turnosAbertos]) {
      await fecharTurno(t.s, t.id).catch(() => null);
      if (turnosAbertos.some(x => x.id === t.id)) notas.push(`Turno ${t.id} permanece ABERTO (fechamento falhou): feche pelo app antes de o usuário abrir outro turno.`);
    }
    if (S.empresaB) { await http('DELETE', '/aparelhos/' + S.empresaB.aparelhoId, { token: S.empresaB.token }); await http('POST', '/auth/logout', { token: S.empresaB.token }); }
    if (S.filial) { await http('DELETE', '/aparelhos/' + S.filial.aparelhoId, { token: S.filial.token }); await http('POST', '/auth/logout', { token: S.filial.token }); }
    if (S.dono) {
      for (const x of [S.operador, S.gerente, S.dono2]) if (x) await http('DELETE', '/aparelhos/' + x.aparelhoId, { token: S.dono.token });
      for (const x of [S.operador, S.gerente, S.dono2]) if (x) await http('POST', '/auth/logout', { token: x.token });
      const rev = await http('DELETE', '/aparelhos/' + S.dono.aparelhoId, { token: S.dono.token });
      if (rev.status !== 204) await http('POST', '/auth/logout', { token: S.dono.token });
    }
  } catch { notas.push('Falha ao encerrar sessões/aparelhos descartáveis; revogue manualmente os aparelhos "homologar-gestao".'); }
  const falhas = checks.filter(c => c.resultado === 'FAIL').length, inconclusivos = checks.filter(c => c.resultado === 'INCONCLUSIVO').length;
  dados.resumo = { total: checks.length, pass: checks.filter(c => c.resultado === 'PASS').length, fail: falhas, inconclusivo: inconclusivos, skip: checks.filter(c => c.resultado === 'SKIP').length };
  dados.linhasEsperadasF14 = esperadas.length;
  notas.push('Evidência HTTP; não substitui a verificação por UI no aparelho. Os dados F14 (cliente, títulos em aberto, filial) permanecem na homologação para conferência com a tela.');
  await writeFile(arquivo, JSON.stringify(montarRelatorio(!falhaFatal), null, 2) + '\n');
  await unlink(arquivo + '.pendente.json').catch(() => undefined);
  console.log(JSON.stringify(dados.resumo));
  console.log(falhas ? 'HOMOLOGACAO_GESTAO_COM_FALHAS' : inconclusivos ? 'HOMOLOGACAO_GESTAO_INCONCLUSIVA' : 'HOMOLOGACAO_GESTAO_CONCLUIDA');
  process.exitCode = falhas ? 1 : inconclusivos ? 2 : 0;
  leitor.close(); stdin.pause();
}
