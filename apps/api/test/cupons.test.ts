import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { abrirBanco, avancarEProcessar, chamar, criarAmbiente, criarConta, faturasDe, NUMEROS, reautenticar, tokenDoCartao, type Ambiente } from './ajuda';
import type { Conexao } from '../src/db/conexao';
import { assinaturas, testesUsados } from '../src/db/schema';
import { carregarAssinatura } from '../src/servicos/assinatura';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(() => banco.fechar());
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(() => amb.fechar());

async function contratar(numero: string = NUMEROS.aprova) {
  const conta = await criarConta(amb);
  const res = await chamar(amb, 'POST', '/assinatura', { token: conta.token, corpo: { planoId: 'pro', tokenCartao: tokenDoCartao(numero), codigoCupom: ' vitalicio50 ', cupom: { percentualDesconto: 99 } } });
  expect(res.status).toBe(201);
  expect(res.corpo.assinatura.cupom).toEqual({ codigo: 'VITALICIO50', percentualDesconto: 50, duracao: 'vitalicio' });
  return conta;
}

describe('cupons da assinatura', () => {
  it('publica um único plano de R$ 49,90', async () => {
    const res = await chamar(amb, 'GET', '/planos');
    expect(res.status).toBe(200);
    expect(res.corpo.map((p: any) => [p.id, p.precoMensalCentavos])).toEqual([['pro', 4990]]);
  });
  it('rejeita desconhecido antes de verificar cartão, sem consumir teste', async () => {
    const conta = await criarConta(amb);
    const res = await chamar(amb, 'POST', '/assinatura', { token: conta.token, corpo: { planoId: 'pro', tokenCartao: tokenDoCartao(NUMEROS.aprova), codigoCupom: 'ERRO' } });
    expect(res.status).toBe(400);
    expect(res.corpo.erro).toBe('cupom_invalido');
    expect(amb.mock.transacoes).toHaveLength(0);
    expect(await amb.db.select().from(testesUsados)).toHaveLength(0);
    expect(await amb.db.select().from(assinaturas)).toHaveLength(0);
    const retry = await chamar(amb, 'POST', '/assinatura', { token: conta.token, corpo: { planoId: 'pro', tokenCartao: tokenDoCartao(NUMEROS.aprova), codigoCupom: 'VITALICIO50' } });
    expect(retry.status).toBe(201);
  });
  it('persiste cupom e cobra R$ 24,95 na primeira cobrança, renovação e reativação', async () => {
    const conta = await contratar();
    expect(await faturasDe(amb)).toHaveLength(0);
    const carregada = await carregarAssinatura(amb.db, conta.contaId, amb.relogio.agora());
    expect(carregada.assinatura.cupom).toEqual({ codigo: 'VITALICIO50', percentualDesconto: 50, duracao: 'vitalicio' });
    await avancarEProcessar(amb, 6);
    expect(await faturasDe(amb)).toHaveLength(0);
    await avancarEProcessar(amb, 1);
    expect((await faturasDe(amb)).map((f) => [f.tipo, f.valorCentavos, f.status])).toEqual([['primeira', 2495, 'aprovada']]);
    await avancarEProcessar(amb, 31);
    expect((await faturasDe(amb)).at(-1)).toMatchObject({ tipo: 'renovacao', valorCentavos: 2495 });
    let sessao = await reautenticar(amb, conta);
    expect((await chamar(amb, 'POST', '/assinatura/cancelar', { token: sessao.token })).status).toBe(200);
    await avancarEProcessar(amb, 31);
    sessao = await reautenticar(amb, conta);
    const res = await chamar(amb, 'POST', '/assinatura/reativar', { token: sessao.token, corpo: { planoId: 'pro' } });
    expect(res.status).toBe(200);
    expect(res.corpo.assinatura.cupom.codigo).toBe('VITALICIO50');
    expect((await faturasDe(amb)).at(-1)).toMatchObject({ tipo: 'renovacao', valorCentavos: 2495 });
    expect(amb.mock.transacoes.filter((t) => t.tipo === 'cobranca').map((t) => t.valorCentavos)).toEqual([2495, 2495, 2495]);
  });
  it('retentativas e recuperação com cartão novo mantêm o desconto', async () => {
    const conta = await contratar(NUMEROS.recusaCobranca);
    await avancarEProcessar(amb, 7);
    await avancarEProcessar(amb, 1);
    expect((await faturasDe(amb)).map((f) => [f.tipo, f.valorCentavos, f.status])).toEqual([['primeira', 2495, 'recusada'], ['retentativa', 2495, 'recusada']]);
    const res = await chamar(amb, 'PUT', '/assinatura/cartao', { token: conta.token, corpo: { tokenCartao: tokenDoCartao(NUMEROS.aprova) } });
    expect(res.status).toBe(200);
    expect(res.corpo.assinatura.status).toBe('ativa');
    expect((await faturasDe(amb)).at(-1)).toMatchObject({ tipo: 'retentativa', valorCentavos: 2495, status: 'aprovada' });
  });
  it('sem cupom cobra R$ 49,90', async () => {
    const conta = await criarConta(amb);
    expect((await chamar(amb, 'POST', '/assinatura', { token: conta.token, corpo: { planoId: 'pro', tokenCartao: tokenDoCartao(NUMEROS.aprova) } })).status).toBe(201);
    await avancarEProcessar(amb, 7);
    expect((await faturasDe(amb)).at(-1)).toMatchObject({ valorCentavos: 4990, status: 'aprovada' });
    expect((await amb.db.select().from(assinaturas).where(eq(assinaturas.contaId, conta.contaId)))[0]?.cupom).toBeNull();
  });
});
