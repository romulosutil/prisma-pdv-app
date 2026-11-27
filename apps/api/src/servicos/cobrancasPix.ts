import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { gerarId, type CobrancaPix, type ConectarMercadoPagoReq, type ConexaoMercadoPago, type EstadoCobrancaPix, type PagamentoVenda, type Relogio } from '@pdv/shared';
import type { SessaoAutenticada } from '../auth';
import type { Db } from '../db/conexao';
import { cobrancasPagamento, conexoesPagamento, eventosCobrancaPagamento } from '../db/schema';
import {
  comTokenDaLoja, conexaoAtiva, desconectar, reautorizar, salvarConexao, serializarConexao, sinalizarRevisaoConexao, type AmbienteConexao,
} from './conexoesMercadoPago';
import type { ConfigPagamentos, Deps } from '../deps';
import { ErroApi } from '../erros';
import { assinaturaValida } from '../pagamentos/assinaturaWebhook';
import { ErroCifraPagamentos } from '../pagamentos/cifrador';
import { ErroProvedorMp, EXPIRACAO_PIX, EXPIRACAO_PIX_MS, type FalhaProvedor, type PedidoMercadoPago } from '../pagamentos/mercadoPago';
import { criarProvedorInfinitePay, type ProvedorInfinitePay } from '../pagamentos/infinitePay';
import { consultarInfinitePayNoProvedor, serializarCobrancaInfinitePay } from './cobrancasInfinitePay';

/**
 * Pix do Mercado Pago (N2). Regras:
 * - a confirmação vem SEMPRE de `GET /v1/orders/{id}` com o token do lojista, nunca do corpo do aviso nem de valor;
 * - paga só com status `processed`/`accredited`, mesma order, mesma `external_reference` e valor pago exato;
 * - transições monotônicas (veja `decidirTransicao`): aviso repetido ou fora de ordem nunca faz regredir;
 * - chamadas externas ficam fora de transação; cada escrita usa o estado lido como condição (concorrência otimista).
 */

type Cobranca = typeof cobrancasPagamento.$inferSelect;

export const CONSULTA_MINIMA_MS = 3000;
const LEASE_CRIACAO_MS = 30_000;
/**
 * Agenda da conciliação (`proximaConsultaEm`): pendente a cada 30 s até o vencimento + 5 min de carência; depois,
 * recuo crescente (o intervalo acompanha o tempo desde o vencimento, de 1 min a 1 h). Expirada/cancelada antes do
 * vencimento: a cada 10 min. Falhas seguidas dobram o intervalo (até 1 h) e respeitam o `Retry-After`. Parada
 * definitiva 24 h depois do vencimento: o estado continua visível ao dono.
 */
const INTERVALO_PENDENTE_MS = 30_000;
const CARENCIA_EXPIRACAO_MS = 5 * 60_000;
const INTERVALO_ENCERRADA_MS = 10 * 60_000;
const RECUO_MINIMO_MS = 60_000;
const RECUO_MAXIMO_MS = 60 * 60_000;
const JANELA_TARDIA_MS = 24 * 60 * 60_000;
/** Por passada: no máximo 50 cobranças e 5 por loja, para uma loja com muitas pendências não atrasar as outras. */
const LOTE_CONCILIACAO = 50;
const POR_LOJA_CONCILIACAO = 5;
/** Trava da passada sobre a cobrança enquanto a consulta está em curso. */
const TRAVA_CONSULTA_MS = 60_000;

const FINAIS: readonly EstadoCobrancaPix[] = ['paga', 'paga_tardia', 'divergente'];
const ENCERRADAS: readonly EstadoCobrancaPix[] = ['expirada', 'cancelada'];
const SEM_PEDIDO: readonly EstadoCobrancaPix[] = ['criando', 'erro_provedor'];
const STATUS_EM_ANDAMENTO = new Set(['created', 'processing', 'action_required', 'at_terminal']);

export interface AmbientePix extends AmbienteConexao {
  pagadorEmail: string | null;
  pagadorPrimeiroNome: string | null;
  pointHabilitado: boolean;
  consultaMinimaMs: number;
  infinitePay?: ProvedorInfinitePay | null;
  urlPublicaApi?: string | null;
}

