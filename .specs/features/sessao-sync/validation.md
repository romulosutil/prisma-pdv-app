# Validação sessao-sync: PASS

Data: 2026-10-29. Verificador independente, distinto do executor e do revisor. HEAD 66a63b6, diff 4d2f1bc..66a63b6; contratos anteriores 453239a e decisões AD-029/030. Este aceite cobre somente a revalidação transacional da sessão, não encerra P0-04-B nem políticas de origem e papéis.

## Tarefas e critérios

T1: concluída por inspeção e validação de contratos pelo gestor. T2: implementação e revisão independente concluídas, gates e sensor confirmados abaixo. Não houve alteração de hook ou logout; três fontes e um teste novo no escopo. Sem alteração de schema ou dependências.

| Critério | Resultado esperado e evidência independente | Resultado |
| --- | --- | --- |
| AC1 | Ordem conta, sessão, advisory, relógio, revalidação antes do ACK: apps/api/src/servicos/sync.ts:269; joins, identidades, revogações e prazo: apps/api/src/auth.ts:54. Lote vazio e ACK aplicado: apps/api/test/syncSessao.test.ts:62-64 exige rejeição 401/nao_autenticado e snapshot igual. ID inexistente e quatro identidades: :76-78; prazo exato e aparelho revogado: :80-88, mesma rejeição e snapshot. 403/aparelho_invalido: apps/api/test/sync.test.ts:114-115; DTO inválido 400: apps/api/test/syncValoresVenda.test.ts:261. | PASS |
| AC2 | Espera real em conta ou sessão observada por observador separado e PID: apps/api/test/syncSessao.test.ts:123-140; relógio atinge exatamente expiraEm, resultado 401/nao_autenticado e snapshot igual :141. Sessão e aparelho revogados separadamente e cinco vínculos atuais: :289-326; exige bloqueio antes da alteração, 401 e finanças iguais. Snapshot cobre vendas, itens, pagamentos, caixas, movimentos, mudanças, ACK e sessão :21-32. | PASS |
| AC3 | Duas instâncias e barreiras reais: apps/api/test/syncSessao.test.ts:150-181 observa ambas as esperas; :184-195 exige logout 204, push 401 ou 200 segundo ordem, ACK [m.id], venda exata, histórico conservado, revogação e push seguinte 401. Conteúdo completo de venda e filhos: :36-47. | PASS |
| AC4 | apps/api/test/syncSessao.test.ts:95-105 fixa default serializable no cliente exclusivo, trigger SQL exige current_setting('transaction_isolation') = 'read committed' e asserções exigem 200 e ACK [m.id]. Espera advisory observada :219-230, licença suspensa e snapshot igual :235-238 ou ACK e metadados no instante posterior :240-245, com valores exatos :39-47. Expiração após advisory exige 401 e snapshot igual :263-281. Idempotência/cursor: apps/api/test/sync.test.ts:56-57,88; rejeição parcial/retry e conteúdo financeiro: apps/api/test/syncValoresVenda.test.ts:94-118; legado :239. Suítes amplas preservam demais regressões. | PASS |

Os quatro critérios têm resultado definido e asserções correspondentes. Snapshot de sessão compara a linha completa; revogação intencional é a única mudança esperada em :326. Revalidação não renova credencial nem escreve dados: apps/api/src/auth.ts:54-63 contém apenas consulta e erro. As linhas citadas correspondem ao commit verificado.

## Sensor de discriminação P0

Cópias obtidas por git archive do HEAD em TEMP, com junctions de node_modules, uma mutação e um runner por vez, restaurando fontes a cada caso. PGlite teve URL explicitamente vazia; casos de concorrência/isolation executaram PostgreSQL dedicado. Cada linha abaixo indica falha comportamental observada, não apenas exit code.

