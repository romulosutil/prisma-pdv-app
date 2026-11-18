export interface Configuracao {
  ambiente: 'development' | 'test' | 'production';
  porta: number;
  databaseUrl: string | undefined;
  billingProvider: 'mock' | 'disabled';
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
  if (billingProvider !== 'mock' && billingProvider !== 'disabled') {
    throw new Error('BILLING_PROVIDER não é suportado.');
  }
  if (ambiente === 'production' && billingProvider !== 'disabled') {
    throw new Error('Nenhum provedor de cobrança disponível é permitido em produção.');
  }

  return { ambiente, porta, databaseUrl, billingProvider };
}

export interface ConfiguracaoPagamentos {
  /** `PDV_PAGAMENTOS_CHAVE`: base64 de 32 bytes. Ausente = rotas de pagamento respondem 503, sem impedir a partida. */
  chave: string | undefined;
  /** `PDV_MP_PAYER_EMAIL`: e-mail enviado como `payer.email` (o PDV não coleta e-mail do cliente). */
  pagadorEmail: string | undefined;
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
  return { chave, pagadorEmail };
}
