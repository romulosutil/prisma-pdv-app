import { z } from 'zod';

export const PAPEIS = ['dono', 'gerente', 'operador'] as const;
export const PapelSchema = z.enum(PAPEIS);
export type Papel = z.infer<typeof PapelSchema>;
export const PERMISSOES = ['vender', 'movimentar_proprio_caixa', 'cadastrar_produto', 'cancelar_venda', 'retirar_dinheiro', 'conferir_caixas', 'administrar_equipe'] as const;
export const PermissaoSchema = z.enum(PERMISSOES);
export type Permissao = z.infer<typeof PermissaoSchema>;
export const PermissoesSchema = z.array(PermissaoSchema).refine(p => new Set(p).size === p.length, 'Permissões repetidas.');
export const permissoesDoPapel = (papel: Papel): Permissao[] => papel === 'dono' ? [...PERMISSOES] : papel === 'gerente'
  ? ['vender', 'movimentar_proprio_caixa', 'cadastrar_produto', 'cancelar_venda', 'retirar_dinheiro', 'conferir_caixas']
  : ['vender', 'movimentar_proprio_caixa'];
export function permissoesEfetivas(papel: Papel, permissoes: Permissao[] | null): Permissao[] {
  return papel === 'dono' ? permissoesDoPapel(papel) : (permissoes ?? permissoesDoPapel(papel)).filter(p => p !== 'administrar_equipe');
}
export const EstadoVinculoSchema = z.enum(['convidado', 'ativo', 'suspenso', 'desligado']);
export const VinculoSchema = z.object({
  operadorId: z.uuid(), usuarioId: z.uuid(), contaId: z.uuid(), lojaId: z.uuid(),
  nome: z.string(), email: z.email(), nomeLoja: z.string(), papel: PapelSchema,
  permissoes: PermissoesSchema, estado: EstadoVinculoSchema,
  conviteExpiraEm: z.iso.datetime().nullable(),
});
export type Vinculo = z.infer<typeof VinculoSchema>;
export const VinculosSchema = z.array(VinculoSchema);
export const ConvidarReqSchema = z.object({
  email: z.email(), nome: z.string().trim().min(1).max(150),
  papel: z.enum(['gerente', 'operador']), permissoes: PermissoesSchema.optional(),
}).strict();
export type ConvidarReq = z.infer<typeof ConvidarReqSchema>;
export const AlterarVinculoReqSchema = z.object({
  estado: z.enum(['ativo', 'suspenso', 'desligado']).optional(),
  papel: z.enum(['gerente', 'operador']).optional(), permissoes: PermissoesSchema.optional(),
}).strict().refine(v => Object.keys(v).length > 0, 'Informe a alteração.');
export type AlterarVinculoReq = z.infer<typeof AlterarVinculoReqSchema>;
export const ConsultarVinculosReqSchema = z.object({ email: z.email(), codigo: z.string().regex(/^\d{6}$/) }).strict();
