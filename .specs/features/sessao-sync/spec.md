# Sessão revalidada na transação do push

## Problem Statement

Parte de P0-04-B: o hook autentica antes da transação de sync. Uma requisição pode aguardar locks enquanto sessão/aparelho é revogado, o prazo vence ou vínculos mudam. O serviço usa uma Date capturada antes da espera. Fixar o ponto de autorização da escrita dentro da transação, antes de ACK e mutações, preservando arquitetura e contratos externos.

## Out of Scope

Matriz de permissões dono/operador, origem de novas vendas/caixas e reenvio histórico (próximo lote de B); capacidades/limites de C; caixaId/ajustes de D/E. Pull e outros endpoints conservam seu fluxo. Não alterar duração de30dias, contrato público, migrações, autenticação por OTP/cofre ou dados financeiros. Este lote não conclui P0-04-B global.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Ordem de locks | conta da sessão -> sessão por ID -> advisory de loja -> negócio | Compatível com revogação/login que travam conta; logout trava sessão sem depois pedir conta |
| Relógio | Amostrar depois de todas as esperas de autorização e advisory | Prazo e licença devem refletir instante de operação efetiva |
| Identidade | ID de sessão vem do hook, mais vetor conta/loja/aparelho/operador capturado; comparar com banco e joins atuais | Não confiar em snapshot velho nem somente existência da sessão |
| Linearização | Sessão trancada permanece até commit/rollback do push | Logout que vence primeiro impede push; push que vence primeiro pode concluir e logout espera |
| Erro | HTTP401 nao_autenticado, mensagem existente | Cliente já sabe retirar credencial sem apagar finanças |

Open questions: none para o lote. Decisões reversíveis autorizadas pelo Goal; sem expansão da oferta/permissões.

## User Stories

Como dono, quero que revogação e vencimento impeçam novas escritas mesmo quando a requisição já passou pelo hook e ficou esperando o banco. Como operador, quero que uma escrita autorizada seja confirmada atomicamente antes de o logout terminar, preservando os dados.

Acceptance Criteria:
1. WHEN push chega à transação, ele SHALL travar conta e sessão por ID, adquirir advisory da loja e revalidar sessão/vínculos atuais antes de consultar ACK ou alterar negócio. Sessão inexistente, revogada, expiraEm<=agora, aparelho revogado ou qualquer identidade/loja/operador/aparelho fora da conta/loja capturada SHALL retornar401 nao_autenticado e conservar integralmente finanças e ACK. Mesmo lote vazio ou ID já aplicado SHALL não contornar revalidação. Header aparelho diferente da sessão SHALL conservar403 aparelho_invalido; DTO inválido conserva400.
2. WHEN push autenticado aguarda conta ou sessão no PostgreSQL e depois vence ou perde autorização antes de obter os locks, ele SHALL rejeitar401 após a liberação, sem gravar dados/ACK. Testes SHALL observar pg_stat_activity/pg_blocking_pids de queries bloqueadas antes de avançar relógio ou confirmar revogação/vínculos; espera por timeout sozinho não comprova concorrência. Expiração exatamente no prazo SHALL rejeitar. Aparelho revogado e sessão revogada SHALL ter provas independentes, sem um mascarar o outro.
3. WHEN logout real vence a disputa pela sessão, push em outra instância Fastify SHALL aguardar e rejeitar401 depois, sem escrita. WHEN push já possui o lock da sessão, logout real em outra instância SHALL aguardar commit do push; push válido SHALL confirmar dados/ACK uma vez, logout SHALL concluir204 e push seguinte SHALL rejeitar401. Testes PostgreSQL SHALL comprovar as duas esperas reais e ordem de resultados, com snapshots financeiros preenchidos.
4. WHEN push válido aguarda advisory de loja, a Date usada para sessão, licença e metadados SHALL ser lida após essa espera. Se sessão vence nesse intervalo SHALL retornar401 sem escrita. Caso válido SHALL conservar janelas offline, idempotência, ordem/cursor, rejeição parcial, aritmética e legado dos testes existentes. Erros de autorização SHALL não renovar sessão nem modificar token/perfil/dados; lock/consulta não contam como escrita.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| SYNCAUTH-01 | 1,2 | Parte P0-04-B autorização atual | Planejado |
| SYNCAUTH-02 | 3,4 | Parte P0-04-B concorrência/relógio | Planejado |
