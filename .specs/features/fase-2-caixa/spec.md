# Fase 2 — Venda e caixa consistentes

## Problem Statement
O caixa ainda seleciona vendas pela data, o contrato perde o vínculo já capturado pelo checkout, e cancelar não deixa evento comercial. Fechar uma venda deve preservar ID, parcelas, caixa e fechamento sem misturar turnos.

## Out of Scope
Sem envio/ACK/pull automáticos no app (fase3), integrações de pagamento, mudança de arquitetura, múltiplos operadores ofertados ou produção. Teste web não homologa SQLite Android. Não gerar caixa ou associação retroativa por horário.

## Assumptions & Open Questions
| Assumption | Chosen default | Rationale |
|---|---|---|
| Aprovação anterior | Usuário aprovou checkpoint1 em30/10 e autorizou fase2 | Não repetir UAT da fase1 |
| Vínculo | Venda.caixaId UUID opcional/null por compatibilidade; novas vendas usam o caixa fixado ao abrir checkout, inclusive null se não havia caixa | Preservar origem e contrato legado |
| Cancelamento | Venda.cancelamento opcional/null legado; novo evento {id,em,operadorId,motivo,estorno:'nao_realizado'}; motivo padrão 'Cancelamento solicitado pelo operador' | Auditável e sem prometer estorno; campos imutáveis no retry |
| Fechamento | Snapshot persistido imutável; cancelamento posterior aparece como ajuste vinculado separado | Não reescrever conferência histórica |
| Sincronização | API aplica caixas antes das vendas vinculadas do mesmo lote; venda offline em caixa fechado só é aceita dentro do intervalo abertura/fechamento e com origem do caixa compatível | Resolver dependência sem perder operação válida offline |
| Legado SQLite | caixa_id já persistido é vínculo explícito recuperável; payload sem coluna/vínculo permanece null/ausente | Não inventar associação |
Open questions: none para decisões locais reversíveis. Homologação Android e acessos externos permanecem bloqueios separados.

## User Stories
Como operador, quero retomar parcelas após reinício e conferir um caixa sem vendas de outro turno. Ao cancelar depois, quero ver o registro comercial sem alterar o fechamento anterior.

Acceptance Criteria:
1. WHEN um checkout novo é concluído ou retomado, o sistema SHALL conservar caixaId fixado na abertura, ID/instante da venda, parcelas líquidas e outbox na mesma transação SQLite; payload, coluna e mutação SHALL concordar. Legado sem vínculo SHALL permanecer sem associação presumida e coluna explícita antiga SHALL ser recuperada de modo idempotente sem descartar dados.
2. WHEN um caixa é calculado/fechado, o sistema SHALL somar somente vendas concluídas com caixaId igual, incluindo apenas dinheiro líquido na gaveta. Duas caixas ou origens e venda sem vínculo SHALL não se misturar. Escrita com falha SHALL não publicar sucesso; troca de caixa durante checkout pago SHALL não transferir as parcelas.
3. WHEN um cancelamento comercial ocorre, o sistema SHALL persistir uma única identificação, instante, operador, motivo e estado de estorno nao_realizado, preservar campos originais e fechamento já salvo, mostrar vínculo/ajuste separado no histórico e repetir sem novo evento. API SHALL não aceitar adulteração do evento ou reabertura de caixa fechado; legado confirmado SHALL continuar legível.
4. WHEN a API recebe vínculo de venda, o sistema SHALL validar caixa existente da mesma loja/origem e intervalo de abertura/fechamento, conservar vínculo imutável em replay/cancelamento/pull, resolver lote com caixa depois da venda e rejeitar vínculo inválido antes de escrita financeira parcial. Migração PostgreSQL local SHALL ser aplicada/testada; nenhuma alteração externa.
5. WHEN a fase termina, o gestor SHALL executar gates locais pertinentes e smoke no app (split/reinício/caixa/fechamento/cancelamento), obter revisão nova com sensor comportamental, registrar commits e limitações, entregar checkpoint2 e parar para avaliação humana antes da fase3.

## Requirement Traceability
| ID | AC | Status |
|---|---|---|
| LINK-01 | 1,2,4 | Implementado; revisão independente PASS em6681882 |
| AUDIT-01 | 3,4 | Implementado; falha temporal corrigida, revisão PASS e sensor cumulativo8/8 |
| CHECK-02 | 5 | Checkpoint2 entregue com roteiro e smoke web; aguardando avaliação humana |

