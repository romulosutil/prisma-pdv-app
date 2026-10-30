# Fase 3 — Sincronizar e restaurar

## Problem Statement
A API já aceita push/pull idempotentes, mas o app conserva apenas parte da outbox e não usa ACK, paginação ou restauração financeira. O status atual mede assinatura/conexão, sem provar envio dos dados.

## Out of Scope
Sem publicação, produção, assinatura/pagamentos reais, multioperador ofertado ou alteração da arquitetura Fastify/Drizzle/Expo. Não mudar data/autoria de venda rejeitada nem fabricar ACK. SQLite Android e serviços externos continuam sujeitos à fase4. Demo existente não será enviada para API real.

## Assumptions & Open Questions
| Assumption | Chosen default | Rationale |
|---|---|---|
| Checkpoint anterior | Usuário autorizou próxima etapa em30/10 | Registrar aprovação e trabalhar somente fase3 |
| Persistência | SQLite para nativo; envelope financeiro único para navegador HTTP, com mesma porta RepositorioSync | Outbox/ACK/cursor locais consistentes sem mudar repositórios públicos |
| Legado | Preparar uma vez snapshot das entidades locais ainda sem confirmação; IDs de mutação persistidos antes da rede; nunca assumir confirmado porque existe localmente | Recuperação conservadora |
| Conflito produto | Upsert do agregado por atualizadoEm conforme API atual; sem merge por campo. Pull de entidade pendente fica diferido até ACK, inclusive resposta canônica de escrita antiga ignorada | Proteger edição local e convergir depois |
| Pendência antiga | Rejeição individual mantém payload, ID, data e motivo exportáveis; retry explícito após revisão autenticada não reescreve conteúdo | Não perder venda nem abrir retroação arbitrária |
| Rede | Timeout HTTP existente15s; espera progressiva1s/5s/30s/60s limitada; execução única por instância, disparos abrir/retomar e periódico somente app ativo | Reversível, sem depender de plugin de rede |
| Prova integrada | API local e PostgreSQL descartável, assinatura/código de desenvolvimento explicitamente fixtures; dados financeiros trafegam pelo HTTP real | Integração financeira local, sem alegar integração comercial externa |
Open questions: none para implementar localmente. Recuperar aparelho perdido sem pendências na origem não autoriza converter operações não confirmadas em dados do servidor.

## User Stories
Como operador, quero vender offline, reiniciar e enviar sem duplicar. Ao recuperar acesso em instalação autorizada, quero receber tudo que o servidor confirmou e identificar o que ficou pendente na origem.

Acceptance Criteria:
1. WHEN produto/venda/caixa muda localmente, o sistema SHALL persistir sua mutação estável na mesma transação/envelope da alteração, incluindo exclusão, fechamento e cancelamento. Bootstrap legado SHALL ser idempotente e não produzir duplicatas em reinício; pull SHALL não gerar nova outbox por eco.
2. WHEN envio falha ou perde resposta, o sistema SHALL manter payload/ID até ACK individual válido, respeitar ordenação por entidade/dependência e ordem de alterações da mesma entidade, aplicar timeout/backoff e não bloquear vizinhos válidos por rejeição permanente. Resposta atrasada de outra conta/credencial SHALL não aplicar ACK/dados na conta atual;401 SHALL preservar finanças e pedir reautenticação.
3. WHEN pull retorna500 ou mais mudanças, o sistema SHALL continuar até esgotar, aplicar página e cursor juntos atomicamente e nunca usar cursor de push como cursor de leitura. Dados pendentes SHALL permanecer protegidos com mudanças remotas diferidas, aplicadas após confirmação. Falha de gravação SHALL não avançar cursor nem publicar estado parcial.
4. WHEN instalação limpa autorizada sincroniza, o sistema SHALL restaurar produtos/vendas/caixas/vínculos/fechamentos/eventos confirmados. UI SHALL indicar pendências/rejeições/última sincronização financeira real e distinguir modo local; ao abrir/retomar SHALL tentar com a credencial atual sem enviar dados de demonstração.
5. WHEN venda legítima com oito dias é rejeitada, o sistema SHALL preservar conteúdo/data/origem/motivo, permitir exportação local sem credenciais e revisão/retry autenticados sem mudar a venda; demais pendências SHALL prosseguir. Gestor SHALL provar HTTP/API/SQLite/PostgreSQL local, obter revisão nova com sensor, entregar checkpoint3 e parar para avaliação humana antes da fase4.

