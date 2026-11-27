import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import {
  gerarId,
  type CobrancaPix,
  type ConectarInfinitePayReq,
  type ConexaoInfinitePay,
  type EstadoCobrancaPix,
  type PagamentoVenda,
  type Relogio,
} from '@pdv/shared';
import type { SessaoAutenticada } from '../auth';
import type { Db } from '../db/conexao';
import { cobrancasPagamento, conexoesPagamento, eventosCobrancaPagamento } from '../db/schema';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import { ErroCifraPagamentos, type CifradorPagamentos } from '../pagamentos/cifrador';
import {
  criarProvedorInfinitePay,
  ErroProvedorInfinitePay,
  EXPIRACAO_INFINITEPAY_MS,
  type ProvedorInfinitePay,
  type ResultadoVerificacaoInfinitePay,
} from '../pagamentos/infinitePay';
import { CONSULTA_MINIMA_MS, proximaConsulta } from './cobrancasPix';

type Cobranca = typeof cobrancasPagamento.$inferSelect;
type Conexao = typeof conexoesPagamento.$inferSelect;

const FINAIS: readonly EstadoCobrancaPix[] = ['paga', 'paga_tardia', 'divergente'];
const ENCERRADAS: readonly EstadoCobrancaPix[] = ['expirada', 'cancelada'];
const SEM_PEDIDO: readonly EstadoCobrancaPix[] = ['criando', 'erro_provedor'];
const LEASE_CRIACAO_MS = 30_000;
const INTERVALO_PENDENTE_MS = 30_000;

export interface AmbienteInfinitePay {
  db: Db;
  relogio: Relogio;
  cifrador: CifradorPagamentos;
  provedor: ProvedorInfinitePay;
  urlPublicaApi: string | null;
  consultaMinimaMs: number;
}

export function ambienteInfinitePay(deps: Pick<Deps, 'db' | 'relogio' | 'pagamentos'>): AmbienteInfinitePay {
  const p = deps.pagamentos;
  if (!p?.cifrador || p.infinitePay === null) {
    throw new ErroApi(503, 'pagamentos_indisponiveis', 'Pagamentos integrados indisponíveis neste servidor. Use a confirmação manual.');
  }
  return {
    db: deps.db,
    relogio: deps.relogio,
    cifrador: p.cifrador,
    provedor: p.infinitePay ?? criarProvedorInfinitePay(),
    urlPublicaApi: p.urlPublicaApi ?? null,
    consultaMinimaMs: p.consultaMinimaMs ?? CONSULTA_MINIMA_MS,
  };
}

export const webhookInfinitePayPath = (publicoId: string): string => `/webhooks/pdv-infinitepay/${publicoId}`;

export async function conexaoInfinitePayAtiva(db: Db, lojaId: string): Promise<Conexao | undefined> {
  const [c] = await db.select().from(conexoesPagamento)
    .where(and(eq(conexoesPagamento.lojaId, lojaId), eq(conexoesPagamento.provedor, 'infinitepay'), eq(conexoesPagamento.ativa, true)));
  return c;
}

export function serializarConexaoInfinitePay(c: Conexao | undefined): ConexaoInfinitePay {
  if (!c) {
    return { conectada: false, handle: null, temApiKey: false, webhookPath: null, conectadaEm: null, atualizadaEm: null };
  }
  return {
    conectada: true,
    handle: c.handle ?? null,
    temApiKey: c.tokenEnvelope !== null,
    webhookPath: webhookInfinitePayPath(c.publicoId),
    conectadaEm: c.criadoEm.toISOString(),
    atualizadaEm: c.atualizadoEm.toISOString(),
  };
}

export async function estadoConexaoInfinitePay(amb: AmbienteInfinitePay, lojaId: string): Promise<ConexaoInfinitePay> {
  return serializarConexaoInfinitePay(await conexaoInfinitePayAtiva(amb.db, lojaId));
}

