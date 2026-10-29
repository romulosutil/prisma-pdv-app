# Validação independente — critérios 6 e 7 / P0-01-B

**Resultado: PASS** para os critérios 6 e 7 nos cenários verificados, sem concluir P0-01 global.

| Requisito | Evidência e asserção esperada | Resultado |
|---|---|---|
| Origem e repetição | `apps/mobile/test/sqliteArmazenamento.test.ts:38`: reabertura conserva agregados, IDs e origem e mantém um marcador. | PASS |
| Quantidades, valores e vínculos antes do marcador | `apps/mobile/src/dados/sqlite/armazenamentoSqlite.ts:55` compara leituras com a entrada antes do marcador na linha 62; `financeiro.ts:41` confere IDs e `financeiro.ts:43` confere filhos, posições e conteúdos. Testes em `sqliteArmazenamento.test.ts:91` exigem rollback e ausência de marcador para item ou pagamento removido. | PASS |
| Escrita parcial e nova tentativa | `apps/mobile/test/sqliteArmazenamento.test.ts:62`: erro na inserção de pagamento reverte tabelas e marcador, preserva origem e permite retry. | PASS |
| Dados inválidos | `apps/mobile/test/sqliteArmazenamento.test.ts:135`: partição, IDs duplicados e campos inválidos rejeitados, sem apagar origem nem marcar. | PASS |
| Isolamento | `apps/mobile/test/sqliteArmazenamento.test.ts:107`: após migrar A, B não importa seu legado; retorno a A recupera seus dados. | PASS para esse cenário |
| Transação e FK | `apps/mobile/src/dados/sqlite/conexao.ts:14` usa BEGIN EXCLUSIVE, COMMIT e ROLLBACK na mesma conexão; `schema.ts:55` ativa foreign_keys. Adaptador nativo abre conexão privada em `armazenamentoPlataforma.native.ts:8`. | PASS por inspeção; execução nativa pendente |
| Inicialização e retry | `app/_layout.tsx:37` só libera a interface após iniciar; falha exibe recuperação. `dados.ts:71` aguarda cargas; filas por repositório em `observavel.ts:34` ordenam cargas repetidas. | PASS por inspeção; sem teste de integração da corrida |

Sensor discriminante: segundo relato do executor independente, os dois testes com trigger que remove item ou pagamento falharam antes da correção; na versão corrigida, passaram na execução desta revisão. A execução anterior não foi presenciada por este revisor.

Verificações executadas após correção e alteração do helper para usar a conexão de produção: `rtk proxy npm run test --workspace=@pdv/mobile -- test/sqliteArmazenamento.test.ts test/sqliteSchema.test.ts test/persistidoDuravel.test.ts` — 3 arquivos, 23 testes passaram; `rtk proxy npm run typecheck --workspace=@pdv/mobile` — passou.

Diff desde e024d45 inspecionado parcialmente: schema, persistência observável, inicialização, pacote/lock e plano estão no diff rastreado; arquivos novos não rastreados, incluindo adaptador de migração e testes correspondentes, foram lidos separadamente. Limites: sem dispositivo Android/Expo, sem validação de falhas de disco reais ou execução independente do sensor anterior à correção; o modelo efetivo do revisor não é observável pela ferramenta. Não declarar P0-01 completo.

