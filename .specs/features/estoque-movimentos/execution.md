# Execução e adequação

## T1

PASS: 7 testes novos e tipos shared. RED inicial: sete falhas por ausência do comportamento. Arquivos: contrato.ts, estoque.ts, index.ts e estoque.test.ts do shared. Sem mudança em testes existentes.

| Critério | Assertiva | Resultado exigido | Reverso / necessidade |
| --- | --- | --- | --- |
| AC1–2 | packages/shared/test/estoque.test.ts:12 `expect(saldoEstoque(produto(), [venda()])).toBe(8000)` e :14 `.toBe(10000)` | 10→8→10 | baixa/reposição |
| AC3 | packages/shared/test/estoque.test.ts:20 `.toBe(10000)` | legado não baixa | preservação histórica |
| AC4 | packages/shared/test/estoque.test.ts:27 `.toBe(5000)` e :28 `.toBe(7000)` | duas vendas e cancelamento | soma/dedup |
| AC5 | packages/shared/test/estoque.test.ts:35 `.toBe(11000)` | +4−1−2 | ajustes concorrentes |
| AC7,10 | packages/shared/test/estoque.test.ts:39 `.toBe(650)` e :40 `.toBe(-1000)` | fração e negativo exatos | precisão |
| AC8 | packages/shared/test/estoque.test.ts:45 `.toBeNull()` e :47 `.toBe(6000)` | desligar/reativar | ciclo do controle |
| AC9, limites | packages/shared/test/estoque.test.ts:36 `.toThrow('Ajuste de estoque imutável')`, :52–55 `.success`/`.toThrow` | rejeitar corrupção/overflow | integridade |

Todas as assertivas se vinculam aos ACs; incluem valores/estados, não chamadas. Padrão Vitest do shared, sem fixtures externas. Integração/API e UI pertencem às tarefas seguintes.
