import { describe, expect, it } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';
import { lerConfiguracaoPagamentos } from '../src/configuracao';
import { assinarManifesto, assinaturaValida, lerCabecalhoAssinatura, manifestoAssinatura } from '../src/pagamentos/assinaturaWebhook';
import { chavePagamentosValida, criarCifradorPagamentos } from '../src/pagamentos/cifrador';
import { centavosParaValor, corpoPedidoPix, criarProvedorMercadoPago, desafioPkce, ErroProvedorMp, lerPedido, urlAutorizacao, valorParaCentavos } from '../src/pagamentos/mercadoPago';
import { decidirTransicao } from '../src/servicos/cobrancasPix';

const SEGREDO = 'segredo-simulado-webhook';

describe('assinatura do webhook (x-signature)', () => {
  it('monta o manifesto como a documentação: data.id em minúsculas e pares ausentes omitidos', () => {
    expect(manifestoAssinatura('ORD01M28P44G5FG8RJPM579EH56FV', '2066ca19-c6f1-498a-be75-1923005edd06', '1742505638683'))
      .toBe('id:ord01m28p44g5fg8rjpm579eh56fv;request-id:2066ca19-c6f1-498a-be75-1923005edd06;ts:1742505638683;');
    expect(manifestoAssinatura(undefined, 'req', '1')).toBe('request-id:req;ts:1;');
    expect(manifestoAssinatura('ORD1', undefined, '1')).toBe('id:ord1;ts:1;');
    expect(manifestoAssinatura(undefined, undefined, '1')).toBe('ts:1;');
  });

  it('valida HMAC-SHA256 hex em tempo constante e recusa qualquer alteração', () => {
    // Sem vetor oficial na documentação: a referência é o HMAC calculado de forma independente.
    const manifesto = 'id:ord01m28p44g5fg8rjpm579eh56fv;request-id:2066ca19-c6f1-498a-be75-1923005edd06;ts:1742505638683;';
    const v1 = createHmac('sha256', SEGREDO).update(manifesto).digest('hex');
    expect(assinarManifesto(manifesto, SEGREDO)).toBe(v1);
    const base = { assinatura: `ts=1742505638683,v1=${v1}`, requestId: '2066ca19-c6f1-498a-be75-1923005edd06', dataId: 'ORD01M28P44G5FG8RJPM579EH56FV', segredo: SEGREDO };
    expect(assinaturaValida(base)).toBe(true);
    expect(assinaturaValida({ ...base, assinatura: ` v1=${v1.toUpperCase()} , ts=1742505638683` })).toBe(true);
    expect(assinaturaValida({ ...base, dataId: 'ORD01M28P44G5FG8RJPM579EH56FW' })).toBe(false);
    expect(assinaturaValida({ ...base, requestId: 'outro' })).toBe(false);
    expect(assinaturaValida({ ...base, requestId: undefined })).toBe(false);
    expect(assinaturaValida({ ...base, assinatura: `ts=1742505638684,v1=${v1}` })).toBe(false);
    expect(assinaturaValida({ ...base, segredo: 'outro-segredo' })).toBe(false);
    expect(assinaturaValida({ ...base, segredo: null })).toBe(false);
    expect(assinaturaValida({ ...base, assinatura: undefined })).toBe(false);
    expect(assinaturaValida({ ...base, assinatura: `ts=1742505638683` })).toBe(false);
    expect(assinaturaValida({ ...base, assinatura: `ts=abc,v1=${v1}` })).toBe(false);
  });

  it('lê o cabeçalho só no formato ts/v1', () => {
    expect(lerCabecalhoAssinatura('ts=1,v1=' + 'a'.repeat(64))).toEqual({ ts: '1', v1: 'a'.repeat(64) });
    expect(lerCabecalhoAssinatura('v1=' + 'a'.repeat(63) + ',ts=1')).toBeNull();
    expect(lerCabecalhoAssinatura('x'.repeat(600))).toBeNull();
  });
});

