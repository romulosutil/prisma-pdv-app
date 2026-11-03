import { describe, expect, it } from 'vitest';
import { AlterarVinculoReqSchema, ConvidarReqSchema, PapelSchema, permissoesDoPapel, permissoesEfetivas } from '../src/equipe';

describe('contratos e política de equipe', () => {
  it('operador começa com venda/caixa próprios e gerente acrescenta consulta e gestão de produtos', () => {
    expect(permissoesDoPapel('operador')).toEqual(['vender', 'movimentar_proprio_caixa']);
    expect(permissoesDoPapel('gerente')).toContain('conferir_caixas');
    expect(permissoesDoPapel('gerente')).not.toContain('administrar_equipe');
    expect(permissoesEfetivas('gerente', [])).toEqual([]);
    expect(permissoesEfetivas('operador', ['administrar_equipe', 'cadastrar_produto'])).toEqual(['cadastrar_produto']);
    expect(permissoesEfetivas('dono', [])).toContain('administrar_equipe');
  });
  it('recusa convite de dono, permissões repetidas/desconhecidas e alteração vazia ou com campos de identidade', () => {
    const convite = { email: 'a@exemplo.com', nome: 'Ana', papel: 'operador' };
    expect(ConvidarReqSchema.safeParse(convite).success).toBe(true);
    for (const extras of [{ papel: 'dono' }, { permissoes: ['vender', 'vender'] }, { permissoes: ['root'] }, { contaId: 'outra' }]) expect(ConvidarReqSchema.safeParse({ ...convite, ...extras }).success).toBe(false);
    expect(AlterarVinculoReqSchema.safeParse({}).success).toBe(false);
    expect(AlterarVinculoReqSchema.safeParse({ estado: 'convidado' }).success).toBe(false);
    expect(AlterarVinculoReqSchema.safeParse({ usuarioId: 'outro' }).success).toBe(false);
    expect(PapelSchema.safeParse('gerente').success).toBe(true);
  });
});
