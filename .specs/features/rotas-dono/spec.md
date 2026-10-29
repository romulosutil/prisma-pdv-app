# Dono nas rotas privadas com efeitos

## Problem Statement

Última parte de P0-04-B: as cinco mutações de assinatura e a confirmação de catálogo não verificam papel antes dos efeitos. Revogar aparelho verifica dono antes de esperar a conta, mas não revalida a sessão/papel após os locks. Restringir essas escritas sem alterar a máquina comercial, o provider ou o contrato externo.

## Out of Scope

Provider real, compra Play, cobrança externa, preços, jobs, termos e oferta. Não manter transação aberta durante rede. Não alterar o hook de sessão, push, DTOs, migrações, papéis disponíveis ou UI. Billing mock continua impedindo produção. Autorização de uma chamada não prova integração de pagamento nem conciliação do provedor.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Papel | Somente dono nas sete rotas de escrita listadas | Escopo inicial de uma pessoa e AD031 |
| Guarda | Consulta atual por ID de sessão/identidade antes do handler | Não confiar em papel enviado pelo cliente nem no snapshot anterior |
| Reuso | validarDonoAtual usa a consulta pura existente de sessão; exigirDono produz preHandler por rota | Reutilizar os mesmos joins sem hook global que afete leitura/logout |
| Rede | Assinatura é autorizada antes de iniciar o handler/provider, sem locks durante chamada | Preservar arquitetura; idempotência/gateway real continuam em P0-05 |
| Revogação | Pré-guarda antes de params e nova guarda dentro da transação conta -> sessão, relógio após locks, Read Committed explícito | Não usar autorização anterior à espera para revogar outro aparelho |
| Erros | Papel não dono403/proibido, sessão inválida401/nao_autenticado, DTO inválido do dono400 | Padrão atual em português |

Open questions: none para a implementação local. O gestor implementa lote pequeno diretamente; verificador novo Terra Médio confrontará os critérios e sensor antes do aceite.

## User Stories

Como dono, quero que somente minha sessão autorizada inicie mudanças de assinatura, contribuições de catálogo ou revogação de aparelhos. Como usuário, quero que leitura e logout continuem disponíveis sem efeitos comerciais inesperados.

Acceptance Criteria:
1. WHEN papel operador ou desconhecido usa sessão válida em POST /assinatura, POST /assinatura/trocar-plano, PUT /assinatura/cartao, POST /assinatura/cancelar, POST /assinatura/reativar, POST /catalogo/ean/:ean/confirmacao ou DELETE /aparelhos/:id, a API SHALL responder403 com erro proibido e mensagem Operação permitida somente ao dono., sem chamar verificarCartao/cobrar/estornar e sem modificar banco ou transações do provider simulado. Cada rota SHALL ter controle positivo com o mesmo pedido após restaurar dono, comprovando efeito/estado esperado. Cobrança e cartão SHALL incluir casos cujo controle positivo realmente chama o mock para não mascarar ausência de guarda por uma transição inválida.
2. WHEN sessão é ausente, revogada ou vencida, as rotas SHALL conservar401 sem efeito/provider. WHEN sessão vence entre o hook inicial e a nova guarda, a guarda SHALL consultar o prazo atual e rejeitar401 antes dos efeitos. Teste pode usar relógio controlado com primeira leitura válida e segunda no prazo exato, ativado só após criarApp, mantendo banco real e comprovando resultado/snapshot; não contar import/setup como prova. JSON válido com DTO inválido SHALL retornar400 ao dono; não dono SHALL receber403 antes da validação de domínio. Erros de parsing HTTP conservam comportamento anterior.
3. WHEN revogação já autenticada aguarda conta ou sessão no PostgreSQL e depois perde papel, sessão, aparelho ativo ou prazo antes de obter locks, a nova guarda transacional SHALL negar403 para papel e401 para credencial, preservando alvo, demais dados e credenciais salvo alteração intencional de controle. Testes SHALL observar query bloqueada por PID antes da alteração/relógio, em duas instâncias quando apropriado; sem sleep como prova isolada. A transação de revogação SHALL usar Read Committed mesmo com default Serializable, com prova SQL no update. Alvo de outra conta SHALL continuar404, sem alteração.
4. WHEN dono autorizado executa as rotas, elas SHALL conservar seus resultados e regras existentes. GET /planos público, GET /assinatura e GET /catalogo/ean/:ean para sessão da loja e POST /auth/logout próprio SHALL continuar funcionar para operador; GET /aparelhos conserva restrição existente de dono. Guardas SHALL não renovar sessão, adicionar efeitos em leituras ou alterar provider/jobs/billing mock. Testes de backend PGlite/PostgreSQL reais e regressões de todos os workspaces SHALL passar; mocks de provider são somente prova da autorização, não integração real.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| OWNER-01 | 1,2 | P0-04-B rotas privilegiadas | Implementado e gates locais PASS; verificação independente pendente |
| OWNER-02 | 3 | P0-03/P0-04-B revogação atual | Implementado e gates locais PASS; verificação independente pendente |
| OWNER-03 | 4 | Compatibilidade e limites de escopo | Implementado e gates locais PASS; verificação independente pendente |

## Execution Plan

1. Gestor: testes RED comportamentais sem importar helpers novos; depois implementar guardas. Arquivos: apps/api/src/auth.ts, rotas/assinatura.ts, rotas/catalogo.ts, rotas/conta.ts e test/rotasDono.test.ts. Não alterar helper de consulta/predicados ou serviço de sync, provider/jobs/schema. Gate rápido: novo alvo mais sessoes/syncSessao, PGlite e PG dedicado, typecheck API. Gate amplo: API nas duas variantes, mobile/shared e typecheck todos, serial/maxWorkers1. Base369API/PGlite ou418PG,434mobile,150shared; não somar variantes. Commit atômico do código/testes/status após gates e revisão direta do gestor.
2. Verificador novo: revisar quatro ACs por asserção/file:line, repetir alvos nos dois bancos/typecheck, sensor P0>=5 em scratch com guardas de cada rota e revogação após lock; validate_state e checkpoint. Não aceitar feature antes de PASS. Esse verificador independente é também a revisão da entrega escrita pelo gestor, sem subagente executor para um lote pequeno.
