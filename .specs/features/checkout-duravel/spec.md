# Checkout durável

## Problem Statement

P0-01-D/E: os itens e as parcelas ainda são voláteis. Persistir a venda em andamento, reutilizar seu ID após reinício e concluir venda/outbox atomicamente antes da navegação. Depende da base SQLite aceita em 62d1d6d. O vínculo remoto de caixa depende de P0-04 e não será dado como concluído aqui.

## Out of Scope

Integração de recebimentos, sincronização remota e homologação Android. Browser usa adaptador explicitamente limitado; não é plataforma de produção deste escopo.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Concorrência | Uma loja/operador/aparelho, operações em fila | Escopo autorizado |
| Após receber parcela | Não alterar itens nem limpar venda incompleta | Evitar perder registro do recebimento |
| ID e caixa | Fixados ao iniciar rascunho; caixa nulo se não houver | Não inventar vínculo legado |
| Confirmação | Publicar estado e navegar somente depois do commit | Não apresentar venda parcial como sucesso |

Open questions: none para este lote; homologação externa é pendência explícita.

## User Stories

Como operador, preciso retomar uma venda de R$ 25,00 com R$ 10,00 recebidos e R$ 15,00 restantes após reiniciar.
Como responsável, preciso que repetir a conclusão não duplique a venda nem a mutação de saída.

Acceptance Criteria:
1. WHEN uma parcela de 1000 centavos é salva num checkout de 2500, a reabertura SHALL recuperar itens, parcela, ID e saldo 1500.
2. WHEN a conclusão é interrompida em qualquer fronteira de escrita, o banco SHALL conter o rascunho recuperável ou uma única venda concluída com seus itens, pagamentos e uma mutação de outbox, sem efeito parcial.
3. WHEN a conclusão é repetida após commit e antes da navegação, o serviço SHALL devolver a mesma venda sem nova outbox.
4. WHEN a persistência falha, o carrinho SHALL manter o estado anterior confirmado e a UI SHALL informar erro sem navegar para sucesso; tentativa seguinte SHALL ser possível.
5. WHILE houver parcela recebida, alterações de itens ou descarte do rascunho SHALL ser recusados; saldo positivo SHALL impedir conclusão.
6. WHEN o app é iniciado com rascunho ou venda já concluída, o checkout SHALL recuperar o estado antes de liberar a operação e impedir nova cobrança da venda concluída.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| CHECKOUT-01 | 1, 2, 3, 5 | P0-01-D/E (serviço local) | verified |
| CHECKOUT-02 | 4, 5, 6 | P0-01-C/D (integração local; Android pendente no plano) | verified |

## Execution Plan

1. Serviço SQLite: checkoutTipos, sqlite/checkoutSqlite e teste checkoutSqlite. Gate: teste específico e typecheck mobile. Aceite local: revisão independente revisao-servico.md, 17 testes; sensor sem INSERT outbox detectado. Commit atômico do serviço.
2. Fachada e UI: carrinhoDuravel/carrinho, Dados, browser explícito, preservação caixa no financeiro, telas de venda/cobrança. Gate: suíte mobile, typecheck todos e revisão independente validation.md; testes fachada real/SQLite e hook com adaptadores de UI simulados. Não substitui homologação Android.
