# Validation: estoque-movimentos — PASS

**Result**: PASS

Implementação local aprovada no intervalo `73fb42f..c86e660`. Os 11 critérios têm resultados observáveis compatíveis com a spec. Regressão independente: 1265 testes aprovados, nenhum erro ou skip. Sete falhas comportamentais foram detectadas pelos testes sem alterar fontes reais.

- **Data**: 2026-11-03.
- **Spec**: `.specs/features/estoque-movimentos/spec.md`.
- **Verifier**: subagente independente `/root/verificar_estoque`, diferente do autor.
- **Escopo**: contrato/projeção, API/migrações aditivas, repositórios, checkout SQLite, hooks, formulário, aviso e histórico. README.md e apps/mobile/test/cupomTela.test.ts já estavam modificados e foram preservados.
- **Limite**: este parecer cobre implementação e provas locais. Homologação Android físico, distribuição, deploy e migração de produção continuam fora desta entrega.

## Tarefas e rastreabilidade

| Tarefa | Situação verificada | Requisito |
| --- | --- | --- |
| T1 | Concluída, contrato e saldo em milésimos | EST-01 |
| T2 | Concluída, união imutável e migração nullable | EST-02 |
| T3 | Concluída, commit/retomada e edição por diferença | EST-03 |
| T4 | Concluída, aviso e histórico no produto | EST-04 |
| T5 | Concluída, duas instalações e regressão | EST-05 |

Os requisitos já estão `Verified` na spec; nenhuma edição adicional de rastreabilidade foi necessária.

## Critérios ancorados na spec

As quantidades abaixo usam milésimos da unidade. A comparação foi feita entre o resultado especificado e a assertiva concreta, sem aceitar apenas presença de mocks ou chamadas.

