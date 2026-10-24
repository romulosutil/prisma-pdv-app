import { describe, expect, it } from 'vitest';
import { CARTOES_TESTE, MockBillingProvider, tokenizarCartaoMock, type DadosCartao } from '../src';

const agora = new Date('2026-10-23T12:00:00Z');

function cartao(numero: string, extra: Partial<DadosCartao> = {}): DadosCartao {
  return { numero, validade: '12/30', cvv: '123', nome: 'Ana Souza', ...extra };
}

function tokenDe(numero: string): string {
  const r = tokenizarCartaoMock(cartao(numero), agora);
  if (!r.ok) throw new Error('tokenização falhou');
  return r.token;
}

describe('tokenizarCartaoMock', () => {
  it('devolve token, bandeira e últimos 4', () => {
    const r = tokenizarCartaoMock(cartao(CARTOES_TESTE.aprova.numero), agora);
    expect(r).toMatchObject({ ok: true, bandeira: 'visa', ultimos4: '4242' });
  });

  it('o token nunca expõe o número completo', () => {
    for (const c of Object.values(CARTOES_TESTE)) {
      const r = tokenizarCartaoMock(cartao(c.numero), agora);
      if (!r.ok) throw new Error('tokenização falhou');
      const digitos = c.numero.replace(/\s/g, '');
      expect(r.token).not.toContain(digitos);
      expect(r.token).not.toContain(c.numero);
      expect(JSON.stringify(r)).not.toContain(digitos);
      // só os 4 últimos dígitos aparecem, nunca uma sequência maior
      expect(r.token.match(/\d{5,}/)).toBeNull();
      expect(r.token).toContain(r.ultimos4);
    }
  });

  it('o token não carrega o CVV nem a validade', () => {
    const r = tokenizarCartaoMock(cartao('4242 4242 4242 4242', { cvv: '987', validade: '08/29' }), agora);
    if (!r.ok) throw new Error('tokenização falhou');
    expect(r.token).not.toContain('987');
    expect(r.token).not.toContain('08/29');
  });

  it('valida número, validade, CVV e nome', () => {
    expect(tokenizarCartaoMock(cartao('4242 4242 4242 4241'), agora)).toEqual({ ok: false, motivo: 'numero_invalido' });
    expect(tokenizarCartaoMock(cartao('4242 4242 4242 4242', { validade: '01/26' }), agora)).toEqual({
      ok: false,
      motivo: 'validade_invalida',
    });
    expect(tokenizarCartaoMock(cartao('4242 4242 4242 4242', { cvv: '12' }), agora)).toEqual({ ok: false, motivo: 'cvv_invalido' });
    expect(tokenizarCartaoMock(cartao('4242 4242 4242 4242', { nome: ' ' }), agora)).toEqual({ ok: false, motivo: 'nome_invalido' });
  });
});

