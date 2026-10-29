import { SessaoSchema, type Sessao } from '@pdv/shared';
import { z } from 'zod';

export const IdentidadeLocalSchema = SessaoSchema.omit({ token: true });
export type IdentidadeLocal = z.infer<typeof IdentidadeLocalSchema>;
export const PerfilLocalSchema = z.object({
  nomeResponsavel: z.string(), nomeLoja: z.string(), tipoLoja: z.string().optional(),
  email: z.string(), aparelhoNome: z.string(),
});
export type Perfil = z.infer<typeof PerfilLocalSchema>;

export interface EstadoConta {
  sessao: Sessao | null;
  identidade: IdentidadeLocal | null;
  perfil: Perfil | null;
  reautenticacaoNecessaria: boolean;
}

export const CONTA_VAZIA: EstadoConta = { sessao: null, identidade: null, perfil: null, reautenticacaoNecessaria: false };

/** Migra o formato anterior sem inventar uma credencial ou outra identidade. */
export function normalizarEstadoConta(valor: unknown): EstadoConta {
  const resultado = z.object({
    sessao: SessaoSchema.nullable(), perfil: PerfilLocalSchema.nullable(),
    identidade: IdentidadeLocalSchema.nullable().optional(), reautenticacaoNecessaria: z.boolean().optional(),
  }).safeParse(valor);
  if (!resultado.success) throw new Error('Dados da conta inválidos. Preserve os registros para recuperação.');
  const { sessao, perfil } = resultado.data;
  const identidade = resultado.data.identidade ?? (sessao ? IdentidadeLocalSchema.parse(sessao) : null);
  if (sessao && JSON.stringify(IdentidadeLocalSchema.parse(sessao)) !== JSON.stringify(identidade)) {
    throw new Error('Identidade da conta divergente. Preserve os registros para recuperação.');
  }
  return { sessao, identidade, perfil, reautenticacaoNecessaria: identidade !== null && (sessao === null || resultado.data.reautenticacaoNecessaria === true) };
}
