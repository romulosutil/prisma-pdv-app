# Fase 4A — Homologação de acesso isolada

## Problem Statement
O usuário autorizou avançar localmente enquanto prumo.services verifica no Resend. A API já implementa OTP, fila cifrada e SMTP, mas o bootstrap normal liga os jobs de cobrança/e-mail juntos, usa relógio de desenvolvimento e escuta todas as interfaces. A demo financeira não deve ser reconfigurada para enviar mensagens reais.

## Out of Scope
Sem publicação, push, produção, serviços contratados, cobranças reais, troca para senha, mudanças nos dados da demo8087, multiusuário ou declaração de integração Resend concluída. Domínio Verified, API key injetada pelo usuário e destino autorizado continuam necessários para envio real. Não aumentar escopo de autenticação nem reescrever filas existentes.

## Assumptions & Open Questions
| Assumption | Chosen default | Rationale |
|---|---|---|
| Autorização | Preparar e testar lote local, parar em checkpoint | Usuário pediu avançar enquanto DNS verifica |
| Remetente | acesso@prumo.services, Resend smtp.resend.com:465 TLS, usuário resend | Decisão AD-047 e domínio informado |
| Homologação | NODE_ENV=development, HOMOLOGACAO_EMAIL_CONFIRMAR=sim, PostgreSQL loopback banco pdv_homologacao_email, porta3339 fixa | Não tocar produção ou a demo financeira |
| Jobs | Launcher separado agenda somente fila de e-mail, com relógio real | Não habilitar cobrança para testar acesso |
| Código existente | Reutilizar composição Fastify, banco, SMTP, fila e agendador; opção explícita para omitir /dev | Evitar arquitetura paralela e preservar bootstrap normal |
| Segredos | Só process.env; nenhuma coleta/log/arquivo real ou variáveis públicas | Configuração feita pelo usuário quando domínio verificar |
Open questions: none para implementação local. Confirmação externa de domínio/destino não será presumida.

## User Stories
Como gestor, quero um comando de homologação local que exija configuração explícita, preserve o banco da demonstração e permita testar OTP sem ligar cobrança ou ferramentas de teste.

Acceptance Criteria:
1. WHEN configuração de homologação não contém NODE_ENV=development e HOMOLOGACAO_EMAIL_CONFIRMAR=sim, o sistema SHALL falhar antes de abrir banco ou transporte, com mensagem sanitizada. WHEN DATABASE_URL não é PostgreSQL loopback localhost/127.0.0.1 no banco exato pdv_homologacao_email, ou contém query/hash, o sistema SHALL rejeitar antes de efeitos.
2. WHEN configuração de e-mail não é modo smtp com host smtp.resend.com, porta465, TLS direto, usuário resend e remetente acesso@prumo.services, o sistema SHALL rejeitar antes de efeitos. Ring e credenciais SHALL passar pelas validações existentes, sem exibir valores de segredos.
3. WHEN homologação válida inicia, o sistema SHALL compor API com relógio real, fontes externas vazias, emissão por e-mail, rotas /dev desabilitadas e listen127.0.0.1:3339; SHALL agendar somente o worker de e-mail depois de listen, sem agendar cobrança. MockBillingProvider SHALL permanecer declarado como fixture local e não liberar produção.
4. WHEN inicialização ou parada falha, o sistema SHALL sanitizar erros e liberar recursos adquiridos. WHEN parar é chamado repetidamente, o sistema SHALL aguardar o worker ativo antes de fechar app e banco, uma única vez, sem perder a fila. Limpeza de expiradas e guarda de chave/domínio SHALL executar antes de servir.
5. WHEN criarApp recebe habilitarRotasDev=false, /dev/relogio/avancar e /dev/jobs/cobranca SHALL responder404. WHEN opção é omitida fora de produção, comportamento anterior SHALL permanecer. WHEN NODE_ENV=production, opção true SHALL não habilitar /dev.
6. WHEN entrega é registrada, a documentação SHALL apresentar comando/variáveis e checkpoint sem valores reais, distinguir bootstrap local da produção e preservar critérios externos como pendentes. Testes locais SHALL não enviar mensagens ao Resend nem tocar a demo8087.

