import { describe, expect, it } from 'vitest';
import { adicionarDias, aplicarDesconto, cancelar, cobrancaDevida, descricaoCobrancaPaywall, encontrarCupom, iniciarTeste, PLANOS, PLANOS_DISPONIVEIS, reativar, registrarCobrancaAprovada, registrarCobrancaRecusada, valorMensalAssinatura } from '../src';

const agora = new Date('2026-10-30T12:00:00Z');
const teste = (codigoCupom?: string) => iniciarTeste({ id: 'a', contaId: 'c', planoId: 'pro', agora, codigoCupom, cartao: { bandeira: 'visa', ultimos4: '4242', fingerprint: 'fp' } });

describe('oferta única e cupons', () => {
  it('oferece somente Pro por R$ 49,90', () => {
    expect(PLANOS_DISPONIVEIS.map((id) => [id, PLANOS[id].precoMensalCentavos])).toEqual([['pro', 4990]]);
  });
  it('normaliza o cupom e preserva sete dias sem cobrança', () => {
    const a = teste(' vitalicio50 ');
    expect(a.cupom).toEqual({ codigo: 'VITALICIO50', percentualDesconto: 50, duracao: 'vitalicio' });
    expect(a.testeTerminaEm).toEqual(adicionarDias(agora, 7));
    expect(cobrancaDevida(a, adicionarDias(agora, 6))).toBeNull();
    expect(cobrancaDevida(a, a.testeTerminaEm)).toEqual({ tipo: 'primeira', valorCentavos: 2495 });
  });
  it('mantém o desconto nas renovações e na reativação', () => {
    let a = teste('VITALICIO50');
    for (let i = 0; i < 24; i++) {
      a = registrarCobrancaAprovada(a, a.periodoAtualFim);
      expect(cobrancaDevida(a, a.periodoAtualFim)).toEqual({ tipo: 'renovacao', valorCentavos: 2495 });
    }
    a = reativar(cancelar(a, a.periodoAtualInicio), { planoId: 'pro', agora: adicionarDias(a.periodoAtualFim, 1) });
    expect(valorMensalAssinatura(a)).toBe(2495);
  });
  it('cobra o valor descontado em retentativas', () => {
    const a = teste('VITALICIO50');
    const recusada = registrarCobrancaRecusada(a, a.testeTerminaEm);
    expect(cobrancaDevida(recusada, adicionarDias(a.testeTerminaEm, 1))).toEqual({ tipo: 'retentativa', valorCentavos: 2495 });
  });
  it('cobra integral sem cupom e rejeita desconhecido', () => {
    expect(valorMensalAssinatura(teste())).toBe(4990);
    expect(teste().cupom).toBeNull();
    expect(() => teste('INVALIDO')).toThrow('Cupom inválido');
    expect(encontrarCupom('toString')).toBeNull();
    expect(aplicarDesconto(4990, encontrarCupom('VITALICIO50'))).toBe(2495);
  });
  it('o paywall mostra hoje zero e a mensalidade com desconto', () => {
    expect(descricaoCobrancaPaywall('pro', agora, encontrarCupom('VITALICIO50'))).toMatchObject({ hoje: 'R$ 0,00', texto: 'A partir de 06/11: R$ 24,95/mês' });
  });
});
