import { describe, expect, it } from 'vitest';
import { adicionarDias, avaliar, cobrancaDevida, criarAcessoLiberado, licencaDe, licencaPermiteVenda, temAcesso } from '../src';

describe('acesso liberado sem cobrança', () => {
  const inicio = new Date('2026-10-30T12:00:00Z');
  it('mantém acesso após 90 dias sem cartão ou cobrança devida', () => {
    const a = criarAcessoLiberado({ id: 'a', contaId: 'c', agora: inicio });
    const depois = adicionarDias(inicio, 90);
    expect(a).toMatchObject({ contaId: 'c', planoId: 'pro', status: 'liberada', cartao: null, proximaTentativaEm: null });
    expect(avaliar(a, depois)).toEqual(a);
    expect(temAcesso(a, depois)).toBe(true);
    expect(cobrancaDevida(a, depois)).toBeNull();
  });
  it('renova a licença com janela offline de sete dias sem vincular a mensalidade', () => {
    const a = criarAcessoLiberado({ id: 'a', contaId: 'c', agora: inicio });
    const depois = adicionarDias(inicio, 90);
    const l = licencaDe(a, depois);
    expect(l.validaAte).toEqual(adicionarDias(depois, 7));
    expect(l.emitidaEm).toEqual(depois);
    expect(licencaPermiteVenda(l, adicionarDias(depois, 7))).toEqual({ permitido: true });
    expect(licencaPermiteVenda(l, adicionarDias(depois, 8)).permitido).toBe(false);
    expect(licencaPermiteVenda(licencaDe(a, adicionarDias(depois, 8)), adicionarDias(depois, 8))).toEqual({ permitido: true });
  });
});
