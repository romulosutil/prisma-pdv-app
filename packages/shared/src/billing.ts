import { BANDEIRAS, cvvValido, detectarBandeira, luhnValido, validadeValida, type Bandeira } from './cartao';
import type { Centavos } from './dinheiro';

export type MotivoRecusa = 'token_invalido' | 'cartao_recusado' | 'valor_invalido';

export type ResultadoVerificacao =
  | { ok: true; clienteRef: string; fingerprint: string; bandeira: Bandeira; ultimos4: string }
  | { ok: false; motivo: MotivoRecusa };

export type ResultadoCobranca = { ok: true; transacaoId: string } | { ok: false; motivo: MotivoRecusa };

export interface PedidoCobranca {
  clienteRef: string;
  valorCentavos: Centavos;
  descricao: string;
  chaveIdempotencia: string;
}

/** Contrato com o gateway (Mock na versão de testes; Stripe/Asaas em produção). */
export interface BillingProvider {
  /** Autorização de valor zero: recusou = o teste não começa. */
  verificarCartao(token: string): Promise<ResultadoVerificacao>;
  cobrar(pedido: PedidoCobranca): Promise<ResultadoCobranca>;
  estornar(transacaoId: string): Promise<{ ok: boolean }>;
}

export const CARTOES_TESTE = {
  aprova: { numero: '4242 4242 4242 4242', descricao: 'Aprova verificação e cobranças' },
  recusaVerificacao: { numero: '4000 0000 0000 0002', descricao: 'Recusa já na verificação' },
  recusaCobranca: { numero: '4000 0000 0000 0341', descricao: 'Verifica, mas recusa as cobranças' },
} as const;

type ComportamentoMock = 'aprova' | 'recusa_verificacao' | 'recusa_cobranca';

const semEspacos = (numero: string): string => numero.replace(/\D/g, '');

function comportamentoDoNumero(digitos: string): ComportamentoMock {
  if (digitos === semEspacos(CARTOES_TESTE.recusaVerificacao.numero)) return 'recusa_verificacao';
  if (digitos === semEspacos(CARTOES_TESTE.recusaCobranca.numero)) return 'recusa_cobranca';
  return 'aprova';
}

export type DadosCartao = { numero: string; validade: string; cvv: string; nome: string };

export type ResultadoTokenizacao =
  | { ok: true; token: string; bandeira: Bandeira; ultimos4: string }
  | { ok: false; motivo: 'numero_invalido' | 'validade_invalida' | 'cvv_invalido' | 'nome_invalido' };

/**
 * Simula o SDK do gateway rodando no app: valida o cartão e devolve um token.
 * O token carrega só bandeira, últimos 4 dígitos e o comportamento do mock.
 */
export function tokenizarCartaoMock(dados: DadosCartao, agora: Date): ResultadoTokenizacao {
  const digitos = semEspacos(dados.numero);
  if (!luhnValido(digitos)) return { ok: false, motivo: 'numero_invalido' };
  const bandeira = detectarBandeira(digitos);
  if (!validadeValida(dados.validade, agora)) return { ok: false, motivo: 'validade_invalida' };
  if (!cvvValido(dados.cvv, bandeira)) return { ok: false, motivo: 'cvv_invalido' };
  if (dados.nome.trim().length < 2) return { ok: false, motivo: 'nome_invalido' };

  const ultimos4 = digitos.slice(-4);
  return { ok: true, token: `tok_mock_${bandeira}_${ultimos4}_${comportamentoDoNumero(digitos)}`, bandeira, ultimos4 };
}

const FORMATO_TOKEN = new RegExp(
  `^tok_mock_(${BANDEIRAS.join('|')})_(\\d{4})_(aprova|recusa_verificacao|recusa_cobranca)$`,
);

function lerToken(token: string): { bandeira: Bandeira; ultimos4: string; comportamento: ComportamentoMock } | null {
  const m = FORMATO_TOKEN.exec(token);
  if (!m) return null;
  return { bandeira: m[1] as Bandeira, ultimos4: m[2] as string, comportamento: m[3] as ComportamentoMock };
}

export interface Transacao {
  id: string;
  tipo: 'verificacao' | 'cobranca';
  clienteRef: string;
  valorCentavos: Centavos;
  descricao: string;
  chaveIdempotencia: string | null;
  ok: boolean;
  motivo: MotivoRecusa | null;
  estornada: boolean;
}

/** Gateway em memória. No mock, `clienteRef` é o próprio token do cartão. */
export class MockBillingProvider implements BillingProvider {
  private readonly log: Transacao[] = [];
  private readonly porChave = new Map<string, ResultadoCobranca>();
  private falhasPendentes = 0;

  get transacoes(): readonly Readonly<Transacao>[] {
    return this.log;
  }

  /** As próximas `n` cobranças (chaves novas) serão recusadas, qualquer que seja o cartão. */
  falharProximasCobrancas(n: number): void {
    this.falhasPendentes = n;
  }

  async verificarCartao(token: string): Promise<ResultadoVerificacao> {
    const lido = lerToken(token);
    let motivo: MotivoRecusa | null = null;
    if (!lido) motivo = 'token_invalido';
    else if (lido.comportamento === 'recusa_verificacao') motivo = 'cartao_recusado';
    this.registrar({ tipo: 'verificacao', clienteRef: token, valorCentavos: 0, descricao: 'Verificação de cartão', chaveIdempotencia: null, motivo });
    if (motivo || !lido) return { ok: false, motivo: motivo ?? 'token_invalido' };
    return {
      ok: true,
      clienteRef: token,
      fingerprint: `fp_${lido.bandeira}_${lido.ultimos4}`,
      bandeira: lido.bandeira,
      ultimos4: lido.ultimos4,
    };
  }

  async cobrar(pedido: PedidoCobranca): Promise<ResultadoCobranca> {
    const anterior = this.porChave.get(pedido.chaveIdempotencia);
    if (anterior) return anterior;

    const lido = lerToken(pedido.clienteRef);
    let motivo: MotivoRecusa | null = null;
    if (!Number.isSafeInteger(pedido.valorCentavos) || pedido.valorCentavos <= 0) {
      motivo = 'valor_invalido';
    } else if (!lido) {
      motivo = 'token_invalido';
    } else if (this.falhasPendentes > 0) {
      this.falhasPendentes -= 1;
      motivo = 'cartao_recusado';
    } else if (lido.comportamento !== 'aprova') {
      motivo = 'cartao_recusado';
    }

    const transacao = this.registrar({ tipo: 'cobranca', clienteRef: pedido.clienteRef, valorCentavos: pedido.valorCentavos, descricao: pedido.descricao, chaveIdempotencia: pedido.chaveIdempotencia, motivo });
    const resultado: ResultadoCobranca = motivo ? { ok: false, motivo } : { ok: true, transacaoId: transacao.id };
    this.porChave.set(pedido.chaveIdempotencia, resultado);
    return resultado;
  }

  async estornar(transacaoId: string): Promise<{ ok: boolean }> {
    const transacao = this.log.find((t) => t.id === transacaoId);
    if (!transacao || transacao.tipo !== 'cobranca' || !transacao.ok || transacao.estornada) return { ok: false };
    transacao.estornada = true;
    return { ok: true };
  }

  private registrar(dados: Omit<Transacao, 'id' | 'ok' | 'estornada'>): Transacao {
    const transacao: Transacao = {
      ...dados,
      id: `txn_mock_${this.log.length + 1}`,
      ok: dados.motivo === null,
      estornada: false,
    };
    this.log.push(transacao);
    return transacao;
  }
}
