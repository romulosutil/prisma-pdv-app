/**
 * Cliente da Orders API do Mercado Pago (Pix), atrás de uma interface para os testes usarem o provedor simulado.
 * Documentação consultada em 18/11/2026 (ver docs/n2-pix-mercadopago.md). Nunca registra nem devolve o token:
 * as mensagens de erro carregam só o status HTTP e o código de erro do provedor.
 */

export const MERCADO_PAGO_BASE_URL = 'https://api.mercadopago.com';
/** Mínimo aceito pelo Mercado Pago para o vencimento do Pix (30 min a 30 dias). */
export const EXPIRACAO_PIX = 'PT30M';
export const EXPIRACAO_PIX_MS = 30 * 60 * 1000;

export interface PedidoPixEntrada {
  valorCentavos: number;
  /** `external_reference`: até 64 caracteres; usamos o id do pagamento (UUID). */
  referenciaExterna: string;
  expiracao: string;
  pagadorEmail: string;
  /** Só em teste: `APRO` faz a conta de teste aprovar o Pix sozinha. */
  pagadorPrimeiroNome: string | null;
}

/** O que importa de uma order. Valores em centavos; `null` quando o provedor não informou ou veio ilegível. */
export interface PedidoMercadoPago {
  id: string;
  status: string;
  statusDetail: string | null;
  referenciaExterna: string | null;
  totalCentavos: number | null;
  totalPagoCentavos: number | null;
  pix: { qrCode: string; qrCodeBase64: string | null; ticketUrl: string | null } | null;
  expiraEm: Date | null;
}

export type FalhaProvedor =
  | 'credencial_invalida'
  | 'nao_encontrado'
  | 'nao_cancelavel'
  | 'ja_cancelado'
  | 'idempotencia_conflito'
  | 'limite'
  | 'rejeitado'
  | 'resposta_invalida'
  | 'indisponivel';

export class ErroProvedorMp extends Error {
  constructor(
    readonly tipo: FalhaProvedor,
    readonly status: number | null = null,
    readonly codigo: string | null = null,
    readonly repetirEmMs: number | null = null,
  ) {
    super(`Mercado Pago: ${tipo}${status === null ? '' : ` (HTTP ${status}${codigo ? `, ${codigo}` : ''})`}`);
    this.name = 'ErroProvedorMp';
  }
}

export interface ProvedorMercadoPago {
  /** Consulta barata e autenticada para conferir o token ao conectar. */
  validarCredencial(token: string): Promise<{ contaProvedorId: string | null }>;
  criarPedidoPix(token: string, chaveIdempotencia: string, pedido: PedidoPixEntrada): Promise<PedidoMercadoPago>;
  consultarPedido(token: string, pedidoId: string): Promise<PedidoMercadoPago>;
  cancelarPedido(token: string, pedidoId: string, chaveIdempotencia: string): Promise<PedidoMercadoPago>;
}

export function centavosParaValor(centavos: number): string {
  if (!Number.isSafeInteger(centavos) || centavos < 0) throw new Error('Valor inválido.');
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}

