import type { Relogio } from '@pdv/shared';
import type { Armazenamento } from './armazenamento';

/** Dependências injetadas nos repositórios (nos testes entram versões em memória). */
export interface Ambiente {
  armazenamento: Armazenamento;
  relogio: Relogio;
  novoId: () => string;
}
