# Revisão parcial CHECKOUT-01 — serviço SQLite

Resultado: **PASS parcial** dos critérios 1, 2, 3 e 5 nos cenários exercitados; nenhum gap bloqueante identificado no escopo do serviço. CHECKOUT-02, interface e Android não foram avaliados como prontos.

| Critério | Evidência e limites |
|---|---|
| 1 | pps/mobile/test/checkoutSqlite.test.ts:33 fecha e reabre arquivo SQLite real, compara registro completo (ID, item e parcela) e calcula 2500 − 1000 = 1500. |
| 2 | checkoutSqlite.test.ts:69 injeta falha em cada uma das seis chamadas unAsync (venda, item, dois pagamentos, outbox e marcador), verifica rascunho intacto, quatro tabelas vazias e retry 1/1/2/1. checkoutSqlite.ts:122–127 grava tudo na mesma transação. checkoutSqlite.test.ts:165 injeta falha antes do efeito do COMMIT, verifica rollback e retry idempotente. Não simula morte abrupta ou falha após efeito do COMMIT. |
| 3 | checkoutSqlite.test.ts:47 reabre o arquivo após commit, repete conclusão e compara venda, ID, parcelas, marcador e contagens; confere conteúdo da outbox. |
| 5 | checkoutSqlite.test.ts:87 rejeita saldo aberto, descarte, alteração de item e de parcela; preserva rascunho e não cria venda/outbox. checkoutSqlite.ts:84–85 também rejeita remover parcelas anteriores por comparação do prefixo. |

Validação: checkoutSqlite.ts:25 valida schema, identidade, duplicidade e limites de pagamento; :38–48 rejeita JSON inválido, múltiplos rascunhos e ID divergente. checkoutSqlite.test.ts:102 e :136 cobrem JSON inválido, multiplicidade, ID divergente e marcador concluído sem venda, preservando rascunho. :150 verifica rejeição de conteúdo divergente no carregar e concluir. :116 verifica caixa fixo e persistido; FK exige caixa na mesma partição. Sessão é relida em checkoutSqlite.ts:102–105 e conta, loja, aparelho e operador são comparados; checkoutSqlite.test.ts:189 testa corrida com alteração de aparelho e operador. Autoria ainda é capturada na conclusão, conforme comentário do serviço, dependente de P0-03.

Limites de concorrência e recuperação: a fila em `armazenamentoSqlite.ts:18` é por instância; concorrência de múltiplas instâncias não foi verificada. A recuperação não exige outbox presente, cuja ausência pode representar sincronização concluída.

Comando: tk proxy npm run test --workspace=@pdv/mobile -- test/checkoutSqlite.test.ts — exit 0, 1 arquivo, 17 testes aprovados (Node SQLite experimental).

Sensor independente realizado na revisão anterior (versão com 16 testes): cópia temporária do mobile com a linha de INSERT da outbox removida e dependências existentes; itest run test/checkoutSqlite.test.ts nessa cópia resultou em exit 1, 10 falhas e 6 sucessos. A asserção em checkoutSqlite.test.ts:63 detectou contagens [1,1,2,0] em vez de [1,1,2,1]; a fronteira 6 deixou de falhar. Implementação do workspace não foi alterada.

Limites: nenhum teste em Android, de sincronização remota, UI ou falha física de energia; testes de Node usam SQLite real, não o driver Expo.