export function ambientePix(deps: Pick<Deps, 'db' | 'relogio' | 'pagamentos'>): AmbientePix {
  const p: ConfigPagamentos | undefined = deps.pagamentos;
  if (!p?.cifrador) throw new ErroApi(503, 'pagamentos_indisponiveis', 'Pagamentos integrados indisponíveis neste servidor. Use a confirmação manual.');
  return {
    db: deps.db,
    relogio: deps.relogio,
    cifrador: p.cifrador,
    provedor: p.mercadoPago,
    pagadorEmail: p.pagadorEmail,
    pagadorPrimeiroNome: p.pagadorPrimeiroNome ?? null,
    pointHabilitado: p.pointHabilitado === true,
    consultaMinimaMs: p.consultaMinimaMs ?? CONSULTA_MINIMA_MS,
    oauth: p.oauth ?? null,
    infinitePay: p.infinitePay,
    urlPublicaApi: p.urlPublicaApi ?? null,
  };
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function serializarCobranca(c: Cobranca): CobrancaPix {
  return {
    id: c.id,
    vendaId: c.vendaId,
    estado: c.estado,
    valorCentavos: c.valorCentavos,
    valorPagoCentavos: c.valorPagoCentavos,
    pix: c.estado === 'aguardando' && c.qrCode ? { qrCode: c.qrCode, qrCodeBase64: c.qrCodeBase64, ticketUrl: c.ticketUrl } : null,
    expiraEm: iso(c.expiraEm),
    pagaEm: iso(c.pagaEm),
    vinculadaEm: iso(c.vinculadaEm),
    alerta: c.alerta,
    criadaEm: c.criadoEm.toISOString(),
    atualizadaEm: c.atualizadoEm.toISOString(),
    ...(c.meio !== 'pix' ? { provedor: 'mercadopago', meio: c.meio } : {}),
  };
}

async function registrarEvento(db: Db, c: Pick<Cobranca, 'id' | 'lojaId'>, tipo: string, dados: Record<string, unknown>, agora: Date): Promise<void> {
  await db.insert(eventosCobrancaPagamento).values({ id: gerarId(), cobrancaId: c.id, lojaId: c.lojaId, tipo, dados, criadoEm: agora });
}

/**
 * Eventos repetitivos (falha de consulta, aviso recebido, observação): se o último evento da cobrança é do mesmo
 * tipo e da mesma `chave`, só atualiza a contagem; o histórico não cresce a cada passada.
 */
async function registrarEventoAgrupado(db: Db, c: Pick<Cobranca, 'id' | 'lojaId'>, tipo: string, chave: string, dados: Record<string, unknown>, agora: Date): Promise<void> {
  const [ultimo] = await db.select().from(eventosCobrancaPagamento).where(eq(eventosCobrancaPagamento.cobrancaId, c.id))
    .orderBy(desc(eventosCobrancaPagamento.criadoEm), desc(eventosCobrancaPagamento.id)).limit(1);
  if (ultimo && ultimo.tipo === tipo && ultimo.dados.chave === chave) {
    const repeticoes = Number(ultimo.dados.repeticoes ?? 1) + 1;
    await db.update(eventosCobrancaPagamento).set({ dados: { ...ultimo.dados, ...dados, chave, repeticoes, ultimaEm: agora.toISOString() } })
      .where(eq(eventosCobrancaPagamento.id, ultimo.id));
    return;
  }
  await registrarEvento(db, c, tipo, { ...dados, chave, repeticoes: 1, ultimaEm: agora.toISOString() }, agora);
}

/** Quando a conciliação volta ao provedor; `null` = nunca mais (veja as constantes de agenda). */
export function proximaConsulta(c: Pick<Cobranca, 'estado' | 'expiraEm' | 'criadoEm' | 'pedidoProvedorId'>, agora: Date, falhas = 0, repetirEmMs: number | null = null): Date | null {
  if (!c.pedidoProvedorId || FINAIS.includes(c.estado) || SEM_PEDIDO.includes(c.estado)) return null;
  const t = agora.getTime();
  const expira = (c.expiraEm ?? new Date(c.criadoEm.getTime() + EXPIRACAO_PIX_MS)).getTime();
  if (t >= expira + JANELA_TARDIA_MS) return null;
  const vence = expira + CARENCIA_EXPIRACAO_MS;
  let intervalo = t < vence
    ? (c.estado === 'aguardando' ? INTERVALO_PENDENTE_MS : INTERVALO_ENCERRADA_MS)
    : Math.min(RECUO_MAXIMO_MS, Math.max(RECUO_MINIMO_MS, t - vence));
  if (falhas > 0) intervalo = Math.max(intervalo, Math.min(RECUO_MAXIMO_MS, INTERVALO_PENDENTE_MS * 2 ** Math.min(falhas, 10)));
  if (repetirEmMs) intervalo = Math.max(intervalo, Math.min(repetirEmMs, RECUO_MAXIMO_MS));
  return new Date(t + intervalo);
}

const fimDaJanela = (c: Pick<Cobranca, 'expiraEm' | 'criadoEm'>): number =>
  (c.expiraEm ?? new Date(c.criadoEm.getTime() + EXPIRACAO_PIX_MS)).getTime() + JANELA_TARDIA_MS;

/** Ordem de "idade" do status no provedor: uma resposta mais antiga não apaga o que já foi visto. */
function idadeStatus(status: string | null, detalhe: string | null): number {
  if (status === 'refunded' || status === 'charged_back' || (status === 'processed' && detalhe === 'partially_refunded')) return 3;
  if (status === 'processed') return 2;
  if (status === 'canceled' || status === 'failed' || status === 'expired') return 1;
  return 0;
}

/**
 * `conexao_inativa`: loja desconectou o Mercado Pago ou a credencial não decifra (chave trocada).
 * `reautorizacao_necessaria`: o refresh token do OAuth foi recusado; o dono precisa autorizar de novo.
 */
export type FalhaConsulta = FalhaProvedor | 'conexao_inativa' | 'reautorizacao_necessaria';

function descreverFalha(erro: unknown): { tipo: FalhaConsulta; status: number | null; codigo: string | null } {
  if (erro instanceof ErroProvedorMp) return { tipo: erro.tipo, status: erro.status, codigo: erro.codigo };
  if (erro instanceof ErroApi && erro.codigo === 'mercadopago_reautorizar') return { tipo: 'reautorizacao_necessaria', status: null, codigo: null };
  if (erro instanceof ErroCifraPagamentos || (erro instanceof ErroApi && erro.codigo === 'mercadopago_nao_conectado')) return { tipo: 'conexao_inativa', status: null, codigo: null };
  // Qualquer outra exceção do caminho externo conta como indisponibilidade; a mensagem não é gravada.
  return { tipo: 'indisponivel', status: null, codigo: null };
}

// ---------- Conexão (credencial do lojista) ----------

export { webhookPath, violacaoUnica } from './conexoesMercadoPago';

export async function estadoConexao(amb: AmbientePix, lojaId: string): Promise<ConexaoMercadoPago> {
  return serializarConexao(await conexaoAtiva(amb.db, lojaId));
}

export async function listarTerminaisPoint(amb: AmbientePix, lojaId: string): Promise<{ id: string }[]> {
  if (!amb.pointHabilitado) throw new ErroApi(503, 'point_indisponivel', 'A cobrança automática pelo Point está indisponível.');
  try {
    return await comTokenDaLoja(amb, lojaId, (token) => amb.provedor.listarTerminaisPoint(token));
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    throw new ErroApi(502, 'provedor_indisponivel', 'Não foi possível consultar as maquininhas Point.');
  }
}

/** Modo token (avançado): o dono cola o Access Token da própria aplicação. A URL do webhook é mantida na troca. */
export async function conectarMercadoPago(amb: AmbientePix, sessao: SessaoAutenticada, req: ConectarMercadoPagoReq): Promise<{ conexao: ConexaoMercadoPago; criada: boolean }> {
  let contaProvedorId: string | null = null;
  try {
    contaProvedorId = (await amb.provedor.validarCredencial(req.accessToken)).contaProvedorId;
  } catch (erro) {
    // Só a recusa explícita bloqueia; falha de rede é conferida de novo na primeira cobrança.
    if (erro instanceof ErroProvedorMp && (erro.tipo === 'credencial_invalida' || erro.tipo === 'acesso_negado')) {
      throw new ErroApi(400, 'credencial_invalida', 'O Mercado Pago recusou esta credencial. Confira o Access Token.');
    }
  }
  const { conexao, criada } = await salvarConexao(amb, sessao,
    { modo: 'token', accessToken: req.accessToken, ...(req.segredoWebhook !== undefined ? { segredoWebhook: req.segredoWebhook } : {}), contaProvedorId },
    amb.relogio.agora());
  return { conexao: serializarConexao(conexao), criada };
}

export async function desconectarMercadoPago(amb: AmbientePix, lojaId: string): Promise<void> {
  await desconectar(amb, lojaId);
}

// ---------- Máquina de estados ----------

export interface Decisao {
  estado: EstadoCobrancaPix;
  alerta: string | null;
  valorPagoCentavos: number | null;
  /** Motivo de registro quando algo chama atenção (divergência, status desconhecido...). */
  motivo: string | null;
}

/**
 * Próximo estado a partir do que o provedor informa. Nunca regride:
 * criando/erro_provedor/aguardando → paga | divergente | expirada | cancelada;
 * expirada/cancelada → paga_tardia | divergente; paga/paga_tardia/divergente são finais.
 */
export function decidirTransicao(c: Pick<Cobranca, 'id' | 'estado' | 'alerta' | 'valorCentavos' | 'valorPagoCentavos' | 'pedidoProvedorId'> & Partial<Pick<Cobranca, 'pedido'>>, p: PedidoMercadoPago): Decisao {
  const manter = (motivo: string | null = null, alerta = c.alerta): Decisao => ({ estado: c.estado, alerta, valorPagoCentavos: c.valorPagoCentavos, motivo });
  const posPagamento = p.status === 'refunded' || p.status === 'charged_back' || (p.status === 'processed' && p.statusDetail === 'partially_refunded');
  const alertaNovo = posPagamento ? `${p.status}/${p.statusDetail ?? ''}` : c.alerta;
  if (FINAIS.includes(c.estado)) return manter(posPagamento ? 'estorno_ou_contestacao' : null, alertaNovo);
  // Estorno/contestação sem nunca termos visto a confirmação: só alerta o dono; não confirma nada.
  if (posPagamento) return manter('estorno_sem_confirmacao', alertaNovo);

  if (p.status === 'processed' && p.statusDetail === 'accredited') {
    const mesmaOrder = c.pedidoProvedorId !== null && p.id.toLowerCase() === c.pedidoProvedorId.toLowerCase();
    if (!mesmaOrder || p.referenciaExterna !== c.id) return { estado: 'divergente', alerta: c.alerta, valorPagoCentavos: p.totalPagoCentavos, motivo: 'referencia_divergente' };
    const point = c.pedido?.point;
    if (point && (!p.point?.tipo || !p.point.terminalId)) return manter('dados_point_ausentes');
    if (point && (p.point?.tipo !== point.tipo || p.point?.terminalId !== point.terminalId)) {
      return { estado: 'divergente', alerta: c.alerta, valorPagoCentavos: p.totalPagoCentavos, motivo: 'terminal_ou_meio_divergente' };
    }
    if (p.totalPagoCentavos === null) return manter('valor_pago_ausente');
    if (p.totalPagoCentavos !== c.valorCentavos || (p.totalCentavos !== null && p.totalCentavos !== c.valorCentavos)) {
      return { estado: 'divergente', alerta: c.alerta, valorPagoCentavos: p.totalPagoCentavos, motivo: 'valor_divergente' };
    }
    return { estado: ENCERRADAS.includes(c.estado) ? 'paga_tardia' : 'paga', alerta: c.alerta, valorPagoCentavos: p.totalPagoCentavos, motivo: ENCERRADAS.includes(c.estado) ? 'pagamento_tardio' : null };
  }
  if (p.status === 'canceled' || p.status === 'failed' || p.status === 'expired') {
    if (ENCERRADAS.includes(c.estado)) return manter();
    return { estado: p.statusDetail === 'expired' || p.status === 'expired' ? 'expirada' : 'cancelada', alerta: c.alerta, valorPagoCentavos: c.valorPagoCentavos, motivo: null };
  }
  return manter(STATUS_EM_ANDAMENTO.has(p.status) ? null : 'status_desconhecido');
}

async function lerCobranca(db: Db, id: string): Promise<Cobranca> {
  const [c] = await db.select().from(cobrancasPagamento).where(eq(cobrancasPagamento.id, id));
  if (!c) throw new Error('Cobrança desapareceu.');
  return c;
}

/**
 * Aplica a resposta do provedor com a condição "estado e alerta iguais aos lidos"; em corrida, relê e decide de novo.
 * Um alerta nunca volta a `null` e o status do provedor gravado nunca fica mais antigo que o já visto.
 */
export async function aplicarPedido(amb: Pick<AmbientePix, 'db' | 'relogio'>, inicial: Cobranca, p: PedidoMercadoPago, origem: string): Promise<Cobranca> {
  let c = inicial;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const agora = amb.relogio.agora();
    const d = decidirTransicao(c, p);
    const alerta = d.alerta ?? c.alerta;
    const mudou = d.estado !== c.estado || alerta !== c.alerta || d.valorPagoCentavos !== c.valorPagoCentavos;
    const confirmou = (d.estado === 'paga' || d.estado === 'paga_tardia') && c.pagaEm === null;
    const statusNovo = idadeStatus(p.status, p.statusDetail) >= idadeStatus(c.statusProvedor, c.detalheProvedor);
    const [nova] = await amb.db.update(cobrancasPagamento).set({
      estado: d.estado,
      alerta,
      valorPagoCentavos: d.valorPagoCentavos,
      ...(statusNovo ? { statusProvedor: p.status, detalheProvedor: p.statusDetail } : {}),
      consultadoEm: agora,
      proximaConsultaEm: proximaConsulta({ ...c, estado: d.estado }, agora),
      falhasConsulta: 0,
      ...(confirmou ? { pagaEm: agora } : {}),
      ...(mudou ? { atualizadoEm: agora } : {}),
    }).where(and(eq(cobrancasPagamento.id, c.id), eq(cobrancasPagamento.estado, c.estado),
      c.alerta === null ? isNull(cobrancasPagamento.alerta) : eq(cobrancasPagamento.alerta, c.alerta))).returning();
    if (nova) {
      if (mudou) {
        await registrarEvento(amb.db, nova, 'transicao', {
          origem, de: c.estado, para: d.estado, status: p.status, detalhe: p.statusDetail, valorPagoCentavos: p.totalPagoCentavos, motivo: d.motivo, alerta,
        }, agora);
      } else if (d.motivo) {
        await registrarEventoAgrupado(amb.db, nova, 'observacao', `${d.motivo}:${p.status}/${p.statusDetail ?? ''}`, { origem, status: p.status, detalhe: p.statusDetail, motivo: d.motivo }, agora);
      }
      return nova;
    }
    c = await lerCobranca(amb.db, c.id);
  }
  throw new ErroApi(409, 'conflito_cobranca', 'A cobrança mudou durante a atualização. Tente novamente.');
}

