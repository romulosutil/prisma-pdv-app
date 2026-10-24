import { describe, expect, it } from 'vitest';
import {
  cancelar,
  desserializarLicenca,
  iniciarTeste,
  licencaDe,
  licencaPermiteVenda,
  OFFLINE_MAX_DIAS,
  PLANOS,
  registrarCobrancaAprovada,
  registrarCobrancaRecusada,
  serializarLicenca,
  type Assinatura,
} from '../src';

const INICIO = new Date('2026-10-23T12:00:00Z');
const DIA = 24 * 60 * 60 * 1000;

function ativa(): Assinatura {
  const teste = iniciarTeste({
    id: 'a',
    contaId: 'c',
    planoId: 'negocio',
    cartao: { bandeira: 'visa', ultimos4: '4242', fingerprint: 'fp' },
    agora: INICIO,
  });
  return registrarCobrancaAprovada(teste, teste.testeTerminaEm);
}

describe('licencaDe', () => {
  it('copia plano, limites e recursos e vale até o fim do período mais a carência', () => {
    const a = ativa();
    const l = licencaDe(a, a.periodoAtualInicio);
    expect(l.planoId).toBe('negocio');
    expect(l.status).toBe('ativa');
    expect(l.limites).toEqual(PLANOS.negocio.limites);
    expect(l.recursos).toEqual(PLANOS.negocio.recursos);
    expect(l.validaAte.toISOString()).toBe('2026-12-07T12:00:00.000Z'); // 30/11 + 7 dias
    expect(l.emitidaEm).toEqual(a.periodoAtualInicio);
  });

  it('não compartilha referências com o catálogo', () => {
    const l = licencaDe(ativa(), INICIO);
    l.recursos.push('fiado');
    expect(PLANOS.negocio.recursos).not.toContain('fiado');
  });

  it('inadimplente vale até a suspensão; cancelada, até o fim do acesso', () => {
    const a = ativa();
    const inad = registrarCobrancaRecusada(a, a.periodoAtualFim);
    expect(licencaDe(inad, a.periodoAtualFim).validaAte.toISOString()).toBe('2026-12-07T12:00:00.000Z');
    const cancelada = cancelar(a, a.periodoAtualInicio);
    expect(licencaDe(cancelada, a.periodoAtualInicio).validaAte).toEqual(a.periodoAtualFim);
  });

  it('avalia o tempo antes de emitir: inadimplente vencida sai suspensa', () => {
    const a = ativa();
    const inad = registrarCobrancaRecusada(a, a.periodoAtualFim);
    const l = licencaDe(inad, new Date(a.periodoAtualFim.getTime() + 7 * DIA));
    expect(l.status).toBe('suspensa');
    expect(licencaPermiteVenda(l, l.emitidaEm)).toEqual({ permitido: false, motivo: 'suspensa' });
  });
});

describe('licencaPermiteVenda', () => {
  it('permite vender offline por até 7 dias depois de emitida', () => {
    const l = licencaDe(ativa(), INICIO);
    expect(OFFLINE_MAX_DIAS).toBe(7);
    expect(licencaPermiteVenda(l, INICIO)).toEqual({ permitido: true });
    expect(licencaPermiteVenda(l, new Date(INICIO.getTime() + 7 * DIA))).toEqual({ permitido: true });
  });

  it('depois de 7 dias sem sincronizar, pede conexão', () => {
    const l = licencaDe(ativa(), INICIO);
    expect(licencaPermiteVenda(l, new Date(INICIO.getTime() + 7 * DIA + 1))).toEqual({
      permitido: false,
      motivo: 'precisa_sincronizar',
    });
  });

  it('licença vencida é expirada, mesmo recém-emitida', () => {
    const a = ativa();
    const l = licencaDe(cancelar(a, a.periodoAtualInicio), a.periodoAtualInicio);
    expect(licencaPermiteVenda(l, new Date(a.periodoAtualFim.getTime() + 1))).toEqual({ permitido: false, motivo: 'expirada' });
  });

  it('expirada tem prioridade sobre precisa_sincronizar', () => {
    const l = licencaDe(ativa(), INICIO);
    expect(licencaPermiteVenda(l, new Date(l.validaAte.getTime() + 1))).toEqual({ permitido: false, motivo: 'expirada' });
  });
});

describe('serialização da licença', () => {
  it('ida e volta via JSON', () => {
    const l = licencaDe(ativa(), INICIO);
    expect(desserializarLicenca(JSON.parse(JSON.stringify(serializarLicenca(l))))).toEqual(l);
  });
});
