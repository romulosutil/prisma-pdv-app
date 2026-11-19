import { createSign } from 'node:crypto';
import type { EstadoAssinaturaPlay } from '@pdv/shared';

export const GOOGLE_PLAY_PACOTE_PADRAO = 'br.com.pdv.mobile';
export const GOOGLE_PLAY_SKU_PRO_PADRAO = 'prisma_pro_mensal';
export const ANDROID_PUBLISHER_BASE_URL = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

export type EstadoConfirmacaoPlay =
  | 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
  | 'ACKNOWLEDGEMENT_STATE_PENDING'
  | 'ACKNOWLEDGEMENT_STATE_UNSPECIFIED';

export interface CompraAssinaturaPlay {
  subscriptionState: EstadoAssinaturaPlay;
  acknowledgementState: EstadoConfirmacaoPlay;
  startTime: Date | null;
  expiryTime: Date;
  autoRenewing: boolean;
  orderId: string | null;
  productId: string;
  emTesteGratis: boolean;
}

export interface VerificadorGooglePlay {
  consultarAssinatura(packageName: string, purchaseToken: string): Promise<CompraAssinaturaPlay>;
  confirmarAssinatura(packageName: string, productId: string, purchaseToken: string): Promise<void>;
}

export class ErroGooglePlay extends Error {
  constructor(
    readonly tipo: 'nao_configurado' | 'token_invalido' | 'indisponivel' | 'resposta_invalida',
    readonly status: number | null = null,
  ) {
    super(`Google Play Billing: ${tipo}${status === null ? '' : ` (HTTP ${status})`}`);
    this.name = 'ErroGooglePlay';
  }
}

export interface NotificacaoPlayRtdn {
  packageName: string;
  eventTimeMillis: number;
  purchaseToken: string | null;
  subscriptionId: string | null;
  notificationType: number | null;
  isTest: boolean;
}

export function decodificarRtdnPubSub(corpo: unknown): NotificacaoPlayRtdn | null {
  const obj = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : null;
  const msg = obj?.message && typeof obj.message === 'object' ? (obj.message as Record<string, unknown>) : null;
  const dataBase64 = typeof msg?.data === 'string' ? msg.data : null;
  if (!dataBase64) return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(dataBase64, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }

  const packageName = typeof payload.packageName === 'string' ? payload.packageName : '';
  const eventTimeMillis = Number(payload.eventTimeMillis ?? 0);
  if (!packageName || !Number.isFinite(eventTimeMillis)) return null;

  if (payload.testNotification && typeof payload.testNotification === 'object') {
    return { packageName, eventTimeMillis, purchaseToken: null, subscriptionId: null, notificationType: null, isTest: true };
  }

  const sub = payload.subscriptionNotification && typeof payload.subscriptionNotification === 'object'
    ? (payload.subscriptionNotification as Record<string, unknown>)
    : null;
  if (!sub || typeof sub.purchaseToken !== 'string' || typeof sub.subscriptionId !== 'string') return null;

  return {
    packageName,
    eventTimeMillis,
    purchaseToken: sub.purchaseToken,
    subscriptionId: sub.subscriptionId,
    notificationType: typeof sub.notificationType === 'number' ? sub.notificationType : null,
    isTest: false,
  };
}

export interface CredencialContaServicoGoogle {
  clientEmail: string;
  privateKey: string;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

async function obterAccessTokenServiceAccount(
  cred: CredencialContaServicoGoogle,
  buscar: typeof fetch,
  agoraMs: () => number,
): Promise<string> {
  const agoraSeg = Math.floor(agoraMs() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: cred.clientEmail,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: agoraSeg,
    exp: agoraSeg + 3600,
  }));
  const assinatura = createSign('RSA-SHA256').update(`${header}.${claim}`).sign(cred.privateKey, 'base64url');
  const jwt = `${header}.${claim}.${assinatura}`;

  const res = await buscar('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  if (!res.ok) throw new ErroGooglePlay('indisponivel', res.status);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new ErroGooglePlay('resposta_invalida');
  return json.access_token;
}

export function lerRespostaSubscriptionsV2(corpo: unknown): CompraAssinaturaPlay {
  const obj = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : null;
  if (!obj || typeof obj.subscriptionState !== 'string') {
    throw new ErroGooglePlay('resposta_invalida');
  }
  const itens = Array.isArray(obj.lineItems) ? (obj.lineItems as Record<string, unknown>[]) : [];
  const item = itens[0];
  if (!item || typeof item.expiryTime !== 'string' || typeof item.productId !== 'string') {
    throw new ErroGooglePlay('resposta_invalida');
  }
  const expiryTime = new Date(item.expiryTime);
  if (Number.isNaN(expiryTime.getTime())) throw new ErroGooglePlay('resposta_invalida');
  const startTime = typeof obj.startTime === 'string' ? new Date(obj.startTime) : null;
  const autoPlan = item.autoRenewingPlan && typeof item.autoRenewingPlan === 'object'
    ? (item.autoRenewingPlan as Record<string, unknown>)
    : null;
  const offer = item.offerDetails && typeof item.offerDetails === 'object'
    ? (item.offerDetails as Record<string, unknown>)
    : null;
  const tags = Array.isArray(offer?.offerTags) ? offer.offerTags.map(String) : [];

  return {
    subscriptionState: obj.subscriptionState as EstadoAssinaturaPlay,
    acknowledgementState: (typeof obj.acknowledgementState === 'string'
      ? obj.acknowledgementState
      : 'ACKNOWLEDGEMENT_STATE_UNSPECIFIED') as EstadoConfirmacaoPlay,
    startTime: startTime && !Number.isNaN(startTime.getTime()) ? startTime : null,
    expiryTime,
    autoRenewing: autoPlan?.autoRenewEnabled !== false,
    orderId: typeof obj.latestOrderId === 'string' ? obj.latestOrderId : null,
    productId: item.productId,
    emTesteGratis: tags.some((t) => /trial|gratis|free/i.test(t)) || typeof offer?.offerId === 'string',
  };
}

export function criarVerificadorGooglePlay(
  cred: CredencialContaServicoGoogle | null,
  buscar: typeof fetch = fetch,
  agoraMs: () => number = Date.now,
): VerificadorGooglePlay {
  let tokenCache: { token: string; expiraEmMs: number } | null = null;

  async function obterToken(): Promise<string> {
    if (!cred) throw new ErroGooglePlay('nao_configurado');
    if (tokenCache && agoraMs() < tokenCache.expiraEmMs - 60_000) return tokenCache.token;
    const token = await obterAccessTokenServiceAccount(cred, buscar, agoraMs);
    tokenCache = { token, expiraEmMs: agoraMs() + 3500_000 };
    return token;
  }

  return {
    async consultarAssinatura(packageName, purchaseToken) {
      const token = await obterToken();
      const url = `${ANDROID_PUBLISHER_BASE_URL}/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
      const res = await buscar(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      if (res.status === 400 || res.status === 404 || res.status === 410) throw new ErroGooglePlay('token_invalido', res.status);
      if (!res.ok) throw new ErroGooglePlay('indisponivel', res.status);
      return lerRespostaSubscriptionsV2(await res.json());
    },

    async confirmarAssinatura(packageName, productId, purchaseToken) {
      const token = await obterToken();
      const url = `${ANDROID_PUBLISHER_BASE_URL}/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
      const res = await buscar(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.status === 400 || res.status === 404) throw new ErroGooglePlay('token_invalido', res.status);
      if (!res.ok) throw new ErroGooglePlay('indisponivel', res.status);
    },
  };
}