describe('cifrador da credencial', () => {
  it('cifra com AAD de loja/conexão/campo e não deixa o texto no envelope', () => {
    const chave = randomBytes(32).toString('base64');
    const c = criarCifradorPagamentos(chave);
    const ctx = { lojaId: '00000000-0000-4000-8000-000000000001', conexaoId: '00000000-0000-4000-8000-000000000002', campo: 'token' as const };
    const envelope = c.cifrar('TESTE-SIMULADO-TOKEN', ctx);
    expect(JSON.stringify(envelope)).not.toContain('TESTE-SIMULADO-TOKEN');
    expect(c.decifrar(envelope, ctx)).toBe('TESTE-SIMULADO-TOKEN');
    expect(c.cifrar('TESTE-SIMULADO-TOKEN', ctx).iv).not.toBe(envelope.iv);
    expect(() => c.decifrar({ ...envelope, conteudo: Buffer.from('x').toString('base64') }, ctx)).toThrow('Credencial de pagamento indisponível.');
    expect(() => criarCifradorPagamentos(randomBytes(32).toString('base64')).decifrar(envelope, ctx)).toThrow();
    expect(() => c.decifrar(envelope, { ...ctx, conexaoId: '00000000-0000-4000-8000-000000000003' })).toThrow();
    expect(() => criarCifradorPagamentos(randomBytes(16).toString('base64'))).toThrow('PDV_PAGAMENTOS_CHAVE deve ser base64 de 32 bytes.');
    expect(chavePagamentosValida(chave)).toBe(true);
    expect(chavePagamentosValida('curta')).toBe(false);
  });

  it('configuração: chave e pagador opcionais; formato inválido falha sem citar o valor', () => {
    expect(lerConfiguracaoPagamentos({})).toEqual({ chave: undefined, pagadorEmail: undefined });
    const chave = randomBytes(32).toString('base64');
    expect(lerConfiguracaoPagamentos({ PDV_PAGAMENTOS_CHAVE: chave, PDV_MP_PAYER_EMAIL: 'pix@exemplo.com.br' })).toEqual({ chave, pagadorEmail: 'pix@exemplo.com.br' });
    for (const env of [{ PDV_PAGAMENTOS_CHAVE: 'segredo-invalido' }, { PDV_PAGAMENTOS_CHAVE: randomBytes(31).toString('base64') }, { PDV_MP_PAYER_EMAIL: 'segredo sem arroba' }]) {
      expect(() => lerConfiguracaoPagamentos(env)).toThrow();
      try { lerConfiguracaoPagamentos(env); } catch (erro) { expect((erro as Error).message).not.toContain('segredo'); }
    }
  });
});

