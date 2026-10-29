import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Conexao } from '../src/db/conexao';
import {
  abrirBanco,
  assinar,
  avancarEProcessar,
  chamar,
  contaEmTeste,
  criarAmbiente,
  criarConta,
  faturasDe,
  NUMEROS,
  statusDe,
  tokenDoCartao,
  reautenticar,
  type Ambiente,
} from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => {
  banco = await abrirBanco();
});
afterAll(() => banco.fechar());
beforeEach(async () => {
  amb = await criarAmbiente(banco);
});
afterEach(() => amb.fechar());

describe('POST /assinatura', () => {
  it('conta sem assinatura aparece como sem_assinatura e não pode vender', async () => {
    const conta = await criarConta(amb);
    const res = await chamar(amb, 'GET', '/assinatura', { token: conta.token });
    expect(res.corpo.assinatura.status).toBe('sem_assinatura');
    expect(res.corpo.licenca.status).toBe('sem_assinatura');
  });

  it('cartão 4000...0002 é recusado na verificação e o teste não começa', async () => {
    const conta = await criarConta(amb);
    const recusada = await assinar(amb, conta.token, 'negocio', NUMEROS.recusaVerificacao);
    expect(recusada.status).toBe(402);
    expect(recusada.corpo.erro).toBe('cartao_recusado');
    expect(await statusDe(amb, conta.token)).toBe('sem_assinatura');

    // A recusa não queimou o teste: outro cartão ainda pode começar.
    expect((await assinar(amb, conta.token, 'negocio', NUMEROS.aprova)).status).toBe(201);
  });

  it('um teste por CPF/CNPJ: quem cancelou não ganha outro teste', async () => {
    const conta = await contaEmTeste(amb);
    await chamar(amb, 'POST', '/assinatura/cancelar', { token: conta.token });

    const outro = await assinar(amb, conta.token, 'negocio', NUMEROS.outroAprova);
    expect(outro.status).toBe(409);
    expect(outro.corpo.erro).toBe('teste_ja_usado');
  });

  it('um teste por cartão: outra conta com o mesmo cartão é barrada', async () => {
    await contaEmTeste(amb, 'negocio', NUMEROS.aprova);
    const outraConta = await criarConta(amb);

    const barrada = await assinar(amb, outraConta.token, 'negocio', NUMEROS.aprova);
    expect(barrada.status).toBe(409);
    expect(barrada.corpo.erro).toBe('teste_ja_usado');
    expect(await statusDe(amb, outraConta.token)).toBe('sem_assinatura');

    expect((await assinar(amb, outraConta.token, 'negocio', NUMEROS.outroAprova)).status).toBe(201);
  });

  it('não cria uma segunda assinatura por cima de uma em andamento', async () => {
    const conta = await contaEmTeste(amb);
    const res = await assinar(amb, conta.token, 'pro', NUMEROS.outroAprova);
    expect(res.status).toBe(409);
    expect(res.corpo.erro).toBe('assinatura_existente');
  });
});

describe('POST /assinatura/trocar-plano', () => {
  it('upgrade com prorata gera fatura prorata e vale na hora', async () => {
    const conta = await contaEmTeste(amb, 'essencial');
    await avancarEProcessar(amb, 7); // ativa: 17/03 a 17/04
    amb.relogio.avancarDias(15);

    const res = await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'negocio' } });
    expect(res.status).toBe(200);
    expect(res.corpo.assinatura).toMatchObject({ status: 'ativa', planoId: 'negocio', planoAgendado: null });
    expect(res.corpo.licenca.planoId).toBe('negocio');

    const faturas = await faturasDe(amb);
    expect(faturas).toHaveLength(2);
    // (R$ 34,90 - R$ 19,90) x 16/31 do período que falta
    expect(faturas[1]).toMatchObject({ tipo: 'prorata', status: 'aprovada', valorCentavos: 774 });
  });

  it('prorata recusada: o plano não muda e a fatura fica registrada como recusada', async () => {
    const conta = await contaEmTeste(amb, 'essencial');
    await avancarEProcessar(amb, 7);
    amb.relogio.avancarDias(15);
    amb.mock.falharProximasCobrancas(1);

    const res = await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'pro' } });
    expect(res.status).toBe(402);
    expect(res.corpo.erro).toBe('pagamento_recusado');
    expect((await chamar(amb, 'GET', '/assinatura', { token: conta.token })).corpo.assinatura.planoId).toBe('essencial');
    expect((await faturasDe(amb)).at(-1)).toMatchObject({ tipo: 'prorata', status: 'recusada' });
  });

  it('downgrade fica agendado e é aplicado (com o preço novo) na renovação', async () => {
    const conta = await contaEmTeste(amb, 'negocio');
    await avancarEProcessar(amb, 7);

    const res = await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'essencial' } });
    expect(res.corpo.assinatura).toMatchObject({ planoId: 'negocio', planoAgendado: 'essencial' });
    expect(await faturasDe(amb)).toHaveLength(1);

    await avancarEProcessar(amb, 31);
    const sessaoAtual = await reautenticar(amb, conta);
    const depois = await chamar(amb, 'GET', '/assinatura', { token: sessaoAtual.token });
    expect(depois.corpo.assinatura).toMatchObject({ status: 'ativa', planoId: 'essencial', planoAgendado: null });
    expect((await faturasDe(amb)).at(-1)).toMatchObject({ tipo: 'renovacao', valorCentavos: 1990 });
  });

  it('durante o teste a troca vale na hora e sem cobrança', async () => {
    const conta = await contaEmTeste(amb, 'essencial');
    const res = await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'pro' } });
    expect(res.corpo.assinatura).toMatchObject({ status: 'em_teste', planoId: 'pro' });
    expect(await faturasDe(amb)).toHaveLength(0);
  });

  it('sem assinatura a troca é negada', async () => {
    const conta = await criarConta(amb);
    const res = await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'pro' } });
    expect(res.status).toBe(409);
    expect(res.corpo.erro).toBe('transicao_invalida');
  });
});