/** "50.00", "50.5", "50" ou 50.5 → centavos exatos; qualquer outra coisa → null (nunca arredonda). */
export function valorParaCentavos(valor: unknown): number | null {
  const texto = typeof valor === 'number' && Number.isFinite(valor) ? String(valor) : typeof valor === 'string' ? valor.trim() : '';
  const m = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(texto);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

const textoOuNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

export function corpoPedidoPix(p: PedidoPixEntrada): Record<string, unknown> {
  const valor = centavosParaValor(p.valorCentavos);
  return {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: valor,
    external_reference: p.referenciaExterna,
    // Sem expiration_time no nível da order: em modo automático ele vai no pagamento.
    transactions: { payments: [{ amount: valor, payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: p.expiracao }] },
    payer: { email: p.pagadorEmail, ...(p.pagadorPrimeiroNome ? { first_name: p.pagadorPrimeiroNome } : {}) },
  };
}

export function lerPedido(corpo: unknown): PedidoMercadoPago {
  const o = (corpo && typeof corpo === 'object' ? corpo : {}) as Record<string, any>;
  const id = textoOuNull(o.id);
  const status = textoOuNull(o.status);
  if (!id || !status || id.length > 64) throw new ErroProvedorMp('resposta_invalida');
  const pagamento = Array.isArray(o.transactions?.payments) ? o.transactions.payments[0] : undefined;
  const metodo = pagamento?.payment_method ?? {};
  const qrCode = textoOuNull(metodo.qr_code);
  const expiracao = textoOuNull(pagamento?.date_of_expiration);
  const expiraEm = expiracao ? new Date(expiracao) : null;
  return {
    id,
    status,
    statusDetail: textoOuNull(o.status_detail),
    referenciaExterna: textoOuNull(o.external_reference),
    totalCentavos: valorParaCentavos(o.total_amount),
    totalPagoCentavos: o.total_paid_amount === undefined || o.total_paid_amount === null ? null : valorParaCentavos(o.total_paid_amount),
    pix: qrCode ? { qrCode, qrCodeBase64: textoOuNull(metodo.qr_code_base64), ticketUrl: textoOuNull(metodo.ticket_url) } : null,
    expiraEm: expiraEm && !Number.isNaN(expiraEm.getTime()) ? expiraEm : null,
  };
}

function codigoDoErro(corpo: unknown): string | null {
  const o = (corpo && typeof corpo === 'object' ? corpo : {}) as Record<string, any>;
  const bruto = o.errors?.[0]?.code ?? o.code ?? o.error;
  return typeof bruto === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(bruto) ? bruto : null;
}

function falhaDoStatus(status: number, codigo: string | null): FalhaProvedor {
  if (status === 401 || status === 403) return 'credencial_invalida';
  if (status === 404) return 'nao_encontrado';
  if (status === 429) return 'limite';
  if (status === 409) {
    if (codigo === 'cannot_cancel_order') return 'nao_cancelavel';
    if (codigo === 'order_already_canceled') return 'ja_cancelado';
    if (codigo === 'idempotency_key_already_used') return 'idempotencia_conflito';
    return 'rejeitado';
  }
  if (status >= 500) return 'indisponivel';
  return 'rejeitado';
}

type Buscar = typeof fetch;

export function criarProvedorMercadoPago(opcoes: { buscar?: Buscar; baseUrl?: string; timeoutMs?: number } = {}): ProvedorMercadoPago {
  const buscar = opcoes.buscar ?? fetch;
  const base = opcoes.baseUrl ?? MERCADO_PAGO_BASE_URL;
  const timeoutMs = opcoes.timeoutMs ?? 10_000;

  async function chamar(metodo: 'GET' | 'POST', caminho: string, token: string, extras: { corpo?: unknown; chave?: string } = {}): Promise<unknown> {
    let res: Response;
    try {
      res = await buscar(`${base}${caminho}`, {
        method: metodo,
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(extras.corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(extras.chave ? { 'X-Idempotency-Key': extras.chave } : {}),
        },
        ...(extras.corpo === undefined ? {} : { body: JSON.stringify(extras.corpo) }),
      });
    } catch {
      // Timeout ou rede: a mensagem original não é repassada (pode citar cabeçalhos).
      throw new ErroProvedorMp('indisponivel');
    }
    let corpo: unknown = null;
    try { corpo = await res.json(); } catch { corpo = null; }
    if (res.ok) return corpo;
    const codigo = codigoDoErro(corpo);
    const segundos = Number(res.headers.get('retry-after'));
    throw new ErroProvedorMp(falhaDoStatus(res.status, codigo), res.status, codigo, Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : null);
  }

  const caminhoPedido = (id: string) => `/v1/orders/${encodeURIComponent(id)}`;

  return {
    async validarCredencial(token) {
      const corpo = (await chamar('GET', '/users/me', token)) as { id?: unknown } | null;
      const id = corpo?.id;
      return { contaProvedorId: typeof id === 'number' || typeof id === 'string' ? String(id).slice(0, 64) : null };
    },
    async criarPedidoPix(token, chave, pedido) {
      return lerPedido(await chamar('POST', '/v1/orders', token, { corpo: corpoPedidoPix(pedido), chave }));
    },
    async consultarPedido(token, pedidoId) {
      return lerPedido(await chamar('GET', caminhoPedido(pedidoId), token));
    },
    async cancelarPedido(token, pedidoId, chave) {
      return lerPedido(await chamar('POST', `${caminhoPedido(pedidoId)}/cancel`, token, { chave }));
    },
  };
}
