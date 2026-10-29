import type { BillingProvider, Relogio } from '@pdv/shared';
import type { Db } from './db/conexao';
import type { FonteEan } from './fontes/fonte';
import type { EmissaoCodigo } from './email/tiposEntrega';

export interface Deps {
  db: Db;
  relogio: Relogio;
  billing: BillingProvider;
  emissaoCodigo?: EmissaoCodigo;
  /** Fontes externas do catálogo por EAN, na ordem de consulta (o catálogo próprio vem sempre antes). */
  fontesEan: FonteEan[];
  /** Orçamento total da consulta externa em ms; o padrão é 2000. Existe para os testes não esperarem 2 s. */
  orcamentoEanMs?: number;
}
