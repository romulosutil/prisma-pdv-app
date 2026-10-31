# Checkpoint Android local

## Problem Statement

Preparar um APK Android instalável para o usuário testar o PDV offline e registrar a situação real da recuperação. Autorizado em 30/10/2026: executar etapas 1 e 2 e parar no checkpoint do APK.

## Escopo

Preservar Expo/React Native, SQLite, SecureStore e contratos existentes. Sem publicação, push, deploy, cobrança real ou integração de gateway. Não editar os arquivos paralelos de VPS, assinatura ou README.

## Assumptions & Open Questions

| Item | Decisão | Evidência/limite |
| --- | --- | --- |
| Recuperação anterior | Não presumir aceite | Contêiner pdv-fase3-pg e abas não existem nesta retomada; sem metadados para comprovar UAT anterior. |
| API no celular | APK inicial local/offline | Usuário confirmou que a API HTTPS ainda não foi disponibilizada no EasyPanel; não comprova nuvem/e-mail. |
| Identidade | Aplicativo de homologação separado | Evitar substituir ou apagar uma instalação anterior do usuário; pacote próprio e chave local de teste. |
| Ferramentas | Instalar JDK/SDK oficiais em diretório local | Não alterar PATH global; builds e caches não entram no Git. |
| Seleção de agentes | Solicitar Terra Médio | Ferramenta retorna nome da tarefa, não confirma modelo efetivo. |

Open questions: none. API indisponível registrada como dependência da próxima build conectada; resultados físicos serão coletados no checkpoint autorizado.

## User Stories

Como responsável pelo PDV, quero instalar uma versão identificável no celular para verificar durabilidade offline antes de liberar a aplicação.

### Acceptance Criteria

1. WHEN os testes direcionados de recuperação executam, o sistema SHALL provar substituição consentida, revogação da sessão anterior e preservação de dados nas fronteiras cobertas, registrando separadamente o UAT externo pendente.
2. WHEN o APK de homologação é gerado, o artefato SHALL conter bundle JS, SQLite, SecureStore e câmera, usar pacote separado e não exigir Metro para iniciar.
3. WHEN o APK é entregue, o relatório SHALL registrar SHA256, certificado público de assinatura, pacote, versão, origem do código, modo/backend e comandos de build e inspeção efetivamente executados.
4. WHEN o usuário inicia o checkpoint, o roteiro SHALL cobrir venda25/parcela10/saldo15, interrupção, conclusão única, caixa, scanner e atualização sem apagar dados; os resultados físicos SHALL permanecer pendentes até observação.

## Passos atômicos

1. Verificar recuperação local e registrar bloqueio do checkpoint antigo → apps/api/test/recuperacaoAparelho.test.ts, apps/mobile/test/recuperacaoApiIntegracao.test.ts e docs/roteiro-recuperacao-aparelho.md → tornar fixture de limite1 explícita após oferta padrão Pro10, preservar asserções e rodar gate direcionado, sem substituir prova externa.
2. Preparar configuração e ferramenta de APK de homologação → apps/mobile/app.config.ts, apps/mobile/scripts/build-apk-local.py, apps/mobile/scripts/test_build_apk_local.py, apps/mobile/test/configuracaoApk.test.ts, .gitignore, este spec → configuração validada e APK compilado/inspecionado.
3. Revisão independente e entrega → validation.md, docs/checkpoint-apk.md, docs/fases-e-checkpoints.md e STATE seção de retomada → relatório de revisão e checklist com pendências explícitas.

## Out of Scope

VPS/backup, Mercado Pago, distribuição pública, Play Store e alteração de oferta comercial. Testes simulados não concluem integração real. Instalação, câmera, SQLite/cofre físicos e atualização precisam do celular.

## Requirement Traceability

| Critério | Verificação |
| --- | --- |
| APK-01 | AC1: testes existentes de recuperação e registro de bloqueio externo |
| APK-02 | AC2–3: build/inspeção do APK e revisão independente |
| APK-03 | AC4: roteiro do checkpoint; resultados físicos pendentes |

## Estado

- Recuperação automatizada: 33/33 API PGlite e 56/56 mobile; revisão independente PASS com sensor de revogação, em revisao-recuperacao.md. Asserções preservadas.
- Recuperação externa anterior: não comprovada.
- APK: preparação em andamento.
- Homologação física: pendente, checkpoint final desta entrega.
