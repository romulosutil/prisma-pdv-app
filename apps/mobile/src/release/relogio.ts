import type { Relogio } from '@pdv/shared';
import { Persistido } from '@/dados/observavel';
import type { Armazenamento } from '@/dados/armazenamento';
const CHAVE_HORA_SERVIDOR = 'relogio_servidor_v1';
type Referencia = { servidorEm: number; aparelhoEm: number };
/** Hora real da API ancorada ao aparelho; nunca reaplica o deslocamento da demo. */
export class RelogioApp extends Persistido<number> implements Relogio {
  private referencia: Referencia | null = null;
  private carregamentoHora: Promise<void> | null = null;
  private filaHora: Promise<void> = Promise.resolve();
  constructor(private readonly baseHora: Armazenamento) { super(baseHora, 'relogio_dias', 0); }
  private carregarHora(): Promise<void> {
    return this.carregamentoHora ??= (async () => {
      const r = await this.baseHora.obter<Referencia>(CHAVE_HORA_SERVIDOR);
      if (r && Number.isSafeInteger(r.servidorEm) && Number.isSafeInteger(r.aparelhoEm)) this.referencia = r;
    })();
  }
  override async carregar(): Promise<void> { await super.carregar(); await this.carregarHora(); }
  agora(): Date {
    return new Date(Date.now() + (this.referencia ? this.referencia.servidorEm - this.referencia.aparelhoEm : 0));
  }
  sincronizarServidor(horaIso: string, recebidaEm: number): Promise<void> {
    const servidorEm = Date.parse(horaIso);
    if (!Number.isSafeInteger(servidorEm) || !Number.isSafeInteger(recebidaEm)) return Promise.resolve();
    const tarefa = this.filaHora.then(async () => {
      await this.carregarHora();
      // Uma resposta atrasada não faz o relógio voltar depois de uma amostra mais recente.
      if (this.referencia && servidorEm <= this.referencia.servidorEm) return;
      // Variação de latência também não deve provocar retrocesso aparente offline.
      const estimada = recebidaEm + (this.referencia ? this.referencia.servidorEm - this.referencia.aparelhoEm : 0);
      // Diferença maior exige voltar à fonte real, em vez de perpetuar um salto do aparelho.
      const hora = this.referencia && estimada - servidorEm <= 5000 ? Math.max(servidorEm, estimada) : servidorEm;
      const referencia = { servidorEm: hora, aparelhoEm: recebidaEm };
      await this.baseHora.gravar(CHAVE_HORA_SERVIDOR, referencia);
      this.referencia = referencia;
    });
    this.filaHora = tarefa.catch(() => undefined);
    return tarefa;
  }
  async avancarDias(_dias: number): Promise<void> { throw new Error('Alteração de relógio indisponível.'); }
  async voltarAoNormal(): Promise<void> { await this.modificar(() => 0); }
}