## Execution Plan
1. Gestor fixa contrato shared e testes de compatibilidade; verifica e faz commit local. Dois executores Terra Médio implementam API/banco e domínio/mobile em arquivos disjuntos, sem UI/docs/commits/subdelegação. Um runner por vez.
2. Gestor revisa diretamente persistência/sync/auth, integra telas e gates; commit coerente com evidências. Revisor novo confronta ACs e injeta ao menos5 regressões comportamentais em scratch isolado; gestor corrige achados se houver.
3. Gestor entrega checkpoint web com roteiro e commit; interrompe antes da fase3. Goal controlador permanece pausado por limitação da ferramenta, fase autorizada diretamente pelo usuário.

## Evidências da integração

Gates do gestor/executores: mobile461/42arquivos, API443/32arquivos em PGlite, shared159/12arquivos, typecheck todos PASS. PostgreSQL17 dedicado: migração aplicada e alvo final syncCaixaVenda6/6 PASS. A primeira regressão API revelou10 expectativas/fixture incompatíveis com o novo contrato; corrigidas sem reduzir assertivas, regressão final toda verde. Snapshot financeiro continua igualdade completa, incluindo colunas novas nulas; fixture de recurso-caixa conserva abertura imutável. Sem exclusão/skip de testes.

| AC / esperado | Assertiva concreta | Resultado |
|---|---|---|
| 1: vínculo fixo, coluna/payload/outbox, migração certa/ausente | apps/mobile/test/checkoutSqlite.test.ts:158 `expect(venda.caixaId).toBe(caixa.id)`; :159 coluna igual; :160 mutação igual; :212–214 recuperação idempotente; :232–234 null legado | PASS |
| 1/2: rollback, corrida e snapshot durável | checkoutSqlite.test.ts:271–278 perdedor não gravado; :295 `expect(await armazenamento.obter('caixas')).toEqual([caixa])`; :299 retry correto; :319–323 rollback/retry de cancelamento com outbox única | PASS |
| 2/3: dois turnos, evento e fechamento imutável | apps/mobile/test/repositorios.test.ts:191 esperado2700 no segundo; :193 vínculo original; :194 evento; :195 retry igual; :196 fechamento igual ao salvo | PASS |
| 3/4: evento, vínculo e fechamento preservados no replay/pull | apps/api/test/syncCaixaVenda.test.ts:25 lote invertido aceito; :30 vínculo imutável; :40 negócio/mudanças iguais no replay; :44 pull com evento e fechamento exatos | PASS |
| 4: inválidos sem escrita, origens e intervalos | syncCaixaVenda.test.ts:54–55 origem incorreta/snapshot idêntico; :68–71 após fecho rejeitado e dois vínculos no pull; :85–86 ausente/outra loja e snapshot idêntico; migracaoCaixaVenda.test.ts:11 valores nulos no legado | PASS |
| 5: comportamento visível e checkpoint | Gestor CUA em localhost8086: #233, split10+15 com recarga parcial, gaveta20 (troco10+dinheiro10), fechamento20/20 e cancelamento posterior25 separado; dois fechamentos100/20 preservados após reload | Smoke e revisão PASS; roteiro em docs/fases-e-checkpoints.md, UAT humano pendente |

Necessidade: todos os novos testes shared atendem AC1/3 (compatibilidade/estado comercial); testes novos mobile atendem AC1/2/3; helper de apresentação fase2Interface.test.ts atende AC3; testes API e migração atendem AC3/4. Convenção test/**/*.test.ts e runner único/maxWorkers1 do projeto. Assertivas de payload/snapshots e valores complementam rejeições/spies; não provar banco por contagem de chamadas. API/migração PostgreSQL são locais, mocks de assinatura só fixtures de acesso. Nenhuma evidência Android, provider ou produção inferida.

Decisões de integração: normalização SQLite em transação recupera somente caixa_id conhecido, aborta null explícito conflitante e mantém legado desconhecido sem associação; fechamento revalida vendas duráveis para rejeitar snapshot antigo; filas de abertura/movimentos usam estado corrente. API compara evento por campos (ordem de chaves jsonb não importa), valida origem/intervalos e mantém resultado de ACK na ordem solicitada. App não envia sync automaticamente nesta fase; isso continua fase3.

Correção da revisão: helper de histórico deve comparar instantes numéricos, não strings ISO. Teste novo reproduziu erro com fechamento sem casas fracionárias e evento1ms posterior (RED1/2); cobertura inclui igual e anterior e as mesmas entradas com fechamento normalizado. Corrigir somente helper e repetir alvo/tipos e revisão independente; gates de banco e sensor7/7 anteriores conservam a superfície inalterada.

Correção concluída em6681882: alvo final2/2 e typecheck mobile PASS; revisor repetiu em scratch e detectou a regressão textual, totalizando8/8. validate_state sem erros. Checkpoint2 documentado e app local atualizado; trabalho interrompido antes da fase3 para avaliação humana. Lições L019 candidatas registradas via script, sem promover a orientação confirmada.
