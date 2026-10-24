import { RelogioFalso } from '@pdv/shared';

/**
 * Relógio do servidor em desenvolvimento: anda em tempo real e aceita saltos de
 * `avancarDias` (rota /dev/relogio/avancar), para ver teste -> cobrança -> falha sem esperar.
 */
export class RelogioDeDesenvolvimento extends RelogioFalso {
  private readonly inicioReal = Date.now();

  constructor() {
    super(new Date());
  }

  override agora(): Date {
    return new Date(super.agora().getTime() + (Date.now() - this.inicioReal));
  }
}