## Execution Plan
1. Entregar bootstrap local seguro + opção de rotas /dev + testes direcionados. Arquivos permitidos: apps/api/src/homologacaoEmail.ts, apps/api/scripts/checkpoint-email.ts, apps/api/src/servidor.ts, apps/api/test/homologacaoEmail.test.ts, apps/api/test/servidorRotasDev.test.ts, este spec e STATE. Validar testes direcionados e tipos API; commit feat(email): add isolated access verification launcher.
2. Integrar roteiro e checkpoint, revisão nova com sensor em scratch, evidências e atualização do plano. Arquivos: docs/operacao-email-resend.md, docs/fases-e-checkpoints.md, docs/plano-implementacao-producao.md, .specs/STATE.md e validation.md desta feature. Validar gates e docs; commit docs(checkpoint): record isolated email verification preparation.

## Status
- Passos1–2 concluídos para a preparação local: 126/7 testes direcionados, 40/4 de integração PostgreSQL+SMTP local, tiposAPI PASS e smoke HTTP/PG real em banco vazio. Revisão independente30/30, sensor6/6 comportamentos e validate_state PASS. Achado documental corrigido e conferido pelo revisor. Envio Resend não homologado; parar no checkpoint local e preservar critérios externos abertos.
- Regressão completa API não aprovada: OOM/erros de workers no Windows, inclusive após pausar a demo. Não alterar testes nem inferir PASS global dos alvos aprovados. Nenhum teste foi omitido dentro das suítes direcionadas executadas.

## Verificação do gestor
| Critério | Evidência e valor esperado | Necessidade |
|---|---|---|
| AC1–2 | homologacaoEmail.test.ts:48 `rejects.toThrow('Configuração de homologação de e-mail inválida.')` e :49 `expect(m.abrir).not.toHaveBeenCalled()` / canal, matriz de17 configurações inválidas | Guardas sem efeitos e mensagens fixas, sem segredo |
| AC3 | homologacaoEmail.test.ts:54 composição realclock/semfontes/devfalse, :56 `toHaveBeenCalledWith({host:'127.0.0.1',port:3339})`, :58 cobrança não chamada, :60–63 canal/domínio/chave/relógio do worker | Transporte, origem e processamento previstos no contrato |
| AC4 | homologacaoEmail.test.ts:65–77 ordem/idempotência/drain; :81–112 falhas nos estágios e mensagens fixas, banco liberado | Encerramento e erro sanitizado sem perder recursos |
| AC5 | servidorRotasDev.test.ts:15–24 status404/409, rotasOTP presentes; :35 `expect(resposta.statusCode).toBe(404)` em produção com opção true | Padrão compatível e isolamento verificável por HTTP |
| AC3/5, smoke | GET/saude200 e POST das duas /dev404 em HTTP real, PostgreSQL local dedicado novo com migrações, fila vazia; servidor encerrado | Composição não comprovada apenas por mocks |
Todos os testes novos mapeiam AC1–5; sem testes especulativos ou alterações de asserts antigos. AC6 será comprovado na revisão do roteiro; nenhum desses resultados comprova entrega Resend.

## Requirement Traceability
| Critério | Implementação | Evidência |
|---|---|---|
| EMAIL-01 | homologacaoEmail.ts e launcher; AC1–4 | homologacaoEmail.test.ts:48–112; smoke local; validation.md PASS local |
| EMAIL-02 | servidor.ts; AC5 | servidorRotasDev.test.ts:15–36; validation.md PASS local |
| EMAIL-03 | Roteiro/checkpoint; AC6 | docs/operacao-email-resend.md; docs/fases-e-checkpoints.md; validation.md PASS local |
