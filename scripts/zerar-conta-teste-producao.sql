-- Remoção da conta de TESTE do banco de PRODUÇÃO (`pdv`), para refazer o cadastro do zero.
--
-- CONTEXTO
--   Antes da homologação o banco tinha 0 contas. Hoje há UMA conta de teste ("Loja Teste M4").
--   O usuário autorizou apagá-la. Este script apaga somente os dados dessa conta e nada mais.
--
-- TRAVAS (qualquer falha aborta a transação inteira, sem apagar nada)
--   1. O banco precisa se chamar `pdv`.
--   2. O banco precisa ter EXATAMENTE 1 conta, e ela precisa ter uma loja com nome = :loja_nome.
--   3. As contagens da conta precisam bater com os parâmetros :lojas, :vendas e :caixas.
--   Com 0 contas (já zerado) o script aborta com mensagem clara e não altera nada.
--
-- O QUE APAGA (DELETE em ordem segura de FK; nunca TRUNCATE)
--   Por loja da conta: movimentos_estoque, eventos_fiado, auditoria_caixa, movimentos_caixa,
--     itens_venda, pagamentos_venda, vendas, caixas, clientes, produtos,
--     catalogo_ean_confirmacoes, mudancas, mutacoes_aplicadas,
--     eventos_cobranca_pagamento, cobrancas_pagamento, conexoes_pagamento, estados_oauth_pagamento (Pix do Mercado Pago).
--   Por conta: recuperacoes_aparelho, solicitacoes_suporte, sessoes, aparelhos, operadores,
--     usuarios (os ligados aos operadores da conta e o do e-mail da conta, se nenhum outro
--     operador os usa), entregas_codigo e codigos_login (pelos e-mails acima e pelos aparelhos
--     da conta), eventos_cobranca, faturas, assinaturas, testes_usados, lojas, contas.
--
-- O QUE PRESERVA (deliberadamente)
--   drizzle.__drizzle_migrations (conferida por impressão digital antes/depois),
--   catalogo_ean (catálogo compartilhado entre lojas, sem loja_id; conferido antes/depois),
--   limites_auth (contadores anti-abuso por hash, sem FK e com janela que expira).
--
-- PRÉ-REQUISITO
--   Backup lógico recente e verificado do banco `pdv` (pg_dump) ANTES de rodar.
--   API `pdv-api` parada ou sem tráfego durante a execução.
--
-- COMO RODAR (a URL de conexão não deve ser gravada em arquivo nem no histórico):
--   psql -X -v ON_ERROR_STOP=1 -v loja_nome='Loja Teste M4' -v lojas=1 -v vendas=1 -v caixas=1 \
--        -f scripts/zerar-conta-teste-producao.sql "$DATABASE_URL"
--
-- Sem segredos neste arquivo.

\set ON_ERROR_STOP on

-- psql:inicio (bloco exclusivo do psql; o teste automatizado o remove)
\if :{?loja_nome}
\else
  \echo 'ERRO: informe -v loja_nome=... (nome exato da loja de teste). Nada foi alterado.'
  SELECT 1 / 0 AS parametro_loja_nome_ausente;
\endif
\if :{?lojas}
\else
  \echo 'ERRO: informe -v lojas=N (contagem esperada de lojas da conta). Nada foi alterado.'
  SELECT 1 / 0 AS parametro_lojas_ausente;
\endif
\if :{?vendas}
\else
  \echo 'ERRO: informe -v vendas=N (contagem esperada de vendas da conta). Nada foi alterado.'
  SELECT 1 / 0 AS parametro_vendas_ausente;
\endif
\if :{?caixas}
\else
  \echo 'ERRO: informe -v caixas=N (contagem esperada de caixas da conta). Nada foi alterado.'
  SELECT 1 / 0 AS parametro_caixas_ausente;
\endif
-- psql:fim

BEGIN;

SET LOCAL lock_timeout = '10s';
SELECT set_config('pdv_zerar.loja_nome', :'loja_nome', true),
       set_config('pdv_zerar.lojas', :'lojas', true),
       set_config('pdv_zerar.vendas', :'vendas', true),
       set_config('pdv_zerar.caixas', :'caixas', true);