export async function conectarInfinitePay(
  amb: AmbienteInfinitePay,
  sessao: SessaoAutenticada,
  req: ConectarInfinitePayReq,
): Promise<{ conexao: ConexaoInfinitePay; criada: boolean }> {
  const agora = amb.relogio.agora();
  const resultado = await amb.db.transaction(async (tx) => {
    const [atual] = await tx.select().from(conexoesPagamento)
      .where(and(eq(conexoesPagamento.lojaId, sessao.lojaId), eq(conexoesPagamento.provedor, 'infinitepay'), eq(conexoesPagamento.ativa, true)))
      .for('update');
    const id = atual?.id ?? gerarId();
    const tokenEnvelope = req.apiKey
      ? amb.cifrador.cifrar(req.apiKey, { lojaId: sessao.lojaId, conexaoId: id, campo: 'token' })
      : (atual?.tokenEnvelope ?? null);
    if (atual) {
      const [salva] = await tx.update(conexoesPagamento).set({
        handle: req.handle,
        tokenEnvelope,
        atualizadoEm: agora,
      }).where(eq(conexoesPagamento.id, id)).returning();
      return { conexao: salva!, criada: false };
    }
    const [salva] = await tx.insert(conexoesPagamento).values({
      id,
      contaId: sessao.contaId,
      lojaId: sessao.lojaId,
      provedor: 'infinitepay',
      publicoId: randomBytes(32).toString('base64url'),
      handle: req.handle,
      tokenEnvelope,
      ativa: true,
      modo: 'token',
      criadoPor: sessao.operadorId,
      criadoEm: agora,
      atualizadoEm: agora,
    }).returning();
    return { conexao: salva!, criada: true };
  });
  return { conexao: serializarConexaoInfinitePay(resultado.conexao), criada: resultado.criada };
}

export async function desconectarInfinitePay(amb: Pick<AmbienteInfinitePay, 'db' | 'relogio'>, lojaId: string): Promise<void> {
  const agora = amb.relogio.agora();
  await amb.db.update(conexoesPagamento)
    .set({
      ativa: false,
      tokenEnvelope: null,
      refreshTokenEnvelope: null,
      segredoWebhookEnvelope: null,
      desativadaEm: agora,
      atualizadoEm: agora,
    })
    .where(and(eq(conexoesPagamento.lojaId, lojaId), eq(conexoesPagamento.provedor, 'infinitepay'), eq(conexoesPagamento.ativa, true)));
}

function decifrarApiKey(amb: AmbienteInfinitePay, c: Conexao): string | null {
  if (!c.tokenEnvelope) return null;
  try {
    return amb.cifrador.decifrar(c.tokenEnvelope, { lojaId: c.lojaId, conexaoId: c.id, campo: 'token' });
  } catch {
    throw new ErroCifraPagamentos('Credencial da InfinitePay ilegível.');
  }
}

export function serializarCobrancaInfinitePay(c: Cobranca): CobrancaPix {
  return {
    id: c.id,
    vendaId: c.vendaId,
    estado: c.estado,
    valorCentavos: c.valorCentavos,
    valorPagoCentavos: c.valorPagoCentavos,
    // Para InfinitePay Checkout, disponibilizamos a URL do checkout em ticketUrl e qrCode enquanto aguardando.
    pix: c.estado === 'aguardando' && c.checkoutUrl
      ? { qrCode: c.checkoutUrl, qrCodeBase64: null, ticketUrl: c.checkoutUrl }
      : null,
    expiraEm: c.expiraEm ? c.expiraEm.toISOString() : null,
    pagaEm: c.pagaEm ? c.pagaEm.toISOString() : null,
    vinculadaEm: c.vinculadaEm ? c.vinculadaEm.toISOString() : null,
    alerta: c.alerta,
    criadaEm: c.criadoEm.toISOString(),
    atualizadaEm: c.atualizadoEm.toISOString(),
    provedor: 'infinitepay',
    meio: c.meio,
    checkoutUrl: c.estado === 'aguardando' ? c.checkoutUrl : null,
  };
}

async function registrarEvento(db: Db, c: Pick<Cobranca, 'id' | 'lojaId'>, tipo: string, dados: Record<string, unknown>, agora: Date): Promise<void> {
  await db.insert(eventosCobrancaPagamento).values({ id: gerarId(), cobrancaId: c.id, lojaId: c.lojaId, tipo, dados, criadoEm: agora });
}

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

