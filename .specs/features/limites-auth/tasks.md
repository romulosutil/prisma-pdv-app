# Limites de autenticação

## Test Coverage Matrix

| Camada | Critérios | Prova |
|---|---|---|
| Banco/serviço | 1,7,8 | PGlite local e concorrência real PostgreSQL17, prazos exatos, rollback, chave opaca |
| Rotas | 2,3,4,5,6,7 | Fastify real em processo, duas instâncias, estado persistido/sessões/código, limites com IPs diferentes |
| Operação | 8 | Procedimento SQL inspecionado, sem alterar banco externo |
| Mobile/HTTP | 9 | Fetch simulado explícito, mensagem local, token preservado e retentativa |

## Gate Check Commands

- quick: `rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1 test/limitesAuth.test.ts` e typecheck API.
- build: suítes API/mobile/shared, `rtk proxy npm run typecheck`, `rtk git diff --check`; API também PostgreSQL local dedicado via PDV_TEST_POSTGRES_URL.
- Mensagens de commit e spec/tasks/state validados pelos scripts da skill tlc-spec-driven.

## Execution Plan

```text
T1 -> T2
T2 -> T3
```

Três lotes sequenciais, gestor centraliza revisão direta de autenticação, integração e commits. Executores/revisores Terra Médio conforme AD-005. Nenhum agente cria subagente.

## Task Breakdown

### T1: Orçamento persistente e transacional
Depends on: none
Where: apps/api/src/db/schema.ts, apps/api/drizzle/0003* e meta, apps/api/src/servicos/limitesAuth.ts, apps/api/test/limitesAuth.test.ts.
Tests: critérios1/7/8, janela15min, cooldown60s, contagens3/20/5/50, recuo, criação concorrente e rollback.
Gate: quick
Done when: tabela migrada sem alterar dados legados, serviço consome/verifica com trava e relógio pós-trava, estado compartilhado e testes passam; revisão independente aprova antes de integrar rotas.
Status: aceita localmente; gestor12/12 PGlite e revisão nova14/14 PostgreSQL17, typecheck API aprovado. Corrigidos recuo após check sem consumo e início no primeiro consumo tardio; revisao-banco.md PASS. Rotas e retenção ainda T2.

### T2: Aplicar limites na emissão e no login
Depends on: T1
Where: apps/api/src/rotas/conta.ts, apps/api/test/limitesAuthRotas.test.ts; fixtures de tempo nas suítes conta/sessoes e integração mobile caso necessário, sem enfraquecer asserções; docs/operacao-autenticacao.md.
Tests: critérios2a8 via duas instâncias e PostgreSQL real; manter todos os testes legados, corpo400, produção anti-enumeração, código anterior preservado, reenvio não reinicia erros e rollback não apaga contagem.
Gate: build
Done when: rotas aplicam orçamento antes de consultar conta, erros esperados confirmam contadores, não há sessão indevida nem emissão fora do limite; retenção/proxy documentados; revisão nova com sensor em scratch aprova contrato local.
Status: aceita localmente; API149/149 PGlite e153/153 PostgreSQL17, mobile351/351, shared136/136, typecheck todos aprovado. Revisor novo executou14/14 rotas no PostgreSQL; revisao-rotas.md PASS. Fixtures só avançam relógio; erro após consumo/insert sessão faz rollback e preserva código.

### T3: Orientação de limite no cliente
Depends on: T2
Where: apps/mobile/src/servicos/backend.ts e backendHttp.ts, apps/mobile/test/backendAcesso.test.ts.
Tests: critério9 com 429 público/privado, corpo adversarial, credencial preservada e retentativa bem-sucedida.
Gate: build
Done when: categoria de erro local reconhece429 com texto definido, nunca passa mensagem arbitrária, preserva sessão; revisão final nova verifica critérios1a9 e sensor isolado.
Status: execução concluída, aguardando verificador final novo; mobile353/353, API149/149 PGlite e153/153 PostgreSQL antes do ajuste apenas no cliente, shared136/136 e typecheck todos passaram. Os dois testes novos falharam com categoria cartao_recusado antes da implementação e passaram com categoria local de429.

## Adequação de testes T3

| Critério | Asserção localizada | Resultado exigido |
|---|---|---|
| AC9 categoria e orientação | apps/mobile/test/backendAcesso.test.ts:23 `expect(erro).toMatchObject({ codigo: 'limite_autenticacao', status: 429 })`; :24 `expect(mensagemDeErro(erro)).toBe(...)` | 429 prevalece sobre código adversarial no corpo; texto local exato |
| AC9 credencial e sanitização | apps/mobile/test/backendAcesso.test.ts:25 `expect(erro.message).not.toContain('token-secreto')`; :26 callback não chamado; :27 token igual | Nenhuma invalidação nem exibição do corpo recebido |
| AC9 retentativa | apps/mobile/test/backendAcesso.test.ts:28 `expect(await chamar()).toEqual(...)`; :29 cabeçalhos iguais | Pedido posterior prossegue; token privado preservado, público sem token |

| Asserções | Requisito | Necessidade |
|---|---|---|
| backendAcesso.test.ts:23-24, dois casos parametrizados | AC9 categoria e mensagem | Manter, detectaram falha antes da implementação |
| backendAcesso.test.ts:25-27, dois casos | AC9 corpo arbitrário e credencial | Manter, saída/estado em vez de só chamadas |
| backendAcesso.test.ts:28-30, dois casos | AC9 retentativa e autorização | Manter, verifica resultado e cabeçalhos |

Adequação: critérios locais cobertos, sem exclusão/skip/enfraquecimento de testes; mesmos padrões Vitest do projeto. Fetch simulado explícito; UI nativa permanece pendente globalmente.