/**
 * Consulta a order no provedor e aplica. Falha não altera o estado: soma uma falha seguida, adia a próxima
 * conferência (recuo exponencial, `Retry-After`) e atualiza um único evento enquanto a falha se repetir.
 */
export async function consultarNoProvedor(amb: AmbientePix, c: Cobranca, origem: string): Promise<{ cobranca: Cobranca; falha: FalhaConsulta | null }> {
  if (!c.pedidoProvedorId) return { cobranca: c, falha: null };
  try {
    const pedidoId = c.pedidoProvedorId;
    const pedido = await comTokenDaLoja(amb, c.lojaId, (token) => amb.provedor.consultarPedido(token, pedidoId));
    return { cobranca: await aplicarPedido(amb, c, pedido, origem), falha: null };
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 409 && erro.codigo === 'conflito_cobranca') throw erro;
    const falha = descreverFalha(erro);
    const agora = amb.relogio.agora();
    const atual = await lerCobranca(amb.db, c.id);
    const falhas = atual.falhasConsulta + 1;
    const repetirEmMs = erro instanceof ErroProvedorMp ? erro.repetirEmMs : null;
    const [salva] = await amb.db.update(cobrancasPagamento)
      .set({ falhasConsulta: falhas, proximaConsultaEm: proximaConsulta(atual, agora, falhas, repetirEmMs) })
      .where(and(eq(cobrancasPagamento.id, c.id), eq(cobrancasPagamento.estado, atual.estado))).returning();
    await registrarEventoAgrupado(amb.db, c, 'falha_consulta', `${falha.tipo}:${falha.status ?? ''}:${falha.codigo ?? ''}`, { origem, ...falha }, agora);
    return { cobranca: salva ?? atual, falha: falha.tipo };
  }
}

