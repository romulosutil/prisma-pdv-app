import { describe, expect, it } from 'vitest';
import {
  ConfirmarRecuperacaoReqSchema,
  IniciarRecuperacaoReqSchema,
  RecuperacaoAparelhoSchema,
} from '../src';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const token = 'a'.repeat(43);
const desafio = {
  id: id(1), token, expiraEm: '2026-10-29T12:05:00.000Z',
  perfil: { contaId: id(2), lojaId: id(3), operadorId: id(4), email: 'ana@exemplo.com', nomeResponsavel: 'Ana', nomeLoja: 'Mercadinho real', papel: 'dono' },
  aparelhoNovoId: id(5), aparelhoNovoNome: 'Balcão novo',
  aparelhos: [{ id: id(6), nome: 'Balcão anterior', ultimoAcessoEm: '2026-10-28T12:00:00.000Z' }],
};
const confirmar = { id: id(1), token, aparelhoSubstituidoId: id(6), confirmar: true };

describe('contratos da recuperação de aparelho', () => {
  it('usa o mesmo pedido de login e conserva os campos da prova', () => {
    const req = { email: 'ana@exemplo.com', codigo: '123456', aparelhoId: id(5), aparelhoNome: 'Balcão novo' };
    expect(IniciarRecuperacaoReqSchema.parse(req)).toEqual(req);
    expect(IniciarRecuperacaoReqSchema.safeParse({ ...req, codigo: '12345' }).success).toBe(false);
  });

  it('aceita desafio restrito com perfil real e confirmação explícita', () => {
    expect(RecuperacaoAparelhoSchema.parse(desafio)).toEqual(desafio);
    expect(ConfirmarRecuperacaoReqSchema.parse(confirmar)).toEqual(confirmar);
  });

  it.each([false, undefined, 'true', 1])('recusa confirmação sem consentimento literal (%s)', (consentimento) => {
    expect(ConfirmarRecuperacaoReqSchema.safeParse({ ...confirmar, confirmar: consentimento }).success).toBe(false);
  });

  it.each(['', 'a'.repeat(42), 'a'.repeat(44), '/'.repeat(43)])('recusa segredo fora do formato43base64url', (segredo) => {
    expect(RecuperacaoAparelhoSchema.safeParse({ ...desafio, token: segredo }).success).toBe(false);
    expect(ConfirmarRecuperacaoReqSchema.safeParse({ ...confirmar, token: segredo }).success).toBe(false);
  });

  it('recusa lista vazia, IDs repetidos e o próprio aparelho novo como alvo', () => {
    expect(RecuperacaoAparelhoSchema.safeParse({ ...desafio, aparelhos: [] }).success).toBe(false);
    expect(RecuperacaoAparelhoSchema.safeParse({ ...desafio, aparelhos: [desafio.aparelhos[0], desafio.aparelhos[0]] }).success).toBe(false);
    expect(RecuperacaoAparelhoSchema.safeParse({ ...desafio, aparelhoNovoId: id(6) }).success).toBe(false);
  });

  it('recusa perfil sem dono, data inválida e campos de sessão fora do contrato', () => {
    expect(RecuperacaoAparelhoSchema.safeParse({ ...desafio, perfil: { ...desafio.perfil, papel: 'operador' } }).success).toBe(false);
    expect(RecuperacaoAparelhoSchema.safeParse({ ...desafio, expiraEm: 'amanhã' }).success).toBe(false);
    expect(RecuperacaoAparelhoSchema.safeParse({ ...desafio, sessao: { token: 'privado' } }).success).toBe(false);
    expect(ConfirmarRecuperacaoReqSchema.safeParse({ ...confirmar, contaId: id(8) }).success).toBe(false);
  });
});
