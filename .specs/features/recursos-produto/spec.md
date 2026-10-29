# Estoque e limites de produto no servidor

## Problem Statement

Seguimento de P0-04-C, depois de recursos-caixa. O servidor aplica o limite de produtos, mas aceita alterar estoque/estoque mínimo mesmo quando o plano não oferece estoque. Fechar essa passagem preservando dados históricos no downgrade, regras atuais de conflito e a recuperação de vendas manuais já concluídas offline.

## Out of Scope

Pagamento integrado e oferta/capacidades de lançamento seguem P0-06-B. Operadores/multiloja não são oferta inicial. Não modificar planos, schema, contratos, UI, billing, jobs, origem, sessão, aritmética ou janelas de vendas. Não atualizar estoque automaticamente ao vender. CaixaId e ajustes seguem D/E; outbox e recuperação visual seguem P0-02. Nenhuma integração externa ou produção.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Recurso | podeUsar da licença atual consolidada, estoque | Conservar shared e não confiar em plano informado pelo cliente |
| Histórico | Sem recurso, estoque e mínimo ficam iguais aos valores já confirmados; novo produto exige ambos null | Evitar apagar dados no downgrade; zero é valor de estoque, não ausência |
| Edição permitida | Nome, preço e outros campos podem mudar conservando estoque; exclusão explícita continua disponível | Plano menor não bloqueia manutenção dos dados existentes |
| Mudança para null | Também exige recurso quando muda valor confirmado | Não limpar histórico silenciosamente para contornar capacidade |
| Ordem | Preservar loja, last-write-wins antigo e limite já existentes, depois guardar estoque antes da escrita | Nenhum efeito para mutação antiga aceita como no-op; sem mudar prioridade limite_plano |
| Limite | Usar contagem ativa na transação atual; já existente não consome vaga nova | Revalidar por banco, inclusive lote e concorrência |
| Estado comercial | Não adicionar bloqueio por status aos recursos | Igual a recursos-caixa/shared; licença de nova venda permanece no fluxo atual |

Open questions: none para implementação local. Depende do aceite de recursos-caixa antes de alterar sync.ts.

## User Stories

Como dono no Essencial, quero editar produtos e conservar meu histórico após downgrade sem que chamadas diretas habilitem estoque. Quero receber uma rejeição recuperável quando o plano não autorizar uma mudança, sem perder outras operações válidas do lote.

Acceptance Criteria:
1. WHEN novo produto tem estoque ou estoqueMinimo não null e plano atual é Essencial, a API SHALL rejeitar recurso_plano por mutação antes de escrever produto, mudança ou ACK. Testar separadamente zero, valor positivo, negativo e mínimo isolado; ambos null SHALL ser aceito. O mesmo pedido com valores SHALL ser permitido no Negócio/Pro e persistir campos exatos. Data antiga ou extra declarando plano não SHALL liberar recurso.
2. WHEN produto com estoque confirmado no Negócio passa por downgrade local para Essencial, a API SHALL conservar estoque/mínimo, permitir edição de outros campos com esses valores idênticos e rejeitar mudança isolada de estoque ou mínimo, inclusive limpar para null. Snapshots SHALL comprovar ausência de efeitos/ACK do rejeitado; pull SHALL manter campos exatos. Após upgrade local, retentar mesmo pedido/IDs SHALL confirmar uma vez. Exclusão explícita SHALL continuar possível sem apagar valores da linha histórica, e restauração SHALL respeitar limite/campos confirmados.
3. WHEN mutação de produto é antiga segundo last-write-wins, a API SHALL conservar o no-op/ACK existentes mesmo com campos de estoque divergentes. Loja inválida e limite_plano SHALL conservar prioridade existente. Vizinhos válidos e retry de mutação já aplicada SHALL manter seus dados e contagens sem duplicação. Cada cenário SHALL comparar estado e resultado, sem apenas contar chamadas.
4. WHEN a loja já alcançou o limite Essencial ou o ultrapassou antes de um downgrade, a API SHALL permitir editar/excluir produto existente, negar nova ativação/restauração que excede o limite e liberar exatamente a vaga removida, sem ACK ou mudança parcial do rejeitado. Usar o teste existente de 501 produtos como evidência básica e acrescentar estados de downgrade/restauração e snapshots ausentes nele. WHEN dois pushes concorrem pela última vaga, no PostgreSQL a API SHALL aceitar exatamente um e rejeitar o outro com limite_plano, nunca ultrapassando500; telemetria por PID SHALL comprovar espera antes de liberar a concorrência. Não adicionar outro limite ou alterar valores de planos.
5. WHEN um push aguarda a conta e o plano é reduzido antes de obter o lock, a API SHALL usar licença atual após a espera e rejeitar novo estoque/ativação excedente. Teste PostgreSQL SHALL observar bloqueio antes de confirmar alteração controlada e comparar estado sem efeitos do rejeitado. Plano agendado sozinho não SHALL antecipar restrição do plano atual.
6. WHEN venda manual consistente foi concluída offline dentro da janela válida e o plano muda para Essencial, sincronização SHALL conservar as regras atuais e aceitar a venda sem exigir recurso estoque. API PGlite/PostgreSQL e regressões mobile/shared/typecheck SHALL passar; verificador novo SHALL confrontar seis ACs e detectar ao menos cinco regressões em scratch. Recursos-caixa permanece protegido. Não declarar C/produção prontos por este lote isolado.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| STOCK-01 | 1,2,3 | P0-04-C recurso estoque e downgrade | Aceito localmente;6ACs PASS,5/5mutações; validation.md |
| LIMIT-01 | 4,5 | P0-04-C contagem ativa e plano atual | Aceito localmente;6ACs PASS,5/5mutações; validation.md |
| PRODUCT-01 | 6 | Venda offline e regressão | Aceito localmente;6ACs PASS,5/5mutações; validation.md |

## Execution Plan

1. Após aceite de recursos-caixa, registrar decisão final e delegar testes RED/implementação mínima em apps/api/src/servicos/sync.ts e novo apps/api/test/syncRecursosProduto.test.ts. Não alterar arquivos de outro executor. Gate rápido novo alvo mais sync/syncOrigem/syncRecursosCaixa, nas duas variantes, typecheck API. Gestor revisa diretamente e integra; gates amplos serializados, adequação e commit atômico com status.
2. Revisor/verificador novo Terra Médio: alvos nos dois bancos, typeAPI, critérios por asserção exata e sensor P0>=5; validation.md, validate_state e checkpoint. Sem aceitar C global antes da auditoria das demais capacidades efetivamente expostas.
