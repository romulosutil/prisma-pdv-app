# Validação independente: fase 3

## Seguimento AC4 — commit 985c9b1

Revisão direcionada PASS para o caixa restaurado: `apps/mobile/src/dados/caixa.ts:78` seleciona aberto somente da loja e aparelho atuais; linhas 88 e 106 aplicam a mesma restrição à abertura e aos movimentos; fechamento parte de `atual()` na linha 116. `apps/mobile/src/telas/caixa/ResumoCaixa.tsx:173` informa os caixas anteriores ainda abertos. O teste HTTP/PostgreSQL em `apps/mobile/test/syncIntegracao.test.ts:162` exige histórico igual e, na linha 163, caixa atual nulo; linhas 169–177 exigem zero pendências/rejeições, histórico preservado e vendas vinculadas aos caixas e aparelho corretos.

Baseline independente no scratch de `git archive 985c9b1`: `npm run test -w @pdv/mobile -- test/syncIntegracao.test.ts --maxWorkers=1`, com `PDV_TEST_POSTGRES_URL` apontando ao PostgreSQL de teste dedicado: 5/5 PASS. Após retirar somente o filtro de aparelho de `atual()` na cópia, a mesma suíte falhou 1/5 na linha 163: esperava `null`, recebeu o caixa histórico. Mutante detectado; os cinco sensores anteriores continuam aplicáveis aos arquivos inalterados. Junction removida separadamente, caminho temporário validado e scratch descartado; `git status --porcelain` antes e depois permaneceu somente ` M README.md`.

O gestor informou regressão final de 489 testes/47 arquivos e typecheck mobile PASS; não foram repetidos nesta revisão. A correção documental de LWW por agregado integra o commit. A revisão permanece limitada aos caminhos e provas citados, com checkpoint 3 e avaliação humana pendentes.

**Data:** 2026-10-30
**Diff:** `4ea3832..8a0b3e5`
**Veredito:** PASS técnico com checkpoint 3 e avaliação humana pendentes.

## Evidências por critério

| Critério | Resultado e assertivas |
| --- | --- |
| AC1 | `apps/mobile/test/syncPersistencia.test.ts:65` compara entradas do bootstrap após reinício; linha 100 exige rejeição da gravação com falha da outbox e linha 101 exige agregado e fila vazios. `apps/mobile/test/syncIntegracao.test.ts:69` exige fila vazia após confirmação, linhas 70–73 verificam venda concluída, cancelamento, caixa e IDs de ACK. `apps/mobile/test/syncPersistencia.test.ts:52` exige ausência de eco. SQLite usa transação em `apps/mobile/src/dados/sqlite/armazenamentoSqlite.ts:98`; navegador grava envelope em `apps/mobile/src/dados/syncNavegador.ts:32`. |
| AC2 | `apps/mobile/test/sincronizacao.test.ts:36` preserva ID, linha 37 verifica backoff de 1s, linhas 49–50 recusam ACK inválido, linha 73 recusa confirmação após troca de credencial e linhas 121–122 preservam fila e exigem reautenticação em 401. `apps/mobile/test/syncIntegracao.test.ts:67` preserva IDs após resposta perdida e linha 73 compara ACKs com IDs exatos. |
| AC3 | `apps/mobile/test/syncIntegracao.test.ts:98` compara os 503 IDs, linha 99 exige cursor 503 e linha 100 fila vazia. `apps/mobile/test/syncPersistencia.test.ts:47` injeta falha e linha 50 verifica cursor 0 e agregado vazio; linhas 28–34 protegem edição local e aplicam remoto após ACK. `apps/mobile/test/sincronizacao.test.ts:104` exige leitura de cursores 0 e 500, sem cursor do push. |
| AC4 | `apps/mobile/test/syncIntegracao.test.ts:80` exige login 200; linhas 83–86 comparam vendas, caixa e produtos restaurados e fila vazia. `apps/mobile/app/_layout.tsx:114` agenda abertura/retomada e intervalo ativo; `apps/mobile/src/telas/caixa/StatusSincronizacao.tsx:82` mostra pendentes, rejeitados e data. Smoke informado pelo gestor: offline 2 pendências após reload; PostgreSQL inicialmente 0 vendas/0 caixas/0 ACK; após sync 1 venda de 25, 1 caixa e 2 ACK. Esta prova foi relatada, não repetida nesta revisão. |
| AC5 | `apps/mobile/test/syncIntegracao.test.ts:114` exige uma rejeição; linhas 115–118 preservam payload e venda e confirmam produto vizinho; linhas 120–124 verificam exportação sem token e mutação preservada no retry. `apps/mobile/test/syncPersistencia.test.ts:132` verifica retry sem alterar mutação. Checkpoint 3 e avaliação humana ainda pendentes. |

