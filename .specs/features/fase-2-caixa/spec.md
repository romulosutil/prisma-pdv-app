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
| LINK-01 | 1,2,4 | Em implementação |
| AUDIT-01 | 3,4 | Em implementação |
| CHECK-02 | 5 | Pendente |

## Execution Plan
1. Gestor fixa contrato shared e testes de compatibilidade; verifica e faz commit local. Dois executores Terra Médio implementam API/banco e domínio/mobile em arquivos disjuntos, sem UI/docs/commits/subdelegação. Um runner por vez.
2. Gestor revisa diretamente persistência/sync/auth, integra telas e gates; commit coerente com evidências. Revisor novo confronta ACs e injeta ao menos5 regressões comportamentais em scratch isolado; gestor corrige achados se houver.
3. Gestor entrega checkpoint web com roteiro e commit; interrompe antes da fase3. Goal controlador permanece pausado por limitação da ferramenta, fase autorizada diretamente pelo usuário.
