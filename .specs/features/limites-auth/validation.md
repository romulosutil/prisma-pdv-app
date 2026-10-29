# Validation: limites de autenticação — PASS

**Result**: PASS

**Data:** 2026-10-29. **Verificador:** independente, não autor. **HEAD:** `1fb525588856127033679f30f4465a395f55fa0e`. **Diff:** `b37c617..1fb5255`. Escopo local.

O parecer inicial em `355b89a` foi FAIL por falta de provas de rollback na emissão e do limite próprio do código. O commit `1fb5255` acrescentou testes que fecham ambas as lacunas; os testes e o novo sensor passaram. As duas lições candidatas foram registradas pelo gestor.

## Tarefas

T1 e T2 constam aceitas localmente; T3 consta concluída, pendente desta verificação. Não alterei tarefas ou traceabilidade por restrição de escrita.

## Critérios e evidências

| AC | Resultado exigido e asserção | Resultado |
|---|---|---|
| 1 | `apps/api/test/limitesAuth.test.ts:123` espera bloqueio após reabrir; `:135` exige 5 concessões e 7 recusas concorrentes no PostgreSQL; `apps/api/test/limitesAuthRotas.test.ts:267` exige 1 emissão e 7 recusas entre instâncias. | PASS |
| 2 | `apps/api/test/limitesAuthRotas.test.ts:35` e `:36` exigem 429 e corpo exato; `:37` usa o código anterior; `:39`, `:44`, `:47` provam cooldown, orçamento e renovação; `apps/api/test/limitesAuth.test.ts:46` e `:50` testam 59.999 e 60.000 ms. | PASS |
| 3 | `apps/api/test/limitesAuthRotas.test.ts:51`–`:57` verificam 20 requisições, XFF, 429 e outro IP; `:67` e `:69` exigem 204 vazio e 429 em produção simulada. | PASS |
| 4 | `apps/api/test/limitesAuthRotas.test.ts:85` exige 401 codigo_invalido após cinco falhas, reemissão e outro IP; `:94`–`:110` verificam ausente, usado, expirado e contagem 5; `:117`–`:120` conta desconhecida; `:145`–`:151` verificam 409, contadores e preservação do código. | PASS |
| 5 | `apps/api/test/limitesAuthRotas.test.ts:129`–`:138` exigem 50 tentativas, 429 no código correto, sessão anterior válida e outro IP independente. | PASS |
| 6 | `apps/api/test/limitesAuthRotas.test.ts:149`–`:150` verifica commit em 409; `:177`–`:201` exige 500 e rollback de login; `:204`–`:224` exige 500, snapshots iguais, código anterior válido e reemissão após falha no insert, com e sem código anterior. `:230`–`:245` prepara quatro erros legados, verifica o quinto, bloqueio 401 com contador de email em 2, código não consumido, sem sessão extra e novo código aceito. `apps/api/test/conta.test.ts:110` e `:113`–`:131` cobrem uso único e expiração. | PASS |
| 7 | `apps/api/test/limitesAuth.test.ts:108` exige objeto apenas com chave, instantes e contagem e `:109` exclui identificador; `apps/api/src/db/schema.ts:375` define colunas; `apps/api/test/limitesAuthRotas.test.ts:156`–`:159` exigem 400 requisicao_invalida e zero estado. | PASS |
| 8 | `apps/api/test/limitesAuth.test.ts:46`, `:78`–`:98` exercitam recuo e piso; `:158`–`:162` verificam relógio após trava PostgreSQL; `apps/api/test/limitesAuthRotas.test.ts:259` verifica retenção preservativa. SQL preparado em `docs/operacao-autenticacao.md:35`, sem execução externa. | PASS |
| 9 | `apps/mobile/test/backendAcesso.test.ts:23`–`:29` exige categoria, mensagem local exata, sanitização do corpo adversarial, token e callback preservados e retentativa com cabeçalhos corretos para chamadas públicas e privadas. | PASS |