// ---------- Criação ----------

async function cobrancaDaLoja(db: Db, lojaId: string, id: string): Promise<Cobranca> {
  const [c] = await db.select().from(cobrancasPagamento).where(and(eq(cobrancasPagamento.id, id), eq(cobrancasPagamento.lojaId, lojaId)));
  if (!c) throw new ErroApi(404, 'cobranca_nao_encontrada', 'Cobrança não encontrada.');
  return c;
}

/** Chama o provedor sob uma trava curta; toda tentativa da mesma cobrança usa a mesma chave e o mesmo corpo. */
async function criarNoProvedor(amb: AmbientePix, c: Cobranca): Promise<Cobranca> {
  const agora = amb.relogio.agora();
  const [travada] = await amb.db.update(cobrancasPagamento)
    .set({ leaseAte: new Date(agora.getTime() + LEASE_CRIACAO_MS), tentativas: sql`${cobrancasPagamento.tentativas} + 1` })
    .where(and(eq(cobrancasPagamento.id, c.id), inArray(cobrancasPagamento.estado, [...SEM_PEDIDO]),
      or(isNull(cobrancasPagamento.leaseAte), lte(cobrancasPagamento.leaseAte, agora))))
    .returning();
  // Outra requisição está criando agora: devolve o estado atual (`criando`); o app acompanha pela consulta.
  if (!travada) return lerCobranca(amb.db, c.id);
  try {
    const pedido = await comTokenDaLoja(amb, travada.lojaId, (token, contaProvedorId) => {
      const point = travada.pedido.point;
      if (!point) return amb.provedor.criarPedidoPix(token, travada.chaveIdempotencia, travada.pedido);
      if (point.contaProvedorId !== contaProvedorId) throw new ErroProvedorMp('acesso_negado');
      return amb.provedor.criarPedidoPoint(token, travada.chaveIdempotencia, { ...travada.pedido, terminalId: point.terminalId, tipo: point.tipo });
    });
    const fim = amb.relogio.agora();
    const [salva] = await amb.db.update(cobrancasPagamento).set({
      estado: 'aguardando',
      pedidoProvedorId: pedido.id,
      statusProvedor: pedido.status,
      detalheProvedor: pedido.statusDetail,
      qrCode: pedido.pix?.qrCode ?? null,
      qrCodeBase64: pedido.pix?.qrCodeBase64 ?? null,
      ticketUrl: pedido.pix?.ticketUrl ?? null,
      expiraEm: pedido.expiraEm ?? new Date(travada.criadoEm.getTime() + EXPIRACAO_PIX_MS),
      leaseAte: null,
      ultimoErro: null,
      consultadoEm: fim,
      proximaConsultaEm: new Date(fim.getTime() + INTERVALO_PENDENTE_MS),
      falhasConsulta: 0,
      atualizadoEm: fim,
    }).where(and(eq(cobrancasPagamento.id, travada.id), inArray(cobrancasPagamento.estado, [...SEM_PEDIDO]))).returning();
    if (!salva) return lerCobranca(amb.db, travada.id);
    await registrarEvento(amb.db, salva, 'pedido_criado', { tentativa: travada.tentativas, status: pedido.status, detalhe: pedido.statusDetail, comQr: pedido.pix !== null }, fim);
    // Em geral `action_required`: não muda nada. Se o provedor já devolver um estado final, aplica pelas mesmas regras.
    return aplicarPedido(amb, salva, pedido, 'criacao');
  } catch (erro) {
    const falha = descreverFalha(erro);
    const fim = amb.relogio.agora();
    const [salva] = await amb.db.update(cobrancasPagamento)
      .set({ estado: 'erro_provedor', ultimoErro: falha.codigo ? `${falha.tipo}:${falha.codigo}` : falha.tipo, leaseAte: null, atualizadoEm: fim })
      .where(and(eq(cobrancasPagamento.id, travada.id), inArray(cobrancasPagamento.estado, [...SEM_PEDIDO]))).returning();
    await registrarEvento(amb.db, travada, 'falha_criacao', { tentativa: travada.tentativas, ...falha }, fim);
    return salva ?? lerCobranca(amb.db, travada.id);
  }
}

