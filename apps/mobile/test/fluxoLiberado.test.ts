import { describe, expect, it } from 'vitest';
import { criarAcessoLiberado } from '@pdv/shared';
import { decidirRota } from '../src/nucleo/fluxo';
import { avisoDeAssinatura } from '../src/nucleo/avisosAssinatura';

const agora = new Date('2026-10-30T12:00:00Z');
const assinatura = criarAcessoLiberado({ id: 'a', contaId: 'c', agora });
const estado = { temConta: true, assinatura, agora };
describe('fluxo com acesso liberado', () => {
  it('abre PDV e permite configuração de recebimentos e câmera', () => {
    expect(decidirRota(estado, ['(tabs)'])).toBeNull();
    for (const tela of ['pagamentos', 'camera']) expect(decidirRota(estado, ['(onboarding)', tela])).toBeNull();
  });
  it('redireciona paywall e cartão sem oferecer cobrança', () => {
    for (const tela of ['planos', 'cartao', 'teste-iniciado']) expect(decidirRota(estado, ['(onboarding)', tela])).toBe('/');
    expect(decidirRota(estado, ['atualizar-cartao'])).toBe('/');
    expect(decidirRota(estado, ['bloqueio'])).toBe('/');
    expect(avisoDeAssinatura(assinatura, agora)).toBeNull();
  });
  it('conserva a exigência de conta e reautenticação', () => {
    expect(decidirRota({ ...estado, temConta: false }, ['(tabs)'])).toBe('/boas-vindas');
    expect(decidirRota({ ...estado, reautenticacaoNecessaria: true }, ['(tabs)'])).toBe('/entrar');
  });
});
