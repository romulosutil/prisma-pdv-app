# Corte de pagamentos integrados no ingresso de vendas

## Problem Statement

Seguimento de P0-04-C e parte servidor de P0-06-B. O escopo AD001 permite dinheiro, cartão registrado manualmente e Pix estático confirmado pelo operador. O contrato ainda aceita Tap e provedor, embora só existam simuladores e não haja referência persistente/reconciliação de cobrança real. Impedir que uma chamada direta grave uma venda nova como integrada, preservando a história já confirmada e as regras financeiras existentes.

## Out of Scope

Não conectar gateway, cobrar, estornar, reconciliar, alterar planos/preços, DTOs ou schema. UI, adapters e oferta global de capacidades seguem P0-06-B; confirmação física/manual e Android seguem homologação. Não mudar licença de venda, origem, auth, caixaId, fechamento, ajustes ou fila mobile. Recuperação visual de rejeição segue P0-02-F. Não converter registros históricos em pagamentos manuais nem afirmar que eram integração real.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Manual | provedor null e meio dinheiro/pix/cartao_credito/cartao_debito | Contrato existente e corte autorizado em AD001 |
| Novo ingresso | Tap ou qualquer provedor não null retorna pagamento_indisponivel por mutação | Não confiar em interface, plano superior, ambiente ou data declarada |
| Ativação futura | Nenhum toggle de ambiente neste lote | Integração exige implementação/homologação própria, não só ligar flag |
| História confirmada | Reenvio/cancelamento canônico conservam valores, método, provedor e origem existentes | Não reescrever proveniência nem criar cobrança nova |
| Prioridade | Loja/origem/licença/janela/consistência existentes antes do corte de capacidade | Conservar erros e recuperação atuais |
| Rejeição | Venda inteira rejeitada antes de pai/filhos/mudança/ACK; vizinhos continuam | Conteúdo local não é descartado; tratamento mobile completo ainda pendente |

Open questions: none para o corte local. Depende do aceite de recursos-produto antes de modificar novamente sync.ts.

## User Stories

Como dono, quero que dados novos recebidos pelo servidor reflitam os meios disponíveis no lançamento. Quero preservar vendas históricas e pagamentos manuais válidos sem que um simulador seja confundido com integração real.

Acceptance Criteria:
1. WHEN uma venda nova financeiramente consistente contém Tap com provedor null ou contém qualquer pagamento com provedor infinitepay/mercadopago, a API SHALL rejeitar pagamento_indisponivel por mutação antes de escrever venda, itens, pagamentos, mudança ou ACK, em Essencial/Negócio/Pro. Testar cada provedor, meios manuais e Tap, inclusive apenas uma parte não inicial de pagamento dividido indisponível. Corpo/data/plano/ambiente não SHALL liberar integração inexistente. Vizinhos válidos SHALL persistir de fato e retry não SHALL duplicá-los.
2. WHEN venda nova usa somente dinheiro, cartão crédito/débito manual ou Pix estático com provedor null, a API SHALL aceitar em todos os planos se as regras anteriores permitem. Testar cada meio, combinação dividida e dinheiro com troco, comparando pai e filhos completos/ordenados, mudanças e ACK. O mesmo conjunto de IDs de uma rejeição SHALL poder ser confirmado após correção explícita para meio manual válido, sem confirmação anterior fictícia. Isso comprova contrato de dados, não recebimento físico nem homologação Android.
3. WHEN registro histórico confirmado contém Tap/provedor, replay e cancelamento canônicos por dono atual SHALL conservar filhos, valores, provedor, origem e momento salvo, sem reinterpretar como manual e sem criar outra venda/duplicar filhos. Alterar financeiro de venda existente SHALL continuar venda_imutavel antes do novo corte. ACK de ID já aplicado SHALL continuar no-op autenticado, inclusive com corpo que hoje seria indisponível. Fixture SQL de legado SHALL ser documentada como precondição, não integração real.
4. WHEN venda nova também viola loja, origem, licença, janela ou consistência, a API SHALL conservar o motivo anterior e não produzir escrita parcial. Regressões API PGlite/PostgreSQL/mobile/shared/typecheck SHALL passar; verificador novo SHALL confrontar os quatro ACs e detectar ao menos cinco regressões comportamentais em scratch. Nenhuma etapa de cobrança, provider real, capacidades completas da UI ou produção SHALL ser marcada concluída por este corte de API.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| PAY-01 | 1,2 | P0-04-C; parte API P0-06-B | Aceito localmente;4ACs PASS/5mutações; validation.md |
| PAY-02 | 3 | História e idempotência preservadas | Aceito localmente;4ACs PASS/5mutações; validation.md |
| PAY-03 | 4 | Prioridades e verificação | Aceito localmente;4ACs PASS/5mutações; validation.md |

## Execution Plan

1. Depois do aceite de recursos-produto, gestor registra AD final e delega teste RED/implementação mínima em apps/api/src/servicos/sync.ts e novo apps/api/test/syncPagamentosManuais.test.ts. Guard inline após consistência e antes de insert, sem nova abstração para uso único. Gate rápido novo alvo mais syncValoresVenda/syncOrigem/sync nas duas variantes/typeAPI. Gestor revisa, integra, roda regressões completas em série, registra adequação e inventário em docs/auditoria-autorizacao-capacidades-api.md e faz commit atômico com status.
2. Verificador novo Terra Médio: alvos PGlite/PG, typeAPI, evidência exata por AC e sensor P0>=5; validation.md/validate_state e checkpoint. Auditar capacidades/limites expostos para encerrar C local somente com provas; manter P0-06-B global aberto para mobile/adapters/oferta.
