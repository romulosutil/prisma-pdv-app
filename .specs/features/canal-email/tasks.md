# Canal de e-mail

## Test Coverage Matrix

| Camada | AC | Profundidade |
|---|---|---|
| Contrato | 1,7 | Campos, normalização, rejeição e erros locais |
| Crypto real | 2,3 | Roundtrip, IV distinto, ausência em claro, todas adulterações/chaves/contextos |
| SMTP | 4–8 | Config adversarial, TCP local real, envelope/texto/ID, 4xx/5xx/TLS negativos |

## Gate Check Commands

- quick: testes do módulo e typecheck API, diff--check.
- build: suiteAPI PGlite, mobile/shared e typecheck todos. PG não é necessário para módulos sem banco; integração futura terá PG próprio.
- spec/tasks/state/check_commit da skill tlc-spec-driven; revisor novo após entrega e sensor isolado ao final, sem mutar árvore real. Todo shell com rtk.

## Execution Plan

```text
T1 -> T2
T1 -> T3
```

T2/T3 são executores independentes Terra Médio, sem subagentes/commits; arquivos disjuntos. Gestor instala dependências, revisa crypto/segredos e integra. Revisor independente confronta8ACs e executa sensor em scratch.

## Task Breakdown

### T1: Contrato e dependências do canal
Depends on: none
Where: apps/api/src/email/contrato.ts, apps/api/test/emailContrato.test.ts, apps/api/package.json e package-lock.json.
Tests: AC1/7, schema estrito, normalização e mensagens locais sem detalhes externos; typecheckAPI após instalar dependências exatas.
Gate: quick
Done when: contrato compartilhado do lote está testado, versões instaladas/typecheck compatíveis, sem mudança de rotas ou gate de produção.
Status: aceita localmente;24casos, typecheckAPI e diff--checkPASS, revisão-contrato.md independentePASS. Ambiguidade ISO resolvida com normalização UTC/Z para3dígitos e prova de .000Z/.100Z; offsets recusados. Versõesfixadas sem alterar rotas/billing. AdequaçãoAC1/7 em emailContrato.test.ts:14 igualdade completa;17–21 datas normalizadas;24–49 inválidos/camposausentes;51–63 categorias/textos fixos/semcause. Nenhuma asserção removida/enfraquecida ou pulada.

### T2: Cifra autenticada do código
Depends on: T1
Where: apps/api/src/email/cifrador.ts e apps/api/test/emailCifrador.test.ts.
Tests: AC2/3, crypto real, roundtrip, IV12/tag16, chave externa canônica32, AAD/contexto e adulterações recusadas sem material sensível.
Gate: quick
Done when: envelope limitado/estrito e recuperação somente com chave/contexto exatos, testes/inspeção direta e revisão independente aprovados.
Status: aceita localmente apósrevisão-cifrador.mdPASS;14/14alvos repetidos porgestor/revisor,typecheckAPI/diffPASS. AC2em emailCifrador.test.ts:27–46 exige envelope/IV12/tag16/payloadnormalizado e decifragemindependente com algoritmo/AADexatos; AC3:49–96exige chave/contexto/IV/tag/cipher/envelope/base64canônico e limite. Busca plaintextnormalizado:34. Gaps iniciais deprova corrigidos semremoverasserções; fonte manteve contrato/AESNode real.

### T3: SMTP configurado e protocolo local
Depends on: T1
Where: apps/api/src/email/smtp.ts e apps/api/test/emailSmtp.test.ts, fixtures locais de certificado somente se indispensáveis.
Tests: AC4–8, parser/fábrica adversariais e SMTPServer em loopback com sucesso,4xx/5xx,STARTTLS ausente/certificado não confiável; conteúdo/erro sem vazamento.
Gate: build
Done when: protocolo local e categorias comprovados, sem fallback inseguro/env arbitrário, sem mudar emissão atual nem chamar teste local de entrega externa; revisor novo e sensor aprovados.
Status: aceita no módulo local apósrevisao-smtp.mdPASS;36alvos repetidos pelorevisor, gestor repetiu28antesdosreforços e suítecompleta259API/433mobile/148shared +typecheck todosPASS apósreforços. AC4:emailSmtp.test.ts:25–42parser/fábrica; AC5:43–60envelope/texto/ID e147–165aceitos/rejeitados/camposextras; AC6:76–83TLSnegativo e99–110opções5s; AC7:62–74status450/550,113–145conexão/AUTHreal e167–179greetingtimeoutreal. Corrigido450comtextoTLSclassificadocomo permanente. AUTH/TLSconfiável apenaslocalcomCAfixtureconfiadasónofilho. Demais timeouts têm prova deopção, semespera real. Verificadorfinalnovo+sensor pendentes.
