# Zerar a conta de teste em produção

Procedimento para remover a conta de teste ("Loja Teste M4") do banco `pdv` e refazer o cadastro do zero.
Script: `scripts/zerar-conta-teste-producao.sql`. Teste: `apps/api/test/zerarContaTesteProducao.test.ts`.
Este arquivo não contém credenciais. A URL de conexão fica só na variável de ambiente da sessão.

## O que o script faz

- Roda em uma única transação. Qualquer falha aborta tudo e nada é apagado.
- Travas: o banco precisa ser `pdv`; o banco precisa ter exatamente 1 conta, com uma loja de nome igual a `loja_nome`; as contagens de lojas, vendas e caixas da conta precisam ser iguais aos parâmetros.
- Apaga somente os dados dessa conta, com `DELETE` em ordem de FK (sem `TRUNCATE`).
- Preserva `drizzle.__drizzle_migrations`, `catalogo_ean` (catálogo compartilhado) e `limites_auth`. Migrações e catálogo são conferidos antes e depois.
- No fim confere que todas as tabelas da conta estão com 0 linhas e imprime `NOTICE: Conta de teste removida: ...`.
- Se rodar de novo (0 contas), aborta com `Nenhuma conta no banco: já está zerado` e não altera nada.

## Passo a passo (console do painel, com `psql` 10 ou mais recente)

1. **Parar o tráfego**: pare o serviço `pdv-api` ou deixe-o sem tráfego.
2. **Fazer o backup antes** e conferir que o arquivo existe e não está vazio:
   ```sh
   pg_dump -Fc -f pdv-antes-zerar-$(date +%Y%m%d-%H%M).dump "$DATABASE_URL"
   pg_restore -l pdv-antes-zerar-*.dump | head
   ```
3. **Conferir o estado** (o esperado é 1 conta, 1 loja "Loja Teste M4", 1 venda, 1 caixa):
   ```sh
   psql -X "$DATABASE_URL" -c "SELECT (SELECT count(*) FROM contas) contas, (SELECT string_agg(nome, ',') FROM lojas) lojas, (SELECT count(*) FROM vendas) vendas, (SELECT count(*) FROM caixas) caixas, (SELECT count(*) FROM drizzle.__drizzle_migrations) migracoes"
   ```
   Anote o número de migrações.
4. **Rodar o script**:
   ```sh
   psql -X -v ON_ERROR_STOP=1 -v loja_nome='Loja Teste M4' -v lojas=1 -v vendas=1 -v caixas=1 \
        -f scripts/zerar-conta-teste-producao.sql "$DATABASE_URL"
   ```
   Para considerar a execução bem-sucedida, a saída precisa ter `NOTICE:  Conta de teste removida: ...` seguido de `COMMIT`, e o código de saída precisa ser 0.
   Se aparecer `ERROR`, nada foi apagado. Leia a mensagem (banco incorreto, nome da loja, contagem divergente ou mais de 1 conta) e não ajuste os parâmetros sem conferir o motivo.
5. **Conferir depois**: rode de novo a consulta do passo 3. O esperado é `contas = 0`, `lojas` vazio, `vendas = 0`, `caixas = 0` e o mesmo número de migrações.
6. **Religar** o `pdv-api`, conferir `/saude` e refazer o cadastro pelo app.

## Observações

- Restauração em caso de engano: `pg_restore --clean --if-exists -d "$DATABASE_URL" <arquivo.dump>`, com a API parada.
- O script não cancela nada no gateway de cobrança. Se a conta de teste criou cliente ou assinatura no provedor externo, trate isso no painel do provedor.
- Sequências (`mudancas.seq`, `entregas_codigo.ordem_fila`) não são reiniciadas. Isso não afeta o app.
- Dados locais do aparelho Android (banco do app) não são apagados pelo script. Para um cadastro limpo, limpe os dados do app ou reinstale.