export function decidirTransicaoInfinitePay(
  c: Pick<Cobranca, 'estado' | 'alerta' | 'valorCentavos' | 'valorPagoCentavos' | 'expiraEm'>,
  v: ResultadoVerificacaoInfinitePay,
  agora: Date,
): { estado: EstadoCobrancaPix; valorPagoCentavos: number | null; motivo: string | null } {
  if (FINAIS.includes(c.estado)) {
    return { estado: c.estado, valorPagoCentavos: c.valorPagoCentavos, motivo: null };
  }
  if (v.success && v.paid) {
    if (v.amount !== c.valorCentavos || (v.paidAmount !== null && v.paidAmount < c.valorCentavos)) {
      return { estado: 'divergente', valorPagoCentavos: v.paidAmount ?? v.amount, motivo: 'valor_divergente' };
    }
    const pago = v.paidAmount ?? c.valorCentavos;
    return {
      estado: ENCERRADAS.includes(c.estado) ? 'paga_tardia' : 'paga',
      valorPagoCentavos: pago,
      motivo: ENCERRADAS.includes(c.estado) ? 'pagamento_tardio' : null,
    };
  }
  if (c.estado === 'aguardando' && c.expiraEm && agora >= c.expiraEm) {
    return { estado: 'expirada', valorPagoCentavos: c.valorPagoCentavos, motivo: 'expirada' };
  }
  return { estado: c.estado, valorPagoCentavos: c.valorPagoCentavos, motivo: null };
}

async function lerCobranca(db: Db, id: string): Promise<Cobranca> {
  const [c] = await db.select().from(cobrancasPagamento).where(eq(cobrancasPagamento.id, id));
  if (!c) throw new Error('Cobrança desapareceu.');
  return c;
}

async function aplicarVerificacao(amb: Pick<AmbienteInfinitePay, 'db' | 'relogio'>, inicial: Cobranca, v: ResultadoVerificacaoInfinitePay, origem: string): Promise<Cobranca> {
  let c = inicial;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const agora = amb.relogio.agora();
    const d = decidirTransicaoInfinitePay(c, v, agora);
    const mudou = d.estado !== c.estado || d.valorPagoCentavos !== c.valorPagoCentavos;
    const confirmou = (d.estado === 'paga' || d.estado === 'paga_tardia') && c.pagaEm === null;
    const [nova] = await amb.db.update(cobrancasPagamento).set({
      estado: d.estado,
      valorPagoCentavos: d.valorPagoCentavos,
      statusProvedor: v.paid ? 'paid' : (d.estado === 'expirada' ? 'expired' : 'pending'),
      detalheProvedor: v.captureMethod ?? c.detalheProvedor,
      consultadoEm: agora,
      proximaConsultaEm: proximaConsulta({ ...c, estado: d.estado }, agora),
      falhasConsulta: 0,
      ...(confirmou ? { pagaEm: agora } : {}),
      ...(mudou ? { atualizadoEm: agora } : {}),
    }).where(and(eq(cobrancasPagamento.id, c.id), eq(cobrancasPagamento.estado, c.estado))).returning();
    if (nova) {
      if (mudou) {
        await registrarEvento(amb.db, nova, 'transicao', {
          origem, de: c.estado, para: d.estado, paid: v.paid, amount: v.amount, paidAmount: v.paidAmount, motivo: d.motivo,
        }, agora);
      }
      return nova;
    }
    c = await lerCobranca(amb.db, c.id);
  }
  throw new ErroApi(409, 'conflito_cobranca', 'A cobrança mudou durante a atualização. Tente novamente.');
}

