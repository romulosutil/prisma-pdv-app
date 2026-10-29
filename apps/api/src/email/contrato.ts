import { z } from 'zod';

export const MensagemCodigoSchema = z.object({
  id: z.uuid(),
  codigoId: z.uuid(),
  destinatario: z.string().trim().toLowerCase().pipe(z.email()),
  codigo: z.string().regex(/^\d{6}$/),
  expiraEm: z.iso.datetime().transform(valor => new Date(valor).toISOString()),
}).strict();

export type MensagemCodigo = z.infer<typeof MensagemCodigoSchema>;

export interface CanalCodigo {
  /** Resolve quando o servidor SMTP aceita, sem garantir entrega na caixa de entrada. */
  enviar(mensagem: MensagemCodigo): Promise<void>;
}

const MENSAGENS = {
  configuracao: 'Configuração do canal de e-mail inválida.',
  mensagem_invalida: 'Mensagem de código inválida.',
  temporario: 'O canal de e-mail está temporariamente indisponível.',
  permanente: 'O canal de e-mail recusou a operação.',
} as const;

export type TipoErroCanalEmail = keyof typeof MENSAGENS;

export class ErroCanalEmail extends Error {
  constructor(readonly tipo: TipoErroCanalEmail) {
    super(MENSAGENS[tipo]);
    this.name = 'ErroCanalEmail';
  }
}

/** Não deixa erros Zod com payload sensível atravessarem a fronteira do canal. */
export function lerMensagemCodigo(entrada: unknown): MensagemCodigo {
  const resultado = MensagemCodigoSchema.safeParse(entrada);
  if (!resultado.success) throw new ErroCanalEmail('mensagem_invalida');
  return resultado.data;
}
