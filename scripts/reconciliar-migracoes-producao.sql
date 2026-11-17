-- Reconciliação do histórico de migrações do drizzle em PRODUÇÃO (banco `pdv`).
--
-- CONTEXTO
--   O banco de produção foi migrado pela branch `main`, que aplicou as migrações
--   0000-0007 (idênticas nesta branch) e mais:
--     0008_lyrical_blindfold    (hash sha256 3385f917edfb..., created_at 1793672864055)
--       -> itens_venda.controla_estoque, produtos.ajustes_estoque, produtos.estoque_ativo
--     0009_vengeful_champions   (hash sha256 c4e8c2a3333a..., created_at 1793674412300)
--       -> índice itens_venda_estoque_idx
--   Esta branch reimplementou o estoque (tabela movimentos_estoque) e tem as migrações
--   0008-0012 próprias, com created_at MENORES (exceto a 0012) que o da última linha
--   aplicada em produção. O migrator do drizzle só aplica migrações com created_at
--   maior que o da última linha aplicada; sem este script, o deploy pularia 0008-0011
--   em silêncio e a API subiria sem tabelas como `usuarios`.
--
-- O QUE ESTE SCRIPT FAZ (tudo em uma transação)
--   1. Trava: banco precisa ser `pdv`; as duas linhas do main devem existir (hash completo);
--      nenhuma linha de histórico fora da lista conhecida (0000-0007 + as 2 do main) nem
--      com created_at > 1793674412300; as 3 colunas do main devem estar sem nenhum valor
--      (não nulo). Qualquer falha aborta tudo sem alterar nada.
--   2. Remove as duas linhas do main de drizzle.__drizzle_migrations.
--   3. Remove as 3 colunas e o índice do main (DROP ... IF EXISTS), deixando o schema
--      igual ao estado pós-0007 desta branch.
--   Se já estiver reconciliado (as duas linhas do main ausentes), apenas informa e sai
--   sem erro. Depois do script, o deploy desta branch aplica 0008-0012 normalmente.
--
-- PRÉ-REQUISITO
--   Backup lógico recente e verificado do banco `pdv` (pg_dump) ANTES de rodar.
--   Rodar UMA vez, ANTES do deploy desta branch, com a API parada ou sem tráfego.
--
-- COMO RODAR (a URL de conexão não deve ser gravada em arquivo nem no histórico):
--   psql -v ON_ERROR_STOP=1 -X -f scripts/reconciliar-migracoes-producao.sql "$DATABASE_URL"
--
-- Sem segredos neste arquivo.

BEGIN;

DO $reconciliar$
DECLARE
  hash_0008_main constant text := '3385f917edfb2b96d85cd0ccd724c1577baf40aa8d26fc9bd13d0b4ca650b25b';
  hash_0009_main constant text := 'c4e8c2a3333a8e3bc48044dd5f846306f5467cab5cbd503b1c88ed60f75b2039';
  hashes_conhecidos constant text[] := ARRAY[
    'd324a0a62979ee85220795165595ff9be89495b128be8cde8e343d280d9d81ac', -- 0000
    '9f8095399177d4744287bbda5801776cf0434d89c1f8463b3f5309a269ba6a7c', -- 0001
    '472376d7745b676120b74423d6f3b46357072ad4b2ea2318034d6c95dbe24b33', -- 0002
    '12da9548f96cab9d26afc924ae7982c7b89569c27f895eccdfe6a0cfee0e6f91', -- 0003
    '999b4aa432be1ca945df1ca6b4d275a6d47dc8e65af619fc3b75981504aab44b', -- 0004
    'e3cd02c33e813fb6099c51452d1ac2b5702b778d95ae9a2cb0894e6f692fdd9d', -- 0005
    '41c233e4b25770b24b447a78682bbee34cb82469e9fcf922a4185efe361024ec', -- 0006
    '10d59ccd7cd977c426a403f8119031f401c815c613d6200f1577583ed06cbc7f', -- 0007
    '3385f917edfb2b96d85cd0ccd724c1577baf40aa8d26fc9bd13d0b4ca650b25b', -- 0008 main
    'c4e8c2a3333a8e3bc48044dd5f846306f5467cab5cbd503b1c88ed60f75b2039'  -- 0009 main
  ];
  limite_created_at constant bigint := 1793674412300;
  n_main integer;
  n_total integer;
  n_distintos integer;
  n_desconhecidos integer;
  n_futuros integer;
  n_valores bigint;
  coluna record;