async function criarLinkNoProvedor(amb: AmbienteInfinitePay, c: Cobranca): Promise<Cobranca> {
  const agora = amb.relogio.agora();
  const [travada] = await amb.db.update(cobrancasPagamento)
    .set({ leaseAte: new Date(agora.getTime() + LEASE_CRIACAO_MS), tentativas: sql`${cobrancasPagamento.tentativas} + 1` })
    .where(and(eq(cobrancasPagamento.id, c.id), inArray(cobrancasPagamento.estado, [...SEM_PEDIDO]),
      or(isNull(cobrancasPagamento.leaseAte), lte(cobrancasPagamento.leaseAte, agora))))
    .returning();
  if (!travada) return lerCobranca(amb.db, c.id);

  try {
    const conexao = await conexaoInfinitePayAtiva(amb.db, travada.lojaId);
    if (!conexao?.handle) throw new ErroApi(409, 'infinitepay_nao_conectado', 'Conecte a InfinitePay da loja antes de cobrar.');
    const apiKey = decifrarApiKey(amb, conexao);
    const expiraEm = new Date(travada.criadoEm.getTime() + EXPIRACAO_INFINITEPAY_MS);
    const webhookUrl = amb.urlPublicaApi ? `${amb.urlPublicaApi.replace(/\/+$/, '')}${webhookInfinitePayPath(conexao.publicoId)}` : null;
    const link = await amb.provedor.criarLinkCheckout({
      handle: conexao.handle,
      apiKey,
      valorCentavos: travada.valorCentavos,
      referenciaExterna: travada.id,
      descricao: travada.pedido.descricao ?? 'Venda Prisma PDV',
      webhookUrl,
      expiraEm,
    });
    const fim = amb.relogio.agora();
    const [salva] = await amb.db.update(cobrancasPagamento).set({
      estado: 'aguardando',
      pedidoProvedorId: travada.id,
      checkoutUrl: link.url,
      slugProvedor: link.slug,
      statusProvedor: 'pending',
      expiraEm: link.expiraEm,
      leaseAte: null,
      ultimoErro: null,
      consultadoEm: fim,
      proximaConsultaEm: new Date(fim.getTime() + INTERVALO_PENDENTE_MS),
      falhasConsulta: 0,
      atualizadoEm: fim,
    }).where(and(eq(cobrancasPagamento.id, travada.id), inArray(cobrancasPagamento.estado, [...SEM_PEDIDO]))).returning();
    if (!salva) return lerCobranca(amb.db, travada.id);
    await registrarEvento(amb.db, salva, 'pedido_criado', { provedor: 'infinitepay', slug: link.slug }, fim);
    return salva;
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    const fim = amb.relogio.agora();
    const tipo = erro instanceof ErroProvedorInfinitePay ? erro.tipo : 'indisponivel';
    const [salva] = await amb.db.update(cobrancasPagamento)
      .set({ estado: 'erro_provedor', ultimoErro: tipo, leaseAte: null, atualizadoEm: fim })
      .where(and(eq(cobrancasPagamento.id, travada.id), inArray(cobrancasPagamento.estado, [...SEM_PEDIDO]))).returning();
    await registrarEvento(amb.db, travada, 'falha_criacao', { tentativa: travada.tentativas, tipo }, fim);
    return salva ?? lerCobranca(amb.db, travada.id);
  }
}

export async function criarCobrancaInfinitePay(
  amb: AmbienteInfinitePay,
  sessao: SessaoAutenticada,
  req: { vendaId: string; pagamentoId: string; valorCentavos: number; meio?: 'pix' | 'cartao_credito' | 'cartao_debito'; descricao?: string },
): Promise<{ cobranca: CobrancaPix; criada: boolean }> {
  const conexao = await conexaoInfinitePayAtiva(amb.db, sessao.lojaId);
  if (!conexao?.handle) {
    throw new ErroApi(409, 'infinitepay_nao_conectado', 'Conecte a InfinitePay da loja antes de cobrar.');
  }
  const agora = amb.relogio.agora();
  const meio = req.meio ?? 'pix';
  const inseridas = await amb.db.insert(cobrancasPagamento).values({
    id: req.pagamentoId,
    contaId: sessao.contaId,
    lojaId: sessao.lojaId,
    conexaoId: conexao.id,
    vendaId: req.vendaId,
    operadorId: sessao.operadorId,
    aparelhoId: sessao.aparelhoId,
    provedor: 'infinitepay',
    meio,
    valorCentavos: req.valorCentavos,
    estado: 'criando',
    chaveIdempotencia: `pdv-ip-${req.pagamentoId}`,
    pedido: {
      valorCentavos: req.valorCentavos,
      referenciaExterna: req.pagamentoId,
      expiracao: 'PT30M',
      pagadorEmail: 'checkout@prisma.pdv',
      pagadorPrimeiroNome: null,
      descricao: req.descricao ?? 'Venda Prisma PDV',
    },
    criadoEm: agora,
    atualizadoEm: agora,
  }).onConflictDoNothing().returning();
  const criada = inseridas.length === 1;
  const [atual] = await amb.db.select().from(cobrancasPagamento).where(eq(cobrancasPagamento.id, req.pagamentoId));
  if (!atual || atual.lojaId !== sessao.lojaId || atual.vendaId !== req.vendaId || atual.valorCentavos !== req.valorCentavos || atual.provedor !== 'infinitepay') {
    throw new ErroApi(409, 'cobranca_conflitante', 'Este pagamento já tem uma cobrança com outros dados.');
  }
  if (criada) await registrarEvento(amb.db, atual, 'criada', { valorCentavos: atual.valorCentavos, provedor: 'infinitepay' }, agora);
  const final = SEM_PEDIDO.includes(atual.estado) ? await criarLinkNoProvedor(amb, atual) : atual;
  return { cobranca: serializarCobrancaInfinitePay(final), criada };
}