describe('cliente da Orders API', () => {
  it('converte valores em centavos exatos, sem arredondar', () => {
    expect(centavosParaValor(5000)).toBe('50.00');
    expect(centavosParaValor(1)).toBe('0.01');
    expect(centavosParaValor(123456)).toBe('1234.56');
    expect(valorParaCentavos('50.00')).toBe(5000);
    expect(valorParaCentavos('50.5')).toBe(5050);
    expect(valorParaCentavos('50')).toBe(5000);
    expect(valorParaCentavos(47.28)).toBe(4728);
    for (const v of ['50.001', '-1', '', '1e3', null, undefined, {}]) expect(valorParaCentavos(v)).toBeNull();
  });

  it('monta o corpo documentado do Pix e lê a resposta', () => {
    expect(corpoPedidoPix({ valorCentavos: 5000, referenciaExterna: 'ref', expiracao: 'PT30M', pagadorEmail: 'p@exemplo.com.br', pagadorPrimeiroNome: 'APRO' })).toEqual({
      type: 'online', processing_mode: 'automatic', total_amount: '50.00', external_reference: 'ref',
      transactions: { payments: [{ amount: '50.00', payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }] },
      payer: { email: 'p@exemplo.com.br', first_name: 'APRO' },
    });
    const pedido = lerPedido({ id: 'ORD1', status: 'processed', status_detail: 'accredited', external_reference: 'ref', total_amount: '50.00', total_paid_amount: '50.00',
      transactions: { payments: [{ date_of_expiration: '2026-03-10T12:30:00.000-03:00', payment_method: { qr_code: 'qr', qr_code_base64: 'b64', ticket_url: 'https://exemplo.invalid' } }] } });
    expect(pedido).toEqual({ id: 'ORD1', status: 'processed', statusDetail: 'accredited', referenciaExterna: 'ref', totalCentavos: 5000, totalPagoCentavos: 5000,
      pix: { qrCode: 'qr', qrCodeBase64: 'b64', ticketUrl: 'https://exemplo.invalid' }, expiraEm: new Date('2026-03-10T15:30:00.000Z') });
    expect(() => lerPedido({ status: 'processed' })).toThrow(ErroProvedorMp);
  });

  it('envia token e chave só nos cabeçalhos e nunca os coloca na mensagem de erro', async () => {
    const pedidos: { url: string; init: RequestInit }[] = [];
    const respostas = [
      new Response(JSON.stringify({ id: 'ORD1', status: 'action_required', status_detail: 'waiting_transfer' }), { status: 201 }),
      new Response(JSON.stringify({ errors: [{ code: 'cannot_cancel_order' }] }), { status: 409 }),
      new Response(JSON.stringify({ errors: [{ code: 'order_already_canceled' }] }), { status: 409 }),
      new Response(JSON.stringify({ errors: [{ code: 'idempotency_key_already_used' }] }), { status: 409 }),
      new Response('{}', { status: 429, headers: { 'retry-after': '7' } }),
      new Response(JSON.stringify({ message: 'TESTE-SIMULADO-TOKEN' }), { status: 401 }),
      new Response('falha', { status: 500 }),
    ];
    const buscar = (async (url: string, init: RequestInit) => { pedidos.push({ url, init }); return respostas.shift()!; }) as unknown as typeof fetch;
    const mp = criarProvedorMercadoPago({ buscar, baseUrl: 'https://mp.exemplo.invalid' });
    const entrada = { valorCentavos: 700, referenciaExterna: 'ref', expiracao: 'PT30M', pagadorEmail: 'p@exemplo.com.br', pagadorPrimeiroNome: null };
    expect((await mp.criarPedidoPix('TESTE-SIMULADO-TOKEN', 'pdv-pix-1', entrada)).id).toBe('ORD1');
    expect(pedidos[0]!.url).toBe('https://mp.exemplo.invalid/v1/orders');
    expect(pedidos[0]!.init.headers).toMatchObject({ Authorization: 'Bearer TESTE-SIMULADO-TOKEN', 'X-Idempotency-Key': 'pdv-pix-1', 'Content-Type': 'application/json' });
    expect(JSON.parse(String(pedidos[0]!.init.body))).toMatchObject({ total_amount: '7.00', payer: { email: 'p@exemplo.com.br' } });
    expect(String(pedidos[0]!.init.body)).not.toContain('TESTE-SIMULADO');
    const tipos: unknown[] = [];
    for (let i = 0; i < 6; i++) {
      try { await mp.cancelarPedido('TESTE-SIMULADO-TOKEN', 'ORD1', 'pdv-cancelar-1'); } catch (erro) {
        expect(erro).toBeInstanceOf(ErroProvedorMp);
        expect(String((erro as Error).message)).not.toContain('TESTE-SIMULADO');
        tipos.push([(erro as ErroProvedorMp).tipo, (erro as ErroProvedorMp).repetirEmMs]);
      }
    }
    expect(tipos).toEqual([['nao_cancelavel', null], ['ja_cancelado', null], ['idempotencia_conflito', null], ['limite', 7000], ['credencial_invalida', null], ['indisponivel', null]]);
    const outro = [
      new Response(JSON.stringify({ message: 'x' }), { status: 403 }),
      new Response(JSON.stringify({ error: 'invalid_grant', errors: [{ code: 'outro' }] }), { status: 400 }),
    ];
    const mp2 = criarProvedorMercadoPago({ buscar: (async () => outro.shift()!) as unknown as typeof fetch });
    await expect(mp2.consultarPedido('TESTE-SIMULADO-TOKEN', 'ORD1')).rejects.toMatchObject({ tipo: 'acesso_negado', status: 403 });
    await expect(mp2.consultarPedido('TESTE-SIMULADO-TOKEN', 'ORD1')).rejects.toMatchObject({ tipo: 'concessao_invalida', codigo: 'invalid_grant' });
    expect(pedidos[1]!.url).toBe('https://mp.exemplo.invalid/v1/orders/ORD1/cancel');
    const rede = criarProvedorMercadoPago({ buscar: (async () => { throw new Error('falha com TESTE-SIMULADO-TOKEN'); }) as unknown as typeof fetch });
    await expect(rede.consultarPedido('TESTE-SIMULADO-TOKEN', 'ORD1')).rejects.toThrow(/^Mercado Pago: indisponivel$/);
  });
});

