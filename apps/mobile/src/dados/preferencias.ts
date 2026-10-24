import type { Armazenamento } from './armazenamento';
import { Persistido } from './observavel';
import type { ProvedorPagamento } from './tipos';

export interface Preferencias {
  bipe: boolean;
  vibrar: boolean;
  lanterna: boolean;
  /** Tempo em que o mesmo código lido é ignorado. */
  ignorarMesmoCodigoMs: 1000 | 1500 | 2000;
  /** Pausa a câmera parada após este tempo (poupa bateria). */
  pausarCameraSeg: 10 | 15 | 30;
  pixPadrao: ProvedorPagamento;
  conectados: Record<ProvedorPagamento, boolean>;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  bipe: true,
  vibrar: true,
  lanterna: false,
  ignorarMesmoCodigoMs: 1500,
  pausarCameraSeg: 15,
  pixPadrao: 'infinitepay',
  conectados: { infinitepay: false, mercadopago: false },
};

/** Ajustes do leitor e dos meios de recebimento (Ajustes → Leitor / Recebimentos). */
export class PreferenciasRepo extends Persistido<Preferencias> {
  constructor(armazenamento: Armazenamento) {
    super(armazenamento, 'preferencias', PREFERENCIAS_PADRAO);
  }

  async alterar(parcial: Partial<Preferencias>): Promise<void> {
    await this.modificar((atual) => ({ ...atual, ...parcial }));
  }

  async definirConexao(provedor: ProvedorPagamento, conectado: boolean): Promise<void> {
    await this.modificar((atual) => ({ ...atual, conectados: { ...atual.conectados, [provedor]: conectado } }));
  }
}
