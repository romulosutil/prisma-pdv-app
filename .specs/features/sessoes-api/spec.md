# Sessões e recuperação de aparelho na API

## Problem Statement

P0-03-D/F, parte servidor: sessões atuais não expiram e não há logout, perfil real nem revogação de aparelho. A API deve validar o estado consolidado a cada chamada protegida. A identidade da instalação é entrega independente no mobile.

## Out of Scope

Entrega de e-mail, limitação de código, SecureStore e interface mobile, deploy e migração em banco externo. Continuam no Goal, sem alegar autenticação de produção completa. Integração local usa PGlite; PostgreSQL externo exige verificação posterior.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Duração | 30 dias, depois nova autenticação | Política reversível sem refresh token adicional |
| Offline | Licença local segue sua validade; sessão afeta chamadas ao servidor | Não apagar nem interromper venda iniciada |
| Revogação | Campos revogadoEm em aparelho/sessão e expiraEm em sessão | Auditoria e bloqueio imediato no servidor |
| Sessões existentes | expiraEm = criadoEm + 30 dias na migração | Nenhuma sessão antiga fica eterna |
| Autorização | Gestão de aparelhos somente dono da conta e loja autenticadas | Impedir uso direto por outra conta/operador |

Open questions: none para o recorte local; credenciais e homologação externa permanecem bloqueios explícitos.

## User Stories

Como responsável, preciso revogar um aparelho perdido e consultar o perfil da minha loja com dados reais.

Acceptance Criteria:
1. WHEN uma sessão atinge 30 dias ou é revogada, toda chamada protegida SHALL responder 401 nao_autenticado sem revelar token; a sessão SHALL ser aceita antes do limite.
2. WHEN o dono revoga um aparelho de sua conta/loja, todas as sessões dele SHALL ser rejeitadas e o aparelho SHALL deixar de consumir limite ativo; aparelho de outra conta SHALL responder 404 e operador sem papel dono SHALL responder 403.
3. WHEN POST /auth/logout é executado com token válido, a API SHALL revogar a sessão atual e responder 204; outro token válido do mesmo aparelho SHALL continuar válido até revogação própria/do aparelho.
4. WHEN GET /conta ou GET /aparelhos é chamado, a API SHALL responder segundo schemas shared com nome real da loja/perfil e somente aparelhos da conta/loja autenticada, sem token/hash/código/documento de cadastro.
5. WHEN um aparelho revogado tenta login, a API SHALL recusar sem consumir o código como sucesso e sem reativá-lo silenciosamente; código válido em substituto SHALL seguir limite de aparelhos ativos.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| SESSION-01 | 1, 3 | parte P0-03-D, servidor local | verified |
| SESSION-02 | 2, 4, 5 | parte P0-03-F, servidor local | verified |

## Execution Plan

1. Migração local + auth + contratos e rotas: arquivos permitidos no contrato do executor; testes por resultado HTTP e banco, typecheck API/shared. Nenhum commit pelo executor.
2. Revisor novo confronta critérios e executa testes; gestor revisa auth e migração diretamente. Após correções, atualizar evidências/plano e commit local único. Não usar PGlite como prova de PostgreSQL externo.
