import { describe, expect, it } from 'vitest';
import { CobrancaPixSchema, ConectarMercadoPagoReqSchema, ConexaoMercadoPagoSchema, CriarCobrancaPixReqSchema, ESTADOS_COBRANCA_PIX } from '../src/contrato';

const id = '00000000-0000-4000-8000-000000000001';

describe('contrato do Pix do Mercado Pago', () => {
  it('conexão: só token e segredo opcionais, sem espaços e sem campos extras; a resposta não tem credencial', () => {
    expect(ConectarMercadoPagoReqSchema.parse({ accessToken: ' TESTE-SIMULADO-0001 ' })).toEqual({ accessToken: 'TESTE-SIMULADO-0001' });
    expect(ConectarMercadoPagoReqSchema.safeParse({ accessToken: 'curto' }).success).toBe(false);
    expect(ConectarMercadoPagoReqSchema.safeParse({ accessToken: 'TESTE SIMULADO 0001' }).success).toBe(false);
    expect(ConectarMercadoPagoReqSchema.safeParse({ accessToken: 'TESTE-SIMULADO-0001', lojaId: id }).success).toBe(false);
    expect(Object.keys(ConexaoMercadoPagoSchema.shape).sort()).toEqual(['atualizadaEm', 'conectada', 'conectadaEm', 'modo', 'reautorizacaoNecessaria', 'temSegredoWebhook', 'webhookPath']);
  });

  it('cobrança: ids UUID e valor positivo em centavos; estados fechados', () => {
    expect(CriarCobrancaPixReqSchema.safeParse({ vendaId: id, pagamentoId: id, valorCentavos: 700 }).success).toBe(true);
    for (const valorCentavos of [0, -1, 1.5]) expect(CriarCobrancaPixReqSchema.safeParse({ vendaId: id, pagamentoId: id, valorCentavos }).success).toBe(false);
    expect(CriarCobrancaPixReqSchema.safeParse({ vendaId: 'x', pagamentoId: id, valorCentavos: 1 }).success).toBe(false);
    expect(ESTADOS_COBRANCA_PIX).toEqual(['criando', 'erro_provedor', 'aguardando', 'expirada', 'cancelada', 'paga', 'paga_tardia', 'divergente']);
    const agora = new Date().toISOString();
    const cobranca = { id, vendaId: id, estado: 'paga', valorCentavos: 700, valorPagoCentavos: 700, pix: null, expiraEm: agora, pagaEm: agora, vinculadaEm: null, alerta: null, criadaEm: agora, atualizadaEm: agora };
    expect(CobrancaPixSchema.parse(cobranca)).toEqual(cobranca);
    expect(CobrancaPixSchema.safeParse({ ...cobranca, token: 'x' }).success).toBe(false);
  });
});