export async function criarCobrancaPix(amb: AmbientePix, sessao: SessaoAutenticada, req: {
  vendaId: string; pagamentoId: string; valorCentavos: number; meio?: 'pix' | 'cartao_credito' | 'cartao_debito'; terminalPointId?: string;
}): Promise<{ cobranca: CobrancaPix; criada: boolean }> {
  const meio = req.meio ?? 'pix';
  const cartao = meio !== 'pix';
  if (cartao && !amb.pointHabilitado) throw new ErroApi(503, 'point_indisponivel', 'A cobrança automática pelo Point está indisponível.');
  const conexao = await conexaoAtiva(amb.db, sessao.lojaId);
  if (!conexao?.tokenEnvelope) throw new ErroApi(409, 'mercadopago_nao_conectado', 'Conecte o Mercado Pago da loja antes de cobrar.');
  if (conexao.reautorizarDesde) throw reautorizar();
  if (!cartao && !amb.pagadorEmail) throw new ErroApi(503, 'pagador_nao_configurado', 'O e-mail do pagador do Pix não está configurado neste servidor. Use a confirmação manual.');
  const point = cartao && req.terminalPointId && conexao.contaProvedorId ? {
    terminalId: req.terminalPointId,
    tipo: meio === 'cartao_debito' ? 'debit_card' as const : 'credit_card' as const,
    contaProvedorId: conexao.contaProvedorId,
  } : undefined;
  if (cartao && !point) throw new ErroApi(409, 'point_nao_configurado', 'Selecione uma maquininha e confira a conexão da loja com o Mercado Pago.');
  const agora = amb.relogio.agora();
  const inseridas = await amb.db.insert(cobrancasPagamento).values({
    id: req.pagamentoId,
    contaId: sessao.contaId,
    lojaId: sessao.lojaId,
    conexaoId: conexao.id,
    vendaId: req.vendaId,
    operadorId: sessao.operadorId,
    aparelhoId: sessao.aparelhoId,
    provedor: 'mercadopago',
    meio,
    valorCentavos: req.valorCentavos,
    estado: 'criando',
    // Determinística: o reenvio do mesmo pagamento nunca cria uma segunda order no provedor.
    chaveIdempotencia: `pdv-${cartao ? 'point' : 'pix'}-${req.pagamentoId}`,
    pedido: {
      valorCentavos: req.valorCentavos,
      referenciaExterna: req.pagamentoId,
      expiracao: EXPIRACAO_PIX,
      pagadorEmail: cartao ? '' : amb.pagadorEmail!,
      pagadorPrimeiroNome: cartao ? null : amb.pagadorPrimeiroNome,
      ...(point ? { point } : {}),
    },
    criadoEm: agora,
    atualizadoEm: agora,
  }).onConflictDoNothing().returning();
  const criada = inseridas.length === 1;
  const [atual] = await amb.db.select().from(cobrancasPagamento).where(eq(cobrancasPagamento.id, req.pagamentoId));
  if (!atual || atual.lojaId !== sessao.lojaId || atual.vendaId !== req.vendaId || atual.valorCentavos !== req.valorCentavos ||
      atual.provedor !== 'mercadopago' || atual.meio !== meio || atual.pedido.point?.terminalId !== point?.terminalId ||
      atual.pedido.point?.contaProvedorId !== point?.contaProvedorId) {
    throw new ErroApi(409, 'cobranca_conflitante', 'Este pagamento já tem uma cobrança com outros dados.');
  }
  if (criada) await registrarEvento(amb.db, atual, 'criada', { valorCentavos: atual.valorCentavos }, agora);
  const final = SEM_PEDIDO.includes(atual.estado) ? await criarNoProvedor(amb, atual) : atual;
  return { cobranca: serializarCobranca(final), criada };
}

