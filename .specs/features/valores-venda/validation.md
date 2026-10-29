# Validação de valores da venda

**Result**: PASS

## Revalidação final de T3

O achado anterior de AC4 foi resolvido em `933db20`: `apps/api/test/syncValoresVenda.test.ts:29`–`:47` cria venda da loja A e testa sessão A com payload da loja B, sessão B com payload da loja A, e sessão B forjando loja B com ID da venda A. Cada variante exige HTTP 200 (`:43`), `aceitas` vazio (`:44`), `loja_invalida` (`:45`) e snapshot integral igual (`:46`). Assim, os cinco critérios estão cobertos. As referências ao teste de integração no registro histórico abaixo dizem respeito a `610afad`; a inserção deslocou suas linhas em 21 no commit final.

Execução independente em série sobre `933db20`: quick com PGlite 25/25 e PostgreSQL dedicado 25/25, sem falhas ou skips reportados; typecheck API exit 0. As fontes de produção são idênticas às de `610afad`, de modo que os sete resultados do sensor anterior permanecem aplicáveis. Dois sensores adicionais em scratch `git archive 933db20` detectaram a remoção da guarda de loja da sessão (`AssertionError` em `apps/api/test/syncValoresVenda.test.ts:44`) e da guarda de loja da venda existente (`AssertionError` em `:45`). Ambos usaram PGlite com URL PostgreSQL vazia e `--maxWorkers=1`. Resultado acumulado: 9/9 detectados. Junction removida separadamente e scratch removido após conferir caminho em TEMP; porcelain antes e depois: apenas ` M README.md` preexistente.

Os gates amplos relatados pelo gestor abaixo foram executados em `610afad`; não foram reexecutados após o acréscimo do teste e não se atribuem contagens ampliadas ao gate completo. A correção T3 foi verificada pelo quick gate acima. A lesson L018 foi registrada pelo gestor como candidata, sem promoção. VALUES-01, VALUES-02 e VALUES-03 ficam verificados nesta revalidação; a atualização de outros arquivos cabe ao gestor.

## Histórico da primeira validação em 610afad

**Data:** 2026-10-29. **Verificador:** independente, não autor. **Diff:** `9beba70..610afad`. **Spec:** `.specs/features/valores-venda/spec.md`. T1 e T2 constam concluídas em `tasks.md`; o aceite final depende desta validação.

AC4 tinha uma lacuna de teste: não encontrei asserção de `loja_invalida` para venda existente pertencente a outra loja. A guarda existe em `apps/api/src/servicos/sync.ts:131` e `:135`, mas inspeção não substitui asserção. `apps/api/test/sync.test.ts:99` e `:101` testam produto, não venda. Resolvida pela revalidação acima.

## Critérios derivados da spec

| AC | Resultado exigido | Evidência de asserção | Resultado |
|---|---|---|---|
| 1 | Item obrigatório; inteiros seguros, produto seguro e fórmula exata; 499/500/501 → 0/1/1; total igual à soma; erro sem escrita | `apps/api/test/valoresVenda.test.ts:15` `expect(vendaConsistente(v)).toBe(true)` sobre os três casos; `:30`, `:37`, `:43` e `:44` exigem falso para vazio, valor adulterado e produto excessivo, verdadeiro no limite. `apps/api/test/syncValoresVenda.test.ts:172` e `:173` exigem `venda_inconsistente` e snapshot igual. | PASS |
| 2 | Pagamento líquido 2500, dinheiro 1000 com troco 500 + Pix 1500 aceito; 2499/2501 rejeitados; troco e limites seguros; gratuito aceito | `apps/api/test/valoresVenda.test.ts:28` `toBe(true)` e `:29` `toBe(false)` para 1499/1501; `:45`–`:49` comprovam limite de recebido e meios; `:21` aceita parcela zero. `apps/api/test/syncValoresVenda.test.ts:159`, `:172`, `:176` comprovam aceite, rejeição e gratuito sem parcelas. | PASS |
| 3 | IDs repetidos rejeitados antes de persistência; snapshot integral estável; vizinhas e retry aceitos sem duplicação | `apps/api/test/valoresVenda.test.ts:52`–`:56` comparam duplicatas e controles distintos. `apps/api/test/syncValoresVenda.test.ts:44`–`:45` exigem motivo e snapshot igual; `:50`–`:54` verificam lote e retry; `:63`–`:69`, `:76`–`:77` exigem dados, ACK, mudanças, caixas e movimentos. | PASS |
| 4 | Financeiro e origem idênticos para replay/cancelamento; alteração, ordem ou reabertura rejeitadas; timestamp e legado preservados; ACK aplicado no-op; loja divergente retorna `loja_invalida` | `apps/api/test/syncValoresVenda.test.ts:138`–`:139` exigem `venda_imutavel` e snapshot para variantes dos extremos e status; `:99`–`:104` cobrem timestamp e reabertura; `:188`–`:198` exigem pull, ACK no-op, replay/cancelamento e preservação de legado. **Nenhuma asserção encontrada para loja divergente em venda**. | FAIL parcial |
| 5 | DTO inválido retorna 400 sem escrita; negócio via Fastify e bancos reais; regressões preservadas | `apps/api/test/syncValoresVenda.test.ts:211` `expect(...status).toBe(400)` e `:212` `expect(await snapshot()).toEqual(antes)` para negativo, zero, fração e unsafe. A execução direcionada passou nos dois bancos; regressões amplas atribuídas ao gestor abaixo. | PASS |

