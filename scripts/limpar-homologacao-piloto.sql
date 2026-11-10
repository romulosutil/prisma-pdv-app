-- Operação DESTRUTIVA autorizada para o PDV de homologação pelo usuário em 03/11/2026.
-- Ainda NÃO executada. Não usar em produção. Preserva schema, migrações e backups.
-- Destino conferido: aladdin/pdv-postgres-homologacao, database pdv_homologacao.
-- Antes de executar, conferir o arquivo/resultado do backup pdv-pre-reset-debug-018-20261103.
-- Somente após essa conferência, na MESMA conexão administrativa:
-- SET pdv.backup_confirmado = 'pdv-pre-reset-debug-018-20261103';
-- Pausar testes/escritas da homologação durante a operação. Não altera dados no celular.

BEGIN;
SET LOCAL application_name = 'pdv-limpeza-homologacao-018';
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
  IF current_database() <> 'pdv_homologacao' THEN
    RAISE EXCEPTION 'Destino recusado: somente pdv_homologacao.';
  END IF;
  IF current_setting('pdv.backup_confirmado', true) IS DISTINCT FROM 'pdv-pre-reset-debug-018-20261103' THEN
    RAISE EXCEPTION 'Confirme primeiro o backup anterior à limpeza.';
  END IF;
END $$;

-- Somente as tabelas conhecidas do aplicativo; RESTRICT recusa dependência não prevista.
TRUNCATE TABLE
  public.contas, public.lojas, public.usuarios, public.operadores, public.aparelhos,
  public.sessoes, public.codigos_login, public.entregas_codigo, public.recuperacoes_aparelho,
  public.produtos, public.vendas, public.itens_venda, public.pagamentos_venda,
  public.caixas, public.movimentos_caixa, public.auditoria_caixa,
  public.catalogo_ean, public.catalogo_ean_confirmacoes, public.mudancas, public.mutacoes_aplicadas,
  public.assinaturas, public.faturas, public.eventos_cobranca, public.testes_usados, public.limites_auth,
  public.movimentos_estoque, public.clientes, public.eventos_fiado, public.solicitacoes_suporte
RESTART IDENTITY RESTRICT;

SELECT current_database() AS banco,
  (SELECT count(*) FROM public.contas) AS contas,
  (SELECT count(*) FROM public.usuarios) AS usuarios,
  (SELECT count(*) FROM public.produtos) AS produtos,
  (SELECT count(*) FROM public.vendas) AS vendas,
  (SELECT count(*) FROM public.caixas) AS caixas;
COMMIT;