| AC | Resultado exigido | Evidência e assertiva | Resultado |
| --- | --- | --- | --- |
| 1 | 10−2=8; cancelar resulta em10 | `packages/shared/test/estoque.test.ts:12` `expect(saldoEstoque(...)).toBe(8000)`; `packages/shared/test/estoque.test.ts:14` `.toBe(10000)`; `apps/api/test/syncEstoque.test.ts:36`/`:41` repetem8/10 após push/pull | PASS |
| 2 | Baixa/reposição únicas em replay, reabertura e sync; parcial/rascunho não baixa | `packages/shared/test/estoque.test.ts:26` venda duplicada ainda resulta5000; `apps/mobile/test/estoquePersistencia.test.ts:38` `expect(await d.carrinho.concluir()).toEqual(v)`; `apps/mobile/test/estoquePersistencia.test.ts:48` `.toHaveLength(1)`; `apps/mobile/test/estoquePersistencia.test.ts:60` parcial conserva10000; `apps/mobile/test/estoqueSync.test.ts:71` duas vendas persistidas, apesar de resposta perdida | PASS |
| 3 | Histórico sem marcador, avulso e sem controle não inferem baixa | `packages/shared/test/estoque.test.ts:20` legado+avulso+outra loja conservam10000; `packages/shared/test/estoque.test.ts:21` sem controle resulta null; `apps/api/test/syncEstoque.test.ts:123`/`:127` marcador legado undefined e `:124`/`:128` saldo10000 antes/depois de cancelar | PASS |
| 4 | Vendas offline2 e3 convergem para5; cancelar primeira resulta7 | `apps/mobile/test/estoqueSync.test.ts:70` saldos `[5000,5000]`; `apps/mobile/test/estoqueSync.test.ts:76` `[7000,7000]`; `apps/mobile/test/estoqueSync.test.ts:78` instalação restaurada também7000 | PASS |
| 5 | Ajustes+4/−1 entram uma vez em qualquer ordem; com venda2 resulta11 | `packages/shared/test/estoque.test.ts:32` união igual nas duas ordens e `:33` dois ajustes; `apps/api/test/syncEstoque.test.ts:57` dois eventos sobrevivem snapshot velho e `:58` saldo11000; `apps/mobile/test/estoqueSync.test.ts:94`/`:99` `[11000,11000]` com replay e `:96` eventos `[-1000,4000]` | PASS |
| 6 | Falha pré-commit conserva parcela/rascunho/saldo; resposta perdida recupera mesma venda | `apps/mobile/test/estoquePersistencia.test.ts:120` falha injetada rejeita; `:121` saldo10000, `:122` uma parcela, `:123` zero vendas no SQLite; `:130` reabertura devolve a mesma venda, `:131` saldo8000 e `:132` uma venda; `apps/mobile/test/estoqueSync.test.ts:67` offline após resposta perdida e `:68` saldo8000 | PASS |
| 7 | Permite vender2 com saldo1, avisa e resulta−1 | `apps/mobile/test/estoqueInterface.test.ts:47` texto `Arroz: saldo 1 un; nesta venda 2 un.`; `:48` contém `Você pode continuar`; `:49` nenhum botão adicional; `apps/mobile/test/estoquePersistencia.test.ts:80` conclusão resulta `{nome:'Arroz novo',estoque:-1000}` nos dois adapters | PASS |
| 8 | Desativar ignora vendas novas; reativar em6 conserva histórico | `apps/mobile/test/estoquePersistencia.test.ts:65` novo item `controlaEstoque=false`; `:66` saldo null, `:68` saldo6000, `:69` ajuste−2000; `packages/shared/test/estoque.test.ts:46` saldo contábil anterior8000 e `:47` reativação6000 | PASS |
| 9 | API recusa adulterar ajuste/base/unidade/marcador e isola loja | `apps/api/test/syncEstoque.test.ts:75` rejeições exatas `movimento_estoque_invalido`, `estoque_desatualizado`, `unidade_estoque_invalida`; `:76` produto integralmente igual a `antes`; `:93` marcador adulterado rejeitado como `venda_imutavel`; `:103` produto de outra loja rejeitado como `loja_invalida` | PASS |
| 10 | Milésimos exatos, negativos legíveis e histórico inicial/ajuste/baixa/reposição | `packages/shared/test/estoque.test.ts:39` saldo650 após baixa350; `:40` −1000; `:15` histórico inicial10000, venda−2000, cancelamento2000; `apps/mobile/test/estoquePersistencia.test.ts:45` tipos `['inicial','ajuste','venda','cancelamento']`; `apps/mobile/test/estoqueInterface.test.ts:61` texto `-0,35 kg`, `+1 kg`, motivo e data; `:63` leitura−350 | PASS |
| 11 | Plano sem estoque recusa novas mudanças e conserva eventos/efeitos legítimos | `apps/api/test/syncEstoque.test.ts:112` ajuste novo e desativação recusados como `recurso_plano`; `:114` evento confirmado preservado; `apps/api/test/syncRecursosProduto.test.ts:35` inclui novos saldos0/3/−2 em planos sem recurso; `apps/api/test/syncRecursosProduto.test.ts:215`/`:216` conferem venda manual e itens persistidos após downgrade. `apps/api/src/servicos/sync.ts:118` compara ativação/desativação; projeção de vendas não depende do plano | PASS |

**Cobertura**: 11/11 ACs, nenhum resultado numérico ou estado exigido em conflito com a spec. Sem lacuna de precisão da spec identificada. O no-op de snapshot antigo preserva a precedência LWW existente em AD-037; novos ajustes continuam sujeitos à união e permissão.

## Arestas e integridade

