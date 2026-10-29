# Origem e papel no push

## Test Coverage Matrix

| Camada | AC | Profundidade |
|---|---|---|
| Rotas/DB reais | 1–4 | Papel e origem válidos/inválidos com controles; snapshots completos, ACK, histórico e troca de aparelho |
| Concorrência PostgreSQL | 5 | Duas instâncias, bloqueio observado e papel atualizado antes da aplicação |

## Gate Check Commands

- quick: rtk npm run test -w @pdv/api -- test/syncOrigem.test.ts test/syncSessao.test.ts test/syncValoresVenda.test.ts test/sync.test.ts --maxWorkers=1, PGlite e depois PostgreSQL dedicado; typecheckAPI.
- build: API completa nas duas variantes, mobile/shared e typecheck todos, serial e maxWorkers1. Base363API/PGlite ou411PG,434mobile,150shared. Nunca somar variantes/repetições.
- validate_spec/tasks e check_commit; revisor novo por entrega, verificador final novo com sensorP0>=5 em scratch/validate_state antes de aceitar. Gestor revisa diretamente auth/persistência/sync.

## Execution Plan

```text
T1 -> T2
```

## Task Breakdown

### T1: Contrato mínimo de escrita e histórico
Depends on: none
Where: spec/design/tasks desta feature e STATE do gestor.
Tests: inspeção de cadastro/login dono, schema de papéis e caminhos de sync/ACK; validate_spec/tasks.
Gate: quick
Done when: política inicial e erros definidos antes de delegar, compatibilidade com sessao-sync e histórico explícita.
Status: aceito pelo gestor por inspeção dos caminhos atuais; validate_spec/tasks com zero erros e um aviso de granularidade aceito pela política única em helper/serviço/teste. AD031/032 registrados antes da delegação, nenhuma fonte alterada.

### T2: Restringir novas escritas e preservar origem confirmada
Depends on: T1
Where: apps/api/src/auth.ts, apps/api/src/servicos/sync.ts e apps/api/test/syncOrigem.test.ts. Executor não altera outros arquivos.
Tests: cinco ACs com expectativas exatas, RED comportamental antes de implementar; PGlite/PostgreSQL reais e controle positivo de cada rejeição, sem mock de persistência.
Gate: build
Done when: gates completos passam e gestor/revisor independente verificam origem, papel, história e snapshots; commit central antes de verificador final novo com sensor.
Status: pendente.
