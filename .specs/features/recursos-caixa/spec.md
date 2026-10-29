# Recursos e identidade dos movimentos de caixa

## Problem Statement

Parte inicial de P0-04-C. A interface restringe sangria/suprimento ao plano, mas o push aceita as chamadas diretas. O insert atual ignora conflitos de ID e pode confirmar um movimento cujo vínculo ou conteúdo não foi gravado. Definir o que é movimento novo antes de aplicar capacidade e preservar os eventos históricos confirmados após downgrade.

## Out of Scope

Estoque e outros limites serão outro lote de C. CaixaId em venda, recomposição do fechamento, ajustes após fechamento, oferta de planos, conciliação, integrações de pagamento e sincronização mobile ficam nos seus itens. Não mudar abertura/fechamento, regra de caixa fechado, origem, sessão, licença de venda offline, schema, DTO, provider ou jobs. Nenhuma cobrança real. Este lote não encerra C nem AC-P0-04-2.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Capacidade | Usar podeUsar da licença consolidada no servidor, recurso sangria_suprimento | Mesma regra de plano já usada no mobile; não confiar em plano/data informados pelo cliente |
| Plano e situação | Preservar política existente de recursos por plano, sem novo bloqueio por status neste lote | Janela de vendas e máquina comercial não mudam |
| Novidade | ID sem registro confirmado é novo; histórico requer mesmo caixa, loja, tipo, valor, motivo e instante | Downgrade não apaga nem reatribui evento |
| Downgrade | Histórico idêntico ou omitido continua preservado; movimento novo é rejeitado com recurso_plano | Não aceitar retroação de data como licença nem descartar pendência |
| Conflito conhecido | ID duplicado no payload ou vínculo/conteúdo divergente retorna movimento_invalido por mutação antes de escrita | Não confirmar perda de evento nem vazar dados de outra loja |
| Conflito concorrente | Inserir apenas novos com onConflictDoNothing/returning; contagem diferente causa ErroApi409/conflito_movimento e rollback de todo o push | Evitar ACK falso se outra conta gravar o mesmo ID após a consulta, sem locks globais novos |
| Recuperação | Retentativa posterior classifica conflito conhecido por mutação e libera vizinhos válidos; pendência fica no cliente | Cliente/outbox completos seguem P0-02; não alegar tratamento visual já pronto |

Open questions: none para implementação local. As escolhas são reversíveis e não alteram histórico confirmado.

## User Stories

Como dono, quero que chamadas diretas respeitem meu plano. Ao trocar para plano menor, quero manter os movimentos já confirmados e fechar meu caixa sem perder a história. Como operador da loja, quero que uma confirmação de sync corresponda ao evento efetivamente persistido.

Acceptance Criteria:
1. WHEN uma mutação de caixa contém sangria ou suprimento ainda não confirmado e a licença atual do servidor é Essencial, a API SHALL responder200 com rejeição individual recurso_plano, sem alterar pai, filhos, mudanças ou ACK dessa mutação. O mesmo pedido SHALL ser aceito nos planos Negócio e Pro com evento completo persistido e vínculo correto. Exercitar caixa novo e aberto existente, ambos os tipos, sem confiar em data antiga ou extra de payload que declare outro plano.
2. WHEN o dono confirma movimentos no Negócio e muda para Essencial pelo fluxo local de assinatura em teste, a API SHALL permitir reenvio idêntico com nova mutação, omissão de histórico e fechamento sem movimento novo, preservando todos os campos históricos no banco/pull. Adicionar movimento novo SHALL rejeitar o agregado inteiro sem mudar cabeçalho/versão/filhos/ACK; o mesmo pedido/IDs SHALL poder ser confirmado depois de upgrade local para Negócio, sem duplicar histórico. Esse fluxo usa somente billing mock e não comprova compra real.
3. WHEN há ID repetido no payload, ID confirmado em outro caixa/loja ou qualquer divergência em tipo, valor, motivo ou instante de um movimento confirmado, a API SHALL rejeitar movimento_invalido por mutação antes de qualquer escrita, inclusive criação do pai. Testar duplicata idêntica e divergente, campos isoladamente e vínculos separados. Vizinhos válidos SHALL continuar aceitos, o rejeitado sem ACK e reenvios aceitos sem duplicação. Guarda loja/origem/caixa fechado e ACK anterior SHALL conservar prioridade e comportamento existentes.
4. WHEN duas contas tentam confirmar o mesmo ID de movimento e uma insere depois da consulta de novidade da outra, a perdedora SHALL responder409 com erro conflito_movimento e mensagem Movimento de caixa alterado durante a sincronização. Tente novamente., revertendo todo seu push, sem pai/filho/mudança/ACK parcial. Teste SHALL usar PostgreSQL dedicado, duas instâncias e telemetria por PID antes de liberar a concorrência, não sleep como prova. Após retry, conflito conhecido SHALL ser rejeitado individualmente como movimento_invalido e vizinhos válidos SHALL progredir. Não expor vínculo de outra loja nem converter conflito em sucesso.
5. WHEN os gates locais executam, testes SHALL verificar respostas e estado completo com PGlite e PostgreSQL, e regressões API/mobile/shared/typecheck SHALL passar. Nenhum teste anterior SHALL ser removido/enfraquecido/pulado. Revisor final novo SHALL confrontar os cinco ACs e detectar ao menos cinco regressões comportamentais em scratch antes do aceite. Não marcar integração externa ou o projeto pronto para produção.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| CASH-01 | 1,2 | P0-04-C capacidades do caixa | Implementado e gates locais PASS; revisão independente pendente |
| EVENT-01 | 3,4 | Pré-requisito de C para classificar evento novo | Implementado e gates locais PASS; revisão independente pendente |
| VERIFY-01 | 5 | Verificação local e revisão independente | Implementado e gates locais PASS; revisão independente pendente |

## Execution Plan

1. Executor Terra Médio: RED comportamental, implementar somente apps/api/src/servicos/sync.ts e novo apps/api/test/syncRecursosCaixa.test.ts; reportar testes/decisões/limitações sem commit. Gate rápido novo alvo mais sync/syncOrigem nas duas variantes, typecheck API. Gestor revisa diretamente persistência/sync, integra, roda regressões completas em série, registra adequação e faz commit atômico com status. Nenhum arquivo compartilhado com outro executor.
2. Revisor/verificador novo Terra Médio: critérios por asserção exata, alvos nas duas variantes/typeAPI, sensor P0>=5 em scratch e validation.md. Gestor verifica resultado, validate_state e checkpoint antes de aceitar este lote. Escopo global C permanece aberto.
