# Revisão independente: recuperação e fixture

Data: 2026-10-30. Escopo: AC1 de `spec.md` e diff dos dois testes de recuperação. Autor da alteração e revisor são distintos.

**Resultado: PASS para o ajuste da fixture, testes direcionados e sensor restrito de revogação.** O UAT externo permanece pendente; esta revisão não valida os demais critérios do checkpoint.

## Evidências

- A fixture cria a conta pelo helper existente e altera apenas `planoId` da assinatura para `essencial`: `apps/api/test/recuperacaoAparelho.test.ts:13` e `apps/mobile/test/recuperacaoApiIntegracao.test.ts:55`. Esse plano define um aparelho em `packages/shared/src/planos.ts:59`; o cenário mobile verifica o limite com erro 409 em `apps/mobile/test/recuperacaoApiIntegracao.test.ts:78`. A preparação escreve diretamente no banco de teste, mas não emite sessão nem contorna os endpoints de código e confirmação: `apps/api/test/recuperacaoAparelho.test.ts:37`, `apps/api/test/recuperacaoAparelho.test.ts:55` e `apps/mobile/test/recuperacaoApiIntegracao.test.ts:50`.
- Consentimento: ausência produz 400 e estado inalterado, `confirmar: false` produz 400, e confirmação explícita produz 200 e o novo aparelho: `apps/api/test/recuperacaoAparelho.test.ts:55`, `apps/api/test/recuperacaoAparelho.test.ts:58`, `apps/api/test/recuperacaoAparelho.test.ts:60`, `apps/api/test/recuperacaoAparelho.test.ts:61`, `apps/api/test/recuperacaoAparelho.test.ts:63` e `apps/api/test/recuperacaoAparelho.test.ts:64`.
- Revogação: token anterior recebe exatamente 401 e o novo 200 em `apps/api/test/recuperacaoAparelho.test.ts:68` e `apps/api/test/recuperacaoAparelho.test.ts:69`; integração mobile também espera status 401 em `apps/mobile/test/recuperacaoApiIntegracao.test.ts:104`.
- Preservação: carrinho original mantém 2500 centavos, saldo 1500 e parcela 1000 em `apps/mobile/test/recuperacaoApiIntegracao.test.ts:106` e `apps/mobile/test/recuperacaoApiIntegracao.test.ts:107`. Os registros financeiros da API são comparados integralmente antes e depois em `apps/mobile/test/recuperacaoApiIntegracao.test.ts:75` e `apps/mobile/test/recuperacaoApiIntegracao.test.ts:110`.
- O diff examinado adiciona configuração de fixture e chamadas a ela; não remove nem altera asserções existentes. Não há alteração de código de runtime neste diff.

## Execução

Executados sequencialmente, com um worker:

- `npm run test -w @pdv/mobile -- test/recuperacaoApiIntegracao.test.ts --maxWorkers=1`: 3/3 passaram.
- `npm run test -w @pdv/api -- test/recuperacaoAparelho.test.ts --maxWorkers=1`: 33/33 passaram, no ambiente PGlite.

SHA-256 antes e depois, iguais: API `173af97b879291bd3283246a8c55784356ba64eb28de5a8bf2af1a375d0dec83`; mobile `94977e1d09d7a134ba6e8ac679c51b6307780a1f82f7165f8d7e8c6f18f1f98a`.

## Sensor de discriminação

Um plugin Vitest em arquivo temporário individual transformou em memória `apps/api/src/rotas/recuperacao.ts:80`, omitindo as atualizações que revogam aparelho e sessões de origem. A execução do mesmo alvo mobile, com `--config` apontando para o arquivo temporário e `--maxWorkers=1`, imprimiu `MUTANTE_APLICADO` e terminou com 2 falhas de asserção e 1 aprovação. As asserções em `apps/mobile/test/recuperacaoApiIntegracao.test.ts:102` e `apps/mobile/test/recuperacaoApiIntegracao.test.ts:139` esperavam um aparelho ativo e encontraram dois: **mutante detectado**. A primeira falha precede a asserção de 401; não se afirma que ela também foi alcançada nesse ensaio. O arquivo temporário foi removido individualmente. O SHA-256 da rota permaneceu `48f983b09ffdd53297c06947a002ffc185fa265fad411793035e9976496e8690` antes e depois; os hashes dos testes também permaneceram iguais. Este sensor cobre uma mutação composta, não todos os caminhos nem preservação de dados.

## Limites

Os testes utilizam API em processo, banco de teste, SQLite de teste e cofre simulado (`apps/mobile/test/recuperacaoApiIntegracao.test.ts:16`, `apps/mobile/test/recuperacaoApiIntegracao.test.ts:43` e `apps/mobile/test/recuperacaoApiIntegracao.test.ts:46`). Não comprovam SMTP externo, cofre nativo ou UAT em aparelho. O UAT externo anterior permanece não comprovado e pendente, conforme `spec.md`.
