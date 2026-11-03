-- Executar na origem e no banco isolado restaurado; saída sem dados pessoais ou credenciais.
\set ON_ERROR_STOP on
\pset pager off
\pset tuples_only on
\pset format unaligned
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 'R5_SNAPSHOT_BEGIN';
SELECT format(
  'SELECT %L || ''|'' || count(*)::text || ''|'' || md5(coalesce(string_agg(to_jsonb(t)::text, E''\n'' ORDER BY to_jsonb(t)::text), '''')) FROM %I.%I t;',
  'tabela|' || schemaname || '.' || tablename, schemaname, tablename
) FROM pg_tables WHERE schemaname IN ('public', 'drizzle') ORDER BY schemaname, tablename
\gexec
SELECT 'schema_colunas|' || md5(string_agg(concat_ws('|', table_schema, table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default), E'\n' ORDER BY table_schema, table_name, ordinal_position))
FROM information_schema.columns WHERE table_schema IN ('public', 'drizzle');
SELECT 'schema_constraints|' || md5(string_agg(n.nspname || '.' || c.relname || '|' || x.conname || '|' || pg_get_constraintdef(x.oid, true) || '|' || x.convalidated, E'\n' ORDER BY n.nspname, c.relname, x.conname))
FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public', 'drizzle');
SELECT 'schema_indices|' || md5(string_agg(schemaname || '.' || tablename || '|' || indexname || '|' || indexdef, E'\n' ORDER BY schemaname, tablename, indexname))
FROM pg_indexes WHERE schemaname IN ('public', 'drizzle');
SELECT 'sequencia|' || schemaname || '.' || sequencename || '|' || coalesce(last_value::text, 'null')
FROM pg_sequences WHERE schemaname IN ('public', 'drizzle') ORDER BY schemaname, sequencename;
SELECT 'financeiro|' || jsonb_build_object(
  'vendas', (SELECT count(*) FROM vendas),
  'vendasCentavos', (SELECT coalesce(sum(total_centavos),0) FROM vendas),
  'pagamentosCentavos', (SELECT coalesce(sum(valor_centavos),0) FROM pagamentos_venda),
  'trocoCentavos', (SELECT coalesce(sum(troco_centavos),0) FROM pagamentos_venda),
  'caixas', (SELECT count(*) FROM caixas),
  'trocoInicialCentavos', (SELECT coalesce(sum(troco_inicial_centavos),0) FROM caixas),
  'movimentos', (SELECT count(*) FROM movimentos_caixa),
  'produtos', (SELECT count(*) FROM produtos)
)::text;

SELECT 'integridade|' || jsonb_build_object(
  'constraintsNaoValidadas', (SELECT count(*) FROM pg_constraint x JOIN pg_namespace n ON n.oid=x.connamespace WHERE n.nspname IN ('public','drizzle') AND NOT x.convalidated),
  'vendasComCaixaInvalido', (SELECT count(*) FROM vendas v LEFT JOIN caixas c ON c.id=v.caixa_id WHERE v.caixa_id IS NOT NULL AND (c.id IS NULL OR c.loja_id<>v.loja_id OR c.operador_id<>v.operador_id )),
  'vendasComPagamentosDivergentes', (SELECT count(*) FROM vendas v WHERE v.total_centavos-coalesce((v.fiado->>'valorCentavos')::bigint,0)<>(SELECT coalesce(sum(p.valor_centavos),0) FROM pagamentos_venda p WHERE p.venda_id=v.id)),
  'vendasComItensDivergentes', (SELECT count(*) FROM vendas v WHERE v.total_centavos<>(SELECT coalesce(sum(i.total_centavos),0) FROM itens_venda i WHERE i.venda_id=v.id))
)::text;
SELECT 'R5_SNAPSHOT_END';
WITH snapshots AS MATERIALIZED (
  SELECT schemaname || '.' || tablename AS tabela,
    query_to_xml(format('SELECT count(*) AS n, md5(coalesce(string_agg(to_jsonb(t)::text, E''\n'' ORDER BY to_jsonb(t)::text), '''')) AS h FROM %I.%I t', schemaname, tablename), false, true, '') AS dados
  FROM pg_tables WHERE schemaname IN ('public', 'drizzle')
), resumo AS (
  SELECT tabela, (xpath('/row/n/text()', dados))[1]::text AS n,
    (xpath('/row/h/text()', dados))[1]::text AS h FROM snapshots
)
SELECT 'dataset|' || count(*) || '|' || sum(n::bigint) || '|' || md5(string_agg(tabela || '|' || n || '|' || h, E'\n' ORDER BY tabela)) || '|xml_validos=' || bool_and(n IS NOT NULL AND h IS NOT NULL AND length(h)=32) FROM resumo;
COMMIT;