// ---------- Acompanhamento, cancelamento e lista ----------

/** Consulta do app: volta ao provedor no máximo a cada `consultaMinimaMs` por cobrança. */
export async function acompanharCobrancaPix(amb: AmbientePix, lojaId: string, id: string): Promise<CobrancaPix> {
  const c = await cobrancaDaLoja(amb.db, lojaId, id);
  if (c.estado !== 'aguardando' || !c.pedidoProvedorId) return serializarCobranca(c);
  const agora = amb.relogio.agora();
  const limite = new Date(agora.getTime() - amb.consultaMinimaMs);
  const [travada] = await amb.db.update(cobrancasPagamento).set({ consultadoEm: agora })
    .where(and(eq(cobrancasPagamento.id, c.id), eq(cobrancasPagamento.estado, 'aguardando'),
      or(isNull(cobrancasPagamento.consultadoEm), lte(cobrancasPagamento.consultadoEm, limite))))
    .returning();
  if (!travada) return serializarCobranca(c);
  return serializarCobranca((await consultarNoProvedor(amb, travada, 'consulta_app')).cobranca);
}

/**
 * Venda abandonada: pede ao provedor o cancelamento da order não paga. Se o provedor já recebeu o pagamento,
 * a cobrança vira `paga` (e não cancelada); o estorno, se for o caso, é manual no painel do Mercado Pago.
 */
export async function cancelarCobrancaPix(amb: AmbientePix, lojaId: string, id: string): Promise<CobrancaPix> {
  const c = await cobrancaDaLoja(amb.db, lojaId, id);
  if (FINAIS.includes(c.estado) || ENCERRADAS.includes(c.estado)) return serializarCobranca(c);
  const agora = amb.relogio.agora();
  if (SEM_PEDIDO.includes(c.estado)) {
    if (c.pedido.point) throw new ErroApi(409, 'cobranca_em_criacao', 'Confira o envio da cobrança ao Point antes de solicitar o cancelamento.');
    if (c.leaseAte && c.leaseAte > agora) throw new ErroApi(409, 'cobranca_em_criacao', 'A cobrança ainda está sendo criada. Tente de novo em instantes.');
    const [salva] = await amb.db.update(cobrancasPagamento).set({ estado: 'cancelada', atualizadoEm: agora })
      .where(and(eq(cobrancasPagamento.id, c.id), inArray(cobrancasPagamento.estado, [...SEM_PEDIDO]),
        or(isNull(cobrancasPagamento.leaseAte), lte(cobrancasPagamento.leaseAte, agora))))
      .returning();
    if (!salva) return serializarCobranca(await lerCobranca(amb.db, c.id));
    await registrarEvento(amb.db, salva, 'transicao', { origem: 'cancelamento', de: c.estado, para: 'cancelada', motivo: 'sem_order_no_provedor' }, agora);
    return serializarCobranca(salva);
  }
  const pedidoId = c.pedidoProvedorId!;
  try {
    const pedido = await comTokenDaLoja(amb, c.lojaId, (token) => amb.provedor.cancelarPedido(token, pedidoId, `pdv-cancelar-${c.id}`, Boolean(c.pedido.point)));
    return serializarCobranca(await aplicarPedido(amb, c, pedido, 'cancelamento'));
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    const falha = descreverFalha(erro);
    await registrarEvento(amb.db, c, 'falha_cancelamento', falha, amb.relogio.agora());
    // Recusa do cancelamento: o estado verdadeiro vem da consulta (pode estar paga).
    if (['nao_cancelavel', 'ja_cancelado', 'idempotencia_conflito'].includes(falha.tipo)) {
      try {
        const pedido = await comTokenDaLoja(amb, c.lojaId, (token) => amb.provedor.consultarPedido(token, pedidoId));
        return serializarCobranca(await aplicarPedido(amb, await lerCobranca(amb.db, c.id), pedido, 'cancelamento'));
      } catch { /* cai no 502 abaixo */ }
    }
    throw new ErroApi(502, 'provedor_indisponivel', 'O Mercado Pago não respondeu. A cobrança continua pendente; tente cancelar de novo.');
  }
}

export async function listarCobrancasPix(db: Db, lojaId: string, estado?: EstadoCobrancaPix): Promise<CobrancaPix[]> {
  const linhas = await db.select().from(cobrancasPagamento)
    .where(and(eq(cobrancasPagamento.lojaId, lojaId), estado ? eq(cobrancasPagamento.estado, estado) : undefined))
    .orderBy(desc(cobrancasPagamento.criadoEm), asc(cobrancasPagamento.id)).limit(200);
  // A lista do dono não carrega QR nem checkoutUrl.
  return linhas.map((c) => c.provedor === 'infinitepay'
    ? { ...serializarCobrancaInfinitePay(c), pix: null, checkoutUrl: null }
    : { ...serializarCobranca(c), pix: null });
}

// ---------- Webhook ----------

