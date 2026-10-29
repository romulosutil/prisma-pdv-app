# Arredondamento seguro compartilhado

## Problem Statement

P0-04-A2: multiplicarPreco soma500 ao produto inteiro antes de dividir por1000. Mesmo quando o produto é seguro, essa soma pode deixar a faixa exata e aumentar o total em um centavo. Reprodução Node:9007199254740499/1000 deveria arredondar para9007199254740, mas o cálculo atual retorna9007199254741. Alinhar o cliente ao validador exato da API, sem alterar arquitetura/faixa/contratos.

## Out of Scope

Novas regras de preços, limites comerciais, pagamentos, migrações, reescrita de histórico, autorização ou UI. Não adicionar BigInt ao código shared/mobile. BigInt nos testes pode servir como oráculo independente. Android/artefato e cobranças reais não serão executados.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Cálculo | floor(absProduto/1000) + (absProduto%1000 >=500 ?1:0) | Evitar adição fora da faixa e preservar meio para cima |
| Faixa | Manter exigência de inteiros seguros para entradas e produto | Compatibilidade com API e contrato existente |
| Sinais | Meio afastando de zero; zero sempre positivo | Comportamento atual documentado |
| Verificação | Testes literais/oráculo BigInt e SQLite/API reais locais | Comprovar valor persistido e payload, não só helper |

Open questions: none. Correção local reversível autorizada; gestor implementa lote pequeno diretamente. Revisão final usa Terra Médio novo; seleção aceita pela ferramenta sem confirmação efetiva independente conforme AD005.

## User Stories

Como operador, quero que o valor calculado e persistido pelo app seja o mesmo validado pelo servidor, inclusive nas fronteiras numéricas permitidas.

Acceptance Criteria:
1. WHEN multiplicarPreco recebe preço9007199254740498 ou9007199254740499 e quantidade1, ele SHALL devolver9007199254740; para9007199254740500,9007199254740501 ouMAX_SAFE_INTEGER SHALL devolver9007199254741. Todas as combinações de sinais SHALL arredondar meio afastando de zero; zero em qualquer fator SHALL devolver0 sem -0. O runtime compartilhado SHALL não usar BigInt e SHALL conservar resultados existentes por unidade/peso.
2. WHEN qualquer entrada é fracionária, NaN, infinita ou fora do inteiro seguro, ou o produto dos inteiros ultrapassa a faixa segura, multiplicarPreco SHALL continuar lançar RangeError. PreçoMAX_SAFE_INTEGER/quantidade1 SHALL ser aceito; MAX_SAFE_INTEGER*2 SHALL ser rejeitado em ambos os sinais. Testes SHALL comparar casos de fronteira com fórmula BigInt independente apenas no ambiente de testes.
3. WHEN checkout SQLite real conclui item de preço9007199254740499/q1 com parcela líquida9007199254740, ele SHALL persistir item/total/pagamento/outbox9007199254740 e recuperar a mesma venda após reabrir arquivo, sem duplicação. Fastify com PGlite e PostgreSQL reais SHALL aceitar venda calculada pelo shared nesse caso e devolver os mesmos valores no pull; payload com item/total/pagamento9007199254741 SHALL ser rejeitado com venda_inconsistente e snapshot financeiro/ACK inalterado. Sem alegar execução Android.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| ROUND-01 | 1,2 | P0-04-A2 cálculo | Planejado |
| ROUND-02 | 3 | P0-04-A2 persistência/contrato | Planejado |

## Execution Plan

1. Gestor: testes RED derivados dos3ACs, corrigir função e testar em série; arquivos somente packages/shared/src/dinheiro.ts, packages/shared/test/dinheiro.test.ts, apps/mobile/test/checkoutSqlite.test.ts e apps/api/test/syncValoresVenda.test.ts. Gate: shared/mobile/API completos PGlite ePG local dedicado, typecheck todos, diffstaged; commit atômico com status desta spec.
2. Verificador novo: inspeção por AC/file:line/asserção, repetir alvos nos dois bancos, sensor>=5 comportamental emscratch (resolver shared para cópia mutada, nunca origem real), validate_state e checkpoint do gestor. Não aceitar feature antes de PASS. Base ampla anterior359API/PGlite ou392PG em610afad; T3 adicionou1teste validado por quick25porbanco em933db20; mobile433/shared148. Contar execuções reais sem somar variantes.
