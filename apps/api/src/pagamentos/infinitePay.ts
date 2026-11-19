/**
 * Cliente HTTP do Checkout Integrado da InfinitePay (Pix e cartão via link + `payment_check`).
 * Documentação consultada em 17/11/2026 (ver docs/pesquisa-pagamentos.md).
 * Regra de segurança: o webhook da InfinitePay não tem assinatura; toda confirmação
 * exige consulta `POST /payment_check` no servidor.
 */

export const INFINITEPAY_BASE_URL = 'https://api.checkout.infinitepay.io';
export const EXPIRACAO_INFINITEPAY_MS = 30 * 60 * 1000;

export interface PedidoInfinitePayEntrada {
  handle: string;
  apiKey: string | null;
  valorCentavos: number;
  referenciaExterna: string;
  descricao: string;
  webhookUrl: string | null;
  expiraEm: Date;
}

export interface LinkInfinitePay {
  url: string;
  slug: string | null;
  expiraEm: Date;
}

export interface VerificacaoInfinitePayEntrada {
  handle: string;
  apiKey: string | null;
  orderNsu: string;
  transactionNsu: string;
  slug: string;
}

export interface ResultadoVerificacaoInfinitePay {
  success: boolean;
  paid: boolean;
  amount: number | null;
  paidAmount: number | null;
  installments: number | null;
  captureMethod: string | null;
}

export type FalhaInfinitePay = 'credencial_invalida' | 'nao_encontrado' | 'limite' | 'rejeitado' | 'resposta_invalida' | 'indisponivel';

export class ErroProvedorInfinitePay extends Error {
  constructor(
    readonly tipo: FalhaInfinitePay,
    readonly status: number | null = null,
    readonly repetirEmMs: number | null = null,
  ) {
    super(`InfinitePay: ${tipo}${status === null ? '' : ` (HTTP ${status})`}`);
    this.name = 'ErroProvedorInfinitePay';
  }
}

export interface ProvedorInfinitePay {
  criarLinkCheckout(pedido: PedidoInfinitePayEntrada): Promise<LinkInfinitePay>;
  verificarPagamento(entrada: VerificacaoInfinitePayEntrada): Promise<ResultadoVerificacaoInfinitePay>;
}

function inteiroOuNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
}

function textoOuNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function slugDaUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const partes = u.pathname.split('/').filter(Boolean);
    return partes.at(-1) ?? null;
  } catch {
    return null;
  }
}

export function lerLinkInfinitePay(corpo: unknown, expiraEmPadrao: Date): LinkInfinitePay {
  const obj = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : null;
  const url = textoOuNull(obj?.url) ?? textoOuNull(obj?.checkout_url);
  if (!url || !/^https:\/\//i.test(url)) {
    throw new ErroProvedorInfinitePay('resposta_invalida');
  }
  const slug = textoOuNull(obj?.slug) ?? textoOuNull(obj?.invoice_slug) ?? slugDaUrl(url);
  return { url, slug, expiraEm: expiraEmPadrao };
}

export function lerVerificacaoInfinitePay(corpo: unknown): ResultadoVerificacaoInfinitePay {
  const obj = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : null;
  if (!obj) throw new ErroProvedorInfinitePay('resposta_invalida');
  const success = Boolean(obj.success ?? obj.paid ?? false);
  const paid = Boolean(obj.paid);
  return {
    success,
    paid,
    amount: inteiroOuNull(obj.amount),
    paidAmount: inteiroOuNull(obj.paid_amount),
    installments: inteiroOuNull(obj.installments),
    captureMethod: textoOuNull(obj.capture_method),
  };
}

export function criarProvedorInfinitePay(
  buscar: typeof fetch = fetch,
  baseUrl = INFINITEPAY_BASE_URL,
  timeoutMs = 10_000,
): ProvedorInfinitePay {
  async function chamar(caminho: string, apiKey: string | null, corpo: Record<string, unknown>): Promise<unknown> {
    const controle = new AbortController();
    const prazo = setTimeout(() => controle.abort(), timeoutMs);
    let res: Response;
    let texto: string;
    try {
      res = await buscar(`${baseUrl}${caminho}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
        },
        body: JSON.stringify(corpo),
        signal: controle.signal,
      });
      texto = await res.text();
    } catch {
      throw new ErroProvedorInfinitePay('indisponivel');
    } finally {
      clearTimeout(prazo);
    }

    if (res.status === 401 || res.status === 403) throw new ErroProvedorInfinitePay('credencial_invalida', res.status);
    if (res.status === 404) throw new ErroProvedorInfinitePay('nao_encontrado', res.status);
    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after'));
      const repetirEmMs = Number.isFinite(retry) && retry > 0 ? Math.min(3_600_000, retry * 1000) : null;
      throw new ErroProvedorInfinitePay('limite', res.status, repetirEmMs);
    }
    if (res.status >= 500) throw new ErroProvedorInfinitePay('indisponivel', res.status);

    let json: unknown;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      throw new ErroProvedorInfinitePay('resposta_invalida', res.status);
    }
    if (!res.ok) throw new ErroProvedorInfinitePay('rejeitado', res.status);
    return json;
  }

  return {
    async criarLinkCheckout(pedido) {
      const corpo: Record<string, unknown> = {
        handle: pedido.handle,
        items: [{ quantity: 1, price: pedido.valorCentavos, description: pedido.descricao }],
        order_nsu: pedido.referenciaExterna,
        ...(pedido.webhookUrl ? { webhook_url: pedido.webhookUrl } : {}),
        ...(pedido.apiKey ? { single_payment: true, valid_until: pedido.expiraEm.toISOString() } : {}),
      };
      const json = await chamar('/links', pedido.apiKey, corpo);
      return lerLinkInfinitePay(json, pedido.expiraEm);
    },

    async verificarPagamento(entrada) {
      const json = await chamar('/payment_check', entrada.apiKey, {
        handle: entrada.handle,
        order_nsu: entrada.orderNsu,
        transaction_nsu: entrada.transactionNsu,
        slug: entrada.slug,
      });
      return lerVerificacaoInfinitePay(json);
    },
  };
}
