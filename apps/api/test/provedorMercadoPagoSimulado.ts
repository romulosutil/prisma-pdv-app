import {
  centavosParaValor, ErroProvedorMp, lerPedido, type PedidoMercadoPago, type PedidoPixEntrada, type ProvedorMercadoPago,
} from '../src/pagamentos/mercadoPago';

/**
 * Mercado Pago simulado para os testes (sem rede). Imita as regras documentadas da Orders API:
 * idempotência por `X-Idempotency-Key` (mesmo corpo → mesma order; outro corpo → 409), token do vendedor
 * dono da order, cancelamento só de `created`/`action_required`. O roteiro de cada order é ajustável.
 * As respostas passam por `lerPedido`, o mesmo leitor do cliente real.
 */
type Operacao = 'validar' | 'criar' | 'consultar' | 'cancelar';

interface OrderSimulada {
  corpo: Record<string, any>;
  token: string;
  chave: string;
  entrada: PedidoPixEntrada;
}

export class ProvedorMercadoPagoSimulado implements ProvedorMercadoPago {
  readonly orders = new Map<string, OrderSimulada>();
  readonly chaves = new Map<string, string>();
  readonly chamadas: { operacao: Operacao; pedidoId?: string; chave?: string }[] = [];
  readonly tokensValidos = new Set<string>();
  private readonly falhas: { operacao: Operacao; erro: Error; criarAntes?: boolean }[] = [];
  private contador = 0;

  /** Próxima chamada da operação falha. `criarAntes`: a order nasce no provedor e a resposta se perde (timeout). */
  falharProxima(operacao: Operacao, erro: Error = new ErroProvedorMp('indisponivel', 503, 'internal_error'), criarAntes = false): void {
    this.falhas.push({ operacao, erro, criarAntes });
  }

  private falha(operacao: Operacao) {
    const i = this.falhas.findIndex((f) => f.operacao === operacao);
    return i < 0 ? undefined : this.falhas.splice(i, 1)[0];
  }

  private exigirToken(token: string): void {
    if (!this.tokensValidos.has(token)) throw new ErroProvedorMp('credencial_invalida', 401, 'unauthorized');
  }

  private order(token: string, id: string): OrderSimulada {
    const o = this.orders.get(id);
    // Order de outro vendedor não existe para este token.
    if (!o || o.token !== token) throw new ErroProvedorMp('nao_encontrado', 404, 'order_not_found');
    return o;
  }

  private copia(o: OrderSimulada): PedidoMercadoPago {
    return lerPedido(structuredClone(o.corpo));
  }

  async validarCredencial(token: string) {
    this.chamadas.push({ operacao: 'validar' });
    const f = this.falha('validar');
    if (f) throw f.erro;
    this.exigirToken(token);
    return { contaProvedorId: `vendedor-${token.slice(-4)}` };
  }

  async criarPedidoPix(token: string, chave: string, entrada: PedidoPixEntrada) {
    this.chamadas.push({ operacao: 'criar', chave });
    const f = this.falha('criar');
    if (f && !f.criarAntes) throw f.erro;
    this.exigirToken(token);
    const existente = this.chaves.get(chave);
    if (existente) {
      const o = this.orders.get(existente)!;
      if (JSON.stringify(o.entrada) !== JSON.stringify(entrada)) throw new ErroProvedorMp('idempotencia_conflito', 409, 'idempotency_key_already_used');
      if (f) throw f.erro;
      return this.copia(o);
    }
    this.contador += 1;
    const id = `ORD01SIMULADO${String(this.contador).padStart(6, '0')}`;
    const valor = centavosParaValor(entrada.valorCentavos);
    const corpo = {
      id, type: 'online', processing_mode: 'automatic', external_reference: entrada.referenciaExterna,
      total_amount: valor, status: 'action_required', status_detail: 'waiting_transfer',
      transactions: { payments: [{ id: `PAY01SIMULADO${this.contador}`, amount: valor, status: 'action_required', status_detail: 'waiting_transfer',
        date_of_expiration: '2026-03-10T12:30:00.000Z',
        payment_method: { id: 'pix', type: 'bank_transfer', qr_code: `00020126SIMULADO${this.contador}`, qr_code_base64: 'iVBORw0KGgoSIMULADO', ticket_url: `https://exemplo.invalid/pix/${this.contador}` } }] },
    };
    const o = { corpo, token, chave, entrada };
    this.orders.set(id, o);
    this.chaves.set(chave, id);
    if (f) throw f.erro;
    return this.copia(o);
  }

  async consultarPedido(token: string, id: string) {
    this.chamadas.push({ operacao: 'consultar', pedidoId: id });
    const f = this.falha('consultar');
    if (f) throw f.erro;
    this.exigirToken(token);
    return this.copia(this.order(token, id));
  }

  async cancelarPedido(token: string, id: string, chave: string) {
    this.chamadas.push({ operacao: 'cancelar', pedidoId: id, chave });
    const f = this.falha('cancelar');
    if (f) throw f.erro;
    this.exigirToken(token);
    const o = this.order(token, id);
    if (o.corpo.status === 'canceled') throw new ErroProvedorMp('ja_cancelado', 409, 'order_already_canceled');
    if (o.corpo.status !== 'created' && o.corpo.status !== 'action_required') throw new ErroProvedorMp('nao_cancelavel', 409, 'cannot_cancel_order');
    this.definir(id, 'canceled', 'canceled_transaction');
    return this.copia(o);
  }

  // ---------- Roteiro ----------

  idDaChave(chave: string): string {
    const id = this.chaves.get(chave);
    if (!id) throw new Error(`Nenhuma order para a chave ${chave}`);
    return id;
  }

  definir(id: string, status: string, detalhe: string, extras: Record<string, unknown> = {}): void {
    const o = this.orders.get(id)!;
    Object.assign(o.corpo, { status, status_detail: detalhe, ...extras });
    const pagamento = o.corpo.transactions.payments[0];
    Object.assign(pagamento, { status, status_detail: detalhe });
  }

  /** Pagamento creditado; `valorPagoCentavos` diferente do total simula valor divergente. */
  aprovar(id: string, valorPagoCentavos?: number): void {
    const o = this.orders.get(id)!;
    const pago = valorPagoCentavos === undefined ? o.corpo.total_amount : centavosParaValor(valorPagoCentavos);
    this.definir(id, 'processed', 'accredited', { total_paid_amount: pago });
    o.corpo.transactions.payments[0].paid_amount = pago;
  }

  expirar(id: string): void { this.definir(id, 'canceled', 'expired'); }
}
