import { describe, expect, it } from 'vitest';
import {
  atualizarCartao,
  avaliar,
  calcularProrata,
  cancelar,
  cobrancaDevida,
  desserializarAssinatura,
  descricaoCobrancaPaywall,
  deveLembrarFimTeste,
  diasRestantesTeste,
  ErroTransicao,
  iniciarTeste,
  podeAbrirVenda,
  reativar,
  registrarCobrancaAprovada,
  registrarCobrancaRecusada,
  RelogioFalso,
  serializarAssinatura,
  temAcesso,
  trocarPlano,
  type Assinatura,
  type CartaoSalvo,
  type PlanoId,
} from '../src';

const INICIO = new Date('2026-10-23T12:00:00Z');
const CARTAO: CartaoSalvo = { bandeira: 'visa', ultimos4: '4242', fingerprint: 'fp_visa_4242' };

function novoTeste(planoId: PlanoId = 'negocio', agora: Date = INICIO): Assinatura {
  return iniciarTeste({ id: 'ass-1', contaId: 'conta-1', planoId, cartao: CARTAO, agora });
}

function ativaDesdeOTeste(planoId: PlanoId = 'negocio'): Assinatura {
  const a = novoTeste(planoId);
  return registrarCobrancaAprovada(a, a.testeTerminaEm);
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

describe('iniciarTeste', () => {
  it('começa em teste por 7 dias, com acesso e sem cobrança devida', () => {
    const a = novoTeste();
    expect(a.status).toBe('em_teste');
    expect(iso(a.testeTerminaEm)).toBe('2026-10-30T12:00:00.000Z');
    expect(temAcesso(a, INICIO)).toBe(true);
    expect(cobrancaDevida(a, INICIO)).toBeNull();
    expect(diasRestantesTeste(a, INICIO)).toBe(7);
  });

  it('descricaoCobrancaPaywall mostra a data real da primeira cobrança', () => {
    expect(descricaoCobrancaPaywall('negocio', INICIO)).toEqual({
      hoje: 'R$ 0,00',
      dataPrimeiraCobranca: new Date('2026-10-30T12:00:00Z'),
      texto: 'A partir de 30/10: R$ 34,90/mês',
    });
    expect(descricaoCobrancaPaywall('essencial', INICIO).texto).toBe('A partir de 30/10: R$ 19,90/mês');
  });
});

describe('ciclo completo da assinatura', () => {
  it('teste -> lembrete -> primeira cobrança -> renovação -> dunning -> suspensa -> pagamento', () => {
    const relogio = new RelogioFalso(INICIO);
    let a = novoTeste('negocio', relogio.agora());

    // D4: ainda sem lembrete. D5: faltam 2 dias.
    relogio.avancarDias(4);
    expect(deveLembrarFimTeste(a, relogio.agora())).toBe(false);
    relogio.avancarDias(1);
    expect(deveLembrarFimTeste(a, relogio.agora())).toBe(true);
    expect(diasRestantesTeste(a, relogio.agora())).toBe(2);
    expect(cobrancaDevida(a, relogio.agora())).toBeNull();

    // D7: primeira cobrança, aprovada.
    relogio.avancarDias(2);
    expect(deveLembrarFimTeste(a, relogio.agora())).toBe(false);
    expect(cobrancaDevida(a, relogio.agora())).toEqual({ tipo: 'primeira', valorCentavos: 3490 });
    a = registrarCobrancaAprovada(a, relogio.agora());
    expect(a.status).toBe('ativa');
    expect(iso(a.periodoAtualInicio)).toBe('2026-10-30T12:00:00.000Z');
    expect(iso(a.periodoAtualFim)).toBe('2026-11-30T12:00:00.000Z');
    expect(cobrancaDevida(a, relogio.agora())).toBeNull();

    // Renovação do mês seguinte.
    relogio.definir(a.periodoAtualFim);
    expect(cobrancaDevida(a, relogio.agora())).toEqual({ tipo: 'renovacao', valorCentavos: 3490 });
    a = registrarCobrancaAprovada(a, relogio.agora());
    expect(iso(a.periodoAtualFim)).toBe('2026-12-30T12:00:00.000Z');

    // Nova renovação é recusada: inadimplente, app segue funcionando.
    relogio.definir(a.periodoAtualFim);
    a = registrarCobrancaRecusada(a, relogio.agora());
    const falhouEm = relogio.agora();
    expect(a.status).toBe('inadimplente');
    expect(a.tentativasFalhas).toBe(1);
    expect(iso(a.proximaTentativaEm)).toBe('2026-12-31T12:00:00.000Z');
    expect(temAcesso(a, relogio.agora())).toBe(true);
    expect(cobrancaDevida(a, relogio.agora())).toBeNull();

    // D+1: retentativa recusada.
    relogio.avancarDias(1);
    expect(cobrancaDevida(a, relogio.agora())).toEqual({ tipo: 'retentativa', valorCentavos: 3490 });
    a = registrarCobrancaRecusada(a, relogio.agora());
    expect(a.tentativasFalhas).toBe(2);
    expect(a.inadimplenteDesde).toEqual(falhouEm);
    expect(iso(a.proximaTentativaEm)).toBe('2027-01-02T12:00:00.000Z'); // D+3

    // D+3: recusada de novo.
    relogio.avancarDias(2);
    expect(cobrancaDevida(a, relogio.agora())).toEqual({ tipo: 'retentativa', valorCentavos: 3490 });
    a = registrarCobrancaRecusada(a, relogio.agora());
    expect(iso(a.proximaTentativaEm)).toBe('2027-01-04T12:00:00.000Z'); // D+5

    // D+5: última tentativa, recusada. Não há mais agendamento.
    relogio.avancarDias(2);
    a = registrarCobrancaRecusada(a, relogio.agora());
    expect(a.tentativasFalhas).toBe(4);
    expect(a.proximaTentativaEm).toBeNull();
    expect(avaliar(a, relogio.agora()).status).toBe('inadimplente');

    // D+6: ainda no prazo. D+7: suspensa.
    relogio.avancarDias(1);
    expect(avaliar(a, relogio.agora()).status).toBe('inadimplente');
    relogio.avancarDias(1);
    a = avaliar(a, relogio.agora());
    expect(a.status).toBe('suspensa');
    expect(temAcesso(a, relogio.agora())).toBe(false);
    expect(podeAbrirVenda(a, relogio.agora())).toBe(false);
    expect(cobrancaDevida(a, relogio.agora())).toBeNull();

    // O usuário atualiza o cartão e paga: volta a ativa com período novo.
    const pagoEm = relogio.agora();
    a = registrarCobrancaAprovada(atualizarCartao(a, { ...CARTAO, ultimos4: '0005' }), pagoEm);
    expect(a.status).toBe('ativa');
    expect(a.cartao?.ultimos4).toBe('0005');
    expect(a.tentativasFalhas).toBe(0);
    expect(a.inadimplenteDesde).toBeNull();
    expect(a.proximaTentativaEm).toBeNull();
    expect(iso(a.periodoAtualInicio)).toBe(pagoEm.toISOString());
    expect(iso(a.periodoAtualFim)).toBe('2027-02-06T12:00:00.000Z');
    expect(temAcesso(a, pagoEm)).toBe(true);
  });

  it('retentativa aprovada mantém a ancoragem do período em atraso', () => {
    let a = ativaDesdeOTeste();
    const vencimento = a.periodoAtualFim; // 30/11
    a = registrarCobrancaRecusada(a, vencimento);
    const aprovadaEm = new Date('2026-12-03T12:00:00Z');
    a = registrarCobrancaAprovada(a, aprovadaEm);
    expect(a.status).toBe('ativa');
    expect(iso(a.periodoAtualInicio)).toBe('2026-11-30T12:00:00.000Z');
    expect(iso(a.periodoAtualFim)).toBe('2026-12-30T12:00:00.000Z');
  });

  it('primeira cobrança recusada também entra no dunning', () => {
    const a0 = novoTeste();
    const a = registrarCobrancaRecusada(a0, a0.testeTerminaEm);
    expect(a.status).toBe('inadimplente');
    expect(avaliar(a, new Date('2026-11-06T12:00:00Z')).status).toBe('suspensa');
    const paga = registrarCobrancaAprovada(a, new Date('2026-11-01T12:00:00Z'));
    expect(iso(paga.periodoAtualFim)).toBe('2026-11-30T12:00:00.000Z');
  });

  it('o dia de cobrança sobrevive aos meses curtos', () => {
    let a = novoTeste('essencial', new Date('2027-01-24T12:00:00Z')); // teste termina em 31/01
    a = registrarCobrancaAprovada(a, a.testeTerminaEm);
    const fins: string[] = [];
    for (let i = 0; i < 4; i++) {
      fins.push(a.periodoAtualFim.toISOString().slice(0, 10));
      a = registrarCobrancaAprovada(a, a.periodoAtualFim);
    }
    expect(fins).toEqual(['2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
  });

  it('não aceita cobrança em período que ainda não terminou', () => {
    const a = ativaDesdeOTeste();
    expect(() => registrarCobrancaAprovada(a, new Date('2026-11-10T12:00:00Z'))).toThrow(ErroTransicao);
  });
});

describe('cancelamento', () => {
  it('em teste: sem cobrança devida e acesso até o fim do teste', () => {
    const a = cancelar(novoTeste(), new Date('2026-10-26T12:00:00Z'));
    expect(a.status).toBe('cancelada');
    expect(iso(a.acessoAte)).toBe('2026-10-30T12:00:00.000Z');
    expect(temAcesso(a, new Date('2026-10-29T12:00:00Z'))).toBe(true);
    expect(temAcesso(a, new Date('2026-10-30T12:00:00Z'))).toBe(false);
    expect(cobrancaDevida(a, new Date('2026-10-30T12:00:00Z'))).toBeNull();
    expect(cobrancaDevida(a, new Date('2026-12-30T12:00:00Z'))).toBeNull();
  });

  it('depois da cobrança: acesso até o fim do período pago', () => {
    const a = cancelar(ativaDesdeOTeste(), new Date('2026-11-05T12:00:00Z'));
    expect(iso(a.acessoAte)).toBe('2026-11-30T12:00:00.000Z');
    expect(temAcesso(a, new Date('2026-11-29T12:00:00Z'))).toBe(true);
    expect(temAcesso(a, new Date('2026-11-30T12:00:01Z'))).toBe(false);
    expect(cobrancaDevida(a, new Date('2026-11-30T12:00:00Z'))).toBeNull();
  });

  it('cancelar duas vezes ou sem assinatura é erro', () => {
    const a = cancelar(novoTeste(), INICIO);
    expect(() => cancelar(a, INICIO)).toThrow(ErroTransicao);
    expect(() => cancelar({ ...a, status: 'sem_assinatura' }, INICIO)).toThrow(ErroTransicao);
  });

  it('reativar dentro do teste volta ao teste, sem cobrança antecipada', () => {
    const cancelada = cancelar(novoTeste(), new Date('2026-10-25T12:00:00Z'));
    const a = reativar(cancelada, { planoId: 'pro', agora: new Date('2026-10-26T12:00:00Z') });
    expect(a.status).toBe('em_teste');
    expect(a.planoId).toBe('pro');
    expect(a.acessoAte).toBeNull();
    expect(a.canceladaEm).toBeNull();
    expect(cobrancaDevida(a, a.testeTerminaEm)).toEqual({ tipo: 'primeira', valorCentavos: 4990 });
  });

  it('reativar dentro do período pago mantém o período; plano maior é upgrade', () => {
    const cancelada = cancelar(ativaDesdeOTeste('negocio'), new Date('2026-11-05T12:00:00Z'));
    const mesmo = reativar(cancelada, { planoId: 'negocio', agora: new Date('2026-11-10T12:00:00Z') });
    expect(mesmo.status).toBe('ativa');
    expect(mesmo.periodoAtualFim).toEqual(cancelada.periodoAtualFim);
    const menor = reativar(cancelada, { planoId: 'essencial', agora: new Date('2026-11-10T12:00:00Z') });
    expect(menor.planoId).toBe('negocio');
    expect(menor.planoAgendado).toBe('essencial');
  });

  it('reativar depois do acesso começa período novo em agora', () => {
    const cancelada = cancelar(ativaDesdeOTeste(), new Date('2026-11-05T12:00:00Z'));
    const agora = new Date('2027-01-15T12:00:00Z');
    const a = reativar(cancelada, { planoId: 'pro', agora });
    expect(a.status).toBe('ativa');
    expect(a.planoId).toBe('pro');
    expect(iso(a.periodoAtualInicio)).toBe(agora.toISOString());
    expect(iso(a.periodoAtualFim)).toBe('2027-02-15T12:00:00.000Z');
    expect(temAcesso(a, agora)).toBe(true);
  });

  it('só reativa assinatura cancelada', () => {
    expect(() => reativar(novoTeste(), { planoId: 'pro', agora: INICIO })).toThrow(ErroTransicao);
  });
});

describe('troca de plano', () => {
  it('downgrade fica agendado e é aplicado (e cobrado) na renovação', () => {
    let a = ativaDesdeOTeste('negocio');
    a = trocarPlano(a, 'essencial', new Date('2026-11-10T12:00:00Z'));
    expect(a.planoId).toBe('negocio');
    expect(a.planoAgendado).toBe('essencial');
    expect(temAcesso(a, a.periodoAtualInicio)).toBe(true);

    expect(cobrancaDevida(a, a.periodoAtualFim)).toEqual({ tipo: 'renovacao', valorCentavos: 1990 });
    a = registrarCobrancaAprovada(a, a.periodoAtualFim);
    expect(a.planoId).toBe('essencial');
    expect(a.planoAgendado).toBeNull();
    expect(cobrancaDevida(a, a.periodoAtualFim)).toEqual({ tipo: 'renovacao', valorCentavos: 1990 });
  });

  it('voltar ao plano atual cancela o downgrade agendado', () => {
    let a = trocarPlano(ativaDesdeOTeste('pro'), 'essencial', new Date('2026-11-10T12:00:00Z'));
    a = trocarPlano(a, 'pro', new Date('2026-11-11T12:00:00Z'));
    expect(a.planoAgendado).toBeNull();
    expect(a.planoId).toBe('pro');
  });

  it('upgrade vale na hora', () => {
    const a = trocarPlano(ativaDesdeOTeste('essencial'), 'pro', new Date('2026-11-10T12:00:00Z'));
    expect(a.planoId).toBe('pro');
    expect(a.planoAgendado).toBeNull();
  });

  it('no teste qualquer troca vale na hora', () => {
    const a = trocarPlano(novoTeste('pro'), 'essencial', new Date('2026-10-25T12:00:00Z'));
    expect(a.planoId).toBe('essencial');
    expect(a.planoAgendado).toBeNull();
    expect(cobrancaDevida(a, a.testeTerminaEm)?.valorCentavos).toBe(1990);
  });

  it('não troca plano de assinatura inadimplente, suspensa ou com renovação pendente', () => {
    const ativa = ativaDesdeOTeste();
    const inadimplente = registrarCobrancaRecusada(ativa, ativa.periodoAtualFim);
    expect(() => trocarPlano(inadimplente, 'pro', ativa.periodoAtualFim)).toThrow(ErroTransicao);
    expect(() => trocarPlano(ativa, 'pro', ativa.periodoAtualFim)).toThrow(ErroTransicao);
  });
});

describe('calcularProrata', () => {
  const ativa = ativaDesdeOTeste('essencial'); // período 30/10 12:00 -> 30/11 12:00
  const meio = new Date((ativa.periodoAtualInicio.getTime() + ativa.periodoAtualFim.getTime()) / 2);

  it('upgrade cobra a diferença proporcional ao que falta do período', () => {
    expect(calcularProrata(ativa, 'negocio', meio)).toBe(750); // (3490 - 1990) / 2
    expect(calcularProrata(ativa, 'negocio', ativa.periodoAtualInicio)).toBe(1500);
    expect(calcularProrata(ativa, 'negocio', ativa.periodoAtualFim)).toBe(0);
    expect(calcularProrata(ativa, 'pro', meio)).toBe(1500); // (4990 - 1990) / 2
  });

  it('arredonda para o centavo mais próximo', () => {
    const umTerco = new Date(ativa.periodoAtualInicio.getTime() + (ativa.periodoAtualFim.getTime() - ativa.periodoAtualInicio.getTime()) / 3);
    expect(calcularProrata(ativa, 'negocio', umTerco)).toBe(1000); // 1500 * 2/3
    const quinze = new Date(ativa.periodoAtualInicio.getTime() + 15 * 24 * 60 * 60 * 1000);
    expect(calcularProrata(ativa, 'negocio', quinze)).toBe(Math.round((1500 * 16) / 31));
  });

  it('downgrade, mesmo plano e fora de período não cobram', () => {
    const pro = ativaDesdeOTeste('pro');
    expect(calcularProrata(pro, 'essencial', meio)).toBe(0);
    expect(calcularProrata(ativa, 'essencial', meio)).toBe(0);
    expect(calcularProrata(novoTeste('essencial'), 'pro', INICIO)).toBe(0);
    expect(calcularProrata(ativa, 'negocio', new Date('2027-03-01T00:00:00Z'))).toBe(0);
  });
});

describe('serialização', () => {
  it('ida e volta preserva a assinatura, inclusive datas nulas', () => {
    const cobrada = ativaDesdeOTeste();
    const falha = registrarCobrancaRecusada(cobrada, cobrada.periodoAtualFim);
    for (const a of [novoTeste(), cobrada, falha, cancelar(cobrada, INICIO)]) {
      const json = JSON.parse(JSON.stringify(serializarAssinatura(a)));
      expect(desserializarAssinatura(json)).toEqual(a);
    }
  });
});

describe('estados sem acesso', () => {
  it('sem_assinatura e suspensa não abrem venda; não há o que cobrar', () => {
    const base = novoTeste();
    for (const status of ['sem_assinatura', 'suspensa'] as const) {
      const a: Assinatura = { ...base, status };
      expect(temAcesso(a, INICIO)).toBe(false);
      expect(cobrancaDevida(a, INICIO)).toBeNull();
    }
  });

  it('transições inválidas lançam ErroTransicao', () => {
    const base = novoTeste();
    expect(() => registrarCobrancaAprovada({ ...base, status: 'cancelada' }, INICIO)).toThrow(ErroTransicao);
    expect(() => registrarCobrancaRecusada({ ...base, status: 'suspensa' }, INICIO)).toThrow(ErroTransicao);
    expect(() => atualizarCartao({ ...base, status: 'sem_assinatura' }, CARTAO)).toThrow(ErroTransicao);
  });
});
