# R0 — teste de restauração do backup

**Resultado: PASS externo em 01/11/2026, às 21h40 (America/Sao_Paulo).** O arquivo gerado pelo EasyPanel foi restaurado em um PostgreSQL novo e vazio. Dados, estrutura e sequências conferem com a origem. Este resultado conclui o teste de restauração de R0. Em decisão posterior, o usuário moveu cópia externa e alertas para o [backlog após validação do produto](roadmap-app-completo.md#backlog-apos-validacao-do-produto); a homologação física Android permanece no escopo do MVP.

## Origem, arquivo e destino

| Item | Identificação |
|---|---|
| Origem | `aladdin/pdv-postgres-homologacao`, banco `pdv_homologacao` |
| Agendamento | `cmvyf7drm001w07od0irm2rrm`, diário, retenção de sete cópias |
| Execução usada | `r0-validacao-restauracao-20261101` |
| Arquivo | `aladdin/pdv-postgres-homologacao/2026-11-02T00:34:21.633Z.sql.gz` |
| Armazenamento | Local Disk, `/etc/easypanel/backups` na VPS |
| Tamanho informado pelo painel | 11,2 kB |
| Sucesso do backup | 01/11/2026, 21h34min22s (02/11, 00h34min22s UTC) |
| Destino exclusivo | `aladdin/pdv-postgres-restauracao-r0`, banco `pdv_homologacao` |
| Sucesso da restauração | 01/11/2026, 21h38min32s (02/11, 00h38min32s UTC) |
| Encerramento | Serviço de restauração desativado; volume preservado, porta externa zero |

O destino tem credencial própria e mantém o nome de usuário/banco da origem para preservar a titularidade dos objetos do dump. Antes da restauração, uma consulta retornou **zero tabelas** nos schemas `public` e `drizzle`. PgWeb e DbGate não foram habilitados. Nenhuma API foi apontada para a cópia; os bancos de produção e homologação permaneceram preservados.

O conector executou `runDatabaseBackup` e `restoreDatabaseBackup`, este último direcionado exclusivamente a `pdv-postgres-restauracao-r0`. A interface do EasyPanel forneceu o caminho real do arquivo e os logs de sucesso, não disponíveis na consulta de configuração do conector. A validação usou o console Linux do próprio serviço e `psql` com o usuário configurado, sem expor senha, OTP, token ou conteúdo pessoal.

## Comparação executada

O roteiro [verificar-restauracao.sql](../scripts/verificar-restauracao.sql) foi executado na origem e no destino, em transações `REPEATABLE READ READ ONLY`, com interrupção em erro. Para cada tabela dos schemas `public` e `drizzle`, calcula quantidade e MD5 do JSONB de todas as linhas, ordenadas pelo conteúdo. O checksum consolidado combina nome, quantidade e checksum de cada tabela. Isso inclui os campos completos dos registros, sem imprimi-los.

| Verificação | Origem | Restaurado | Resultado |
|---|---:|---:|---|
| Tabelas, incluindo migrações | 24 | 24 | Igual |
| Registros no conjunto | 38 | 38 | Igual |
| Migrações Drizzle | 8 | 8 | Igual |
| Produtos | 1 | 1 | Igual |
| Caixas | 1 | 1 | Igual |
| Vendas | 1 | 1 | Igual |
| Total das vendas | R$ 7,00 | R$ 7,00 | Igual |
| Pagamentos líquidos | R$ 7,00 | R$ 7,00 | Igual |
| Troco do pagamento | R$ 3,00 | R$ 3,00 | Igual |
| Troco inicial | R$ 10,00 | R$ 10,00 | Igual |
| Movimentos de caixa | 0 | 0 | Igual |
| Restrições não validadas | 0 | 0 | Íntegro |
| Vendas com caixa/autoria divergentes | 0 | 0 | Íntegro |
| Vendas com soma de itens divergente | 0 | 0 | Íntegro |
| Vendas com soma de pagamentos divergente | 0 | 0 | Íntegro |

Checksum consolidado, idêntico nos dois bancos: **`c44d5eac7b0bfb6ce4b6317d5cb21e25`**. A consulta também confirmou os 24 resultados XML válidos. Os checksums de definição de colunas, índices e restrições foram iguais. As três sequências mantiveram seus valores: migrações `8`, fila de entrega `3` e mudanças de sincronização `3`.

A venda `a0c58e5f-d185-4c7a-8627-0f49534cb9f7` continuou concluída, com 700 centavos e os mesmos IDs de loja, operador, aparelho e caixa `45bc75b5-681b-4cfb-90a4-5ec1597266fd`. O conjunto também preservou conta, licença liberada, dois aparelhos, sessões, códigos/entregas, limites de autenticação, três mudanças e três mutações aplicadas. Não foi necessário autenticar uma nova sessão nem criar dados no banco restaurado.

As APIs de produção e homologação responderam **200, `{"status":"ok"}`**, após a restauração. A inspeção final confirmou `enabled=false` e `exposedPort=0` no serviço temporário. O volume restaurado foi mantido para auditoria; reativá-lo não é necessário para a operação do app.

## Evidências e limites

As evidências locais ficam na pasta ignorada `builds/`:

- `r0-backup-destino-vazio.png`: destino com zero tabelas antes da operação.
- `r0-backup-origem.png`: dados e checksums da origem.
- `r0-backup-restaurado.png`: comparação completa após a restauração.
- `r0-backup-restauracao-log.png`: log de sucesso do EasyPanel.
- `r0-backup-restauracao.json`: resumo sanitizado da execução.

O teste exercitou backup de homologação com dados descartáveis e não sobrescreveu produção. Comprova recuperação do arquivo SQL gzip no ambiente PostgreSQL 17 utilizado. Não comprova recuperação de pendências existentes apenas no aparelho, cópia fora da VPS, alertas, retenção efetiva durante sete dias ou restauração física do APK. Esses itens não foram marcados como concluídos.