describe('máquina de estados', () => {
  const base = { id: 'ref', estado: 'aguardando' as const, alerta: null, valorCentavos: 5000, valorPagoCentavos: null, pedidoProvedorId: 'ORD1' };
  const pedido = (status: string, statusDetail: string | null, extras: object = {}) => ({ id: 'ord1', status, statusDetail, referenciaExterna: 'ref', totalCentavos: 5000, totalPagoCentavos: 5000, pix: null, expiraEm: null, ...extras });

  it.each([
    ['aguardando', pedido('processed', 'accredited'), 'paga'],
    ['aguardando', pedido('processed', 'accredited', { totalPagoCentavos: 4999 }), 'divergente'],
    ['aguardando', pedido('processed', 'accredited', { totalPagoCentavos: 5001 }), 'divergente'],
    ['aguardando', pedido('processed', 'accredited', { totalCentavos: 4000 }), 'divergente'],
    ['aguardando', pedido('processed', 'accredited', { totalPagoCentavos: null }), 'aguardando'],
    ['aguardando', pedido('processed', 'accredited', { id: 'ORD2' }), 'divergente'],
    ['aguardando', pedido('processed', 'partially_refunded'), 'aguardando'],
    ['aguardando', pedido('action_required', 'waiting_transfer'), 'aguardando'],
    ['aguardando', pedido('processing', 'in_process'), 'aguardando'],
    ['aguardando', pedido('qualquer_coisa', null), 'aguardando'],
    ['aguardando', pedido('canceled', 'expired'), 'expirada'],
    ['aguardando', pedido('failed', 'expired'), 'expirada'],
    ['aguardando', pedido('canceled', 'canceled_transaction'), 'cancelada'],
    ['aguardando', pedido('failed', 'failed'), 'cancelada'],
    ['expirada', pedido('processed', 'accredited'), 'paga_tardia'],
    ['cancelada', pedido('processed', 'accredited'), 'paga_tardia'],
    ['cancelada', pedido('processed', 'accredited', { totalPagoCentavos: 1 }), 'divergente'],
    ['expirada', pedido('canceled', 'canceled'), 'expirada'],
    ['paga', pedido('canceled', 'expired'), 'paga'],
    ['paga', pedido('action_required', 'waiting_transfer'), 'paga'],
    ['paga', pedido('processed', 'accredited', { totalPagoCentavos: 1 }), 'paga'],
    ['divergente', pedido('processed', 'accredited'), 'divergente'],
    ['paga_tardia', pedido('canceled', 'expired'), 'paga_tardia'],
  ] as const)('%s + %o → %s', (estado, p, esperado) => {
    expect(decidirTransicao({ ...base, estado }, p).estado).toBe(esperado);
  });

  it('estorno ou contestação viram alerta sem mudar o estado', () => {
    expect(decidirTransicao({ ...base, estado: 'paga' }, pedido('refunded', 'refunded'))).toMatchObject({ estado: 'paga', alerta: 'refunded/refunded' });
    expect(decidirTransicao({ ...base, estado: 'aguardando' }, pedido('charged_back', 'settled'))).toMatchObject({ estado: 'aguardando', alerta: 'charged_back/settled', motivo: 'estorno_sem_confirmacao' });
  });
});

