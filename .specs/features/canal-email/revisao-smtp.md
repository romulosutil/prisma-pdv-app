# Revisão independente SMTP — T3

**Resultado: PASS para a adequação SMTP de AC4–8.** Revisão pré-commit sobre os arquivos SMTP presentes na árvore, com contrato base `1252ad8`. Não é a validação final da feature nem o sensor após o último commit.

| Critério | Evidência e resultado |
| --- | --- |
| AC4 | `apps/api/test/emailSmtp.test.ts:29-30` afirma configuração normalizada; `:32-39` recusa host, porta, remetente, modo, credenciais e produção nas combinações enumeradas. `:42-43` verifica rejeição síncrona da fábrica. `apps/api/src/email/smtp.ts:15-31` valida também a exceção literal IPv4/IPv6 e credenciais; o caso IPv6 não é exercitado. |
| AC5 | `apps/api/test/emailSmtp.test.ts:46-60` usa SMTP TCP local, envia duas vezes e afirma envelope, assunto, texto completo e Message-ID exato. A resolução e as duas capturas demonstram aceitação local. `:147-156` usa mock explícito para afirmar erro permanente quando `accepted` está vazio ou `rejected` não está vazio. `:158-165` afirma rejeição de HTML, anexos, headers, cc e bcc antes de conexão. `apps/api/src/email/smtp.ts:72-81` constrói os campos fixos. |
| AC6 | `apps/api/test/emailSmtp.test.ts:76-83` afirma erro permanente e zero AUTH e DATA para STARTTLS ausente e certificado não confiável, com servidor capaz de aceitar ambos. `:96-109` espiona a criação do transporte real e afirma flags TLS, logger/debug, acesso a arquivo/URL e quatro timeouts de 5000 ms. `:118-145` exercita TLS direto confiável e AUTH real, com CA de fixture somente no processo filho. `:167-179` exercita timeout real de greeting; os demais limites são verificados como opções. |
| AC7 | `apps/api/test/emailSmtp.test.ts:63-68` afirma categorias e mensagens locais para 450 e 550 reais, inclusive resposta com texto TLS, sem resposta/cause ou dados sensíveis na stack. `:70-74` afirma categoria de mensagem inválida e zero conexões; `:112-116`, conexão recusada temporária; `:118-145`, AUTH 535 permanente; `:167-179`, timeout de greeting temporário. `:85-94` é teste unitário com mock para EAUTH/454, não protocolo real. Configuração inválida é coberta em `:33-44`. |
| AC8 | `apps/api/test/emailSmtp.test.ts:14-17` limita o servidor a TCP 127.0.0.1 e porta efêmera; os testes citados acima afirmam envelope/conteúdo/ID, aceitação, 4xx/5xx e recusas TLS. Aceitação local não comprova entrega externa nem conclusão P0-03-A. Crypto fora do escopo desta revisão. |

## Verificações

- `npm test --workspace apps/api -- --run test/emailSmtp.test.ts`: 36 passaram, 0 falharam.
- `npm run typecheck --workspace apps/api`: passou.
- `git diff --check`: passou para arquivos rastreados. Os arquivos SMTP ainda estão não rastreados e, portanto, não aparecem no diff normal; `git diff --no-index --check NUL` nos dois arquivos não apontou erros de whitespace (status 1 indica diferenças; aviso de conversão LF/CRLF no teste).
- O teste TLS usa `cert.pem` e `key.pem` de fixture e `NODE_EXTRA_CA_CERTS` no processo filho; não altera a store do Windows. `openssl` não estava disponível para inspeção adicional dos metadados do certificado.

## Próximas verificações

Executar o gate de build e o verificador independente com sensor isolado após o último commit. Não foi executado sensor nesta revisão pré-commit.
