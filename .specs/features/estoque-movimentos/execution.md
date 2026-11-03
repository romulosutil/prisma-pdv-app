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

## T3

PASS: 42/42 mobile (7novos estoque, checkoutSQLite e repositórios), tipos mobile PASS. RED dos7casos mostrou saldo estático e marcador ausente. Arquivos: ProdutosRepo, VendasRepo, Dados, hooks e CheckoutSqlite; teste estoquePersistencia.test.ts. O marcador nasce no mesmo commit de venda/itens/outbox; não existe escrita adicional de saldo. Retomada compara conteúdo do checkout sem derivar o marcador novamente.

| Critério | Assertiva em apps/mobile/test/estoquePersistencia.test.ts | Resultado | Reverso / necessidade |
| --- | --- | --- | --- |
| AC1–2 | :35 `.toBe(8000)`, :38 `.toEqual(v)`, :44 `.toBe(14000)` | baixa/reposição única e ajuste+4 | SQLite e navegador |
| Base imutável | :36 `.toBe(10000)`, :50 `.toEqual([10000,10000])` | outbox usa base, não saldo exibido | evita sobrescrita |
| Ajuste auditável | :42 `.toMatchObject([{quantidadeMilesimos:4000,motivo:'Entrada de mercadoria'}])`, :45 tipos | correção e histórico | AC5/10 |
| AC2,8 | :60 `.toBe(10000)`, :65 `.toBe(false)`, :68 `.toBe(6000)` | parcial não baixa e reativação correta | ciclo |
| Unidade | :70 `.rejects.toThrow('unidade')` | unidade controlada fixa | integridade |
| Metadados e negativo | :80 `.toMatchObject({nome:'Arroz novo',estoque:-1000})`, :81 `.toEqual([])` | renomear não ajusta | caso formulário antigo |
| AC6 | :96 `.rejects.toThrow('falha injetada')`, :97 `.toBe(10000)`, :99 `{n:0}` | rollback completo | falha antes do commit |
| AC6 retomada | :103 `.toBe(8000)`, :106 `.toEqual(venda)`, :108 `{n:1}` | arquivo reaberto, resposta perdida | mesma baixa |

Suficiência/necessidade: todos os cenários do escopo de persistência têm resultado financeiro/estoque explícito; teste emarquivo reabre conexões reais. Sem mudanças em testes anteriores deste lote. Histórico anterior é coberto no domínio/API; duas instalações HTTP seguem T5.
