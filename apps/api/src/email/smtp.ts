import nodemailer from 'nodemailer';
import { z } from 'zod';
import { ErroCanalEmail, lerMensagemCodigo, type CanalCodigo } from './contrato';

export interface ConfiguracaoSmtp {
  ambiente: 'development' | 'test' | 'production';
  host: string;
  porta: number;
  remetente: string;
  modo: 'starttls' | 'tls' | 'local';
  usuario?: string;
  senha?: string;
}

function validarConfiguracao(valor: unknown): ConfiguracaoSmtp {
  const schema = z.object({
    ambiente: z.enum(['development', 'test', 'production']),
    host: z.string().min(1).max(253).regex(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?|::1)$/),
    porta: z.number().int().min(1).max(65535),
    remetente: z.string().trim().toLowerCase().pipe(z.email()),
    modo: z.enum(['starttls', 'tls', 'local']),
    usuario: z.string().min(1).optional(),
    senha: z.string().min(1).optional(),
  }).strict();
  const resultado = schema.safeParse(valor);
  if (!resultado.success) throw new ErroCanalEmail('configuracao');
  const config = resultado.data;
  if (config.modo === 'local') {
    if (config.ambiente === 'production' || !['127.0.0.1', '::1'].includes(config.host)
      || config.usuario !== undefined || config.senha !== undefined) throw new ErroCanalEmail('configuracao');
  } else if (!config.usuario || !config.senha) throw new ErroCanalEmail('configuracao');
  return config;
}

export function lerConfiguracaoSmtp(env: NodeJS.ProcessEnv): ConfiguracaoSmtp {
  const porta = env.SMTP_PORT;
  return validarConfiguracao({
    ambiente: env.NODE_ENV ?? 'development', host: env.SMTP_HOST,
    porta: porta && /^\d+$/.test(porta) ? Number(porta) : NaN,
    remetente: env.SMTP_FROM, modo: env.SMTP_MODE,
    usuario: env.SMTP_USER, senha: env.SMTP_PASSWORD,
  });
}

function classificarErro(erro: unknown): 'temporario' | 'permanente' {
  if (typeof erro !== 'object' || erro === null) return 'temporario';
  const dados = erro as { code?: unknown; responseCode?: unknown; message?: unknown };
  const codigo = typeof dados.code === 'string' ? dados.code : '';
  if (codigo === 'EAUTH' || /CERT|TLS|SSL|SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER/.test(codigo)) return 'permanente';
  if (typeof dados.responseCode === 'number') {
    if (dados.responseCode >= 500) return 'permanente';
    if (dados.responseCode >= 400) return 'temporario';
  }
  // Nodemailer wraps some TLS errors as ESOCKET.
  if (typeof dados.message === 'string' && /certificate|self.signed|unable to verify|tls|ssl/i.test(dados.message)) return 'permanente';
  return 'temporario';
}

export function criarCanalSmtp(entrada: ConfiguracaoSmtp): CanalCodigo {
  const config = validarConfiguracao(entrada);
  const transporte = nodemailer.createTransport({
    host: config.host, port: config.porta, secure: config.modo === 'tls',
    requireTLS: config.modo === 'starttls', opportunisticTLS: false,
    ignoreTLS: config.modo === 'local',
    auth: config.modo === 'local' ? undefined : { user: config.usuario!, pass: config.senha! },
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    pool: false, logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
    dnsTimeout: 5000, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 5000,
  });
  return {
    async enviar(entradaMensagem) {
      const mensagem = lerMensagemCodigo(entradaMensagem);
      try {
        const resultado = await transporte.sendMail({
          from: config.remetente, to: mensagem.destinatario,
          envelope: { from: config.remetente, to: [mensagem.destinatario] },
          subject: 'Seu código de acesso Prisma PDV',
          text: `Seu código de acesso é ${mensagem.codigo}.\nEle expira em ${mensagem.expiraEm}.\nSe você não pediu este código, ignore esta mensagem.`,
          messageId: `<codigo-${mensagem.id}@${config.remetente.split('@')[1]}>`,
        });
        if (resultado.rejected.length !== 0 || !resultado.accepted.includes(mensagem.destinatario)) throw new ErroCanalEmail('permanente');
      } catch (erro) {
        if (erro instanceof ErroCanalEmail) throw erro;
        throw new ErroCanalEmail(classificarErro(erro));
      }
    },
  };
}
