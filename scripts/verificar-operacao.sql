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
-- Filas (monitoramento diário): somente contagens e idades em minutos/horas; sem e-mail, código, envelope ou mensagem.
SELECT count(*) FILTER (WHERE estado IN ('pendente','enviando') AND criado_em < now() - interval '15 minutes') AS email_na_fila_mais_15min,
  coalesce(round(extract(epoch FROM now() - min(criado_em) FILTER (WHERE estado IN ('pendente','enviando'))) / 60), 0) AS email_idade_max_fila_min,
  count(*) FILTER (WHERE estado = 'falhou' AND atualizado_em > now() - interval '24 hours') AS email_falhou_24h,
  count(*) FILTER (WHERE estado = 'aceita' AND atualizado_em > now() - interval '24 hours') AS email_aceito_smtp_24h
FROM entregas_codigo;
SELECT count(*) FILTER (WHERE estado = 'aberto') AS suporte_aberto,
  count(*) FILTER (WHERE estado = 'aberto' AND criado_em < now() - interval '24 hours') AS suporte_aberto_mais_24h,
  coalesce(round(extract(epoch FROM now() - min(criado_em) FILTER (WHERE estado = 'aberto')) / 3600), 0) AS suporte_idade_max_aberto_h,
  count(*) FILTER (WHERE estado = 'em_analise') AS suporte_em_analise
FROM solicitacoes_suporte;
SELECT tipo, estado, count(*) AS quantidade, min(criado_em) AS mais_antiga
FROM solicitacoes_suporte GROUP BY tipo, estado ORDER BY tipo, estado;
SELECT count(*) AS protocolos_concluidos_expirados FROM solicitacoes_suporte
WHERE estado = 'concluido' AND atualizado_em < now() - interval '90 days';
SELECT count(*) AS reservas_ativas FROM caixas WHERE reservado AND fechado_em IS NULL;
COMMIT;