DO $zerar$
DECLARE
  p_loja_nome constant text := current_setting('pdv_zerar.loja_nome');
  p_lojas integer;
  p_vendas integer;
  p_caixas integer;
  v_conta uuid;
  v_conta_email text;
  v_lojas uuid[];
  v_aparelhos uuid[];
  v_usuarios uuid[];
  v_emails text[];
  v_codigos uuid[];
  n integer;
  n_contas integer;
  n_casadas integer;
  mig_antes text;
  mig_depois text;
  cat_antes text;
  cat_depois text;
  tabela text;
  residuo text := '';
BEGIN
  -- ---------- Travas ----------
  IF current_database() <> 'pdv' THEN
    RAISE EXCEPTION 'Banco incorreto: % (esperado: pdv). Nada foi alterado.', current_database();
  END IF;

  IF coalesce(p_loja_nome, '') = '' THEN
    RAISE EXCEPTION 'Parâmetro loja_nome vazio. Nada foi alterado.';
  END IF;
  BEGIN
    p_lojas := current_setting('pdv_zerar.lojas')::integer;
    p_vendas := current_setting('pdv_zerar.vendas')::integer;
    p_caixas := current_setting('pdv_zerar.caixas')::integer;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Parâmetros lojas/vendas/caixas devem ser inteiros. Nada foi alterado.';
  END;

  IF to_regclass('drizzle.__drizzle_migrations') IS NULL THEN
    RAISE EXCEPTION 'Tabela drizzle.__drizzle_migrations inexistente. Nada foi alterado.';
  END IF;

  -- Bloqueia escritas concorrentes (leituras continuam) em todas as tabelas tocadas ou conferidas.
  LOCK TABLE drizzle.__drizzle_migrations, public.catalogo_ean,
    public.contas, public.lojas, public.usuarios, public.operadores, public.aparelhos, public.sessoes,
    public.codigos_login, public.entregas_codigo, public.recuperacoes_aparelho,
    public.produtos, public.vendas, public.itens_venda, public.detalhes_pagamentos_venda, public.pagamentos_venda, public.caixas,
    public.movimentos_caixa, public.auditoria_caixa, public.catalogo_ean_confirmacoes,
    public.mudancas, public.mutacoes_aplicadas, public.assinaturas_play, public.assinaturas, public.faturas,
    public.eventos_cobranca, public.testes_usados, public.movimentos_estoque, public.clientes,
    public.eventos_fiado, public.solicitacoes_suporte,
    public.conexoes_pagamento, public.cobrancas_pagamento, public.eventos_cobranca_pagamento,
    public.estados_oauth_pagamento
    IN EXCLUSIVE MODE;

  SELECT count(*) INTO n_contas FROM public.contas;
  IF n_contas = 0 THEN
    RAISE EXCEPTION 'Nenhuma conta no banco: já está zerado. Nada a fazer; nada foi alterado.';
  END IF;
  IF n_contas <> 1 THEN
    RAISE EXCEPTION 'O banco tem % contas (esperado: exatamente 1, a de teste). Nada foi alterado.', n_contas;
  END IF;

  SELECT count(DISTINCT c.id) INTO n_casadas
    FROM public.contas c JOIN public.lojas l ON l.conta_id = c.id
   WHERE l.nome = p_loja_nome;
  IF n_casadas <> 1 THEN
    RAISE EXCEPTION 'A única conta não tem loja chamada "%". Nada foi alterado.', p_loja_nome;
  END IF;

  SELECT c.id, c.email INTO v_conta, v_conta_email FROM public.contas c;
  SELECT coalesce(array_agg(id), '{}') INTO v_lojas FROM public.lojas WHERE conta_id = v_conta;

  IF cardinality(v_lojas) <> p_lojas THEN
    RAISE EXCEPTION 'Contagem de lojas divergente: % (esperado: %). Nada foi alterado.', cardinality(v_lojas), p_lojas;
  END IF;
  SELECT count(*) INTO n FROM public.vendas WHERE loja_id = ANY (v_lojas);
  IF n <> p_vendas THEN
    RAISE EXCEPTION 'Contagem de vendas divergente: % (esperado: %). Nada foi alterado.', n, p_vendas;
  END IF;
  SELECT count(*) INTO n FROM public.caixas WHERE loja_id = ANY (v_lojas);
  IF n <> p_caixas THEN
    RAISE EXCEPTION 'Contagem de caixas divergente: % (esperado: %). Nada foi alterado.', n, p_caixas;
  END IF;

  -- ---------- Impressões digitais do que deve ficar intacto ----------
  SELECT count(*) || ':' || coalesce(md5(string_agg(id || ':' || hash || ':' || coalesce(created_at::text, ''), ',' ORDER BY id)), '')
    INTO mig_antes FROM drizzle.__drizzle_migrations;
  SELECT count(*) || ':' || coalesce(md5(string_agg(c::text, ',' ORDER BY c.ean)), '')
    INTO cat_antes FROM public.catalogo_ean c;

  -- ---------- Conjuntos da conta ----------
  SELECT coalesce(array_agg(id), '{}') INTO v_aparelhos
    FROM public.aparelhos WHERE conta_id = v_conta OR loja_id = ANY (v_lojas);
  SELECT coalesce(array_agg(DISTINCT u.id), '{}') INTO v_usuarios
    FROM public.usuarios u
   WHERE u.id IN (SELECT usuario_id FROM public.operadores
                   WHERE (conta_id = v_conta OR loja_id = ANY (v_lojas)) AND usuario_id IS NOT NULL)
      OR u.email = v_conta_email;
  SELECT array_agg(DISTINCT e) INTO v_emails FROM (
    SELECT v_conta_email AS e
    UNION SELECT email FROM public.usuarios WHERE id = ANY (v_usuarios)
  ) t WHERE e IS NOT NULL;
  SELECT coalesce(array_agg(id), '{}') INTO v_codigos
    FROM public.codigos_login
   WHERE email = ANY (v_emails) OR aparelho_cadastro_id = ANY (v_aparelhos);

  -- ---------- Remoção (ordem segura por FK) ----------
  DELETE FROM public.recuperacoes_aparelho WHERE conta_id = v_conta OR loja_id = ANY (v_lojas);
  DELETE FROM public.solicitacoes_suporte WHERE conta_id = v_conta OR loja_id = ANY (v_lojas);
  DELETE FROM public.sessoes WHERE conta_id = v_conta OR loja_id = ANY (v_lojas);

  -- Pagamentos integrados: eventos → cobranças → conexões (credencial cifrada da loja).
  DELETE FROM public.eventos_cobranca_pagamento WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.cobrancas_pagamento WHERE conta_id = v_conta OR loja_id = ANY (v_lojas);
  DELETE FROM public.conexoes_pagamento WHERE conta_id = v_conta OR loja_id = ANY (v_lojas);
  -- `state` do OAuth (FK para operadores): antes de apagar os operadores.
  DELETE FROM public.estados_oauth_pagamento WHERE conta_id = v_conta OR loja_id = ANY (v_lojas);

  DELETE FROM public.movimentos_estoque WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.eventos_fiado WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.auditoria_caixa WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.movimentos_caixa WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.itens_venda WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.detalhes_pagamentos_venda WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.pagamentos_venda WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.vendas WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.caixas WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.clientes WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.produtos WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.catalogo_ean_confirmacoes WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.mudancas WHERE loja_id = ANY (v_lojas);
  DELETE FROM public.mutacoes_aplicadas WHERE loja_id = ANY (v_lojas);

  DELETE FROM public.aparelhos WHERE id = ANY (v_aparelhos);
  DELETE FROM public.operadores WHERE conta_id = v_conta OR loja_id = ANY (v_lojas);
  -- Usuário global: só sai se nenhum operador restante o usa.
  DELETE FROM public.usuarios u WHERE u.id = ANY (v_usuarios)
     AND NOT EXISTS (SELECT 1 FROM public.operadores o WHERE o.usuario_id = u.id);

  DELETE FROM public.entregas_codigo WHERE conta_id = v_conta OR codigo_id = ANY (v_codigos);
  DELETE FROM public.codigos_login WHERE id = ANY (v_codigos);

  DELETE FROM public.eventos_cobranca WHERE conta_id = v_conta;
  DELETE FROM public.faturas WHERE conta_id = v_conta;
  DELETE FROM public.assinaturas_play WHERE conta_id = v_conta;
  DELETE FROM public.assinaturas WHERE conta_id = v_conta;
  DELETE FROM public.testes_usados WHERE conta_id = v_conta;

  DELETE FROM public.lojas WHERE id = ANY (v_lojas);
  DELETE FROM public.contas WHERE id = v_conta;

  -- ---------- Conferência final (ainda dentro da transação) ----------
  -- Havia 1 conta só: toda tabela com FK para contas/lojas precisa estar vazia no banco inteiro.
  FOREACH tabela IN ARRAY ARRAY[
    'contas', 'lojas', 'operadores', 'aparelhos', 'sessoes', 'recuperacoes_aparelho',
    'produtos', 'vendas', 'itens_venda', 'detalhes_pagamentos_venda', 'pagamentos_venda', 'caixas', 'movimentos_caixa',
    'auditoria_caixa', 'catalogo_ean_confirmacoes', 'mudancas', 'mutacoes_aplicadas',
    'assinaturas_play', 'assinaturas', 'faturas', 'eventos_cobranca', 'testes_usados', 'movimentos_estoque',
    'clientes', 'eventos_fiado', 'solicitacoes_suporte',
    'conexoes_pagamento', 'cobrancas_pagamento', 'eventos_cobranca_pagamento', 'estados_oauth_pagamento'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', tabela) INTO n;
    IF n <> 0 THEN
      residuo := residuo || format(' %s=%s', tabela, n);
    END IF;
  END LOOP;
  SELECT count(*) INTO n FROM public.usuarios WHERE id = ANY (v_usuarios) OR email = ANY (v_emails);
  IF n <> 0 THEN residuo := residuo || format(' usuarios(da conta)=%s', n); END IF;
  SELECT count(*) INTO n FROM public.codigos_login WHERE id = ANY (v_codigos) OR email = ANY (v_emails);
  IF n <> 0 THEN residuo := residuo || format(' codigos_login(da conta)=%s', n); END IF;
  SELECT count(*) INTO n FROM public.entregas_codigo WHERE conta_id IS NOT NULL OR codigo_id = ANY (v_codigos);
  IF n <> 0 THEN residuo := residuo || format(' entregas_codigo(da conta)=%s', n); END IF;
  IF residuo <> '' THEN
    RAISE EXCEPTION 'Conferência falhou, restaram linhas:%. Transação abortada; nada foi alterado.', residuo;
  END IF;

  SELECT count(*) || ':' || coalesce(md5(string_agg(id || ':' || hash || ':' || coalesce(created_at::text, ''), ',' ORDER BY id)), '')
    INTO mig_depois FROM drizzle.__drizzle_migrations;
  SELECT count(*) || ':' || coalesce(md5(string_agg(c::text, ',' ORDER BY c.ean)), '')
    INTO cat_depois FROM public.catalogo_ean c;
  IF mig_depois <> mig_antes THEN
    RAISE EXCEPTION 'Histórico de migrações mudou durante o script. Transação abortada; nada foi alterado.';
  END IF;
  IF cat_depois <> cat_antes THEN
    RAISE EXCEPTION 'catalogo_ean mudou durante o script. Transação abortada; nada foi alterado.';
  END IF;

  SELECT count(*) INTO n FROM public.usuarios;
  IF n > 0 THEN
    RAISE NOTICE 'Aviso: restam % usuarios sem vínculo com a conta removida (preservados).', n;
  END IF;
  SELECT count(*) INTO n FROM public.codigos_login;
  IF n > 0 THEN
    RAISE NOTICE 'Aviso: restam % codigos_login de outros e-mails (preservados; expiram sozinhos).', n;
  END IF;

  RAISE NOTICE 'Conta de teste removida: loja "%", % loja(s), % venda(s), % caixa(s). Tabelas da conta conferidas com 0 linhas; migrações intactas (%); catalogo_ean intacto (%).',
    p_loja_nome, p_lojas, p_vendas, p_caixas, split_part(mig_depois, ':', 1), split_part(cat_depois, ':', 1);
END
$zerar$;

COMMIT;
