# Recuperação de aparelho

## Test Coverage Matrix

| Camada | AC | Profundidade |
|---|---|---|
| Shared | 2,3,4 | DTOs válidos/inválidos, segredo43, consentimento e candidatos |
| API/PG | 1a8 | OTP e limites reais, hashes,401/409,5min, concorrência/rollback/sessão única, finanças intactas |
| HTTP/demo | 9 | Rotas/status/schema, sem token privado/callback público, não simular substituição |
| Dados/SQLite | 10,11,13 | Geração, preflight, cofre, retry, perfis e duas instalações/API real em processo |
| UI | 12 | Hooks React reais/hosts simulados, escolha/consentimento/cancelamento/erro/tarde, Android pendente |

## Gate Check Commands

- quick: suíte do workspace tocado com --maxWorkers=1 e typecheck correspondente; testes novos derivados do spec antes de implementar.
- build: testes mobile/API/shared e typecheck todos, diff--check; API também PostgreSQL17 LOCAL dedicado pdv_test. Não executar TRUNCATE de dois agentes no mesmo banco simultaneamente.
- spec/tasks/state e mensagens de commit: validadores da skill tlc-spec-driven. Revisor novo por entrega; final novo com sensor isolado em scratch.

## Execution Plan

```text
T1 -> T2
T1 -> T3
T2 -> T4
T3 -> T4
T4 -> T5
T5 -> T6
T5 -> T7
```

T2 API e T3 transporte são os dois executores independentes permitidos; Terra Médio explícito, sem criar agentes/commits. Gestor integra, revisa autenticação/persistência e centraliza plano/commits. T1 schemas pelo gestor; T4 Dados após API/adapters aceitos; T5 UI após Dados. Revisores nunca alteram implementação.

## Task Breakdown

### T1: Contratos de recuperação
Depends on: none
Where: packages/shared/src/contrato.ts e packages/shared/test/recuperacaoContrato.test.ts.
Tests: DTOs e invariantes AC2/3/4, consentimento literal, IDs únicos e novo fora dos candidatos.
Gate: quick
Done when: contratos explícitos e compatíveis com endpoints de sessão existentes, schemas/typecheck aprovados e revisão de contrato aceita.
Status: aceita localmente;12 casos novos e148 shared no total, typecheck shared e revisão independente de contrato PASS. Cinco ambiguidades de API/concorrência/geração foram fechadas antes da delegação. Contratos ainda não comprovam entrega real de email/Android.

Adequação T1: recuperacaoContrato.test.ts:21/22 prova pedido preservado e código inválido; :26/27 DTOs completos; :31 literaltrue, :35/36 segredo43, :40-42 candidatos, :46-49 perfil/data/campos fora do contrato. Todos os12 casos mapeiam AC2/3/4; nenhuma asserção legada removida, enfraquecida ou pulada. Os casos de schema não comprovam tempo de execução300000ms, que pertence a T2.

### T2: Recuperação transacional no servidor
Depends on: T1
Where: apps/api/src/{auth,db/schema,rotas/conta}.ts, novos servicos/{codigoLogin,recuperacaoAparelho}.ts e rotas/recuperacao.ts se útil, servidor.ts só registro de rota, drizzle0004/meta e test/recuperacaoAparelho.test.ts.
Tests: AC1a8 com PostgreSQL real e duas instâncias, incluindo guards OTP isolados, rate compartilhado, múltiplas fronteiras de falha, replay idempotente, prazo após lock e tabelas financeiras preservadas.
Gate: build
Done when: OTP e provas restritas não são sessões; confirmação uma vez atomica/consentida, limites compartilhados, replay não renova/revive acesso; revisão independente passa, critérios externos permanecem pendentes.
Status: aceita localmente após reforço de quatro provas da revisão; API180/180 PGlite e186/186 PostgreSQL17,28/30 casos específicos de recuperação, typecheck todos e diff--check aprovados. Gestor repetiu28 PGlite e leu auth/helper/rotas/migração; revisor novo repetiu30 PostgreSQL e typecheck API. revisao-servidor.md PASS AC1a8; financeiro real local comparado e fronteiras/concorrência forçadas. Nenhum SMTP ou Android comprovado.

### T3: Transporte HTTP e erro de limite identificado
Depends on: T1
Where: apps/mobile/src/servicos/backend{,Http,Local}.ts e novo test/backendRecuperacao.test.ts.
Tests: AC9, schemas/routes/payload, status e erro estável,429 e401 público, demo rejeita sem escrita.
Gate: quick
Done when: assinatura dos métodos fixada, DTO real público sem token antigo e sem falsa recuperação demo, erro409limite é identificável pela UI; revisão independente aprova.
Status: aceita no contrato local de transporte;18 testes novos,371 mobile no total e typecheck mobile passaram. Revisor novo repetiu18 casos e typecheck; gestor repetiu18 casos e leu fonte. revisao-transporte.md PASS; fetch/armazenamento fake não provam API real/Android. Adequação AC9 em backendRecuperacao.test.ts:21 DTO/rotas/corpo, :38 token/callback, :49 códigos409, :57 status adversarial, :64 JSON/429, :71/:76 schemas e :81 demo sem leitura/escrita. Todos18 casos mapeiam AC9; nenhuma asserção legada alterada ou pulada.

