# Entregas da base de persistência

## Test Coverage Matrix

| Camada | Requisito | Evidência exigida |
|---|---|---|
| SQLite real | LOCAL-01 | Arquivo reaberto, FKs, rollback, versão futura |
| Observável/storage | LOCAL-02 | Falhas, fila, snapshots e JSON inválido |
| Migração/adaptador | LOCAL-03 | Contagens/totais, duas execuções, corrupção e rollback |

## Gate Check Commands

- quick: `rtk npm run test --workspace=@pdv/mobile -- test/sqliteSchema.test.ts test/persistidoDuravel.test.ts test/sqliteArmazenamento.test.ts` (somente arquivos já criados).
- build: `rtk npm run test` e `rtk npm run typecheck`.
- Artifacts: `rtk proxy python -X utf8 C:/Users/Ronal/.codex/skills/tlc-spec-driven/scripts/validate_spec.py persistencia-base` e `validate_tasks.py persistencia-base`.
- Aceite: revisão independente nova por entrega relevante, conferida pelo gestor; nenhum critério global é marcado a partir de mock.

## Execution Plan

```text
T1 -> T3
T2 -> T3
```

T1 e T2 são independentes, arquivos disjuntos. T3 pelo gestor depois dos contratos estáveis. Commits apenas pelo gestor, um por tarefa aceita, com atualização dos registros.

## Task Breakdown

### T1: Schema SQLite versionado
Depends on: none
Where: apps/mobile/src/dados/sqlite/ (driver e schema); teste sqliteSchema.
Tests: LOCAL-01, critérios 1 e 2 do spec, SQLite real.
Gate: build
Done when: schema de produtos/caixas/vendas/itens/pagamentos/rascunho/outbox e metadata tem partição e IDs estáveis, inicialização idempotente, versão futura recusada, rollback e FKs verificados; revisor aprova.
Status: em implementação.

### T2: Publicação durável do observável
Depends on: none
Where: observavel e armazenamento existentes; teste persistidoDuravel.
Tests: LOCAL-02, critérios 3 a 5 do spec.
Gate: build
Done when: snapshots só mudam após persistência, fila se recupera após falha, leitura inválida não simula vazio; revisor aprova. Não conclui todo P0-01-C.
Status: em implementação.

### T3: Migração e adaptador SQLite
Depends on: T1, T2
Where: novo adaptador em dados/sqlite; teste sqliteArmazenamento; instancia e configuração Expo quando integrado.
Tests: LOCAL-03, critérios 6 e 7 do spec; rodar sobre SQLite real.
Gate: build
Done when: migração idempotente validada conserva origem, adaptador explícito sem fallback Android, erros recuperáveis e reabertura real verificados; revisor aprova.
Status: pendente.
