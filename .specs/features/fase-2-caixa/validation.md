# Validation: FAIL — fase 2 caixa

**Data:** 2026-10-30  
**Diff:** `c87c9f6..574e232`  
**Veredito:** FAIL — ajuste comercial posterior pode desaparecer do histórico; checkpoint humano ainda pendente.

## Critérios e evidências

| AC | Resultado e assertiva observada |
| --- | --- |
| 1 | PASS para os cenários testados: `apps/mobile/test/checkoutSqlite.test.ts:158` compara caixaId com o caixa; linhas 159–160 comparam coluna e mutação; 212–214 verificam recuperação idempotente e 232–234 o legado sem vínculo. Linhas 271–278 verificam perdedor da corrida sem gravação. |
| 2 | PASS para os cenários testados: `apps/mobile/test/repositorios.test.ts:191` exige gaveta 2700 no segundo caixa com venda sem vínculo; `apps/mobile/test/checkoutSqlite.test.ts:294` exige rejeição de snapshot defasado e linha 297 usa valor atualizado. |
| 3 | FAIL parcial: `apps/mobile/test/repositorios.test.ts:193` verifica vínculo, linha 194 operador/motivo/estorno, linhas 195–196 retry e fechamento imutável; `apps/api/test/syncCaixaVenda.test.ts:99-103` verifica evento legado e rejeição de adulteração. Porém `apps/mobile/src/telas/caixa/historicoDoCaixa.ts:7` compara datas como texto e pode ocultar ajuste posterior válido. `apps/mobile/test/fase2Interface.test.ts:6-10` usa apenas datas com três casas, não cobrindo a falha. |
| 4 | PASS para os cenários testados: `apps/api/test/syncCaixaVenda.test.ts:25` exige lote invertido aceito na ordem original; 30 vínculo imutável; 40 snapshot igual no replay; 44 pull exato; 54–55 e 68–69 rejeições sem escrita; 85–86 ausente/outra loja; 115–117 limite do intervalo. `apps/api/test/migracaoCaixaVenda.test.ts:11` verifica null legado. |
| 5 | Parcial: gestor relatou gates e smoke web completos; revisão presente; avaliação humana checkpoint 2 ainda pendente. Não há evidência Android ou produção. |

## Achado priorizado

**Major — AC3, ajuste omitido no histórico.** O contrato aceita ambos ISO `2026-10-30T13:00:00Z` e `2026-10-30T13:00:00.001Z` (`packages/shared/src/contrato.ts:10`, confirmado com `z.iso.datetime().safeParse`); fechamento no primeiro instante e cancelamento no segundo produzem `evento >= fechamento === false`, embora `Date.parse(evento) > Date.parse(fechamento)`. Assim o helper retorna lista vazia apesar do evento posterior. Corrigir comparação por instante e adicionar teste para precisões diferentes, incluindo igualdade e anterior; repetir revisão e UAT após correção.

## Sensor comportamental isolado

Arquivo de origem extraído por `git archive 574e232` em TEMP, dependências por junction, um runner por vez. Baseline: mobile `checkoutSqlite` + `repositorios` 35/35; API `syncCaixaVenda` 6/6. Sete mutantes independentes morreram com falhas de assertiva/comportamento:

| Mutação | Teste que falhou |
| --- | --- |
| `checkoutSqlite.ts`: venda recebe caixaId null | `checkoutSqlite.test.ts` 4 falhas |
| `caixa.ts`: filtro de caixa sempre true | `repositorios.test.ts` 1 falha |
| `financeiro.ts`: desabilita revalidação do esperado | `checkoutSqlite.test.ts` 1 falha |
| `sync.ts`: aceita evento alterado | `syncCaixaVenda.test.ts` 1 falha |
| `sync.ts`: ignora aparelho de origem do caixa | `syncCaixaVenda.test.ts` 1 falha |
| `sync.ts`: remove ordenação caixa antes de venda | `syncCaixaVenda.test.ts` 2 falhas |
| `sync.ts`: ignora limite de fechamento | `syncCaixaVenda.test.ts` 1 falha |

**Resultado:** 7/7 mortos. O sensor não exercitou o helper de apresentação; a falha acima foi reproduzida separadamente. A cópia usa dependência shared real, mas nenhuma mutação incidiu em shared.

Após remover a junction separadamente e excluir o TEMP validado, `git status --porcelain` permaneceu igual ao baseline (` M README.md`), acrescido apenas deste relatório não rastreado.

## Gates, integridade e limites

Gestor informou mobile 461/42, API 443/32 em PGlite, shared 159/12 e typechecks PASS; migração 0006 e `syncCaixaVenda` 6/6 em PostgreSQL 17 local dedicado. Essas execuções não foram repetidas integralmente nesta revisão; os testes direcionados acima foram executados pelo revisor. Não existe `tasks.md` de fase 2 com comando Build gate, nem contagem anterior disponível para comparação. Diff de testes existentes conserva igualdade completa nos snapshots com novos campos null; fixture de recurso-caixa remove alteração de abertura agora imutável, mantendo assertiva de rejeição e snapshot. Sem exclusões ou skips identificados no diff. Smoke web informado pelo gestor: split 10+15 após recarga, gaveta e fechamento 20/20, cancelamento 25 separado e fechamento anterior 100/100 preservado; é evidência do gestor, não UAT humano nem homologação Android.

Qualidade: alterações seguem escopo de vínculo/auditoria; a comparação temporal da apresentação impede aprovação. Persistência, origem, ordenação, replay e imutabilidade têm evidências dirigidas; cobertura não é exaustiva de todos os ramos. Nenhum arquivo de requisitos ou lições foi alterado por restrição explícita do escopo desta revisão.
