import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Cliente da Orders API do Mercado Pago (Pix), atrás de uma interface para os testes usarem o provedor simulado.
 * Documentação consultada em 18/11/2026 (ver docs/n2-pix-mercadopago.md). Nunca registra nem devolve o token:
 * as mensagens de erro carregam só o status HTTP e o código de erro do provedor.
 */

export const MERCADO_PAGO_BASE_URL = 'https://api.mercadopago.com';
/** Tela de autorização do OAuth (o lojista entra na própria conta do Mercado Pago e autoriza a aplicação da plataforma). */
export const MERCADO_PAGO_AUTORIZACAO_URL = 'https://auth.mercadopago.com/authorization';
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

export interface PedidoPointEntrada extends Pick<PedidoPixEntrada, 'valorCentavos' | 'referenciaExterna' | 'expiracao'> {
  terminalId: string;
  tipo: 'credit_card' | 'debit_card';
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
  point?: { terminalId: string | null; tipo: string | null };
}

export type FalhaProvedor =
  /** 401: token recusado (no OAuth, motivo para renovar uma vez). */
  | 'credencial_invalida'
  /** 403: sem permissão para o recurso; nunca dispara renovação. */
  | 'acesso_negado'
  | 'nao_encontrado'
  | 'nao_cancelavel'
  | 'ja_cancelado'
  | 'idempotencia_conflito'
  /** `invalid_grant` no `/oauth/token`: código ou refresh token recusado; exige nova autorização. */
  | 'concessao_invalida'
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

/** Credenciais da aplicação da plataforma (OAuth). O `clientSecret` nunca sai do servidor. */
export interface AplicacaoOAuth {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** PKCE ligado no painel da aplicação: depois de ligado, o Mercado Pago o exige. */
  pkce: boolean;
  /** `test_token: "true"` gera credenciais de teste (só fora de produção). */
  testToken: boolean;
}

/** Resposta do `/oauth/token`, já lida. `expiraEmSegundos` vem de `expires_in`. */
export interface TokensOAuth {
  accessToken: string;
  refreshToken: string | null;
  expiraEmSegundos: number | null;
  contaProvedorId: string | null;
  liveMode: boolean | null;
}

export interface ProvedorMercadoPago {
  /** `grant_type=authorization_code` com o `code_verifier` do PKCE. */
  trocarCodigo(app: AplicacaoOAuth, codigo: string, codeVerifier: string | null): Promise<TokensOAuth>;
  /** `grant_type=refresh_token`; o Mercado Pago devolve um refresh token novo (o antigo deixa de valer). */
  renovarToken(app: AplicacaoOAuth, refreshToken: string): Promise<TokensOAuth>;
  /** Consulta barata e autenticada para conferir o token ao conectar. */
  validarCredencial(token: string): Promise<{ contaProvedorId: string | null }>;
  criarPedidoPix(token: string, chaveIdempotencia: string, pedido: PedidoPixEntrada): Promise<PedidoMercadoPago>;
  criarPedidoPoint(token: string, chaveIdempotencia: string, pedido: PedidoPointEntrada): Promise<PedidoMercadoPago>;
  listarTerminaisPoint(token: string): Promise<{ id: string }[]>;
  consultarPedido(token: string, pedidoId: string): Promise<PedidoMercadoPago>;
  cancelarPedido(token: string, pedidoId: string, chaveIdempotencia: string, noTerminal?: boolean): Promise<PedidoMercadoPago>;
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
  const pagamentos = Array.isArray(o.transactions?.payments) ? o.transactions.payments : [];
  const pagamento = pagamentos[0];
  const metodo = pagamento?.payment_method ?? {};
  const point = o.type === 'point';
  const qrCode = textoOuNull(metodo.qr_code);
  const expiracao = textoOuNull(pagamento?.date_of_expiration);
  const expiraEm = expiracao ? new Date(expiracao) : null;
  return {
    id,
    status,
    statusDetail: textoOuNull(o.status_detail),
    referenciaExterna: textoOuNull(o.external_reference),
    totalCentavos: valorParaCentavos(o.total_amount ?? (point ? pagamento?.amount : null)),
    totalPagoCentavos: valorParaCentavos(point && pagamentos.length !== 1 ? null : o.total_paid_amount ?? (point ? pagamento?.paid_amount : null)),
    pix: qrCode ? { qrCode, qrCodeBase64: textoOuNull(metodo.qr_code_base64), ticketUrl: textoOuNull(metodo.ticket_url) } : null,
    expiraEm: expiraEm && !Number.isNaN(expiraEm.getTime()) ? expiraEm : null,
    ...(point ? { point: { terminalId: textoOuNull(o.config?.point?.terminal_id), tipo: textoOuNull(metodo.type) } } : {}),
  };
}

