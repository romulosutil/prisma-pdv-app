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

## T2

PASS: 33/33 casos de API no PostgreSQL17 dedicado em127.0.0.1:55439/pdv_test; tipos API aprovados. Oito novos casos do estoque; os25 de recursos-produto preservam limites/downgrade/concorrência. Migração0008 apenas acrescenta três colunas nullable. Snapshots antigos foram ampliados com as novas colunas NULL, conservando comparação integral e todos os valores anteriores. RED inicial confirmou ausência de marcador, merge e guardas; fixture da segunda conta passou a usar outro cartão de teste (isolamento comercial).

| Critério | Assertiva em apps/api/test/syncEstoque.test.ts | Resultado | Reverso / necessidade |
| --- | --- | --- | --- |
| AC1–2 | :35 `.toBe(true)`, :36 `.toBe(8000)`, :41 `.toBe(10000)`, :42 `.toHaveLength(1)` | marcador persistido e replay único | baixa/reposição |
| AC5 | :56 `.toBe('Nome novo')`, :57 `.toHaveLength(2)`, :58 `.toBe(11000)` | ajustes sobrevivem LWW | convergência |
| AC9 | :75 `.toEqual([{ id: m.id, motivo }])`, :76 `.toEqual(antes)` | três rejeições sem escrita | imutabilidade |
| Legado | :90 `.toBe(true)`, :93 `.toEqual([{id:m.id,motivo:'venda_imutavel'}])`, :96 `.toBe(true)` | classifica nova venda antiga, conserva marcador | compatibilidade |
| Isolamento | :103 `.toEqual([{id:m.id,motivo:'loja_invalida'}])` | outra loja recusada | autorização |
| AC11 | :112 `.toEqual(ms.map(...recurso_plano))`, :114 `.toEqual([a])` | downgrade preserva/recusa novos efeitos | licença |
| AC3 | :123 `.toBeUndefined()`, :124 `.toBe(10000)`, :128 `.toBe(10000)` | linha anterior à migração não recontada | histórico |
| AC5 concorrente | :137 `.toEqual([a.id,b.id].sort())`, :138 `.toBe(13000)` | dois pushes simultâneos retêm ajustes | concorrência |

Suficiência/necessidade: cada teste mapeia ao critério da linha; nenhuma asserção limitada a chamadas. Sem novo endpoint; push/pull existentes exercitados com auth e banco. Código e migração não foram aplicados à VPS.
