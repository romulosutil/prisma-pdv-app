# Revisão dos adapters de acesso

**Resultado: PASS** no recorte de transporte dos critérios 3, 4, 5 e 8. Persistência, integração de sessão e interface não foram avaliadas.

## Evidências

- `apps/mobile/src/servicos/backendHttp.ts:129-155` aplica prazo de 15 segundos à requisição e leitura do corpo, aborta ao expirar e converte falhas em erro de rede sanitizado. `apps/mobile/test/backendAcesso.test.ts:61-87` verifica corpo pendente, sinal abortado, falha de leitura sanitizada, mensagem remota sensível e JSON inválido. A promise de transporte continua observada por `Promise.race` após o prazo; uma rejeição tardia não altera o resultado nem dispara callback. Esse último comportamento foi avaliado por leitura, sem teste específico.
- `backendHttp.ts:126-127,141-159` captura token usado, permite override, ignora o corpo de 401 e aguarda callback em 401 privado com token; 403, 401 público e ausência de token não executam callback. `backendAcesso.test.ts:12-47` verifica override, rotas, callback com token explícito e erro sanitizado, 403, 401 público e falha de rede. A espera por callback pendente, o 401 privado sem token e resposta antiga após troca não têm testes específicos; a proteção contra token antigo depende do chamador.
- `backendHttp.ts:66-80,164-168` usa `GET /conta` e `GET /aparelhos` com schemas compartilhados, valida UUID antes de `DELETE /aparelhos/:id` e exige 204 na revogação e no `POST /auth/logout`. `backendAcesso.test.ts:12-25,50-58` cobre rotas, perfil inválido, revogação com 200 e 403 e UUID inválido. Lista inválida e logout com 200 não têm teste específico.
- `backendHttp.ts:181-187` não preserva texto arbitrário retornado pelo servidor. `backendLocal.ts:56,78-97` identifica modo demo, valida perfil contra sessão e rejeita revogação. `sair` demo retorna sem revogação, cabendo ao chamador distinguir resultado local de confirmação remota.

## Execução e limites

`rtk proxy npm run test --workspace=@pdv/mobile -- test/backendAcesso.test.ts test/assinatura.test.ts`: **2 arquivos, 16 testes passaram**. Não foi executada a suíte global nem validação em Android. Este resultado não afirma que os critérios de produto completos estão integrados.
