export interface Configuracao {
  ambiente: 'development' | 'test' | 'production';
  porta: number;
  databaseUrl: string | undefined;
  billingProvider: 'mock';
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

  const billingProvider = env.BILLING_PROVIDER ?? 'mock';
  if (billingProvider !== 'mock') {
    throw new Error('BILLING_PROVIDER não é suportado.');
  }
  if (ambiente === 'production') {
    throw new Error('Nenhum provedor de cobrança disponível é permitido em produção.');
  }

  return { ambiente, porta, databaseUrl, billingProvider };
}
