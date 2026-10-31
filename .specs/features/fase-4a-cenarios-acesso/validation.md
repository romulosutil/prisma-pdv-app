# Validação — Fase 4A, cenários de acesso

**Data:** 2026-10-30
**Spec:** `.specs/features/fase-4a-cenarios-acesso/spec.md`
**Diff:** `055a124..adcda6e`
**Revisor:** independente do autor; a seleção efetiva do modelo não é exposta.
**Verdict:** PASS — escopo local e preparação para UAT; UAT humano permanece aberto.

## Escopo e tarefas

O diff contém a especificação e alterações no teste integrado; não altera o runtime. Não existe `tasks.md` nesta feature: o plano e os comandos de gate estão na especificação. O primeiro passo está implementado e validado localmente. O segundo está parcialmente preparado: em A, produto e venda de R$ 25 estão confirmados; rascunho de R$ 25, parcela de R$ 10 e saldo de R$ 15 continuam locais. B, recuperação real e confirmação humana ainda não foram concluídos.

## Critérios e evidência

| Critério | Evidência precisa | Resultado |
| --- | --- | --- |
| AC1: errado, cinco erros e expiração no limite retornam 401 sem sessão; antes do limite autentica e reuso retorna 401 | `apps/api/test/emailEntregaIntegracao.test.ts:126` exige 401 para erros; :127 compara sessões; :130 avança 600000/599999 ms; :131–133 exigem 401/200 e reuso 401. SMTP TCP e relógio injetado: :19 e :117–121. | PASS local |
| AC2: falha temporária e recriação preservam identidade, código, Message-ID e prazo; retentativa autentica uma vez | `apps/api/test/emailEntregaIntegracao.test.ts:160` exige uma retentativa; :162–165 recriam a API e exigem aceitação; :167–169 comparam IDs, hash, prazo, código e Message-ID; :171–172 exigem 200/401. | PASS local |
| AC2: falha permanente não registra sucesso | `apps/api/test/emailEntregaIntegracao.test.ts:145` exige `{aceitas: 0, falhas: 1, retentativas: 0}`; :147–148 exigem estado falho, motivo permanente, envelope nulo e ausência de nova aceitação. | PASS local |
| AC3: limite ocupado, consentimento, troca, revogação e finanças | `apps/api/test/emailEntregaIntegracao.test.ts:94–96` exigem 409 `limite_aparelhos`, sessões iguais e OTP não consumido; :100–104 exigem confirmação, sucesso e 401 de A; :106–112 verificam perfil, somente B ativo, revogação, reuso 401 e snapshot financeiro igual. | PASS local |
| AC3: recebimento e consentimento reais, restauração dos confirmados e preservação dos pendentes em A | Não há evidência de execução humana de B. Preparação de A informada no plano. | PENDENTE humano; não é PASS de UAT |

O teste confirma igualdade dos registros financeiros criados para o cenário local, não restauração de dados de uma instalação real. Recriar a instância da API não comprova reinicialização do sistema operacional. SMTP loopback não demonstra falha ou retentativa no Resend nem homologação Android.

## Gate e integridade

O gestor registrou execução em PostgreSQL de 128 casos distintos nos cinco arquivos do gate, sem skips: 80 casos em quatro arquivos e 48/48 da fila isoladamente. A execução conjunta falhou ao iniciar o worker da fila por falta de memória; portanto não foi um único run verde. Após recuperação do ambiente, a suíte SMTP foi 9/9 e tipos da API passaram, segundo a evidência do gestor. Regressão completa da API não foi aprovada: houve limitação anterior de memória. Não repeti o gate, respeitando o slot e a limitação de memória. No arquivo alterado havia dois casos antes e nove depois (+7); os asserts antigos foram preservados no diff.

## Sensor de discriminação

O runtime e os testes originais permaneceram intactos: mutações foram aplicadas somente em memória por plugin Vite `enforce: pre` em configuração temporária, com raiz absoluta da API, PostgreSQL exclusivo `pdv_test` e `maxWorkers: 1`. Cada mutação abaixo foi confirmada pelo marcador `MUTANTE_APLICADO` e produziu falha de asserção, não de compilação.

| Mutação | Resultado |
| --- | --- |
| `apps/api/src/servicos/codigoLogin.ts:29`: expiração `<=` para `<` | Detectada: cenário no limite recebeu 200 em vez de 401. |
| `apps/api/src/servicos/codigoLogin.ts:32`: desabilitar comparação do hash | Detectada: cenários de código errado receberam 200 em vez de 401. |
| `apps/api/src/servicos/codigoLogin.ts:15`: não marcar código como usado | Detectada: quatro asserções de reuso falharam. |
| `apps/api/src/rotas/recuperacao.ts:80`: não marcar aparelho antigo como revogado | Detectada: lista de aparelhos ativos contém dois em vez de somente B. |
| `apps/api/src/email/smtp.ts:51`: classificar resposta 5xx como temporária | Detectada: resumo indica retentativa em vez de falha permanente. |

Uma sexta mutação, limite de tentativas do OTP de 5 para 6, sobreviveu isoladamente (9/9). Não demonstra falha observável no cenário: o limitador independente `apps/api/src/servicos/limitesAuth.ts:12` também bloqueia após cinco falhas por email, antes da verificação do OTP. Registrar a redundância evita contar essa mutação como detecção. O primeiro processo de sensor foi interrompido ao imprimir Unicode no console, após confirmar aplicação e falha por asserção da mutação de expiração; a repetição confirmou a mesma falha. Os hashes SHA-256 dos arquivos de código OTP, recuperação e teste foram iguais antes e depois (`da0848ac…`, `48f983b0…`, `94f32751…`); o status tracked antes/depois manteve apenas a modificação preexistente de README, além deste relatório novo.

## Qualidade e limites

Mudanças são restritas ao teste e à spec, seguem o padrão existente e mapeiam os sete casos novos a AC1–3. Os dois casos anteriores continuam presentes. O teste verifica resultados e estados persistidos, não apenas chamadas. O plano da spec fornece a orientação de teste; não há `tasks.md` com gate adicional. O escopo do diff é de testes integrados, não uma alteração de domínio ou rotas; a avaliação não reivindica cobertura integral das rotas fora do escopo.

Incidente anterior: um revisor usou remoção de worktree com junction de `node_modules`, atravessando workspaces e apagando fontes e dependências/ambiente ignorados. Fontes foram restauradas ao HEAD, README preservado, dependências reinstaladas pelo gestor e configuração recuperada pelo usuário; o sensor anterior é inválido. O banco Docker permaneceu intacto. Esta revisão não criou worktree ou links e não alterou fontes, dependências ou ambiente real.

## Próximo passo

Restaurar os serviços de homologação quando o slot de testes for liberado e conduzir o checkpoint humano: recebimento do código autorizado, consentimento para revogar A, recuperação em B, conferência dos dados confirmados e preservação dos pendentes em A. Não marcar UAT ou AUTH-03 real como concluídos antes dessas observações.
