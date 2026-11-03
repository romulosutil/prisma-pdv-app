-- Console PostgreSQL autorizado. Somente agregados; nunca imprimir envelopes, sessões ou mensagens.
\set ON_ERROR_STOP on
\pset pager off
BEGIN TRANSACTION READ ONLY;
SELECT now() AS coletado_em, current_database() AS banco;
SELECT count(*) AS migracoes FROM drizzle.__drizzle_migrations;
SELECT estado, count(*) AS quantidade, min(criado_em) AS mais_antiga,
  max(atualizado_em) AS ultima_atualizacao, max(tentativas) AS maior_tentativa
FROM entregas_codigo GROUP BY estado ORDER BY estado;
SELECT count(*) FILTER (WHERE estado IN ('pendente','enviando') AND expira_em < now()) AS email_expirado_na_fila,
  count(*) FILTER (WHERE estado = 'enviando' AND lease_expira_em < now()) AS lease_vencida,
  count(*) FILTER (WHERE estado = 'falhou' AND atualizado_em > now() - interval '24 hours') AS falhas_24h
FROM entregas_codigo;
SELECT tipo, estado, count(*) AS quantidade, min(criado_em) AS mais_antiga
FROM solicitacoes_suporte GROUP BY tipo, estado ORDER BY tipo, estado;
SELECT count(*) AS protocolos_concluidos_expirados FROM solicitacoes_suporte
WHERE estado = 'concluido' AND atualizado_em < now() - interval '90 days';
SELECT count(*) AS reservas_ativas FROM caixas WHERE reservado AND fechado_em IS NULL;
COMMIT;