| Aresta da spec | Evidência | Resultado |
| --- | --- | --- |
| UUID divergente, ajuste zero, quantidade insegura | `packages/shared/test/estoque.test.ts:35` erro de imutabilidade; `:52`/`:53`/`:54` schemas retornam `success=false` para zero, inseguro e duplicado; `apps/api/test/syncEstoque.test.ts:76` persistência não muda | PASS |
| Saldo composto acima do limite, antes de persistir | `apps/api/test/syncEstoque.test.ts:145`, `:151`, `:156` rejeitam ajuste/cancelamento/venda com `estoque_fora_do_limite`; `:149` aceita base+ajuste acima do teto quando a baixa torna o saldo composto seguro; `:157` itens inalterados e `:158` venda continua concluída. `apps/mobile/test/estoquePersistencia.test.ts:102`/`:103`/`:104` conclusão recusa sem venda persistida e conserva parcela nos dois adapters. Guardas de edição/cancelamento locais em `apps/mobile/src/dados/produtos.ts:151` e `apps/mobile/src/dados/vendas.ts:143` | PASS |
| Produto excluído/controle posterior não reclassifica item confirmado | `apps/api/test/syncEstoque.test.ts:93` rejeita alteração explícita e `:96` conserva true quando omitido no cancelamento; `apps/mobile/test/estoquePersistencia.test.ts:65`/`:68` conserva a contribuição anterior durante ciclo de controle. Inspeção complementar: `apps/api/src/servicos/sync.ts:181` valida marcador e `:192` usa itens salvos; `packages/shared/src/estoque.ts:34` usa marcador do item sem consultar exclusão/controle atual | PASS |
| Formulário intocado após venda não cria ajuste | `apps/mobile/test/estoqueInterface.test.ts:73`/`:74` payload não contém estoque/motivo; `apps/mobile/test/estoquePersistencia.test.ts:80` saldo−1000 e `:81` ajustes `[]` | PASS |
| Formulário10→14 com venda2 simultânea resulta12 | `apps/mobile/test/estoquePersistencia.test.ts:91` saldo12000 e `:92` ajuste4000 em SQLite e navegador; `apps/mobile/test/estoqueInterface.test.ts:81` transmite `estoqueObservado` separado do novo valor | PASS |
| Venda sem rede calcula pelos registros persistidos locais | `apps/mobile/test/estoqueSync.test.ts:58`/`:59` saldos8000/7000 antes de sincronizar; `apps/mobile/test/estoquePersistencia.test.ts:127` reabre arquivo e mostra8000; sem API nesses testes de persistência | PASS |

## Gates executados pelo Verifier

Execução serial, nunca duas suítes ao mesmo tempo. Para API e mobile integrados, somente o PostgreSQL17 dedicado fornecido pelo autor em `127.0.0.1:55439/pdv_test`. Nenhum outro banco, contêiner ou .env foi alterado.

| Comando | Resultado independente |
| --- | --- |
| `rtk proxy npm run test -w @pdv/shared -- --maxWorkers=1 test/estoque.test.ts` | 7/7 |
| `rtk proxy npm run test -w @pdv/mobile -- --maxWorkers=1 test/estoquePersistencia.test.ts test/estoqueInterface.test.ts` | 15/15 |
| `rtk proxy npm run test -w @pdv/shared -- --maxWorkers=1` | 174/174,15 arquivos |
| `rtk proxy npm run test -w @pdv/api -- --maxWorkers=1` | 565/565,38 arquivos, PostgreSQL |
| `rtk proxy npm run test -w @pdv/mobile -- --maxWorkers=1` | 526/526,57 arquivos, PostgreSQL nos integrados |
| `rtk proxy npm run typecheck` | API, mobile e shared aprovados |
| `rtk git diff --check` | exit0; somente aviso CRLF do cupomTela preexistente |

**Build gate**:1265/1265, zero falhas, zero skips. Os22 testes diretos adicionais são repetição de casos já incluídos na regressão e não aumentam esse total. Os33 casos novos se dividem em7 shared,9 API e17 mobile. Base comparável derivada do diff:1232; após feature1265, delta+33. Não se executou o commit anterior; a integridade dos testes anteriores foi conferida pelo diff. Nenhum teste foi removido ou desativado. Os snapshots de cinco arquivos anteriores só receberam as novas colunas nullable, mantendo comparações integrais. As alterações preexistentes do cupom ficam incluídas nos números executados e fora do diff desta feature.

Os logs temporários completos do Verifier foram lidos para os totais e removidos ao finalizar. Os logs do autor em `builds/estoque-{shared,api,mobile}-final.log` também existem como evidência atribuída ao autor, sem substituir estas execuções independentes.