## Sensor de discriminação

Baseline em arquivo extraído de `git archive 8a0b3e5`, com junction de dependências: `npm run test -w @pdv/mobile -- test/sincronizacao.test.ts test/syncNavegador.test.ts test/syncPersistencia.test.ts --maxWorkers=1`: 20/20 testes, 3 arquivos. Cada mutação abaixo foi isolada e restaurada antes da próxima, executando somente a suíte indicada com `--maxWorkers=1`.

| Falha injetada | Suíte | Resultado |
| --- | --- | --- |
| Remover validação de cobertura e identidade do ACK em `apps/mobile/src/servicos/sincronizacao.ts:99` | sincronizacao | Detectada: 1 teste falhou |
| Inicializar cursor pull incorretamente em 999 em `apps/mobile/src/servicos/sincronizacao.ts:111` | sincronizacao | Detectada: 2 testes falharam |
| Desativar proteção de entidade pendente em `apps/mobile/src/dados/syncAplicacao.ts:56` | syncNavegador | Detectada: 1 teste falhou |
| Ignorar troca de vínculo e sessão em `apps/mobile/src/servicos/sincronizacao.ts:37` | sincronizacao | Detectada: 2 testes falharam |
| Engolir falha de commit do envelope em `apps/mobile/src/dados/syncNavegador.ts:32` | syncNavegador | Detectada: 1 teste falhou |

Sensor: 5/5 detectadas. A junction foi removida separadamente; caminho temporário absoluto validado e cópia removida. `git status --porcelain` antes e depois: somente ` M README.md`, alteração pré-existente preservada. O primeiro pipe PowerShell corrompeu o tar; foi descartado e substituído por arquivo `git archive -o` extraído antes do baseline.

## Gates e limites

O gestor informou regressão mobile 487 testes/47 arquivos antes do caso LWW adicional, alvo final 26 testes/5 arquivos com PostgreSQL 17, HTTP e SQLite, e typechecks de todos os workspaces aprovados. Uma execução com Metro/API ativos sofreu OOM; o alvo PostgreSQL foi repetido com servidores parados e passou, sem ampliar heap ou omitir casos. Estes resultados foram informados pelo gestor, não repetidos nesta revisão. Não existe `tasks.md` para um comando de gate próprio; a execução compacta e os gates estão registrados na spec. O baseline independente acima passou. A fixture de billing/OTP não comprova serviço comercial externo; Android e serviços externos permanecem fora do aceite local.

## Qualidade e pendências

Atualização do gestor após a revisão: a frase residual de LWW por campo em docs/arquitetura.md foi substituída por LWW do agregado por atualizadoEm, coerente com implementação e testes. O seguimento de runtime está descrito acima. A prova humana do checkpoint 3 permanece pendente.

As assertivas citadas verificam estados e valores, não apenas chamadas; os testes examinados mapeiam aos ACs. A revisão não encontrou desvio técnico comprovado na amostra examinada; não constitui auditoria integral de todos os caminhos. A contradição documental de LWW foi corrigida no seguimento. Não houve homologação humana interativa nesta revisão. O gestor deve entregar checkpoint 3 e parar para avaliação humana antes da fase 4. Contagem anterior à feature e comparação integral de todas as assertivas prévias não foram verificadas independentemente. Sem sinais de mutante sobrevivente ou falha comprovada, nenhuma lição foi adicionada.
