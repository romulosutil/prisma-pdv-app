# Sessão do push

## Test Coverage Matrix

| Camada | AC | Profundidade |
|---|---|---|
| Hook/rota/serviço | 1,4 | Sucesso,401/403/400, ACK/vazio e regressões financeiras |
| PostgreSQL concorrente | 2,3,4 | Locks observados, clock após todas esperas, revogações independentes, identidade atual, duas instâncias/logout nas duas ordens |

## Gate Check Commands

- quick: rtk npm run test -w @pdv/api -- test/syncSessao.test.ts test/syncValoresVenda.test.ts test/sync.test.ts --maxWorkers=1 e typecheckAPI, primeiro PGlite e depois PG dedicado.
- build: API completa PGlite e PostgreSQL dedicado em série, mobile/shared e typecheck todos; maxWorkers1 e apenas1suite ativa. Base361API/PGlite ou394PG,434mobile,150shared. Não somar variantes.
- validate_spec/tasks antes da execução, check_commit por commit; revisão nova por entrega, verificador final novo e sensorP0>=5 scratch/validate_state antes de aceitar. Alterações concorrentes só com ownership disjunto, testes sempre exclusivos.

## Execution Plan

```text
T1 -> T2
```

## Task Breakdown

### T1: Fixar contrato transacional e ordem de locks
Depends on: none
Where: spec/design/tasks e STATE do gestor.
Tests: inspeção dos chamadores de aplicarPush, hook, logout/revogação/login e ordens existentes; validate_spec/tasks.
Gate: quick
Done when: contrato compartilhado estabilizado, arquivos/validação definidos, sem alterar fonte.
Status: aceito pelo gestor por inspeção de chamador único, auth hook, logout e revogação/login; validate_spec/tasks0erros e1aviso granularidade aceito pelo comportamento transacional único. AD029 antes de delegar, nenhuma fonte alterada.

### T2: Revalidar sessão antes do ACK e escrita
Depends on: T1
Where: apps/api/src/auth.ts, servicos/sync.ts, rotas/sync.ts e test/syncSessao.test.ts. Nenhum outro arquivo pelo executor.
Tests: AC1–4 conforme design, testes RED primeiro, PGlite/PG reais sem mock de persistência, telemetria PG/duas instâncias e snapshots completos.
Gate: build
Done when: contrato implementado e gates passam, gestor revisa diretamente auth/sync/persistência, revisor independente aceita e commit central precede verificador final novo comsensor antes de aceitar feature.
Status: pendente.
