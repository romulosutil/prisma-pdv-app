import {
  GOOGLE_PLAY_PACOTE_PADRAO,
  GOOGLE_PLAY_SKU_PRO_PADRAO,
  type CredencialContaServicoGoogle,
} from './pagamentos/googlePlayBilling';

export interface Configuracao {
  ambiente: 'development' | 'test' | 'production';
  porta: number;
  databaseUrl: string | undefined;
  billingProvider: 'mock' | 'disabled' | 'google_play';
}

/** Valida as variáveis antes de abrir conexões ou iniciar serviços. */
export function validarConfiguracao(env: NodeJS.ProcessEnv): Configuracao {
  const ambiente = env.NODE_ENV ?? 'development';
  if (ambiente !== 'development' && ambiente !== 'test' && ambiente !== 'production') {
    throw new Error('NODE_ENV deve ser development, test ou production.');
  }

  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl === undefined && ambiente === 'production') {
    throw new Error('DATABASE_URL é obrigatória em produção.');
  }
  if (databaseUrl !== undefined) {
    try {
      const url = new URL(databaseUrl);
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) throw new Error();
    } catch {
      throw new Error('DATABASE_URL deve ser uma URL PostgreSQL válida.');
    }
  }

  const portaTexto = env.PORT ?? (ambiente === 'production' ? '' : '3333');
  const porta = Number(portaTexto);
  if (!/^\d+$/.test(portaTexto) || !Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error('PORT deve ser um inteiro entre 1 e 65535.');
  }

  const billingProvider = env.BILLING_PROVIDER ?? 'disabled';
  if (billingProvider !== 'mock' && billingProvider !== 'disabled' && billingProvider !== 'google_play') {
    throw new Error('BILLING_PROVIDER não é suportado.');
  }
  if (ambiente === 'production' && billingProvider === 'mock') {
    throw new Error('Nenhum provedor de cobrança disponível é permitido em produção.');
  }

  return { ambiente, porta, databaseUrl, billingProvider };
}

export interface ConfiguracaoPagamentos {
  /** `PDV_PAGAMENTOS_CHAVE`: base64 de 32 bytes. Ausente = rotas de pagamento respondem 503, sem impedir a partida. */
  chave: string | undefined;
  /** `PDV_MP_PAYER_EMAIL`: e-mail enviado como `payer.email` (o PDV não coleta e-mail do cliente). */
  pagadorEmail: string | undefined;
  sandboxTokenSha256?: string;
}

/** Separada de `validarConfiguracao` para não mudar o formato já conferido; mensagens nunca citam valores. */
export function lerConfiguracaoPagamentos(env: NodeJS.ProcessEnv): ConfiguracaoPagamentos {
  const chave = env.PDV_PAGAMENTOS_CHAVE?.trim() || undefined;
  if (chave !== undefined) {
    const bytes = /^[A-Za-z0-9+/]+={0,2}$/.test(chave) ? Buffer.from(chave, 'base64') : Buffer.alloc(0);
    if (bytes.length !== 32 || bytes.toString('base64') !== chave) throw new Error('PDV_PAGAMENTOS_CHAVE deve ser base64 de 32 bytes.');
  }
  const pagadorEmail = env.PDV_MP_PAYER_EMAIL?.trim() || undefined;
  if (pagadorEmail !== undefined && (pagadorEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pagadorEmail))) {
    throw new Error('PDV_MP_PAYER_EMAIL deve ser um e-mail válido.');
  }
  const sandboxTokenSha256 = env.PDV_MP_SANDBOX_TOKEN_SHA256?.trim().toLowerCase();
  if (!sandboxTokenSha256) return { chave, pagadorEmail };
  if (!/^[a-f0-9]{64}$/.test(sandboxTokenSha256)) {
    throw new Error('PDV_MP_SANDBOX_TOKEN_SHA256 deve ser um SHA256 hexadecimal.');
  }
  if (!chave || lerUrlPublicaApi(env) !== 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host') {
    throw new Error('O sandbox do Mercado Pago exige a chave de pagamentos e a URL pública de homologação.');
  }
  return { chave, pagadorEmail: 'test_payer@example.com', sandboxTokenSha256 };
}

export interface ConfiguracaoOAuthMercadoPago {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Assinatura secreta do webhook da aplicação da plataforma; sem ela, só a rota do webhook OAuth responde 503. */
  webhookSegredo: string | null;
  /** `PDV_MP_OAUTH_PKCE` (padrão ligado): precisa bater com a opção PKCE do painel da aplicação. */
  pkce: boolean;
  /** `PDV_MP_OAUTH_TEST_TOKEN=true`: credenciais de teste; recusado em produção. */
  testToken: boolean;
}

/**
 * OAuth do Mercado Pago (aplicação da plataforma). Os três primeiros nomes vão juntos: nenhum = OAuth desligado
 * (rotas 503 `oauth_indisponivel`); só parte deles, ou formato inválido, impede a partida. Mensagens nunca citam valores.
 */
function booleano(valor: string | undefined, nome: string, padrao: boolean): boolean {
  const v = valor?.trim().toLowerCase();
  if (!v) return padrao;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  throw new Error(`${nome} deve ser true ou false.`);
}