describe('cliente OAuth do Mercado Pago', () => {
  const app = { clientId: 'cliente-simulado', clientSecret: 'TESTE-SIMULADO-SEGREDO-APP', redirectUri: 'https://api.exemplo.invalid/retorno', pkce: true, testToken: false };

  it('troca e renova pelo /oauth/token com corpo JSON documentado; invalid_grant vira concessao_invalida sem vazar segredo', async () => {
    const pedidos: { url: string; init: RequestInit }[] = [];
    const respostas = [
      new Response(JSON.stringify({ access_token: 'TESTE-SIMULADO-A', token_type: 'bearer', expires_in: 15552000, scope: 'read write offline_access', user_id: 42, refresh_token: 'TESTE-SIMULADO-R', public_key: 'x', live_mode: false }), { status: 200 }),
      new Response(JSON.stringify({ access_token: 'TESTE-SIMULADO-A2', refresh_token: 'TESTE-SIMULADO-R2', expires_in: 15552000, user_id: 42, live_mode: false }), { status: 200 }),
      new Response(JSON.stringify({ error: 'invalid_grant', message: 'TESTE-SIMULADO-SEGREDO-APP' }), { status: 400 }),
    ];
    const buscar = (async (url: string, init: RequestInit) => { pedidos.push({ url, init }); return respostas.shift()!; }) as unknown as typeof fetch;
    const mp = criarProvedorMercadoPago({ buscar, baseUrl: 'https://mp.exemplo.invalid' });
    expect(await mp.trocarCodigo(app, 'TG-1', 'v'.repeat(64))).toEqual({ accessToken: 'TESTE-SIMULADO-A', refreshToken: 'TESTE-SIMULADO-R', expiraEmSegundos: 15552000, contaProvedorId: '42', liveMode: false });
    expect(pedidos[0]!.url).toBe('https://mp.exemplo.invalid/oauth/token');
    expect(pedidos[0]!.init.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/json' });
    expect(JSON.parse(String(pedidos[0]!.init.body))).toEqual({ client_id: 'cliente-simulado', client_secret: 'TESTE-SIMULADO-SEGREDO-APP', grant_type: 'authorization_code', code: 'TG-1', redirect_uri: 'https://api.exemplo.invalid/retorno', code_verifier: 'v'.repeat(64), test_token: 'false' });
    expect((await mp.renovarToken(app, 'TESTE-SIMULADO-R')).refreshToken).toBe('TESTE-SIMULADO-R2');
    expect(JSON.parse(String(pedidos[1]!.init.body))).toEqual({ client_id: 'cliente-simulado', client_secret: 'TESTE-SIMULADO-SEGREDO-APP', grant_type: 'refresh_token', refresh_token: 'TESTE-SIMULADO-R' });
    const erro = await mp.renovarToken(app, 'TESTE-SIMULADO-R2').catch((e: unknown) => e);
    expect(erro).toMatchObject({ tipo: 'concessao_invalida', status: 400, codigo: 'invalid_grant' });
    expect(String((erro as Error).message)).not.toContain('TESTE-SIMULADO');
  });

  it('URL de autorização com state e PKCE S256 (RFC 7636)', () => {
    // Vetor do apêndice B da RFC 7636.
    expect(desafioPkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    const url = new URL(urlAutorizacao(app, 'estado-x', null));
    expect([...url.searchParams.keys()].sort()).toEqual(['client_id', 'platform_id', 'redirect_uri', 'response_type', 'state']);
  });
});
