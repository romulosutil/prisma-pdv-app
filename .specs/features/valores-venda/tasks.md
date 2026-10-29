# Valores da venda

## Test Coverage Matrix

| Camada | AC | Profundidade |
|---|---|---|
| Validador puro | 1,2,3 | Ties/zero/faixa/somas/parcelas/troco/duplicatas com resultados explícitos |
| API e DB reais | 1–5 | 2500/2499, HTTP400/200, snapshots completos, lote misto/retry, história e imutabilidade |

## Gate Check Commands

- quick: rtk npm run test -w @pdv/api -- test/valoresVenda.test.ts test/syncValoresVenda.test.ts test/sync.test.ts --maxWorkers=1; typecheck API.
- build: suíte API completa PGlite e depois PostgreSQL local dedicado, mobile/shared e typecheck todos, sempre serial e maxWorkers1. Base351API/PGlite ou384comPG,433mobile,148shared.
- validate_spec/tasks e check_commit antes do commit; validate_state após verificador novo com sensor>=5 em scratch isolado. Revisão por asserção/file:line; sem enfraquecer testes antigos. Não somar variantes PG/PGlite.

## Execution Plan

```text
T1 -> T2
T2 -> T3
```

## Task Breakdown

### T1: Contrato aritmético e preservação histórica
Depends on: none
Where: spec/tasks desta feature e STATE do gestor.
Tests: validate_spec/tasks; inspeção do mobile/SQL e semântica de pagamento líquido; decisões antes da delegação.
Gate: quick
Done when: escopo e política de faixa/legado definidos, arquivos e comandos atribuídos, sem alteração financeira ainda.
Status: aceito pelo gestor: semântica líquida inspecionada em VendasRepo/checkoutSqlite/useCobranca; validate_spec/tasks0erros,1aviso de granularidade aceito porque T2 entrega um comportamento atômico do push. AD027 registrada, sem código alterado.

### T2: Validar venda no push sem reescrever história
Depends on: T1
Where: apps/api/src/servicos/{valoresVenda,sync}.ts, test/{valoresVenda,syncValoresVenda}.test.ts e fixture test/ajuda.ts. Executor não altera docs/arquivos fora desse conjunto.
Tests: AC1–5, testes primeiro a partir do contrato; snapshots totais de vendas/filhos/mudanças/ACK/caixas/movimentos, lote misto e retry; comparações de todos campos imutáveis e legado sem recalcular. API PGlite/PG e regressões financeiras.
Gate: build
Done when: gates passam, gestor revisa diretamente persistência/sync, revisor novo aceita com evidências; commit central e verificador final novo com sensor antes de aceitar a feature.
Status: implementado e aceito no escopo T2 pelo gestor após revisão independente revisao.md PASS. Gates finais seriais:359API/PGlite,392API comPostgreSQL,433mobile,148shared,typecheck todos. Revisor repetiu24alvos por banco e typecheckAPI; snapshots completos e provas isoladas reforçados após achados. Nenhuma asserção legada removida/enfraquecida, fixture somente líquido700. Verificador FINAL novo aprovou5ACs apósT3;9/9mutações detectadas nas fontes610afad/933db20, validate_state0.

### T3: Provar rejeição de venda entre lojas
Depends on: T2
Where: apps/api/test/syncValoresVenda.test.ts e documentos da feature/lessons via script pelo gestor.
Tests: AC4 três variantes: payload com loja diferente da sessão em ambas direções e ID existente de outra loja com loja forjada igual à sessão; HTTP200, aceitas vazio, motivo loja_invalida, snapshot integral inalterado em PGlite/PostgreSQL. Revisor final repete verificação após correção.
Gate: quick
Done when: casos faltantes passam nos dois bancos e typecheck, nenhuma fonte alterada, verificador reavalia a lacuna e mantém evidências do sensor já executado na fonte idêntica.
Status: correção de provas implementada pelo gestor após validation.md FAIL. Quick25/25 em PGlite e25/25 PostgreSQL, typecheckAPI PASS; fontes idênticas610afad. L018 candidata registrada via script, sem promoção. Reavaliação final PASS: verificador repetiu25porbanco/typeAPI,2sensores extras de guardas de loja detectados e7anteriores válidos pois fontes idênticas, total9/9. validate_state0; feature aceita localmente. Gates amplos do código610afad continuam válidos, sem afirmar novos totais amplos não executados.
