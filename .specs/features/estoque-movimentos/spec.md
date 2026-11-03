# Estoque por movimentos

## Problem Statement

O saldo cadastrado não acompanha vendas nem cancelamentos. Sobrescrever saldos entre aparelhos perde baixas offline. O saldo será calculado pelo saldo inicial, ajustes imutáveis e itens de novas vendas, usando o histórico financeiro já persistido e sincronizado como registro dos movimentos.

## Goals

- Baixar uma vez ao concluir e repor uma vez ao cancelar.
- Convergir entre aparelhos sem recontar vendas anteriores à atualização.
- Permitir saldo negativo com aviso, conforme escolha explícita do usuário em 02/11/2026.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Compras, fornecedores e custo médio | Expansão de gestão |
| Deploy, APK e banco de produção | Pedido autoriza implementação local |
| Reprocessar vendas antigas | O saldo existente é o ponto de partida |
| Reserva de estoque no carrinho | A baixa ocorre na conclusão |

## Assumptions & Open Questions

| Decisão | Default escolhido | Motivo | Confirmação |
| --- | --- | --- | --- |
| Saldo zero/negativo | Permitir e avisar | Preservar venda offline e recebimentos | Usuário |
| Histórico anterior | Item sem marcador não movimenta estoque | Preservar saldo já informado | Premissa explícita |
| Correção manual | Diferença entre saldo desejado e saldo observado vira ajuste com UUID, data, motivo e quantidade assinada | Concorrência soma ajustes em vez de perder vendas | Decisão técnica |
| Desativar controle | Campo vazio desativa, preserva base e movimentos; reativar ajusta ao saldo informado | Compatibilidade com formulário existente | Decisão técnica |
| Unidade de produto controlado | Permanece fixa; orientar novo cadastro para outra unidade | Evitar misturar kg e un no histórico | Decisão técnica |
| App antigo | Nova venda sem marcador é classificada pelo servidor; vendas já existentes mantêm marcador anterior | Compatibilidade de atualização sem baixa retroativa | Decisão técnica |

**Open questions:** nenhuma; premissas registradas, implementação autorizada pelo pedido.

## User Stories

### P1: Saldo confiável no balcão

Como lojista, quero que o estoque acompanhe recebimentos, cancelamentos e correções sem perder movimentos offline.

**Acceptance Criteria**

1. WHEN uma venda nova de 2 unidades de produto com saldo inicial 10 é concluída THEN o sistema SHALL apresentar saldo 8; cancelar essa venda SHALL resultar em 10.
2. WHEN concluir, cancelar, reabrir ou sincronizar a mesma venda repetidamente THEN o sistema SHALL conservar uma única baixa e uma única reposição por item; pagamento parcial e carrinho abandonado SHALL conservar o saldo anterior.
3. WHEN existem vendas antigas sem marcador, itens avulsos ou produtos sem controle THEN o sistema SHALL preservar o saldo, sem inferir baixa histórica.
4. WHEN dois aparelhos vendem offline 2 e 3 unidades do mesmo saldo inicial 10 e sincronizam THEN ambos SHALL apresentar 5; cancelar a primeira venda SHALL resultar em 7.
5. WHEN correções offline de +4 e -1 são enviadas em ordens distintas ou repetidas THEN o sistema SHALL conservar ambos os ajustes uma vez; saldo 10 com venda de 2 SHALL resultar em 11.
6. IF houver falha antes do commit da conclusão THEN o sistema SHALL manter rascunho/parcela recuperáveis e saldo anterior; após commit perdido SHALL recuperar a mesma venda e saldo.
7. WHEN a venda ultrapassa o saldo THEN o sistema SHALL permitir a conclusão e apresentar aviso no checkout; saldo 1 com venda de 2 SHALL resultar em -1.
8. WHEN o controle é desativado e há novas vendas THEN o sistema SHALL ignorar esses itens no estoque; reativar com saldo 6 SHALL apresentar 6, conservando histórico anterior.
9. IF um push altera um ajuste já confirmado, a base de estoque adotada, a unidade controlada ou um marcador de item confirmado THEN a API SHALL rejeitar a mutação sem alterar o registro confirmado; loja divergente SHALL manter isolamento existente.
10. WHEN o saldo é fracionário, negativo ou recebe ajustes THEN o sistema SHALL manter milésimos exatos, mostrar quantidades negativas corretamente e disponibilizar histórico no produto com saldo inicial, ajustes, baixas e reposições.
11. WHEN o plano não oferece estoque THEN a API SHALL recusar novos ajustes/ativação/desativação; histórico já confirmado e efeitos das vendas legítimas SHALL permanecer preservados.

**Independent Test:** saldo10 → venda2 → saldo8 → cancelar → saldo10; dois SQLite com HTTP/API e replay; correção concorrente; formulário e aviso.

## Edge Cases

- IF IDs de ajustes se repetem com conteúdo divergente THEN o sistema SHALL recusar a entrada; ajuste zero e quantidade insegura SHALL ser inválidos.
- IF o saldo composto ultrapassa os inteiros seguros em milésimos THEN o sistema SHALL recusar o ajuste, conclusão ou cancelamento antes de persistir, mantendo a venda/parcela recuperável.
- WHEN o produto está excluído ou o controle mudou depois da venda THEN o sistema SHALL conservar o marcador imutável do item já registrado.
- WHEN um formulário antigo salva apenas metadados após outra venda THEN o sistema SHALL preservar essa baixa; estoque intocado não gera ajuste.
- WHEN o formulário abre com saldo10, o usuário corrige para14 e ocorre venda2 antes de salvar THEN o sistema SHALL registrar ajuste+4 e apresentar12, preservando a baixa concorrente.
- WHEN o app perde a rede THEN o sistema SHALL calcular o saldo pelos registros locais persistidos, sem chamada externa para vender.

## Requirement Traceability

| Requirement ID | Critério | Tarefa | Status |
| --- | --- | --- | --- |
| EST-01 | AC1–3,8,10 e limites | T1 | Verified |
| EST-02 | AC4–5,9,11 | T2 | Verified |
| EST-03 | AC1–3,6,8 e formulário antigo | T3 | Verified |
| EST-04 | AC7,10 | T4 | Verified |
| EST-05 | AC4–6 e retomada | T5 | Verified |

## Success Criteria

- Testes de domínio, SQLite, navegador, HTTP e API aprovados; regressão e tipos aprovados.
- Revisor independente verifica critérios e falhas comportamentais em memória.
- Homologação Android e publicação permanecem explicitamente externas a esta entrega.
