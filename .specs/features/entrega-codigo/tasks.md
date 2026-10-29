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
T4 -> T5
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
Status: aceita localmente após revisao-fila.md PASS. Alvos:20PGlite/42comURL (20PGlite+22PG), repetidos pelo revisor; gestor repetiu20PGlite e suíte completa345API/PostgreSQL, além de312API/PGlite antes dos3reforços apenas de teste,433mobile/148shared/typecheck todos. Corrigida aceitação indevida em rejeições falsy. Telemetria prova workers bloqueados; trigger SQL testa ACK e retomada; domínio/rotação/ciphertext/constraints e fairness possuem asserções. Revisão distingue canal mock de SMTP, e snapshot financeiro só tem venda preenchida; T5 completará protocolo e finanças. Nenhum teste removido/enfraquecido/pulado.

Reforço T2: três cenários adicionais mantêm o sucessor ainda enviando enquanto o antigo termina; prova por snapshot integral e ignoradas discrimina fencing. Executor23PGlite/gestor48comPG passaram. Revisor confirmou adequação por inspeção, sem alegar nova execução ou sensor; revisao-fila.md atualizada. Fonte não mudou.

### T3: Configuração de chaves e ciclo do worker
Depends on: T1
Where: apps/api/src/email/configuracaoEntrega.ts, apps/api/src/jobsEmail.ts e test/{emailConfiguracaoEntrega,jobsEmail}.test.ts.
Tests: AC7/8 modos inválidos/chaves/formato e não exibir segredos, timers5s/concorrência/erros/parada aguarda/callbacks; sem tocar config/index legados.
Gate: quick
Done when: configuração valida antes de banco/rede e ring permite antiga/nova; scheduler tem ciclo recuperável local e logs somente contadores/texto próprio; revisão nova passa.
Status: aceita no escopo T3;36/36alvos repetidos pelo gestor,typecheckAPI/diffsemwhitespace, revisao-runtime.mdPASSnovo. Configuração normalizaNODEENVausentecomo development, ringantiga/nova decifrados independentemente, produçãoSMTPválidaapenasparser. jobsEmail.test.ts12–22comprova fronteiras4999/5000/9999/10000 e stop0timers; drain/concorrência/logger e erros sanitizados também verificados. Pureza confirmadaporfoneseminstanciaçãoDB/rede, nãotesteinstrumentado; bootstrap/JOBSoff/guardasDBaindaT4. TodososcasosmapeiamAC7parser/AC8, nenhum anteriorremovido/enfraquecido.

### T4: Emissão e consumo atômicos nas rotas
Depends on: T2, T3
Where: apps/api/src/deps.ts, servidor.ts, rotas/{conta,recuperacao}.ts, servicos/codigoLogin.ts, test/emailEmissaoCodigo.test.ts e fixtures de produção em conta.test.ts/dev.test.ts/limitesAuthRotas.test.ts.
Tests: AC1/2 e guarda de produção de AC7; DBfault/ratebudget/supersessão, OTP login/recuperação e quinta falha, resposta204 uniforme/503 local sem segredo, regressões de autenticação em PGlite/PostgreSQL.
Gate: build
Done when: emissão grava OTP/fila atomicos e consumo cancela fila na mesma transação; limites/finanças preservados, sem logs de OTP; revisor novo aceita as rotas. Bootstrap e SMTP real ficam em T5, sem dar entrega externa por concluída.
Status: aceita no escopo T4 após revisao-emissao.md PASS e reforço de atomicidade. Gestor leu fontes e rodou suítes completas333API/PGlite e363API/PostgreSQL,433mobile,148shared,typecheck todos. Revisor executou89alvos anteriores e18casos de emissão finais no PG; executor86PGlite/92PG em5arquivos. Testes verificam204, logs, supersessão,6fronteiras de emissão com OTP antigo ainda utilizável e3fronteiras de consumo com snapshot/retentativa. Nenhuma asserção financeira legada removida, teste pulado ou expectativa enfraquecida; fixtures prod agora declaram modoemail, sem alegar envio. Bootstrap/protocolo/finanças preenchidas e sensor aindaT5.

### T5: Bootstrap, protocolo local e comunicação
Depends on: T4
Where: apps/api/src/index.ts, iniciarApi.ts e db/conexao.ts (cleanup de erro no migrator), test/emailBootstrap.test.ts, conexaoCleanup.test.ts e emailEntregaIntegracao.test.ts, texto de login mobile e sua regressão existente; docs operacionais pelo gestor.
Tests: AC7/8/9, config antes de efeitos/JOBS off/shutdown, Fastify+PG+SMTP TCP com código recebido e ACK perdido, perfil/código/Message-ID reais locais, snapshots financeiros preenchidos e regressões todos workspaces.
Gate: build
Done when: fila/worker realmente conectados ao modoSMTP, protocolo local comprova login de uso único com código recebido, erros/retomada seguros e texto honesto; verificador final novo confronta9ACs e sensor PASS; homologação externa continua pendente.
Status: implementação e revisão independente T5 aprovadas no escopo, aguarda verificador final novo dos9ACs e sensor. Gates amplos finais em série:351API/PGlite,384API/PostgreSQL,433mobile,148shared,typecheck todos. Revisor15alvos API por variante/13mobile e typecheck, bootstrap/migrator por mocks declarados; protocolo Fastify/PG/SMTP TCP real local. Conexão fecha cliente se migrate falha antes do retorno; UI demo honesta/HTTPcondicional. Tentativa anterior de suites paralelas excedeu memória, foi interrompida e não contada; repetição serial passou. Nenhum teste removido/enfraquecido/pulado.
