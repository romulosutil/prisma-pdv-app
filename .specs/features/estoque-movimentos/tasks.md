# Estoque por movimentos: execução

## Execution Protocol

Implementar com tlc-spec-driven. Pedido do usuário autoriza implementação e commits locais; sem push/deploy. Cinco entregas sequenciais, executadas pelo agente principal; Verifier independente ao final, com sensores somente em memória conforme AD-049.

## Test Coverage Matrix

Padrões: RTK.md, .specs/STATE.md AD-049, package.json, .github/workflows/pdv.yml; Vitest, fixtures explícitas de apps/api/test/ajuda.ts e SQLite real de apps/mobile/test/sqliteBanco.ts.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domínio | unit | AC1–3,5,8,10, limites | packages/shared/test/estoque.test.ts | npm run test -w @pdv/shared -- test/estoque.test.ts |
| API | integration | AC4–5,9,11, compatibilidade e isolamento | apps/api/test/syncEstoque.test.ts | npm run test -w @pdv/api -- --maxWorkers=1 test/syncEstoque.test.ts |
| Persistência | integration | AC1–3,6,8, SQLite e navegador | apps/mobile/test/estoquePersistencia.test.ts | npm run test -w @pdv/mobile -- --maxWorkers=1 test/estoquePersistencia.test.ts |
| Interface | unit | AC7,10, campo intocado | apps/mobile/test/estoqueInterface.test.ts | npm run test -w @pdv/mobile -- --maxWorkers=1 test/estoqueInterface.test.ts |
| Sync | integration | AC4–6 por HTTP, duas instalações | apps/mobile/test/estoqueSync.test.ts | npm run test -w @pdv/mobile -- --maxWorkers=1 test/estoqueSync.test.ts |

## Gate Check Commands

| Gate Level | Command |
| --- | --- |
| quick | Alvo da tarefa e typecheck do workspace correspondente |
| full | Alvos relacionados de API/mobile em série com --maxWorkers=1 |
| build | Suítes shared, API e mobile em série com --maxWorkers=1; npm run typecheck; git diff --check |

## Execution Plan

T1 → T2 → T3 → T4 → T5

## Task Breakdown

### T1: Contrato e projeção do saldo
**Where**: `packages/shared`
**Depends on**: None
**Tests**: unit, critérios EST-01 e limites; contratos opcionais preservam legado.
**Gate**: quick
**Done when**: saldo/histórico exatos, deduplicação de ajustes, testes e tipos aprovados.
**Status**: concluída; 7/7 shared e tipos PASS.

### T2: Sincronizar movimentos imutáveis na API
**Where**: `apps/api`
**Depends on**: T1
**Tests**: integration, EST-02; ajustes concorrentes, legado, permissões, isolamento e marcador imutável.
**Gate**: full
**Done when**: migração aditiva, merge e pull preservam eventos; testes e tipos aprovados.
**Status**: concluída; 33/33 PostgreSQL e tipos API PASS.

### T3: Conectar o saldo ao checkout persistido
**Where**: `apps/mobile/src/dados`
**Depends on**: T2
**Tests**: integration, EST-03; navegador e SQLite, falha e reabertura, cancelamento e ajustes.
**Gate**: full
**Done when**: venda atômica captura controle, repositório projeta saldo e edição cria ajuste; testes aprovados.
**Status**: concluída; 42/42 mobile e tipos PASS.

### T4: Avisos e histórico no produto
**Where**: `apps/mobile/src/telas`
**Depends on**: T3
**Tests**: unit, EST-04; aviso com venda permitida, números negativos, histórico e estoque intocado no formulário.
**Gate**: quick
**Done when**: interface comunica saldo e histórico sem alterar meios de pagamento; testes aprovados.
**Status**: concluída; 30/30 alvos, tipos e QA visual web PASS.

### T5: Provar convergência e documentar operação
**Where**: `apps/mobile/test/estoqueSync.test.ts`
**Depends on**: T4
**Tests**: integration, EST-05; HTTP/SQLite em duas instalações, resposta perdida, ajustes concorrentes e restauração.
**Gate**: build
**Done when**: provas integradas e regressão aprovadas, documentação e STATE atualizados.
**Status**: pendente.

## Diagram-Definition Cross-Check

| Task | Depends on | Diagrama |
| --- | --- | --- |
| T1 | None | origem |
| T2 | T1 | T1 → T2 |
| T3 | T2 | T2 → T3 |
| T4 | T3 | T3 → T4 |
| T5 | T4 | T4 → T5 |

## Test Co-location Validation

Cada entrega inclui os testes da camada da matriz no mesmo commit. T5 acrescenta somente provas integradas que dependem das quatro entregas. Revisão de suficiência e necessidade será registrada em execution.md por tarefa, com assertivas localizadas.