| Mutação | Banco | Evidência de detecção | Resultado |
| --- | --- | --- | --- |
| Omitir revalidarSessaoSync, apps/api/src/servicos/sync.ts:276 | PGlite | apps/api/test/syncSessao.test.ts:63 esperava rejeição, mas promise resolveu lote vazio; :77 também falhou | Morto |
| gt para gte, com import necessário, apps/api/src/auth.ts:62 | PGlite | :82 esperava 401 no prazo exato, promise resolveu | Morto |
| Remover igualdade de conta capturada, apps/api/src/auth.ts:60 | PGlite | :77 esperava rejeição para identidade divergente, promise resolveu | Morto |
| Remover condição de aparelho revogado, apps/api/src/auth.ts:62 | PGlite | :87 esperava rejeição para aparelho revogado, promise resolveu | Morto |
| Ler relógio antes do advisory, apps/api/src/servicos/sync.ts:274-275 | PostgreSQL | :279 esperava 401, recebeu 200; :237 detectou licença incorreta e :39 metadados divergentes | Morto |
| Remover FOR UPDATE da sessão mantendo SELECT, apps/api/src/servicos/sync.ts:271 | PostgreSQL | :134 não observou query bloqueada; helper de telemetria :168 não observou esperas de logout/push. Falha específica de observação do lock, não timeout global | Morto |
| Remover isolationLevel, apps/api/src/servicos/sync.ts:320 | PostgreSQL | Trigger :99 rejeitou isolamento efetivo serializable, :103 esperava 200 e recebeu 500 | Morto |

Sete mutações comportamentais não equivalentes, sete mortas, nenhuma sobrevivente. Tentativas preliminares de prazo sem import, aparelho com correspondência ambígua e relógio com texto malformado foram descartadas e corrigidas; não contam como detecção. RED inicial do executor por assinatura antiga/erro de query não é RED comportamental. As três cópias scratch foram removidas após remover junctions separadamente; git status --porcelain antes e depois do sensor era exatamente M README.md. Nenhum teste alterou a árvore real. Runners encerrados, PostgreSQL liberado, container preservado.

## Gates e integridade

Executado pelo verificador, serial e maxWorkers=1: npm run test -w @pdv/api -- test/syncSessao.test.ts test/syncValoresVenda.test.ts test/sync.test.ts --maxWorkers=1: PGlite 26/26, PostgreSQL 41/41. npm run typecheck -w @pdv/api: exit 0. Não houve skips reportados nessas execuções. Os 15 casos adicionais só são registrados com URL PostgreSQL e não demonstram locks em PGlite.

Gestor informou gates completos no mesmo conteúdo 66a63b6: API PGlite 363/363, API PostgreSQL 411/411 em 25 arquivos, mobile 434/434, shared 150/150 e typecheck de todos, todos seriais PASS. Totais alternativos 947 PGlite ou 995 PostgreSQL, não somar variantes. Baseline API 361 PGlite ou 394 PostgreSQL, delta respectivamente +2 ou +17 (dois comuns e 15 exclusivos PG). Baseline mobile 434 e shared 150, sem queda. Revisor anterior repetiu 26/41 e typecheck API. Não há testes removidos ou enfraquecidos no diff. Não houve skips reportados nos gates; os 48 casos condicionais PG não registrados em PGlite não são skips.

## Qualidade, rastreabilidade e limites

A solução usa helper somente de leitura e sequência de locks explícita, com alterações cirúrgicas alinhadas ao estilo existente. Cada caso novo mapeia aos ACs acima: casos comuns a AC1, concorrência de conta/sessão e vínculos a AC2, disputas logout a AC3, advisory/licença/isolamento a AC4. As rotas têm sucesso, 401, 403 e 400 com asserções de resultado; snapshots verificam efeitos, não só status. Princípios de simplicidade, escopo e integridade em C:/Users/Ronal/.codex/skills/tlc-spec-driven/references/coding-principles.md atendidos. Não identificada abstração ou flexibilidade supérflua. Não há UAT interativo para esta mudança de infraestrutura. Referências primárias para Read Committed e estatísticas constam em design.md; observador autocommit separado atende ao cuidado sobre cache das estatísticas.

SYNCAUTH-01 e SYNCAUTH-02: verificados neste relatório; spec.md e STATE.md permanecem sob responsabilidade do gestor. Nenhuma tarefa de correção identificada. O modelo solicitado ao subagente não tem confirmação independente, conforme AD-005. Este resultado não atesta origem/papéis nem conclusão do lote B integral.

**Overall**: PASS. 4/4 critérios, sensor 7/7, gates direcionados 26/26 e 41/41, tipo API PASS.