BEGIN
  IF current_database() <> 'pdv' THEN
    RAISE EXCEPTION 'Banco incorreto: % (esperado: pdv). Nada foi alterado.', current_database();
  END IF;

  IF to_regclass('drizzle.__drizzle_migrations') IS NULL THEN
    RAISE EXCEPTION 'Tabela drizzle.__drizzle_migrations inexistente. Nada foi alterado.';
  END IF;

  LOCK TABLE drizzle.__drizzle_migrations IN EXCLUSIVE MODE;

  SELECT count(*) INTO n_main FROM drizzle.__drizzle_migrations
   WHERE hash IN (hash_0008_main, hash_0009_main);

  IF n_main = 0 THEN
    RAISE NOTICE 'Já reconciliado: as migrações 0008/0009 do main não constam no histórico. Nada a fazer.';
    RETURN;
  END IF;

  IF n_main <> 2 THEN
    RAISE EXCEPTION 'Histórico inesperado: apenas % das 2 migrações do main foram encontradas. Nada foi alterado.', n_main;
  END IF;

  SELECT count(*), count(DISTINCT hash),
         count(*) FILTER (WHERE hash <> ALL (hashes_conhecidos)),
         count(*) FILTER (WHERE created_at > limite_created_at)
    INTO n_total, n_distintos, n_desconhecidos, n_futuros
    FROM drizzle.__drizzle_migrations;

  IF n_desconhecidos > 0 THEN
    RAISE EXCEPTION 'Existem % linhas de histórico com hash fora da lista conhecida. Nada foi alterado.', n_desconhecidos;
  END IF;
  IF n_futuros > 0 THEN
    RAISE EXCEPTION 'Existem % linhas de histórico com created_at > %. Nada foi alterado.', n_futuros, limite_created_at;
  END IF;
  IF n_total <> 10 OR n_distintos <> 10 THEN
    RAISE EXCEPTION 'Histórico esperado: 10 migrações distintas (0000-0007 + 2 do main); encontrado % linhas, % hashes distintos. Nada foi alterado.', n_total, n_distintos;
  END IF;

  -- Proteção contra perda de dado: as colunas do main precisam estar sem valores.
  FOR coluna IN
    SELECT * FROM (VALUES
      ('itens_venda', 'controla_estoque'),
      ('produtos', 'ajustes_estoque'),
      ('produtos', 'estoque_ativo')
    ) AS t(tabela, nome)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = coluna.tabela AND column_name = coluna.nome) THEN
      EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', coluna.tabela);
      EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IS NOT NULL', coluna.tabela, coluna.nome)
        INTO n_valores;
      IF n_valores > 0 THEN
        RAISE EXCEPTION 'Perda de dado evitada: %.% tem % valores não nulos. Nada foi alterado.',
          coluna.tabela, coluna.nome, n_valores;
      END IF;
    END IF;
  END LOOP;

  DELETE FROM drizzle.__drizzle_migrations WHERE hash IN (hash_0008_main, hash_0009_main);

  DROP INDEX IF EXISTS public.itens_venda_estoque_idx;
  ALTER TABLE public.itens_venda DROP COLUMN IF EXISTS controla_estoque;
  ALTER TABLE public.produtos DROP COLUMN IF EXISTS ajustes_estoque;
  ALTER TABLE public.produtos DROP COLUMN IF EXISTS estoque_ativo;

  RAISE NOTICE 'Reconciliação concluída: 2 linhas do main removidas do histórico, 3 colunas e 1 índice removidos.';
END
$reconciliar$;

COMMIT;
