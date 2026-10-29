# Origem e papel autorizados no push

## Problem Statement

Completar P0-04-B após sessao-sync: a sessão é revalidada na transação, mas novas vendas/caixas ainda aceitam aparelho e operador arbitrários. Não há política de escrita para papel operador. O lançamento tem uma loja, uma pessoa e um aparelho; o cadastro cria dono e o login público seleciona esse dono. Restringir novas escritas a esse papel e à identidade autenticada, sem impedir acesso ao histórico confirmado de aparelho substituído.

## Out of Scope

Provisionar operadores ou permissões granulares, multiloja, capacidades/limites comerciais de C, caixaId e ajustes de D/E. Não alterar janelas offline ou autorizar retroação livre. Não transferir dados pendentes de outro aparelho, reativar UUID revogado, provar aparelho físico ou refazer histórico. Mobile, schemas/migrações, billing e contrato externo de sessão permanecem iguais.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Escrita inicial | Apenas papel dono em operações ainda não aplicadas; qualquer outro papel nega | Escopo de uma pessoa, sem inventar matriz de permissões não ofertada |
| Confirmação anterior | ID de mutação já aplicado continua ACK/no-op depois da revalidação de sessão | Confirmar sucesso anterior não concede nova escrita nem duplica operação |
| Leitura | Pull continua disponível à sessão autorizada da loja | Política de escrita não elimina acesso aos dados |
| Nova origem | aparelhoId e operadorId iguais aos IDs da sessão atual | Os vínculos atuais já foram verificados por sessao-sync |
| Histórico | Loja do registro confirmado é a autoridade para dono atual; conservar origem armazenada | Não inventar prova física da origem legada nem bloquear história por aparelho revogado |
| Caixa conhecido | Dono pode gerir caixa aberto conhecido de origem antiga, sem mudar aparelho/operador armazenados | Recuperação do dono não reescreve quem abriu o caixa |
| Caixa fechado | Preservar caixa_fechada para nova mutação; mesmo ID aplicado segue ACK/no-op | Fechamento e ajustes pertencem a D/E, sem redesenhar esses contratos aqui |

Open questions: none. Política reversível, registrada pelo gestor antes de delegar. Ofertas para múltiplos operadores e permissões granulares permanecem fora do lançamento e dependem de entrega específica.

## User Stories

Como dono, quero que uma chamada direta não crie vendas ou caixas em nome de outra identidade. Ao substituir aparelho, quero conservar e gerir os registros confirmados da minha loja com sua origem original, sem tratar isso como autorização para criar novos registros em nome do aparelho antigo.

Acceptance Criteria:
1. WHEN sessão válida tem papel diferente de dono, toda mutação ainda não aplicada de produto (upsert/delete), venda ou caixa SHALL ser rejeitada individualmente com permissao_negada em HTTP200, sem dados/mudança/ACK novos. IDs já aplicados SHALL continuar aceitos como no-op sem alterar nem adicionar ACK; um lote misto de ACK antigo e operação nova SHALL confirmar só o antigo. Pull SHALL continuar retornar os dados da própria loja; sessão revogada/vencida continua401 antes de ACK. Papel desconhecido no banco também SHALL negar escrita.
2. WHEN dono envia venda ou caixa novos, aparelhoId e operadorId SHALL coincidir com a sessão revalidada. Divergência em qualquer campo, inclusive ID inexistente, de outra conta, de outro aparelho da mesma conta ou de aparelho antigo revogado SHALL retornar origem_invalida antes de escrever. Loja divergente SHALL conservar loja_invalida. Casos com origem correta SHALL continuar aceitos com valores e ACK corretos; financeira e janelas já entregues não mudam.
3. WHEN dono atual reenvia venda confirmada da loja cuja origem é aparelho antigo/revogado, corpo financeiro e origem idênticos SHALL permitir replay e cancelamento conforme contrato de valores-venda, preservando filhos e origem. Trocar origem de venda existente SHALL continuar venda_imutavel. Criar novo ID de venda com a origem antiga SHALL ser rejeitado como origem_invalida. Operações SHALL não reativar aparelho ou sessão revogados nem modificar credencial atual.
4. WHEN caixa aberto já existe, mudar aparelhoId ou operadorId armazenado SHALL retornar origem_invalida sem alteração. Dono atual SHALL poder enviar alterações de caixa aberto conhecido com origem original, inclusive após trocar aparelho; o registro SHALL manter essa origem. Mesma mutação já aplicada SHALL ser no-op; nova mutação em caixa fechado SHALL conservar caixa_fechada, sem mudar finanças. Isso SHALL não criar evento auditável ou estorno fictício: D/E continuam pendentes.
5. WHEN papel do dono muda para operador depois do hook enquanto push aguarda conta no PostgreSQL, a transação SHALL usar o papel atual após o lock e rejeitar a nova operação como permissao_negada, confirmando somente ACK anterior se houver. Teste SHALL observar bloqueio por PID antes de mudar papel, usar duas instâncias Fastify e preservar integralmente dados/sessão/ACK. Sessão continua autenticada; resposta SHALL ser200 de rejeição de negócio, sem renovar credencial. Testes PGlite/PostgreSQL reais e regressões completas SHALL manter contratos de sessão, aritmética, histórico e isolamento de lojas.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| ORIGIN-01 | 1,5 | P0-04-B papel atual | Planejado |
| ORIGIN-02 | 2 | P0-04-B nova origem | Planejado |
| ORIGIN-03 | 3,4 | P0-04-B histórico confirmado | Planejado |
