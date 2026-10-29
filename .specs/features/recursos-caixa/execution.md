# Execução de recursos de caixa

Fonte de negócio alterada somente em sync.ts; teste novo syncRecursosCaixa.test.ts. Executor Terra Médio solicitado com fork_none, sem confirmação efetiva disponível na ferramenta. Gestor revisou diretamente persistência/sync e reforçou provas antes do aceite. Nenhum novo schema, DTO, provider, job, lock global ou regra de venda.

## Evidência inicial e gates

RED informado pelo executor:14casos PGlite,8sucessos/6falhas. Cinco falhas foram comportamentais de aceitação indevida de recursos no Essencial; a sexta foi fixture de cartão repetido entre contas e não conta como regressão detectada. Fixture passou a usar outro cartão válido. Não alegar RED inicial para vínculo/conteúdo; o sensor independente deve verificar essas proteções.

Quick inicial36PGlite/38PG e typeAPI. Após reforços do gestor executados pelo executor:37PGlite/39PG nos três alvos syncRecursosCaixa/sync/syncOrigem, typeAPI PASS. Gestor acrescentou pull completo após upgrade/fechamento e corrida com dois movimentos novos, um sem disputa e outro já ganho pela conta concorrente; alvo final PostgreSQL16/16. A contagem parcial RETURNING deve reverter também o filho que seria inserido. Gates amplos finais em série: API408/408 PGlite ou464/464 com PostgreSQL,28arquivos; mobile434/39arquivos,shared150/10arquivos,typecheck todos PASS. Total1048 usando PG ou992/PGlite;56casos condicionais PostgreSQL não se registram no PGlite. Nenhum registrado pulado. Revisão independente ainda pendente.

Banco efêmero17 dedicado3331902057ebb4e15dfc1c9681c415600a3a9ba994f62462bb37e58d97a4acb8,127.0.0.1:62426/pdv_test, volume545ae1c4d6b2694f9826d887ed10638aeb0769938d9fabac15fb79a4046e3642. Somente teste local, uma suíte global por vez/maxWorkers1. Billing simulado é suporte de trial, sem compra real. Trigger/advisory existem só na prova local e são removidos no finally.

## Adequação suficiente

| Critério | Asserção exata localizada | Resultado da spec |
|---|---|---|
| AC1 planos/tipos/caixa novo ou existente | apps/api/test/syncRecursosCaixa.test.ts:37 `expect(res.status).toBe(200)`;39 `expect(res.corpo.rejeitadas).toEqual([{ id: pedido.id, motivo: 'recurso_plano' }])`;40 aceitas[];41 `expect(await snapshot()).toEqual(antes)`;43 aceitas[pedido.id];44 registro completo | Matriz12 cenários. Essencial nega; Negócio/Pro persistem evento completo. Data2020 e extra planoId não liberam recurso |
| AC2 replay/omissão/fechamento Essencial | apps/api/test/syncRecursosCaixa.test.ts:56 planoEssencial;59 aceita replay e omissão;61 aceita fechamento;62/64 SQL completo;67 comprimento2;69 `expect(caixasPull).toEqual(...)` com caixas e movimentos completos | Histórico preservado antes do upgrade, pai e eventos recuperáveis no pull |
| AC2 negar agregado e retry após upgrade | apps/api/test/syncRecursosCaixa.test.ts:73 recurso_plano;74 snapshot integral;75 planoNegócio;76 aceita mesmo pedido;77 comprimento3;78/79 eventos completos;86/87 pull completo após fechamento | Não escrever header/versão/filhos/ACK ao negar; retry não duplica nem reescreve histórico |
| AC3 cada campo/nullable/vínculo/duplicata | apps/api/test/syncRecursosCaixa.test.ts:109 aceita somente ACK anterior;110 motivo movimento_invalido;111 snapshot. Variações104 incluem campos isolados, null->vazio e fixture loja inconsistente com caixa próprio;117..120 repetição em pai novo sem pai/ACK | Conflito conhecido rejeitado antes de qualquer escrita; sem liberar vínculo alheio |
| AC3 vizinho persistido e retry | apps/api/test/syncRecursosCaixa.test.ts:126 rejeita conflito;127 aceita produto;128 pai ausente;23 produto completo;24 mudança com loja/entidade/ID/data;25 ACK completo;132 snapshot igual após retry | Rejeição individual permite progresso de vizinhos, sem confirmação só aparente |
| AC3 prioridades | apps/api/test/syncRecursosCaixa.test.ts:151 `expect(...rejeitadas).toEqual([{ id: pedido.id, motivo: caso.motivo }])`;152 snapshot | Loja/origem de aparelho/origem de operador/caixa fechado precedem novo guard de movimento |
| AC4 corrida depois da consulta | apps/api/test/syncRecursosCaixa.test.ts:181 `expect(bloqueado).toBe(true)` antes da vencedora;183 aceita vencedora;185 evento vencedor completo;189 status409;190 `expect(resposta.json()).toEqual({ erro: 'conflito_movimento', mensagem: 'Movimento de caixa alterado durante a sincronização. Tente novamente.' })`;191 snapshot;192 filho sem disputa ausente;193 vencedor intacto | PostgreSQL comprova espera e conflito tardio, sem sucesso falso, vazamento ou efeito parcial |
| AC4 retry | apps/api/test/syncRecursosCaixa.test.ts:195 aceita só vizinha;196 movimento_invalido;197/198 pai/ACK conflito ausentes;23..25 produto/mudança/ACK reais;200 vencedor;203 snapshot do segundo retry | Depois do rollback, conflito individual não impede vizinho nem duplica evento |
| AC5 gates e sensor | Gates completos acima PASS; revisão/sensor final é passo2, aguardando validation.md independente | Implementação local com regressões verificadas; não aceitar feature antes do verificador |

## Adequação necessária

| Teste/asserção | AC | Manter |
|---|---|---|
| Matriz28..47 e registros37..44 |1 | Sim |
| Downgrade49..88, especialmente64/69/74/78/79/86 |2 | Sim |
| Divergência90..133 e helper23..25 |3 | Sim |
| Prioridades135..154 |3 | Sim |
| Corrida156..213, rollback189..193 e retry195..203 |4 | Sim |
| Regressões PASS; verificação independente no passo2 |5 | Sim, aguardar verificador para aceite final |

Diretrizes: padrões de ajuda.ts, syncOrigem/syncSessao, coding-principles da skill. Nenhum teste anterior removido/enfraquecido/pulado. Motivos, respostas e estado real estão vinculados aos critérios; não se usa só spy. A fixture de FK inconsistente é precondição de legado para isolar loja, não fluxo legítimo criado pela API. Caso PG condicional não é registrado em PGlite. O novo guard não corrige fechamento financeiro, caixaId ou oferta; próximos itens permanecem abertos.

Veredito de adequação do gestor para a implementação: AC1..4 cobertos por valores e estados exatos; testes necessários e sem asserção rasa como prova única. AC5 regressões PASS e sensor independente é o próximo passo obrigatório. Sem desvio do contrato.
