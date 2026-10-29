# Corte de pagamentos no ingresso da API

Fonte funcional: uma linha em upsertVenda, depois de consistência e antes de insert. Não altera provider, schema, DTO, plano, ambiente, histórico ou licença de venda. Executor Terra Médio solicitado sem confirmação efetiva disponível; gestor revisou diretamente sync/financeiro e reforçou testes antes dos gates completos. Somente sync.ts e novo syncPagamentosManuais.test.ts, além de registros/auditoria do gestor.

## Evidência e gates

RED inicial informado:3falhas comportamentais e2sucessos nos5testes então registrados. Nos três planos, cada lote tinha12pagamentos indisponíveis aceitos indevidamente; nenhuma cobrança real, só registros SQL locais. Depois foi acrescentado caso de prioridade de licença ausente, total6testes comuns. Quick executor36/PGlite37/PG nos quatro alvos syncPagamentosManuais/syncValoresVenda/syncOrigem/sync, typeAPI PASS. Após reforços do gestor (HTTP200, data1hantiga, flags falsas no corpo e operador divergente), alvo PGlite6/6. Gates amplos finais em série PASS: API436/PGlite ou495/com PG30arquivos, mobile434/39arquivos, shared150/10arquivos e typecheck todos. Total1079/PG ou1020/PGlite,59condicionaisPG não se registramPGlite, nenhum registrado pulado. Revisão independente pendente.

PG17 dedicado adc76c1a91c11dd17e0582522bf966554c9d931adfd6e66ad108db3dd2cbabb0,127.0.0.1:52454/pdv_test, volumec19794dd58f74707624cd63f4c2636408f96496f540d573df9ea28af6bb8904f. Uma suíte global por vez/maxWorkers1. Seed SQL do legado é precondição de dados confirmados, não prova de recebimento/integração. Produção continua recusando billing mock e não foi iniciada.

## Adequação suficiente

| Critério | Asserção exata localizada | Resultado definido |
|---|---|---|
| AC1, todos planos/meios/provedores | apps/api/test/syncPagamentosManuais.test.ts:18 `expect(resposta.status).toBe(200)`;56 `expect(res.corpo.aceitas).toEqual([])`;57 `expect(res.corpo.rejeitadas).toEqual(rejeitadas.map(m => ({ id: m.id, motivo: 'pagamento_indisponivel' })))`;58 snapshot igual |12 combinações rejeitadas por plano, incluindo Tapnull e parte não inicial no split, sem pai/filhos/mudança/ACK. Data antiga e flags/plano extras não autorizam |
| AC1, vizinhos e retry | apps/api/test/syncPagamentosManuais.test.ts:65 aceita vizinhos;66 motivo do split;68 `expect(await snapshot()).toEqual(aposVizinhos)`;70 snapshot igual após retry | Vizinhos persistidos completos e rejeição individual sem efeitos |
| AC2, meios manuais/dividido/troco | apps/api/test/syncPagamentosManuais.test.ts:68/76 snapshots iguais ao esperado integral; helper35..39 constrói pai/filhos/posições/mudanças/ACK exatos | Dinheiro, Pix, crédito/débito com provedor null passam, incluindo troco e split |
| AC2, correção explícita dos mesmos IDs | apps/api/test/syncPagamentosManuais.test.ts:73 aceita IDs corrigidos;74 rejeitadas[];76 estado completo;77 aceita replay;78 snapshot igual | Nenhum ACK anterior fictício, nenhuma conversão automática no código de produção, sem duplicação |
| AC3, ACK antigo/imutabilidade | apps/api/test/syncPagamentosManuais.test.ts:93 aceita somente ACK anterior mesmo com corpo alterado;94 snapshot;96 motivo venda_imutavel;97 snapshot | Idempotência e imutabilidade anteriores conservadas |
| AC3, replay/cancelamento histórico | apps/api/test/syncPagamentosManuais.test.ts:100 aceita replay/cancelamento;102 `expect(depois.itens).toEqual(antes.itens)`;103 pagamentos iguais;104 pai igual exceto status/versão2;105 mudança exata;106 ACKs exatos | Provedor/método/origem/data/valores/filhos preservados, sem nova venda ou alegação de integração real |
| AC4, prioridades | apps/api/test/syncPagamentosManuais.test.ts:116 motivo assinatura_suspensa;117 snapshot;135 motivos loja/origem aparelho/origem operador/janela/consistência;136 snapshot | Novo corte não esconde recusas anteriores nem permite escrita parcial |
| AC4, regressão offline válida | apps/api/test/syncRecursosProduto.test.ts:199..219, repetido no gate amplo | Venda manual feita1h antes continua aceita após downgrade com pai/filhos/mudança/ACK completos |
| AC4, gates/sensor | Gates completos PASS, sensor/verificador no passo2 | Não aceitar antes de PASS independente |

## Adequação necessária

| Grupo/asserção | Requisito | Manter |
|---|---|---|
| Três matrizes de plano43..79 | AC1 eAC2 | Sim |
| Snapshot esperado33..40 | AC1/AC2/AC3 | Sim, prova de estado e posições de filhos |
| Legado82..107 | AC3 | Sim |
| Licença109..118 | AC4 | Sim |
| Prioridades120..137 | AC4 | Sim |
| Venda offline já existente, sem duplicar cenário | AC4 | Sim, gate amplo |
| Auditoria de capacidades em docs/auditoria-autorizacao-capacidades-api.md | Fechamento local de C após corte | Pendente de conferir no aceite |

Diretrizes: ajuda.ts, syncValoresVenda/syncOrigem e coding-principles da skill. Nenhum teste anterior alterado/removido/pulado/enfraquecido. Snapshots completos das cinco tabelas críticas, não só aceitas/spies; posições dos filhos fazem parte do esperado. Banco é real local nas duas variantes; billing local simulado só prepara assinatura de teste. O gate financeiro puro mantém conhecimento de Tap para ler história, enquanto o ingresso novo é cortado. Capacidades de UI/adapters/oferta e recebimento físico seguem pendentes.

Adequação do gestor: AC1..3 e prioridades deAC4 cobertos por resultados/estado completo, inclusive posições, vínculos e ACKs. Venda offline manual anterior repetida no gate amplo. Nenhum teste novo sem requisito. Gates PASS, aceite ainda depende de verificador e sensor finais.
