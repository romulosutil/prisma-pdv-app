# Fase 4A — Falhas e recuperação de acesso

## Problem Statement
O usuário aprovou recebimento/login reais no Resend e autorizou validar erro, expiração, reutilização, retomada de envio e recuperação em nova instalação. As camadas têm testes anteriores, mas precisamos confrontar os cenários com o caminho SMTP e preparar checkpoint de recuperação preservando dados.

## Out of Scope
Sem produção, push, VPS, cobrança real, novos usuários, leitura de segredo/OTP do usuário ou declaração de Android homologado. Não alterar validade, limites ou políticas para facilitar testes. SMTP local e relógio controlado são evidências locais declaradas, não entrega/falha reais no Resend. Não apagar bancos/volumes ou dados da demo.

## Assumptions & Open Questions
| Assumption | Chosen default | Rationale |
|---|---|---|
| Testes | Completar cenários no teste integrado SMTP existente, PostgreSQL local pdv_test com relógio controlado | Exercitar fronteiras sem alterar relógio/conta vivos |
| Destinatário externo | Gmail já autorizado na conversa, somente código da recuperação | Autorização persiste para o fluxo aprovado |
| Instalações UAT | localhost:8088=A; [::1]:8088=B, origens e armazenamento separados | Metro localhost escutaIPv6::1; reusar Metro/API3339 sem limpar A nem expor na rede |
| Dados | Produto e venda confirmados por sync; rascunho com parcela em A deve permanecer local | Não prometer restauração do que nunca foi enviado |
| Recuperação | Usuário digita código e confirma qual aparelho revogar | OTP não é coletado no chat; consentimento explícito existente |
Open questions: none para testes e preparação. UAT depende do usuário receber/digitar código e confirmar substituição; não presumir sucesso.

## User Stories
Como operador, quero que códigos inválidos não abram sessão, envios retomem sem trocar código/prazo e uma substituição autorizada preserve os dados e revogue a instalação antiga no servidor.

Acceptance Criteria:
1. WHEN código recebido no SMTP é errado, usado, expirado no limite de dez minutos ou bloqueado após cinco erros, a API SHALL responder401 sem criar sessão. WHEN código válido é usado antes do limite, a API SHALL autenticar e seu reuso SHALL responder401. Testes SHALL usar SMTP TCP e PostgreSQL locais, com tempo controlado declarado.
2. WHEN envio falha temporariamente e a API/processamento são recriados, a fila SHALL conservar ID, código, Message-ID e prazo; retentativa SHALL aceitar a mesma entrega e permitir autenticação uma vez. Falha permanente SHALL encerrar sem sucesso fictício. Testes SHALL não acessar o Resend nem alterar o ambiente interativo.
3. WHEN nova instalação usa o código recebido e o limite de um aparelho está ocupado, login SHALL responder409 limite_aparelhos sem consumir o OTP; recuperação SHALL exigir confirmação, autenticar B, revogar A e preservar finanças. Reuso do OTP SHALL responder401. Checkpoint humano SHALL provar separadamente recebimento e consentimento reais, restauração dos confirmados e preservação dos pendentes em A; pendências SHALL ficar explicitamente abertas até verificação.

## Execution Plan
1. Completar e validar testes de AC1–3 em apps/api/test/emailEntregaIntegracao.test.ts, sem alterar runtime ou testes antigos; revisão nova com evidências/sensor. Gate: API alvo SMTP+emissão+recuperação+conta em PostgreSQL local, maxWorkers1, tiposAPI. Commit test(auth): verify SMTP code failure and recovery scenarios.
2. Preparar checkpoint em A/B, enviar somente código autorizado, atualizar docs/roteiro-recuperacao-aparelho.md, docs/operacao-email-resend.md, docs/fases-e-checkpoints.md, docs/plano-implementacao-producao.md e STATE com distinção local/externo/Android. Parar para o usuário concluir o UAT. Commit docs(checkpoint): prepare real email device recovery validation.

## Requirement Traceability
| ID | Critérios | Estado |
|---|---|---|
| AUTH-01 | AC1 | Teste SMTP local/PG PASS, revisão pendente |
| AUTH-02 | AC2 | Teste SMTP local/PG PASS, revisão pendente |
| AUTH-03 | AC3 | Backend SMTP local/PG PASS, UAT preparado ainda não concluído |

## Evidências do gestor
| Critério | Asserção no teste integrado | Resultado esperado |
|---|---|---|
| AC1 erro/bloqueio | emailEntregaIntegracao.test.ts:126 `statusCode).toBe(401)`; :127 igualdade das sessões | Código errado e cinco erros não criam sessão |
| AC1 prazo/reuso | :130 avança599999/600000ms; :131 compara200/401; :133 reuso401 | Antes do limite aceita; no limite recusa; uso único |
| AC2 recusa | :145 `{aceitas:0,falhas:1,retentativas:0}`; :147 estadofalhou/permanente/envelopenull | Sem sucesso fictício ou material retido |
| AC2 retomada | :160 retentativas1; :165 aceitas1; :167–169 igualdade deID/código/prazo/Message-ID; :171–172 login200/reuso401 | Recriar instância não renova nem troca a entrega |
| AC3 | :94 limite409; :96 usadoEmnull; :100 consentimento400; :104 origem401; :106 perfilreal; :108 sóBativo; :109 Arevogado; :112 snapshotfinanceiroigual | Substituição explícita, única e finanças preservadas |
Todos os sete casos novos mapeiam AC1–3; dois casos anteriores e seus asserts preservados. SMTP é TCP loopback; tempo é controlado. Não usar estes testes como evidência de falha/retentativa no Resend.

Execução: alvo SMTP9/9PASS, tiposAPI PASS. Gate dos cinco arquivos no PostgreSQL teve80casosPASS/4arquivos e falhou ao iniciar worker da fila porOOM; emailFilaCodigo48/48PASS em execução isolada após pausar somente serviços locais deste projeto. Todos128casos dos cinco arquivos tiveram execução aprovada, semskip ou alteração de asserções antigas. API3339/Metro8088 e demo3338/8087 temporariamente pausados; restaurar homologação antes do checkpoint. Não repetir regressão completa já limitada por memória.

Passo1 implementado e aprovado na revisão independente segura: cinco falhas comportamentais detectadas em memória, sem mutação de arquivos-fonte; validate_state PASS para escopo local/preparoUAT. Primeiro sensor descartado por incidente documentado em incidente-revisao.md. Dependências recompostas pelo lockfile, configuração recuperada pelo usuário sem revelar valores, SMTP9/9 e tipos de todos os workspaces aprovados após recuperação.

Passo2/preparo concluído: A tem produto/venda25 confirmados (fila0 e SQL), caixa aberto e rascunho25 com parcela10/saldo15 reaberto após reinício. B é origem independente [::1]:8088. UAT humano de receberOTP, consentir e concluir recuperação/restauração permanece aberto. Os critérios globais não foram marcados; tempo controlado/SMTP local não são prova de falha real do Resend ou Android.

Após os gates, surgiram mudanças paralelas de cupons no mobile, fora deste diff e de seus testes. Elas foram preservadas sem stage/reversão; os gates registrados não validam esse trabalho concorrente posterior.