## Sensor de discriminação

Sete mutações não equivalentes executadas sequencialmente em `git archive 610afad`, com `PDV_TEST_POSTGRES_URL=''`, Vitest com `--maxWorkers=1`, fontes restauradas entre casos. Todas falharam por `AssertionError`, não por importação.

| Mutação | Asserção que falhou | Resultado |
|---|---|---|
| `valoresVenda.ts:14`, meio para baixo (`+499n`) | `valoresVenda.test.ts:15` | detectada |
| `valoresVenda.ts:14`, permitir produto MAX+1 | `valoresVenda.test.ts:43` | detectada |
| `valoresVenda.ts:11`, remover duplicata de item | `valoresVenda.test.ts:52`; `syncValoresVenda.test.ts:172` | detectada |
| `valoresVenda.ts:22`, remover duplicata de pagamento | `valoresVenda.test.ts:55`; `syncValoresVenda.test.ts:172` | detectada |
| `valoresVenda.ts:24`, permitir troco em outros meios | `valoresVenda.test.ts:33` | detectada |
| `sync.ts:154`, omitir validação no push | `syncValoresVenda.test.ts:44` | detectada |
| `sync.ts:137`, omitir itens da comparação imutável | `syncValoresVenda.test.ts:95`, `:138` | detectada |

**Resultado:** 7/7 detectadas; nenhuma sobrevivente. Junction removida separadamente, caminho absoluto conferido dentro de TEMP e scratch removido. `git status --porcelain` antes e depois do sensor: somente ` M README.md` preexistente. Relatório criado após essa comparação.

## Gates e integridade

- Executado por este verificador, serial: quick `rtk npm run test -w @pdv/api -- test/valoresVenda.test.ts test/syncValoresVenda.test.ts test/sync.test.ts --maxWorkers=1`: PGlite 24/24 e PostgreSQL dedicado 24/24, zero falhas ou skips reportados; `rtk npm run typecheck -w @pdv/api` exit 0. Uma tentativa inicial de configuração de ambiente falhou no shell e executou novamente PGlite; não é contabilizada como PostgreSQL. A execução PostgreSQL subsequente configurou a URL explicitamente.
- Gate amplo informado pelo gestor para `610afad`, não reexecutado por este verificador: API/PGlite 359, API com PostgreSQL 392, mobile 433, shared 148, typecheck todos PASS. Bases 351 e 384, respectivamente: delta +8 em cada variante, que não são somadas. Gestor informou zero skips, exclusões ou enfraquecimentos.
- Diff inspecionado: fixture `apps/api/test/ajuda.ts:188` troca líquido 1000 por 700, mantendo troco 300; os dois arquivos de teste novos contêm os testes do lote. Nenhuma exclusão ou enfraquecimento de asserção legada observado no diff.

## Cobertura reversa, bordas e qualidade

Testes puros em `valoresVenda.test.ts:9` e `:23` mapeiam a AC1–3: arredondamento, zero, faixa, somas, meios e duplicatas. Os seis testes de integração em `syncValoresVenda.test.ts:29`, `:80`, `:107`, `:153`, `:179`, `:201` mapeiam respectivamente a AC3, AC4, AC4, AC1–3, AC4 e AC5. Não há teste novo sem requisito identificado. As bordas de meio, valor zero, produto máximo, recebido seguro, coleções, legado e retry estão cobertas nas referências acima. A guarda de loja para venda é a exceção indicada.

O código é localizado e segue padrões existentes, sem abstração ou alteração de schema fora do pedido; comparação financeira e validação da venda nova estão em `sync.ts:131`–`:154`, e a aritmética BigInt em `valoresVenda.ts:7`–`:29`. Princípios aplicados: `C:/Users/Ronal/.codex/skills/tlc-spec-driven/references/coding-principles.md`. Cobertura por camada não está completa devido à lacuna AC4. O arredondamento shared em limite alto está explicitamente adiado na spec e não foi alterado nem incluído na conclusão de validação mobile de fronteira.

## Plano de correção e rastreabilidade

1. **Major, AC4:** adicionar teste de integração com venda existente de outra loja, submetendo ID existente com loja da sessão e exigindo `loja_invalida` e snapshot inalterado; testar também payload com loja divergente da sessão. Executar nos dois bancos e repetir verificação independente.

VALUES-01: evidenciado; VALUES-02: evidenciado; VALUES-03: **não verificado integralmente**, devido à guarda de loja sem asserção. Status da spec não alterado por limite de escrita do verificador. Há sinal de lesson para AC sem asserção; gestor deve registrar via `lessons.py`, sem promover candidatos.
