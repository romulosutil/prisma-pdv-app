# Entrega de código

## Test Coverage Matrix

| Camada | AC | Profundidade |
|---|---|---|
| Contratos/config | 7 | Modo/ring/segredos/cifra externa, SMTPvalidado sem rede |
| Fila/PG | 3–6,7 | Claim concorrente, clock apóstrava, rollback/fencing/TTL/limites/limpeza/rotação |
| Scheduler | 8 | Timers/promises, não sobrepor, erros sanitizados e shutdownaguarda |
| API/protocolo | 1,2,9 | Fastify+PG+SMTP TCP,204uniforme/login real com código recebido/ACK perdido/finanças |

## Gate Check Commands

- quick: alvos do workspace --maxWorkers=1, typecheckAPI, diff--cached--check para arquivos novos.
- build: API PGlite/PostgreSQL dedicado, mobile/shared e typecheck todos; jamais duas suites concorrentes no mesmo PG(helperTRUNCATE).
- validate_spec/tasks/state e check_commit da skill; revisão nova por entrega e verificador final com sensor emscratch isolado. Todoshell começa rtk. Não chamar ferramentas deGoal nos subagentes; controle centralizado no gestor.

## Execution Plan

```text
T1 -> T2
T1 -> T3
T2 -> T4
T3 -> T4
```

Máximo2executores: T2/T3 em paralelo independente, sem commits/novosagentes. Gestor centraliza integrações/commits/docs e revisão de auth/persistência. T4 não começa antes dos contratos dos dois módulos aceitos.

## Task Breakdown

### T1: Contratos e decisões da entrega
Depends on: none
Where: apps/api/src/email/tiposEntrega.ts e docs da feature/STATE do gestor.
Tests: contratos type-only compilam, spec/tasks validators; revisão independente da ordem de locks/fencing/rotação e interfaces antes dos executores.
Gate: quick
Done when: contratos estáveis/autorizados dentro do Goal, modelo solicitado/limitação registrados, ownership e comandos definidos, sem fonte legada alterada.
Status: aceita como contrato de planejamento após revisao-contratos.mdPASS estático; typecheckAPI e validadores spec/tasks0erros. Domíniofixo/guardadependênciasdev/barreiraoperacional/fairnessporsequência definidos antes de delegar. Nenhuma fila/worker foi implementada ou marcada verificada por este aceite.

### T2: Fila cifrada, claims e retomada
Depends on: T1
Where: apps/api/src/db/schema.ts, drizzle0005/meta, email/filaCodigo.ts e test/emailFilaCodigo.test.ts.
Tests: AC3–7 PostgreSQL real e PGlite, duasinstâncias/locks/clock, falhas nas fronteiras, TTL/uso/esgotamento/substituição, retry5delays/fencing/ACK/rotação e limpeza.
Gate: build
Done when: invariantes do design comprovados por asserções de registros/valores integrais; nenhum lock/transação durante SMTP; revisão nova passa sem tratar mocks como SMTP externo.
Status: pending.

### T3: Configuração de chaves e ciclo do worker
Depends on: T1
Where: apps/api/src/email/configuracaoEntrega.ts, apps/api/src/jobsEmail.ts e test/{emailConfiguracaoEntrega,jobsEmail}.test.ts.
Tests: AC7/8 modos inválidos/chaves/formato e não exibir segredos, timers5s/concorrência/erros/parada aguarda/callbacks; sem tocar config/index legados.
Gate: quick
Done when: configuração valida antes de banco/rede e ring permite antiga/nova; scheduler tem ciclo recuperável local e logs somente contadores/texto próprio; revisão nova passa.
Status: pending.

### T4: Emissão atômica e integração local
Depends on: T2, T3
Where: deps.ts/servidor.ts/index.ts, rotas/{conta,recuperacao}.ts, servicos/codigoLogin.ts, testesAPI de emissão/integração e texto de login mobile; docs operacionais pelo gestor.
Tests: AC1/2/7/8/9, DBfault/ratebudget/supersessão, OTPlogin/recuperação e quinta falha, Fastify/PG/SMTP TCP com ACK perdido, runtime antesde efeitos/shutdown e regressões todosworkspaces.
Gate: build
Done when: fila/worker realmente conectados em modoSMTP, código recebido localautentica, resposta uniforme/sem segredo, códigoantigo/financeiro preservado emfalha; revisão finalnova9ACs e sensorPASS; externo continua pendente.
Status: pending.
