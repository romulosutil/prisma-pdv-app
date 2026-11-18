import type { BillingProvider, Relogio } from '@pdv/shared';
import type { Db } from './db/conexao';
import type { FonteEan } from './fontes/fonte';
import type { EmissaoCodigo } from './email/tiposEntrega';
import type { CifradorPagamentos } from './pagamentos/cifrador';
import type { ProvedorMercadoPago } from './pagamentos/mercadoPago';
import type { ConfiguracaoOAuthMercadoPago } from './configuracao';

/** Pagamentos integrados (N2). Sem `cifrador` (chave ausente), as rotas respondem 503 `pagamentos_indisponiveis`. */
export interface ConfigPagamentos {
  cifrador: CifradorPagamentos | null;
  mercadoPago: ProvedorMercadoPago;
  /** `payer.email` da order; sem ele a cobrança não é criada (503 `pagador_nao_configurado`). */
  pagadorEmail: string | null;
  /** Só em homologação com a conta de teste (`APRO`). Nunca configurado em produção. */
  pagadorPrimeiroNome?: string | null;
  /** Intervalo mínimo entre consultas ao provedor pela rota de acompanhamento; o padrão é 3 s. */
  consultaMinimaMs?: number;
  /** Aplicação da plataforma para o OAuth; `null`/ausente = rotas OAuth respondem 503 `oauth_indisponivel`. */
  oauth?: ConfiguracaoOAuthMercadoPago | null;
}

export interface Deps {
  db: Db;
  relogio: Relogio;
  billing: BillingProvider;
  /** Concede acesso sem assinatura paga; não habilita mock em produção. */
  cobrancaDesativada?: boolean;
  emissaoCodigo?: EmissaoCodigo;
  /** Fontes externas do catálogo por EAN, na ordem de consulta (o catálogo próprio vem sempre antes). */
  fontesEan: FonteEan[];
  /** Orçamento total da consulta externa em ms; o padrão é 2000. Existe para os testes não esperarem 2 s. */
  orcamentoEanMs?: number;
  /** Teto de cada fonte externa em ms; o padrão é 1200. */
  timeoutPorFonteEanMs?: number;
  /** Validade do cache negativo (EAN que nenhuma fonte conhece) em ms; o padrão é 10 min. */
  cacheNegativoEanMs?: number;
  pagamentos?: ConfigPagamentos;
}
