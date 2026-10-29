# PASS: arredondamento seguro P0-04-A2

Data: 2026-10-29. Verificador independente, não autor. Fonte `e582c09`, diff `395c752..e582c09`. Escopo e critérios: `.specs/features/arredondamento-seguro/spec.md`; execução do gestor: `implementacao.md`. A seleção de Terra Médio foi solicitada e aceita pelo nome da tarefa; o modelo efetivo não foi confirmado independentemente, conforme AD-005.

## Critérios e evidência

| Critério | Resultado esperado e asserção | Resultado |
| --- | --- | --- |
| AC1: fronteira, sinais e zero | `packages/shared/test/dinheiro.test.ts:67` define 0498/0499 → 9007199254740 e 0500/0501/MAX_SAFE_INTEGER → 9007199254741; `packages/shared/test/dinheiro.test.ts:77` verifica os quatro pares de sinais. `packages/shared/test/dinheiro.test.ts:89` e `packages/shared/test/dinheiro.test.ts:90` conferem resultado e ausência de -0; `packages/shared/test/dinheiro.test.ts:94` verifica fator zero. Unidade e peso seguem em `packages/shared/test/dinheiro.test.ts:108` e `packages/shared/test/dinheiro.test.ts:113`. O runtime alterado não usa BigInt. | PASS |
| AC2: validação e oráculo | `packages/shared/test/dinheiro.test.ts:85` usa `(BigInt(bruto) + 500n) / 1000n` como oráculo independente; `packages/shared/test/dinheiro.test.ts:89` compara resultados, incluindo MAX_SAFE_INTEGER. `packages/shared/test/dinheiro.test.ts:97` e `packages/shared/test/dinheiro.test.ts:98` exigem RangeError em ambas as posições para frações, NaN, infinitos e entradas fora da faixa; `packages/shared/test/dinheiro.test.ts:102` exige RangeError para produto excessivo nos quatro sinais. | PASS |
| AC3: SQLite e API | `apps/mobile/test/checkoutSqlite.test.ts:46` exige total 9007199254740; `apps/mobile/test/checkoutSqlite.test.ts:47` e `apps/mobile/test/checkoutSqlite.test.ts:48` exigem item e pagamento; `apps/mobile/test/checkoutSqlite.test.ts:50` verifica retomada e `apps/mobile/test/checkoutSqlite.test.ts:51` contagens [1,1,1,1]. `apps/mobile/test/checkoutSqlite.test.ts:55` compara payload persistido de pai, filhos e outbox. `apps/api/test/syncValoresVenda.test.ts:33` fixa o valor; `apps/api/test/syncValoresVenda.test.ts:41` e `apps/api/test/syncValoresVenda.test.ts:45` verificam ACK e pull integral; `apps/api/test/syncValoresVenda.test.ts:54` exige `venda_inconsistente` e `apps/api/test/syncValoresVenda.test.ts:55` igualdade do snapshot financeiro e ACK. | PASS |

Para inteiro seguro não negativo `bruto = 1000q + r`, com `0 ≤ r < 1000`, `q + (r ≥ 500)` é exatamente o arredondamento meio para cima. `packages/shared/src/dinheiro.ts:46` evita somar 500 ao inteiro próximo de MAX_SAFE_INTEGER; o sinal é aplicado em `packages/shared/src/dinheiro.ts:48`, com zero positivo. O produto e as entradas continuam validados antes da operação. A cobertura inclui bordas 499/500/501, carry 999/1000, sinais, zero, inválidos e faixa. Os dois novos testes shared mapeiam AC1/2; os testes novos de checkout e API mapeiam AC3. Não há teste novo sem requisito.

## Gates e integridade

Repetição independente em série, sem filtro de nome e com `--maxWorkers=1`: `npm run test -w @pdv/shared -- test/dinheiro.test.ts --maxWorkers=1` 19/19; mobile `test/checkoutSqlite.test.ts` 18/18; API `test/syncValoresVenda.test.ts` PGlite 8/8 e PostgreSQL dedicado 8/8; `npm run typecheck` todos os workspaces PASS. Uma tentativa inicial de configurar variáveis em PowerShell aninhado apresentou erros de expansão; os testes shared, mobile e PGlite passaram, e PostgreSQL foi executado separadamente com variável explícita. Typecheck concluiu sem erro. Nenhum runner permaneceu ativo.

Gates completos relatados pelo gestor em `implementacao.md`: 150 shared, 434 mobile e 361 API/PGlite, ou 394 API com PostgreSQL, e typecheck PASS. Total 945 PGlite ou 978 PostgreSQL; esta última variante inclui testes unitários/PGlite, portanto não se somam variantes. Sem skips relatados. Baseline anterior 148 shared, 433 mobile, 359 API/PGlite ou 392 PostgreSQL, mais um teste API previamente validado em cada banco: acréscimos desta feature de 2 shared, 1 mobile e 1 API. Diff inspecionado: nenhuma asserção anterior removida ou enfraquecida; sem schema, migração ou dependência. RED do checkout filtrado pelo gestor não é gate.

## Sensor P0

Cinco mutações comportamentais distintas em `packages/shared/src/dinheiro.ts:46`, cada uma executada isoladamente contra o arquivo inteiro `test/dinheiro.test.ts` no archive de `e582c09`; todas falharam por AssertionError, não por importação:

| Mutação | Evidência | Resultado |
| --- | --- | --- |
| Fórmula antiga `(bruto + 500) / 1000` | 9007199254741 recebido, 9007199254740 esperado | Morta |
| Limiar `> 500` | 0 recebido, 1 esperado no meio | Morta |
| Sem incremento | 0 recebido, 1 esperado | Morta |
| Limiar `>= 499` | 1 recebido, 0 esperado | Morta |
| Incremento 2 | 2 recebido, 1 esperado | Morta |

5/5 mortas. O teste importa `../src` relativamente na cópia; a junction de dependências apontava ao node_modules real, mas o módulo testado era o arquivo mutado da cópia. Nenhuma alegação de sensor mobile/API. `PDV_TEST_POSTGRES_URL` foi zerada para mutantes. O scratch em TEMP foi verificado por caminho absoluto, junction removida separadamente e diretório apagado. `git status --porcelain` antes e após o sensor foi idêntico: ` M README.md` preexistente. A árvore real não foi mutada pelo sensor.

## Qualidade e limites

Alteração mínima e cirúrgica, alinhada aos padrões existentes e `coding-principles.md`; nenhum escopo adicional. Não houve UAT: comportamento numérico e integração local automatizados. SQLite de arquivo, Fastify inject, PGlite e PostgreSQL local foram cobertos; Android, rede externa e cobrança real não foram executados. Nenhuma lacuna ou sinal para registro de lesson. ROUND-01 e ROUND-02 verificados para o escopo especificado; atualização da spec e checkpoint ficam com o gestor.

**Overall: PASS**. ACs 3/3, sensor 5/5, alvos e typecheck PASS.
