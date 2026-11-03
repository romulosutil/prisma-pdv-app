# R5 — Piloto completo, backup e suporte

**Implementação local e APK interno concluídos em 02/11/2026; homologação externa/física pendente.** Esta é a sexta entrega solicitada, correspondente à R5 do roadmap. R6 continua sendo a futura integração de pagamentos. Não há aceite humano registrado. Checkpoints incrementais: CPs 021–025 no [histórico](checkpoints-roadmap.md).

**Atualização de 03/11:** API R1–R5 e correção de hora real implantadas em homologação (`a987c31`), CI completo aprovado com PostgreSQL 17 (592 API, 556 mobile, 172 shared) e sete grupos de smoke HTTP financeiro aprovados. Backups locais anterior/schema R5 comprovados. **APK 0.1.7/versionCode 8 gerado e verificado para o teste do usuário**; Android físico, OTP externo novo, restauração R5, atendimento e aceite continuam pendentes. As evidências 0.1.6 e a API R0 descritas abaixo são históricas. [CP 034](checkpoints-roadmap.md#cp-20261103-034-apk-real-017-pronto-para-teste-no-celular).

## Candidato conectado 0.1.7

| Item | Evidência de 03/11/2026 |
|---|---|
| Artefato | `builds/pdv-homologacao-0.1.7.apk`, 74.689.899 bytes |
| Versão/pacote | 0.1.7/versionCode 8, `br.com.pdv.mobile.homologacao`, PDV Homologação |
| SHA256 APK | `5d9d543544c1b679ceb1de2c4234137e3bc061f297ba929898fa187d35df8429` |
| Android/assinatura | minSdk 24, targetSdk 36, ARM32/ARM64; APK v2 válida Android Debug, mesmo certificado interno de 0.1.6; não é assinatura de distribuição |
| Build | Gradle SUCCESS em 6m35s, 657 tarefas, daemon de compilação encerrado |
| API/CI | `a987c31c757891d911c7e201e97fbce60eaacc2c`, [workflow 41574379311](https://github.com/romulosutil/prisma-pdv-app/actions/runs/41574379311) PASS; fonte exclusiva de homologação, auto deploy false |
| Bundle exato do APK | 4.252.956 bytes, SHA256 `4a886e07c3131359a2c9a9a64cb0a4a8174ce2750d22b1e3cb98b7b85bed205c`, 1.882 fontes, gate PASS |
| Inventário | 291 fontes conferidos com o workspace por SHA256, zero divergências |
| Compatibilidade externa | Saúde/banco/hora precisa e rotas R5 PASS; sete grupos HTTP autenticados PASS, sem envio de e-mail |
| Aparelho/aceite | ADB sem aparelho autorizado; instalação, Android físico e aceite do usuário pendentes |

Scanner usa câmera/digitação reais. Backend demo, catálogo fictício/atraso, semente, captura/tokenização/gateway simulados, relógio de teste e diagnóstico de teste ficam fora do APK conectado conforme o gate. Mocks de testes e demo legada continuam separados; a API em produção recusa cobrança simulada e libera o acesso sem cartão. Novas datas financeiras seguem a referência precisa do servidor; eventos/filas anteriores não são reescritos.

Manifesto, assinatura, metadados, inventário, mapa e hash estão em `builds/pdv-homologacao-0.1.7-*`; manifesto vincula API/CI e mantém Android/aceite como pendentes. O [roteiro de um produto real](roteiro-piloto-android.md#primeiro-teste-do-usuário-com-um-produto-real) não substitui F01–F19. Esta entrega alterou somente homologação; a versão observada de produção mudou durante a sessão sem mutação de produção por esta tarefa, e foi preservada.

## Entrega construída

- Tela **Suporte e privacidade**, disponível antes do cadastro, durante reautenticação e bloqueio comercial. Políticas do piloto versionadas, privacidade, termos, exportação e pedido de análise de exclusão.
- Protocolos pessoais persistidos no servidor e limitados a dez abertos por vínculo, sem visibilidade pelo dono ou outros operadores. A equipe autorizada responde manualmente e a pessoa consulta a resposta no mesmo acesso/loja. Responsável/escala de atendimento ainda precisam ser designados.
- Solicitação durável por operador, inclusive donos, antes do HTTP; mantém UUID após resposta perdida/reinício. Falha de disco impede envio antes da persistência. Troca de perfil conserva a fila original e descarta respostas atrasadas na tela.
- Resumo técnico opcional e desligado por padrão: somente versão, ambiente, plataforma, contagens de pendências e última sincronização. Schema fechado rejeita campos extras. Mensagem livre exige revisão pelo usuário. Nenhum arquivo é compartilhado automaticamente.
- Exportação autenticada de dados confirmados e autorizados da loja selecionada, com filtro financeiro no servidor. Não inclui credenciais, sessões, códigos ou cartões. Pendências têm exportação separada no aparelho de origem. Nenhuma dessas exportações é backup restaurável. Arquivo temporário de suporte apagado após retorno do compartilhamento; encerramento forçado pode deixar cache até limpeza posterior.
- Pedido de exclusão abre análise e preserva dados/vínculos; equipe informa escopo, prazo e eventual retenção antes da execução autorizada. Não há exclusão automática do histórico comercial nem prova de aceite jurídico das políticas.
- Protocolos concluídos há mais de 90 dias são removidos no startup e diariamente com jobs ativos; consulta também limpa concluídos expirados do próprio perfil. Abertos/em análise preservados. Shutdown drena o job; logs de erro internos não imprimem SQL/params que possam carregar mensagem pessoal.
- Migração aditiva `0011_condemned_unus.sql`, contrato `packages/shared/src/suporte.ts`, rotas/retencão API, serviço durável/tela/rota mobile, particionamento pessoal e testes. Sem commit próprio, base local `bc786bc`; trabalhos anteriores preservados.

## APK 0.1.6 — evidência histórica

| Item | Evidência |
|---|---|
| Artefato | `builds/pdv-homologacao-0.1.6.apk` |
| Versão/pacote | 0.1.6 / versionCode 7 / `br.com.pdv.mobile.homologacao` |
| Tamanho | 74.688.295 bytes |
| SHA256 APK | `e6170b3b7e5fd2e40efdcff8d832fc5167baed3482c403bfadbeb9f757bcb2ff` |
| Assinatura | APK v2 válida, Android Debug; uso interno, sem assinatura de distribuição |
| Certificado SHA256 | `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` |
| Android | minSdk 24, targetSdk 36, ARM32/ARM64 |
| Build | Gradle SUCCESS em 6m45s, 657 tarefas; daemon encerrado |
| API embutida | `https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host` |
| Inventário de fontes | 291 arquivos copiados/conferidos por SHA256 em `pdv-homologacao-0.1.6-fontes.json` |
| Bundle do APK | 4.251.352 bytes; SHA256 `c067903946342ce792b09bf1c03ab4c56eefc26b33b98008747cd574cc2329a2` |
| Grafo do APK | 1.882 fontes no source map do build; gate PASS |

Build conectado exclui implementações de backend/semente/catálogo demo, tokenização/gateway simulados, captura de cartão de demonstração, diagnóstico de teste e relógio artificial. Não contém botões de zerar dados/simular scanner. Offsets de relógio legados não afetam o release. `scripts/verificar-release-mobile.mjs` valida host, recursos, strings e fontes do APK. `metro.config.js` é obrigatório; script de build copia/verifica fontes e mapa e recusa assinatura local de produção.

A cópia curta C:/p conserva lock anterior com seis dependências exclusivas de e-mail/API ausentes; todos os pacotes comuns mantêm versão/integridade iguais ao lock do workspace. Não houve atualização de dependências nesta entrega. APK 0.1.5 e demais artefatos anteriores foram preservados.

**Este APK aguarda API compatível e homologação física.** Seu manifesto registra `rotaSuportePresente=false`, Android e aceite pendentes. Não instalar como atualização comercial sobre a demo 0.1.4; preservar dados/assinatura/pacotes e seguir o roteiro físico.

## Validação local

| Evidência | Resultado |
|---|---|
| Regressão API, PGlite/HTTP/SMTP local | 45 arquivos / 531 testes aprovados |
| Regressão mobile, incluindo SQLite real | 62 arquivos / 546 testes aprovados |
| Shared | 17 arquivos / 172 testes aprovados |
| Revisão final de logs/API | 56 testes dirigidos aprovados, incluindo um novo caso de log sem SQL/params |
| Tela de suporte | Três testes adicionais aprovados: políticas sem sessão, resposta atrasada de outro perfil e exclusão sem diagnóstico/envio de arquivo automático |
| Ferramentas operacionais | Dois testes aprovados: snapshot incompleto/divergente/inválido recusado; simulador/fonte de diagnóstico recusados |
| Tipos, diff e sintaxe | Três workspaces, diff check, dois scripts PowerShell e quatro CLIs JS aprovados |

São 1.249 testes na regressão global e seis casos novos adicionais (1.255 casos distintos no conjunto); reexecuções dos mesmos casos não foram somadas. Logs/JSON completos ficam em `builds/r5-*`, ignorados pelo git. A execução restrita apresentou falhas de SMTP/HTTP e temporário; repetições com acesso local passaram sem relaxar TLS/autenticação. Fixtures de bootstrap passaram a aguardar o drain do novo job.

Casos de suporte comprovam replay concorrente, chave conservada após reinício/ACK perdido, disco cheio, limite de protocolos, acesso suspenso, isolamento de empresa/operador, diagnóstico estrito, exportação sem credenciais, resposta manual, exclusão sem apagar dados e retenção somente de concluídos. Testes/renderização não substituem SecureStore, compartilhamento ou Android físico.

## Dependências

Após autorização expressa do usuário, `npm audit` encontrou **15 avisos** na árvore global sem dev, incluindo ferramentas transitivas Expo. A análise do lock das 86 dependências de produção API/shared e das 1.882 fontes do APK não encontrou biblioteca com advisory direto alcançável nesses dois grafos. Avisos herdados por Expo/CLI não significam que as bibliotecas vulneráveis de build estejam embarcadas. Essa é uma análise de alcance, não uma auditoria global limpa.

O Zod embarcado/API é 4.6.7; o aviso se refere ao Zod 3 transitivo do CLI ([advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)). `node-forge` permanece na ferramenta de compilação, ausente do APK/API, e o advisory consultado não informa versão corrigida ([advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)). Não aplicar downgrade do SDK ou override incompatível apenas para zerar auditoria. Gradle, binários nativos e imagem base não foram auditados por essa análise; saneamento das ferramentas continua pendente. Evidências: `r5-audit-runtime.json`, `r5-audit-completo.json` e `r5-audit-alcance-apk.json`.

## Evidência externa e limites

Em 02/11/2026, 23h31, as duas APIs responderam `/saude` 200 e `/dev` 404. As rotas de suporte R5 retornaram **404**, portanto o verificador registra FAIL de compatibilidade. Homologação informa commit R0 `bc786bc86abac934754ee1dd35d8524f9c04c9c1`; produção informa `73fb42f0be54ba8a6a3649e614def16aee05955e`, observado sem implantação por esta tarefa. Nenhuma configuração/serviço remoto foi alterado.

Agendamentos locais seguem habilitados: produção `0 2 * * *`, homologação `15 2 * * *`, retenção de sete cópias e caminhos separados. PostgreSQL sem portas públicas; restauração R0 desativada, volume preservado. Consulta de configuração não comprova última execução nem retenção efetiva. [Restauração R0](r0-restauracao-backup.md) continua válida para seu schema/data e não foi promovida a restauração R5.

ADB consultado fora do sandbox retornou **zero aparelhos** em 23h27. Nenhum Android físico, SecureStore nativo, atualização, compartilhamento ou ciclo financeiro físico foi homologado. Não houve PostgreSQL independente, restauração R5, CI remoto novo ou teste de retorno externo nesta entrega.

## Operação preparada e próximo passo

[Procedimento de backup/suporte/incidente](operacao-backup-suporte.md) e [matriz física F01–F19](roteiro-piloto-android.md). Scripts `verificar-operacao.{mjs,sql}`, `verificar-restauracao-r5.sql`, `comparar-restauracao.mjs` e `coletar-piloto-android.ps1` deixam explícito o que comprovam. Inventário físico não instala APK nem conclui cenários. SQL R5 e snapshots atuais ainda exigem execução em PostgreSQL independente.

Próximo passo: implantar R1–R5 em homologação com backup preservado, executar regressão dedicada PostgreSQL/CI e nova restauração isolada; disponibilizar pelo menos dois celulares e instalação substituta, designar responsável pelo atendimento e executar o APK exato conforme F01–F19. Registrar resultados externos/físicos e aceite humano separadamente. Cópia externa de backup e alertas seguem no backlog autorizado e não bloqueiam o MVP.