/**
 * Aviso do Mercado Pago. Não confia no corpo: valida a assinatura com o segredo da conexão e consulta a order.
 * Assinatura inválida/ausente, conexão desconhecida ou sem segredo → 401. Order desconhecida → ignorada (200).
 */
export async function receberAvisoMercadoPago(amb: AmbientePix, publicoId: string, aviso: { assinatura?: string; requestId?: string; dataId?: string; tipo?: string }): Promise<'ignorado' | 'consultado'> {
  const [conexao] = /^[A-Za-z0-9_-]{43}$/.test(publicoId)
    ? await amb.db.select().from(conexoesPagamento).where(and(eq(conexoesPagamento.publicoId, publicoId), eq(conexoesPagamento.ativa, true)))
    : [];
  let segredo: string | null = null;
  if (conexao?.segredoWebhookEnvelope) {
    try { segredo = amb.cifrador.decifrar(conexao.segredoWebhookEnvelope, { lojaId: conexao.lojaId, conexaoId: conexao.id, campo: 'segredo_webhook' }); } catch { segredo = null; }
  }
  if (!conexao || !assinaturaValida({ assinatura: aviso.assinatura, requestId: aviso.requestId, dataId: aviso.dataId, segredo })) {
    throw new ErroApi(401, 'assinatura_invalida', 'Assinatura do aviso inválida.');
  }
  if (!aviso.dataId || (aviso.tipo !== undefined && aviso.tipo !== 'order')) return 'ignorado';
  // Pela loja da conexão (índice em loja + lower(order)), não pela conexão que criou a cobrança: reconectar não perde avisos.
  const [c] = await amb.db.select().from(cobrancasPagamento)
    .where(and(eq(cobrancasPagamento.lojaId, conexao.lojaId), sql`lower(${cobrancasPagamento.pedidoProvedorId}) = ${aviso.dataId.toLowerCase()}`));
  if (!c) return 'ignorado';
  return processarAviso(amb, c, aviso);
}

/**
 * Webhook único da aplicação da plataforma (conexões OAuth), assinado com `PDV_MP_WEBHOOK_SECRET`. A order é
 * procurada em todas as lojas (índice em lower(order)) e conferida com o token ATUAL da loja dona da cobrança.
 * O `user_id` do corpo nunca decide nada; se diverge da conexão, só fica registrado. `mp-connect` só antecipa a
 * renovação da conexão daquele usuário. Tipos desconhecidos são ignorados.
 */
export async function receberAvisoPlataforma(amb: AmbientePix, aviso: { assinatura?: string; requestId?: string; dataId?: string; tipo?: string; usuarioId?: string | null }): Promise<'ignorado' | 'consultado' | 'revisao'> {
  const segredo = amb.oauth?.webhookSegredo;
  if (!segredo) throw new ErroApi(503, 'oauth_indisponivel', 'Conexão pelo Mercado Pago indisponível neste servidor.');
  if (!assinaturaValida({ assinatura: aviso.assinatura, requestId: aviso.requestId, dataId: aviso.dataId, segredo })) {
    throw new ErroApi(401, 'assinatura_invalida', 'Assinatura do aviso inválida.');
  }
  if (aviso.tipo === 'mp-connect') {
    const usuario = aviso.usuarioId ?? aviso.dataId ?? null;
    if (usuario) await sinalizarRevisaoConexao(amb, usuario);
    return 'revisao';
  }
  if (!aviso.dataId || (aviso.tipo !== undefined && aviso.tipo !== 'order')) return 'ignorado';
  const [c] = await amb.db.select().from(cobrancasPagamento)
    .where(sql`lower(${cobrancasPagamento.pedidoProvedorId}) = ${aviso.dataId.toLowerCase()}`).limit(1);
  if (!c) return 'ignorado';
  if (aviso.usuarioId) {
    const conexao = await conexaoAtiva(amb.db, c.lojaId);
    if (conexao?.contaProvedorId && conexao.contaProvedorId !== aviso.usuarioId) {
      await registrarEventoAgrupado(amb.db, c, 'observacao', 'usuario_divergente_no_aviso', { origem: 'webhook_plataforma', motivo: 'usuario_divergente_no_aviso' }, amb.relogio.agora());
    }
  }
  return processarAviso(amb, c, aviso);
}

/** Registro agrupado do aviso + o mesmo limite da consulta do app (uma consulta a cada 3 s por cobrança). */
async function processarAviso(amb: AmbientePix, c: Cobranca, aviso: { tipo?: string }): Promise<'ignorado' | 'consultado'> {
  const agora = amb.relogio.agora();
  await registrarEventoAgrupado(amb.db, c, 'aviso_recebido', 'aviso', { tipo: aviso.tipo ?? null }, agora);
  const [travada] = await amb.db.update(cobrancasPagamento).set({ consultadoEm: agora })
    .where(and(eq(cobrancasPagamento.id, c.id),
      or(isNull(cobrancasPagamento.consultadoEm), lte(cobrancasPagamento.consultadoEm, new Date(agora.getTime() - amb.consultaMinimaMs)))))
    .returning();
  if (!travada) return 'ignorado';
  await consultarNoProvedor(amb, travada, 'webhook');
  return 'consultado';
}

// ---------- Conciliação (job) ----------

export interface ResumoConciliacaoPix {
  consultadas: number;
  confirmadas: number;
  encerradas: number;
  falhas: number;
}

/**
 * Aviso perdido, expiração e pagamento tardio: confere as cobranças com `proximaConsultaEm` vencida, no máximo
 * 5 por loja e 50 por passada, as mais atrasadas primeiro. Um 429 pula só a loja que o recebeu; erro numa
 * cobrança não interrompe as outras; `deveParar` encerra a passada entre duas consultas.
 */
