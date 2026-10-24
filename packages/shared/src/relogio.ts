export interface Relogio {
  agora(): Date;
}

export const relogioSistema: Relogio = {
  agora: () => new Date(),
};

/** Relógio controlável para testes e para o "relógio de teste" do modo dev. */
export class RelogioFalso implements Relogio {
  private instante: number;

  constructor(inicio: Date) {
    this.instante = inicio.getTime();
  }

  agora(): Date {
    return new Date(this.instante);
  }

  avancarDias(n: number): void {
    this.instante += n * 24 * 60 * 60 * 1000;
  }

  avancarHoras(n: number): void {
    this.instante += n * 60 * 60 * 1000;
  }

  definir(d: Date): void {
    this.instante = d.getTime();
  }
}
