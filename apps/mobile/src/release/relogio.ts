import type { Relogio } from '@pdv/shared';
import { Persistido } from '@/dados/observavel';
import type { Armazenamento } from '@/dados/armazenamento';
/** Deslocamentos legados de demonstração nunca afetam sessão/licença em release conectado. */
export class RelogioApp extends Persistido<number> implements Relogio {
  constructor(armazenamento: Armazenamento) { super(armazenamento, 'relogio_dias', 0); }
  agora(): Date { return new Date(); }
  async avancarDias(_dias: number): Promise<void> { throw new Error('Alteração de relógio indisponível.'); }
  async voltarAoNormal(): Promise<void> { await this.modificar(() => 0); }
}