## Sensor comportamental

Profundidade ampliada de integridade de dados:7 mutações em memória. Cada execução teve configuração temporária `.mts` própria fora do repositório e plugin Vitest `enforce:'pre'`, com `transform` condicionado ao caminho exato e substituição única validada. `SENSOR_APPLIED` confirmou cada injeção. Não houve worktree, junction, stash, substituição de fontes nem limpeza recursiva do repo.

| Mutação | Ponto alterado só em memória | Alvo | Mortes comportamentais |
| --- | --- | --- | --- |
| M1 | `packages/shared/src/estoque.ts:35`, sinal da baixa de negativo para positivo | shared estoque,7 casos | 5 falham; inclui10→8 e convergência |
| M2 | `packages/shared/src/estoque.ts:36`, remove reposição de cancelamento | shared estoque,7 casos | 2 falham; inclui cancelamento10 e7 |
| M3 | `apps/api/src/servicos/sync.ts:110`, descarta novos ajustes quando snapshot perde LWW | API estoque PGlite,9 casos | 1 falha: união de ajustes com metadados antigos |
| M4 | `apps/mobile/src/dados/sqlite/checkoutSqlite.ts:131`, força marcador false | persistência,11 casos | 6 falham; inclui baixa, fração/correção, limite e retomada SQLite |
| M5 | `apps/mobile/src/telas/produtos/FormularioProduto.tsx:80`, trata estoque intocado como alterado | interface,4 casos | 1 falha: payload de renomeação contém estoque indevidamente |
| M6 | `packages/shared/src/estoque.ts:46`, elimina guarda de inteiro seguro | shared estoque,7 casos | 1 falha: saldo fora do limite deixa de lançar erro |
| M7 | `apps/api/src/servicos/sync.ts:95`, aceita qualquer saldo composto | API estoque PGlite,9 casos | 1 falha: ajuste/venda/cancelamento acima do limite deixam de ser recusados |

**Sensor**:7 aplicadas,7 mortas,0 sobreviventes. Cada execução carregou todos os casos esperados e teve `assertionResults` com falhas nomeadas; erros de compilação/importação não foram usados como evidência de morte. As APIs dos sensores usam somente instâncias PGlite em memória.

**Isolamento**: baseline anterior aos sensores contém porcelain e SHA256 dos606 arquivos rastreados. Após as sete execuções, porcelain idêntico e606 hashes idênticos. Ao final, a única adição permitida é este relatório; README.md e cupomTela.test.ts conservam os hashes originais. Configs, relatórios JSON, script, baseline e logs temporários próprios foram removidos por caminhos exatos em `%TEMP%`; nenhum arquivo alheio foi removido.

## Qualidade e limites da evidência

PASS em escopo cirúrgico, padrões existentes, ausência de abstrações desnecessárias, ausência de alterações financeiras retrospectivas e preservação dos testes. Os eventos imutáveis reaproveitam venda/cancelamento confirmado e evitam segunda escrita de saldo. Migrações0008/0009 acrescentam campos nullable e índice, sem UPDATE de históricos. Cada teste novo mapeia aos ACs ou arestas acima. Guias usados: RTK.md, STATE.md AD-037/AD-049/AD-053, matriz de tasks.md, package.json e convenções Vitest/SQLite/fixtures existentes.

A inspeção visual web375×812 e812×375, venda1−2=−1 após reload e cancelamento→1 foi realizada pelo autor e está registrada em execution.md. O Verifier não repetiu essa inspeção nem realizou UAT Android. Isso permanece uma limitação declarada de homologação, fora dos critérios de entrega local da spec.

Nenhuma lacuna material, mutante sobrevivente, desvio de spec ou falha confirmada foi encontrado. Não há fix task nem sinal novo para lessons; um PASS limpo não gera lição.

**Completion gate**: `rtk proxy python -X utf8 C:/Users/Ronal/.codex/skills/tlc-spec-driven/scripts/validate_state.py estoque-movimentos`, exit0, zero erros.
