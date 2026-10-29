# Validação do canal de e-mail

**Result**: PASS

Os 8 critérios têm evidência, os 74 testes específicos passaram e o sensor matou as cinco mutações. O ajuste documental em d63a917 corrigiu os espaços finais; o diff final passou no `diff --check`.

**Data:** 2026-10-29. **Verificador:** independente, não autor. **HEAD:** d63a917. **Diff auditado:** d3c0eca..d63a917. Os testes e o sensor foram executados no conteúdo de daa8af5; o commit posterior alterou somente documentação. T1, T2 e T3 constam aceitas localmente em `tasks.md`.

## Critérios e evidências inspecionadas

| AC | Resultado exigido e evidência de asserção | Resultado |
|---|---|---|
| 1 | Cinco campos, UUIDs, destinatário normalizado, seis dígitos e data UTC normalizada; erros locais sem conteúdo. `apps/api/test/emailContrato.test.ts:14` `toEqual` compara a mensagem completa e destinatário; :18–21 compara `.000Z` e `.100Z`; :24–39 recusa UUID/email/código/offset/extras e exige tipo, texto fixo e ausência de segredo; :42–45 exige cada campo. | PASS |
| 2 | Chave base64 canônica de 32 bytes; AES-256-GCM, IV 12/tag 16, AAD versão e IDs; envelope restrito e roundtrip normalizado. `apps/api/test/emailCifrador.test.ts:27–32` compara chaves, versão, tamanhos e mensagem inteira; :40–46 decifra independentemente com algoritmo e AAD exatos; :49–50 exige erro de configuração para chaves ausentes/inválidas. | PASS |
| 3 | Adulterações e contexto/chave errados recusados sem segredo ou parcial; IV e envelope distintos sem campos em claro. `apps/api/test/emailCifrador.test.ts:33–37` verifica valores ausentes e IV/envelope diferentes; :57–70 exige erro permanente para envelope, versão, IV, tag, ciphertext, IDs e chave; :73–83 recusa base64 não canônico; :92–98 recusa IDs divergentes no payload autenticado. Helper :14–19 exige erro local sem cause ou segredos na stack. | PASS |
| 4 | Host, porta 1–65535, remetente único e modo explícito; credenciais seguras obrigatórias; local somente development/test e loopback literal sem credenciais; erro antes de conectar. `apps/api/test/emailSmtp.test.ts:29–40` compara configuração e rejeita entradas adversas; :42–44 revalida fábrica; implementação `apps/api/src/email/smtp.ts:15–41` valida antes de criar transporte. | PASS |
| 5 | Um envelope remetente/destinatário, assunto e texto fixos, expiração ISO e Message-ID estável; extras recusados, arquivos/URLs desabilitados, resolução apenas após aceitação. `apps/api/test/emailSmtp.test.ts:46–60` compara envelope, conteúdo e ID em duas submissões; :147–155 exige permanente sem aceitação exclusiva; :158–165 recusa HTML/anexos/headers e outros destinatários antes da conexão; :102–105 verifica opções de acesso. | PASS |
| 6 | STARTTLS obrigatório ou TLS direto, certificado verificado, sem downgrade, debug/logger desligados e quatro timeouts de 5000ms. `apps/api/test/emailSmtp.test.ts:76–83` exige rejeição e zero autenticação/DATA sem STARTTLS ou certificado confiável; :102–109 compara opções TLS, logs e quatro limites; :167–177 verifica timeout real de greeting. | PASS |
| 7 | 4xx/rede/timeout temporário, 5xx/autenticação/certificado permanente; categorias próprias e erro local sem resposta, credenciais ou OTP. `apps/api/test/emailSmtp.test.ts:63–68` exige tipos para 450/550 e ausência de dados; :70–74 mensagem inválida sem conexão; :82 e :85–93 certificado/auth permanentes; :112–116 conexão temporária; :118–145 auth TCP real; :173–174 timeout temporário; `apps/api/test/emailContrato.test.ts:48–58` compara os quatro textos locais. | PASS |
| 8 | TCP local comprova envelope/conteúdo/ID, aceitação, 4xx/5xx e negativos TLS; crypto real; não alegar entrega externa. `apps/api/test/emailSmtp.test.ts:46–68,76–83` executa servidor local e compara resultados; `apps/api/test/emailCifrador.test.ts:40–46` usa crypto real. Escopo da spec exclui fila e entrega externa. | PASS |

## Execução independente e limites

- `npm exec vitest run test/emailContrato.test.ts test/emailCifrador.test.ts test/emailSmtp.test.ts`, em `apps/api`: **74/74**, 3 arquivos, zero falhas ou skips.
- `npm run typecheck --workspace apps/api`: PASS.
- `git diff --check d3c0eca..daa8af5` inicialmente detectou espaços finais em `.specs/features/canal-email/revisao-contrato.md:15–16`; após a correção, `git diff --check d3c0eca..HEAD` em d63a917: PASS.
- Gate amplo anterior reportado pelo gestor para o mesmo conteúdo: API PGlite 259/15 arquivos, mobile 433/39, shared 148/10 e typecheck geral PASS. Não repetido independentemente nesta rodada; nenhuma nova suíte PostgreSQL é alegada.
- Aceitação SMTP local não demonstra caixa de entrada. Não há fila nem envio integrado. Apenas o greeting de 5s foi observado em tempo real; DNS/conexão/socket têm as opções de 5s verificadas, sem prova de duração real. TLS confiável usa CA de fixture somente em processo filho.

## Sensor isolado

Cópia `git archive HEAD` em diretório temporário, com junctions para dependências; testes executados no `apps/api` da cópia. Cada mutação foi restaurada antes da seguinte. Junctions removidas separadamente e scratch removido; os servidores e processos de teste encerraram. Antes e depois, porcelain real continha somente `.specs/STATE.md` e `README.md` modificados; este relatório foi criado depois da comparação.

| Falha comportamental | Resultado observado |
|---|---|
| AAD com versão 2 | Morta: decifragem independente falhou na autenticação, 1/14 teste falhou. |
| IV fixo | Morta: `expect(outro.iv).not.toBe(envelope.iv)` falhou, 1/14. |
| Aceitar base64 não canônico decodificável | Morta: helper exigiu `ErroCanalEmail`, 1/14. |
| `rejectUnauthorized: false` | Morta: envio com certificado inválido resolveu quando deveria rejeitar e opção divergiu, 2/36. |
| Remover guarda de aceitos/rejeitados | Morta: duas promessas resolveram quando deveriam rejeitar, 2/36. |

**Sensor:** 5 mortos, 0 sobreviventes. A preferência Terra Médio foi solicitada, mas não há confirmação efetiva do modelo pelo tool (AD005).
