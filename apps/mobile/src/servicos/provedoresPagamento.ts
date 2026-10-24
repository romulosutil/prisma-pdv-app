import { relogioSistema, type Centavos, type Relogio } from '@pdv/shared';
import type { ProvedorPagamento } from '@/dados/tipos';
import { gerarBrCodeDinamico } from '@/util/brcode';

export const VALIDADE_PIX_MS = 10 * 60 * 1000;
export const DURACAO_APROXIMACAO_MS = 2500;

export interface CobrancaPix {
  id: string;
  provedor: ProvedorPagamento;
  valorCentavos: Centavos;
  /** Pix "copia e cola" da cobrança (BR Code dinâmico). */
  copiaECola: string;
  expiraEm: Date;
}

export type SituacaoPix = 'aguardando' | 'pago' | 'expirado';

export interface CobrancaTap {
  id: string;
  provedor: ProvedorPagamento;
  valorCentavos: Centavos;
}

/** `nao_encontrado`: o provedor não tem pagamento para essa cobrança (cliente desistiu ou voltou sem concluir). */
export type SituacaoTap = 'aguardando' | 'aprovado' | 'nao_encontrado';

/**
 * Contrato do que o app precisa dos provedores integrados (InfinitePay, Mercado Pago). A versão de testes
 * usa o simulador abaixo; a integração real implementa esta mesma interface.
 */
export interface ProvedoresPagamento {
  criarCobrancaPix(pedido: { provedor: ProvedorPagamento; valorCentavos: Centavos; nomeRecebedor: string }): CobrancaPix;
  situacaoPix(id: string): SituacaoPix;
  iniciarTap(pedido: { provedor: ProvedorPagamento; valorCentavos: Centavos }): CobrancaTap;
  situacaoTap(id: string): SituacaoTap;
}

interface RegistroPix extends CobrancaPix {
  pagoEm: Date | null;
}

interface RegistroTap extends CobrancaTap {
  iniciadaEm: Date;
  abandonada: boolean;
}

/**
 * Simulador determinístico: o Pix só muda para "pago" quando `simularPagamentoPix` é chamado, e a
 * aproximação é aprovada sozinha após `duracaoAproximacaoMs`, a menos que `simularAbandonoTap` ocorra antes.
 */
export class SimuladorProvedores implements ProvedoresPagamento {
  private readonly pix = new Map<string, RegistroPix>();
  private readonly taps = new Map<string, RegistroTap>();
  private contador = 0;

  constructor(
    private readonly relogio: Relogio = relogioSistema,
    private readonly duracaoAproximacaoMs: number = DURACAO_APROXIMACAO_MS,
  ) {}

  criarCobrancaPix({ provedor, valorCentavos, nomeRecebedor }: { provedor: ProvedorPagamento; valorCentavos: Centavos; nomeRecebedor: string }): CobrancaPix {
    const id = this.proximoId('pix');
    const cobranca: RegistroPix = {
      id,
      provedor,
      valorCentavos,
      copiaECola: gerarBrCodeDinamico({
        url: `pix.simulado.invalid/${provedor}/cob/${id}`,
        valorCentavos,
        nomeRecebedor,
        cidade: 'BRASIL',
        txid: id,
      }),
      expiraEm: new Date(this.relogio.agora().getTime() + VALIDADE_PIX_MS),
      pagoEm: null,
    };
    this.pix.set(id, cobranca);
    return cobranca;
  }

  situacaoPix(id: string): SituacaoPix {
    const cobranca = this.pix.get(id);
    if (!cobranca) return 'expirado';
    if (cobranca.pagoEm) return 'pago';
    return this.relogio.agora() >= cobranca.expiraEm ? 'expirado' : 'aguardando';
  }

  /** Simula o banco confirmando o Pix (só tem efeito numa cobrança ainda válida). */
  simularPagamentoPix(id: string): void {
    const cobranca = this.pix.get(id);
    if (cobranca && this.situacaoPix(id) === 'aguardando') cobranca.pagoEm = this.relogio.agora();
  }

  iniciarTap({ provedor, valorCentavos }: { provedor: ProvedorPagamento; valorCentavos: Centavos }): CobrancaTap {
    const cobranca: RegistroTap = { id: this.proximoId('tap'), provedor, valorCentavos, iniciadaEm: this.relogio.agora(), abandonada: false };
    this.taps.set(cobranca.id, cobranca);
    return { id: cobranca.id, provedor, valorCentavos };
  }

  situacaoTap(id: string): SituacaoTap {
    const cobranca = this.taps.get(id);
    if (!cobranca || cobranca.abandonada) return 'nao_encontrado';
    return this.relogio.agora().getTime() - cobranca.iniciadaEm.getTime() >= this.duracaoAproximacaoMs ? 'aprovado' : 'aguardando';
  }

  /** Simula o vendedor voltando do app do provedor sem resultado. */
  simularAbandonoTap(id: string): void {
    const cobranca = this.taps.get(id);
    if (cobranca && this.situacaoTap(id) === 'aguardando') cobranca.abandonada = true;
  }

  private proximoId(prefixo: string): string {
    this.contador += 1;
    return `${prefixo}-${this.relogio.agora().getTime().toString(36)}-${this.contador}`;
  }
}

export const provedoresPagamento = new SimuladorProvedores();
