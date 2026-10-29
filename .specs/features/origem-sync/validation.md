# Validação origem-sync: PASS

Data: 2026-10-29. Fonte `4e71729`, diff `9a17e7e..4e71729`. Verificador independente, sem autoria ou revisão anterior do lote. A confirmação independente do modelo efetivo não está disponível (AD-005).

O aceite cobre origem e papel no push. P0-04-B global permanece aberto para permissões de billing e catálogo. T1 e T2 estão concluídas no escopo descrito em `tasks.md`; o fechamento global não é parte deste aceite. AD-031 e AD-032 estão em `.specs/STATE.md:42` e `:44`.

## Critérios e evidências

| AC | Resultado definido e asserções independentes | Resultado |
| --- | --- | --- |
| 1 | Papel diferente de dono rejeita cada mutação nova com HTTP 200 e `permissao_negada`, sem alteração; ACK anterior permanece aceito, pull disponível, sessão revogada nega antes do ACK. `apps/api/test/syncOrigem.test.ts:33` `expect(res.corpo.aceitas).toEqual([anterior.id])`, `:34` rejeição exata e `:35` snapshot igual; `:55` inclui papel desconhecido, `:60` aceita vazio, `:61` rejeita cada ID, `:62` snapshot, `:64` pull 200 e `:65` contém produto; `:68` mesmo lote aceito pelo dono; `:176` sessão antiga responde 401. | PASS |
| 2 | Venda e caixa novos exigem as duas identidades atuais; divergências retornam `origem_invalida`, loja divergente `loja_invalida`; origem correta é aceita. `apps/api/test/syncOrigem.test.ts:80` itera campos e `:81` IDs inexistentes, outra conta e mesma conta; `:89` aceita vazio, `:90` motivos exatos, `:91` snapshot igual e `:93` mesmos corpos corrigidos aceitos; `:134` verifica `loja_invalida`. | PASS |
| 3 | Venda confirmada mantém origem e filhos ao replay/cancelar; origem alterada é imutável, ID novo com origem revogada é recusado e credenciais não mudam. `apps/api/test/syncOrigem.test.ts:155` aceita replay e cancelamento; `:156` verifica origem e status, `:165` e `:166` filhos iguais, `:167` e `:168` aparelhos e sessões iguais, `:172` rejeita novo ID antigo, `:173` snapshot, `:175` aceita origem atual e `:176` retorna 401; `:134` exige `venda_imutavel`. | PASS |
| 4 | Caixa aberto conserva origem, rejeita troca de qualquer identidade e aceita alteração real histórica; ACK anterior é no-op e mutação nova em caixa fechado retorna `caixa_fechada`. `apps/api/test/syncOrigem.test.ts:107` exige origem inválida para ambos os campos e `:108` snapshot; `:155` aceita suprimento histórico de 200, `:157` compara caixa completo e versão 2, `:162` compara movimento completo; `:117` aceita ACK antigo, `:118` exige `caixa_fechada`, `:119` snapshot. Controle adicional de movimento de 50 em `:68` e `:69`. | PASS |
| 5 | Após bloqueio da conta, papel corrente é usado, com HTTP 200, somente ACK anterior e dados/credenciais intactos. `apps/api/test/syncOrigem.test.ts:186` cria segunda instância, `:192` obtém PID, `:197` observa bloqueio e `:200` exige `true`; `:201` altera papel, `:204` exige 200, `:205` somente ACK anterior, `:206` motivo exato, `:207` snapshot, `:208` sessão autenticada e `:209` papel operador. Teste executado em PostgreSQL real. | PASS |

O snapshot ordenado de `apps/api/test/syncOrigem.test.ts:17` inclui produtos, vendas, itens, pagamentos, caixas, movimentos, mudanças, ACKs, sessões e aparelhos. Os testes de origem usam novos IDs e filhos para evitar colisão de PK; os mesmos corpos válidos aceitos controlam licença e erros concorrentes. O teste de papel desconhecido usa identidade válida. As comparações de credenciais incluem hashes e revogações, não apenas IDs. O caminho de venda existente antecede a guarda de origem nova (`apps/api/src/servicos/sync.ts:134` e `:152`); caixa fechado antecede origem (`:211`); ACK antecede `aplicar` (`:309`). Não há evidência de novos eventos de estorno; D/E permanecem fora do escopo.