export async function consultarInfinitePayNoProvedor(amb: AmbienteInfinitePay, c: Cobranca, origem: string): Promise<{ cobranca: Cobranca; falhou: boolean }> {
  const agora = amb.relogio.agora();
  if (!c.slugProvedor || !c.transacaoProvedorId) {
    // Sem slug/transaction_nsu ainda: só verifica expiração local.
    if (c.estado === 'aguardando' && c.expiraEm && agora >= c.expiraEm) {
      return { cobranca: await aplicarVerificacao(amb, c, { success: true, paid: false, amount: null, paidAmount: null, installments: null, captureMethod: null }, origem), falhou: false };
    }
    return { cobranca: c, falhou: false };
  }
  const conexao = await conexaoInfinitePayAtiva(amb.db, c.lojaId);
  if (!conexao?.handle) return { cobranca: c, falhou: true };
  try {
    const apiKey = decifrarApiKey(amb, conexao);
    const verificado = await amb.provedor.verificarPagamento({
      handle: conexao.handle,
      apiKey,
      orderNsu: c.id,
      transactionNsu: c.transacaoProvedorId,
      slug: c.slugProvedor,
    });
    return { cobranca: await aplicarVerificacao(amb, c, verificado, origem), falhou: false };
  } catch (erro) {
    const atual = await lerCobranca(amb.db, c.id);
    const falhas = atual.falhasConsulta + 1;
    const repetirEmMs = erro instanceof ErroProvedorInfinitePay ? erro.repetirEmMs : null;
    const [salva] = await amb.db.update(cobrancasPagamento)
      .set({ falhasConsulta: falhas, proximaConsultaEm: proximaConsulta(atual, agora, falhas, repetirEmMs) })
      .where(and(eq(cobrancasPagamento.id, c.id), eq(cobrancasPagamento.estado, atual.estado))).returning();
    await registrarEventoAgrupado(amb.db, c, 'falha_consulta', 'infinitepay', { origem }, agora);
    return { cobranca: salva ?? atual, falhou: true };
  }
}

export async function acompanharCobrancaInfinitePay(amb: AmbienteInfinitePay, c: Cobranca): Promise<CobrancaPix> {
  if (c.estado !== 'aguardando') return serializarCobrancaInfinitePay(c);
  const agora = amb.relogio.agora();
  const limite = new Date(agora.getTime() - amb.consultaMinimaMs);
  const [travada] = await amb.db.update(cobrancasPagamento).set({ consultadoEm: agora })
    .where(and(eq(cobrancasPagamento.id, c.id), eq(cobrancasPagamento.estado, 'aguardando'),
      or(isNull(cobrancasPagamento.consultadoEm), lte(cobrancasPagamento.consultadoEm, limite))))
    .returning();
  if (!travada) return serializarCobrancaInfinitePay(c);
  return serializarCobrancaInfinitePay((await consultarInfinitePayNoProvedor(amb, travada, 'consulta_app')).cobranca);
}