### T4: Controle de recuperação local e integração
Depends on: T2, T3
Where: apps/mobile/src/dados/dados.ts e novos test/{recuperacaoDados,recuperacaoApiIntegracao}.test.ts, fixtures locais adicionais se estritamente necessárias.
Tests: AC10/11/13, perda resposta/retry, geração/contexto, preflight antes de ambas fases, perfil/cadastro errado e falta de cofre, finanças origem/servidor preservadas em duas instalações reais API+SQLite.
Gate: build
Done when: desafio só memória, sessão só depois de confirmação/perfil/cofre válidos; origem preservada e login novo recuperável. Revisor novo passa sem contar fetch/cofre fake como homologação nativa.
Status: aceita localmente após correção de retry parcial;21 casos novos,392 mobile no total, typecheck todos e diff--check passaram. Revisor novo e gestor repetiram21 alvos. revisao-dados.md PASS AC10/11/13. Regressão reproduziu vínculo antigo recusando retry depois de registrar e falhar carga; adoção agora exige mesma tentativa/geração, sessão ausente e identidade/perfil exatos da própria aplicação validada. Há prova de metadata que comita e lança depois, cofre fake, cancelamento no ponto de aplicação e contexto externo preservado. Sem Android/SMTP/restauração real de vendas.

### T5: Escolha e confirmação no login
Depends on: T4
Where: apps/mobile/app/(onboarding)/entrar.tsx, novo componente de recuperação se necessário, test/recuperacaoTela.test.tsx ou .ts; dados.ts somente getter de visão pendente sem segredo e recuperacaoDados.test.ts somente provas desse getter.
Tests: AC12 e fronteira AC11, erro409 exato oferece, perfil/candidatos reais, confirmação explícita uma vez, cancela, erro/expiração e resposta atrasada sem falso sucesso; remontagem por chave da conta após falha local deve retomar visão só em memória e mesmo alvo. Getter nunca expõe token ou contexto antigo. Navegação inspecionada; Android pendente.
Gate: build
Done when: fluxo acessível com componentes existentes, mensagens honestas sobre acesso/vendas, sem segredo exposto nem ação concorrente; revisão final nova confronta13ACs e mata mutação em scratch.
Status: aceita no contrato local após verificador final novo PASS dos13ACs;406 mobile no total,33 alvos UI/Dados (35 incluindo integração API/SQLite), typecheck todos e diff--check passaram. Gestor repetiu35 alvos e leu fonte/getter. Há testes React com Dados real para remontagem por identidade/falha local, getter sem segredo, mesmo alvo/retry, resposta antiga resolve/rejeita, clique duplo, visão/modal por ID e bloqueio de retorno durante transição mesmo após remontar. Sem teste físico Android/layout/orientação/a11y; roteiro preparado, não executado.

## Adequação T5

| Critério | Evidência | Resultado exigido |
|---|---|---|
| AC12 oferta e consentimento | recuperacaoTela.test.ts:34-46; :48-61 | Somente409limite, perfil/lista reais, escolha e confirmação, duplo clique1chamada |
| AC12 cancelamento e401 | recuperacaoTela.test.ts:63-80 | Resposta antiga ignorada e novo código após prova expirada, sem sucesso fictício |
| AC11/12 remontagem | recuperacaoTela.test.ts:81-99 e testes de getter em recuperacaoDados.test.ts | Dados real retoma visão em memória após falha parcial, corpos idênticos, token fora da visão |
| AC12 contexto e retry | recuperacaoTela.test.ts:100-137 | VisãoA não confirmaB, rede permite mesmo alvo, resultado antigo não altera erro/loading novos |
| AC12 transição | recuperacaoTela.test.ts, caso bloqueia retorno e submissão após remontar | Conta em transição bloqueia BackHandler/gestos/submissões e libera após terminar |

Todos os casos novos mapeiam AC11/12; sem remoção/skip/enfraquecimento de asserções anteriores. Testes React usam hosts nativos simulados, não homologam navegação/a11y físicas. Verificador final localizou asserções e confirmou AC1a13 em validation.md após reforços T6/T7; sensor5/5 na fonte2f62ffb.

### T6: Provas adicionais da revisão final da API
Depends on: T5
Where: apps/api/test/recuperacaoAparelho.test.ts; gestor atualiza apenas os registros desta tarefa.
Tests: AC2–7: candidatos adversariais, snapshots integrais nos conflitos, invalidação isolada por segunda iniciação, múltiplas sessões/traço de confirmação, replay e disputa UUID, alterações durante espera comprovada pela trava.
Gate: build
Done when: cada GAP de API em validation.md possui prova discriminante, sem remover/enfraquecer testes existentes; revisão independente aceita os resultados. Produção permanece intocada.
Status: aceita localmente após revisão final independente;33PGlite/37PostgreSQL alvos, gestor repetiu37PG. Suítes completas185PGlite/193PostgreSQL, typecheck/diff--checkPASS. AC2–7 mapeados em validation.md: filtros:517–520; conflitos:100–105 e421–429; invalidação:523–539; múltiplas sessões/traço:550–556; replay/disputa:61–69 e288–299; revalidação:346–363,372–379 e581–614. Nenhuma asserção removida/enfraquecida; barreira antiga fortalecida com pg_blocking_pids específico. Somente provas, sem alteração de fonte.

### T7: Provas adicionais da revisão final do cliente
Depends on: T5
Where: apps/mobile/test/backendRecuperacao.test.ts, recuperacaoDados.test.ts, recuperacaoApiIntegracao.test.ts e recuperacaoTela.test.ts.
Tests: AC9–12: mensagens409 fixas, preflight SQLite durável em ambas fases, IDs/papel e ordem antes de cofre, adoção parcial somente do próprio vínculo/geração e textos reais de email/revogação.
Gate: build
Done when: os cinco grupos de GAPs do cliente têm asserções precisas e revisão independente passa; nenhuma asserção removida/enfraquecida; sem alteração de fonte ou promessa de homologação física.
Status: em execução; executor independente da API, somente arquivos de teste mobile.
