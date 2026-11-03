import { MS_POR_DIA, type Relogio } from '@pdv/shared';
import type { Armazenamento } from './armazenamento';
import { Persistido } from './observavel';

/**
 * Relógio do app: hora do sistema mais um deslocamento em dias, persistido. O deslocamento só
 * existe para o "Relógio de teste" (dev), que avança o tempo para ver teste → cobrança → falha.
 * O valor observável é o deslocamento em dias.
 */
export class RelogioApp extends Persistido<number> implements Relogio {
  constructor(armazenamento: Armazenamento) {
    super(armazenamento, 'relogio_dias', 0);
  }

  agora(): Date {
    return new Date(Date.now() + this.obter() * MS_POR_DIA);
  }

  async avancarDias(dias: number): Promise<void> {
    await this.modificar((atual) => atual + dias);
  }

  async voltarAoNormal(): Promise<void> {
    await this.modificar(() => 0);
  }

  /** A demo usa relógio de teste; o Metro fornece a implementação real nos perfis conectados. */
  async sincronizarServidor(_horaIso: string, _recebidaEm: number): Promise<void> {}
}