describe('MockBillingProvider', () => {
  it('4242 aprova verificação e cobrança', async () => {
    const billing = new MockBillingProvider();
    const token = tokenDe(CARTOES_TESTE.aprova.numero);
    const v = await billing.verificarCartao(token);
    expect(v).toMatchObject({ ok: true, bandeira: 'visa', ultimos4: '4242', fingerprint: 'fp_visa_4242' });
    if (!v.ok) throw new Error('verificação deveria passar');
    const c = await billing.cobrar({ clienteRef: v.clienteRef, valorCentavos: 3490, descricao: 'Negócio', chaveIdempotencia: 'k1' });
    expect(c.ok).toBe(true);
  });

  it('4000 0000 0000 0002 recusa já na verificação', async () => {
    const billing = new MockBillingProvider();
    const v = await billing.verificarCartao(tokenDe(CARTOES_TESTE.recusaVerificacao.numero));
    expect(v).toEqual({ ok: false, motivo: 'cartao_recusado' });
  });

  it('4000 0000 0000 0341 verifica, mas recusa cobranças', async () => {
    const billing = new MockBillingProvider();
    const token = tokenDe(CARTOES_TESTE.recusaCobranca.numero);
    const v = await billing.verificarCartao(token);
    expect(v.ok).toBe(true);
    const c = await billing.cobrar({ clienteRef: token, valorCentavos: 1990, descricao: 'x', chaveIdempotencia: 'k1' });
    expect(c).toEqual({ ok: false, motivo: 'cartao_recusado' });
  });

  it('recusa token inválido', async () => {
    const billing = new MockBillingProvider();
    expect(await billing.verificarCartao('lixo')).toEqual({ ok: false, motivo: 'token_invalido' });
    const c = await billing.cobrar({ clienteRef: 'lixo', valorCentavos: 100, descricao: 'x', chaveIdempotencia: 'k' });
    expect(c).toEqual({ ok: false, motivo: 'token_invalido' });
  });

  it('recusa valor que não é inteiro positivo', async () => {
    const billing = new MockBillingProvider();
    const token = tokenDe(CARTOES_TESTE.aprova.numero);
    for (const [i, valorCentavos] of [0, -5, 10.5].entries()) {
      const c = await billing.cobrar({ clienteRef: token, valorCentavos, descricao: 'x', chaveIdempotencia: `k${i}` });
      expect(c).toEqual({ ok: false, motivo: 'valor_invalido' });
    }
  });

  it('é idempotente por chave: repetir não cobra de novo', async () => {
    const billing = new MockBillingProvider();
    const token = tokenDe(CARTOES_TESTE.aprova.numero);
    const pedido = { clienteRef: token, valorCentavos: 3490, descricao: 'Negócio', chaveIdempotencia: 'fatura-1' };
    const a = await billing.cobrar(pedido);
    const b = await billing.cobrar(pedido);
    expect(b).toEqual(a);
    expect(billing.transacoes.filter((t) => t.tipo === 'cobranca')).toHaveLength(1);
  });

  it('falharProximasCobrancas recusa as n seguintes e depois volta ao normal', async () => {
    const billing = new MockBillingProvider();
    const token = tokenDe(CARTOES_TESTE.aprova.numero);
    billing.falharProximasCobrancas(2);
    const cobrar = (chaveIdempotencia: string) => billing.cobrar({ clienteRef: token, valorCentavos: 1990, descricao: 'x', chaveIdempotencia });
    expect((await cobrar('a')).ok).toBe(false);
    expect((await cobrar('b')).ok).toBe(false);
    expect((await cobrar('c')).ok).toBe(true);
    expect((await cobrar('a')).ok).toBe(false); // mesma chave, mesmo resultado
  });

  it('registra o log de transações', async () => {
    const billing = new MockBillingProvider();
    const token = tokenDe(CARTOES_TESTE.aprova.numero);
    await billing.verificarCartao(token);
    await billing.cobrar({ clienteRef: token, valorCentavos: 1990, descricao: 'Essencial', chaveIdempotencia: 'k' });
    expect(billing.transacoes.map((t) => [t.tipo, t.valorCentavos, t.ok])).toEqual([
      ['verificacao', 0, true],
      ['cobranca', 1990, true],
    ]);
  });

  it('estorna uma cobrança aprovada uma única vez', async () => {
    const billing = new MockBillingProvider();
    const token = tokenDe(CARTOES_TESTE.aprova.numero);
    const c = await billing.cobrar({ clienteRef: token, valorCentavos: 1990, descricao: 'x', chaveIdempotencia: 'k' });
    if (!c.ok) throw new Error('cobrança deveria passar');
    expect(await billing.estornar(c.transacaoId)).toEqual({ ok: true });
    expect(await billing.estornar(c.transacaoId)).toEqual({ ok: false });
    expect(await billing.estornar('inexistente')).toEqual({ ok: false });
    expect(billing.transacoes.find((t) => t.id === c.transacaoId)?.estornada).toBe(true);
  });
});