/** `/oauth/token` responde `{ error: "invalid_grant" }`; a Orders API, `{ errors: [{ code }] }`. */
function codigoDoErro(corpo: unknown, preferirError = false): string | null {
  const o = (corpo && typeof corpo === 'object' ? corpo : {}) as Record<string, any>;
  const error = typeof o.error === 'string' ? o.error : undefined;
  const bruto = error === 'invalid_grant' ? error : preferirError ? (error ?? o.errors?.[0]?.code ?? o.code) : (o.errors?.[0]?.code ?? o.code ?? error);
  return typeof bruto === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(bruto) ? bruto : null;
}

function falhaDoStatus(status: number, codigo: string | null): FalhaProvedor {
  if (codigo === 'invalid_grant') return 'concessao_invalida';
  if (status === 401) return 'credencial_invalida';
  if (status === 403) return 'acesso_negado';
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

export function lerTokens(corpo: unknown): TokensOAuth {
  const o = (corpo && typeof corpo === 'object' ? corpo : {}) as Record<string, any>;
  const accessToken = textoOuNull(o.access_token);
  if (!accessToken || accessToken.length > 2048) throw new ErroProvedorMp('resposta_invalida');
  const expira = Number(o.expires_in);
  const usuario = o.user_id;
  return {
    accessToken,
    refreshToken: textoOuNull(o.refresh_token),
    expiraEmSegundos: Number.isFinite(expira) && expira > 0 ? Math.floor(expira) : null,
    contaProvedorId: typeof usuario === 'number' || typeof usuario === 'string' ? String(usuario).slice(0, 64) : null,
    liveMode: typeof o.live_mode === 'boolean' ? o.live_mode : null,
  };
}

/** PKCE S256: `code_challenge = base64url(sha256(code_verifier))`. */
export function desafioPkce(verificador: string): string {
  return createHash('sha256').update(verificador, 'ascii').digest('base64url');
}

/** Sem parâmetro de escopo (o Mercado Pago concede `read write offline_access`); dados extras só dentro do `state`. */
export function urlAutorizacao(app: Pick<AplicacaoOAuth, 'clientId' | 'redirectUri'>, estado: string, verificador: string | null): string {
  const url = new URL(MERCADO_PAGO_AUTORIZACAO_URL);
  url.search = new URLSearchParams({
    client_id: app.clientId,
    response_type: 'code',
    platform_id: 'mp',
    state: estado,
    redirect_uri: app.redirectUri,
    ...(verificador ? { code_challenge: desafioPkce(verificador), code_challenge_method: 'S256' } : {}),
  }).toString();
  return url.toString();
}

type Buscar = typeof fetch;

export function criarProvedorMercadoPago(opcoes: { buscar?: Buscar; baseUrl?: string; timeoutMs?: number; sandboxTokenSha256?: string } = {}): ProvedorMercadoPago {
  const buscar = opcoes.buscar ?? fetch;
  const base = opcoes.baseUrl ?? MERCADO_PAGO_BASE_URL;
  const timeoutMs = opcoes.timeoutMs ?? 10_000;
  const sandboxToken = opcoes.sandboxTokenSha256 ? Buffer.from(opcoes.sandboxTokenSha256, 'hex') : null;

  async function chamar(metodo: 'GET' | 'POST', caminho: string, token: string, extras: { corpo?: unknown; chave?: string; cancelarNoTerminal?: boolean } = {}): Promise<unknown> {
    if (sandboxToken && (sandboxToken.length !== 32 || !timingSafeEqual(sandboxToken, createHash('sha256').update(token).digest()))) {
      throw new ErroProvedorMp('credencial_invalida');
    }
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
          ...(extras.cancelarNoTerminal ? { 'X-Allow-Cancelable-Status': 'at_terminal' } : {}),
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

  /** `/oauth/token` não usa Bearer: as credenciais da aplicação vão no corpo. */
  async function pedirToken(corpo: Record<string, string>): Promise<TokensOAuth> {
    if (sandboxToken) throw new ErroProvedorMp('acesso_negado');
    let res: Response;
    try {
      res = await buscar(`${base}/oauth/token`, {
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
    } catch {
      throw new ErroProvedorMp('indisponivel');
    }
    let resposta: unknown = null;
    try { resposta = await res.json(); } catch { resposta = null; }
    if (res.ok) return lerTokens(resposta);
    const codigo = codigoDoErro(resposta, true);
    throw new ErroProvedorMp(falhaDoStatus(res.status, codigo), res.status, codigo);
  }

  return {
    async trocarCodigo(app, codigo, codeVerifier) {
      return pedirToken({
        client_id: app.clientId, client_secret: app.clientSecret, grant_type: 'authorization_code', code: codigo, redirect_uri: app.redirectUri,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}), test_token: app.testToken ? 'true' : 'false',
      });
    },
    async renovarToken(app, refreshToken) {
      return pedirToken({ client_id: app.clientId, client_secret: app.clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken });
    },
    async validarCredencial(token) {
      const corpo = (await chamar('GET', '/users/me', token)) as { id?: unknown } | null;
      const id = corpo?.id;
      return { contaProvedorId: typeof id === 'number' || typeof id === 'string' ? String(id).slice(0, 64) : null };
    },
    async criarPedidoPix(token, chave, pedido) {
      return lerPedido(await chamar('POST', '/v1/orders', token, { corpo: corpoPedidoPix(pedido), chave }));
    },
    async criarPedidoPoint(token, chave, pedido) {
      return lerPedido(await chamar('POST', '/v1/orders', token, { chave, corpo: {
        type: 'point', external_reference: pedido.referenciaExterna, expiration_time: pedido.expiracao,
        transactions: { payments: [{ amount: centavosParaValor(pedido.valorCentavos) }] },
        config: { point: { terminal_id: pedido.terminalId }, payment_method: { default_type: pedido.tipo } },
      } }));
    },
    async listarTerminaisPoint(token) {
      const terminais = new Set<string>();
      const limite = 50;
      let offset = 0;
      let total: number;
      do {
        const pagina = await chamar('GET', `/terminals/v1/list?limit=${limite}&offset=${offset}`, token) as {
          data?: { terminals?: { id?: unknown; operating_mode?: unknown }[] }; paging?: { total?: number };
        } | null;
        const itens = pagina?.data?.terminals;
        if (!Array.isArray(itens)) throw new ErroProvedorMp('resposta_invalida');
        for (const item of itens) {
          if (item?.operating_mode === 'PDV' && typeof item.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(item.id)) terminais.add(item.id);
        }
        offset += itens.length;
        total = pagina?.paging?.total ?? offset;
        if (itens.length === 0) break;
      } while (offset < total);
      return [...terminais].map((id) => ({ id }));
    },
    async consultarPedido(token, pedidoId) {
      return lerPedido(await chamar('GET', caminhoPedido(pedidoId), token));
    },
    async cancelarPedido(token, pedidoId, chave, cancelarNoTerminal) {
      return lerPedido(await chamar('POST', `${caminhoPedido(pedidoId)}/cancel`, token, { chave, cancelarNoTerminal }));
    },
  };
}