## Requirement Traceability
| ID | AC | Status |
|---|---|---|
| OUTBOX-01 | 1,2 | Implementado e gates locais PASS; revisão pendente |
| PULL-01 | 3,4 | Implementado e gates locais PASS; revisão pendente |
| RECOVER-01 | 4,5 | Implementado e gates locais PASS; revisão pendente |

## Execution Plan
1. Fixar contrato curto RepositorioSync. Dois executores Terra Médio em arquivos disjuntos: armazenamento/outbox/pull e transporte/motor. Uma suíte por vez; gestor mantém Dados/UI/lifecycle/integração HTTP.
2. Integrar e verificar fronteiras de persistência/conta/sync diretamente; executar gates e prova local completa, corrigir, registrar decisões e commit coerente. Revisor novo confere critérios e sensor isolado com ao menos5 falhas comportamentais.
3. Registrar checkpoint3 com commits/URL/roteiro/limitações e parar antes da fase4. Goal controlador continua pausado por limitação de ferramenta; fase autorizada diretamente nesta conversa.

## Evidências e adequação da integração

Mobile: regressão487/47 arquivos PASS antes do caso adicional de conflito real. Alvo final26/5 arquivos PASS com HTTP real/PostgreSQL17, SQLite real e unidades, incluindo o caso adicional. Typecheck de todos os workspaces PASS. API e shared runtime inalterados; migrações API existentes aplicadas no PostgreSQL. SchemaSQLite2 e suas migrações testados. Uma execução adicional com Metro/API ativos sofreu OOM; servidores pausados, alvo repetido verde sem aumentar heap, excluir ou pular casos.

| AC / resultado exigido | Assertivas concretas | Resultado |
|---|---|---|
| 1/2: IDs duráveis e resposta perdida | apps/mobile/test/syncIntegracao.test.ts:63 `expect((await sync.estado()).entradas.map((e) => e.mutacao.id)).toEqual(ids)`; ACKs exatos e sem mudanças extras no reenvio; syncPersistencia.test.ts preserva bootstrap após reabrir arquivo | PASS |
| 2: ACK individual e credencial atual | test/sincronizacao.test.ts valida conjunto/cobertura do ACK e troca de conta/token antes e dentro da aplicação local; backendSync.test.ts valida transporte e timeout | PASS |
| 3: paginação, cursor e rollback | syncIntegracao.test.ts restaura503 produtos e cursor503 sem outbox; syncPersistencia.test.ts falha em estado_local e reabre com cursor0/agregado vazio; ACK parcial conserva edição local e diferido aplica após último ACK | PASS |
| 4: restauração autenticada | syncIntegracao.test.ts autoriza novo aparelho pelo login API e compara vendas/caixas/produtos da instalação limpa com origem já confirmada | PASS |
| 5: venda antiga e vizinho | syncIntegracao.test.ts mantém venda8dias rejeitada com payload/ID/data e exportação sem token, produto válido confirmado | PASS |
| 4/5: UI financeira real | CUA8087 com API3338 desligada: venda25/troco5 e caixa criaram2 pendências; reload preservou2; PG tinha0vendas/0caixas/0ACK. Após ligarAPI e sincronizar: fila0, PG1venda25 vinculada/1caixa/2ACK, datafinanceira atualizada | Smoke web PASS; revisão e checkpoint humano pendentes |

Mapeamento reverso: novos testes syncPersistencia/syncNavegador cobrem AC1/3/5; sincronizacao/backendSync cobrem AC2/3/4; syncIntegracao cobre AC1–5. Fixture existente acessoApiIntegracao passou a exigir os três payloads da outbox (produto,caixa,venda) em vez de somente contagem1, por alteração contratual autorizada; nenhum resultado de identidade/valores foi removido. Não há teste sem requisito declarado; valores, conjuntos e snapshots complementam chamadas de mocks. Revisor deverá localizar números finais e confrontar os resultados; estes gates não são homologação Android, assinatura ou e-mail externos.

Decisões de integração: somente a aplicação local usa a fila de troca de conta e bloqueia temporariamente escritas; requisições HTTP ficam fora dela. App tenta ao abrir/retomar e a cada15s ativo, respeitando backoff do motor. Servidor de checkpoint é127.0.0.1 development, banco pdv_checkpoint_sync isolado de pdv_test; demo8086 não é enviada. Exceção de venda antiga permanece rejeitada no servidor, preservada localmente para revisão autenticada/exportação; não foi criada rota de aceitação excepcional.
