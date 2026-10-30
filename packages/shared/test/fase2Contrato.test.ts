import { describe, expect, it } from 'vitest';
import { VendaSchema } from '../src/contrato';

const id = '00000000-0000-4000-8000-000000000001';
const base = { id, lojaId: id, aparelhoId: id, operadorId: id, itens: [], pagamentos: [], totalCentavos: 0, status: 'concluida', criadaEm: '2026-10-30T12:00:00.000Z' };
describe('vínculo e auditoria compatíveis com legado', () => {
  it('não inventa vínculo ou evento no legado', () => {
    expect(VendaSchema.parse(base)).toEqual(base);
  });
  it('preserva vínculo e evento comercial explícitos', () => {
    const dados = { ...base, caixaId: id, status: 'cancelada', cancelamento: { id, em: base.criadaEm, operadorId: id, motivo: 'Erro no registro', estorno: 'nao_realizado' } };
    expect(VendaSchema.parse(dados)).toEqual(dados);
  });
  it('recusa vínculo inválido e alegação de estorno real', () => {
    expect(VendaSchema.safeParse({ ...base, caixaId: 'invalido' }).success).toBe(false);
    expect(VendaSchema.safeParse({ ...base, cancelamento: { id, em: base.criadaEm, operadorId: id, motivo: 'Erro', estorno: 'realizado' } }).success).toBe(false);
  });
});
