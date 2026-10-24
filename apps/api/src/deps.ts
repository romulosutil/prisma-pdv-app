import type { BillingProvider, Relogio } from '@pdv/shared';
import type { Db } from './db/conexao';

export interface Deps {
  db: Db;
  relogio: Relogio;
  billing: BillingProvider;
}
