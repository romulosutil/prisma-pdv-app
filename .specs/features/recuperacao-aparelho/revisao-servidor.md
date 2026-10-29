# Revisão independente T2 — servidor

**Resultado: PASS para o escopo servidor AC1–8.** As quatro lacunas da revisão anterior foram corrigidas em testes, sem alteração de produção. No PostgreSQL local dedicado, repeti os 30 testes de recuperação, incluindo concorrência e trava reais: todos passaram. Typecheck API passou. Na revisão anterior, a suíte API completa passou com 185 testes e `git diff --check` passou; a suíte completa atualizada de 186 testes foi reportada pelo executor, não repetida nesta segunda revisão.

## Lacunas anteriores fechadas

- Resposta 401 para conta ausente e código errado é comparada integralmente, sem perfil ou aparelhos em `apps/api/test/recuperacaoAparelho.test.ts:69`.
- Ausência de consentimento retorna 400 `requisicao_invalida` e preserva snapshot completo de aparelhos, sessões, desafio e orçamento em `apps/api/test/recuperacaoAparelho.test.ts:46`.
- As cinco fronteiras de falha verificam 500, token antigo válido e igualdade integral do estado, inclusive IP; retry conclui e aumenta o contador uma vez em `apps/api/test/recuperacaoAparelho.test.ts:115` e `:137`.
- Outro erro 23505, de constraint diferente, produz 500, reverte negócio e orçamento e permite retry em `apps/api/test/recuperacaoAparelho.test.ts:163`.

## Evidências por critério

- AC1: helper comum verifica falhas por email, trava conta, expiração e cinco tentativas em `apps/api/src/servicos/codigoLogin.ts:15`; login e recuperação consomem `login_ip` antes da conta em `apps/api/src/rotas/conta.ts:105` e `apps/api/src/rotas/recuperacao.ts:20`. Testes de TTL, limites independentes, mistura de login e recuperação e contadores em `apps/api/test/recuperacaoAparelho.test.ts:292`, `:306`, `:315`, `:449` e `:467`.
- AC2–4: geração de 32 bytes, hash e validade de cinco minutos, perfil e candidatos vinculados à conta/loja, consumo de OTP e invalidação pendente em `apps/api/src/rotas/recuperacao.ts:24`; nova emissão invalida pendências em `apps/api/src/rotas/conta.ts:80`. Testes de hashes, validade e rejeição prévia de ambos os tokens em `apps/api/test/recuperacaoAparelho.test.ts:25`; conflitos de vínculo/vaga e orçamento em `:380`; prova desconhecida e novo código em `:69` e `:90`. Migração `apps/api/drizzle/0004_lame_shiver_man.sql` armazena hash e referências, sem segredo bruto.
- AC5–7: trava conta/desafio e relógio posterior em `apps/api/src/rotas/recuperacao.ts:53`; replay é anterior a alvo/capacidade, valida sessão e aparelho e retorna token derivado estável em `:62`. Ramo pendente valida ID escolhido no snapshot, vínculo ativo e capacidade atual em `:70`. Testes de replay e sessão única em `apps/api/test/recuperacaoAparelho.test.ts:52` e `:186`; sessão revogada e escopo estranho em `:65` e `:222`; seleção/revogação e downgrade em `:327` e `:339`; expiração após trava em `:355`; candidato não escolhido revogado em `:403`. Valores financeiros são comparados integralmente em `:204`.
- AC6/8: savepoint engloba as cinco escritas de negócio e catch restringe conflito da PK em `apps/api/src/rotas/recuperacao.ts:78`. Teste PostgreSQL usa barreira antes das duas inserções, confirma um sucesso/um conflito, token antigo do perdedor e contador IP em `apps/api/test/recuperacaoAparelho.test.ts:251`.

O escopo desta revisão é o servidor; os critérios mobile, integração local completa, SMTP real e Android continuam sujeitos aos respectivos gates. Os testes locais não comprovam entrega de e-mail ou recuperação em aparelho físico.