## Gates

- Repetição independente serial, `npm run test -w @pdv/api -- test/syncOrigem.test.ts test/syncSessao.test.ts test/syncValoresVenda.test.ts test/sync.test.ts --maxWorkers=1`: PGlite 32/32 e PostgreSQL dedicado 48/48, sem falhas. `npm run typecheck -w @pdv/api`: PASS. A primeira tentativa rotulada PostgreSQL usou variável incorreta e executou novamente PGlite; não foi contada como PostgreSQL. A repetição válida usou `PDV_TEST_POSTGRES_URL` explícita.
- Gates completos finais atribuídos ao gestor: API PGlite 369, API PostgreSQL 418 em 26 arquivos, mobile 434 em 39 arquivos, shared 150 em 10 arquivos, typecheck de todos PASS. Total 953 com PGlite ou 1002 com PostgreSQL, não somar variantes. Os 49 casos condicionais PostgreSQL não são registrados em PGlite. Bases registradas em `tasks.md`: 363/411 API, 434 mobile e 150 shared; nenhum teste anterior removido ou enfraquecido conforme inspeção do diff e registro do gestor. RED comportamental 3/3 foi reportado pelo executor e não reproduzido aqui.

## Sensor P0

Oito mutações não equivalentes, uma por execução serial, restaurando fontes na cópia `git archive 4e71729`. Todas falharam por asserção de comportamento, não por setup. A primeira tentativa foi inválida por decodificação de stdout; a seguinte por codificação do console, antes de registrar evidências completas. Nenhuma foi contada.

| Mutação | Evidência de falha | Resultado |
| --- | --- | --- |
| `auth.ts:64` retorna sempre dono, PostgreSQL real | `apps/api/test/syncOrigem.test.ts:33`, `:60` e concorrência `:205` | Morta |
| `sync.ts:254` nega somente operador e libera desconhecido | `apps/api/test/syncOrigem.test.ts:60` | Morta |
| `sync.ts:152` remove verificação de aparelho de venda | `apps/api/test/syncOrigem.test.ts:89` e `:172` | Morta |
| `sync.ts:152` remove verificação de operador de venda | `apps/api/test/syncOrigem.test.ts:89` | Morta |
| `sync.ts:213` remove guarda de origem de caixa | `apps/api/test/syncOrigem.test.ts:89`, `:107` e `:172` | Morta |
| `sync.ts:212` usa sempre sessão para caixa histórico | `apps/api/test/syncOrigem.test.ts:155` | Morta |
| `sync.ts:152` move guarda de venda antes do ramo existente | `apps/api/test/syncOrigem.test.ts:134` e `:155` | Morta |
| `sync.ts:310` nega ACK antigo a operador | `apps/api/test/syncOrigem.test.ts:33` | Morta |

Resultado: 8/8 mortas, nenhuma sobrevivente. Scratch dentro de TEMP verificado e removido após remoção separada das junctions. Porcelain antes e depois idêntico: ` M README.md`, alteração preexistente. Runners encerrados e PostgreSQL dedicado liberado para o gestor.

## Qualidade e limitações

Diff de código cirúrgico: somente `apps/api/src/auth.ts` e `apps/api/src/servicos/sync.ts`, mais o teste novo. A revalidação lê papel após locks, sem mudar DTO ou credencial; as guardas preservam padrões existentes. Sem abstração ou mudança adjacente desnecessária. Testes mapeiam os cinco ACs e exercitam estados e respostas, com controles positivos e negativos. Diretrizes aplicadas: `C:/Users/Ronal/.codex/skills/tlc-spec-driven/references/coding-principles.md`. UAT não se aplica ao backend. Não há gap de precisão ou sobrevivente a encaminhar para lessons.

**Verdict: PASS**. Cinco de cinco critérios atendidos, 8/8 mutações mortas e gates descritos aprovados. Escopo global de billing e catálogo permanece pendente.