export function lerConfiguracaoOAuthMercadoPago(env: NodeJS.ProcessEnv): ConfiguracaoOAuthMercadoPago | null {
  const clientId = env.PDV_MP_CLIENT_ID?.trim() || undefined;
  const clientSecret = env.PDV_MP_CLIENT_SECRET?.trim() || undefined;
  const redirectUri = env.PDV_MP_REDIRECT_URI?.trim() || undefined;
  const webhookSegredo = env.PDV_MP_WEBHOOK_SECRET?.trim() || null;
  if (!clientId && !clientSecret && !redirectUri) {
    if (webhookSegredo) throw new Error('PDV_MP_WEBHOOK_SECRET exige PDV_MP_CLIENT_ID, PDV_MP_CLIENT_SECRET e PDV_MP_REDIRECT_URI.');
    return null;
  }
  if (!clientId || !clientSecret || !redirectUri) throw new Error('PDV_MP_CLIENT_ID, PDV_MP_CLIENT_SECRET e PDV_MP_REDIRECT_URI devem ser definidas juntas.');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(clientId)) throw new Error('PDV_MP_CLIENT_ID inválida.');
  if (clientSecret.length > 512 || /\s/.test(clientSecret)) throw new Error('PDV_MP_CLIENT_SECRET inválida.');
  if (webhookSegredo !== null && (webhookSegredo.length > 512 || /\s/.test(webhookSegredo))) throw new Error('PDV_MP_WEBHOOK_SECRET inválida.');
  let url: URL;
  try { url = new URL(redirectUri); } catch { throw new Error('PDV_MP_REDIRECT_URI deve ser uma URL https.'); }
  if (url.protocol !== 'https:' || url.search || url.hash) throw new Error('PDV_MP_REDIRECT_URI deve ser uma URL https, sem query nem fragmento.');
  const pkce = booleano(env.PDV_MP_OAUTH_PKCE, 'PDV_MP_OAUTH_PKCE', true);
  const testToken = booleano(env.PDV_MP_OAUTH_TEST_TOKEN, 'PDV_MP_OAUTH_TEST_TOKEN', false);
  if (testToken && (env.NODE_ENV ?? 'development') === 'production') throw new Error('PDV_MP_OAUTH_TEST_TOKEN não é permitido em produção.');
  return { clientId, clientSecret, redirectUri, webhookSegredo, pkce, testToken };
}

export function lerUrlPublicaApi(env: NodeJS.ProcessEnv): string | null {
  const raw = env.PDV_API_PUBLIC_URL?.trim();
  if (!raw) return null;
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('PDV_API_PUBLIC_URL deve ser uma URL válida.'); }
  const ambiente = env.NODE_ENV ?? 'development';
  if (ambiente === 'production' && url.protocol !== 'https:') {
    throw new Error('PDV_API_PUBLIC_URL deve usar https em produção.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('PDV_API_PUBLIC_URL deve usar http ou https.');
  }
  return url.toString().replace(/\/+$/, '');
}

export interface ConfiguracaoGooglePlay {
  packageName: string;
  skuProMensal: string;
  webhookToken: string | null;
  credencial: CredencialContaServicoGoogle | null;
}

export function lerConfiguracaoGooglePlay(env: NodeJS.ProcessEnv): ConfiguracaoGooglePlay {
  const packageName = env.PDV_PLAY_PACKAGE_NAME?.trim() || GOOGLE_PLAY_PACOTE_PADRAO;
  const skuProMensal = env.PDV_PLAY_SKU_PRO?.trim() || GOOGLE_PLAY_SKU_PRO_PADRAO;
  const webhookToken = env.PDV_PLAY_WEBHOOK_TOKEN?.trim() || null;

  let credencial: CredencialContaServicoGoogle | null = null;
  const jsonBruto = env.PDV_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonBruto) {
    let parsed: { client_email?: unknown; private_key?: unknown };
    try {
      parsed = JSON.parse(jsonBruto) as { client_email?: unknown; private_key?: unknown };
    } catch {
      throw new Error('PDV_PLAY_SERVICE_ACCOUNT_JSON deve ser um JSON válido.');
    }
    if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string' || !parsed.client_email || !parsed.private_key) {
      throw new Error('PDV_PLAY_SERVICE_ACCOUNT_JSON deve conter client_email e private_key.');
    }
    credencial = { clientEmail: parsed.client_email, privateKey: parsed.private_key.replace(/\\n/g, '\n') };
  } else {
    const email = env.PDV_PLAY_SERVICE_ACCOUNT_EMAIL?.trim();
    const key = env.PDV_PLAY_PRIVATE_KEY?.trim();
    if (email && key) {
      credencial = { clientEmail: email, privateKey: key.replace(/\\n/g, '\n') };
    }
  }

  return { packageName, skuProMensal, webhookToken, credencial };
}

export interface ConfiguracaoRevisorPlay {
  email: string;
  codigo: string;
}

/**
 * Credencial dedicada para revisão do Google Play (PIN reutilizável em ambiente de produção).
 * As duas variáveis precisam estar definidas juntas; nenhuma = recurso desligado. Mensagens nunca citam valores.
 */
export function lerConfiguracaoRevisorPlay(env: NodeJS.ProcessEnv): ConfiguracaoRevisorPlay | null {
  const email = env.PDV_PLAY_REVIEW_EMAIL?.trim().toLowerCase() || undefined;
  const codigo = env.PDV_PLAY_REVIEW_CODE?.trim() || undefined;
  if (!email && !codigo) return null;
  if (!email || !codigo) {
    throw new Error('PDV_PLAY_REVIEW_EMAIL e PDV_PLAY_REVIEW_CODE devem ser definidas juntas.');
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('PDV_PLAY_REVIEW_EMAIL deve ser um e-mail válido.');
  }
  if (!/^\d{6}$/.test(codigo)) {
    throw new Error('PDV_PLAY_REVIEW_CODE deve conter exatamente 6 dígitos numéricos.');
  }
  return { email, codigo };
}