describe('PUT /assinatura/cartao', () => {
  it('em teste só troca o cartão, sem cobrar', async () => {
    const conta = await contaEmTeste(amb);
    const res = await chamar(amb, 'PUT', '/assinatura/cartao', {
      token: conta.token,
      corpo: { tokenCartao: tokenDoCartao(NUMEROS.outroAprova) },
    });
    expect(res.status).toBe(200);
    expect(res.corpo.assinatura.cartao).toMatchObject({ bandeira: 'mastercard', ultimos4: '4444' });
    expect(await faturasDe(amb)).toHaveLength(0);
  });

  it('cartão recusado na verificação não substitui o atual', async () => {
    const conta = await contaEmTeste(amb);
    const res = await chamar(amb, 'PUT', '/assinatura/cartao', {
      token: conta.token,
      corpo: { tokenCartao: tokenDoCartao(NUMEROS.recusaVerificacao) },
    });
    expect(res.status).toBe(402);
    expect((await chamar(amb, 'GET', '/assinatura', { token: conta.token })).corpo.assinatura.cartao.ultimos4).toBe('4242');
  });

  it('o novo cartão é usado nas cobranças seguintes', async () => {
    const conta = await contaEmTeste(amb, 'negocio', NUMEROS.recusaCobranca);
    await chamar(amb, 'PUT', '/assinatura/cartao', { token: conta.token, corpo: { tokenCartao: tokenDoCartao(NUMEROS.aprova) } });
    await avancarEProcessar(amb, 7);
    expect(await statusDe(amb, conta.token)).toBe('ativa');
  });
});

describe('cancelar e reativar', () => {
  it('cancelar depois de pagar mantém o acesso até o fim do período', async () => {
    const conta = await contaEmTeste(amb);
    await avancarEProcessar(amb, 7);
    const res = await chamar(amb, 'POST', '/assinatura/cancelar', { token: conta.token });
    expect(res.corpo.assinatura).toMatchObject({ status: 'cancelada', acessoAte: '2026-04-17T12:00:00.000Z' });
    expect(res.corpo.licenca.validaAte).toBe('2026-04-17T12:00:00.000Z');

    await avancarEProcessar(amb, 31);
    expect(await faturasDe(amb)).toHaveLength(1);
  });

  it('reativar dentro do teste volta a em_teste sem cobrar', async () => {
    const conta = await contaEmTeste(amb);
    await chamar(amb, 'POST', '/assinatura/cancelar', { token: conta.token });
    amb.relogio.avancarDias(3);

    const res = await chamar(amb, 'POST', '/assinatura/reativar', { token: conta.token, corpo: { planoId: 'pro' } });
    expect(res.status).toBe(200);
    expect(res.corpo.assinatura).toMatchObject({ status: 'em_teste', planoId: 'pro' });
    expect(await faturasDe(amb)).toHaveLength(0);
  });

  it('reativar depois do período cobra um período novo antes de liberar', async () => {
    const conta = await contaEmTeste(amb);
    await chamar(amb, 'POST', '/assinatura/cancelar', { token: conta.token });
    amb.relogio.avancarDias(10);

    const res = await chamar(amb, 'POST', '/assinatura/reativar', { token: conta.token, corpo: { planoId: 'essencial' } });
    expect(res.status).toBe(200);
    expect(res.corpo.assinatura).toMatchObject({
      status: 'ativa',
      planoId: 'essencial',
      periodoAtualInicio: '2026-03-20T12:00:00.000Z',
      periodoAtualFim: '2026-04-20T12:00:00.000Z',
    });
    expect(await faturasDe(amb)).toMatchObject([{ tipo: 'primeira', status: 'aprovada', valorCentavos: 1990 }]);
  });

  it('reativação com cartão recusado não libera o acesso', async () => {
    const conta = await contaEmTeste(amb);
    await chamar(amb, 'POST', '/assinatura/cancelar', { token: conta.token });
    amb.relogio.avancarDias(10);
    amb.mock.falharProximasCobrancas(1);

    const res = await chamar(amb, 'POST', '/assinatura/reativar', { token: conta.token, corpo: { planoId: 'negocio' } });
    expect(res.status).toBe(402);
    expect(await statusDe(amb, conta.token)).toBe('cancelada');
  });

  it('só dá para reativar uma assinatura cancelada', async () => {
    const conta = await contaEmTeste(amb);
    const res = await chamar(amb, 'POST', '/assinatura/reativar', { token: conta.token, corpo: { planoId: 'pro' } });
    expect(res.status).toBe(409);
    expect(res.corpo.erro).toBe('transicao_invalida');
  });
});
