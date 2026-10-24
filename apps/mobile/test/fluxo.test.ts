import { cancelar, iniciarTeste, registrarCobrancaRecusada, type Assinatura } from '@pdv/shared';
import { describe, expect, it } from 'vitest';
import { avisoDeAssinatura } from '@/nucleo/avisosAssinatura';
import { decidirRota } from '@/nucleo/fluxo';

const agora = new Date('2026-10-23T15:00:00.000Z');
const cartao = { bandeira: 'visa' as const, ultimos4: '4242', fingerprint: 'fp' };
const teste = (): Assinatura => iniciarTeste({ id: 'a', contaId: 'c', planoId: 'negocio', cartao, agora });
const dias = (n: number) => new Date(agora.getTime() + n * 86_400_000);

describe('decidirRota', () => {
  it('sem conta, só o começo do onboarding', () => {
    const estado = { temConta: false, assinatura: null, agora };
    expect(decidirRota(estado, ['(onboarding)', 'boas-vindas'])).toBeNull();
    expect(decidirRota(estado, ['(onboarding)', 'loja'])).toBeNull();
    expect(decidirRota(estado, ['(tabs)'])).toBe('/boas-vindas');
    expect(decidirRota(estado, ['(onboarding)', 'planos'])).toBe('/boas-vindas');
  });

  it('com conta e sem assinatura, vai para o paywall', () => {
    const estado = { temConta: true, assinatura: null, agora };
    expect(decidirRota(estado, ['(onboarding)', 'planos'])).toBeNull();
    expect(decidirRota(estado, ['(onboarding)', 'cartao'])).toBeNull();
    expect(decidirRota(estado, ['(tabs)'])).toBe('/planos');
    expect(decidirRota(estado, ['(onboarding)', 'boas-vindas'])).toBe('/planos');
  });

  it('com acesso, libera as abas e as telas logo após assinar', () => {
    const estado = { temConta: true, assinatura: teste(), agora };
    expect(decidirRota(estado, ['(tabs)'])).toBeNull();
    expect(decidirRota(estado, ['vender'])).toBeNull();
    expect(decidirRota(estado, ['atualizar-cartao'])).toBeNull();
    expect(decidirRota(estado, ['(onboarding)', 'teste-iniciado'])).toBeNull();
    expect(decidirRota(estado, ['(onboarding)', 'camera'])).toBeNull();
    expect(decidirRota(estado, ['(onboarding)', 'planos'])).toBe('/');
    expect(decidirRota(estado, ['bloqueio'])).toBe('/');
  });

  it('inadimplente ainda usa o app; suspensa vai para o bloqueio', () => {
    const inadimplente = registrarCobrancaRecusada(teste(), dias(7));
    expect(decidirRota({ temConta: true, assinatura: inadimplente, agora: dias(8) }, ['(tabs)'])).toBeNull();
    const suspensa: Assinatura = { ...inadimplente, status: 'suspensa' };
    expect(decidirRota({ temConta: true, assinatura: suspensa, agora: dias(15) }, ['(tabs)'])).toBe('/bloqueio');
    expect(decidirRota({ temConta: true, assinatura: suspensa, agora: dias(15) }, ['atualizar-cartao'])).toBeNull();
  });

  it('cancelada tem acesso até o fim e depois cai no bloqueio', () => {
    const cancelada = cancelar(teste(), dias(1));
    expect(decidirRota({ temConta: true, assinatura: cancelada, agora: dias(3) }, ['(tabs)'])).toBeNull();
    expect(decidirRota({ temConta: true, assinatura: cancelada, agora: dias(8) }, ['(tabs)'])).toBe('/bloqueio');
  });
});

describe('avisoDeAssinatura', () => {
  it('avisa do fim do teste só nos últimos 2 dias', () => {
    expect(avisoDeAssinatura(teste(), dias(3))).toBeNull();
    expect(avisoDeAssinatura(teste(), dias(5))).toMatchObject({
      tipo: 'info',
      texto: 'Seu teste termina em 2 dias. Em 30/10 cobraremos R$ 34,90.',
    });
    expect(avisoDeAssinatura(teste(), dias(6))?.texto).toContain('termina em 1 dia.');
  });

  it('avisa de cobrança que falhou, com ação de atualizar o cartão', () => {
    const inadimplente = registrarCobrancaRecusada(teste(), dias(7));
    expect(avisoDeAssinatura(inadimplente, dias(8))).toMatchObject({
      tipo: 'erro',
      texto: 'Não conseguimos cobrar seu cartão. Atualize para continuar vendendo.',
      acao: { destino: '/atualizar-cartao' },
    });
  });

  it('avisa do fim do acesso quando cancelada', () => {
    expect(avisoDeAssinatura(cancelar(teste(), dias(1)), dias(2))).toMatchObject({ tipo: 'atencao', acao: { rotulo: 'Reativar' } });
  });
});
