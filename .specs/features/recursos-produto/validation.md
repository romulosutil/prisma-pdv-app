## Validation: recursos-produto - PASS

**Verdict: PASS** para os seis critérios locais, com limites externos abaixo. Verificação independente do range `dfd252b..f5195ad`, fonte `f5195ad`. O diff funcional acrescenta a guarda em `apps/api/src/servicos/sync.ts:92` após loja, LWW e limite.

## Critérios e evidência

As referências abaixo são de `apps/api/test/syncRecursosProduto.test.ts`, salvo indicação contrária. As funções auxiliares também são asserções executadas, não apenas chamadas. Evidências principais: `apps/api/test/syncRecursosProduto.test.ts:45`, `apps/api/test/syncRecursosProduto.test.ts:68`, `apps/api/test/syncRecursosProduto.test.ts:207`, `apps/api/test/syncRecursosProduto.test.ts:164`, `apps/api/test/syncRecursosProduto.test.ts:124`, `apps/api/test/syncRecursosProduto.test.ts:215`.

1. **PASS**: linhas 35-50 parametrizam estoque e mínimo em zero, positivo e negativo, nos três planos, com data antiga e `planoId: 'pro'` extra. Linha 45: `expect(res.corpo.rejeitadas).toEqual([{ id: pedido.id, motivo: 'recurso_plano' }])`; linha 46: `expect(res.corpo.aceitas).toEqual([])`; linha 47: `expect(await snapshot()).toEqual(antes)`. Nos planos com recurso, linha 49 espera `[pedido.id]` e linha 50 chama `conferirProduto`, cuja linha 27 exige a linha completa igual a `{ ...p, ..., versao }`, linhas 29-31 exigem mudança e ACK exatos. Ambos null são aceitos nas linhas 207 e 253: `expect(res.corpo.aceitas).toEqual([antigo.id, vizinho.id, manual.id])` e `toMatchObject({ estoque: null, estoqueMinimo: null })`.
2. **PASS**: linha 63 espera `[edicao.id]`, linha 64 confirma produto completo e versão 2. Linhas 65-69 testam alterações isoladas e limpeza para null: `toEqual([{ id: pedido.id, motivo: 'recurso_plano' }])` e snapshot `toEqual(antes)`. Linha 72 exige pull completo `{ entidade: 'produto', operacao: 'upsert', dados: { ...editado, versao: 2 } }`. Linhas 75-82 rejeitam e depois aceitam o mesmo ID, com retry e snapshot igual; linha 83 espera `{ estoque: 8, estoqueMinimo: 2 }`. Linhas 86-92 esperam exclusão e restauração aceitas, histórico `{ estoque: 8, estoqueMinimo: 2, excluidoEm: INICIO }` e restauração com `excluidoEm: null`.
3. **PASS**: linhas 207-212 exigem ACK de mutação antiga, vizinho e venda, nenhuma rejeição, linha de produto e mudanças iguais às anteriores e ACK antigo exato. Linhas 221-222 esperam `[vizinho.id]` e `snapshot() === depois` em retry. Linhas 237-240 e 249-252 exigem `loja_invalida`, aceitação do vizinho e ausência de produto/ACK inválido. Linha 268 exige `limite_plano` mesmo com estoque e linha 269 snapshot igual.
4. **PASS**: linhas 264-269 exigem edição aceita, novo produto rejeitado por `limite_plano` e snapshot igual. Linhas 272-282 exigem exclusões aceitas, uma restauração aceita com estoque 1, outra rejeitada por `limite_plano`, snapshot igual e tombstone preservado. PostgreSQL: linha 159 `expect(bloqueados).toBe(true)` observa dois PIDs em espera; linhas 164-172 exigem uma aceitação, uma rejeição `limite_plano`, 500 produtos e ausência de produto, ACK e mudança do perdedor. Linhas 175-182 verificam vencedor e diferenças exatas de snapshot.
5. **PASS**: linhas 119-126 exigem espera de PID `toBe(true)` antes de alterar assinatura, resposta com `motivo: limite ? 'limite_plano' : 'recurso_plano'`, snapshot igual e assinatura com `planoId: 'essencial'`. Linhas 231-241 exigem plano atual `negocio`, agendado `essencial`, aceitação do produto e campos `{ estoque: 0, estoqueMinimo: 1 }`.
6. **PASS local**: linhas 199-207 criam venda antes de avançar uma hora, fazem downgrade e esperam aceitação `[antigo.id, vizinho.id, manual.id]`. Linhas 215-219 exigem venda, itens, pagamentos, ACK e mudança com valores exatos. Os alvos de caixa passaram nas duas variantes. Regressões amplas de mobile/shared e typechecks de todos os workspaces foram relatados pelo gestor como PASS, mas não foram repetidos por este verificador. O escopo global C permanece aberto.

## Gates reproduzidos

- `npm run test -w @pdv/api -- --maxWorkers=1 test/syncRecursosProduto.test.ts test/sync.test.ts test/syncOrigem.test.ts test/syncRecursosCaixa.test.ts`: PGlite, URL vazia, 4 arquivos e 59 testes PASS.
- Mesmo comando com PostgreSQL dedicado na porta 60139: 4 arquivos e 64 testes PASS, incluindo os testes condicionais de concorrência e espera.
- `npm run typecheck -w @pdv/api`: PASS.
- Uma suíte por vez; não se atribui a este verificador a execução dos gates amplos do gestor.

## Sensor P0 em scratch

Archive isolado de `f5195ad` em TEMP, alvo `syncRecursosProduto.test.ts`, PGlite e `maxWorkers=1`. Cada mutação foi restaurada a partir do original. Todas falharam por `AssertionError`, não por setup:

| Mutação em `sync.ts:92-93` | Resultado |
| --- | --- |
| Remover guarda | Morta: 7 falhas, incluindo zero e downgrade |
| Ignorar mínimo | Morta: 4 falhas, incluindo mínimo isolado |
| Ignorar estoque | Morta: 4 falhas, incluindo estoque isolado |
| Tratar zero como ausência | Morta: 2 falhas, zero em cada campo |
| Rejeitar histórico preservado | Morta: 2 falhas, edição no downgrade e fronteira |

Sensor: **5/5 mortos**. Um erro inicial de codificação na impressão do runner foi descartado e não contado. Junctions foram removidas separadamente, scratch removido sob TEMP, e `git status --porcelain` antes e depois coincidia: README modificado preexistente e pasta não rastreada `pagamentos-manuais-api`. Runners e clientes encerrados; banco dedicado preservado.

## Limites

Billing somente mock local. Compra real, Android e produção não foram verificados. Este lote não aceita C global nem substitui o corte manual de pagamentos e a auditoria das operações expostas. Não há gaps detectados nos critérios locais; os gates amplos são evidência reportada pelo gestor, não reprodução própria.
