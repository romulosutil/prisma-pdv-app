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

## Passo a passo (console Bash do serviço `pdv-postgres` no EasyPanel)

O contêiner do `pdv-api` não tem `psql` nem a pasta `scripts/`. Use o console Bash do `pdv-postgres` (PostgreSQL 17), conectando com o usuário do contêiner, sem URL nem senha na linha de comando. Rode cada comando em uma linha só.

1. **Parar o tráfego**: pare o `pdv-api` ou deixe-o sem tráfego (nenhum aparelho em uso). O script roda em transação única.
2. **Fazer o backup antes**: em *Cópias de segurança* do `pdv-postgres`, *Execução Manual* com um nome identificável (ex. `pdv-pre-zerar-AAAAMMDD`) e conferir em *Visualizar* que o log termina em `Success` com tamanho maior que zero.
3. **Conferir o estado** (o esperado é 1 conta, 1 loja "Loja Teste M4", 1 venda, 1 caixa):
   ```sh
   psql -X -U "$POSTGRES_USER" -d pdv -c "SELECT (SELECT count(*) FROM contas) contas, (SELECT string_agg(nome, ',') FROM lojas) lojas, (SELECT count(*) FROM vendas) vendas, (SELECT count(*) FROM caixas) caixas, (SELECT count(*) FROM drizzle.__drizzle_migrations) migracoes"
   ```
   Anote o número de migrações.
4. **Copiar o script para o contêiner e conferir o hash.** O mais seguro é transferir em base64 de uma linha, gerado na máquina local com `gzip -9 -c scripts/zerar-conta-teste-producao.sql | base64 -w0`:
   ```sh
   echo '<base64>' | base64 -d | gunzip > /tmp/zerar.sql && sha256sum /tmp/zerar.sql
   ```
   O sha256 precisa ser igual ao do arquivo no commit aprovado (`sha256sum scripts/zerar-conta-teste-producao.sql`). Se preferir colar o texto, use heredoc com o delimitador entre aspas (`cat > /tmp/zerar.sql <<'SQL'`); sem aspas, o shell troca `$zerar$` por `$` e executa as crases dos comentários.
5. **Rodar o script** (as aspas em `loja_nome` são obrigatórias):
   ```sh
   psql -X -v ON_ERROR_STOP=1 -v loja_nome='Loja Teste M4' -v lojas=1 -v vendas=1 -v caixas=1 -U "$POSTGRES_USER" -d pdv -f /tmp/zerar.sql; echo "CODIGO_SAIDA=$?"
   ```
   Para considerar a execução bem-sucedida, a saída precisa ter `NOTICE:  Conta de teste removida: ...` seguido de `COMMIT`, e o código de saída precisa ser 0.
   Se aparecer `ERROR`, nada foi apagado. Leia a mensagem (banco incorreto, nome da loja, contagem divergente ou mais de 1 conta) e não ajuste os parâmetros sem conferir o motivo.
6. **Conferir depois e limpar**: `rm /tmp/zerar.sql` e rode de novo a consulta do passo 3. O esperado é `contas = 0`, `lojas` vazio, `vendas = 0`, `caixas = 0` e o mesmo número de migrações.
7. **Religar** o `pdv-api` (se foi parado), conferir `/saude` e refazer o cadastro pelo app.

Ensaio com psql 17.11 real e execução na produção em 18/11/2026: ver CP 161 em [checkpoints-roadmap.md](checkpoints-roadmap.md).

## Observações

- Restauração em caso de engano: *Restaurar* no backup do passo 2, em *Cópias de segurança* do `pdv-postgres`, com a API parada.
- O script não cancela nada no gateway de cobrança. Se a conta de teste criou cliente ou assinatura no provedor externo, trate isso no painel do provedor.
- Sequências (`mudancas.seq`, `entregas_codigo.ordem_fila`) não são reiniciadas. Isso não afeta o app.
- Dados locais do aparelho Android (banco do app) não são apagados pelo script. Para um cadastro limpo, limpe os dados do app ou reinstale.
