import {
  calcularProrata,
  desserializarAssinatura,
  desserializarLicenca,
  PLANOS,
  AssinaturaResSchema,
  type Assinatura,
  type AssinaturaRes,
  type Centavos,
  type Licenca,
  type PlanoId,
  type Relogio,
} from '@pdv/shared';
import type { Armazenamento } from '@/dados/armazenamento';
import { Observavel } from '@/dados/observavel';
import { registrar } from '@/diagnostico/registro';
import { ErroBackend, type Backend } from './backend';

export interface EstadoAssinatura {
  assinatura: Assinatura | null;
  /** Licença em cache: é ela que decide offline se pode abrir uma venda. */
  licenca: Licenca | null;
  /** Instante (relógio do app) da última sincronização; as telas usam como "agora". */
  agora: Date;
  /** true quando a última tentativa de falar com o servidor falhou e o app segue com o cache. */
  offline: boolean;
}

export interface PreviaTroca {
  planoId: PlanoId;
  efeito: 'agora' | 'proximo_ciclo';
  /** Cobrança proporcional no ato da confirmação (upgrade em plano ativo). */
  cobrancaAgoraCentavos: Centavos;
  vigenteEm: Date;
  novoPrecoCentavos: Centavos;
}

const CHAVE = 'assinatura';

/**
 * Assinatura e licença neste aparelho. Delega ao `Backend` (API ou `BackendLocal`) e guarda o
 * resultado para o app continuar decidindo offline. `sincronizar` roda ao abrir o app e a cada
 * volta ao primeiro plano: no modo demo é aí que o tempo é avaliado e as cobranças acontecem.
 */
export class AssinaturaServico extends Observavel<EstadoAssinatura> {
  constructor(
    private readonly armazenamento: Armazenamento,
    private readonly relogio: Relogio,
    private readonly backend: Backend,
    private readonly temSessao: () => boolean,
    private readonly obterContaId?: () => string | null,
  ) {
    super({ assinatura: null, licenca: null, agora: relogio.agora(), offline: false });
  }

  async carregar(): Promise<void> {
    const escopo = this.armazenamento.obterEscopo?.();
    const salvo = await this.armazenamento.obter<AssinaturaRes>(CHAVE);
    if (escopo !== this.armazenamento.obterEscopo?.()) throw new ErroBackend('conflito', 'A conta mudou durante a carga da licença.');
    if (salvo) { this.validarConta(salvo); this.aplicarEmMemoria(AssinaturaResSchema.parse(salvo)); }
    else this.limparMemoria();
  }

  async sincronizar(): Promise<void> {
    if (!this.temSessao()) return;
    const vinculo = this.vinculo();
    try {
      const res = await this.backend.obterAssinatura();
      if (vinculo !== this.vinculo()) return;
      if (res) await this.aplicar(res);
      else this.definir({ ...this.obter(), agora: this.relogio.agora(), offline: false });
    } catch (erro) {
      if (vinculo !== this.vinculo()) return;
      if (!(erro instanceof ErroBackend)) throw erro;
      const offline = erro.codigo === 'rede';
      if (offline !== this.obter().offline) registrar('assinatura', offline ? 'sem conexão: usando a licença em cache' : 'sincronização falhou', { codigo: erro.codigo });
      this.definir({ ...this.obter(), agora: this.relogio.agora(), offline });
    }
  }

  /** Cria a assinatura com 7 dias grátis. `tokenCartao` vem de `tokenizarCartaoMock` (ou do SDK do gateway). */
  async iniciarTeste(planoId: PlanoId, tokenCartao: string): Promise<void> {
    await this.alterar(() => this.backend.criarAssinatura({ planoId, tokenCartao }));
  }

  async trocarPlano(planoId: PlanoId): Promise<void> {
    await this.alterar(() => this.backend.trocarPlano(planoId));
  }

  async cancelar(): Promise<void> {
    await this.alterar(() => this.backend.cancelarAssinatura());
  }

  async reativar(planoId: PlanoId): Promise<void> {
    await this.alterar(() => this.backend.reativarAssinatura(planoId));
  }

  async atualizarCartao(tokenCartao: string): Promise<void> {
    await this.alterar(() => this.backend.atualizarCartao(tokenCartao));
  }

  /** O que a troca para `planoId` vai fazer, para mostrar antes de confirmar. `null` se não houver troca possível. */
  previaTroca(planoId: PlanoId): PreviaTroca | null {
    const { assinatura, agora } = this.obter();
    if (!assinatura || (assinatura.status !== 'em_teste' && assinatura.status !== 'ativa')) return null;
    if (planoId === assinatura.planoId && assinatura.planoAgendado === null) return null;
    const novoPrecoCentavos = PLANOS[planoId].precoMensalCentavos;
    const atual = PLANOS[assinatura.planoId].precoMensalCentavos;
    if (assinatura.status === 'ativa' && novoPrecoCentavos < atual) {
      return { planoId, efeito: 'proximo_ciclo', cobrancaAgoraCentavos: 0, vigenteEm: assinatura.periodoAtualFim, novoPrecoCentavos };
    }
    return { planoId, efeito: 'agora', cobrancaAgoraCentavos: calcularProrata(assinatura, planoId, agora), vigenteEm: agora, novoPrecoCentavos };
  }

  async limpar(): Promise<void> {
    const vinculo = this.vinculo();
    await this.armazenamento.remover(CHAVE);
    this.exigirVinculo(vinculo);
    this.limparMemoria();
  }

  limparMemoria(): void { this.definir({ assinatura: null, licenca: null, agora: this.relogio.agora(), offline: false }); }

  private vinculo(): string { return JSON.stringify([this.armazenamento.obterEscopo?.(), this.obterContaId?.()]); }
  private exigirVinculo(esperado: string): void { if (esperado !== this.vinculo()) throw new ErroBackend('conflito', 'A conta mudou durante a operação.'); }
  private async alterar(operacao: () => Promise<AssinaturaRes>): Promise<void> {
    const vinculo = this.vinculo();
    const resultado = await operacao();
    this.exigirVinculo(vinculo);
    await this.aplicar(resultado);
  }

  private validarConta(res: AssinaturaRes): void {
    if (this.obterContaId && res.assinatura.contaId !== this.obterContaId()) throw new ErroBackend('conflito', 'A licença recebida pertence a outra conta.');
  }

  private async aplicar(res: AssinaturaRes): Promise<void> {
    const escopo = this.armazenamento.obterEscopo?.();
    this.validarConta(res);
    await this.armazenamento.gravar(CHAVE, res);
    if (escopo !== this.armazenamento.obterEscopo?.()) throw new ErroBackend('conflito', 'A conta mudou durante a atualização da licença.');
    this.validarConta(res);
    this.aplicarEmMemoria(res);
  }

  private aplicarEmMemoria(res: AssinaturaRes): void {
    const anterior = this.obter().assinatura;
    const nova = desserializarAssinatura(res.assinatura);
    this.definir({
      assinatura: nova,
      licenca: desserializarLicenca(res.licenca),
      agora: this.relogio.agora(),
      offline: false,
    });
    if (anterior?.status !== nova.status || anterior?.planoId !== nova.planoId) {
      registrar('assinatura', 'assinatura mudou', {
        de: anterior ? { status: anterior.status, plano: anterior.planoId } : null,
        para: { status: nova.status, plano: nova.planoId, planoAgendado: nova.planoAgendado },
      });
    }
  }
}
