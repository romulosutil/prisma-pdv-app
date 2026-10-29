# Revisão independente T3 — PASS

Base: `b717dfc`; revisão do diff dos três adapters e do teste novo, em relação a AC9, design e T3. Nenhum defeito bloqueante identificado.

- DTOs e respostas: `backendRecuperacao.test.ts:21`–`:35` verifica os dois POSTs, URLs, corpos, respostas, ausência de Authorization e ausência de consulta ao token antigo. `backendHttp.ts:99`–`:104` usa os schemas compartilhados; `backendRecuperacao.test.ts:71`–`:78` comprova rejeição de desafio e sessão inválidos. Os DTOs correspondem aos schemas usados pelas rotas em `apps/api/src/rotas/recuperacao.ts:17`–`:18` e `:49`–`:50`.
- Credencial: `backendRecuperacao.test.ts:38`–`:47` exercita 401 em ambas as operações e prova que o callback não é chamado e a credencial permanece. A condição em `backendHttp.ts:169` restringe o callback a chamadas privadas.
- Erros: `backendRecuperacao.test.ts:49`–`:55` testa os seis códigos 409 e a não exposição da mensagem hostil. `backendHttp.ts:193`–`:202` só aceita esses seis códigos quando o status é 409; os testes `:57`–`:62` cobrem 400, 404, 429 e 500 com `limite_aparelhos` adversarial. A regra é comum aos seis, embora esse teste não faça o produto cartesiano dos códigos. `:64`–`:69` verifica 429 com texto inválido e mensagem local exata; o parser ignora JSON inválido e não encaminha mensagens remotas.
- Demo: `backendLocal.ts:112`–`:119` recusa as duas operações; `backendRecuperacao.test.ts:81`–`:92` verifica rejeição e nenhuma leitura, gravação ou remoção no armazenamento. `recuperacao_indisponivel` é local e não consta das listas aceitas de códigos HTTP em `backendHttp.ts:48`–`:49`.

Validação independente: teste dirigido mobile, 18/18 aprovados; typecheck mobile aprovado. O teste usa fetch simulado e não comprova integração real com a API nem persistência de ponta a ponta; API e banco não foram executados nesta revisão. A suíte mobile completa de 371 testes foi relatada pelo executor, não repetida aqui.
