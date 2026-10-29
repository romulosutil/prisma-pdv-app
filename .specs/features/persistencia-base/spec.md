# Base local durável (P0-01)

## Problem Statement

O estado atual aparece na interface antes da confirmação de gravação e não dispõe de schema SQLite particionado. Este lote entrega a fundação de P0-01-A/B e a parte observável de P0-01-C. A recuperação completa do checkout será uma entrega seguinte; critérios globais do plano permanecem pendentes até verificação integral.

## Out of Scope

Neste lote: sincronização remota, autenticação nativa, checkout persistido, associação retroativa de caixas, publicação e produção. Não são excluídos do Goal, apenas têm dependências posteriores.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Plataforma principal | Android Expo, SQLite nativo | Arquitetura e plano existentes |
| Dados legados | Preservar origem, migrar somente com conta/loja válidas | Recuperação e isolamento |
| Teste SQL | node:sqlite com arquivo real e reabertura | SQLite real local sem fingir Android |
| Modelo de agentes | Terra Médio solicitado, retorno não confirma efetivo | Limitação de observabilidade da ferramenta |

Open questions: none para decisões reversíveis deste lote. Credenciais e homologação externa registradas no STATE.

## User Stories

Como operador, preciso que uma falha de disco mantenha os dados anteriores e não apresente sucesso.
Como responsável, preciso que a atualização preserve os dados antigos e os separe por conta/loja.

Acceptance Criteria:
1. WHEN o schema é iniciado duas vezes ou o arquivo é reaberto, o banco SHALL preservar IDs e dados e manter a versão esperada; schema futuro SHALL ser rejeitado.
2. WHEN uma referência cruza a partição conta/loja, o SQLite SHALL rejeitá-la; uma migração que falha SHALL reverter schema e versão.
3. WHILE a escrita está pendente, Persistido SHALL conservar o snapshot anterior; WHEN a escrita falha, SHALL rejeitar a operação sem notificar sucesso e aceitar uma próxima escrita.
4. WHEN modificações concorrem, Persistido SHALL compô-las pela ordem das chamadas; reiniciar e carregar SHALL respeitar a mesma fila.
5. WHEN o JSON legado é inválido, o armazenamento SHALL rejeitar com diagnóstico sem incluir o conteúdo e sem apagar a origem.
6. WHEN dados legados válidos são migrados duas vezes, o armazenamento SHALL preservar IDs, quantidades, valores, vínculos e origem, validando contagens e totais antes de registrar conclusão.
7. WHEN a migração recebe dados inválidos ou uma escrita falha, o armazenamento SHALL reverter o destino parcial e preservar a origem para nova tentativa.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| LOCAL-01 | 1, 2 | P0-01-A | implementing |
| LOCAL-02 | 3, 4, 5 | parte de P0-01-C | implementing |
| LOCAL-03 | 6, 7 | P0-01-B | pending |
