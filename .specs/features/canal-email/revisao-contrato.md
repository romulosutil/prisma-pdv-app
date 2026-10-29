# Revisão independente T1 — contrato do canal

**Resultado: PASS para o contrato compartilhado e gate T1, com ressalva de precisão da especificação.** Revisão limitada a AC1 e à representação local de erros em AC7; não é validação da feature completa. Base comparada: d3c0eca e árvore de trabalho. Os módulos de SMTP e cifra, a classificação de falhas reais e os gates finais não foram verificados nesta revisão.

| Critério | Resultado esperado e evidência | Resultado |
|---|---|---|
| AC1 mensagem válida | UUIDs, código com zero, validade e destinatário normalizado: apps/api/test/emailContrato.test.ts:13–14, 	oEqual com dona@exemplo.com; regras e objeto estrito em apps/api/src/email/contrato.ts:3–9. | PASS |
| AC1 mensagem inválida | IDs, e-mail, comprimento/tipo do código, data, anexos e injeção CRLF rejeitados: apps/api/test/emailContrato.test.ts:17–26, erro mensagem_invalida e mensagem fixa. Sem cause e sem refletir valores nos checks: linhas 27–31; conversão de erro Zod em erro local em apps/api/src/email/contrato.ts:34–38. | PASS para casos testados |
| AC7 contrato de erro | Quatro categorias e mensagens fixas: apps/api/test/emailContrato.test.ts:34–44, 	oMatchObject, chaves e ausência de cause/response; implementação apps/api/src/email/contrato.ts:18–31. Classificação de SMTP cabe a T3. | PASS para contrato, classificação pendente |
| Interface | apps/api/src/email/contrato.ts:11–15 exporta tipo e interface enviar(): Promise<void>; a resolução significa aceitação, sem garantia de caixa de entrada. | PASS por inspeção |
| Dependências | apps/api/package.json:19,26–29 e diff de package-lock.json versus d3c0eca fixam nodemailer 10.2.1, smtp-server 3.21.1 e tipos 8.0.2/3.5.13; lock registra Node >=20. | PASS; compatibilidade de uso real dos tipos aguarda T3 |

**Precisão ISO:** apps/api/src/email/contrato.ts:8 usa z.iso.datetime() sem opção de offset. Uma entrada válida ISO 2026-10-29T09:10:00-03:00 foi rejeitada como mensagem inválida; a spec diz apenas ISO e não define se offsets devem ser aceitos. Resolver explicitamente na especificação ou aceitar/testar offsets se a intenção for ISO 8601 com deslocamento. O teste atual só comprova UTC com Z e uma data inválida (apps/api/test/emailContrato.test.ts:9,19). Não há teste específico de seis caracteres não numéricos nem de campos obrigatórios ausentes, embora o schema os rejeite por inspeção.

**Comandos:** 
pm run test -w @pdv/api -- test/emailContrato.test.ts: 14 passaram, 0 falharam; 
pm run typecheck -w @pdv/api: passou; git diff --check d3c0eca -- apps/api/package.json package-lock.json: passou. Todos executados via rtk. Teste pontual com tsx confirmou a rejeição do offset, sem rede.

**Limites:** SMTP ainda não está integrado às rotas; não há evidência de entrega externa ou caixa de entrada. Não foram executados sensor de mutação, build completo, nem validação final de todos os ACs; essas etapas pertencem à revisão final após T2/T3. Nenhuma conexão SMTP externa ou segredo foi utilizada. A ferramenta de delegação não confirmou o modelo/nível solicitado; registrar a limitação como AD005 pelo gestor, sem afirmar que Terra Médio foi efetivamente usado.

## Reavaliação após alteração de especificação e testes

**Resultado atualizado: FAIL na interpretação canônica de Date.toISOString; ressalva de offsets resolvida.** A spec agora exige UTC com Z e recusa offsets (spec.md:30), e o teste comprova rejeição do offset (apps/api/test/emailContrato.test.ts:20,26–27). Os novos testes também exigem os cinco campos (linhas 35–38) e rejeitam letra e dígitos não ASCII (linhas 19–20). Executei novamente o teste alvo: 22 passaram, 0 falharam.

O design diz expiraEm ISO UTC/Z como Date.toISOString (design.md:7), e a decisão comunicada ao revisor exige formato canônico como Date.toISOString. Porém z.iso.datetime() em apps/api/src/email/contrato.ts:8 aceita e preserva 2026-10-29T12:10:00Z e 2026-10-29T12:10:00.1Z, conforme execução independente de lerMensagemCodigo; para esses instantes, Date.toISOString() produz respectivamente 2026-10-29T12:10:00.000Z e 2026-10-29T12:10:00.100Z. O teste válido em apps/api/test/emailContrato.test.ts:9,14 não distingue as duas interpretações. Definir se a exigência é apenas UTC/Z ou a representação exata canônica com três dígitos fracionários; para a última, rejeitar ou normalizar variantes conforme decisão e acrescentar testes com resultados explícitos. A falha apontada é restrita a T1 e não pressupõe revisão de T2/T3.

## Segunda reavaliação — parecer vigente

**PASS T1.** A divergência sobre formato canônico foi corrigida: spec.md:30 exige normalização UTC/Z com três dígitos por Date.toISOString; apps/api/src/email/contrato.ts:8 implementa essa normalização após validar ISO UTC. apps/api/test/emailContrato.test.ts:17–21 verifica explicitamente ...00Z para ...00.000Z e ...00.1Z para ...00.100Z; o caso com offset continua recusado em linhas 27,33–34. Teste independente: 24 passaram, 0 falharam. A interpretação anterior e o FAIL da seção anterior ficam superados. As limitações de escopo e integração descritas acima permanecem.
