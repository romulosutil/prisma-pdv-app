import {
  centavosParaValor, ErroProvedorMp, lerPedido, lerTokens, type AplicacaoOAuth, type PedidoMercadoPago, type PedidoPixEntrada, type PedidoPointEntrada, type ProvedorMercadoPago,
} from '../src/pagamentos/mercadoPago';

/**
 * Mercado Pago simulado para os testes (sem rede). Imita as regras documentadas da Orders API:
 * idempotência por `X-Idempotency-Key` (mesmo corpo → mesma order; outro corpo → 409), token do vendedor
 * dono da order, cancelamento só de `created`/`action_required`. O roteiro de cada order é ajustável.
 * As respostas passam por `lerPedido`, o mesmo leitor do cliente real.
 */
type Operacao = 'validar' | 'criar' | 'consultar' | 'cancelar' | 'trocar' | 'renovar';

interface OrderSimulada {
  corpo: Record<string, any>;
  token: string;
  chave: string;
  entrada: PedidoPixEntrada | PedidoPointEntrada;
}

export class ProvedorMercadoPagoSimulado implements ProvedorMercadoPago {
  readonly orders = new Map<string, OrderSimulada>();
  readonly chaves = new Map<string, string>();
  readonly chamadas: { operacao: Operacao; pedidoId?: string; chave?: string }[] = [];
  readonly tokensValidos = new Set<string>();
  readonly terminaisPoint = new Map<string, string[]>();
  private readonly falhas: { operacao: Operacao; erro: Error; criarAntes?: boolean }[] = [];
  private contador = 0;

  // ---------- OAuth simulado ----------
  /** `code` → dados do vendedor que autorizou (o code só vale uma vez, como no Mercado Pago). */
  readonly codigos = new Map<string, { usuario: string; codeChallenge: string | null }>();
  /** refresh token válido → usuário; gira a cada renovação (o antigo deixa de valer). */
  readonly refreshValidos = new Map<string, string>();
  readonly trocas: { codigo: string; codeVerifier: string | null; clientId: string; testToken: boolean }[] = [];
  readonly renovacoes: string[] = [];
  /** Atraso artificial da renovação, para os testes de concorrência. */
  atrasoRenovacaoMs = 0;
  private emitidos = 0;

  /** O que a tela de autorização faria: gera um `code` para este usuário, guardando o desafio PKCE recebido. */
  autorizar(urlAutorizacao: string, usuario = '123456789'): { code: string; state: string } {
    const url = new URL(urlAutorizacao);
    const code = `TG-SIMULADO-${++this.emitidos}`;
    this.codigos.set(code, { usuario, codeChallenge: url.searchParams.get('code_challenge') });
    return { code, state: url.searchParams.get('state')! };
  }

  private emitir(usuario: string) {
    const n = ++this.emitidos;
    const accessToken = `TESTE-SIMULADO-OAUTH-ACESSO-${n}`;
    const refreshToken = `TESTE-SIMULADO-OAUTH-REFRESH-${n}`;
    this.tokensValidos.add(accessToken);
    this.refreshValidos.set(refreshToken, usuario);
    this.donoDoToken.set(accessToken, usuario);
    return lerTokens({ access_token: accessToken, token_type: 'bearer', expires_in: 15552000, scope: 'read write offline_access', user_id: Number(usuario), refresh_token: refreshToken, public_key: 'APP_PUB-SIMULADO', live_mode: false });
  }

  /** Tokens do mesmo vendedor (antes e depois da renovação) enxergam as mesmas orders. */
  readonly donoDoToken = new Map<string, string>();

  async trocarCodigo(app: AplicacaoOAuth, codigo: string, codeVerifier: string | null) {
    this.trocas.push({ codigo, codeVerifier, clientId: app.clientId, testToken: app.testToken });
    const f = this.falha('trocar');
    if (f) throw f.erro;
    const dados = this.codigos.get(codigo);
    this.codigos.delete(codigo);
    if (!dados) throw new ErroProvedorMp('concessao_invalida', 400, 'invalid_grant');
    if (dados.codeChallenge) {
      const { createHash } = await import('node:crypto');
      if (!codeVerifier || createHash('sha256').update(codeVerifier).digest('base64url') !== dados.codeChallenge) throw new ErroProvedorMp('concessao_invalida', 400, 'invalid_grant');
    }
    return this.emitir(dados.usuario);
  }

  async renovarToken(_app: AplicacaoOAuth, refreshToken: string) {
    this.renovacoes.push(refreshToken);
    if (this.atrasoRenovacaoMs) await new Promise((ok) => setTimeout(ok, this.atrasoRenovacaoMs));
    const f = this.falha('renovar');
    if (f) throw f.erro;
    const usuario = this.refreshValidos.get(refreshToken);
    if (!usuario) throw new ErroProvedorMp('concessao_invalida', 400, 'invalid_grant');
    this.refreshValidos.delete(refreshToken);
    return this.emitir(usuario);
  }

  /** Revoga o access token (como troca de senha do vendedor): a próxima chamada recebe 401. */
  revogarAcesso(token: string): void { this.tokensValidos.delete(token); }

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
    // Order de outro vendedor não existe para este token (tokens renovados do mesmo vendedor continuam valendo).
    const mesmoVendedor = o && (o.token === token || (this.donoDoToken.get(token) !== undefined && this.donoDoToken.get(token) === this.donoDoToken.get(o.token)));
    if (!o || !mesmoVendedor) throw new ErroProvedorMp('nao_encontrado', 404, 'order_not_found');
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
    return this.criarPedido(token, chave, entrada);
  }

  async listarTerminaisPoint(token: string) {
    this.exigirToken(token);
    return (this.terminaisPoint.get(token) ?? []).map((id) => ({ id }));
  }

  async criarPedidoPoint(token: string, chave: string, entrada: PedidoPointEntrada) {
    if (!(this.terminaisPoint.get(token) ?? []).includes(entrada.terminalId)) throw new ErroProvedorMp('acesso_negado', 403);
    return this.criarPedido(token, chave, entrada);
  }

  private criarPedido(token: string, chave: string, entrada: PedidoPixEntrada | PedidoPointEntrada) {
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
    const point = 'terminalId' in entrada ? entrada : null;
    const corpo = {
      id, type: point ? 'point' : 'online', processing_mode: 'automatic', external_reference: entrada.referenciaExterna,
      total_amount: valor, status: point ? 'created' : 'action_required', status_detail: point ? 'created' : 'waiting_transfer',
      ...(point ? { config: { point: { terminal_id: point.terminalId } } } : {}),
      transactions: { payments: [{ id: `PAY01SIMULADO${this.contador}`, amount: valor, status: 'action_required', status_detail: 'waiting_transfer',
        date_of_expiration: '2026-03-10T12:30:00.000Z',
        payment_method: point ? { type: point.tipo } : { id: 'pix', type: 'bank_transfer', qr_code: `00020126SIMULADO${this.contador}`, qr_code_base64: 'iVBORw0KGgoSIMULADO', ticket_url: `https://exemplo.invalid/pix/${this.contador}` } }] },
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

  async cancelarPedido(token: string, id: string, chave: string, noTerminal?: boolean) {
    this.chamadas.push({ operacao: 'cancelar', pedidoId: id, chave });
    const f = this.falha('cancelar');
    if (f) throw f.erro;
    this.exigirToken(token);
    const o = this.order(token, id);
    if (noTerminal && o.corpo.status === 'at_terminal') {
      o.corpo.transactions.payments[0].status_detail = 'cancellation_requested';
      return this.copia(o);
    }
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
