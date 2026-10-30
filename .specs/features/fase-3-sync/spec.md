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
| OUTBOX-01 | 1,2 | Planejado |
| PULL-01 | 3,4 | Planejado |
| RECOVER-01 | 4,5 | Planejado |

## Execution Plan
1. Fixar contrato curto RepositorioSync. Dois executores Terra Médio em arquivos disjuntos: armazenamento/outbox/pull e transporte/motor. Uma suíte por vez; gestor mantém Dados/UI/lifecycle/integração HTTP.
2. Integrar e verificar fronteiras de persistência/conta/sync diretamente; executar gates e prova local completa, corrigir, registrar decisões e commit coerente. Revisor novo confere critérios e sensor isolado com ao menos5 falhas comportamentais.
3. Registrar checkpoint3 com commits/URL/roteiro/limitações e parar antes da fase4. Goal controlador continua pausado por limitação de ferramenta; fase autorizada diretamente nesta conversa.
