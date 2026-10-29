# Revisão independente T2 — PASS

Escopo: AC2/AC3 e `cifrador.ts`/`emailCifrador.test.ts` na árvore de trabalho sobre a base `1252ad8`. As duas lacunas antes registradas foram corrigidas. Esta revisão não aceita T3 nem substitui a validação e o sensor independentes após o último commit.

## Evidência confrontada com os critérios

| Resultado especificado | Evidência e asserção | Resultado |
| --- | --- | --- |
| AC2: AES-256-GCM, chave externa de 32 bytes e AAD UTF-8 `['prisma-pdv:email-codigo', 1, id, codigoId]`; conteúdo é a mensagem normalizada inteira | `apps/api/test/emailCifrador.test.ts:42`–`:46` decifra independentemente com `createDecipheriv('aes-256-gcm', ..., { authTagLength: 16 })`, aplica o AAD literal e tag, e `expect(JSON.parse(texto)).toEqual({...mensagem, destinatario: 'teste@example.com', expiraEm: '2026-10-29T12:00:00.000Z'})`. Chave de entrada tem 32 bytes em `:6`. | PASS |
| AC2: somente versão 1, iv, tag e conteudo; IV 12 bytes e tag 16 | `apps/api/test/emailCifrador.test.ts:27`–`:30`: `toEqual(['conteudo', 'iv', 'tag', 'versao'])`, `toBe(1)` e `toHaveLength(12/16)` | PASS |
| AC2: mesmos IDs/chave retornam mensagem normalizada; chave ausente/inválida falha sem fallback | `apps/api/test/emailCifrador.test.ts:31`–`:32` usa `toEqual(normalizada)`; `:49`–`:50` testa ausência, 31/33 bytes e formas inválidas com `erroLocal(..., 'configuracao')`. A função `:16`–`:19` verifica classe/tipo e ausência de cause. | PASS |
| AC3: duas cifras diferentes sem valores em claro | `apps/api/test/emailCifrador.test.ts:33`–`:37` aplica `not.toContain(valor)` a todos os valores originais e normalizados e afirma `outro.iv` e envelope distintos. | PASS |
| AC3: adulteração de envelope, versão, IV, tag, ciphertext, contexto ou chave recusada com erro local | `apps/api/test/emailCifrador.test.ts:61`–`:70`: valores malformados, IV/tag/ciphertext alterados, versão 2, campos extras, IDs inválidos ou trocados e chave diferente produzem `erroLocal(..., 'permanente')`; `:66` verifica no stack ausência de chave, código, destinatário original e ciphertext original. `:80`–`:82` rejeita base64 não canônico, e `:88`–`:89` rejeita ciphertext de mensagem válida acima de 4096 bytes como `mensagem_invalida`. | PASS |
| AC3: não retornar texto parcial nem revelar dados no erro | `apps/api/test/emailCifrador.test.ts:14`–`:19` exige exceção `ErroCanalEmail`, tipo esperado, sem cause e sem os segredos fornecidos no stack; `:66` aplica essa verificação às adulterações. Inspeção de `apps/api/src/email/cifrador.ts:46`–`:55` confirma que `decipher.final()` e validação precedem retorno e qualquer erro vira `ErroCanalEmail('permanente')`. Os testes não enumeram todos os segredos em cada caso. | PASS, com limite explícito |

O teste independente com payload autenticado de IDs divergentes em `apps/api/test/emailCifrador.test.ts:92`–`:98` espera `permanente`; não é usado sozinho como prova do AAD correto. Crypto de Node é real, sem mock. A fonte confirma base64 canônico e limites em `apps/api/src/email/cifrador.ts:10`–`:14` e `:40`–`:45`.

## Gate executado nesta reavaliação

- `npm test --workspace @pdv/api -- test/emailCifrador.test.ts`: 14 passaram, 0 falharam, 0 pulados.
- `npm run typecheck --workspace @pdv/api`: PASS.
- `git diff --check`: PASS informado pelo executor; não reexecutado nesta reavaliação e não cobre conteúdo não rastreado.

Sensor e gate completo da feature ficam para o verificador final; nenhum SMTP foi executado nesta revisão. Modelo solicitado Terra Médio não foi confirmado independentemente pelo retorno da ferramenta.