export async function conciliarCobrancasPix(amb: AmbientePix, opcoes: { deveParar?: () => boolean } = {}): Promise<ResumoConciliacaoPix> {
  const agora = amb.relogio.agora();
  const cp = cobrancasPagamento;
  const candidatas = amb.db.select({
    id: cp.id,
    proxima: cp.proximaConsultaEm,
    ordem: sql<number>`row_number() over (partition by ${cp.lojaId} order by ${cp.proximaConsultaEm} asc, ${cp.id} asc)`.as('ordem'),
  }).from(cp)
    .where(and(
      inArray(cp.estado, ['aguardando', ...ENCERRADAS]),
      isNotNull(cp.pedidoProvedorId),
      lte(cp.proximaConsultaEm, agora),
      amb.infinitePay === null ? eq(cp.provedor, 'mercadopago') : undefined,
    ))
    .as('candidatas');
  const fila = await amb.db.select({ id: candidatas.id }).from(candidatas)
    .where(lte(candidatas.ordem, POR_LOJA_CONCILIACAO)).orderBy(asc(candidatas.proxima), asc(candidatas.id)).limit(LOTE_CONCILIACAO);
  const resumo: ResumoConciliacaoPix = { consultadas: 0, confirmadas: 0, encerradas: 0, falhas: 0 };
  const lojasEmEspera = new Set<string>();
  for (const { id } of fila) {
    if (opcoes.deveParar?.()) break;
    try {
      const [c] = await amb.db.select().from(cp).where(eq(cp.id, id));
      if (!c || !c.proximaConsultaEm || lojasEmEspera.has(c.lojaId)) continue;
      const instante = amb.relogio.agora();
      if (instante.getTime() >= fimDaJanela(c)) {
        // Fim da janela de 24 h: para de conferir; o estado fica como está, visível ao dono.
        await amb.db.update(cp).set({ proximaConsultaEm: null }).where(and(eq(cp.id, c.id), eq(cp.proximaConsultaEm, c.proximaConsultaEm)));
        continue;
      }
      const [travada] = await amb.db.update(cp)
        .set({ consultadoEm: instante, proximaConsultaEm: new Date(instante.getTime() + TRAVA_CONSULTA_MS) })
        .where(and(eq(cp.id, c.id), eq(cp.estado, c.estado), eq(cp.proximaConsultaEm, c.proximaConsultaEm)))
        .returning();
      if (!travada) continue;
      resumo.consultadas += 1;
      const antes = travada.estado;
      let depois: EstadoCobrancaPix;
      if (travada.provedor === 'infinitepay') {
        const resInf = await consultarInfinitePayNoProvedor({
          db: amb.db,
          relogio: amb.relogio,
          cifrador: amb.cifrador,
          provedor: amb.infinitePay ?? criarProvedorInfinitePay(),
          urlPublicaApi: amb.urlPublicaApi ?? null,
          consultaMinimaMs: amb.consultaMinimaMs,
        }, travada, 'conciliacao');
        if (resInf.falhou) {
          resumo.falhas += 1;
          continue;
        }
        depois = resInf.cobranca.estado;
      } else {
        const { cobranca, falha } = await consultarNoProvedor(amb, travada, 'conciliacao');
        if (falha) {
          resumo.falhas += 1;
          if (falha === 'limite') lojasEmEspera.add(c.lojaId);
          continue;
        }
        depois = cobranca.estado;
      }
      if (depois !== antes) {
        if (depois === 'paga' || depois === 'paga_tardia') resumo.confirmadas += 1;
        else resumo.encerradas += 1;
      }
    } catch {
      resumo.falhas += 1;
    }
  }
  return resumo;
}

// ---------- Sincronização da venda ----------

/**
 * Pix ou Point do Mercado Pago na venda: só com cobrança desta loja, `paga`, da mesma venda, meio e valor, sem troco e
 * ainda não usada, sem alerta de estorno/contestação. Sem cobrança nesta loja → `pagamento_indisponivel` (nada se revela de outras lojas).
 * Chamada dentro da transação do push; trava a linha até o vínculo.
 */
export async function validarPagamentoMercadoPago(tx: Db, lojaId: string, vendaId: string, p: PagamentoVenda): Promise<string | null> {
  const [c] = await tx.select().from(cobrancasPagamento)
    .where(and(eq(cobrancasPagamento.id, p.id), eq(cobrancasPagamento.lojaId, lojaId))).for('update');
  if (!c || c.meio !== p.meio) return 'pagamento_indisponivel';
  if (c.estado !== 'paga' || c.vendaId !== vendaId || c.valorCentavos !== p.valorCentavos || p.trocoCentavos !== 0 ||
      c.vinculadaEm !== null || c.alerta !== null || c.provedor !== 'mercadopago') return 'pagamento_nao_confirmado';
  return null;
}

export async function vincularCobrancas(tx: Db, lojaId: string, vendaId: string, ids: string[], agora: Date): Promise<void> {
  if (ids.length === 0) return;
  const vinculadas = await tx.update(cobrancasPagamento).set({ vinculadaEm: agora, atualizadoEm: agora })
    .where(and(inArray(cobrancasPagamento.id, ids), eq(cobrancasPagamento.lojaId, lojaId), eq(cobrancasPagamento.vendaId, vendaId),
      eq(cobrancasPagamento.estado, 'paga'), isNull(cobrancasPagamento.vinculadaEm)))
    .returning({ id: cobrancasPagamento.id });
  if (vinculadas.length !== ids.length) throw new ErroApi(409, 'conflito_pagamento', 'A cobrança mudou durante a sincronização. Tente novamente.');
  for (const id of ids) await registrarEvento(tx, { id, lojaId }, 'vinculada', { vendaId }, agora);
}