export async function cancelarCobrancaInfinitePay(amb: AmbienteInfinitePay, c: Cobranca): Promise<CobrancaPix> {
  if (FINAIS.includes(c.estado) || ENCERRADAS.includes(c.estado)) return serializarCobrancaInfinitePay(c);
  const agora = amb.relogio.agora();
  if (c.slugProvedor && c.transacaoProvedorId) {
    const { cobranca } = await consultarInfinitePayNoProvedor(amb, c, 'cancelamento');
    if (cobranca.estado === 'paga' || cobranca.estado === 'paga_tardia') return serializarCobrancaInfinitePay(cobranca);
  }
  const [salva] = await amb.db.update(cobrancasPagamento)
    .set({ estado: 'cancelada', atualizadoEm: agora, proximaConsultaEm: proximaConsulta({ ...c, estado: 'cancelada' }, agora) })
    .where(and(eq(cobrancasPagamento.id, c.id), inArray(cobrancasPagamento.estado, ['criando', 'erro_provedor', 'aguardando'])))
    .returning();
  if (!salva) return serializarCobrancaInfinitePay(await lerCobranca(amb.db, c.id));
  await registrarEvento(amb.db, salva, 'transicao', { origem: 'cancelamento', de: c.estado, para: 'cancelada', motivo: 'cancelado_no_pdv' }, agora);
  return serializarCobrancaInfinitePay(salva);
}

/**
 * Webhook sem assinatura da InfinitePay: nunca confia em `paid`/`amount` do corpo.
 * Apenas captura `order_nsu`, `transaction_nsu` e `invoice_slug`/`slug` e obrigatoriamente consulta `payment_check`.
 */
export async function receberAvisoInfinitePay(
  amb: AmbienteInfinitePay,
  publicoId: string,
  payload: { order_nsu?: string; transaction_nsu?: string; invoice_slug?: string; slug?: string },
): Promise<'ignorado' | 'consultado'> {
  const [conexao] = /^[A-Za-z0-9_-]{43}$/.test(publicoId)
    ? await amb.db.select().from(conexoesPagamento).where(and(eq(conexoesPagamento.publicoId, publicoId), eq(conexoesPagamento.provedor, 'infinitepay'), eq(conexoesPagamento.ativa, true)))
    : [];
  if (!conexao) throw new ErroApi(404, 'conexao_nao_encontrada', 'Conexão InfinitePay não encontrada.');

  const orderNsu = payload.order_nsu?.trim();
  const transactionNsu = payload.transaction_nsu?.trim();
  const slug = (payload.invoice_slug ?? payload.slug)?.trim();
  if (!orderNsu || !transactionNsu || !slug) return 'ignorado';

  const [c] = await amb.db.select().from(cobrancasPagamento)
    .where(and(eq(cobrancasPagamento.lojaId, conexao.lojaId), eq(cobrancasPagamento.id, orderNsu), eq(cobrancasPagamento.provedor, 'infinitepay')));
  if (!c) return 'ignorado';

  const agora = amb.relogio.agora();
  await registrarEventoAgrupado(amb.db, c, 'aviso_recebido', 'infinitepay', { transactionNsu, slug }, agora);
  const [atualizada] = await amb.db.update(cobrancasPagamento).set({
    transacaoProvedorId: transactionNsu,
    slugProvedor: slug,
    consultadoEm: agora,
  }).where(eq(cobrancasPagamento.id, c.id)).returning();

  await consultarInfinitePayNoProvedor(amb, atualizada ?? c, 'webhook');
  return 'consultado';
}

export async function validarPagamentoInfinitePay(tx: Db, lojaId: string, vendaId: string, p: PagamentoVenda): Promise<string | null> {
  const [c] = await tx.select().from(cobrancasPagamento)
    .where(and(eq(cobrancasPagamento.id, p.id), eq(cobrancasPagamento.lojaId, lojaId))).for('update');
  if (!c || c.provedor !== 'infinitepay') return 'pagamento_indisponivel';
  if (c.estado !== 'paga' || c.vendaId !== vendaId || c.valorCentavos !== p.valorCentavos || p.trocoCentavos !== 0 ||
      c.vinculadaEm !== null || c.alerta !== null || c.meio !== p.meio) return 'pagamento_nao_confirmado';
  return null;
}