## Sensor de discriminação

Scratch criado a partir de `git archive HEAD`, com junction apenas para dependências; sem stash ou mutação da árvore real. `rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1 test/limitesAuthRotas.test.ts` e o mesmo comando para `test/limitesAuth.test.ts` foram executados na cópia. As cinco mutações seguintes foram testadas em `355b89a`; a fonte não mudou em `1fb5255`:

| Mutação | Evidência de falha |
|---|---|
| Remover guarda de falha_email em `apps/api/src/rotas/conta.ts:109` | `apps/api/test/limitesAuthRotas.test.ts:85`: esperado 401/codigo_invalido, recebido 200; também `:108`; 4 falhas, 8 passaram. |
| Aumentar emissao_email de 3 para 4 | `apps/api/test/limitesAuth.test.ts:27`: esperado false, recebido true. |
| Aumentar emissao_ip de 20 para 21 | `apps/api/test/limitesAuth.test.ts:27` e `:36`: esperado false, recebido true. |
| Aumentar login_ip de 50 para 51 | `apps/api/test/limitesAuth.test.ts:27` e `:36`: esperado false, recebido true. |
| Reduzir janela de 900000 para 899999 ms | `apps/api/test/limitesAuth.test.ts:27` e `:96`: esperado false, recebido true. |

Em scratch de `1fb5255`, removi `pendente.tentativas >= CODIGO_MAX_TENTATIVAS` em `apps/api/src/rotas/conta.ts:123`. O teste em `apps/api/test/limitesAuthRotas.test.ts:238` falhou: esperado 401/codigo_invalido, recebeu 200; 1 falhou e 14 passaram. Resultado acumulado: 6 mortos, 0 sobreviventes. Scratch removido após conferir caminho absoluto sob TEMP com prefixo e remover junction separadamente. Porcelain antes e depois do novo sensor foi idêntico: ` M README.md` e `?? .specs/features/limites-auth/validation.md`.

## Gates e qualidade

- No HEAD `355b89a`, `rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1`: 149/149 PGlite; PostgreSQL 17 local dedicado via `PDV_TEST_POSTGRES_URL`: 153/153. Os quatro testes adicionais dependem de PostgreSQL; não houve skips relatados.
- `rtk proxy npm run test --workspace=@pdv/mobile -- --maxWorkers=1`: 353/353. `rtk proxy npm run test --workspace=@pdv/shared -- --maxWorkers=1`: 136/136.
- `rtk proxy npm run typecheck`: PASS em todos os workspaces. `rtk git diff --check`: PASS.
- Em `1fb5255`, repeti `rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1 test/limitesAuth.test.ts test/limitesAuthRotas.test.ts`: 27/27 PGlite e 31/31 PostgreSQL local dedicado. O gestor relatou API completa 152/152 PGlite e 156/156 PostgreSQL e typecheck PASS no novo HEAD; mobile e shared não mudaram desde minha execução.
- Baseline documentado em `git b37c617:docs/relatorio-execucao-producao.md:31`: mobile 351, shared 136 e API PGlite 125. No novo HEAD são 353, 136 e 152, respectivamente: aumento de 29 testes no total comparável. PostgreSQL tem quatro testes adicionais, totalizando 156; sua contagem não é diretamente comparável ao baseline PGlite. O diff das suítes anteriores mostra ajustes de relógio, sem remoção de asserções.
- Mudanças seguem o escopo e padrões locais. A migração `apps/api/drizzle/0003_left_lockheed.sql:1` cria somente `limites_auth`; não altera tabelas financeiras existentes. Não foi feita prova com dados financeiros reais.
- API testada em Fastify no processo, PGlite alternativo e PostgreSQL local; mobile usa fetch, host e cofre simulados. Não comprovam SMTP real, Android, proxy real, produção ou serviços externos. UAT interativo não executado.

Nenhuma lição adicional foi registrada: a única escrita autorizada para esta verificação é este relatório.
