# Checkpoints do roadmap do PDV

Registro obrigatório a cada avanço coerente, inclusive parcial. O [roadmap](roadmap-app-completo.md) acompanha as tarefas; este histórico registra o que foi entregue e a evidência correspondente. Os [checkpoints anteriores](fases-e-checkpoints.md) e os relatórios de cada etapa permanecem preservados.

Cada novo checkpoint deve conter identificador único, data em America/Sao_Paulo, etapa, estado, resultado construído, arquivos/artefato/versão/commit quando disponíveis, validações executadas e resultados, limitações e próximo passo. Anexar novos registros ao final, sem sobrescrever o histórico. Uma aprovação humana só é registrada quando o usuário a conceder.

## CP 20261101 001 Regra de acompanhamento

- **Data:** 01/11/2026, America/Sao_Paulo.
- **Etapa:** acompanhamento de R0 a R7.
- **Estado:** regra de acompanhamento construída e validada documentalmente.
- **Construído:** instruções persistentes em `AGENTS.md`, histórico de checkpoints e obrigação de atualizar o roadmap a cada entrega ou avanço parcial.
- **Arquivos:** `AGENTS.md`, `docs/checkpoints-roadmap.md`, `docs/roadmap-app-completo.md` e `docs/plano-implementacao-producao.md`.
- **Versão/commit:** alterações documentais no checkout, ainda sem commit próprio.
- **Validações:** `git diff --check` aprovado; referências locais do histórico, roadmap e plano de produção conferidas, sem links ausentes. Instruções do `AGENTS.md` relidas e conferidas. Alteração documental, sem necessidade de testes de aplicação.
- **Estado funcional preservado:** R0 continua em homologação conforme o [relatório próprio](r0-api-apk-conectado.md). O APK conectado 0.1.5 e as evidências HTTP já estão registrados nesse relatório; este checkpoint não conclui R0.
- **Pendências:** homologação física Android, restauração do backup e demais cenários/limites externos descritos em R0.
- **Próximo passo:** seguir as pendências de R0 no escopo autorizado e registrar o próximo avanço antes de encerrar a entrega ou iniciar outro lote.

<a id="cp-20261101-002-restauracao-real-do-backup-r0"></a>

## CP 20261101 002 Restauração real do backup R0

- **Data:** 01/11/2026, 21h40, America/Sao_Paulo.
- **Etapa:** R0 — backup e recuperação do servidor.
- **Estado:** teste de restauração construído e validado externamente; subentrega concluída. R0 permanece em homologação. Não há novo aceite humano registrado.
- **Construído:** backup real do PostgreSQL de homologação, restauração em serviço novo e previamente vazio e roteiro SQL reutilizável para conferir todas as tabelas, estrutura, sequências, valores e integridade. Destino `aladdin/pdv-postgres-restauracao-r0` desativado ao final, sem porta pública e com volume preservado.
- **Arquivo restaurado:** `aladdin/pdv-postgres-homologacao/2026-11-02T00:34:21.633Z.sql.gz`, 11,2 kB, Local Disk; backup e restauração com logs de sucesso no EasyPanel. Produção não foi sobrescrita.
- **Arquivos/artefatos:** `scripts/verificar-restauracao.sql`, [relatório da restauração](r0-restauracao-backup.md), [relatório de R0](r0-api-apk-conectado.md), roadmap e documentação de deploy. Evidências locais ignoradas em `builds/r0-backup-{origem,destino-vazio,restaurado,restauracao-log}.png` e `builds/r0-backup-restauracao.json`.
- **Versão/commit:** API `bc786bc86abac934754ee1dd35d8524f9c04c9c1`; APK 0.1.5/versionCode 6 preservado. Roteiro e documentação no checkout, sem novo commit.
- **Validações externas:** destino inicialmente com zero tabelas; após restauração, 24 tabelas, 38 registros e oito migrações iguais à origem; checksum consolidado `c44d5eac7b0bfb6ce4b6317d5cb21e25`. Colunas, índices, restrições e três sequências iguais. Produto, caixa, venda de R$ 7,00 e IDs/autoria preservados. Zero divergências de caixa, itens, pagamentos e restrições não validadas. Produção e homologação continuaram com `/saude` 200.
- **Validação local:** revisão do roteiro SQL efetivamente executado, evidências e referências documentais; `git diff --check` aprovado. Não houve mudança no runtime do app nem necessidade de reconstruir o APK.
- **Limitações/pendências:** backup ainda somente na VPS; cópia externa, alertas e Android físico não foram concluídos. O teste não recupera pendências exclusivas de aparelho perdido nem comprova retenção por sete dias.
- **Próximo passo:** homologar o APK exato no Android e concluir cópia externa/alertas no escopo autorizado. O [CP 001](#cp-20261101-001-regra-de-acompanhamento) permanece como histórico; sua pendência de restauração foi atendida por este checkpoint.

## CP 20261101 003 Foco no MVP e backlog operacional

- **Data:** 01/11/2026, 21h58, America/Sao_Paulo.
- **Etapa:** R0 — revisão de escopo operacional do MVP.
- **Estado:** repriorização explicitamente decidida pelo usuário e registrada; cópia externa e alertas adiados, sem implementação nesta rodada.
- **Decisão:** após pedir a configuração, o usuário orientou focar no MVP e deixar o backup externo para depois da validação do produto. Em esclarecimento, confirmou o mesmo adiamento para os alertas de indisponibilidade da API. Esses itens deixam de bloquear o MVP e permanecem abertos no [backlog do roadmap](roadmap-app-completo.md#backlog-apos-validacao-do-produto).
- **Construído:** backlog separado, retirada desses bloqueios da lista ativa de R0, relatórios alinhados com a decisão e regra persistente de nomes `pdv-` para serviços do PDV. Serviços de outros produtos permanecem fora dessa regra.
- **Arquivos:** `AGENTS.md`, `docs/roadmap-app-completo.md`, `docs/checkpoints-roadmap.md`, `docs/r0-api-apk-conectado.md`, `docs/r0-restauracao-backup.md` e `docs/deploy-easypanel.md`.
- **Inspeção externa:** EasyPanel retornou apenas o provedor Local Disk e nenhum canal de notificações. Não houve criação de serviço, destino, agendamento ou canal; nenhum alerta foi enviado. Os serviços existentes do PDV já têm prefixo `pdv-`.
- **Versão/commit:** APK 0.1.5/versionCode 6 e API `bc786bc86abac934754ee1dd35d8524f9c04c9c1` preservados; alterações documentais no checkout, sem novo commit.
- **Validações:** coerência entre roadmap, evidências de R0 e decisão do usuário; links locais e `git diff --check` aprovados. Sem mudanças no runtime, sem reconstrução de APK e sem testes de aplicação adicionais.
- **Preservado:** backups locais, healthchecks e teste de restauração aprovado no [CP 002](#cp-20261101-002-restauracao-real-do-backup-r0). O adiamento não excluiu recursos ou dados e não transforma os itens do backlog em entregas concluídas.
- **Limitações/pendências:** cópia fora da VPS e alertas continuam não implementados. R0 ainda exige homologação física Android e as verificações funcionais descritas no relatório; esta decisão não as conclui.
- **Próximo passo:** validar o APK conectado no Android e avançar nas funcionalidades do MVP; retomar a frente operacional após validar o produto e escolher destino/contato.

<a id="cp-20261101-004-base-de-identidade-e-equipe-r1"></a>

## CP 20261101 004 Base de identidade e equipe R1

- **Data:** 01/11/2026, 22h12, America/Sao_Paulo.
- **Etapa:** R1, segunda entrega funcional solicitada pelo usuário (vários usuários, convites e papéis).
- **Estado:** avanço parcial construído e validado inicialmente em ambiente local; regressão e integração mobile em andamento. Sem validação externa, Android físico ou aceite humano.
- **Construído:** identidade `usuarios`, operador como vínculo com empresa/loja, papéis dono/gerente/operador, política explícita de permissões; convites de sete dias, aceite por código pessoal, seleção entre vínculos, suspensão/desligamento e revogação de sessões em mudanças de acesso. Administração da equipe permanece exclusiva do dono. Convites não enviam mensagens externas automaticamente; o destinatário solicita seu código no login.
- **Isolamento:** push autorizado por operação e autoria; pull filtra registros financeiros na consulta SQL antes da paginação; gerente confere somente sua loja. Dados de cartão/cupom da assinatura não são entregues a funcionários. OTP e fila de e-mail passam a identificar o destinatário pessoal, conservando os limites e o uso único.
- **Arquivos:** `packages/shared/src/equipe.ts`, contrato compartilhado, schema/serviços/rotas da API, migração `0008_mute_maddog.sql` e metadados Drizzle; testes `equipe.test.ts` e `migracaoEquipe.test.ts`. Alterações sem commit próprio; artefatos anteriores preservados.
- **Validações iniciais:** tipos da API aprovados; cinco testes novos de equipe aprovados no último lote dedicado; teste de migração aprovado, comparando caixas/vendas antes/depois, identidade do dono e revogação de sessão legada sem identidade. Regressão completa em execução: fixtures/regras anteriores exigiram ajustes para a nova identidade e para venda por operador; problemas de rede SMTP e teste persistente também estão sendo investigados.
- **Limitações/pendências:** app ainda usa o fluxo de sessão única nesta fronteira; concluir telas, perfis protegidos, partições locais e validação integrada. Intervenções em caixas de terceiros, reserva de turno e movimentos completos pertencem a R2; nova permissão não implementa essas operações. Não marcar R1 completa nem publicar APK com base somente nesta evidência.
- **Próximo passo:** integrar equipe/seleção de vínculos no mobile, preservar pendências por perfil e concluir regressão, corrigindo os resultados encontrados.

<a id="cp-20261101-005-equipe-e-perfis-no-mobile-r1"></a>

## CP 20261101 005 Equipe e perfis no mobile R1

- **Data:** 01/11/2026, 22h23, America/Sao_Paulo.
- **Etapa:** R1 — continuação do [CP 004](#cp-20261101-004-base-de-identidade-e-equipe-r1).
- **Estado:** avanço parcial construído e validado localmente; revisão final/regressão em andamento. Sem implantação externa, novo APK, Android físico ou aprovação humana.
- **Construído:** telas de equipe com convite, suspensão, desligamento, retomada, papel e permissões; login lista empresas/lojas comprovadas por OTP e exige aceite explícito do convite. Tela de usuários alterna perfis autorizados com revalidação HTTP. Perfis pausados têm credencial em cofre separado; a credencial ativa não fica duplicada entre o perfil e a sessão atual.
- **Persistência:** rascunhos/parcelas, caixas, vendas, filas/cursor e preferências separados por perfil no SQLite e no navegador; dono conserva a partição legada. Chave Pix e cache de catálogo usam o escopo da loja. O catálogo de produtos é compartilhado no servidor, com cache por perfil. IDs reais permanecem no contrato; chaves locais de partição não mudam a autoria. Alternância bloqueada com cobrança parcial em andamento; rascunho sem recebimentos e outbox permanecem duráveis ao pausar um perfil novo.
- **Arquivos:** `apps/mobile/app/ajustes/{equipe,usuarios}.tsx`, login, ajustes, guarda de navegação; `dados.ts`, armazenamento de sessão/perfis/partições, adapters SQLite/navegador, repositórios e cliente HTTP. Teste `equipeApiIntegracao.test.ts`. Sem commit próprio; alterações anteriores preservadas.
- **Validações locais:** dois cenários integrados novos aprovados com API Fastify, PostgreSQL embarcado, SQLite real e cofre de teste: dois operadores, venda, rascunho, outbox, reinício, consulta pelo dono, suspensão, bloqueio de alternância durante cobrança e logout. Regressão de acesso/recuperação mobile: 31 aprovados; API de gratuidade/rotas protegidas/recuperação: 68 aprovados. SMTP e persistência: 57 aprovados fora do sandbox após falhas por restrições do ambiente; sincronização HTTP real: cinco aprovados fora do sandbox. Tipos dos três workspaces aprovados antes do último lote de testes novos; repetir ao final.
- **Correções em relação ao CP 004:** resposta idempotente da recuperação inclui a mesma identidade/política da primeira confirmação; fixtures de limpeza incluem `usuarios`; testes de autorização distinguem permissão de catálogo da administração exclusiva do dono. Não há relaxamento da autenticação para fazer os testes passarem.
- **Limitações/pendências:** alternância offline ainda não está habilitada; homologar PostgreSQL independente, SMTP externo e Android físico. Revisar saída offline e completar regressão/contratos antes de concluir a entrega local. Reserva/intervenção em turno e movimentos completos continuam em R2.
- **Próximo passo:** concluir revisão de permissões e revogações, testes de contrato/interface e regressão final; registrar o resultado e o roteiro de homologação.

<a id="cp-20261101-006-revogacao-e-validacao-de-perfis-r1"></a>

## CP 20261101 006 Revogação e validação de perfis R1

- **Data:** 01/11/2026, 22h31, America/Sao_Paulo.
- **Etapa:** R1 — revisão do [CP 005](#cp-20261101-005-equipe-e-perfis-no-mobile-r1).
- **Estado:** implementação local ampliada e validada por cenários; regressão final pendente. Sem implantação, APK novo, validação externa ou aprovação humana.
- **Correções construídas:** o aparelho é compartilhado pelos perfis na mesma instalação/loja, enquanto o operador mantém a autoria e a partição financeira. Logout bloqueia o uso local antes da chamada HTTP; sem rede, uma fila protegida no cofre retém a credencial exclusivamente para tentar a revogação, sem disponibilizá-la para retomar perfil ou sincronizar negócio. A fila é repetida ao abrir/retomar o app. Limpeza do cofre inclui perfis pausados e referências pendentes mesmo com falha de exclusão.
- **Autorização:** retomada de vínculo suspenso revalida o limite vigente do plano; login/recuperação reavaliam a expiração do OTP após esperar a trava da empresa. Permissões negadas têm mensagens próprias no mobile. Convites pendentes podem ser renovados. Gerente consulta a loja permitida e pode cancelar venda com autoria explícita; não movimenta caixa alheio usando o contrato atual.
- **Arquivos:** serviços/rotas de autenticação e equipe; `dados.ts`, instalação, cliente HTTP, cofre, navegação/telas; testes `equipe.test.ts` (API e shared), `equipeApiIntegracao.test.ts`, `equipeTela.test.ts`, `sessaoSegura.test.ts`. Sem commit próprio.
- **Validações:** oito testes de equipe da API aprovados, incluindo duas lojas da mesma empresa, duas empresas, autoria no cancelamento, sangria protegida e OTP de funcionários sem cancelamento cruzado pelo dono. Quatro cenários de integração mobile aprovados: SQLite/cofre, navegador, suspensão/cobrança e logout offline/reconexão. Dois testes da tela de login aprovados: escolha de vínculo e consentimento explícito, inclusive convite único. Shared: 169 aprovados. Cofre e integração SQLite anteriores aprovados; repetir a suíte final após os últimos ajustes.
- **Limitações:** cofre nativo está representado por adapter de teste; não equivale a teste SecureStore em Android físico. Navegador continua sendo ambiente de desenvolvimento e usa o adapter web existente. Revogação remota exige conexão; enquanto offline, bloqueio local é imediato, mas a confirmação do servidor fica pendente e explícita. A política de alternar perfis offline permanece em R3.
- **Próximo passo:** executar tipos e regressão final sem a restrição de rede dos testes locais; produzir relatório de R1 e roteiro de homologação externa/Android.

<a id="cp-20261101-007-entrega-local-de-r1"></a>

## CP 20261101 007 Entrega local de R1

- **Data:** 01/11/2026, 22h40, America/Sao_Paulo.
- **Etapa:** R1 — segunda entrega funcional do roadmap; continuação dos [CP 004](#cp-20261101-004-base-de-identidade-e-equipe-r1), [CP 005](#cp-20261101-005-equipe-e-perfis-no-mobile-r1) e [CP 006](#cp-20261101-006-revogacao-e-validacao-de-perfis-r1).
- **Estado:** implementação construída e validada localmente. Homologação externa e física pendentes; sem implantação, novo APK ou aceite humano.
- **Entregue:** identidade pessoal e múltiplos vínculos; migração do dono preservando IDs/histórico; convites com aceite por OTP; dono/gerente/operador e permissões configuráveis; suspensão/desligamento/retomada; telas de equipe, seleção de loja e usuários; perfis pausados protegidos e dados/filas separados; autorização por operação e filtro financeiro no servidor. Logout interrompe o uso local e repete revogação protegida ao reconectar. O aparelho é compartilhado pelos perfis da mesma instalação/loja. [Política, arquivos, evidências e roteiro](r1-equipe-permissoes.md).
- **Revisão final:** preservada a entrada de equipe para sessões legadas do dono que ainda não serializam papel, sempre com a guarda do servidor; emissão de novo OTP invalida também a recuperação da empresa própria quando o usuário tem vínculo em outra empresa. Nenhuma permissão é decidida somente pelo papel enviado pelo cliente.
- **Arquivos/versão:** contrato/política shared; schema, migração `0008_mute_maddog.sql`, metadados e autenticação/equipe/sync da API; telas, dados, cofre e adapters SQLite/navegador do mobile; testes e relatório de R1. Base `bc786bc`; alterações desta entrega sem commit próprio, preservando alterações de outros trabalhos. APK 0.1.5/versionCode 6 de R0 e os serviços remotos permanecem inalterados.
- **Validações locais:** tipos dos três workspaces aprovados. Suíte completa API: **39 arquivos, 506 testes aprovados**; mobile: **55 arquivos, 510 testes aprovados**; shared: **15 arquivos, 169 testes aprovados**. Total **1.185 testes**. Últimos ajustes: 56 testes API de equipe/recuperação/limites e 24 mobile de integração/interface/fluxo repetidos, todos aprovados. Migração compara caixas/vendas completos antes/depois; cenários de equipe incluem duas pessoas, duas empresas, múltiplas lojas, cancelamento com autoria, saídas protegidas, envio pessoal de códigos e ausência de mistura de filas/rascunhos.
- **Compilação:** export Android/Hermes aprovado, 1.900 módulos; bundle `builds/r1-bundle/_expo/static/js/android/entry-97b9affa85455a2dd5518399faf86384.hbc`, **5.062.470 bytes**, SHA256 `55f6c37ffe3ad8651d9b575bc6831dbe175ac912b97af3e55c36fdc41d8fb620`. Marcadores das novas telas, perfis, fila de logout e host de homologação conferidos. `builds/r1-export.log` e `builds/r1-validacao-local.json` guardam evidências locais ignoradas. O bundle não é APK nem evidência de execução em aparelho.
- **Restrições do ambiente:** falhas iniciais de SMTP/HTTP/persistência e gravação Hermes decorreram do sandbox; cenários afetados e compilação passaram fora dessa restrição. Não houve relaxamento de TLS ou autenticação para contorná-las.
- **Documentação:** tarefas de implementação de R1 marcadas no roadmap com limite explícito de validação local e dois itens de homologação abertos. Relatório e auditoria de autorização atualizados; checkpoints anteriores preservados. `git diff --check` aprovado; referências documentais conferidas ao encerrar.
- **Limitações/pendências:** PostgreSQL independente/concorrência externa, SMTP externo com funcionários e SecureStore/Android físico ainda não homologados. A migração ainda não foi aplicada aos serviços remotos e o APK existente não contém R1. Alternância offline, reserva de turno, retiradas completas, transferências e intervenção de gerente em caixa alheio permanecem em R2/R3 conforme o roadmap. Navegador mantém o adapter de desenvolvimento existente.
- **Próximo passo:** implantar R1 em homologação, gerar um APK conectado dessa versão e executar o roteiro com dono e dois usuários no Android. Registrar resultados externos, físicos e aceite humano separadamente antes de declarar R1 homologada.

<a id="cp-20261101-008-isolamento-do-diagnostico-e-validacao-final-r1"></a>

## CP 20261101 008 Isolamento do diagnóstico e validação final R1

- **Data:** 01/11/2026, 22h44, America/Sao_Paulo.
- **Etapa:** R1 — correção complementar ao [CP 007](#cp-20261101-007-entrega-local-de-r1).
- **Estado:** entrega construída e validada localmente; homologação externa/Android e aceite humano continuam pendentes.
- **Correção:** a conferência final encontrou que o diagnóstico de testes mantinha eventos globais no aparelho. Eventos novos recebem partição empresa/loja/operador; exportação, contagem e limpeza usam somente o perfil atual. Registros legados sem autoria permanecem armazenados, sem exportação atribuída. Limpar o diagnóstico de Bruno não apaga nem revela eventos de Ana. O código continua sem coleta quando ferramentas de teste estão desligadas.
- **Arquivos:** `apps/mobile/src/diagnostico/{registro,captura}.ts`, `apps/mobile/test/diagnostico.test.ts`, relatório de R1, roadmap e histórico. Alterações sem commit próprio, sobre base `bc786bc`.
- **Validações finais:** diagnóstico: 31 aprovados, incluindo cenário novo de dois perfis e legado. Suíte mobile completa repetida: **55 arquivos, 511 testes aprovados**. Tipos dos três workspaces aprovados. API **506** e shared **169** aprovados conforme CP 007, sem mudança nesses runtimes nesta correção; total final **1.186 testes**.
- **Bundle final:** Android/Hermes recompilado com sucesso; `builds/r1-bundle/_expo/static/js/android/entry-0433d1ebb09d22ecd404b7549ce58a54.hbc`, **5.063.403 bytes**, SHA256 `3367406b7c1923651ea0c9fb977c6da438ecd7b8373430fe5823d0e6054ca323`. Substitui o export local do CP 007. Evidência `builds/r1-validacao-local.json` atualizada, preservando os metadados do bundle anterior; marcadores de equipe, aceite, perfis, logout e host conferidos. Log em `builds/r1-export.log`.
- **Revisão documental:** roadmap e relatório atualizados com os totais finais; referências locais e `git diff --check` aprovados. O histórico anterior permanece intacto.
- **Limitações preservadas:** nenhum deploy, APK novo, Android físico, PostgreSQL independente ou SMTP externo de funcionários foi homologado nesta entrega. Diagnóstico é recurso da versão de testes; o export Hermes não comprova execução física. Não há aceite humano registrado.
- **Próximo passo:** implantar em homologação, gerar o APK conectado à API de R1 e seguir o [roteiro com dono e dois usuários](r1-equipe-permissoes.md#validação-e-próximos-ambientes).
<a id="cp-20261102-009-base-do-caixa-individual-r2"></a>

## CP 20261102 009 Base do caixa individual R2

- **Data:** 02/11/2026, 00h50, America/Sao_Paulo.
- **Etapa:** R2, terceira entrega funcional solicitada pelo usuário; continuação sobre R1 local do CP 008.
- **Estado:** avanço parcial construído; validação inicial local da API. Sem implantação externa, APK novo, Android físico ou aprovação humana.
- **Construído:** contrato v2 para movimentos com autor, responsável, aparelho, destino/categoria, aprovador e referências; retirada, devolução e correções como novos eventos; reserva online por operador/loja com lock e índice único; fechamento imutável e confirmação antes da próxima reserva; transferência atômica com autorização prévia do destinatário de cinco minutos; painel filtrado e conferência auditada; troca explícita de aparelho preservando a origem histórica.
- **Mobile em revisão:** seleção por operador, abertura conectada, fechamento offline, retirada, destinação final, telas de turnos/transferência/conferência e comandos online duráveis. A escrita local e a outbox financeira existentes foram reaproveitadas. Respostas perdidas conservam o identificador de comando por perfil.
- **Arquivos:** `packages/shared/src/{contrato,caixa}.ts`; `apps/api/src/rotas/caixa.ts`, schema, sync, migração `0009_demonic_magdalene.sql` e metadados; repositório/serviços/hooks e telas de caixa mobile; `apps/api/test/caixaUsuario.test.ts`. Alterações sem commit próprio; trabalhos anteriores preservados.
- **Validação inicial:** quatro cenários API aprovados (Ana R$ 250/Bruno R$ 100, reserva/reenvio, fechamento imutável, permissões/autoria, intervenção, transferência e troca de aparelho/conferência). Tipos API e shared aprovados no primeiro ciclo; mobile ainda exige regeneração dos tipos de rotas da nova tela e revisão final. Fixtures iniciais corrigidas para usar tokens próprios, sem compartilhar o token do dono.
- **Limitações/pendências:** concluir cenários SQLite/rede interrompida, migração histórica, regressão completa, tipos e bundle; revisar concorrência e comandos pendentes. Validação PostgreSQL independente e Android físico permanecem abertas. Turnos legados não ganham autoria adicional inventada; migração preserva totais. A compatibilidade com uploads legados será explicitada no relatório final.
- **Próximo passo:** concluir a validação integrada, corrigir os resultados encontrados e atualizar os itens do roadmap somente com evidência suficiente.

<a id="cp-20261102-010-integracao-e-revisao-do-caixa-r2"></a>

## CP 20261102 010 Integração e revisão do caixa R2

- **Data:** 02/11/2026, 07h29, America/Sao_Paulo, após retomada da conversa para a conferência solicitada.
- **Etapa:** R2 — revisão do CP 009; conferência solicitada pelo usuário antes de marcar as evoluções.
- **Estado:** implementação integrada em revisão final local. Sem deploy, APK novo, homologação externa/Android ou aprovação humana.
- **Avanços:** SQLite confirma venda/outbox e movimentos; fechamento offline fica pendente e vendas de mais de um lote são enviadas antes do fechamento. Comandos online retêm sua chave diante de resposta perdida e bloqueiam novas operações financeiras até a confirmação. Abertura também retém intenção por perfil; retomada explícita conserva o aparelho de origem. Tela de turnos permite intervenções, devolução, correção referenciada, transferência com consentimento e conferência com motivo. Resumo principal usa somente o operador atual; dono/gerente consultam o painel autorizado.
- **Correções da revisão:** cancelamento comercial conserva numerário até devolução; intervenções em caixa alheio usam exclusivamente a rota auditada; replay de fechamento compara eventos por ID, sem tratar ordenação de leitura como mudança financeira; uploads legados mantêm compatibilidade histórica sem poder criar outro turno ativo do mesmo responsável. Metadados novos ficam nulos no legado, sem inventar autoria.
- **Evidências locais nesta fronteira:** 31 testes API de origem/caixa/recursos aprovados antes da ampliação final; sete cenários integrados mobile aprovados na primeira rodada, incluindo perdas de resposta e mais de 100 vendas. Shared: 170 testes aprovados. Teste de migração R2 aprovado, preservando os registros anteriores e duas aberturas legadas já existentes. Tipos dos três workspaces e export Hermes passaram numa rodada intermediária; repetir ao final com os últimos ajustes e o host documentado.
- **Resultados ainda em revisão:** a primeira regressão global sofreu competição entre muitos workers e restrições de SMTP/HTTP do sandbox. Rodada limitada a dois workers executou API/mobile; falhas restantes identificaram fixtures antigas de abertura em outro aparelho, metadados novos e a expectativa antiga de cancelar dinheiro sem devolução. Fixtures e regras foram corrigidas; a regressão final está sendo repetida sem declarar conclusão antecipada.
- **Arquivos:** implementação do CP 009, `apps/mobile/src/telas/caixa/TurnosCaixa.tsx`, comandos em `dados.ts`, testes `caixaTelas.test.ts`, integração de equipe/sync e `migracaoCaixaUsuario.test.ts`. Sem commit próprio; alterações anteriores preservadas.
- **Limitações/pendências:** regressão final e bundle rastreável; homologar migração/concorrência em PostgreSQL independente, rede real e Android físico. Transferir aparelho pressupõe sincronização e interrupção do anterior, com confirmação explícita. Conflitos entre intervenção remota e fechamento offline ficam preservados como pendência, sem sobrescrever eventos; a recuperação ampla continua em R3.
- **Próximo passo:** consolidar resultados finais, atualizar o checklist R2 com os limites da validação e registrar o relatório/roteiro de homologação.

<a id="cp-20261102-011-entrega-local-e-conferencia-do-roadmap-r2"></a>

## CP 20261102 011 Entrega local e conferência do roadmap R2

- **Data:** 02/11/2026, 07h34, America/Sao_Paulo.
- **Etapa:** R2, terceira entrega funcional — conclusão local dos CPs 009 e 010, com conferência solicitada pelo usuário.
- **Estado:** implementação construída e validada localmente. Homologação externa, APK/Android físico e aceite humano pendentes. Não houve alteração nos serviços externos nem no APK 0.1.5 de R0.
- **Resultado conferido:** turno por operador/loja, origem e aparelho atual, reserva online exclusiva, entrada/sangria/retirada, autoria e autorização por operação, eventos imutáveis e correções referenciadas, fechamento offline pendente com destinação, transferências atômicas com consentimento dos dois responsáveis, visão autorizada/conferência e preservação do histórico legado. [Relatório, política, arquivos e limitações](r2-caixa-por-usuario.md).
- **Regressão final:** API **41 arquivos/514 testes**, mobile **56 arquivos/518 testes**, shared **16 arquivos/170 testes**, todos aprovados; total **1.202 testes**. Tipos dos três workspaces aprovados; mobile novamente aprovado após a última correção. Lote dedicado de interface/transporte: 12 aprovados. `git diff --check` aprovado. Evidências locais ignoradas: `builds/r2-api-tests.json`, `builds/r2-mobile-tests.json`, `builds/r2-validacao-local.json`.
- **Casos comprovados:** Ana R$ 250/Bruno R$ 100 com autoria separada; duas reservas concorrentes com apenas uma confirmada; índice único; transferência idempotente, expiração e rollback integral quando o crédito falha; intervenção e correção sem editar o original; leitura antiga sem apagar eventos; troca explícita e bloqueio do aparelho anterior; conferência sem alterar fechamento; migração com totais/IDs preservados e metadados desconhecidos nulos. SQLite/API comprovaram fechamento offline, bloqueio de nova reserva, reinício/resposta perdida, retenção da chave e envio de 103 vendas antes do fechamento.
- **Bundle Android/Hermes final:** 1.909 módulos; `builds/r2-bundle/_expo/static/js/android/entry-e21a15c48c972974544dbe2ff644af7c.hbc`, **5.120.460 bytes**, SHA256 `aec327087a0a95595b8d7020874f6f2110ce7ed994ba56b14101fafd7d743557`. Host `aladdin-pdv-api-homologacao.jicnzg.easypanel.host` e marcadores de turnos/retirada/comando pendente conferidos. Log `builds/r2-export.log`. Esta é evidência de compilação; não é APK nem execução física.
- **Arquivos/versão:** contrato e cálculo shared, schema/migração `0009_demonic_magdalene.sql`/metadados, rotas e sync API, repositório/serviços/hooks/telas e testes mobile/API/shared; roadmap e relatório R2. Base `bc786bc`, sem commit próprio e preservando o trabalho anterior.
- **Roadmap:** nove itens de implementação R2 marcados como construídos/validados localmente, com dois itens de homologação abertos. Resumo geral atualizado para R1/R2 locais e R3–R7 planejadas. R0 e demais etapas não foram indevidamente concluídas; histórico de checkpoints preservado.
- **Limitações explícitas:** PGlite/SQLite/HTTP local não substituem PostgreSQL independente, SMTP externo nem Android físico. O painel desconhece pendências de aparelhos offline até a conexão. Retomada pressupõe sincronizar e parar o aparelho anterior; conflitos de intervenção versus fechamento offline preservam registros e bloqueiam a próxima reserva, com resolução assistida ainda em R3. Compatibilidade v1 serve às pendências antigas; o app conectado atualizado reserva via v2. Não há aprovação humana registrada.
- **Próximo passo:** implantar R1/R2 em homologação com backup preservado, gerar APK conectado e executar o roteiro físico com dono e dois operadores, registrando resultados externos/físicos e aceite separadamente. A recuperação ampla continua em R3.


<a id="cp-20261102-012-autorizacao-offline-e-revalidacao-r3"></a>

## CP 20261102 012 Autorização offline e revalidação R3

- **Data:** 02/11/2026, 07h43, America/Sao_Paulo.
- **Etapa:** R3, quarta entrega funcional solicitada; continuação do CP 011.
- **Estado:** avanço parcial construído e validado inicialmente em ambiente local. Sem deploy, APK, Android físico ou aceite humano.
- **Construído:** autorização offline de sete dias por empresa/loja/operador/aparelho; retomada por falha de rede sem renovar o prazo; watermark durável para detectar retrocesso do relógio; revalidação de identidade/permissões antes do push; preservação de cobranças iniciadas; acesso às telas de alternância e sync quando um perfil requer reautenticação. Última sincronização completa não avança enquanto houver rejeições.
- **Arquivos:** `apps/mobile/src/dados/acessoOffline.ts`, `dados.ts`, `armazenamentoEscopo.ts`, `hooks.tsx`, `src/servicos/sincronizacao.ts` e `src/nucleo/fluxo.ts`. Alterações sem commit próprio; trabalho anterior preservado.
- **Validações:** tipos mobile aprovados; 12 testes integrados de equipe/sync aprovados, com SQLite real e API/PGlite. A rodada restrita falhou por acesso ao HTTP local; a mesma rodada com acesso a localhost passou. Sem alteração de TLS/autenticação.
- **Pendências:** ampliar cenários offline/relógio/revogação/concorrência, mostrar estado de cada perfil e conflitos, revisar isolamento de perfis de dono/legado, repetir regressão e bundle. Itens do checklist R3 ainda abertos. Validações externas/físicas não foram executadas.
- **Próximo passo:** concluir isolamento e interface de recuperação; executar cenários adversos e registrar a evidência final separando construção, testes locais e homologação.

<a id="cp-20261102-013-isolamento-e-cenarios-adversos-r3"></a>

## CP 20261102 013 Isolamento e cenários adversos R3

- **Data:** 02/11/2026, 07h51, America/Sao_Paulo.
- **Etapa:** R3, continuação do CP 012.
- **Estado:** implementação integrada, com validação dirigida local; regressão e compilação finais pendentes. Sem deploy/APK/Android físico ou aceite humano.
- **Construído:** resumo de sincronização e prazo offline por perfil ativo/pausado; entrada direta na alternância a partir da reautenticação; bloqueio de alternância/login durante confirmação; conflitos de fechamento explícitos e acesso ao histórico confirmado; redução de permissões remove caches financeiros alheios sem gerar deletes no servidor, mantém a outbox original e reinicia o cursor. Aumento de permissão também reinicia o pull. Exportação confere o contexto antes de retornar o arquivo.
- **Evidência local dirigida:** 27 testes aprovados em equipe/API+SQLite/navegador, motor de sync e autorização offline. Cenários novos: Ana/Bruno offline com reinício, reconexão inversa e ACK perdido; revogação do perfil ativo sem afetar o dono; vencimento em sete dias com recebimento parcial preservado; bloqueio durante push; intervenção remota versus fechamento offline; redução/promoção de gerente com cache limpo e pendência preservada; dois operadores/aparelhos e restauração em instalação adicional contendo somente o confirmado.
- **Correções encontradas nos testes:** invalidação pelo callback HTTP não pode deixar o motor preso em sincronização; mudança de papel revoga sessões e exige nova autenticação; limpeza de pai/filhos SQLite usa constraints diferidas dentro do mesmo commit; a comparação da última sincronização preserva o instante anterior em caso de rejeição, sem apagá-lo nem anunciá-lo como uma nova confirmação.
- **Arquivos:** `dados.ts`, `acessoOffline.ts`, adapters/contrato/aplicação de sync, `vendas.ts`, hooks, fluxo e telas de acesso/usuários/sync; testes `acessoOffline.test.ts` e `equipeApiIntegracao.test.ts`. Base `bc786bc`, sem commit próprio e com alterações anteriores preservadas. O modelo vigente permite um único dono, imutável pela administração de equipe; a partição legada do dono foi preservada, e os demais operadores têm partições próprias.
- **Limites:** a origem do aparelho perdido é desconhecida até que ele reconecte; o servidor não inventa pendências que não recebeu. Prazo e watermark locais detectam vencimento/retrocesso observado, mas não substituem relógio confiável em hardware. Turno em conflito continua bloqueado para conferência; não há aceite excepcional automático nem edição do fechamento original.
- **Próximo passo:** regressão completa/API/mobile/shared, tipos, bundle Android e relatório final com roteiro físico/external separado.

<a id="cp-20261102-014-revisao-da-regressao-e-responsividade-r3"></a>

## CP 20261102 014 Revisão da regressão e responsividade R3

- **Data:** 02/11/2026, 07h55, America/Sao_Paulo.
- **Etapa:** R3; revisão do CP 013 durante a regressão completa.
- **Estado:** correções locais concluídas, regressão final em preparação. Sem mudanças externas, APK, aparelho físico ou aceite humano.
- **Construído/corrigido:** revalidação HTTP aguarda a rede sem bloquear escritas offline do perfil ativo; somente a aplicação local dos resultados segura a fila de acesso. A alternância continua bloqueada durante a confirmação. Teste com resposta HTTP retida comprovou que o rascunho continua gravável e é preservado após a resposta.
- **Regressão inicial:** mobile 522/529 aprovados; sete falhas eram fixtures de autenticação anterior sem a nova autorização offline e expectativa antiga de enfileirar login durante commit. Fixtures agora indicam explicitamente a autorização simulada; a expectativa foi atualizada para recusar a alternância e permitir retry após o commit. Nenhuma exceção de produção foi criada para os testes. API 513/514 aprovados: um timeout de cinco segundos no teste de fila de e-mail durante execução concorrente, sem alteração no runtime da API nesta etapa; repetir isoladamente. Shared 170 aprovados; tipos dos três workspaces aprovados nessa rodada.
- **Validação dirigida posterior:** 82 testes em cinco arquivos mobile aprovados, incluindo as fixtures corrigidas, equipe/API/SQLite/navegador, recuperação, prazo offline e motor de sync. Teste adicional de roteamento permite consultar sync/alternar usuários quando um perfil requer reautenticação; sua regressão está na próxima rodada.
- **Arquivos:** `dados.ts`, testes de aparelhos/recuperação/equipe/fluxo, adapters e documentação do CP 013. Sem commit próprio, base `bc786bc`.
- **Limitações/pendências:** repetir regressão completa mobile e API com menor competição, conferir bundle/artefatos e relatório. Homologação em PostgreSQL independente e Android físico continua aberta.
- **Próximo passo:** consolidar a última regressão, marcar somente a implementação validada localmente e registrar a entrega com roteiro de homologação.

<a id="cp-20261102-015-entrega-local-de-sincronizacao-offline-e-recuperacao-r3"></a>

## CP 20261102 015 Entrega local de sincronização offline e recuperação R3

- **Data:** 02/11/2026, 08h01, America/Sao_Paulo.
- **Etapa:** R3, quarta entrega funcional — conclusão local dos CPs 012, 013 e 014.
- **Estado:** construída e validada localmente. Homologação externa, APK novo, Android físico e aprovação humana continuam pendentes. Nenhum serviço remoto foi alterado; o APK 0.1.5 de R0 foi preservado.
- **Entregue:** autorização offline de sete dias por empresa/loja/usuário/aparelho, retomada offline sem renovar prazo, bloqueio por vencimento/retrocesso observado do relógio, filas/rascunhos/turnos originais e sessões próprias, pausa durável, bloqueio de alternância durante confirmação/cobrança, revalidação de identidade/permissões antes do envio e invalidação isolada. Recebimento iniciado pode concluir sem autorizar novas operações. Revalidação lenta não bloqueia a escrita offline.
- **Recuperação e permissões:** redução de permissão financeira remove o cache alheio sem gerar delete remoto e preserva a outbox original; mudança de visibilidade reinicia o cursor para reaplicar a leitura autorizada. Resumo de pendentes/rejeitados/última sincronização/prazo por perfil, inclusive pausados, e caminho de alternância a partir da reautenticação. Conflito de fechamento explícito, exportação dos originais e encaminhamento à conferência/correção auditada; sem reabertura ou sobrescrita silenciosa. A data de sincronização completa não avança com rejeições.
- **Validação final local:** API **41 arquivos/514 testes**, mobile **57 arquivos/531 testes**, shared **16 arquivos/170 testes**, todos aprovados; **1.215 testes**. Tipos dos três workspaces aprovados. A primeira API concorrente teve um timeout na fila de e-mail; a regressão completa isolada passou sem alterar o runtime/teste da API. Mobile repetido após ajustes das fixtures e da responsividade. `git diff --check` aprovado.
- **Cenários comprovados:** Ana e Bruno alternam offline, reiniciam com filas/rascunhos preservados e reconectam em ordem inversa; ACK perdido repete o ID sem duplicar; revogação de um perfil preserva sua fila e não bloqueia os demais; vencimento durante parcela conserva recebimento; promoção/redução de gerente recompõe o cache autorizado; dois aparelhos de operadores diferentes e uma instalação adicional recuperam somente o confirmado, recebendo a pendência original somente se a origem reconectar. Regressões preservadas de 503 mudanças paginadas, venda antiga rejeitada, relógio divergente, transações/commit com falha e turnos imutáveis.
- **Compilação:** Android/Hermes, **1.910 módulos**; `builds/r3-bundle/_expo/static/js/android/entry-60c1bce1fcc88babc9ad0be1c719b365.hbc`, **5.141.844 bytes**, SHA256 `e1f6fc27060b561ed49f28dfeead369bf5b492b55f95cc2204a2a1f9fc942ed9`. Host `aladdin-pdv-api-homologacao.jicnzg.easypanel.host` e marcadores de autorização/resumo/conflito conferidos. Export com ferramentas de teste; não é APK nem execução física. Log em `builds/r3-export.log`.
- **Arquivos/evidências:** `apps/mobile/src/dados/{acessoOffline,dados,armazenamentoEscopo,vendas,hooks,syncTipos,syncAplicacao,syncNavegador}.ts[x]`, `sqlite/syncSqlite.ts`, serviço de sincronização, fluxo e telas de entrada/usuários/sync; testes de autorização offline, equipe/integração, aparelhos, recuperação e fluxo; [relatório R3](r3-sincronizacao-offline-recuperacao.md), procedimento de revisão, roadmap e este histórico. Evidências locais ignoradas em `builds/r3-{api,mobile,shared}-tests.json` e `builds/r3-validacao-local.json`. Base `bc786bc`; sem commit próprio e com alterações anteriores preservadas. Nenhuma migração/serviço novo nesta etapa.
- **Roadmap:** oito itens de implementação/teste R3 marcados com limite explícito de validação automatizada local; duas pendências de homologação externa/física abertas. R0–R2 não foram declaradas homologadas, R4–R7 continuam planejadas, e backlog de backup externo/alertas foi preservado.
- **Limitações:** PGlite/SQLite/HTTP local não substituem PostgreSQL independente, SecureStore nativo ou Android físico. Perfis legados sem registro de autorização exigem revalidação online antes de operar offline. Prazo local usa o relógio do aparelho; revogação remota é conhecida ao reconectar. O substituto desconhece quantidade e conteúdo nunca enviados pela origem perdida. Pendência de fechamento incompatível continua bloqueada para revisão, sem aceite excepcional automático ou descarte. Não há aceite humano registrado.
- **Próximo passo:** implantar R1–R3 em homologação, gerar APK conectado e executar o roteiro físico com dono e dois operadores, dois aparelhos, rede intermitente, disco cheio, SecureStore, reinício, conflito e recuperação; registrar evidência externa/física e aceite humano separadamente.


<a id="cp-20261102-016-base-transacional-de-gestao-r4"></a>

## CP 20261102 016 Base transacional de gestão R4

- **Data:** 02/11/2026, 08h43, America/Sao_Paulo.
- **Etapa:** R4, quinta entrega funcional solicitada; continuação do CP 015.
- **Estado:** avanço parcial construído e validado inicialmente em ambiente local. Sem deploy, APK, Android físico ou aceite humano. Alterações anteriores preservadas; sem commit próprio.
- **Construído:** contrato de gestão, migração `0010_keen_arclight.sql`, movimentos de estoque com abertura legada sem inventar autoria, baixa de venda transacional e saldo negativo explícito; cadastro não sobrescreve saldo existente. Devolução física referenciada e limitada à quantidade vendida. Clientes por loja, venda parcialmente fiada, recebimentos/estornos imutáveis e idempotentes com caixa receptor e rollback conjunto. Cadastro de lojas com novo vínculo do dono, limite de plano e relatórios por evento, loja, usuário, turno, período e meio, separando dívida, recebimento e gaveta; CSV compartilha o snapshot.
- **Arquivos:** `packages/shared/src/gestao.ts`, contratos/cálculo de caixa, schema/migração, `apps/api/src/rotas/gestao.ts`, serviços `estoque.ts`, `sync.ts` e `valoresVenda.ts`, registro de rotas e `apps/api/test/gestao.test.ts`.
- **Validações:** tipos da API aprovados; seis cenários API/PGlite aprovados, incluindo vendas e recebimentos concorrentes, replay, saldo negativo, devolução limitada, cancelamento de dívida, isolamento, limites, filtros e falha forçada na baixa/gaveta com rollback. Duas falhas iniciais eram fixtures (método inexistente do relógio e cartão já usado no teste grátis); corrigidas sem exceções no runtime.
- **Limitações/pendências:** interface e transporte mobile, comandos duráveis de gestão e revisão de cancelamentos/relatórios, testes de migração e integração SQLite, catálogo real e oferta ainda pendentes. Regressão completa e bundle não executados nesta fronteira. PostgreSQL independente e Android físico continuam abertos. Nenhum item R4 marcado concluído antecipadamente.
- **Próximo passo:** conectar as telas de estoque, clientes/fiado, relatórios e lojas; validar recuperação de respostas perdidas, mudança de perfil e persistência antes da regressão final.


<a id="cp-20261102-017-telas-comandos-duraveis-e-lojas-r4"></a>

## CP 20261102 017 Telas, comandos duráveis e lojas R4

- **Data:** 02/11/2026, 08h55, America/Sao_Paulo.
- **Etapa:** R4, continuação do CP 016; entrega parcial de integração mobile.
- **Estado:** construída e validada por cenários dirigidos locais. Sem deploy, APK, Android físico ou aceite humano.
- **Construído:** telas conectadas de estoque/movimentos, clientes/fiado, relatórios/CSV e lojas, acessíveis nos Ajustes; transporte validado por schema, comandos de gestão duráveis por perfil com retomada explícita e bloqueio financeiro até confirmação. Cadastro conectado deixa o saldo existente para a trilha de movimentos; fiado conserva a venda e a parcela de crédito no SQLite/navegador e na outbox. Histórico distingue venda com fiado e recebimento; total vendido inclui crédito concedido sem inflar a gaveta. Cadastro de filial cria vínculo do dono e a seleção usa o fluxo pessoal de OTP/perfis existente, com aparelho/estoque/Pix próprios da loja.
- **Oferta:** integração de pagamentos saiu dos recursos oferecidos, mantendo o identificador legível em contratos antigos. Pro descreve estoque, fiado, equipe, até três lojas e pagamentos manuais. Preços, política de gratuidade e credenciais não foram alterados.
- **Validações:** quatro cenários mobile/API/PGlite aprovados, com SQLite real e navegador: venda fiada offline, reinício, ACK perdido, baixa única/negativa, relatório sem dupla contagem; recebimento com resposta perdida, chave conservada após reinício e fechamento bloqueado até reaplicar o crédito; filial isolada, login por vínculo e pendência que permanece no perfil original. Tipos mobile passaram após geração das novas rotas; alterações finais de apresentação/datas ainda aguardam nova rodada.
- **Arquivos:** `src/telas/gestao/*`, rotas `app/gestao/*`/`app/ajustes/lojas.tsx`, backend/contratos, `dados.ts`, repositórios, formulários, histórico e `gestaoIntegracao.test.ts`; sem commit próprio, preservando alterações anteriores.
- **Limitações/pendências:** ampliar testes de migração, contratos/CSV, concorrência adversa e interface; finalizar filtros legíveis, validar catálogo externo com produtos reais, repetir regressão/tipos/bundle e documentar limites de homologação. Recebimentos e ajustes são online; vendas podem ficar pendentes offline. Saldos exibidos são confirmados, sem promessa de reserva global. Checklists R4 seguem abertos até consolidação da evidência.
- **Próximo passo:** revisão integrada, homologação técnica do catálogo possível neste ambiente e regressão completa; registrar amostra de campo/4G e Android físico separadamente.


<a id="cp-20261102-018-revisao-adversa-catalogo-e-regressao-r4"></a>

## CP 20261102 018 Revisão adversa, catálogo e regressão R4

- **Data:** 02/11/2026, 09h06, America/Sao_Paulo.
- **Etapa:** R4, revisão dos CPs 016 e 017.
- **Estado:** revisão integrada local; regressão final e bundle em preparação. Sem deploy, APK, Android físico ou aceite humano.
- **Correções:** produtos são aplicados antes das vendas no lote; produto desconhecido gera rejeição explícita e pode ser reenviado após cadastro, sem omitir a baixa. Unidade de estoque controlado é imutável; crédito da venda também permanece imutável no SQLite. Recebimento forjado pelo push do caixa é recusado. Relatório compara instantes numéricos, inclusive ISO com precisões distintas, mantém centavos negativos numéricos no CSV e neutraliza fórmulas em texto. Filtros de tela usam datas civis de Brasília, nomes de usuários/lojas e turnos, incluindo usuários sem turno; dono pode filtrar uma filial ou consolidar a empresa. Resultado exportado permanece o snapshot exibido mesmo após editar os controles.
- **Validação dirigida:** nove testes API de gestão aprovados; migração R4 e os cenários antigos de venda/pagamento passaram na rodada dirigida (45/46 antes de corrigir uma fixture de fechamento sem os metadados v2; os nove de gestão passaram após a correção). Nove testes mobile de telas/datas/integração aprovados; shared 172 aprovados. Tipos dos três workspaces aprovados antes do último ajuste de filtros.
- **Regressão inicial:** mobile 531/536 aprovados; cinco falhas no arquivo HTTP real passaram integralmente ao repetir com acesso a localhost, sem mudança no runtime. API 498/521 aprovados; 17 falhas de SMTP/acesso ao diretório temporário são compatíveis com as restrições do sandbox, e seis falhas eram fixtures antigas do novo campo nulo `fiado` e da política anterior de sobrescrever saldo no cadastro. Fixtures atualizadas para a política de movimentos; repetir toda a API com acesso local, sem alterar TLS/autenticação.
- **Catálogo externo:** `scripts/homologar-catalogo.mts` consultou três produtos públicos por HTTPS no Open Food Facts: Nutella 933 ms, Coca-Cola Original 236 ms e Coca Cola LT 350ml 231 ms. Segunda leitura pelo catálogo próprio: 1–2 ms, sem nova chamada externa. PGlite temporário; três leituras externas, nenhum dado enviado ao catálogo. Rede restrita primeiro demonstrou retorno manual por falha; a repetição com rede autorizada obteve os três nomes. Evidência em `builds/r4-catalogo-externo.json`.
- **Limites:** três produtos públicos não comprovam amostra de 100 itens físicos/cobertura de mercadinho, nem p95 em 4G. Não foi contratada fonte adicional. PostgreSQL independente, Android/SecureStore/exportação físicos e avaliação humana continuam abertos. Backups e serviços externos preservados.
- **Próximo passo:** executar regressão final com localhost, tipos, bundle rastreável, consolidar o relatório e marcar somente os itens comprovados.


<a id="cp-20261102-019-regressao-local-e-autoria-dos-relatorios-r4"></a>

## CP 20261102 019 Regressão local e autoria dos relatórios R4

- **Data:** 02/11/2026, 09h12, America/Sao_Paulo.
- **Etapa:** R4, consolidação da revisão do CP 018 antes da compilação final.
- **Estado:** implementação local e regressão aprovadas; bundle e relatório final pendentes. Sem deploy, APK, Android físico ou aceite humano.
- **Resultado:** API 43 arquivos/524 testes, mobile 60 arquivos/540 testes e shared 17 arquivos/172 testes aprovados (1.236). Tipos dos três workspaces e `git diff --check` aprovados. A execução com localhost resolveu as falhas ambientais de SMTP/HTTP e banco temporário sem mudar segurança, autenticação ou tempo limite dos testes.
- **Última revisão:** cancelamento/intervenção mantém o responsável financeiro no filtro e o autor em campo separado. Corrigido o caso em que o cancelamento do dono ficava ausente do relatório do operador original. Dez testes dirigidos de gestão aprovados depois desse ajuste, incluindo a nova evidência de autoria e as opções de filtro restritas ao operador. O teste adicional ainda não está contado nos 524 da regressão global.
- **Evidências:** `builds/r4-{api,mobile,shared}-tests.json`; contratos e CSV compartilhados, `apps/api/test/gestao.test.ts`, migração R4, integrações e telas mobile; [relatório R4](r4-gestao-catalogo-fiado-lojas.md). Sem commit próprio, base `bc786bc`; trabalhos anteriores preservados.
- **Limites/pendências:** catálogo de três produtos HTTPS é fumaça técnica, não amostra física de 100 itens nem p95 em 4G. Homologação em PostgreSQL independente, Android físico/compartilhamento/SecureStore e aceite humano continuam abertos. Relatório de eventos não inventa data/autor de cancelamentos legados sem evento detalhado.
- **Próximo passo:** compilar e conferir o bundle Android conectado, repetir as verificações afetadas pelo último ajuste e consolidar checklist/roteiro final com pendências explícitas.


<a id="cp-20261102-020-entrega-local-de-gestao-r4"></a>

## CP 20261102 020 Entrega local de gestão R4

- **Data:** 02/11/2026, 09h18, America/Sao_Paulo.
- **Etapa:** R4, quinta entrega funcional — consolidação dos CPs 016 a 019.
- **Estado:** implementação construída e validada localmente. Homologação de campo/externa, APK conectado, Android físico e aprovação humana pendentes. Nenhum serviço externo foi alterado e o APK 0.1.5 de R0 permanece preservado. Sem commit próprio; base `bc786bc`; trabalhos anteriores preservados.
- **Entregue:** estoque por movimentos identificados e baixa transacional, abertura legada sem reaplicar vendas/inventar autoria, reenvio idempotente, saldo negativo explícito, devolução física referenciada/limitada, ajuste assinado com motivo e edição de catálogo sem substituir saldo. Clientes/fiado com crédito original imutável, vencimento/saldo/histórico, recebimento parcial/total e estorno referenciado; dinheiro vinculado ao turno receptor, sem criar nova venda. Comandos duráveis por perfil, retomada após resposta perdida/reinício e proteção contra confirmação simultânea de uma venda fiada.
- **Relatórios/lojas:** filtros autorizados por período civil de Brasília, usuário, turno, meio, loja e consolidado da empresa pelo dono; categorias de venda, cancelamento, crédito, recebimento, devolução, suprimento, sangria, retirada, transferência, correção e diferença separadas. Responsável financeiro e autor da intervenção/cancelamento separados. CSV exporta o mesmo snapshot e filtros, com neutralização de fórmulas e centavos numéricos. Filiais com vínculo próprio do dono, limites transacionais, seleção pessoal por OTP e perfis/estoque/Pix/filas/caixas isolados. Oferta mantém pagamentos manuais e deixa de oferecer integração ainda não entregue.
- **Validação final:** API **43 arquivos/525 testes**, mobile **60 arquivos/540 testes**, shared **17 arquivos/172 testes**, todos aprovados — **1.237 testes**. Tipos dos três workspaces e `git diff --check` aprovados. Depois da regressão, oito dirigidos mobile comprovaram também confirmação simultânea/retomada e telas; dois dirigidos shared conferiram contrato/CSV com autoria. HTTP/SMTP local e banco temporário executados com acesso local, sem reduzir TLS/autenticação nem acrescentar exceções de runtime.
- **Cenários comprovados:** venda offline/reinício/ACK perdido em SQLite e navegador; saldo negativo após duas vendas e reenvio sem dupla baixa; lote com venda antes do cadastro e rejeição recuperável de produto desconhecido; rollback forçado de venda/estoque e recebimento/gaveta; recebimentos concorrentes sem ultrapassar saldo; recebimento em turno próprio, fechamento bloqueado até reaplicar confirmação; dívida imutável, estorno único, cancelamento somente após zerar recebimentos; negação de caixa/cliente/loja indevidos; migração preservando saldo positivo/negativo/nulo e registros antigos; filial e perfis isolados; relatório de outro período/turno receptor e cancelamento pelo dono no filtro do responsável original; CSV preservado após editar controles.
- **Catálogo externo:** três leituras HTTPS reais no Open Food Facts: Nutella 933 ms, Coca-Cola Original 236 ms e Coca Cola LT 350ml 231 ms; segunda leitura pelo catálogo próprio 1–2 ms, sem novas chamadas externas. Falha de rede preserva cadastro manual. Evidência técnica restrita, não valida a amostra física de 100 itens ou o p95 em 4G; item de homologação mantido aberto e nenhuma fonte adicional contratada.
- **Compilação:** Android/Hermes, **1.921 módulos**; `builds/r4-bundle/_expo/static/js/android/entry-7fdb718ae0f392e837bf1b0e5c342ca8.hbc`, **5.213.210 bytes**, SHA256 `aa9503fff5db36853533a32831a450a5ae08a08b62023a0092d4f33441d40c3b`. Host de homologação e marcadores de gestão/fiado/relatórios conferidos. Ferramentas de teste habilitadas; export não é APK nem execução física. Primeiro Hermes foi impedido de escrever no temporário do sandbox; a repetição com temporário dentro do workspace passou.
- **Arquivos/evidências:** contrato `packages/shared/src/gestao.ts`, contratos/cálculo/planos; schema e migração `0010_keen_arclight.sql`/snapshot/journal; `apps/api/src/servicos/estoque.ts`, sync/valores e `rotas/gestao.ts`; transporte/dados/repositórios e telas `apps/mobile/src/telas/gestao/*`, rotas `app/gestao/*` e `app/ajustes/lojas.tsx`, formulário/histórico/resumo de caixa. Testes de gestão, migração, integração/telas/datas e regressões; script `scripts/homologar-catalogo.mts`, [relatório R4](r4-gestao-catalogo-fiado-lojas.md), READMEs e roadmap. Artefatos locais ignorados em `builds/r4-*`; documentação versionável.
- **Roadmap:** sete itens de implementação R4 marcados com limite explícito de validação local; catálogo de campo/4G permanece parcial e dois itens externos/físicos foram acrescentados. R0–R3 não foram declaradas homologadas, R5–R7 permanecem planejadas. Backups locais, healthchecks e backlog de cópia externa/alertas preservados.
- **Limitações:** PGlite/SQLite/testes de tela e HTTPS público não substituem PostgreSQL independente, SecureStore/compartilhamento nativos, inventário físico ou Android real. Recebimentos/ajustes/clientes novos exigem rede; fiado offline usa cliente previamente carregado/selecionado. Saldos consideram somente operações confirmadas; não há reserva global offline. Estorno Pix/cartão é registro manual após devolução externa. Cancelamento comercial não repõe mercadoria nem devolve automaticamente a entrada. Histórico de cancelamento legado sem evento permanece legível sem data/autor inventados. Consultas de gestão leem o histórico confirmado e não constituem homologação de volume em produção. Não há aceite humano registrado.
- **Próximo passo:** implantar R1–R4 em homologação com backup preservado, validar concorrência em PostgreSQL independente, gerar APK conectado e executar o roteiro físico da gestão e das filiais; medir amostra de 100 produtos e p95 em 4G e registrar o aceite humano separadamente.

<a id="cp-20261102-021-suporte-e-privacidade-do-piloto-r5"></a>

## CP 20261102 021 Suporte e privacidade do piloto R5

- **Data:** 02/11/2026, 23h22, America/Sao_Paulo.
- **Etapa:** R5, sexta entrega solicitada; continuação do CP 020. Avanço parcial construído e validado localmente, sem deploy, APK novo, Android físico ou aceite humano.
- **Construído:** suporte autenticado pessoal, protocolo idempotente e fila durável por operador, consulta de respostas, pedido de análise de exclusão sem remoção automática, resumo técnico opcional com campos fechados, políticas versionadas acessíveis sem sessão/licença e exportação de dados confirmados autorizados por loja/operador. Limite de dez protocolos abertos e limpeza de concluídos há mais de 90 dias no startup/job diário/consulta. Arquivo nativo de exportação removido do cache após compartilhamento.
- **Arquivos:** contrato shared `suporte.ts`, tabela e migração aditiva `0011_condemned_unus.sql`/snapshot/journal; rotas e retenção API; serviço durável, tela/rota mobile, guarda de fluxo, ajustes/onboarding e particionamento pessoal. Base `bc786bc`; alterações anteriores preservadas; sem commit próprio.
- **Validação:** quatro testes API/PGlite e quatro mobile aprovados: concorrência/replay, isolamento, suspensão, exportação sem credenciais, pedido de exclusão sem perda, retenção, resposta perdida/reinício, falha de disco e mudança de perfil. Primeiras rodadas detectaram fixtures incorretas e serialização estrita de campos internos; corrigidas. Tipos finais/regressão ainda em execução. Logs `builds/r5-{api,mobile}-dirigidos.log`.
- **Limites:** suporte só funcionará conectado após deploy da migração/API. Atendimento manual exige operador responsável e execução do procedimento. Sem exclusão automática comercial, promessa de prazo ou homologação jurídica das políticas. ADB inicial falhou ao iniciar daemon no sandbox; não há evidência física. Auditoria npm externa bloqueada pela revisão automática por divulgação de metadados; autorização específica solicitada. Backup externo/alertas continuam no backlog; serviços e backups existentes preservados.
- **Roadmap:** R5 em implementação, checklist físico/externo permanece aberto. [Relatório](r5-piloto-backup-suporte.md).
- **Próximo passo:** concluir tipos/regressão, preparar artefato conectado sem ferramentas/simuladores e procedimentos verificáveis de piloto, backup, monitoramento e retorno compatível; registrar PostgreSQL e Android físico separadamente.

<a id="cp-20261102-022-isolamento-do-release-e-preparo-operacional-r5"></a>

## CP 20261102 022 Isolamento do release e preparo operacional R5

- **Data:** 02/11/2026, 23h31, America/Sao_Paulo.
- **Etapa:** R5, continuação do CP 021. Avanço parcial; sem deploy, APK novo, Android físico ou aceite humano.
- **Construído:** versão planejada 0.1.6/versionCode 7; configuração Metro separa implementações de release conectado das demos de backend, semente, catálogo, gateway/tokenização, formulário de cartão, relógio e diagnóstico. Ramos de zerar dados e simular scanner eliminados; offsets legados do relógio são ignorados. Gate verifica host, recursos de suporte, strings proibidas e grafo do source map. Script de APK copia/verifica fontes, inclui Metro e recusa usar assinatura de teste para produção.
- **Validação:** export Android/Hermes conectado aprovado e gate estático PASS, 4.250.432 bytes/1.882 fontes, SHA256 fa74e6e590da6add7c4d7cb760885788efbf4c915d86c336aad17ec575f6b52c. Dois cenários de isolamento/relógio aprovados. Tipos da fronteira de suporte aprovados; regressão completa atual em execução. Arquivos ignorados builds/r5-bundle*, r5-export.log e r5-release-testes.log. Não é APK nem execução física.
- **Operação:** ferramentas de comparação de snapshots R5, SQL agregado, HTTP sem sessão e inventário físico sem instalação acrescentadas; testes dessas ferramentas aguardam a regressão. Inventário ADB com permissão fora do sandbox retornou zero aparelhos em 23h27. Não há celular disponível nesta sessão.
- **Evidência externa:** conector confirmou agendamentos locais de produção/homologação ativos com sete cópias, bancos sem porta externa e destino R0 desativado. Homologação continua no commit R0 bc786bc; produção observada em 73fb42f0be54ba8a6a3649e614def16aee05955e, não implantado nesta tarefa. Configuração não comprova execução recente, worker saudável ou restauração atual. Não houve mutação externa; recursos de outros produtos preservados.
- **Limitações:** auditoria npm aguarda autorização específica após recusa automática; sem PostgreSQL independente ou restauração R5. Novo app requer API R1–R5 compatível antes de uso operacional. Backlog externo/alertas preservado.
- **Próximo passo:** concluir regressão em banco dedicado, testes operacionais e tipos, compilar APK interno rastreável se o ambiente permitir e consolidar roteiro físico/atendimento/retorno compatível. [Relatório](r5-piloto-backup-suporte.md).

<a id="cp-20261102-023-regressao-parcial-auditoria-e-roteiros-r5"></a>

## CP 20261102 023 Regressão parcial, auditoria e roteiros R5

- **Data:** 02/11/2026, 23h41, America/Sao_Paulo.
- **Etapa:** R5, continuação do CP 022. Avanço local/inspeção externa, sem deploy, APK final, Android físico ou aceite humano.
- **Construído:** roteiro físico F01–F19 vinculado ao APK/SHA/API e procedimento de suporte, acesso restrito a diagnóstico, retenção, exclusão sob análise, inspeção manual de jobs/e-mail/backup, restauração isolada e retorno compatível. Scripts recusam snapshots incompletos, tabela faltante, integridade divergente e simuladores no bundle; integridade de fiado e troca autorizada de aparelho ajustadas sem reescrever o roteiro histórico R0. CI inclui testes dessas ferramentas.
- **Testes:** mobile 62 arquivos/546 testes e shared 17 arquivos/172 testes aprovados. Duas ferramentas operacionais aprovadas. API em rodada liberada: 530/531; única falha era fixture que tentava liberar o drain de e-mail antes de aguardar a parada do novo job. Fixture passou a esperar seu início; regressão final em execução. Rodada restrita anterior apresentou também falhas de SMTP/HTTP/temporário, resolvidas com acesso local sem alteração de segurança. Tipos dos três workspaces aprovados antes desse ajuste final; diff sem erros.
- **Auditoria autorizada:** usuário autorizou explicitamente a consulta npm após a recusa automática inicial. Auditoria global de dependências sem dev: 15 avisos, incluindo dependências de ferramentas Expo. Análise das 86 dependências de produção API/shared no lock e 1.882 fontes do bundle não encontrou caminho alcançável de biblioteca com advisory direto. Essa é análise de alcance JS; não é auditoria global limpa nem cobre binários/imagem/Gradle. Relatórios em builds/r5-audit-*.json. Nenhum downgrade automático ou override incompatível aplicado.
- **HTTP externo:** produção e homologação /saude 200 e /dev ausente; /suporte/solicitacoes e /suporte/exportacao retornam 404, logo verificador R5 registra FAIL de compatibilidade. APIs saudáveis não foram declaradas compatíveis com R5. Nenhuma configuração/mutação externa realizada.
- **Roadmap:** três entregas locais adicionais marcadas; os nove itens originais físicos/externos continuam abertos. Cópia externa e alertas mantidos no backlog. [Relatório](r5-piloto-backup-suporte.md), [matriz física](roteiro-piloto-android.md), [operação](operacao-backup-suporte.md). Sem commit próprio; trabalhos anteriores preservados.
- **Próximo passo:** concluir regressão API/tipos, compilar/verificar APK interno e consolidar resultados; depois implantar a versão compatível e homologar PostgreSQL independente/restauração/Android físico com responsável pelo atendimento e aceite humano.

<a id="cp-20261102-024-regressao-aprovada-e-isolamento-da-tela-r5"></a>

## CP 20261102 024 Regressão aprovada e isolamento da tela R5

- **Data:** 02/11/2026, 23h43, America/Sao_Paulo.
- **Etapa:** R5, continuação/correção do CP 023. Construção e validação local; APK interno em compilação. Sem deploy, Android físico, PostgreSQL independente ou aceite humano.
- **Resultado:** API 45 arquivos/531 testes, mobile 62 arquivos/546 testes, shared 17 arquivos/172 testes aprovados — 1.249 na regressão global. Três testes adicionais da tela de suporte e dois das ferramentas operacionais também aprovados (1.254 verificações no conjunto). Tipos dos três workspaces e diff check aprovados. Rodada final API com localhost/temporário permitidos, sem relaxar TLS/autenticação.
- **Revisão:** tela limpa mensagens/resumo ao mudar de acesso e descarta resposta HTTP atrasada de outro operador, inclusive na mesma partição legada de dono; falha ao ler pendência local não gera rejeição não tratada no finally. Exclusão aparece como análise, diagnóstico vem desligado e compartilhamento não ocorre automaticamente. Job de retenção drena no shutdown e protege o logger; fixtures de startup atualizadas para aguardar esse drain.
- **Artefato em andamento:** compilação interna 0.1.6/versionCode 7 autorizada e iniciada na cópia curta C:/p, com inventário de fontes e verificação de assinatura/bundle. O export do CP 022 é evidência daquele instante; o APK final deve usar os fontes revisados e terá seu próprio hash. Não registrar APK concluído antes da verificação.
- **Arquivos/evidências:** builds/r5-{api,mobile,shared}-tests.json, r5-api-regressao-final.log, r5-suporte-tela.log, r5-operacao-tests.log e r5-tipos.log; src/telas/suporte/Suporte.tsx, test/suporteTela.test.ts e fixtures/jobs API. Sem commit próprio, base bc786bc, alterações anteriores preservadas.
- **Pendências:** APIs remotas continuam sem rotas R5; suporte conectado depende de deploy/migração. Sem aparelho no ADB. Nova restauração PostgreSQL, amostra/4G, turno físico, responsável pelo atendimento, política formal e retorno externo continuam abertos. Backups locais/healthchecks e backlog externo/alertas preservados.
- **Próximo passo:** concluir e inspecionar APK, consolidar manifesto/relatório/roadmap e registrar os limites da homologação externa/física.

<a id="cp-20261102-025-apk-interno-e-entrega-local-r5"></a>

## CP 20261102 025 APK interno e entrega local R5

- **Data:** 02/11/2026, 23h55, America/Sao_Paulo.
- **Etapa:** R5, sexta entrega solicitada; consolidação dos CPs 021–024. Implementação e APK interno construídos/validados localmente. Etapa completa continua em homologação externa/física, sem aceite humano.
- **Entregue:** suporte pessoal autenticado e durável com protocolo idempotente, limite de abertos, resumo técnico opcional/schema fechado, exportação autorizada, pedido de análise de exclusão sem apagar dados, políticas sem sessão/licença e retenção de concluídos há mais de 90 dias. Revisão final retira SQL/params dos erros internos para proteger mensagens pessoais. Roteiros de atendimento/incidente/monitoramento manual/retorno compatível, matriz física F01–F19 e ferramentas de restauração/inventário/release acrescentados. Serviços usam nomes pdv-; nenhum serviço remoto foi criado/alterado.
- **Regressão:** API 45 arquivos/531 testes, mobile 62 arquivos/546 testes, shared 17 arquivos/172 testes aprovados (1.249 globais). Revisão final: 56 testes API dirigidos aprovados, com um caso novo de log sem dados pessoais; três casos novos da tela e dois das ferramentas operacionais aprovados. Total distinto 1.255, sem somar reexecuções. Tipos dos três workspaces, diff e sintaxe de PowerShell/CLIs JS aprovados. PostgreSQL de regressão foi PGlite local, com SQLite real no mobile; não há comprovação em PostgreSQL independente.
- **APK:** builds/pdv-homologacao-0.1.6.apk, 74.688.295 bytes, versão 0.1.6/versionCode 7, pacote br.com.pdv.mobile.homologacao, minSdk 24/target 36, ARM32/ARM64. Gradle SUCCESS em 6m45s, 657 tarefas; daemon encerrado. Assinatura APK v2 válida Android Debug, certificado SHA256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. Uso interno, não assinatura de distribuição. APK SHA256 e6170b3b7e5fd2e40efdcff8d832fc5167baed3482c403bfadbeb9f757bcb2ff.
- **Bundle exato do APK:** 4.251.352 bytes, SHA256 c067903946342ce792b09bf1c03ab4c56eefc26b33b98008747cd574cc2329a2; host de homologação/recursos de suporte presentes e simuladores/ferramentas ausentes. Source map do build, 1.882 fontes, gate PASS. Metadados, assinatura, manifesto e verificações em builds/pdv-homologacao-0.1.6-*. Inventário 291 arquivos: origem atual sem divergências; prebuild alterou somente o script android do package.json na cópia C:/p. Locks diferem por seis dependências exclusivas da API; versões/integridade de todos os pacotes comuns iguais. APK anterior preservado.
- **Dependências:** consulta npm autorizada pelo usuário; 15 avisos globais, sem advisory direto alcançável encontrado nas 86 dependências API/shared e nas 1.882 fontes JS do APK. Não é auditoria global limpa, não cobre Gradle/binários/imagem e não elimina o saneamento das ferramentas. Sem alterações de versões/override de dependências.
- **Evidências externas e limites:** APIs saudáveis (/saude 200; /dev 404), mas suporte/exportação R5 ainda 404; verificador de compatibilidade FAIL e manifesto registra rotaSuportePresente=false. Homologação permanece no commit R0 bc786bc; produção observada em 73fb42f0be54ba8a6a3649e614def16aee05955e, não implantado nesta tarefa. Agendamentos locais ativos com sete cópias e PostgreSQL sem porta externa, destino R0 desativado/volume mantido. Não comprova execução recente ou restauração atual. ADB sem aparelhos; sem Android físico, OTP externo novo, SecureStore/compartilhamento nativos, amostra/4G, retorno compatível externo, CI remoto novo ou responsável/escala de atendimento definidos.
- **Roadmap/documentação:** três itens locais marcados; os nove itens originais físicos/externos permanecem abertos. [Relatório final R5](r5-piloto-backup-suporte.md), [roteiro físico](roteiro-piloto-android.md), [operação](operacao-backup-suporte.md), READMEs e revisão de pendências atualizados. Resumo sanitizado builds/r5-validacao-local.json. Sem commit próprio, base local bc786bc, alterações anteriores preservadas. Cópia externa e alertas continuam no backlog autorizado, sem bloquear MVP; backups/healthchecks existentes preservados.
- **Próximo passo:** implantar a versão compatível R1–R5 em homologação com backup preservado, executar PostgreSQL dedicado/CI e restauração isolada atual; conectar pelo menos dois celulares e instalação substituta, designar atendimento e executar F01–F19 com este APK/SHA. Registrar evidência externa/física e aceite humano separadamente. Não iniciar operação comercial com o APK antes dessa homologação.

<a id="cp-20261103-026-revisao-de-prontidao-para-r6"></a>

## CP 20261103 026 Revisão de prontidão para R6

- **Data:** 03/11/2026, 00h02, America/Sao_Paulo.
- **Etapa/estado:** auditoria das pendências R0–R5 e do critério de entrada em R6, complementando o CP 025. Homologação acumulada ainda aberta; R6 planejada, sem critério de entrada atendido. Não há aceite humano registrado.
- **Construído:** quadro por etapa e ordem de fechamento no início do roadmap, com distinção entre implementação local, homologação externa, Android e aceite. R6 passa a exibir explicitamente a dependência não satisfeita. O APK cumulativo evita interpretar os itens antigos como obrigação de gerar um artefato por etapa. Nenhum checkbox funcional foi promovido a concluído.
- **Evidências revistas:** relatórios R0–R5, restauração R0, CPs recentes até 025, matriz F01–F19, operação/suporte, revisão de conflitos, workflow CI e artefatos/manifesto locais. Os 19 cenários físicos permanecem PENDENTE; não foram executados nesta revisão. Os 1.255 casos distintos são o resultado histórico do CP 025, não uma nova execução.
- **Validação externa somente de leitura:** painel confirmou o commit configurado de homologação `bc786bc86abac934754ee1dd35d8524f9c04c9c1` e implantação automática desativada. Em 02/11/2026, 23h59min56s, verificador HTTPS retornou FAIL de compatibilidade: saúde 200, rota de teste 404, suporte/solicitações e suporte/exportação 404, esperados 401. A tentativa inicial no sandbox falhou em DNS; repetição com rede permitida concluiu. JSON sanitizado em `builds/pre-r6-http-homologacao.json`. Não houve consulta de mensagens pessoais, envio de e-mail ou mutação externa.
- **Validação local:** SHA256 recalculado do APK 0.1.6 igual a `e6170b3b7e5fd2e40efdcff8d832fc5167baed3482c403bfadbeb9f757bcb2ff`; inventário de 291 fontes conferido por SHA256, zero divergências. Conferidos 49 links locais nos dois documentos, nenhum destino ausente; âncoras da revisão/checkpoint presentes. `git diff --check` aprovado nas alterações rastreadas; documentos novos conferidos diretamente. Sem alteração de aplicação e sem repetição das suítes.
- **Pendências materiais:** API compatível/migrações, PostgreSQL independente e CI da versão candidata; ciclo físico financeiro/isolamento/offline, restauração do schema atual e instalação substituta; resolução operacional de conflitos que mantêm reserva bloqueada e tratamento comercial de vendas fora da janela offline; catálogo/4G, atendimento, políticas e verificações operacionais existentes. Ausência de evidência não foi registrada como defeito observado. Duração/amostra de piloto estável ainda precisam ser definidas e registradas.
- **Arquivos/versão:** `docs/roadmap-app-completo.md`, `docs/checkpoints-roadmap.md` e JSON local ignorado. Base local `bc786bc`, candidato Android 0.1.6/versionCode 7; sem commit próprio. Alterações de outros trabalhos, backups, healthchecks e serviços preservados. Cópia externa e alertas seguem no backlog e não bloqueiam MVP.
- **Próximo passo:** fixar uma versão rastreável R1–R5, validá-la em PostgreSQL dedicado/CI e preparar implantação em homologação com backup preservado; depois executar os roteiros físicos e registrar aceite separadamente. Não avançar a R6 com o piloto ainda sem evidência de estabilidade.

<a id="cp-20261103-027-candidato-real-sem-fallbacks-simulados"></a>

## CP 20261103 027 Candidato real sem fallbacks simulados

- **Data:** 03/11/2026, 00h21, America/Sao_Paulo.
- **Etapa/autorização:** R0–R5, continuação do CP 026. Usuário autorizou preparar/validar a versão conectada e homologação para testar no próprio celular com produto real, removendo mocks possíveis. Sem avanço de R6 ou aceite físico presumido.
- **Construído:** candidato 0.1.7/versionCode 8; scanner usa só câmera/digitação, sem imagem, EANs ou botões de leitura simulada. Catálogo demo e atraso artificial movidos integralmente para módulo excluído pelo Metro conectado; substituto recusa consulta sem API. Nenhum ambiente assume demo silenciosamente, nem no desenvolvimento; perfis conectados recusam ferramentas de teste. API/fábrica assumem billing disabled, simulador exige configuração explícita e continua proibido em produção. Build de homologação passa a interromper se suporte remoto for incompatível.
- **Preservado:** testes e demo legada ficam explicitamente separados; gateway/tokenização, semente, backend local, relógio artificial e diagnóstico já eram substituídos no grafo conectado. Pagamentos reais continuam manuais e acesso sem cobrança; não se implementou provedor R6/R7 nem apagou dados de demo/contas.
- **Validações:** tipos dos três workspaces aprovados. Mobile 550 casos distintos aprovados no conjunto: 545 na rodada restrita e os cinco HTTP/localhost aprovados na repetição permitida; falhas da primeira rodada não foram tratadas como sucesso. Testes API dirigidos de configuração/bootstrap: 25 aprovados. Uma regressão inicial de logging da demo foi corrigida preservando o comportamento no módulo excluído do APK. `git diff --check` aprovado; logs/JSON em `builds/piloto-real-*`. Sem PostgreSQL independente, APK novo ou teste físico neste registro.
- **Externo:** painel confirmou somente leitura em `pdv-api-homologacao`: commit R0, auto deploy desativado, runtime production, SMTP e jobs ativos, billing disabled. Solicitado backup `pdv-pre-piloto-real-20261103` no agendamento existente e banco `pdv_homologacao`; retorno sem erro não comprova arquivo final/restauração. Produção preservada.
- **Arquivos/versão:** `apps/mobile/app.json`, `config/ambiente.js`, scanner/ferramentas/catálogo/release e testes, `apps/api/src/{billing,configuracao}.ts`, testes de configuração/bootstrap, `scripts/build-android.ps1`, README e roadmap. Base local `bc786bc`, ainda sem novo commit; conjunto anterior R1–R5 preservado para versão rastreável.
- **Próximo passo:** publicar candidato em branch exclusiva, executar workflow de validação com PostgreSQL dedicado e imagem, comprovar backup e implantar apenas a homologação; gerar/verificar APK 0.1.7 e roteiro de um produto. Registrar separadamente restauração, OTP externo e resultado físico do usuário.

<a id="cp-20261103-028-snapshot-backup-e-correcao-das-fixtures-postgresql"></a>

## CP 20261103 028 Snapshot, backup e correção das fixtures PostgreSQL

- **Data:** 03/11/2026, 00h28, America/Sao_Paulo.
- **Etapa/estado:** R0–R5, continuação do CP 027; validação externa parcial, antes do deploy. Android físico e aceite permanecem pendentes.
- **Versão rastreável:** conjunto cumulativo publicado em `codex/pdv-homologacao-real`, commit `43efe1108addbce77b0f1e46c4656f2d23792e34` (190 arquivos, incluindo entregas anteriores preservadas). Main e branch de produção não foram promovidas. Fonte/auto deploy da homologação ainda não alterados.
- **Backup comprovado:** painel de `pdv-postgres-homologacao` mostrou `pdv-pre-piloto-real-20261103`, arquivo `aladdin/pdv-postgres-homologacao/2026-11-03T03:20:33.050Z.sql.gz`, 11,2 kB, Success em 03/11/2026 00h20min33s local. Preserva schema anterior R0; não comprova restauração R5. Consulta pelo navegador porque o conector não expõe arquivo/log do backup; nenhuma restauração ou exclusão foi acionada. Idioma alterado acidentalmente durante navegação foi imediatamente restabelecido em PT.
- **CI externo:** [execução 41571846646](https://github.com/romulosutil/prisma-pdv-app/actions/runs/41571846646), workflow_dispatch, confirmou tipos, ferramentas operacionais e shared. API em PostgreSQL 17/pdv_test dedicado: 586/591 aprovados, cinco falhas; mobile/imagem não chegaram a executar. Esse CI está FAIL e não autoriza implantação.
- **Correção:** duas expectativas ainda exigiam mock por padrão; duas comparações de venda não incluíam `fiado`; corrida de mudança de papel presumiu que operador não pode vender. O cenário agora revoga explicitamente `vender` com lista vazia durante o lock, mantendo ACK anterior, rejeição da venda nova e snapshot sem alteração. Não houve mudança de regra de autorização ou código runtime para satisfazer o teste.
- **Validação local posterior:** quatro arquivos/23 testes API dirigidos aprovados em PGlite, HTTP local permitido; casos exclusivos PostgreSQL exigem repetição externa. `git diff --check` aprovado. Logs `builds/piloto-real-ci-falha.log` e `piloto-real-api-correcao-fixtures.log`; script HTTP técnico em `builds/homologar-piloto-real.mts` preparado, ainda não executado contra o serviço.
- **Arquivos:** quatro testes API (`acessoLiberado`, `dev`, `syncOrigem`, `syncSessao`), roadmap e este histórico. Correção ainda sem commit no instante do registro; candidato app 0.1.7/versionCode 8. Mocks dos testes continuam explícitos; nenhum seed foi inserido em conta do usuário.
- **Próximo passo:** publicar as fixtures corrigidas, repetir workflow completo; somente após PASS implantar homologação com o backup preservado. Validar HTTP autenticado em contas técnicas isoladas, sem enviar e-mail, e produzir o APK para teste físico do usuário. Produção, backups locais e backlog externo/alertas preservados.

<a id="cp-20261103-029-ci-postgresql-e-bundle-conectado-aprovados"></a>

## CP 20261103 029 CI PostgreSQL e bundle conectado aprovados

- **Data:** 03/11/2026, 00h34, America/Sao_Paulo.
- **Etapa/estado:** R0–R5, continuação do CP 028. Validação externa do candidato aprovada; deploy de homologação/APK/físico ainda não realizados neste registro.
- **Versão:** `9fa944aaf4a4f30f4d5e42eab30092caa8e865b7`, branch exclusiva `codex/pdv-homologacao-real`; correções do CP 028 publicadas. Fontes runtime do app/API iguais ao snapshot 43efe11; somente fixtures/documentação mudaram nesse commit.
- **CI:** [41572485129](https://github.com/romulosutil/prisma-pdv-app/actions/runs/41572485129), workflow_dispatch, status completed/success. API 45 arquivos/591 testes em PostgreSQL 17 dedicado `pdv_test`, mobile 63 arquivos/550 testes incluindo SQLite, shared 17 arquivos/172 testes, duas ferramentas operacionais, tipos dos três workspaces, build Docker e isolamento da imagem aprovados. Total de casos das três suítes: 1.313, mais duas ferramentas. Primeiro CI FAIL preservado no CP 028; não foi omitido ou promovido a sucesso. Job Deploy validated main foi skipped, sem promoção da produção.
- **Bundle conectado:** export Android/Hermes 0.1.7 aprovado, 4.249.060 bytes, SHA256 `b6a3f857e81f8651c86ca8bbdf9ecd893f6ff605d7c70d1295ec456388c7fa9a`, 1.882 fontes, gate PASS; scanner real presente e implementações demo excluídas conforme verificador. Export não é APK nem execução física. Evidências `builds/piloto-real-{ci-aprovado.log,export.log,bundle-verificacao.json}` e diretório `piloto-real-bundle`.
- **Físico:** ADB consultado em 00h33 retornou zero aparelhos autorizados; não houve instalação ou coleta de dados pessoais. Roteiro do primeiro produto real acrescentado à matriz física, com câmera/cadastro manual, preço próprio, pagamento manual, sync/reinício/offline e contagem de caixa; todos os resultados físicos continuam pendentes.
- **Roadmap:** item de regressão dedicada/CI em R5 concluído com a evidência externa correspondente. Outros itens físicos/operacionais continuam abertos. Sem alteração de aplicação depois do CI; mudanças documentais locais em roadmap/checkpoints/roteiro.
- **Limites/próximo passo:** backup pré-deploy comprovado no CP 028; agora atualizar somente fonte/identificação de catálogo da homologação e implantar o SHA aprovado. Revalidar rotas e fluxo autenticado, gerar APK exato 0.1.7 com assinatura/hash/inventário. Restauração do schema atual, OTP externo novo, testes físicos e aceite humano continuam separados. Produção observada antes da mudança em `73fb42f0be54ba8a6a3649e614def16aee05955e`, preservada; backup externo/alertas permanecem no backlog.

<a id="cp-20261103-030-api-implantada-e-divergencia-real-de-relogio"></a>

## CP 20261103 030 API implantada e divergência real de relógio

- **Data:** 03/11/2026, 00h40, America/Sao_Paulo.
- **Etapa/estado:** R0–R5, continuação do CP 029. API externa compatível implantada; fluxo financeiro externo ainda FAIL, APK novo não liberado.
- **Implantado:** somente `aladdin/pdv-api-homologacao`, fonte na branch exclusiva `codex/pdv-homologacao-real`, commit aprovado `9fa944aaf4a4f30f4d5e42eab30092caa8e865b7`. Backup pré-deploy preservado. Em 00h36min46s, verificador HTTPS PASS: saúde 200, rota de teste 404, duas rotas suporte 401 sem sessão. Ambiente production/SMTP/jobs/billing disabled preservado; produção não promovida.
- **Revisão automática:** atualização opcional de `OFF_USER_AGENT` recusada por substituir o ambiente completo e retransmitir senha SMTP/URL do banco/chaves de e-mail sem autorização específica desse payload. Não houve alternativa indireta, repetição ou mudança dessas variáveis; deploy prosseguiu com ambiente existente. Identificação operacional do catálogo segue pendente, sem impedir a consulta real observada.
- **Smoke autenticado:** em contas técnicas isoladas e com destinatários `example.invalid`, sem solicitar/enviar e-mail, comprovados quatro grupos: duas contas vazias/liberadas/sem cartão, equipe/lojas/suporte, uma reserva vencedora entre duas simultâneas com replay estável e EAN `7894900010015` retornado pelo Open Food Facts real. Nenhum dado foi inserido na conta do usuário. Sessões técnicas encerradas ao final; registros técnicos preservados, sem apagar dados.
- **Falha encontrada:** venda logo após abertura rejeitada `caixa_invalido`. Às 00h38, cabeçalho Date do servidor estava aproximadamente 26 segundos à frente do computador; a API exige venda não anterior à abertura real. Dois resultados FAIL e o payload original permanecem em evidências locais; IDs/datas não foram alterados para obter aceite. Não se tratou consulta externa/smoke parcial como piloto financeiro aprovado.
- **Evidências/arquivos:** `builds/piloto-real-http-homologacao.json`, `piloto-real-http-autenticado{,-tentativa1}.json`, log e script HTTP técnico; roadmap/checkpoints/roteiro locais atualizados. CI anterior continua válido para seu SHA, mas não comprova esse cenário de relógio. Sem APK novo, Android físico, OTP externo novo, restauração atual ou aceite.
- **Próximo passo:** acrescentar referência de hora informada pela API e sincronização do relógio conectado para novas operações, preservando imutabilidade e a detecção de retrocesso offline. Testar ordem de respostas, persistência/reinício e venda imediata após reserva; repetir CI/deploy e o smoke antes de compilar/liberar o APK 0.1.7.

<a id="cp-20261103-031-hora-real-da-api-no-app-conectado"></a>

## CP 20261103 031 Hora real da API no app conectado

- **Data:** 03/11/2026, 00h47, America/Sao_Paulo.
- **Etapa/estado:** correção R3/R5 após a falha externa do CP 030. Implementada e validada localmente; CI/deploy novos e APK ainda pendentes.
- **Construído:** API envia `x-pdv-agora` no onSend com precisão de milissegundos. BackendHttp captura instante de recepção antes de consumir corpo e só fornece hora após status/contrato válidos; resposta de erro, corpo inválido ou header inválido não são fonte de tempo. Release conectado persiste referência real servidor/aparelho em chave própria, preserva deslocamento ao reiniciar e ignora o relógio artificial da demo. Amostra antiga não substitui nova; flutuação de latência até cinco segundos não causa retrocesso aparente, e diferença maior retorna à fonte real em vez de perpetuar salto do aparelho. Retrocesso offline continua detectável. A demo mantém seu relógio explícito separado pelo Metro.
- **Imutabilidade:** ajuste afeta apenas a geração de instantes futuros, sem percorrer, modificar, retaggear ou descartar vendas/filas existentes. Não se removeu a validação de caixa anterior/fechado na API para obter PASS. Gate do release exige marcador da hora precisa; verificador HTTP e script de APK exigem API com essa referência antes de liberar o artefato.
- **Validações:** tipos dos três workspaces aprovados; quatro arquivos/56 testes mobile dirigidos aprovados, incluindo seis casos novos de referência HTTP real, persistência/reinício, respostas antigas, latência, salto grande, falha de disco e recusa de resposta inválida. API `dev.test.ts`: cinco testes aprovados, incluindo referência precisa. Duas ferramentas operacionais aprovadas. `git diff --check` aprovado; logs `builds/piloto-real-relogio-*`. Testes usam tempos/HTTP controlados explicitamente e não constituem homologação externa da correção.
- **Retificação do CP 030:** as duas tentativas FAIL e seus resultados foram preservados; a primeira não registrou motivo detalhado, e a segunda registrou ID/rejeição. O roteiro não guardou o payload completo dessas vendas técnicas rejeitadas, portanto a frase anterior sobre payload preservado era excessiva. Nada foi alterado/reaplicado sob outro ID para fazer essas vendas passarem; os registros aceitos das contas técnicas continuam no servidor. O novo roteiro deve guardar o payload técnico antes de enviar e usar o mesmo relógio conectado do app para uma nova execução independente.
- **Arquivos/versão:** `apps/api/src/servidor.ts` e teste; `apps/mobile/src/{servicos/backendHttp,dados/dados,dados/relogio,release/relogio}.ts`, `releaseConectado.test.ts`; três verificadores/build e teste operacional; roadmap/checkpoints/roteiro. App segue candidato 0.1.7/versionCode 8, ainda sem artefato novo; base publicada 9fa944a, correção ainda sem commit neste registro.
- **Próximo passo:** publicar correção, repetir CI completo/PostgreSQL/SQLite, atualizar somente homologação e repetir smoke com BackendHttp/relógio real do release. Somente após o fluxo financeiro externo passar, compilar/verificar APK para o teste de produto real no celular do usuário. Produção e credenciais preservadas; autorização opcional de ambiente recusada continua sem execução.

<a id="cp-20261103-032-ci-da-hora-real-e-backup-r5-aprovados"></a>

## CP 20261103 032 CI da hora real e backup R5 aprovados

- **Data:** 03/11/2026, 00h53, America/Sao_Paulo.
- **Etapa/estado:** R3/R5, continuação do CP 031. Correção validada externamente no CI, antes da segunda implantação. Sem APK novo/Android físico/aceite.
- **Versão:** `a987c31c757891d911c7e201e97fbce60eaacc2c`, branch exclusiva `codex/pdv-homologacao-real`, app candidato 0.1.7/versionCode 8. Fonte da homologação conferida antes da implantação, ainda no 9fa944a e auto deploy false.
- **CI final da correção:** [41574379311](https://github.com/romulosutil/prisma-pdv-app/actions/runs/41574379311), completed/success no SHA a987c31: API 45 arquivos/592 testes em PostgreSQL 17 dedicado, mobile 63 arquivos/556 testes incluindo SQLite, shared 17 arquivos/172 testes, duas ferramentas, tipos, imagem Docker e isolamento aprovados. São 1.320 casos nas três suítes, além das duas ferramentas. Deploy validated main skipped, sem promoção da produção.
- **Backup atual:** painel confirmou `pdv-schema-r5-pre-hora-real-20261103`, arquivo `aladdin/pdv-postgres-homologacao/2026-11-03T03:49:40.967Z.sql.gz`, 17 kB, Success às 03:49:41 UTC informadas pelo servidor. Contém schema R5 e contas técnicas; não representa restauração/reconciliação validada. Backup anterior e agendamento existentes preservados.
- **Export da correção:** Android/Hermes conectado, 4.252.956 bytes, SHA256 `f4def92ec5aad3348fee4bddae21d3d7d4102df7a27a9a43276fef0cea863159`, 1.882 fontes; gate PASS, incluindo referência `x-pdv-agora`. Evidências `builds/piloto-real-ci-relogio-aprovado.log`, `piloto-real-bundle-relogio-verificacao.json` e export. Não é APK nem execução física.
- **Roteiro HTTP:** atualizado para usar a classe real de relógio do release com BackendHttp, guardar nova mutação técnica antes do envio e manter as tentativas rejeitadas anteriores separadas. Ainda não executado contra a API corrigida; nenhum ID/payload antigo será alterado para obter aprovação.
- **Roadmap:** item de regressão dedicada/CI novamente concluído para o SHA atual. Outras homologações e operação comercial continuam abertas.
- **Próximo passo:** implantar a987c31 somente em homologação com ambiente intacto, exigir header de hora precisa/rotas compatíveis e repetir fluxo financeiro HTTP; se aprovado, compilar/verificar o APK 0.1.7 para o usuário testar o produto real no celular.

<a id="cp-20261103-033-fluxo-financeiro-externo-aprovado"></a>

## CP 20261103 033 Fluxo financeiro externo aprovado

- **Data:** 03/11/2026, 00h54, America/Sao_Paulo.
- **Etapa/estado:** R0–R5, continuação do CP 032. Construção e validação externa HTTP aprovadas; APK em preparação e Android físico/aceite ainda pendentes.
- **Implantação:** correção `a987c31c757891d911c7e201e97fbce60eaacc2c` aplicada somente em `pdv-api-homologacao`, preservando ambiente, credenciais, banco/volumes e backups. CI do SHA aprovado no CP 032. Produção não promovida.
- **HTTP:** `verificar-operacao.mjs` PASS em 00h53min57s: saúde/banco 200 com referência precisa `x-pdv-agora`, desenvolvimento 404 e duas rotas suporte 401 sem sessão. Evidência `builds/piloto-real-http-hora.json`.
- **Smoke autenticado real:** sete grupos PASS com BackendHttp e relógio do release, em duas contas técnicas `example.invalid`, sem e-mail enviado ou acesso à conta do usuário: cadastro vazio/liberado/sem cartão; contratos equipe/lojas/suporte; uma reserva entre duas concorrentes e replay da abertura; EAN 7894900010015 via Open Food Facts; produto/venda/estoque/reenvio sem duplicação; entrada/sangria/retirada idempotentes com R$ 17,50 e isolamento entre empresas; fechamento/relatório/exportação autenticada. Venda R$ 7,00 e estoque de duas para uma unidade; preço/quantidade são dados do roteiro técnico, sem cobrança bancária.
- **Relógio:** diferença observada de 25.916 ms; hora de geração da venda 03:54:32.986 UTC, abertura 03:54:32.809 UTC informada pelo servidor. Venda criada uma vez já após receber referência precisa; enviada e reenviada com o mesmo ID/payload. Tentativas técnicas rejeitadas anteriores não foram editadas/reaplicadas. Nova mutação guardada antes do envio em `builds/piloto-real-venda-original.json`; resultados/log/script em `piloto-real-http-autenticado.*` e `homologar-piloto-real.mts`. Sessões técnicas encerradas, sem excluir os registros dessas contas.
- **Limites:** smoke não comprova OTP externo novo, uso de dois operadores da mesma loja no celular, SecureStore, câmera física, atualização/offline nativos, restauração R5 ou aceite humano. Credencial/identificação externa opcional continua intacta após recusa do CP 030. Backups/healthchecks e backlog externo/alertas preservados.
- **Próximo passo:** compilar APK interno 0.1.7/versionCode 8 com estes fontes e API, verificar assinatura/manifesto/bundle/inventário e fornecer o roteiro curto do produto real ao usuário; registrar resultado físico somente quando executado por ele.

<a id="cp-20261103-034-apk-real-017-pronto-para-teste-no-celular"></a>

## CP 20261103 034 APK real 0.1.7 pronto para teste no celular

- **Data:** 03/11/2026, 01h06, America/Sao_Paulo.
- **Etapa/estado:** R0–R5, entrega solicitada após CP 026 e continuação dos CPs 027–033. Candidato conectado construído e validado localmente/por CI/HTTP externo; teste físico e aceite pelo usuário ainda pendentes. R6 não iniciada.
- **Artefato:** `builds/pdv-homologacao-0.1.7.apk`, 74.689.899 bytes, SHA256 `5d9d543544c1b679ceb1de2c4234137e3bc061f297ba929898fa187d35df8429`; PDV Homologação, pacote `br.com.pdv.mobile.homologacao`, versão 0.1.7/versionCode 8, minSdk 24/target 36, ARM32/ARM64. Gradle SUCCESS em 6m35s, 657 tarefas (629 executadas/28 atualizadas); daemon exclusivo em IDLE conferido e encerrado após build. APKs anteriores preservados.
- **Assinatura/inventário:** APK Signature Scheme v2 válida, Android Debug, certificado SHA256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, igual ao interno 0.1.6. Uso de homologação, sem assinatura de distribuição. Manifesto/metadados/hash conferidos; 291 fontes atuais por SHA256, zero divergências. Manifesto vincula API a987c31, CI e mantém Android/aceite pendentes.
- **Bundle exato embarcado:** 4.252.956 bytes, SHA256 `4a886e07c3131359a2c9a9a64cb0a4a8174ce2750d22b1e3cb98b7b85bed205c`, 1.882 fontes, gate PASS (host/hora precisa/suporte e ausência de simuladores/fontes demo). Export independente do CP 032 tem hash próprio; não foi apresentado como o bundle exato do APK.
- **Comportamento entregue:** câmera/digitação reais, sem imagem ou leitura simulada; ambiente sempre explícito e ferramentas recusadas no conectado. Backend/semente/catálogo/atraso/tokenização/gateway/relógio/diagnóstico de demonstração fora do grafo; testes e demo legada separados. API assume billing disabled e proíbe mock em produção. Novas operações usam hora precisa autenticada da API, persistida entre reinícios, sem reescrever pendências antigas.
- **Validações externas:** CI [41574379311](https://github.com/romulosutil/prisma-pdv-app/actions/runs/41574379311) no commit `a987c31c757891d911c7e201e97fbce60eaacc2c`: 592 API/PostgreSQL 17 dedicado, 556 mobile/SQLite, 172 shared, duas ferramentas, tipos e imagem/isolamento aprovados. HTTPS e sete grupos de smoke financeiro reais PASS conforme CP 033. Fonte/commit da API de homologação reconferidos após build, auto deploy false. Backup pré-deploy e backup schema R5 têm arquivo/log Success conforme CPs 028/032; não se declarou restauração atual aprovada.
- **Produção/autorizações:** todas as mutações desta tarefa miraram exclusivamente homologação. Produção foi observada inicialmente em 73fb42f e, na conferência final, em `1cd184f79430baa5f58151b299a7fd2b6238bd6c`, fonte `codex/pdv-deploy` e auto deploy false; mudança não atribuída a esta tarefa, sem revertê-la ou modificar seu ambiente. Atualização opcional do User-Agent recusada pela revisão automática no CP 030 não foi executada por outro caminho; variáveis/credenciais preservadas.
- **Físico e limites:** ADB final retornou zero aparelhos autorizados, sem instalação. Roteiro de um produto real disponível; F01–F19, OTP externo novo, SecureStore/câmera/compartilhamento nativos, restauração R5/aparelho substituto, catálogo 100 itens/4G, operação/suporte e aceite humano continuam pendentes conforme os itens específicos. Conflitos antigos de turno e vendas fora da janela não ganham aceite excepcional por esta entrega. Backup externo/alertas seguem no backlog autorizado.
- **Arquivos/evidências:** `builds/pdv-homologacao-0.1.7-*`, `piloto-real-*.log/json`, `piloto-real-adb.json`; relatório R5, roteiro, README/API, deploy, roadmap e checkpoints atualizados. Runtime rastreável a987c31, alterações documentais finais sem commit próprio no instante deste registro. Os relatórios históricos foram preservados e o quadro inicial do roadmap consolidado para refletir a situação atual.
- **Validação documental final:** `git diff --check` aprovado; 78 links locais conferidos nos seis documentos alterados, nenhum destino ausente. Âncoras do roteiro, relatório e CP 034 presentes. Manifesto e SHA256 recalculado do APK conferem; nenhuma alteração de fonte runtime depois do CI/build.
- **Próximo passo:** usuário instala/atualiza PDV Homologação, cadastra a embalagem real e executa o roteiro curto (preço próprio, venda manual, sync, reinício/offline e fechamento). Registrar os resultados observados no aparelho antes de marcar qualquer cenário físico ou declarar piloto estável; depois concluir os demais itens R0–R5 e revisar a entrada em R6.

<a id="cp-20261103-035-captura-de-erros-e-perguntas-do-piloto"></a>

## CP 20261103 035 Captura de erros e perguntas do piloto

- **Data:** 03/11/2026, 01h26, America/Sao_Paulo.
- **Etapa/estado:** R5, esclarecimento do alcance do diagnóstico e preparação da coleta de respostas após CP 034. Entrega documental; Android físico e aceite humano continuam pendentes.
- **Construído:** roteiro atualizado com oito perguntas sobre acesso, câmera/cadastro, venda/valores, persistência, offline/reconexão, fechamento, usabilidade e adequação à loja; formato mínimo de relato de falha com horário, aparelho, passos e resultado esperado/observado. Roadmap vinculado ao esclarecimento, sem encerrar checkboxes físicos.
- **Conferido localmente:** `apps/mobile/config/isolamentoRelease.js`, `src/release/registro.ts` e `app/_layout.tsx` confirmam que o conectado exclui a captura automática de diagnóstico da demo. Tela/serviço de suporte confirmam envio manual com resumo opcional restrito. `apps/api/src/iniciarApi.ts` habilita logger; `servidor.ts` registra indicação sanitizada de erro interno com correlação do logger. Manifesto/verificação estática do APK 0.1.7/versionCode 8 conferidos; runtime continua a987c31, artefato e hash do CP 034 preservados.
- **Validações:** revisão cruzada entre fontes, manifesto, verificação do bundle e documentação do CP 034; conferência de whitespace e links novos registrada após edição. Nenhuma suíte de aplicação repetida para mudança apenas documental, nenhuma implantação, instalação, consulta de logs remotos ou captura de sessão realizada.
- **Limites:** logs da API não cobrem câmera/interface/offline; retenção e disponibilidade remotas não verificadas nesta revisão. Resumo manual não equivale a stack de travamento. Não se afirmou captura integral ou envio automático de falhas no celular. Não há resultados do questionário nem aprovação do usuário neste registro.
- **Arquivos:** `docs/roteiro-piloto-android.md`, `docs/roadmap-app-completo.md` e este histórico; alterações documentais sem commit próprio.
- **Próximo passo:** usuário executa o roteiro curto e responde às perguntas, incluindo falhas e trechos não testados; registrar evidências físicas somente após o relato/execução, investigar defeitos e repetir cenários afetados antes de declarar piloto estável.

<a id="cp-20261103-036-primeiro-relato-fisico-017-e-correcao-em-andamento"></a>

## CP 20261103 036 Primeiro relato físico 0.1.7 e correção em andamento

- **Data:** 03/11/2026, 10h16, America/Sao_Paulo.
- **Etapa/estado:** R0–R5, primeiro retorno humano após CP 035, teste físico interrompido e piloto não aprovado. Samsung S25 Ultra/Android 17 informados pelo usuário; versão 0.1.7 declarada no contexto, sem inventário ADB/novo SHA coletado do aparelho.
- **Evidência do usuário:** acesso seguiu sem código para onboarding/dashboard; cadastro sem nome sugerido; botão de abertura de caixa não localizado; app “piscando”. Execução parou no passo 4. CPF já cadastrado relatado, sem armazenar seu valor. Venda, sincronização, offline e fechamento do roteiro não foram executados. Não inferir sucesso ou falha dos cenários restantes.
- **Solicitação/autorização:** preparar diagnóstico para acompanhar o próximo uso e limpar a base de dados de homologação para novo cadastro. Escopo restrito ao PDV de homologação; produção e backups existentes preservados. Nenhuma limpeza realizada neste registro.
- **Investigação local:** `/contas` emite sessão no cadastro novo sem OTP; login existente exige código. Dashboard tem atalho fixo “Fechar caixa”; botão “Abrir caixa” existe na aba Caixa. Revalidação/aplicação periódica de sync acionam `conta.transicao`, que exibe overlay integral; isso é uma causa encontrada em código compatível com piscadas, ainda sem confirmação física. Ausência de sugestão pode ter causas distintas; não declarada defeito de catálogo sem diagnóstico.
- **Arquivos/validação:** relato adicionado ao roteiro e quadro do roadmap; fontes e evidências do CP 034 consultados. Revisão local de código, sem testes de correção, nova implantação/APK ou consulta de dados pessoais. Candidato anterior a987c31/0.1.7 preservado.
- **Pendências/próximo passo:** separar bloqueio de escrita de transição visual, dar acesso claro à abertura, informar estado da consulta do catálogo e instrumentar diagnóstico de homologação sem credenciais; comprovar backup/destino antes da limpeza autorizada, validar regressões e gerar o próximo APK rastreável. Android físico e aceite humano da correção permanecem abertos.

<a id="cp-20261103-037-diagnostico-018-e-correcao-local-do-fluxo"></a>

## CP 20261103 037 Diagnóstico 0.1.8 e correção local do fluxo

- **Data:** 03/11/2026, 10h37, America/Sao_Paulo.
- **Etapa/estado:** R5, avanço parcial após CP 036. Construído e validado localmente; APK 0.1.8/versionCode 9 ainda em preparação, sem homologação física/aceite ou limpeza confirmada.
- **Construído:** diagnóstico exclusivo da homologação, indicador visível e tela acessível antes/depois do login, buffer de 500 eventos persistido em chave própria; copiar/exportar por ação do usuário. Registra rotas normalizadas, ações conhecidas, códigos/status HTTP e duração, resultados de catálogo, estados da sincronização, transições e falhas JS/console sem mensagem livre. Eventos de outro perfil não são exportados. Sem gravação de tela, envio remoto automático, CPF, e-mail, OTP, token, corpos HTTP ou nomes pessoais; captura de falha nativa não prometida. Produção substitui o registrador por no-op e remove a interface/captura.
- **Correções:** sincronização/revalidação continuam serializadas e com trava de escrita, mas não exibem overlay integral de troca de usuário. Dashboard mostra “Abrir caixa” quando fechado e acesso ao fechamento quando aberto. Cadastro explica que nova conta abre sessão e que login existente usa OTP; não se implementou verificação de e-mail no cadastro nem se apresentou acesso sem código como OTP validado. Ausência de sugestão agora explica cobertura/indisponibilidade do catálogo, com causas técnicas registradas; produto do usuário ainda sem EAN/diagnóstico, portanto causa específica não determinada.
- **Validações locais:** tipos mobile aprovados. Suíte mobile completa: 555/560 casos passaram no sandbox; cinco de HTTP localhost falharam com rede restrita e passaram integralmente fora dela (`pdv-018-sync-http-testes.log`), sem mudar fixtures ou enfraquecer regras financeiras. Regressão adicional após ajuste de isolamento: quatro arquivos/32 casos aprovados, incluindo dois casos de UI da dashboard, privacidade/persistência/disco cheio/isolamento e ciclos reais API/SQLite sem transição visual. Duas ferramentas operacionais aprovadas, incluindo recusa de telemetria de homologação no grafo de produção. Logs em `builds/pdv-018-*.log`; primeira falha de expectativa da contagem de substituições preservada no resultado da execução, corrigida para refletir o isolamento adicional de produção.
- **Limpeza/externo:** inspeção do painel confirmou `DATABASE_URL` no serviço dedicado `aladdin_pdv-postgres-homologacao/pdv_homologacao`. Solicitado backup imediato `pdv-pre-reset-debug-018-20261103` no agendamento existente (chamada aceita, conclusão/arquivo ainda não conferidos). Conector não oferece SQL. CUA expirou e o controle nativo foi interrompido pela ferramenta por não verificar com segurança a URL do navegador; nenhuma ação destrutiva de UI ocorreu. HTTPS direto do domínio administrativo pgWeb retornou 404; nenhuma interface de banco foi habilitada e nenhuma porta foi exposta. Sem limpeza executada, sem alegar CPF liberado. SQL transacional com trava por nome de banco e confirmação de backup preparado em `scripts/limpar-homologacao-piloto.sql`, não executado.
- **Arquivos:** mobile `telemetria/*`, rota/layout/dashboard/cadastro, dados/hooks, instrumentação HTTP/catálogo/toast/botão, `app.json`, isolamento/gate e testes; SQL de limpeza e documentação. Base git a987c31 com alterações locais, sem commit próprio; API runtime/banco de produção intactos.
- **Limites/próximo passo:** compilar/verificar assinatura, manifesto, bundle e fontes da 0.1.8 e export de produção sem diagnóstico. Concluir limpeza somente via acesso administrativo verificável e após backup confirmado; dados locais do celular continuam preservados. Repetir teste físico com diagnóstico, sem declarar correção da piscada aprovada no Samsung ou piloto estável antes disso.

<a id="cp-20261103-038-apk-018-com-diagnostico-gerado"></a>

## CP 20261103 038 APK 0.1.8 com diagnóstico gerado

- **Data:** 03/11/2026, 10h48, America/Sao_Paulo.
- **Etapa/estado:** R5, continuação do CP 037. APK construído/verificado; regressão final e inspeção do export de produção em conclusão. Sem instalação ou aceite humano; limpeza de banco pendente.
- **Artefato:** `builds/pdv-homologacao-0.1.8.apk`, 74.711.651 bytes, SHA256 `339620752c4a8f25d2d1c2a2ac6814ae424a3695719551fa1921b3f16f1fd02e`, pacote `br.com.pdv.mobile.homologacao`, versionCode 9, minSdk 24/target 36. Gradle SUCCESS em 8m28s, 657 tarefas, 629 executadas/28 atualizadas. APK anterior preservado.
- **Assinatura/fontes:** v2 válida, certificado interno SHA256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, igual à 0.1.7. Inventário de 297 fontes/configurações conferido contra workspace após build: zero divergências. Base a987c31 com alterações locais da 0.1.8, sem novo commit/CI remoto atribuído.
- **Bundle exato:** 4.274.708 bytes, SHA256 `cb5eb396922001a3dbac7443e7c072203cc2564851decebe13303031d03c2548`, 1.889 fontes, gate PASS. Exige marcador e módulos do diagnóstico no APK de homologação, preservando a recusa dos simuladores/dados demo e do diagnóstico legado. Build de produção deve recusar o novo diagnóstico; export próprio ainda pendente neste registro.
- **API externa:** serviço de homologação reconferido no painel em a987c31, branch exclusiva, auto deploy false. Build confirmou saúde/hora precisa e suporte 401 sem sessão. Não houve implantação ou alteração do ambiente remoto nesta rodada.
- **Relato físico complementar:** usuário confirmou que a piscada deixa toda a tela branca e retorna, em todas as telas; adicionado ao roteiro. Compatível com o overlay global encontrado, mas não é prova de causa única nem de correção no Samsung. Os testes da 0.1.7 continuam interrompidos e a 0.1.8 ainda sem execução física.
- **Banco/limites:** backup solicitado no CP 037, sem nova confirmação de arquivo/conclusão. Consulta de logs do banco via conector retornou HTTP 400 e não constituiu evidência de backup. Limpeza não executada, CPF não declarado livre. Acesso SQL/SSH existente foi solicitado ao usuário, sem pedir senhas ou tokens. Produção, dados locais e backups anteriores preservados.
- **Próximo passo:** finalizar regressão/exclusão do diagnóstico em produção e registro de evidências; disponibilizar APK para reteste visual/coleta. Concluir limpeza somente após acesso administrativo verificável e backup confirmado, antes de prometer novo cadastro limpo.

<a id="cp-20261103-039-entrega-018-validada-localmente-e-limpeza-pendente"></a>

## CP 20261103 039 Entrega 0.1.8 validada localmente e limpeza pendente

- **Data:** 03/11/2026, 10h54, America/Sao_Paulo.
- **Etapa/estado:** R5, conclusão das verificações do artefato do CP 038, com pendência explícita da limpeza solicitada. Construído/validado localmente; sem novo CI remoto, execução física da 0.1.8 ou aceite humano.
- **Resultado:** APK 0.1.8/versionCode 9 disponível, 74.711.651 bytes, SHA256 `339620752c4a8f25d2d1c2a2ac6814ae424a3695719551fa1921b3f16f1fd02e`, assinatura interna v2 igual à 0.1.7. 297 fontes/configurações conferidos, zero divergências. Manifesto enriquecido com base/API a987c31, alterações locais, diagnóstico local/manual e pendências. APK e evidências anteriores preservados.
- **Regressão final:** 65 arquivos/562 testes mobile PASS, incluindo HTTP localhost, integração API/SQLite, novo acesso direto ao caixa, separação entre trava/overlay, privacidade/persistência/isolamento/disco cheio do diagnóstico. Tipos mobile PASS; duas ferramentas operacionais PASS. Logs `pdv-018-mobile-testes-final.log`, `pdv-018-typecheck.log` e `pdv-018-ferramentas-final.log`. Falhas anteriores de sandbox e expectativa do mapa não foram tratadas como PASS; repetição final completa confirmou o resultado sem enfraquecer contratos.
- **Produção isolada:** export Android/Hermes de produção com 4.255.852 bytes, SHA256 `ee1b9750ebf8a4bed59c2f2e46aac2c2c94854f97aaf26d98f75ced281ec331d`, 1.884 fontes, zero módulos de telemetria; gate PASS, sem marcador/diagnóstico de homologação. Primeira tentativa restrita falhou por permission denied ao escrever index.hbc temporário; repetição autorizada fora do sandbox passou, sem mudar runtime. Arquivos `pdv-018-producao-{export-final.log,verificacao.json}` e diretório de export. Isso não é APK nem publicação/implantação em produção.
- **Recursos de build:** daemon Gradle 37956/9.4.1 conferido IDLE, último diretório C:/p/apps/mobile/android, processo java do Gradle verificado e encerrado para liberar memória; nenhum processo de outro projeto foi interrompido.
- **Limpeza ainda pendente:** backup `pdv-pre-reset-debug-018-20261103` solicitado, sem confirmação de arquivo/conclusão. Conector sem SQL; acesso administrativo pgWeb retorna 404; controle de navegador interrompido por não verificar sua URL com segurança. Nenhuma porta/interface extra foi habilitada, nenhuma credencial retransmitida e nenhum comando de exclusão executado. SQL protegido preparado em `scripts/limpar-homologacao-piloto.sql`, não executado. Não se declarou CPF livre nem base vazia. Acesso SQL/SSH existente solicitado ao usuário sem pedir segredos; dados do aparelho preservados.
- **Documentação/arquivos:** README, relatório R5, roteiro, roadmap e histórico atualizados. Nenhum commit criado apenas para checkpoint. Fontes runtime iguais ao inventário do APK; build novo não reutiliza CI da API como aprovação dos fontes mobile novos.
- **Conferência final:** `git diff --check` PASS, 94 links locais/âncoras conferidos nos cinco documentos, sem falhas após preservar âncoras dos candidatos anterior/atual (`pdv-018-docs-verificacao.json`). Hash/manifesto e 297 fontes reconferidos sem divergências depois dos exports. Executor pwsh 6316, identificado pelo comando `scripts/build-android.ps1`, permaneceu aberto após Gradle SUCCESS e geração de APK/hash/manifesto; encerrado somente após essas verificações. O encerramento do executor não é apresentado como sucesso de seu código de saída; as evidências válidas são o log Gradle, assinatura, gate, hash e inventário do artefato já concluído.
- **Limites/próximo passo:** usuário atualiza sem apagar dados e retesta a tela branca em várias telas/45s parado, copiando/exportando o diagnóstico logo após o comportamento. Compartilhamento/câmera/SecureStore/financeiro/offline físicos continuam sem aprovação. Concluir limpeza autorizada quando houver acesso administrativo verificável e backup comprovado; revisar evidência e pendências locais antes de qualquer reinício da instalação de teste. Depois repetir o ciclo financeiro e os demais cenários R0–R5, mantendo R6 fechada até piloto estável.

<a id="cp-20261103-040-auditoria-estatica-android-018-e-parecer-de-uat"></a>

## CP 20261103 040 Auditoria estática Android 0.1.8 e parecer de UAT

- **Data:** 03/11/2026, 11h27, America/Sao_Paulo.
- **Etapa/estado:** R0–R5, auditoria solicitada antes de testes manuais, complementando CP 039. Relatório construído e validações estáticas locais concluídas; correções propostas não aplicadas, sem novo teste externo/físico ou aprovação do usuário. R6 permanece sem critério de entrada.
- **Entrega:** [relatório técnico](auditoria-estatica-android-0.1.8.md) pelos cinco pilares: inventário de todas as entradas/wrappers encontrados no mobile e seus contêineres, tratamento de rede/exceções, build/ciclo de vida/compatibilidade Android, segurança/privacidade e fluxos de negócio. São 18 achados (5 P1 e 13 P2), cada um com caminho/linha, risco e snippet/recomendação; 24 cenários críticos UAT complementam F01–F19. Riscos de IME, desempenho e compartilhamento dependentes do aparelho foram distinguidos de contradições demonstráveis por leitura. Nenhuma conformidade WCAG ou ausência universal de defeitos foi certificada.
- **Achados prioritários:** leitura de pendência da gestão rejeita sem catch, inclusive no finally; chave Pix compara escopo da loja com escopo que inclui operador; pausa da câmera usa prop iOS sem interromper a captura Android; JSON é apagado após retorno do chooser sem garantia de consumo pelo destino; cadastro novo emite sessão sem comprovar posse do e-mail (não é bypass de OTP em conta existente). Outros achados incluem scanner manual sem scroll, buscas com campo fixo, IME/CTA sem garantia física, entrada de estoque rápido incompatível com regra de movimentos, navegação antes de persistir item, ROI apenas visual, listas sem virtualização, permissões herdadas e R8 desligado. Snippets são propostas não executadas.
- **Censo/rastreabilidade:** 326 arquivos de fontes próprios/23.461 linhas nas árvores mobile/API/shared inspecionadas por censo, 57 arquivos de rotas/layouts, busca AST identificando 26 arquivos com entradas/wrappers/scanner. Revisão manual das áreas que sustentam os achados; não apresentada como leitura manual de toda dependência. HEAD observado `559df39` (commit documental prévio), API/base runtime do manifesto `a987c31` e alterações locais pré-existentes preservados. Nenhum commit criado.
- **APK reconferido:** 0.1.8/versionCode 9, pacote `br.com.pdv.mobile.homologacao`, 74.711.651 bytes, SHA256 `339620752c4a8f25d2d1c2a2ac6814ae424a3695719551fa1921b3f16f1fd02e`; 297 hashes de fontes/configurações, zero divergências. Mapa com 1.889 módulos, telemetria de homologação presente e implementações demo pesquisadas ausentes. Assinatura v2 verificada novamente, certificado interno; manifesto sem `debuggable=true`, minSdk 24/target 36/compile 37, `adjustResize` existente. Zipalign com páginas de 16 KB PASS; 29/29 ELF ARM64 com alinhamento de pelo menos 16 KB. As 29 libs ARM32 foram distinguidas; alinhamento de 4 KB nesse ABI não foi classificado como defeito de ARM64. Nenhuma instalação/execução foi inferida desses checks.
- **Validações desta rodada:** typecheck dos três workspaces API/mobile/shared PASS, manifesto binário/regras reais de backup/assinatura extraídos e revisados, censo AST/hash e inspeção ELF concluídos. Testes anteriores de 562 mobile/65 arquivos e duas ferramentas foram consultados no log do CP 039, sem alegar reexecução ou que cobrem os defeitos recém-encontrados. Npm audit atualizado, profiler, heap dump, lint Android, CI remoto, HTTP de homologação e aparelho físico não executados nesta auditoria. `git diff --check` PASS (avisos preexistentes de LF/CRLF, sem erros); 78 links locais/âncoras nos três documentos conferidos, nenhuma falha; 18 achados/5 P1/13 P2 e 24 cenários contados automaticamente; whitespace e cercas Markdown aprovados em `builds/auditoria-018-documentos.json`.
- **Arquivos/evidências:** `docs/auditoria-estatica-android-0.1.8.md`, este checkpoint e roadmap; evidências locais ignoradas pelo Git em `builds/auditoria-estatica-018{.mjs,-evidencias.json}` e `builds/auditoria-018-{manifesto-apk.txt,backup-apk.txt,assinatura.txt,binario.json,typecheck.log}`. Fontes runtime/configuração/APK não alterados pela auditoria; sem deploy ou operação de banco.
- **Parecer:** artefato íntegro para inspeção e reteste técnico supervisionado em homologação com dados de teste; **não apto para piloto aberto com usuários reais ou operação comercial**. UAT controlado com usuários representativos/transações fictícias deve seguir correções P1 e P2 dos fluxos incluídos, novo APK e evidência física. R8 desativado/assinatura interna também impedem tratar o APK como distribuição definitiva.
- **Limites/autorizações:** limpeza de homologação, comprovação do backup pré-reset, restauração do schema atual e aceite continuam pendentes conforme CP 039. Nenhuma exclusão/limpeza ou mudança em produção, cofre, dados locais e backups. Cópia externa e alertas continuam no backlog autorizado, sem novo bloqueio de MVP por essa frente. A limitação de Auto Backup do aparelho foi distinguida de cópia externa do servidor e da política de recuperar somente o sincronizado.
- **Próximo passo:** corrigir H01/N01/C01/C03 e resolver o modelo S04 antes de ampliar para usuários/dados reais; tratar os demais cenários afetados, criar regressões de falha orientadas aos achados, repetir checks necessários e gerar novo APK rastreável. Depois executar o reteste visual no Samsung e ciclo financeiro/offline com dois operadores/dois aparelhos, concluir F01–F19/recuperação/atendimento e registrar aceite humano. A auditoria não modificou o APK 0.1.8 já existente.

<a id="cp-20261103-041-correcoes-mobile-da-auditoria-em-andamento"></a>

## CP 20261103 041 Correções mobile da auditoria em andamento

- **Data:** 03/11/2026, 11h38, America/Sao_Paulo.
- **Etapa/estado:** R5, primeiro lote da correção dos 18 achados autorizado pelo usuário após CP 040. Fontes mobile em construção para 0.1.9/versionCode 10; nenhum APK novo, deploy, teste físico ou aceite neste lote.
- **Construído:** catch de pendência da gestão inclusive no finally; chave Pix por loja sem confundir operador; desmontagem da câmera por pausa/modal/AppState; formulário manual no sheet; busca em cabeçalho rolável; KeyboardAvoidingView Android/corpo/CTA; catch nativo de acessibilidade/câmera/clipboard; mensagens locais de cadastro; 15 coleções paginadas em 25 itens; entrada de estoque existente direcionada à gestão; aguarda inclusão durável na busca; remove promessa falsa de ROI; aviso de recuperação somente do sincronizado. Exportações usam arquivos únicos, retenção de 1 h e limpeza posterior, sem apagar no retorno do chooser. R8/shrink e bloqueio de armazenamento/biometria preparados, ainda sem artefato nativo validado.
- **Validação:** quatro arquivos/24 casos PASS em builds/pdv-019-lote1-testes.log, incluindo erro de leitura na montagem/finally, 409 conhecidos, Pix dono/gerente/operador e troca de loja, lista com 1.000 clientes e última página. Typecheck intermediário anterior aos últimos ajustes aprovado; nova checagem do lote em conclusão, sem afirmar PASS antes do resultado. Regressão completa e testes adicionais de câmera/teclado/arquivos/fluxos ainda pendentes.
- **Arquivos:** componentes/telas/serviços mobile e testes, app.json 0.1.9/10; matriz em docs/correcoes-auditoria-0.1.9.md. Alterações anteriores preservadas, sem commit próprio. APK 0.1.8 e seu hash permanecem intactos.
- **Limites/próximo passo:** implementar S04 na API/UI/fila de e-mail com comprovação anterior à criação de empresa/sessão; validar migração/concorrência/expiração/rate limit, compatibilidade e implantação só de homologação. Depois concluir regressões, compilar/inspecionar novo APK com diagnóstico e mapping. Nenhum checkbox físico encerrado. Limpeza da base, recuperação atual e backups mantêm estado anterior; produção preservada.

<a id="cp-20261103-042-cadastro-verificado-e-regressoes-locais"></a>

## CP 20261103 042 Cadastro verificado e regressões locais

- **Data:** 03/11/2026, 11h54, America/Sao_Paulo.
- **Etapa/estado:** R5, continuação do CP 041; tratamento dos 18 achados construído nos fontes do candidato 0.1.9/10. Validação local concluída no escopo abaixo; CI PostgreSQL, implantação e APK R8 em preparação. Sem Android físico/aceite.
- **Cadastro S04:** desafio anterior à criação de empresa/usuário/aparelho/sessão, vinculado a e-mail/aparelho, TTL de 10 min, uso único, cinco tentativas persistidas e rate limit por e-mail/IP. Fila cifrada aceita desafio sem conta; migração aditiva 0012 adiciona finalidade/aparelho e permite conta nula na entrega. Login só aceita OTP da finalidade login. Modo email exige prova; bootstrap de produção recusa modo desenvolvimento. Fixture/demo local legado sem canal real foi preservado explicitamente, sem fallback em produção. UI solicita/confirma código, não persiste código em rascunho, e build conectado agora exige contrato de cadastro ativo na API. Sem e-mail real enviado nesta validação.
- **Demais correções:** matriz docs/correcoes-auditoria-0.1.9.md atualizada; 16 coleções com páginas de 25 itens; retenção de exportação de uma hora e limpeza restrita em próxima abertura/exportação, sem apagar no chooser; regressões adicionais de câmera, arquivos e venda durável. Flags R8/shrink e permissões serão comprovadas no artefato final. ROI foi resolvida retirando promessa de restrição geométrica e orientando apontar um código/conferir produto; não se prometeu filtro implementado.
- **Validação local:** API 46 arquivos/538 casos PGlite PASS (builds/pdv-019-api-completo.log); mobile completo 68 arquivos/575 casos PASS (pdv-019-mobile-completo-final.log), mais dois arquivos/três casos de busca/cadastro rápido PASS adicionados depois (pdv-019-fluxos-dirigidos.log); shared 17 arquivos/172 casos PASS; duas ferramentas PASS; tipos API/mobile/shared PASS em pdv-019-tipos-candidato.log. Casos de prova, expiração, tentativa, vínculo, concorrência e worker sem empresa foram exercitados. Cinco casos HTTP localhost passaram fora do sandbox, sem mudar regras financeiras.
- **Falhas preservadas:** primeira suíte mobile no sandbox teve cinco falhas de localhost e 570 PASS; fila PGlite em rodadas restritas teve timeouts de 5 s e passou na suíte completa fora da restrição; teste novo de scanner inicialmente não mockava fontes binárias, fixture corrigido e cinco casos de scanner/exportações aprovados. Nada foi apresentado como PASS antes da repetição válida. Contagens PGlite não incluem casos condicionais PostgreSQL do CI.
- **Backup externo à máquina de trabalho, no disco local do servidor:** criação solicitada pelo conector e conclusão lida no painel dedicado de homologação. Nome pdv-pre-cadastro-verificado-019-20261103, arquivo aladdin/pdv-postgres-homologacao/2026-11-03T14:48:18.870Z.sql.gz, 20,8 kB, Success às 14:48:20 UTC (11:48:20 São Paulo). Não equivale a cópia externa do servidor nem a restauração validada. Agendamento/retenção existentes preservados.
- **Ambiente/arquivos:** branch codex/pdv-homologacao-real; API ainda a987c31, auto deploy false, configuração preservada. API/schema/migração/fila/contratos e mobile/componentes/telas/testes/build script/matriz alterados. Alterações anteriores da 0.1.8 preservadas e necessárias ao diagnóstico. Sem commit só para checkpoint. Nenhum deploy, SQL de limpeza, porta adicional ou alteração de produção executados.
- **Próximo passo:** fixar fontes relevantes em commit da branch exclusiva, executar CI com PostgreSQL 17 e imagem; implantar somente a API de homologação com o backup comprovado e exigir rotas/contrato de cadastro, sem enviar e-mails a terceiros. Depois compilar novo APK com diagnóstico, R8/mapping, assinatura/manifesto/bundle/hash/inventário e concluir documentação do reteste. Teclado, TalkBack, câmera, destinatário de arquivos, SMTP novo e fluxo financeiro/offline físicos continuam para o usuário.

<a id="cp-20261103-043-ci-e-api-019-em-homologacao"></a>

## CP 20261103 043 CI e API 0.1.9 em homologação

- **Data:** 03/11/2026, 12h01, America/Sao_Paulo.
- **Etapa/estado:** R5, continuação do CP 042. Fontes fixados em df418233899256e33ba3d7c8e5c92fa164ac5185 na branch exclusiva codex/pdv-homologacao-real; CI remoto aprovado e API de homologação compatível implantada. APK R8 ainda não gerado; físico/aceite pendentes.
- **CI:** https://github.com/romulosutil/prisma-pdv-app/actions/runs/41658558931, completed/success no SHA df41823. Tipos, duas ferramentas, shared, API em PostgreSQL 17 dedicado, mobile completo com os novos arquivos, construção da imagem e isolamento PASS. Job Deploy validated main pulado; nenhuma promoção de produção. Logs/resultado em builds/pdv-019-ci-aprovado.log e pdv-019-ci-resultado.json; contagens detalhadas serão consolidadas na matriz da entrega.
- **Implantação autorizada:** deploy somente aladdin/pdv-api-homologacao, após backup comprovado no CP 042 e CI. API reporta commit df41823; ambiente e fonte comparados byte a byte com a configuração anterior e preservados, auto deploy false. Migração aditiva 0012 aplicada pelo startup normal. Não foram modificadas variáveis, credenciais, permissões, volumes, portas, retenção, banco de produção ou serviço pdv-api.
- **HTTPS externo:** saúde 200 com hora precisa; GET /auth/cadastro/configuracao retorna contrato 1 e verificacaoEmail true; POST /contas com campos válidos mas sem desafio/código é recusado com 400 cadastro_codigo_necessario. Nenhum e-mail enviado ou conta criada nesse smoke. Evidência builds/pdv-019-http-compatibilidade.json às 15:01:02 UTC (12:01:02 local). Fluxo completo de OTP no SMTP/Android real continua pendente; testes locais e CI validaram a lógica/fila em seus próprios ambientes.
- **Construído/arquivos:** matriz de correções e roteiro da 0.1.9 atualizados; F17 agora exige arquivo legível após chooser e limpeza posterior por TTL. README passa a refletir R8 reativado e o risco histórico do BarcodeAnalyzer que exige reteste real. Alterações documentais finais ainda locais; fontes runtime iguais ao commit do CI.
- **Próximo passo:** compilar 0.1.9/versionCode 10 com diagnóstico e R8, guardar mapping e conferir manifesto/permissões/assinatura/bundle/hash/fontes e alinhamentos; depois disponibilizar o candidato para reteste físico supervisionado, sem declarar scanner/teclado/SecureStore/compartilhamento homologados. Limpeza de homologação e restauração atual continuam fora desta implantação; dados e backups preservados.

<a id="cp-20261103-044-apk-019-otimizado-gerado"></a>

## CP 20261103 044 APK 0.1.9 otimizado gerado

- **Data:** 03/11/2026, 12h12, America/Sao_Paulo.
- **Etapa/estado:** R5, continuação do CP 043. APK 0.1.9/versionCode 10 construído com diagnóstico e R8; inspeção do export de produção e documentação final em conclusão. Nenhuma instalação ou homologação física/aceite inferida.
- **Artefato:** builds/pdv-homologacao-0.1.9.apk, 64.622.028 bytes, SHA256 5fe5118f97dee38c4f92710f9ab433d8f4e7d61cc0cd89d50945ff28ee8448f0, pacote br.com.pdv.mobile.homologacao. Build exit 0, Gradle SUCCESS em 8m44s, 656 tarefas (628 executadas/28 atualizadas), minifyReleaseWithR8 e redução de recursos executados. APKs anteriores preservados.
- **Conferência:** assinatura interna v2 aprovada; 299 fontes/configurações atuais por SHA256, zero divergências. Bundle exato 4.286.368 bytes, SHA256 e7accd84e11ed783784e8d012f367858588120dcb46a32dff741e88d8ee0cf96, 1.891 módulos, gate conectado PASS com diagnóstico de homologação e sem implementações demo pesquisadas. MinSdk 24/target 36/compile 37, ARM32/ARM64; zipalign 16 KB PASS e 29/29 libs ARM64 com alinhamento ELF de pelo menos 16 KB. ARM32 com 4 KB não confundido com falha ARM64.
- **R8/permissões:** mapping preservado em builds/pdv-homologacao-0.1.9-r8-mapping.txt (92.549.712 bytes), SHA256 53e375148581a15360d454c6b4f0d47751442c365217bc2db8f16120381e9cfa; Gradle properties true para minify/shrink. BarhopperV3, CommonComponentRegistrar e ExpoCameraView conservam nomes no mapping; não equivale a ler código real no aparelho. Manifesto final não declara READ/WRITE_EXTERNAL_STORAGE, USE_BIOMETRIC/USE_FINGERPRINT nem RECORD_AUDIO. Permanecem câmera/internet/vibração e permissões normais de rede/áudio/wake lock usadas pelas dependências; permissão interna signature preservada.
- **CI/API:** fonte runtime df41823, CI 41658558931 aprovado com 597 API/PostgreSQL 17, 578 mobile, 172 shared (1.347 casos), tipos, duas ferramentas e imagem/isolamento. API de homologação no mesmo SHA, configuração preservada; contrato/saúde/recusa de cadastro sem prova conferidos por HTTPS no CP 043. Produção não promovida.
- **Evidências:** builds/pdv-homologacao-0.1.9-*, auditoria-estatica-019-evidencias.json/coletor .mjs, pdv-019-manifesto-binario.txt e pdv-019-r8-alinhamento.json. Aviso de APIs Gradle depreciadas para Gradle 10 foi mantido; build usa 9.4.1, sem afirmar falha Android causada pelo aviso. Nenhuma mudança runtime depois do CI/build.
- **Próximo passo:** concluir export Android de produção sem telemetria, consolidar manifesto/matriz/roteiro/roadmap e conferir links/hash/fontes novamente. Entregar o candidato para reteste supervisionado no Samsung, especialmente leitura real com R8, teclado/fonte/TalkBack, arquivos recebidos e cadastro com e-mail externo. Limpeza da base, restauração atual, F01–F19 e aceite humano continuam abertos; dados locais e backups preservados.

<a id="cp-20261103-045-apk-019-pronto-para-reteste"></a>

## CP 20261103 045 APK 0.1.9 pronto para reteste

- **Data:** 03/11/2026, 12h20, America/Sao_Paulo.
- **Etapa/estado:** R5, entrega final das correções autorizadas após CP 040, sucedendo CP 041–044. Os 18 achados receberam tratamento nos fontes e validações automatizadas; candidato pronto para reteste supervisionado no celular. Sem novo teste Android físico ou aprovação humana/comercial. R6 não iniciada.
- **Artefato:** `builds/pdv-homologacao-0.1.9.apk`, 0.1.9/versionCode 10, pacote br.com.pdv.mobile.homologacao, 64.622.028 bytes, SHA256 `5fe5118f97dee38c4f92710f9ab433d8f4e7d61cc0cd89d50945ff28ee8448f0`. Assinatura v2 com mesmo certificado da 0.1.8; atualizar sem desinstalar/limpar dados. Diagnóstico local/manual exclusivo de homologação, sem envio automático. APKs anteriores preservados. README de entrega junto ao APK.
- **Rastreabilidade/validações:** runtime commit `df418233899256e33ba3d7c8e5c92fa164ac5185`; [CI 41658558931](https://github.com/romulosutil/prisma-pdv-app/actions/runs/41658558931) PASS: API 46 arquivos/597 casos PostgreSQL 17, mobile 70 arquivos/578 casos, shared 17 arquivos/172 casos, total 1.347, duas ferramentas, tipos, imagem/isolamento. Build release R8/shrink PASS, mapping 12.414 classes/9.519 renomeadas; manifesto/permissões, assinatura, bundle homologação/diagnóstico e ausência das implementações demo pesquisadas conferidos. Min24/target36/compile37, zipalign 16 KB e 29/29 libs ELF ARM64 alinhadas. As 299 fontes/configurações conferidas não divergem do artefato; nenhuma alteração runtime após CI/build. Detalhes e hashes no CP 044 e na matriz.
- **Export adicional:** export Android/Hermes de produção PASS, 4.269.596 bytes, SHA256 `c6ea3be37a1daf6af131809947d153c8a60f655754bcd416663233ea92bd4b82`, 1.888 módulos, sem diagnóstico de homologação; somente inspeção, sem gerar/publicar APK ou promover API em produção.
- **API e dados:** homologação implantada no mesmo commit, ambiente/fonte/credenciais e autoDeploy false preservados; HTTPS confirmou saúde/hora, contrato 1/verificação de e-mail ativa e HTTP 400 cadastro_codigo_necessario sem prova. Nenhum e-mail real enviado/conta criada pelo smoke. Backup local pré-migração comprovado no CP 042/043, sem alegar restauração. Base não foi limpa; sessões, dados locais, backups e produção preservados. Cópia externa e alertas permanecem no backlog autorizado, sem novo bloqueio de MVP.
- **Documentação:** roadmap, README, matriz dos 18 achados, roteiro de piloto e evidência R5 atualizados; seis documentos/112 links e âncoras, whitespace/cercas e git diff --check PASS, zero falhas, em `builds/pdv-019-documentos-verificacao.json`. Hash do APK reconferido e 299 fontes sem divergência. Evidências finais em `builds/pdv-019-conferencia-final.json`, `pdv-019-producao-verificacao.json` e manifesto/fontes/assinatura/mapping do APK; artefatos locais ignorados pelo Git. Ajustes documentais de fechamento sem novo commit exclusivo para checkpoint.
- **Limites explícitos:** S03 resolve o aviso/política de recuperar somente sincronizado, sem restaurar pendências nunca enviadas; N04 remove a falsa promessa da moldura, sem filtro geométrico de ROI. R8/MLKit exige código real no aparelho, especialmente pelo histórico BarcodeAnalyzer; CI não valida teclado/TalkBack, SecureStore, compartilhamento recebido, novo OTP externo ou desempenho físico. Restauração do schema atual, limpeza da base, F01–F19, atendimento e aceite humano continuam pendentes.
- **Próximo passo:** usuário instalar este APK exato no Samsung sem limpar dados e executar [roteiro de reteste 0.1.9](roteiro-piloto-android.md#reteste-das-correções-da-auditoria-na-019), registrando versão, passos e diagnóstico manual se houver falha. Priorizar scanner/pausa/retorno/permissão, IME/fonte/TalkBack, cadastro novo com e-mail, Pix por perfil, estoque/inclusão durável, arquivos recebidos e transações fictícias com sincronização/offline. Só o reteste físico e o aceite podem encerrar os itens correspondentes do piloto.

<a id="cp-20261103-046-instalacao-relatada-e-reteste-guiado"></a>

## CP 20261103 046 Instalação relatada e reteste guiado

- **Data:** 03/11/2026, 12h30, America/Sao_Paulo.
- **Etapa/estado:** R5, continuidade do CP 045. Usuário informou que instalou o candidato e pediu instruções. Instalação relatada pelo usuário; versão exibida, hash instalado, aparelho atual e comportamento ainda sem nova comprovação. Nenhum cenário F01–F19 marcado PASS e nenhum aceite inferido.
- **Orientação:** iniciar rodada curta de acesso pela sessão existente ou login por e-mail, observar dashboard por 45 s e navegação, ler embalagem/câmera real, digitação manual/teclado, pausar/retomar câmera e exportar diagnóstico. Conta já cadastrada deve usar Entrar; não criar duplicata ou limpar dados para contornar acesso. Relatar telas/horário/mensagens e dados técnicos, sem enviar código de acesso. Cadastro novo/OTP, ciclo financeiro e demais perfis serão conduzidos após confirmar esses pontos iniciais.
- **Arquivos/validação:** checkpoint e nota no roadmap; roteiro 0.1.9 existente consultado. Sem alteração runtime, build, deploy ou banco nesta orientação; APK e CI mantêm as evidências do CP 045. Verificação documental de links/diff repetida, sem substituir teste no celular.
- **Próximo passo:** receber o resultado da primeira rodada, registrar apenas observações efetivas e conduzir venda/caixa/offline com valores conhecidos se abertura/acesso/câmera estiverem utilizáveis. Se houver falha, coletar histórico manual e preservar app/filas. Piloto e aceite continuam pendentes.

<a id="cp-20261103-047-diagnostico-fisico-019-e-investigacao-do-login"></a>

## CP 20261103 047 Diagnóstico físico 0.1.9 e investigação do login

- **Data:** 03/11/2026, 12h40, America/Sao_Paulo.
- **Etapa/estado:** R5, retorno do CP 046. Recebido diagnóstico manual de 293 eventos (limite 500), versão informada pelo app 0.1.9/homologação, Samsung SM-S938B/Android 17; intervalo 12h28m40–12h36m04 local. Usuário confirmou leitura do código pela câmera, sem reconhecimento do produto, e relatou problema grave de compliance no login, ainda sem descrição do comportamento exato. Não inferir violação de autenticação ou conclusão jurídica apenas desse relato.
- **Evidência física recebida:** login POST /auth/vinculos e /auth/login 200 às 12h33m09–10; solicitação anterior de código 204 não comprova isoladamente entrega SMTP. Nova solicitação /auth/codigo 429 às 12h33m13, ainda na rota de entrada; dashboard só registrada às 12h33m19 após passagem por boas-vindas. Fontes permitem permanecer em /entrar autenticado para trocar perfil, e a tela não navega explicitamente após sucesso; investigar conclusão do login inclusive remontagem pelo escopo. Não há evidência suficiente de acesso sem prova, troca indevida de conta ou vazamento.
- **Catálogo/câmera:** consulta às 12h34m57 retornou 404/ausente em 986 ms, seguida de formulário manual; outra entrada às 12h35m52 falhou na normalização do EAN antes de consultar a API. O código não é incluído no histórico; não determinar motivo exato da invalidade ou cobertura do produto. Leitura física relatada pelo usuário; sucesso de identificação no catálogo não comprovado.
- **Outros resultados e limites:** três HTTP 409 (dois endpoints sanitizados como outro, um /contas), sem corpo/código de erro para atribuir a CPF/e-mail. Um /sync/push 200 e último estado ocioso/zero pendências/rejeições às 12h35m56; sem payload/IDs para comprovar cadastro específico ou integridade financeira. Sem evento erro/aviso_interface, o que não exclui falha nativa/visual. Uma transição bloqueante de primeiro plano durante login (~191 ms); as demais ativações bloqueantes registradas são de segundo plano, sem provar ausência visual de piscada. A rota /caixa/abrir foi acessada, sem reserva/venda/fechamento comprovados. Nenhum F01–F19 encerrado nem aceite inferido.
- **Validação/arquivos:** JSON válido, eventos ordenados, mesma execução, contagens e status conferidos por script local. Original preservado em builds/pdv-019-reteste-samsung-20261103.json, SHA256 3ba08609a44639b43628d42a3e76051673cbc6fdd272b18f9919cc3bd3b5f4f9; resumo derivado no mesmo prefixo com sufixo -resumo.json. Regressões locais API/PGlite: conta, limites de autenticação, cadastro verificado e equipe, quatro arquivos/44 casos PASS; mobile: recuperação/tela, fluxo de acesso e backend, três arquivos/29 casos PASS. Incluem recusa de código usado/expirado, cinco falhas, rate limit e acesso protegido; não comprovam comportamento físico nem conformidade integral. Logs builds/pdv-019-reteste-login-{api,mobile}.log. Artefatos locais ignorados pelo Git; checkpoint e roadmap versionáveis. git diff --check PASS (avisos LF/CRLF). Sem alteração runtime, build, deploy ou banco externo neste lote.
- **Próximo passo:** esclarecer o comportamento de login percebido e reproduzir/corrigir a permanência após acesso aceito com regressões de primeiro login, reautenticação, troca de perfil e recuperação; preservar provas e dados. Homologação física completa e aceite continuam pendentes.

<a id="cp-20261103-048-causas-do-cadastro-tardio-e-login"></a>

## CP 20261103 048 Causas do cadastro tardio e login

- **Data:** 03/11/2026, 12h50, America/Sao_Paulo.
- **Etapa/estado:** R5, esclarecimento do CP 047. Usuário informou que a trava de CPF/e-mail aparecia tarde e que, após escolher entrar em conta existente, viu erro e mesmo assim acessou. Relato de fluxo inconsistente, sem relato de dados de terceiro ou dispensa de OTP.
- **Diagnóstico:** primeira tela valida somente formato e avança para /loja; /auth/cadastro/codigo confere e-mail, enquanto CPF/CNPJ é conferido apenas em /contas após OTP. No histórico, dois 409 antes do desafio e um 409 em /contas são compatíveis com esse fluxo, sem código/corpo para atribuição definitiva. Login 200 às 12h33m10 antecede /auth/codigo 429 às 12h33m13: o erro posterior é de nova emissão, quando já existia sessão. Guarda permite /entrar para troca de perfil e não conclui a navegação no primeiro acesso; Stack remonta ao mudar escopo e perde o estado do formulário.
- **Avanço:** causas localizadas nos fontes; correção em preparação para conferir duplicidade já na primeira etapa, reutilizar o desafio sem guardar OTP no rascunho, oferecer caminho direto de login e encerrar a tela de entrada após acesso confirmado mesmo com remontagem. Manter conferência final no servidor para concorrência, prova de e-mail, rate limits e isolamento.
- **Validação/limites:** evidência recebida e 73 testes locais do CP 047 preservados; regressões específicas da correção ainda pendentes. JSON não contém textos exibidos, CPF/e-mail nem identidade da conta; não prometer diagnóstico desses campos. Sem build/deploy/banco externo/limpeza; APK 0.1.9 permanece intacto.
- **Próximo passo:** implementar e reproduzir cadastro duplicado antes da loja/envio de OTP, corrida entre emissão/criação e conclusão de login/reautenticação/recuperação; executar tipos e regressões relevantes e registrar resultado antes de gerar qualquer novo candidato.

<a id="cp-20261103-049-fluxo-de-acesso-corrigido-e-regressoes-dirigidas"></a>

## CP 20261103 049 Fluxo de acesso corrigido e regressões dirigidas

- **Data:** 03/11/2026, 13h05, America/Sao_Paulo.
- **Etapa/estado:** R5, construção local em continuidade ao CP 048. Duplicidade de e-mail conferida na primeira tela ao pedir OTP; CPF/CNPJ conferido ainda nessa tela, após comprovar e-mail, antes de pedir dados da loja. Essa ordem preserva a exigência de prova antes de consultar documento; não foi criado endpoint público de disponibilidade de CPF. /contas mantém prova/checagem final contra corrida entre verificação e criação. Nova rota /auth/cadastro/verificar é aditiva, com rate limit existente de confirmação, cinco tentativas, finalidade, validade e vínculo e-mail/aparelho.
- **Mobile:** código permanece apenas no formulário e temporariamente na memória privada de Dados para reapresentar a prova na criação final; não entra em rascunho, URL, logs ou disco. Cancelamento invalida resposta atrasada; mudança de dados exige nova confirmação. Fluxo confirmado segue à loja sem novo OTP; Já tenho conta oferece caminho direto nas duas telas. ContaRepo sinaliza conclusão bem-sucedida; hook acima do Stack navega após login/reautenticação/recuperação mesmo com remontagem. Flag específica mantém o formulário bloqueado até concluir licença, sem impedir a própria consulta de licença nem alterar o bloqueio de escrita/sync existente.
- **Diagnóstico/compatibilidade:** histórico futuro reconhece rotas e ações de cadastro e somente seis motivos fixos de recusa, sem mensagens livres/dados pessoais. Configuração da API anuncia verificacaoAntecipada; script de build exige essa capacidade para impedir gerar novo APK contra API antiga. A API externa e APK 0.1.9 continuam no candidato do CP 045, sem esta correção.
- **Validação parcial:** API/PGlite três arquivos/41 casos PASS, incluindo documento somente após prova, cinco erros, uso único e corrida na criação final. Mobile seis arquivos/46 casos PASS em builds/pdv-acesso-correcao-dirigidos-revalidacao.log; tipos API/mobile PASS em pdv-acesso-correcao-tipos-revalidacao.log. Caso adicional de troca entre contas e gate de capacidade adicionados depois dessa rodada, ainda em validação. Primeira rodada da nova abordagem teve timeout em teste de licença e erro de tipo Promise<unknown>; corrigidos com flag separada de finalização (preservando a consulta) e tipo void explícito, sem alegar PASS anterior à repetição. Logs intermediários preservados.
- **Arquivos:** rotas/testes cadastro API; telas criar-conta/loja, dados/conta/hooks, useConclusaoLogin, backend, telemetria e testes mobile; scripts/build-android.ps1, checkpoint e roadmap. Fontes locais diferem do APK existente; sem bump/build/deploy/commit ou operação em banco externo. Alterações documentais e SQL de outros trabalhos preservados.
- **Próximo passo:** suíte mobile completa pela alteração de finalização, repetir API/gate/tipos afetados e revisar diff. Registrar resultado final e depois preparar candidato/CI/API de homologação antes de reteste no Samsung; nenhum aceite físico inferido.

<a id="cp-20261103-050-correcao-local-do-acesso-validada"></a>

## CP 20261103 050 Correção local do acesso validada

- **Data:** 03/11/2026, 13h10, America/Sao_Paulo.
- **Etapa/estado:** R5, entrega local do ajuste iniciado nos CPs 048–049 após diagnóstico e esclarecimento do usuário. Corrigidos nos fontes o conflito tardio do cadastro e a tela de entrada que permanecia utilizável após autenticar. Sem novo APK, implantação, PostgreSQL externo ou aceite físico; R6 não iniciada.
- **Resultado para o usuário:** e-mail existente é recusado na primeira tela ao solicitar código; OTP e CPF/CNPJ são conferidos nessa mesma tela antes da loja. Consulta de documento exige prova válida vinculada a e-mail/aparelho. Dados livres seguem para loja e criação sem nova emissão de OTP; Já tenho conta oferece entrada direta. Criação final repete prova/duplicidade, preservando a corrida entre conferência e gravação. A prova temporária fica somente na memória privada, não no rascunho/URL/disco; cancelamento descarta resultado atrasado, mudança de dados exige conferência e a validade original da emissão não é prolongada pela verificação.
- **Login:** sinal de conclusão em memória observado fora do Stack remontado; primeiro acesso, reautenticação do mesmo perfil, troca entre contas e recuperação concluída navegam para o app. Flag própria bloqueia formulário/retorno durante finalização, inclusive enquanto carrega licença. Código recusado ou falha local de recuperação não emitem conclusão. A trava de escrita/sync e a capacidade de consultar licença continuam com as regras anteriores. O JSON original confirma login 200 antes da nova emissão 429, sem conter motivos dos antigos 409 ou textos exibidos; não atribuir e-mail/CPF específico retrospectivamente.
- **Diagnóstico/compatibilidade:** rotas de cadastro, ações e seis motivos técnicos fixos reconhecidos, sem textos pessoais, códigos, mensagens livres ou corpos HTTP. API anuncia verificacaoAntecipada e script de build exige esse campo. Rota de verificação é aditiva; fluxo do APK 0.1.9 continua compatível com a API nova. O novo fluxo exige a API nova antes de gerar o próximo APK; não usar equivalência das 299 fontes históricas para os fontes locais atuais.
- **Validação local:** mobile completo: 71 arquivos/592 casos, 587 PASS no sandbox e cinco falhas em syncIntegracao/localhost; os mesmos cinco passaram fora da restrição de rede em pdv-acesso-correcao-sync-http.log. Nenhuma regra de permissão/offline foi afrouxada para fazer o teste passar. Depois foi acrescentado um caso de validade original do OTP; três arquivos/27 casos afetados passaram em pdv-acesso-correcao-expiracao-final.log, total consolidado de 593 casos mobile distintos. API/PGlite: três arquivos/41 casos PASS em pdv-acesso-correcao-api-verificacao.log. Tipos API/mobile PASS em pdv-acesso-correcao-tipos-entrega.log; duas ferramentas PASS em pdv-acesso-correcao-ferramentas.log; sintaxe PowerShell do build aprovada. Regressões incluem prova/limites/consumo, conflitos antes da loja, concorrência na criação final, cancelamento/expiração, persistência sem OTP e conclusão do acesso com Dados real e remontagem. Falhas intermediárias e correções preservadas no CP 049 e logs, sem confundir teste isolado/PGlite com PostgreSQL remoto ou Android físico.
- **Arquivos/evidências:** rotas/testes cadastro API; telas criar-conta/loja e layout, ContaRepo/Dados/hooks, novo useConclusaoLogin, backend/telemetria e testes mobile (incluindo cadastroInicialTela.test.ts); scripts/build-android.ps1. Roadmap, matriz, roteiro e relatório R5 atualizados. Logs/artefatos em builds/pdv-acesso-correcao-*. Nenhum commit criado só para checkpoint; alterações anteriores de README/documentos e SQL de limpeza preservadas.
- **Fechamento documental:** git diff --check PASS; cinco documentos/115 links locais e âncoras, cercas Markdown e existência de destinos conferidos, zero falhas. Resumo em builds/pdv-acesso-correcao-validacao.json; sem acrescentar dados pessoais ou segredos à evidência.
- **Artefato/ambiente preservados:** SHA256 do APK 0.1.9 reconferido como 5fe5118f97dee38c4f92710f9ab433d8f4e7d61cc0cd89d50945ff28ee8448f0. Não houve envio de e-mail real, escrita em aplicação externa, deploy, alteração de credenciais ou limpeza de base/aparelho nesta rodada. API externa permanece na última versão registrada df41823; sem nova consulta remota nesta entrega. Produção/backups e pendências de restauração/limpeza mantidos.
- **Próximo passo:** fixar candidato com novo versionamento, executar CI com PostgreSQL e implantar API compatível somente em homologação antes de compilar/inspecionar novo APK; depois executar o roteiro específico de acesso no Samsung e continuar F01–F19. O app instalado continua na 0.1.9 com os defeitos relatados até receber atualização. Não concluir piloto, conformidade integral ou aceite humano pelos testes locais.


<a id="cp-20261103-051-candidato-0110-e-ci-disparado"></a>

## CP 20261103 051 Candidato 0.1.10 e CI disparado

- **Data:** 03/11/2026, 14h55, America/Sao_Paulo.
- **Etapa:** R5, continuidade autorizada do CP 050. Versionamento 0.1.10/11; fontes fixados no commit e350da7 na branch codex/pdv-homologacao-real, enviados ao repositório privado existente. CI 41688629339 disparado manualmente; produção/main não promovidas.
- **Backup:** pré-atualização solicitado pelo conector e conclusão lida no painel: pdv-pre-acesso-0110-20261103, arquivo aladdin/pdv-postgres-homologacao/2026-11-03T17:52:49.257Z.sql.gz, 22,1 kB, Success em 03/11 às 14h52m50 local. Disco local do servidor; não equivale a cópia externa nem restauração. Retenção/agendamento preservados.
- **Limites:** primeiro envio foi recusado pela revisão automática por destino não verificado. Leitura confirmou repositório privado romulosutil/prisma-pdv-app, permissão ADMIN, branch remota df41823 e owner/repo/ref idênticos ao serviço de homologação; nova avaliação aprovou o envio. Sem contornar o bloqueio. SQL de limpeza local preservado e não incluído no commit.
- **Próximo passo:** aguardar CI PostgreSQL/imagem; só após PASS atualizar pdv-api-homologacao preservando ambiente/fonte, conferir HTTPS e compilar/inspecionar o APK. Nenhum deploy ou APK novo concluído neste checkpoint.


<a id="cp-20261103-052-ajuste-de-tipos-no-ci-limpo"></a>

## CP 20261103 052 Ajuste de tipos no CI limpo

- **Data:** 03/11/2026, 14h56, America/Sao_Paulo.
- **Resultado:** CI 41688629339 falhou no typecheck mobile TS2493: useSegments inferiu tupla de um elemento na instalação limpa. Hook agora declara a interface de segmentos como readonly string[], preservando a comparação de rota. Regressão dirigida da tela e tipos locais repetidos; logs pdv-0110-hook-{regressao,tipos}.log.
- **Estado/próximo passo:** correção mínima para executar novo CI completo no novo SHA; backup do CP 051 preservado. Sem deploy/APK novo; não alegar CI aprovado enquanto o novo run não concluir.


<a id="cp-20261103-053-ci-aprovado-e-api-0110-atualizada"></a>

## CP 20261103 053 CI aprovado e API 0.1.10 atualizada

- **Data:** 03/11/2026, 15h03, America/Sao_Paulo.
- **Etapa/resultado:** R5; CI 41688960912 completed/success no SHA 84dd0dcd9825e7e1c3d04f7bfe08261a34739e79. Tipos, ferramentas, shared, API PostgreSQL 17, mobile, imagem/isolamento aprovados. Deploy de main pulado; produção não promovida. Evidências pdv-0110-ci-aprovado.{json,log}.
- **Homologação:** somente aladdin/pdv-api-homologacao implantada após backup CP 051. Serviço reporta mesmo SHA; ambiente e fonte comparados com inspeção anterior e preservados, autoDeploy false. Sem alteração de banco/schema, credenciais, portas, volumes ou dados.
- **HTTPS externo:** saúde 200 com referência de hora; cadastro configuração contrato 1/verificacaoEmail true/verificacaoAntecipada true; POST /auth/cadastro/verificar sem prova recusado com 400 cadastro_codigo_necessario. Smoke não enviou e-mail nem criou conta. Evidência builds/pdv-0110-http.json. OTP externo/Android físico continuam pendentes.
- **Próximo passo:** compilar 0.1.10/11 com diagnóstico/R8, preservar mapping, conferir assinatura/manifesto/bundle/fontes/alinhamentos e entregar para reteste. Build iniciado, sem declarar conclusão neste checkpoint; dados/backups/APKs anteriores preservados.


<a id="cp-20261103-054-apk-0110-entregue-para-reteste"></a>

## CP 20261103 054 APK 0.1.10 entregue para reteste

- **Data:** 03/11/2026, 15h13, America/Sao_Paulo.
- **Etapa/resultado:** R5; sequência dos CPs 051–053. CI 41688960912 aprovado no commit 84dd0dcd9825e7e1c3d04f7bfe08261a34739e79: 602 casos API/PostgreSQL 17, 593 mobile, 172 shared, total 1.367, tipos, duas ferramentas e imagem/isolamento. Primeira execução falhou e foi corrigida conforme CP 052; não foi promovida a produção.
- **API externa:** somente aladdin/pdv-api-homologacao atualizada no mesmo SHA após backup comprovado no CP 051. Ambiente/fonte comparados e preservados; autoDeploy false. Saúde/hora 200, contrato 1/verificacaoEmail e verificacaoAntecipada true, verificação sem prova recusada com 400 cadastro_codigo_necessario por HTTPS. Nenhum e-mail real/conta criada pelo smoke. Sem mudanças de schema, dados, credenciais, portas ou volumes; produção preservada.
- **Artefato:** builds/pdv-homologacao-0.1.10.apk, versão 0.1.10/versionCode 11, pacote br.com.pdv.mobile.homologacao, 64,628,444 bytes; SHA256 4e32a8cd6f372b9bac7c622d30848c3773a8c4283bb8ac0dd598bb781be6ffdb. Certificado interno idêntico ao da 0.1.9, assinatura v2 aprovada; atualizar sem desinstalar nem limpar dados. APK 0.1.9 e anteriores preservados; hash 0.1.9 reconferido.
- **Build/inspeção:** Gradle BUILD SUCCESSFUL em 8m38s, 656 tarefas (628 executadas/28 atualizadas); R8/minify/shrink ativos, mapping preservado com SHA256 53e375148581a15360d454c6b4f0d47751442c365217bc2db8f16120381e9cfa. Bundle exato 4.292.788 bytes, SHA256 bdbee1dcf3f924055f699a8908de519fcbb55915a19f30eb12b40da3854afd26, 1.892 módulos, gate conectado/diagnóstico PASS; novo hook e endpoint de verificação presentes. 300 fontes/configurações por SHA256, zero divergências; zipalign 16 KB e 29/29 libs ELF ARM64 alinhadas. Manifesto/pacote/versão conferidos; sem RECORD_AUDIO, armazenamento externo ou biometria. Assinatura interna não equivale a distribuição de produção.
- **Evidências:** builds/pdv-homologacao-0.1.10-*; pdv-0110-conferencia-final.json, auditoria-estatica-0110-evidencias.json, pdv-0110-zipalign.log, pdv-0110-manifesto-binario.txt, pdv-0110-ci-aprovado.{json,log}, pdv-0110-ci-contagens.json e pdv-0110-http.json. README de entrega junto ao APK. Documentação/roadmap atualizados; nenhum commit criado apenas para fechamento documental. SQL de limpeza de outro trabalho preservado e não executado.
- **Limites:** inspeção estática/CI/HTTPS não substituem Android físico, recebimento SMTP, scanner real com R8, teclado/TalkBack, SecureStore e arquivos recebidos. Novo OTP/cadastro e entrada corrigida exigem reteste no Samsung. Diagnóstico manual local exclusivo de homologação, sem envio automático ou dados pessoais; não comprova conformidade integral. Limpeza/recuperação/backup restaurado/F01–F19/aceite humano continuam abertos. Cópia externa e alertas permanecem no backlog autorizado.
- **Conferência de fechamento:** seis documentos/128 links e âncoras, cercas/whitespace e git diff --check PASS; 300 fontes sem divergência e hash do APK reconferido. Resultado em builds/pdv-0110-documentos-verificacao.json, zero falhas. Somente documentos alterados após o commit de runtime aprovado; SQL de outro trabalho continua intocado.
- **Próximo passo:** instalar este APK por atualização, testar e-mail existente e CPF/CNPJ após OTP ainda na primeira tela; entrar em conta existente e conferir avanço automático sem novo pedido de código. Exportar diagnóstico se falhar; então continuar ciclo financeiro/offline conforme roteiro. Nenhum checkbox físico/comercial encerrado.

<a id="cp-20261103-055-instalacao-0110-relatada-e-guia-de-acesso"></a>

## CP 20261103 055 Instalação 0.1.10 relatada e guia de acesso

- **Data:** 03/11/2026, 15h23, America/Sao_Paulo.
- **Etapa/estado:** R5, continuidade do CP 054. Usuário informou instalação da 0.1.10 e solicitou acompanhamento passo a passo de cadastro/login. Instalação relatada; ainda sem comprovação nova da versão exibida ou dos comportamentos físicos. Nenhum cenário aprovado por antecipação.
- **Orientação inicial:** abrir PDV Homologação com internet e identificar tela atual (início autenticado, boas-vindas ou entrada), preservando sessão e dados. Não orientar logout/limpeza antes de conhecer pendências e estado do aparelho. Conduzir uma etapa por resposta: e-mail duplicado antes da loja, entrada existente com OTP e avanço automático; depois CPF duplicado com outro e-mail próprio/OTP e cadastro novo quando houver dados de teste apropriados. Não solicitar CPF, e-mail completo ou código no chat.
- **Validação/arquivos:** roadmap e roteiro de reteste consultados; checkpoint e nota do roadmap atualizados. Sem alteração de runtime, novo build, deploy, envio de e-mail ou operação em banco nesta orientação. Evidências técnicas do CP 054 preservadas.
- **Próximo passo:** receber a tela atual e conduzir o primeiro cenário com esperado/observado e diagnóstico em caso de falha. Só registrar PASS nos passos efetivamente observados; F01–F19 e aceite continuam pendentes.


<a id="cp-20261103-056-limpeza-local-relatada-e-primeiro-login"></a>

## CP 20261103 056 Limpeza local relatada e primeiro login

- **Data:** 03/11/2026, 15h24, America/Sao_Paulo.
- **Etapa/estado:** R5, atualização do CP 055. Usuário relatou que já limpou os dados do app antes da orientação e está no login. Não foi ação executada pelo agente nem limpeza do banco de homologação. O teste agora parte de armazenamento local reiniciado, sem equivalência a atualização com sessão preservada. Não presumir recuperação de dados nunca sincronizados nem inexistência de pendências anteriores.
- **Orientação:** usar e-mail da conta existente, solicitar código uma vez e informar somente no app; tocar Entrar uma vez e observar avanço automático para a loja. Em escolha de loja ou oferta de substituir aparelho, relatar a tela antes de confirmar substituição. Em erro, registrar texto/horário e exportar diagnóstico; não insistir no reenvio. Cadastro duplicado será conduzido após confirmar entrada.
- **Validação/limites:** apenas relato da limpeza e da tela atual; código recebido, autenticação, navegação e dados restaurados ainda não observados. Roadmap/roteiro consultados; registro documental e diff conferidos. Sem runtime/build/deploy, envio de mensagem/e-mail pelo agente ou operação em banco.
- **Próximo passo:** receber resultado de chegada do código e navegação após login; nenhum PASS físico ou aceite antecipado.


<a id="cp-20261103-057-login-0110-aprovado-por-relato"></a>

## CP 20261103 057 Login 0.1.10 aprovado por relato

- **Data:** 03/11/2026, 15h26, America/Sao_Paulo.
- **Etapa/resultado:** R5, continuidade do CP 056. Usuário confirmou recebimento do código e entrada direta na loja, sem erro e sem nova solicitação de código. PASS do cenário dirigido de primeiro login após limpeza local, por relato de execução física; sem diagnóstico novo recebido ou observação direta do agente. Não equivale a aceite do piloto, atualização com sessão preservada ou validação completa de SMTP/autenticação.
- **Próxima orientação:** fechar o app pelos recentes e reabrir sem sair da conta ou limpar dados; conferir retomada da loja e ausência de novo OTP. Verificar persistência antes de preparar cadastro duplicado. Fontes mostram que logout preserva identidade local e exige reautenticação; não orientar logout como garantia de voltar ao cadastro nem nova limpeza para contornar fluxo.
- **Documentação/validação:** roteiro e roadmap atualizados com o resultado específico; demais casos de cadastro, reautenticação, troca de perfis e recuperação seguem pendentes. Diff documental conferido. Nenhuma alteração de runtime, build, deploy, sessão ou banco pelo agente.
- **Próximo passo:** receber resultado da reabertura e conduzir cadastro em estado inicial apropriado, preservando evidência/filas. Nenhum F01–F19 ou aceite geral encerrado.


<a id="cp-20261103-058-sessao-retomada-e-preparacao-do-cadastro"></a>

## CP 20261103 058 Sessão retomada e preparação do cadastro

- **Data:** 03/11/2026, 15h29, America/Sao_Paulo.
- **Etapa/resultado:** R5, continuidade do CP 057. Usuário fechou pelos recentes e reabriu a 0.1.10; informou entrada direta na loja sem novo código. PASS dirigido da retomada da sessão por relato físico, sem inferir encerramento forçado/reinício do aparelho/atualização ou homologação integral do SecureStore.
- **Limitação do roteiro:** fontes confirmam que identidade local faz o guarda redirecionar cadastro para loja ou reautenticação; logout preserva essa identidade e não libera cadastro. Usuário só dispõe deste celular. Não orientar tentativa de logout ou limpeza como se fossem caminho normal garantido; definir estado inicial de teste preservando evidências. Cadastro duplicado/novo continuam não executados.
- **Orientação imediata:** conferir em Ajustes > Usuários neste aparelho as contagens de aguardando envio e para revisão; preservar sessão e dados, não tocar Sair. Receber contagens antes de definir preparação adicional para cadastro em instalação sem identidade. Não solicitar valores pessoais/OTP no chat.
- **Arquivos/validação:** roadmap/roteiro e fontes de navegação/perfis consultados; checkpoint e notas documentais atualizados; diff conferido. Sem modificação runtime/build/deploy, exclusão local/remota ou envio de e-mail pelo agente.
- **Próximo passo:** receber contagens e definir preparação adequada para cadastro com um único aparelho, mantendo a execução do cadastro e aceite pendentes.


<a id="cp-20261103-059-fila-zerada-comprovada-na-tela"></a>

## CP 20261103 059 Fila zerada comprovada na tela

- **Data:** 03/11/2026, 15h33, America/Sao_Paulo.
- **Etapa/evidência:** R5, continuidade do CP 058. Captura anexada pelo usuário mostra perfil em uso, 0 aguardando envio, 0 para revisão e última sincronização completa em 03/11/2026 às 15h31m44. Evidência visual dessas contagens naquele instante; não prova integridade de todos os registros nem preservação de preferências e outros dados exclusivamente locais. Não transcrever nome/e-mail exibidos na imagem para a documentação.
- **Próximo passo guiado:** abrir Diagnóstico do teste ativo, Copiar histórico do teste e colar nesta conversa para preservar e conferir versão/eventos da rodada de login antes de definir preparação adicional do cadastro no único celular disponível. Nenhuma orientação de limpeza ou logout executada nesta etapa; contagem zero não foi tratada como autorização para apagar dados.
- **Validação/arquivos:** roteiro e implementação da exportação consultados; checkpoint e roadmap atualizados, diff conferido. Nenhum runtime/build/deploy, escrita no banco ou envio de mensagem externa pelo agente. Cadastro continua não executado e sem aceite; login/reabertura mantêm evidência por relato dos CPs 057–058.


<a id="cp-20261103-060-diagnostico-completo-0110-preservado"></a>

## CP 20261103 060 Diagnóstico completo 0.1.10 preservado

- **Data:** 03/11/2026, 15h38, America/Sao_Paulo.
- **Etapa/evidência:** R5, continuidade do CP 059. Primeira colagem veio truncada em 65.536 caracteres, sem JSON completo; 408 eventos completos puderam ser lidos, sem inventar fechamento ou eventos restantes. Usuário então forneceu o arquivo exportado completo: 107.322 bytes, 456 eventos ordenados (limite 500), app 0.1.10/homologação, Samsung SM-S938B/Android 17, gerado às 15h36m42 local, persistenciaPendente false. Execuções anteriores persistidas aparecem no mesmo histórico, conforme contrato; não exigir ID único.
- **Login/retomada:** emissão /auth/codigo 204 às 15h25m04; vínculos e login 200, login às 15h25m34.310 e navegação para início às 15h25m34.712 (~402 ms depois). Uma emissão e um login no arquivo; reabertura registrada às 15h28m01 no início sem novo OTP, consistente com relatos CPs 057–058. Último sync às 15h36m40 ocioso/zero pendências e zero rejeições. Evidência não certifica todos os dados do servidor nem outros fluxos.
- **Achados adicionais:** uma falha de rede status 0 em /sync/pull às 15h30m34 após background, com recuperação posterior. Quatro avisos de interface tipo erro às 15h27m37/15h30m59/15h34m07/15h36m39, próximos de GET /assinatura 200 e atualização em segundo plano; texto não registrado por privacidade e causa ainda não comprovada. Não declarar a rodada inteira livre de falhas nem atribuir os avisos ao login, que já havia concluído. Sem eventos de erro JS neste arquivo.
- **Preservação/validação:** JSON completo validado e copiado para builds/pdv-0110-reteste-samsung-completo-20261103.json, SHA256 8ff33b4a14e7591fcd4525d8879a7ce23536a6feef9e3cd75837c23183d19bf9; resumo derivado em pdv-0110-reteste-samsung-completo-resumo.json. Colagem incompleta preservada separadamente e rotulada, sem tratá-la como histórico integral. Artefatos locais ignorados pelo Git; sem registrar dados pessoais/códigos. Roadmap e checkpoint atualizados, diff conferido. Nenhum build/deploy/limpeza ou ação remota.
- **Próximo passo:** para executar cadastro no único celular, obter autorização explícita antes de orientar reinício dos dados locais do PDV Homologação. Informar que sessão/preferências/arquivos locais são apagados, enquanto contas e dados sincronizados no servidor permanecem. Histórico já preservado e fila zero observada não substituem essa autorização. Depois conduzir primeiro e-mail duplicado antes da etapa da loja; cadastro e aceite ainda pendentes. Avisos de interface permanecem para investigação própria.


<a id="cp-20261103-061-reinicio-local-autorizado-para-cadastro"></a>

## CP 20261103 061 Reinício local autorizado para cadastro

- **Data:** 03/11/2026, 15h41, America/Sao_Paulo.
- **Autorização/escopo:** usuário autorizou explicitamente limpar os dados locais do PDV Homologação e pediu orientação para limpeza e teste de cadastro. Autorização restrita ao armazenamento local desse aplicativo no único celular; não inclui banco remoto, produção, outros aplicativos, backups ou exclusão do diagnóstico exportado em Downloads/cópia de evidência. Substitui a espera por autorização do CP 060.
- **Preparação comprovada:** histórico completo preservado e fila final ociosa/zero pendências/rejeições no CP 060; captura anterior também mostra zero. Login/reabertura aprovados nos cenários dirigidos por relato/evidência. Limpeza remove sessão/preferências/histórico local, preservando conta e dados já sincronizados no servidor; sem promessa de recuperar dados exclusivos do aparelho.
- **Orientação:** informações do aplicativo PDV Homologação > Armazenamento > Limpar dados > confirmação Android; abrir novamente e escolher Começar. Na primeira tela, preencher nome, e-mail da conta existente e CPF/CNPJ válido, apenas no app; tocar Continuar e enviar código uma vez. Esperado: mensagem de e-mail já cadastrado na primeira tela, antes de loja/OTP/criação. Parar e relatar a mensagem antes de entrar de novo, para permitir prosseguir ao teste de CPF com outro e-mail próprio.
- **Estado/validação:** orientação documentada; execução da limpeza e resultado do cadastro ainda não relatados. Roadmap/roteiro/fontes e rótulos consultados; diff conferido. Nenhuma limpeza, alteração runtime/build/deploy ou operação remota executada pelo agente.
- **Próximo passo:** receber resultado de e-mail duplicado e registrar somente observação efetiva. Depois conduzir CPF duplicado após OTP e cadastro novo conforme dados de teste disponíveis. Quatro avisos de interface do CP 060 seguem em aberto; nenhum aceite geral inferido.


<a id="cp-20261103-062-cadastro-novo-concluido-por-relato"></a>

## CP 20261103 062 Cadastro novo concluído por relato

- **Data:** 03/11/2026, 15h44, America/Sao_Paulo.
- **Etapa/resultado:** R5, retorno do CP 061. Usuário informou uso de e-mail e CPF temporários e conclusão bem-sucedida do onboarding. Registrar cadastro novo concluído por relato físico na rodada da 0.1.10, sem presumir que executou o teste de dados duplicados. Não registrar identificadores pessoais/temporários nem códigos. Limpeza autorizada anteriormente; sua execução não foi confirmada separadamente.
- **Limites da evidência:** relato não detalha recebimento/confirmação do OTP antes da loja, ausência de segundo OTP, tela final ou integridade dos dados da conta nova. Novo diagnóstico ainda não recebido. E-mail duplicado e CPF/CNPJ duplicado permanecem pendentes; não converter sucesso de cadastro novo em aprovação dessas recusas ou aceite geral.
- **Próximo passo guiado:** confirmar se o código foi recebido/validado ainda na primeira tela antes do nome da loja; exportar histórico como arquivo JSON e anexar, preservando sessão atual até guardar evidência. Não orientar nova limpeza antes dessa preservação. Depois retomar testes de duplicidade, usando dados de teste controlados sem expor credenciais no chat. Quatro avisos de interface da rodada anterior continuam em investigação.
- **Arquivos/validação:** roadmap e roteiro atualizados; diff conferido. Sem alteração runtime/build/deploy ou ações em contas/e-mail/banco pelo agente.


<a id="cp-20261103-063-bloqueio-de-cadastro-e-dados-novos-relatados"></a>

## CP 20261103 063 Bloqueio de cadastro e dados novos relatados

- **Data:** 03/11/2026, 15h47, America/Sao_Paulo.
- **Etapa/resultado:** R5, esclarecimento do CP 062. Usuário afirmou que funcionou tudo, houve bloqueio ao tentar criar uma conta e conseguiu criar com dados novos. Atualiza o estado anterior: tentativa recusada também foi executada por relato; não continuar descrevendo toda recusa como não executada. Cadastro novo continua com sucesso geral relatado.
- **Precisão pendente:** relato não separa se o bloqueio foi por e-mail repetido, CPF/CNPJ repetido ou ambos, nem fornece a mensagem/ordem individual de cada recusa. Manter essas duas evidências separadas até esclarecer; não presumir teste independente de ambos. Novo JSON desta rodada não recebido; não exigir repetição de exportação nesta resposta.
- **Escopo de aprovação:** funcionamento do fluxo testado confirmado verbalmente; não equivale a aceite comercial geral, integridade financeira, todos os perfis/recuperação, tratamento dos quatro avisos de interface ou encerramento de F01–F19. Login e retomada da sessão já registrados nos CPs 057–060.
- **Arquivos/validação:** roadmap e roteiro atualizados com a correção do relato; diff conferido. Nenhum runtime/build/deploy/limpeza/envio de e-mail ou operação de banco pelo agente.
- **Próximo passo:** confirmar qual dado repetido causou bloqueio; registrar os casos correspondentes e depois prosseguir ao teste de produto/câmera e operação, mantendo os cenários ainda não observados abertos.


<a id="cp-20261103-064-recusa-por-email-e-segunda-tentativa"></a>

## CP 20261103 064 Recusa por e-mail e segunda tentativa

- **Data:** 03/11/2026, 15h49, America/Sao_Paulo.
- **Etapa/evidência:** R5, esclarecimento do CP 063. Usuário atribuiu a primeira recusa ao e-mail e informou novo bloqueio ao tentar novamente. Registrar recusa por e-mail no fluxo de cadastro por relato; CPF/CNPJ duplicado não comprovado. Cadastro com dados novos, login e retomada mantêm resultados anteriores.
- **Distinção técnica:** /auth/cadastro/codigo verifica limites antes de consultar e-mail existente. Primeira requisição pode retornar 409 email_ja_cadastrado; repetição em menos de 60 s pode retornar 429 limite_autenticacao, sem eliminar a verificação de duplicidade. Essa sequência é hipótese compatível com os fontes; não atribuir status/motivo definitivo sem mensagem ou diagnóstico da rodada. Não chamar a segunda recusa automaticamente de defeito ou de teste de CPF.
- **Próximo passo guiado:** pedir apenas o texto lembrado da segunda mensagem, distinguindo Este e-mail já tem acesso de Muitas tentativas; não induzir novas tentativas agora. CPF duplicado e ordem exata da recusa seguem pendentes.
- **Arquivos/validação:** roadmap/roteiro e fontes de cadastro/limites/mensagens consultados; checkpoint e notas atualizados, diff conferido. Nenhuma modificação runtime/build/deploy ou ação no servidor pelo agente; sem aceite geral inferido.


<a id="cp-20261103-065-limite-confirmado-e-teste-de-cpf-duplicado"></a>

## CP 20261103 065 Limite confirmado e teste de CPF duplicado

- **Data:** 03/11/2026, 15h55, America/Sao_Paulo.
- **Etapa/evidência:** R5, esclarecimento do CP 064. Usuário confirmou mensagem Muitas tentativas, aguarde alguns minutos na segunda tentativa. Registrar limite de tentativas exibido por relato, distinto da recusa anterior atribuída ao e-mail. Sem novo JSON/status HTTP dessa rodada; não inventar código de status ou tempo exato.
- **Próximo cenário:** CPF/CNPJ duplicado com outro e-mail acessível ainda não cadastrado e exatamente o documento da conta de teste criada com sucesso. Confirmar OTP na primeira tela; esperado conflito do documento antes da etapa da loja/criação. Teste ainda não executado/validado.
- **Preparação:** se já estiver na primeira tela de cadastro, mantê-la e preencher os dados do cenário. Se estiver dentro da loja, preservar o diagnóstico atual por exportação e verificar zero pendências/rejeições antes de reiniciar somente dados locais do PDV Homologação, dentro da autorização vigente do CP 061. Não pedir nova autorização para o mesmo escopo já autorizado. Se houver pendências ou limite novamente, interromper tentativas e relatar. Não apagar arquivo exportado, dados remotos, produção, backups ou outros aplicativos.
- **Validação/arquivos:** roadmap/roteiro e rótulos do formulário consultados; checkpoint e notas atualizados; diff conferido. Nenhuma limpeza/runtime/build/deploy/ação no servidor executada pelo agente. Cadastro novo/login/retomada mantêm as evidências anteriores, sem aceite geral inferido.
- **Próximo passo:** receber mensagem e momento da recusa do documento; só então concluir o cenário correspondente e prosseguir ao produto/câmera/venda.


<a id="cp-20261103-066-cpf-repetido-aceito-relatado-em-investigacao"></a>

## CP 20261103 066 CPF repetido aceito relatado em investigação

- **Data:** 03/11/2026, 15h59, America/Sao_Paulo.
- **Etapa/incidente:** R5, retorno do CP 065. Usuário relatou criação de nova conta com e-mail novo e CPF repetido, sem recusa. Cenário de duplicidade de documento marcado FAIL por relato físico, causa em investigação; não avançar a rodada guiada para vendas enquanto esclarecer. Não presumir dois registros com CPF canônico idêntico no servidor antes de obter evidência.
- **Inspeção:** fontes consultados têm comparação do documento na verificação antecipada e criação final; schema/migração 0000 declaram contas_documento_unique. Client envia documento normalizado e Dados o vincula à prova local. Inspeção externa do serviço confirmou SHA 84dd0dc/ref exclusiva/autoDeploy false. Nenhuma alteração de configuração ou banco realizada. Constraint declarada no código não é prova de constraint ativa no banco externo.
- **Limites/próximo passo:** conector não expôs consulta SQL somente leitura na descoberta; não criar serviço, porta ou ferramenta administrativa para contornar. Acrescentar reprodução integrada mobile/API local, verificar comparação de documento normalizado e criação final; pedir JSON exportado desta nova rodada, preservando instalação, conta e arquivos. Diagnóstico antigo dos CPs 059–060 não representa esta tentativa; não solicitar CPF/OTP no chat nem modificar runtime sem causa reproduzida.
- **Arquivos/estado:** checkpoint e roadmap atualizados, alterações anteriores preservadas. Sem limpeza, build, deploy, novo cadastro remoto ou envio de e-mail pelo agente. Evidências da reprodução ainda pendentes neste registro. Aceite do piloto permanece aberto; recusas de e-mail/cadastro novo/login anteriores mantêm o escopo de seus relatos.


<a id="cp-20261103-067-reproducao-integrada-de-cpf-e-evidencia-real-pendente"></a>

## CP 20261103 067 Reprodução integrada de CPF e evidência real pendente

- **Data:** 03/11/2026, 16h01, America/Sao_Paulo.
- **Etapa/resultado:** R5, investigação do CP 066. Novo teste integrado executa Dados + BackendHttp + API + PGlite com migrações e fila de e-mail de fixture cifrada: cria primeira conta com CPF válido normalizado de entrada com máscara, tenta outro e-mail com o mesmo CPF, recebe 409 documento_ja_cadastrado na conferência antecipada e também na criação final direta. Banco local mantém exatamente uma conta e uma sessão. Não há envio SMTP real ou operação em homologação nesse teste.
- **Validação:** dois arquivos/sete casos PASS (integração nova + tela inicial) em builds/pdv-cpf-duplicado-integracao.log; tipos mobile PASS em pdv-cpf-duplicado-tipos.log. Novo arquivo apps/mobile/test/cpfDuplicadoIntegracao.test.ts ainda local, sem commit/CI/deploy. Código runtime e APK não alterados. Teste de UI existente usa mock de Dados e não foi apresentado como execução nativa completa.
- **Interpretação:** falha relatada no aparelho permanece aberta; sucesso local não a invalida nem comprova schema/dados externos. Constraint declarada e comparação nos fontes não bastam para atribuir causa à tentativa real. Inspeção remota confirmou a versão de API entregue, sem SQL de leitura disponível no conector; não foram criados acessos administrativos, portas ou recursos.
- **Próximo passo necessário:** receber arquivo JSON exportado desta tentativa, mantendo app/conta/dados. Conferir chamadas de verificação e criação e eventual 201; não usar o diagnóstico antigo de login como se fosse a rodada de cadastro. Não pedir CPF completo/OTP no chat, não apagar contas/dados e não produzir correção especulativa. Depois correlacionar a persistência real por método de leitura autorizado disponível e corrigir a causa comprovada.
- **Documentação:** roadmap e roteiro atualizados; diff conferido. CPF duplicado continua FAIL por relato, aceite/ciclo financeiro não liberados por estes testes. Quatro avisos de interface anteriores mantêm investigação própria.


<a id="cp-20261103-068-json-mostra-emissao-de-codigo-sem-criacao"></a>

## CP 20261103 068 JSON mostra emissão de código sem criação

- **Data:** 03/11/2026, 16h07, America/Sao_Paulo.
- **Etapa/evidência:** R5, investigação do relato CPs 066–067. Novo JSON completo recebido: 15.150 bytes, 65 eventos ordenados (limite 500), app 0.1.10/homologação, Samsung SM-S938B/Android 17, gerado às 16h05m36 local, persistenciaPendente false. Preservado em builds/pdv-0110-cpf-relatado-diagnostico.json, SHA256 e620e36aeeb708cb23a24f114a23da6a24ea3852c71ec2ece645f03f90912a9e; resumo em pdv-0110-cpf-relatado-resumo.json.
- **Sequência comprovada:** às 15h46m59, /auth/cadastro/codigo 409 email_ja_cadastrado; às 15h47m06, mesmo endpoint 429 limite_autenticacao. Nova abertura de /criar-conta às 15h55m56 e emissão 200 às 15h57m49. Só essas três requisições HTTP no arquivo: não há /auth/cadastro/verificar, POST /contas, rota /loja ou criação 201. Sync final às 16h05m25 sem_sessao, zero pendências/rejeições. Sem erro JS/aviso_interface nesta execução.
- **Interpretação:** arquivo comprova recusa por e-mail e limite anteriormente relatados, mas não comprova criação de conta nem aceitação de CPF repetido. A emissão do OTP aceita e-mail novo sem criar conta; comparação do CPF ocorre após confirmação do código, antes da loja. Relato de CPF duplicado criado permanece histórico, com causa não comprovada; cenário atual inconclusivo até completar verificação. Não afirmar que nenhuma conta tenha sido criada em outra rodada/execução ausente deste arquivo, nem atribuir culpa ao usuário.
- **Orientação:** voltar ao formulário, manter exatamente o CPF/CNPJ da conta existente e e-mail novo, preencher o código recebido e tocar Confirmar e continuar uma vez. Se o código expirar (10 min da emissão), solicitar outro e enviar uma vez antes de confirmar. Esperado conflito de CPF ainda na primeira tela; parar e informar mensagem/tela. Código nunca deve ser enviado no chat. Nenhuma nova limpeza solicitada.
- **Validação/arquivos:** JSON e ordem temporal validados por script; fontes/roteiro consultados, roadmap e roteiro atualizados, diff conferido. Sem alteração runtime/build/deploy, credenciais ou dados remotos; nenhuma correção especulativa. Novo teste integrado do CP 067 preservado localmente.
- **Próximo passo:** receber resultado da confirmação OTP e recusa/avanço, exportar novo JSON se chegar à loja ou criar conta com documento repetido. Cadastro físico duplicado permanece não aprovado, assim como aceite geral.


<a id="cp-20261103-069-testes-automatizados-de-acesso-iniciados"></a>

## CP 20261103 069 Testes automatizados de acesso iniciados

- **Data:** 03/11/2026, 16h10, America/Sao_Paulo.
- **Escopo:** usuário pediu execução dos testes pelo agente. Rodadas dirigidas de API e mobile iniciadas em ambientes isolados/fixtures; sem uso de e-mail temporário do usuário, OTP real, contas remotas, produção ou limpeza do telefone.
- **Android:** consulta ADB inicialmente falhou no sandbox; repetida fora da restrição, retornou lista vazia. Nenhum Samsung conectado detectado; não afirmar automação física. Nenhum comando de instalação/input/limpeza foi emitido ao aparelho.
- **Próximo passo:** concluir suítes dirigidas e reforçar cobertura do formulário com Dados/BackendHttp/API reais em fixture, incluindo CPF repetido após código. Registrar resultados, limites e pendências físicas antes de encerrar. Sem mudança runtime/deploy.


<a id="cp-20261103-070-96-casos-de-acesso-automatizados-aprovados"></a>

## CP 20261103 070 96 casos de acesso automatizados aprovados

- **Data:** 03/11/2026, 16h11, America/Sao_Paulo.
- **Etapa/resultado:** R5, execução solicitada no CP 069 concluída localmente: quatro arquivos/49 casos API, seis arquivos/45 casos mobile e mais dois casos novos de formulário integrado à API, total 96 casos PASS. Tipos API/mobile PASS. Não inclui novo CI remoto/PostgreSQL dedicado nem execução nativa do Samsung.
- **Cobertura:** e-mail existente, limite de repetição, OTP inválido/expirado/uso único/cinco erros, cadastro novo/prova antes da sessão, conflito de CPF antecipado/final, corrida na criação, login/reautenticação/troca de perfil/recuperação e finalização após remontagem, conforme as suítes dirigidas executadas. Cadastro com CPF normalizado e outro e-mail recusado na conferência após OTP; banco de teste permaneceu com uma conta e uma sessão.
- **Nova integração do formulário:** apps/mobile/test/cadastroFormularioApiIntegracao.test.ts usa telas criar-conta/loja e contexto reais, Dados/BackendHttp reais, API via app.inject e PGlite com migrações e entrega cifrada de fixture. OTP lido pelo próprio teste na fila de fixture; sem SMTP real. Primeiro caso insere conta original, preenche formulário com outro e-mail/CPF com máscara, confirma OTP e exige erro junto ao CPF, sem navegação ou sessão nova. Segundo caso exige zero contas antes do OTP e antes da confirmação da loja, e uma conta/sessão apenas após criar. Componentes nativos e navegação Expo são substituídos por renderizador/observações de teste; não apresentar como E2E Android.
- **Correção de fixture:** primeira execução dos dois casos novos falhou porque a consulta de teste procurava e-mail diretamente na tabela cifrada de entregas, que não tem tal coluna. Fixture corrigida para buscar por codigos_login e vínculo codigoId; repetição dos dois casos PASS. Falha preservada em pdv-acesso-formulario-api-integrado.log; nenhum runtime foi alterado por ela.
- **Evidências:** builds/pdv-acesso-automatizado-api.log (49), pdv-acesso-automatizado-mobile.log (45), pdv-acesso-formulario-api-integrado-final.log (2), pdv-acesso-automatizado-tipos.log. Resumo em pdv-acesso-automatizado-resumo.json. Novos testes deste lote e do CP 067 ainda locais; sem novo commit/deploy/APK, sem escrita em banco externo ou contas/e-mails do usuário. Diff conferido; alterações anteriores preservadas.
- **Limites/próximo passo:** ADB fora do sandbox retornou zero aparelhos, conforme CP 069; sem automação física ou nova instalação/limpeza no telefone. Nos cenários locais executados, nenhuma conta duplicada foi criada e nenhuma correção runtime foi necessária. JSON real do CP 068 termina antes de confirmar OTP/criar conta; não comprova duplicidade. Para automação física, será necessária conexão ADB autorizada ou ambiente Android apropriado; não requisitar OTP no chat. Piloto financeiro, avisos de interface anteriores e aceite geral continuam abertos.


<a id="cp-20261103-071-preparacao-de-emulador-android"></a>

## CP 20261103 071 Preparação de emulador Android

- **Data:** 03/11/2026, 16h15, America/Sao_Paulo.
- **Escopo:** usuário solicitou teste emulando. Consultados roadmap/CP 070 e ambiente Android. SDK tinha ferramentas de build/ADB, mas não emulator.exe nem AVD/imagens instalados; testes anteriores por renderizador não são tratados como emulação Android.
- **Ambiente:** checagem fora do sandbox mostrou Intel i5-11400F, aproximadamente 32 GB RAM/156 GB livres e HypervisorPresent true. Consulta de recurso opcional do Windows requer elevação administrativa e não foi alterada. Nenhum dado do Samsung/produção tocado.
- **Avanço/próximo passo:** instalação do pacote oficial emulator solicitada ao SDK Manager existente; aguardar resultado e verificar aceleração antes de baixar imagem/gerar AVD pdv-. Aceitação de nova licença, alteração de recurso de segurança/Windows ou reinício do computador não foram autorizados por inferência. Sem APK instalado/Android emulado executando neste checkpoint. Logs em builds/pdv-emulador-*.


<a id="cp-20261103-072-emulador-instalado-e-boot-em-diagnostico"></a>

## CP 20261103 072 Emulador instalado e boot em diagnóstico

- **Data:** 03/11/2026, 16h22, America/Sao_Paulo.
- **Avanço:** pacote oficial Android Emulator 37.2.13 e imagem Google APIs Android 15/API 35 x86_64 instalados pelo SDK Manager existente, sem novo aceite de licença solicitado. AVD pdv-acesso-api35 criado em builds/pdv-avds com perfil Pixel 7. -accel-check retornou WHPX instalado/utilizável (exit 0). Nenhum recurso do Windows alterado, nenhuma conta Google adicionada.
- **Boot:** duas inicializações (gráficos SwiftShader e auto) chegam a Windows Hypervisor Platform accelerator is operational, mas ADB permanece offline e ainda não há janela Android controlável. Primeira instância exclusiva interrompida após verificar PID e launcher; sem tocar outro processo/aparelho. Ainda não houve instalação do APK nem teste Android emulado.
- **Limites/próximo passo:** investigar boot com alternativa de aceleração somente do processo do AVD; não desativar proteções do Windows ou reiniciar o computador por inferência. Logs pdv-emulador-runtime* e instalação em builds/. Samsung e dados de homologação/produção preservados. Android 15 não equivale ao Android 17 do Samsung.

<a id="cp-20261103-073-android-emulado-iniciado-e-apk-instalado"></a>

## CP 20261103 073 Android emulado iniciado e APK instalado

- **Data:** 03/11/2026, 21h03, America/Sao_Paulo.
- **Avanço:** tentativas adicionais da 37.2.13, incluindo sem aceleração/sem GPU e CLI oficial, não concluíram boot. AVD exclusivo pdv-acesso-api35-curto criado em C:/p/pdv-avd. Versão oficial anterior 36.2.12 extraída em builds/pdv-emulador-36.2.12 sem substituir o SDK; SHA256 do ZIP conferido com arquivo oficial: b0cf63f996d41eb75b0154938ff4a2e0140eab2625b9784cdc9d03ffbb1900df. Essa versão iniciou com WHPX/SwiftShader e Vulkan desativado somente no processo.
- **Validado:** emulator-5586 device, sys.boot_completed=1 e ABI x86_64,arm64-v8a. Instalação do APK entregue pdv-homologacao-0.1.10.apk via ADB retornou Success. Nenhum dado de telefone físico limpo/alterado, nenhuma conta criada ou teste de cadastro/login concluído ainda.
- **Interface/limites:** captura da janela Windows não prosseguiu por timeout de aprovação do Computer Use; não é evidência de tela do aplicativo. Ferramentas oficiais Android CLI de layout/input/screen disponíveis para teste nativo no AVD. Intervalo de espera não conta como execução contínua de teste. Logs de boot em builds/pdv-emulador-36.2.12-boot.log e tentativas anteriores preservados.
- **Próximo passo:** iniciar o app no AVD, observar telas e executar cenários de acesso autorizados, distinguindo API real de fixtures e dados sintéticos. Android 15 emulado não equivale ao Samsung/Android 17; aceite físico continua pendente. Sem mudança de runtime, deploy ou proteções do Windows.

<a id="cp-20261103-074-variante-nativa-para-emulador-em-compilacao"></a>

## CP 20261103 074 Variante nativa para emulador em compilação

- **Data:** 03/11/2026, 21h05, America/Sao_Paulo.
- **Resultado do APK ARM:** atividade iniciou, porém processo encerrou antes da primeira tela com couldn't find DSO to load: libreactnative.so. Log em builds/pdv-emulador-crash-inicial.log; layout capturado era launcher Android, não tela do PDV. Tradução arm64 do AVD não foi suficiente para esse carregamento; não concluir falha do Samsung ou de cadastro a partir dessa incompatibilidade.
- **Construído/em andamento:** scripts/build-android.ps1 recebeu opção -Emulador, selecionando x86_64 e sufixo -emulador em todos os artefatos. Padrão ARM preservado. Compilação release com R8/mesmos fontes e API HTTPS de homologação iniciada; prebuild PASS, Gradle em execução. APK entregue anteriormente preservado, sem mudança na lógica do produto ou deploy.
- **Próximo passo/limites:** concluir build, verificar assinatura/metadados/bundle e ausência de divergência de fontes; instalar variante x86_64 no AVD e executar cenários. Nenhum cadastro/login emulado validado até aqui; nenhum e-mail/conta remoto utilizado.

<a id="cp-20261103-075-release-x86-64-abriu-no-android"></a>

## CP 20261103 075 Release x86_64 abriu no Android

- **Data:** 03/11/2026, 21h13, America/Sao_Paulo.
- **Construído/validado:** variante 0.1.10/11 x86_64, R8 e assinatura v2 com mesmo certificado interno; Gradle SUCCESS em 8m15s, 644 tarefas. APK builds/pdv-homologacao-0.1.10-emulador.apk, SHA256 8ad1dce84f1a949fa3331a1bc899c33dcae63976564bb2f3da5851e860c9f35f. Inspeção release PASS, 1.892 fontes no mapa. Inventários de 300 arquivos originais/emulador sem diferenças; bundle Hermes idêntico, SHA256 bdbee1dcf3f924055f699a8908de519fcbb55915a19f30eb12b40da3854afd26. APK ARM original reconferido/preservado.
- **Android emulado:** instalação com ABI x86_64 retornou Success; atividade iniciou e layout nativo confirmou PDV Homologação/boas-vindas/Começar/Já tenho conta. Screenshot builds/pdv-emulador-boas-vindas.png. Ferramentas oficiais Android CLI layout/input/screen usadas, sem controle da janela Windows. Incompatibilidade ARM do CP 074 resolvida para o ambiente de testes, sem mudança na lógica do app.
- **Reprodução:** opção -Emulador documentada no README; AST PowerShell PASS e build real aprovado. Scripts/evidências usam sufixos separados. Variante aponta API HTTPS real de homologação e não contém ferramenta de simulação de acesso. Nenhum OTP desativado ou usuário de produção alterado.
- **Próximo passo/limites:** executar cenários nativos com fixture sintética e aliases de e-mail para códigos reais. Capturas textuais serão sanitizadas para não persistir OTP. Até este ponto apenas abertura validada; cadastro/login completos e aceite físico pendentes.

<a id="cp-20261103-076-quatro-cenarios-nativos-e-otp-pendente"></a>

## CP 20261103 076 Quatro cenários nativos e OTP pendente

- **Data:** 03/11/2026, 21h18, America/Sao_Paulo.
- **Validado no Android emulado/API real:** quatro cenários PASS: cadastro vazio exige nome/e-mail/documento; e-mail malformado e CPF com dígitos repetidos recusados no formulário; dados sintéticos válidos solicitam OTP e permanecem na primeira etapa; código inválido de seis dígitos é recusado sem abrir a loja. Asserções textuais conferidas e resumo em builds/pdv-emulador-acesso-resultados.json, com layouts sanitizados correspondentes. Abertura/compilação têm evidência separada CP 075.
- **E-mail:** mensagem real entregue ao alias de teste do Gmail do usuário. Busca/leitura limitada a esse destinatário recém-usado; conector retorna explicitamente [one-time authentication code withheld], sem expor OTP ao agente. Não buscar o código por outro caminho nem alterar a autenticação para contornar essa proteção. Nenhum código verdadeiro registrado em arquivo/checkpoint/chat.
- **Entrada necessária:** campo do código deixado vazio no AVD pdv-acesso-api35-curto/emulator-5586; solicitada ao usuário digitação direta do OTP e Confirmar e continuar, sem enviar código no chat. Android/AVD permanece aberto aguardando essa entrada. Não avançar por inferência ou contar envio de OTP como criação de conta.
- **Pendências:** confirmação válida e criação da conta sintética, recusa de e-mail existente/limite, CPF repetido com outro e-mail após OTP, login e retomada. Sem sessão/conta nova comprovada na última observação; fluxo físico e aceite geral permanecem abertos. Não houve deploy, alteração do Samsung ou lógica do app.
- **Ferramentas/checagens:** Android CLI oficial para interações nativas; wrapper local lê saída CP1252 em memória e sanitiza e-mails/CPF/códigos antes de gravar. Saídas iniciais com acentos corrompidos preservadas; decodificação corrigida para as observações posteriores, sem atribuir isso ao app. git diff --check PASS; apenas o AVD exclusivo atual permanece em execução. Script de build/README alterados e validados no CP 075, ainda sem commit/CI novo. Próximo passo depende da confirmação direta do usuário no AVD.

<a id="cp-20261103-077-cadastro-e-retomada-emulados-aprovados"></a>

## CP 20261103 077 Cadastro e retomada emulados aprovados

- **Data:** 03/11/2026, 21h20, America/Sao_Paulo.
- **Entrada recebida/validada:** usuário informou pronto após digitar OTP diretamente no AVD. Layout posterior confirmou etapa 2/Como se chama sua loja, sem solicitar outro código. Nenhum OTP lido/registrado pelo agente.
- **Execução nativa/API real:** nome sintético de loja preenchido; Criar minha conta abriu pagamentos (homologação liberada), seguido de câmera/Agora não e dashboard Online, QA/PDV Emulador 20261103, zero vendas/valores. Nova conta sintética criada na homologação por essa ação; nenhuma venda, assinatura paga ou operação financeira executada. Após force-stop e abertura fria, mesma dashboard/loja retornou sem OTP. Layouts builds/pdv-emulador-apos-confirmacao-usuario-layout.json, conta-criada, camera-onboarding, dashboard-nova-conta e retomada-apos-cadastro preservados.
- **Resultado/limites:** confirmação válida, criação/onboarding e retomada após cadastro PASS no AVD API 35, complementando quatro casos do CP 076. Não equivale a login com uma nova solicitação de código nem encerra CPF/e-mail repetidos ou relato físico.
- **Próximo lote:** reset somente do pacote de teste no AVD identificado como emulador, após preservar evidências, para simular instalação nova e tentar e-mail existente/limite e outro e-mail com o mesmo CPF sintético. Conta remota de teste permanece; Samsung/produção e dados de outros apps preservados. Será necessária outra confirmação OTP direta do usuário para o CPF repetido e depois para login.

<a id="cp-20261103-078-email-repetido-e-limite-emulados-aprovados"></a>

## CP 20261103 078 E-mail repetido e limite emulados aprovados

- **Data:** 03/11/2026, 21h22, America/Sao_Paulo.
- **Executado:** screenshot/dashboard anterior preservado; ro.kernel.qemu=1 conferido antes de pm clear exclusivamente br.com.pdv.mobile.homologacao no emulator-5586. Conta remota sintética preservada. Boas-vindas reapareceu, simulando nova instalação, sem tocar telefone/produção.
- **Resultado nativo/API real:** cadastro com e-mail da conta recém-criada recusado ainda na primeira tela: Este e-mail já tem acesso. Entre com seu código pessoal. Repetição imediata mostrou Muitas tentativas. Aguarde alguns minutos e tente novamente. Layouts builds/pdv-emulador-email-repetido-layout.json e limite-tentativas-email preservados/sanitizados. Asserções do lote anterior e deste elevam resumo a nove cenários emulados PASS.
- **CPF repetido em andamento:** alterado somente e-mail para segundo alias livre da fixture, mantendo nome/CPF sintético da conta anterior. Código solicitado, primeira etapa preservada e campo de OTP visível. Usuário solicitado a digitar diretamente novo código do alias com cpf e confirmar. Emitir OTP não constitui aprovação do documento nem criação de outra conta.
- **Pendências/próximo passo:** conferir resultado após OTP válido, esperado erro de documento antes da etapa da loja; depois testar Já tenho conta/login/retomada com novo código pessoal. Nenhum desses cenários posteriores concluído neste registro; nenhum código verdadeiro capturado ou bypass de autenticação.

<a id="cp-20261103-079-cpf-repetido-bloqueado-no-android-emulado"></a>

## CP 20261103 079 CPF repetido bloqueado no Android emulado

- **Data:** 03/11/2026, 21h23, America/Sao_Paulo.
- **Entrada/resultado:** usuário confirmou novo OTP diretamente no AVD. Observação posterior manteve o formulário inicial, com erro junto ao documento: Já existe uma conta com este CPF/CNPJ. Entre na conta ou procure o suporte. Nome e CPF foram mantidos da fixture recém-cadastrada; apenas e-mail trocado para alias distinto. Não abriu etapa da loja ou dashboard.
- **Evidência:** builds/pdv-emulador-cpf-repetido-apos-otp-layout.json sanitizado. Cenário de duplicidade de documento após prova válida PASS em Android API 35/release x86_64/API real de homologação. Não criado outro cadastro pelo agente nesta tentativa; não afirmar contagem global de banco sem consulta própria. Não reproduziu o comportamento de CPF ignorado relatado anteriormente, cujo diagnóstico CP 068 terminava antes de verificar OTP.
- **Limites/próximo passo:** relato histórico físico preservado, sem encerrar aceite Samsung nem inferir a causa daquele relato. Próximo lote testa Já tenho conta sem autenticar automaticamente, código inválido/válido no login e retomada. Código verdadeiro permanece fora dos registros.

<a id="cp-20261103-080-rodada-emulada-concluida-com-achado-de-mensagem"></a>

## CP 20261103 080 Rodada emulada concluída com achado de mensagem

- **Data:** 03/11/2026, 21h25, America/Sao_Paulo.
- **Escopo concluído:** teste dirigido de cadastro/login na variante release x86_64 0.1.10/11, Android API 35, API HTTPS real de homologação, com três confirmações OTP digitadas diretamente pelo usuário. Uma conta sintética criada; conta/loja permanecem para testes. Nenhuma operação financeira executada. Variante tem mesmos 300 fontes/bundle Hermes do APK ARM do Samsung (CP 075), mas é outro binário/ABI e não constitui aceite físico.
- **Resultados:** 14 verificações funcionais PASS no resumo builds/pdv-emulador-acesso-resultados.json: obrigatoriedade; e-mail/CPF inválidos; emissão OTP sem avançar; OTP inválido no cadastro; OTP válido antes da loja; criação/onboarding; retomada após cadastro; e-mail repetido; limite imediato; CPF repetido após OTP de outro e-mail; Já tenho conta sem login automático; recusa de OTP inválido no login; login válido diretamente à dashboard; retomada após login. São verificações de fluxos no mesmo AVD, não 14 instalações independentes ou uma suíte financeira completa.
- **Login final:** após recusa do CPF, Já tenho conta abriu Entrar na sua conta, sem autenticar. Código pessoal solicitado para a conta original; código inválido manteve login. Usuário digitou código verdadeiro; layout confirmou dashboard Online/mesma loja, sem pedir novo OTP. Force-stop e abertura fria retornaram à mesma dashboard. Evidências login-valido-apos-usuario, retomada-apos-login, ja-tenho-conta-sem-login-automatico e login-otp-invalido, além de screenshot builds/pdv-emulador-login-final.png.
- **Achado FAIL de mensagem:** OTP inválido no login exibiu Sua sessão não é mais válida. Entre de novo., em vez de indicar código inválido/expirado. A recusa funcional PASS não aprova esse texto. Fonte confirma causa: API emitir 401/codigo_invalido em servicos/codigoLogin.ts, enquanto BackendHttp ignora corpo de todo 401 e converte status em nao_autorizado (linhas 49, 218, 272), usando mensagem de sessão de backend.ts. Não houve autenticação com código inválido na observação. Nenhuma correção runtime implementada nesta rodada; não afirmar que a mensagem esteja corrigida no APK entregue.
- **Checagens/preservação:** AST do script e build release real PASS, assinatura/gate de bundle PASS; hashes original/emulador reconferidos. APK ARM original permanece 4e32a8cd6f372b9bac7c622d30848c3773a8c4283bb8ac0dd598bb781be6ffdb; x86_64 8ad1dce84f1a949fa3331a1bc899c33dcae63976564bb2f3da5851e860c9f35f. Sem novo CI, commit, deploy, mudança de proteções do Windows ou operação no Samsung/produção. Script de build/README e documentação locais alterados, trabalhos anteriores preservados. AVD permanece aberto na dashboard para inspeção; somente fixture sintética nesse app.
- **Limites/próximo passo:** comportamento de CPF ignorado não reproduzido no cenário nativo/servidor real (CP 079); relato físico anterior mantido, sem conclusão retroativa. Corrigir mensagem nas rotas públicas de login preservando tratamento seguro de sessões protegidas, validar regressão e novo reteste antes de entregar APK posterior. Expiração longa, recuperação/troca de perfis, scanner, ciclo financeiro/offline e aceite físico continuam fora desta rodada. Roadmap/roteiro atualizados; não encerrar R5/R6 por esses resultados.

<a id="cp-20261103-081-mensagem-de-codigo-invalido-corrigida-localmente"></a>

## CP 20261103 081 Mensagem de código inválido corrigida localmente

- **Data:** 03/11/2026, 21h31, America/Sao_Paulo.
- **Solicitação/etapa:** usuário autorizou corrigir mensagem do CP 080 e pediu indicação da próxima fase. Correção de acesso R5 construída e validada localmente; piloto e aceite geral permanecem abertos.
- **Construído:** apps/mobile/src/servicos/backendHttp.ts classifica 401 das provas públicas /auth/vinculos e /auth/login como codigo_invalido, exibindo a mensagem fixa existente Código inválido ou expirado. Confira o código ou solicite outro. Opção explícita somente nessas duas chamadas; nenhum corpo 401 lido nem mensagem livre do servidor exibida. Rotas protegidas mantêm invalidação da credencial correspondente e mensagem de sessão vencida. Outras rotas públicas, recuperação, limites 429 e rede preservam tratamento anterior. Sem mudança na API, prova de código, autorização ou schema.
- **Testes de regressão:** backendAcesso.test.ts cobre as duas provas, ausência de Authorization/callback e corpo 401 que lançaria erro se lido, além de sessão protegida e outra rota pública. acessoApiIntegracao.test.ts usa BackendHttp/Dados/API/PGlite/SQLite reais em fixture local: código incorreto e expirado geram os dois 401 reais, mensagem correta e preservam sessão anterior. Sem SMTP/contas remotas ou códigos reais.
- **Resultados:** primeiro lote: cinco arquivos/60 testes PASS (backendAcesso, acessoApiIntegracao, acessoMobile, backendRecuperacao, backendSync). Segundo: acessoApiIntegracao e recuperacaoTela, 21 PASS; quatro casos integrados repetidos. Total de seis arquivos/77 casos únicos aprovados. Tipos mobile e git diff --check PASS. Primeira checagem de tipos apontou chamada de método opcional na nova fixture; presença conhecida do BackendHttp explicitada no teste e nova checagem PASS, sem alteração runtime adicional. Logs em builds/pdv-codigo-login-correcao-{testes,integracao-tela,tipos,tipos-final}.log; resumo pdv-codigo-login-correcao-resumo.json.
- **Estado da entrega/limites:** fontes locais corrigidos, sem novo commit, CI, APK ou deploy nesta rodada. APKs 0.1.10 já entregues/emulados continuam com o texto anterior; resultado Android do CP 080 continua histórico dessa versão. Não declarar novo PASS nativo da mensagem ou atualização instalada. Alterações de outros trabalhos preservadas.
- **Próxima fase prática:** preparar novo APK rastreável com a correção e retestar mensagem; seguir piloto funcional no Samsung: cadastrar produto real e conferir leitura/nome/preço/estoque, abrir caixa, vender em dinheiro/Pix manual/cartão manual, sincronizar e conferir histórico/estoque/saldo, fechar/reabrir, vender offline em turno reservado, reconectar sem duplicar e fechar caixa conferindo diferença. Continuar depois cenários multioperador/isolamento, recuperação e restauração conforme matriz. R6 (pagamentos reais integrados) exige piloto estável/R3 homologada e ainda não está liberada. Backups externos/alertas mantidos no backlog autorizado.

<a id="cp-20261103-082-roadmap-reconciliado-com-evidencias"></a>

## CP 20261103 082 Roadmap reconciliado com evidências

- **Data:** 03/11/2026, 21h40, America/Sao_Paulo.
- **Solicitação/achado:** usuário apontou vários checkboxes desmarcados no roadmap. Revisão encontrou itens que juntavam entrega já comprovada e homologação ainda pendente, além de textos históricos apresentados como estado atual (API/APK só em R0, ausência de PostgreSQL independente, correções tratadas como snippets não aplicados). Resposta anterior sobre a próxima fase resumia o teste imediato, sem explicar todas as pendências de R5.
- **Atualizado:** docs/roadmap-app-completo.md recebeu estado consolidado no início, regra explícita de marcação, quadro atual de acesso/R5, atualização do modelo de identidades/gerente e distinção do histórico incremental. Checkboxes compostos separados em implementação/implantação/artefato comprovados e validação externa/física restante. Não usar a nova quantidade de caixas como percentual de progresso: a granularidade mudou, sem construção de recursos neste lote.
- **Concluído no checklist com evidência existente:** separação dos bancos e contas sem semente; OTP real/cadastro/login/duplicidades/limite/retomada no alcance dos CPs 057–080; migrações/API R1–R4, PostgreSQL 17 no CI e APK cumulativo entregues; reserva/movimentos/reenvio por HTTP externo; 18 tratamentos da auditoria com CI/APK; exclusão de simuladores do release; implementação/documentação de suporte/políticas; correção local da mensagem/77 testes; política vigente de acesso gratuito. Bases: CPs 025, 032–034, 045, 054, 057–058 e 075–081, matriz da auditoria e relatórios/artefatos correspondentes. Os registros antigos foram preservados e contextualizados.
- **Mantido aberto:** isolamento completo de credenciais SMTP; expiração/reenvio/recuperação físicos; histórico/retorno/restauração do schema atual; concorrência e isolamento multiusuário completos; amostra de catálogo/4G; novo APK e reteste da mensagem; scanner, acessibilidade, SecureStore/exportação nativos; ciclo financeiro/offline e F01–F19, atendimento, dependências/operacional e aceite. R6, integração/distribuição de R7 e backlog de backup externo/alertas conservam escopo próprio. Um item de gratuidade já implementado em R7 foi marcado, sem ativar cobrança ou antecipar distribuição.
- **Validações/limites:** conferidas evidências locais de HTTP externo, auditoria/APK, rodada emulada e correção local; revisados requisitos originais para manter suas partes pendentes nas divisões. Snapshot anterior do checklist em builds/pdv-roadmap-checklist-antes-revisao.json. Nenhum teste de produto, CI, deploy, APK ou operação de banco/aparelho executado nesta revisão documental; estados de validação herdados dos checkpoints citados. Alterações runtime/testes de outros lotes preservadas.
- **Checagem final:** 80 referências de checkpoint conferidas, sem anchors ou destinos locais ausentes; git diff --check PASS. Resultado em builds/pdv-roadmap-reconciliacao.json. A primeira checagem de anchors considerava apenas IDs explícitos; ajustada para reconhecer também o título automático válido do CP 003, sem alterar seu histórico.
- **Próximo passo:** incluir a correção local no próximo APK/retestar e executar o piloto funcional de produto, venda, caixa, sincronização/offline e fechamento. Depois completar multioperador, recuperação/restauração e operação/aceite da matriz. A fase atual é R5; a entrada em R6 continua condicionada ao piloto estável. Conferência final de links/checklists/diff registrada na evidência de revisão, sem inferir novos PASS físicos.

<a id="cp-20261103-083-ciclo-emulado-produto-persistido-e-crash-nativo"></a>

## CP 20261103 083 Ciclo emulado: produto persistido e crash nativo

- **Data:** 03/11/2026, America/Sao_Paulo (rodada iniciada após CP 082).
- **Escopo:** ciclo de venda/caixa/offline solicitado no Android Emulator; reutilizada sessão sintética dos CPs 077–080, AVD API 35/emulator-5586, qemu=1, release x86_64 0.1.10/11, hash do CP 075. API real de homologação; sem mudança em produção/Samsung ou limpeza de dados.
- **Validado parcialmente:** catálogo inicialmente vazio; produto sintético Produto QA Ciclo, sem EAN, R$10 e estoque 20 un criado por interface nativa. Após reabrir, lista contém exatamente um produto com esses valores. Evidência builds/pdv-emulador-ciclo-lista-apos-retomada-layout.json. Nenhuma venda concluída neste lote.
- **FAIL nativo:** após salvar/retornar à lista, aplicativo encerrou. Buffer crash registra em 04/11 01:08 UTC (03/11 22:08 em São Paulo) IllegalStateException/addViewAt, child already has a parent, ReactClippingViewManager/Fabric. Evidência builds/pdv-ciclo-crash-salvar-produto.log; falha histórica ARM anterior no buffer é distinta. Persistência aprovada não aprova navegação. Hipótese de clipping da FlatList durante transição vazio→primeiro item em investigação; ainda sem correção/reteste comprovados.
- **Ferramenta construída:** scripts/pdv-emulador-ui.py usa layout/input oficiais Android CLI e ADB, rótulos exatos, guarda qemu e snapshots sanitizados; sem credenciais, acesso ao banco ou bypass de autenticação. Uso local iniciado, ainda sem roteiro financeiro completo.
- **Próximo passo:** corrigir/retestar o crash em novo APK rastreável, incluindo correção CP 081; executar abertura, pagamentos manuais, movimentos, persistência/offline/reconexão e fechamento. Emulação não preenche matriz física nem aceite humano; demais pendências R0–R5 preservadas.

<a id="cp-20261103-084-apk-0111-emulador-e-primeira-venda"></a>

## CP 20261103 084 APK 0.1.11 emulador e primeira venda

- **Data:** 03/11/2026, 22h16, America/Sao_Paulo.
- **Construído:** ListaProdutos.tsx explicita removeClippedSubviews=false, evitando destacar filhos nativos durante atualização da lista/transição Android. Tratamento direcionado ao stack ReactClippingViewManager/Fabric do CP 083; eficácia nativa ainda pendente neste instante. app.json avança a 0.1.11/versionCode 12; correção de login CP 081 incluída, fontes anteriores preservados.
- **Artefato:** builds/pdv-homologacao-0.1.11-emulador.apk, x86_64/release/R8, SHA256 e7fcd26bce85b31e8d1ab83efe77b28ba5679739fd7ce60487237a533baba6f7. Gradle SUCCESS em 5m21s, assinatura/host/contratos públicos/mapa de 1.892 fontes e gate release aprovados. Manifesto, mapping, inventário e logs com mesmo prefixo. Nenhum APK ARM novo, CI ou deploy; API permanece compatível em homologação.
- **Validado no APK anterior 0.1.10:** reserva online de turno com R$100; unidade do produto de R$10 adicionada pela busca; recebido R$20/troco R$10; venda concluída e recibo com uma unidade/total R$10/recebido R$20/troco R$10. Layouts builds/pdv-ciclo-{abertura-0110,dinheiro-troco,venda-dinheiro-concluida,recibo-dinheiro-0110}-layout.json. Valores sintéticos, sem transação bancária. Abertura e primeira venda aconteceram antes da atualização; não atribuir à versão nova.
- **Validação local:** tipos mobile PASS; sete arquivos/76 casos PASS. Cinco integrações HTTP localhost falharam no sandbox (sem vínculo/dados recebidos); repetição fora da restrição iniciada, resultado ainda pendente. Logs builds/pdv-ciclo-{tipos,regressoes,integracao-liberada}.log. Não tratar falhas iniciais como PASS ou corrigir autorização para acomodá-las.
- **Ferramenta:** driver nativo ajustado para ações de acessibilidade; toques por coordenadas em busca eram interceptados pela área manuscrita do Gboard. Isso é interferência da automação/teclado, distinta do crash registrado. Bytecode Python e diff conferidos.
- **Próximo passo:** instalar 0.1.11 com -r sem limpar dados; conferir sessão/produto/venda/turno, reproduzir lista vazia→item, completar Pix/cartão manuais/movimentos/offline/reinício/reenvio/fechamento e reconciliar com consulta online do servidor. Piloto físico e aceite mantidos pendentes.

<a id="cp-20261103-085-atualizacao-e-correcao-nativa-validadas"></a>

## CP 20261103 085 Atualização e correção nativa validadas

- **Data:** 03/11/2026, 22h19, America/Sao_Paulo.
- **Android/API real:** atualização adb install -r --abi x86_64 retornou Success; pacote instalado conferido 0.1.11/12, hash CP 084. Sessão retomada sem OTP; turno aberto/R$100, venda única/R$10 e produto/R$10/estoque19 preservados. Layouts builds/pdv-ciclo-atualizacao-0111-layout.json e regressão correspondente.
- **Reteste do FAIL CP 083:** lista filtrada para QA Regressao mostrou Nenhum produto encontrado; cadastro nativo do produto com esse nome/R$1 e retorno ao mesmo filtro passaram, agora com primeiro resultado. Sem fechamento do app, screenshot/layout builds/pdv-ciclo-regressao-primeiro-item.*. Buffer crash consultado desde instalação não contém novo erro, em builds/pdv-ciclo-crash-apos-0111.log. Valida o cenário dirigido na variante corrigida; não comprova ausência de todo crash nem reteste Samsung. Produto auxiliar sem estoque, sem venda.
- **Sync:** após atualização, indicação transitória offline observada; Sincronizar agora concluiu Dados confirmados no servidor, dois produtos/uma venda, zero aguardando e zero revisão. Evidência builds/pdv-ciclo-sync-apos-atualizacao-layout.json. Não houve limpeza de fila ou mudança de identidade.
- **Regressões:** cinco casos de syncIntegracao.test.ts passaram com HTTP localhost liberado, completando 81 casos dirigidos em oito arquivos; tipos mobile PASS. Evidência builds/pdv-ciclo-integracao-liberada.log complementa os 76 PASS no sandbox do CP 084, sem apagar as cinco falhas iniciais.
- **Próximo passo:** pagamentos Pix/cartão manuais e movimentos conhecidos; venda dividida, encerramento forçado, venda/fechamento offline, reinício e reconexão; conferir IDs/totais/estoque e relatório confirmado. Mensagem de login incluída, reteste nativo específico ainda pendente. Sem aceite físico/usuário ou avanço à R6.

<a id="cp-20261103-086-pagamentos-manuais-e-movimentos-emulados"></a>

## CP 20261103 086 Pagamentos manuais e movimentos emulados

- **Data:** 03/11/2026, 22h29, America/Sao_Paulo.
- **Android/API real:** na 0.1.11/12 x86_64 do CP 084, mais duas vendas sintéticas de uma unidade/R$10: Pix manual e cartão de crédito manual. Avisos de ausência de processamento/confirmacão bancária conferidos antes da conclusão; chave Pix de exemplo sem conta bancária usada somente para gerar QR de teste. Não houve transferência Pix/cartão real. Primeira venda em dinheiro permanece do CP 084.
- **Totais observados:** três vendas/R$30; dinheiro10, Pix10, cartão10; troco inicial100 e esperado110. Entrada50 (origem Tesouraria QA/motivo Reforco QA) levou esperado a160; sangria8 (Cofre QA/Sangria QA), a152; retirada2 (Despesa QA/Retirada QA), a150. Uma ocorrência de cada movimento na tela. Layouts builds/pdv-ciclo-{venda-pix-concluida,cartao-manual-aviso,venda-cartao-concluida,gaveta-tres-vendas,apos-entrada,apos-sangria,movimentos-conferidos}-layout.json.
- **Confirmação:** Sincronizar agora concluiu dois produtos/três vendas, zero aguardando/zero revisão. Evidência builds/pdv-ciclo-sync-antes-offline-layout.json. Horário de sincronização é exibido no fuso UTC do AVD; checkpoints e horário comercial usam São Paulo.
- **Regressão completa:** 73 arquivos/600 casos mobile aprovados no conjunto. Primeira execução: 578 PASS e dois beforeAll/PGlite excederam 10s (22 não executados); repetição somente das duas suítes com maxWorkers=1 passou 22/22. Logs builds/pdv-ciclo-mobile-{completo,repeticao}.log; não soma duplicatas dos 81 testes dirigidos. Tipos já aprovados no CP 084. Sem alteração em API/runtime após o build.
- **Limites de automação:** interrupções por seleção de aba/rótulo, controles fora da área visível e toques durante transição foram reobservadas antes de retomar; nenhuma repetição de recebimento assumida. Snapshots e ações posteriores distinguem PASS financeiro dos lotes de automação interrompidos, em builds/pdv-ciclo-execucoes.jsonl. A confirmação da retirada foi repetida apenas após observar formulário/valor2 e esperado152, sem evento salvo; saldo150 então conferido.
- **Próximo passo:** desligar conectividade somente do AVD, testar parcela parcial/force-stop, duas vendas offline, reinício do Android, fechamento pendente e reconexão/reenvio; comparar estoque, referências e relatório do servidor. Multioperador/físico/aceite permanecem fora deste PASS dirigido.

<a id="cp-20261103-087-parcela-sobrevive-a-force-stop-offline"></a>

## CP 20261103 087 Parcela sobrevive a force-stop offline

- **Data:** 03/11/2026, 22h33, America/Sao_Paulo.
- **Conectividade comprovada:** somente emulator-5586/qemu1 colocado em modo avião; Wi-Fi desligado, Active default network: none. Prova builds/pdv-ciclo-rede-offline.json, snapshots com Airplane mode e Sem conexão com o servidor. Windows/API não foram desconectados; nenhuma simulação de backend ou troca de relógio.
- **Parcela durável:** quarta venda de uma unidade/R$10 iniciada offline; divisão recebeu R$5 em dinheiro, mostrando Pago5/Falta5 e uma parcela. Force-stop do pacote e abertura fria sem rede preservaram sessão/turno. Dashboard ainda mostra três vendas/R$30 (venda parcial não concluída); Vender retoma diretamente a cobrança com Já recebido5 de10/Falta5, sem cobrar novamente a primeira parcela. Evidências builds/pdv-ciclo-{parcela-offline-salva,retomada-offline-carregada,parcela-retomada}-layout.json e pdv-emulador-ciclo-retomada-carrinho-parcial-layout.json.
- **Limites:** snapshot imediato após launch capturou apenas barra do sistema durante bootstrap; observação posterior carregou normalmente. Roteiro foi ajustado para o destino real: Vender já encaminha à cobrança parcial, em vez de exibir outro botão Cobrar10. Não houve nova parcela por essas correções de automação. Conclusão dos R$5 restantes e quinta venda offline estão em execução, ainda não aprovadas neste checkpoint.
- **Artefato adicional:** compilação ARM 0.1.11/12 com mesmos fontes iniciada para disponibilizar atualização interna após validação; em andamento, sem instalar no Samsung, CI ou deploy novo.
- **Próximo passo:** concluir duas vendas offline, reiniciar Android mantendo rede desligada, fechar contado170/esperado175, conferir bloqueio de reserva pendente e reconectar/repetir sync sem duplicar. Valores futuros são expectativas do roteiro, não resultados observados. Matriz física/aceite preservados.

<a id="cp-20261103-088-venda-dividida-offline-e-interrupcao-do-avd"></a>

## CP 20261103 088 Venda dividida offline e interrupção do AVD

- **Data:** 03/11/2026, 22h36, America/Sao_Paulo.
- **PASS adicional:** depois do CP 087, cobrança retomada confirmou primeira parcela5; divisão mostrou Pago5/Falta5. Pix manual dos R$5 restantes concluiu a quarta venda/R$10, mostrando Dividido em2. Evidência builds/pdv-ciclo-dividida-offline-concluida-layout.json. Nenhuma conexão bancária; rede do AVD continuava indisponível.
- **Interrupção externa ao app em investigação:** antes de concluir a quinta venda, Android CLI recebeu erro de transporte ADB closed e adb devices deixou de listar o AVD; consulta de processos não encontrou qemu/emulator. Não atribuir ao app nem à compilação concorrente sem prova. Não contar a quinta venda ou recuperação como PASS por esse erro.
- **Retomada construída:** mesmo AVD pdv-acesso-api35-curto/C:/p/pdv-avd reaberto com binário oficial 36.2.12 já usado no CP 073, WHPX/SwiftShader/Vulkan desligado somente no processo. Sem wipe-data, sem snapshot anterior, sem desinstalação/limpeza/reset de sessão ou filas. Boot completo em andamento; ADB já identifica emulator-5586 offline (estado de transporte, distinto da falta de rede do Android). Logs builds/pdv-ciclo-avd-retomada{,-erros}.log.
- **Pendências/próximo passo:** observar dados e rede após boot, conferir as quatro vendas/parcelas preservadas, completar a quinta/R$20 apenas se ausente, depois fechar/reconectar/reconciliar. Caso a quinta já exista, não repetir. APK ARM ainda compilando, físico/aceite continuam pendentes. O encerramento de processo do AVD não substitui o teste planejado de reboot limpo do Android.

<a id="cp-20261103-089-cinco-vendas-preservadas-sem-rede"></a>

## CP 20261103 089 Cinco vendas preservadas sem rede

- **Data:** 03/11/2026, 22h40, America/Sao_Paulo.
- **Recuperação do AVD:** boot completo em 94,8s; modo avião1 e nenhuma rede padrão preservados. Abertura durante boot retornou Activity does not exist antes da varredura de pacotes, sem reinstalação; pacote reapareceu ao concluir boot. Consulta de layout iniciada antes do boot ficou presa e foi encerrada somente no processo Android CLI correspondente; tela de bloqueio padrão do AVD dispensada. App abriu mesma sessão/loja/turno, quatro vendas/R$40: dinheiro15/Pix15/cartão10. Evidências builds/pdv-emulador-ciclo-boot-completo-observado-layout.json e pdv-ciclo-apos-reinicio-avd-offline-layout.json. Nenhuma consulta/transmissão de credenciais.
- **Quinta venda:** checkout vazio observado antes de iniciar; quinta venda offline de duas unidades/R$20 em dinheiro concluída uma vez. Dashboard sem rede mostra cinco vendas/R$60, dinheiro35/Pix15/cartão10. Evidências builds/pdv-ciclo-{venda-offline-vinte-concluida,cinco-vendas-offline}-layout.json e screenshot da conclusão. Venda dividida anterior continua única. Zero confirmações novas do servidor foram inferidas durante modo avião.
- **Próximo passo:** reboot normal do Android e nova conferência dos cinco registros ainda offline; fechamento contado170/esperado175, bloqueio de nova reserva pendente e reconexão. Comparar referências/estoque/relatório online e repetir sync. APK ARM em finalização/R8; causa do encerramento anterior do processo do AVD continua não comprovada, sem classificá-la como crash do app. Físico/aceite preservados.

<a id="cp-20261103-090-reboot-offline-e-apk-arm-0111"></a>

## CP 20261103 090 Reboot offline e APK ARM 0.1.11

- **Data:** 03/11/2026, 22h42, America/Sao_Paulo.
- **Reboot normal PASS:** adb reboot do AVD, boot_completed1 e abertura sem limpeza/OTP; modo avião1/nenhuma rede padrão mantidos. Cinco vendas/R$60 e meios35/15/10 preservados. Caixa mostra esperado175 = troco100 + dinheiro35 + entrada50 − sangria8 − retirada2. Histórico antes do envio contém referências 000001–000005, com dividida000004 e dinheiro20 na000005, uma ocorrência cada. Evidências builds/pdv-ciclo-{reboot-normal-offline,gaveta-offline-175,referencias-antes-sync}-layout.json.
- **APK ARM construído:** builds/pdv-homologacao-0.1.11.apk, 0.1.11/12 ARM64/ARM32/R8, SHA256 2df561ee3c7c6717aab82304e1dc4ff2ab5b9858b47aeb7e551e23bf648fe0c3. Gradle SUCCESS8m1s; gate release/assinatura/manifesto/mapa aprovados. Mesmo certificado interno da0.1.10 (SHA256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c). Sem instalação no Samsung/produção, CI ou deploy novos.
- **Comparação:** 300 arquivos nos inventários ARM/emulador sem divergência; bundle Hermes idêntico, SHA256 2b0ef95648b5699f3044fb5d9846abb69f57b468da966e3ac3b1d3817b2cad37. Resultado builds/pdv-ciclo-artefatos-comparados.json. Mesmos fontes/JS não tornam a execução x86_64 um teste das bibliotecas ARM ou scanner físico.
- **Próximo passo:** fechar offline com contado170/troco preservado20 (recolhido150), conferir diferença−5 e alerta de confirmação pendente, reabrir app ainda offline e reconectar. Depois comparar referências, estoque14, caixa e relatório confirmados/repetir sync. Mensagem de login inválido no APK novo ainda precisa do reteste nativo específico. Nenhum aceite humano/físico inferido.

<a id="cp-20261103-091-fechamento-offline-duravel-e-fila-preservada"></a>

## CP 20261103 091 Fechamento offline durável e fila preservada

- **Data:** 03/11/2026, 22h44, America/Sao_Paulo.
- **Fechamento nativo PASS:** sem rede, contado170/esperado175 mostrou Falta5; troco preservado20 preenchido e confirmação explicou que o servidor precisa confirmar antes de outro turno. Fechamento salvo, caixa fechado, cinco vendas/R$60 e alerta Fechamento salvo neste aparelho e pendente de confirmação. Force-stop/abertura fria mantiveram fechamento, diferença e alerta sem novo OTP. Layouts builds/pdv-ciclo-fechamento-offline-{contagem,confirmacao,salvo,retomado}-layout.json.
- **Fila preservada:** tela de sincronização ainda offline, dois produtos/cinco vendas, três aguardando confirmação e zero revisão, última confirmação anterior à desconexão (01:29:42 UTC no AVD). São duas vendas concluídas offline e fechamento ainda não confirmados; não houve limpeza/reclassificação da fila. Evidência builds/pdv-ciclo-fila-fechamento-offline-layout.json e screenshot.
- **Limites:** aviso/instrução de impedimento de nova reserva conferidos; não foi efetuada nova abertura nem concorrência remota nesta etapa. Recolhido150/troco20 e aceite do fechamento ainda exigem conferência no painel confirmado após reconexão. Nenhuma afirmação de ACK do servidor para esses três registros neste checkpoint.
- **Próximo passo:** reconectar somente o AVD, sincronizar e repetir sem duplicar; comparar referências000001–000005, estoque14, fechamento175/170/−5 e destinação150/20 no servidor. Depois retestar texto público de código inválido sem invalidar a sessão atual e consolidar documentação/artefatos. Emulação não conclui a matriz física.

<a id="cp-20261103-092-reconexao-sem-duplicacao-e-caixa-confirmado"></a>

## CP 20261103 092 Reconexão sem duplicação e caixa confirmado

- **Data:** 03/11/2026, 22h50, America/Sao_Paulo.
- **Rede/ACK:** modo avião desativado, Wi-Fi/dados restaurados somente no AVD; rede padrão100 confirmada. Envio e segunda sincronização forçada concluíram Dados confirmados no servidor, cinco vendas/dois produtos, zero aguardando e zero revisão. Evidências builds/pdv-ciclo-sync-{reconexao,repetida}-layout.json, asserções das linhas0/0 no registro de execução. Os três pendentes do CP091 foram confirmados, sem limpeza manual.
- **Integridade:** referências000001–000005, meios, horários e valores idênticos antes/depois do envio repetido; cinco únicas, total60. Comparação programática PASS em builds/pdv-ciclo-referencias-comparadas.json. Produto principal passou de estoque20 a14 (seis unidades vendidas), uma baixa por quantidade, sem baixa adicional pelo reenvio. Evidência builds/pdv-ciclo-estoque-apos-sync-layout.json.
- **Caixa remoto:** consulta Atualizar do servidor no painel real mostra turno01a1a41b-e7d2-7fc0-8fd6-c190998de9f2 (mesmo UUID vinculado à venda000005 antes do envio), Encerrado, esperado175/contado170/diferença−5. Seleção detalhada confirma entrada50/sangria8/retirada2 com três eventos distintos e autoria/responsável originais; recolhido150 e troco20. Evidências builds/pdv-ciclo-{painel-caixa-confirmado,turno-confirmado-movimentos,turno-confirmado-destinacao}-layout.json. Resumo local sem alerta de fechamento pendente, histórico preservado.
- **Artefato instalado:** SHA256 do base.apk instalado no Android reconferido igual ao candidato emulado e7fcd26b…aba6f7, pacote/0.1.11/12/Android15/API35/x86_64/qemu1 em builds/pdv-ciclo-inventario-instalado.json. Não ler armazenamento privado/SecureStore nem extrair tokens.
- **Próximo passo:** terminar conferência de totais do relatório HTTP já aberto (movimentos e diferença−5 observados), retestar texto de login inválido via e-mail sintético não cadastrado (sem gerar/ler OTP) mantendo sessão financeira, e consolidar roteiro/roadmap/entrega. Nenhum novo turno aberto, transferência/multioperador, falha de disco, restauração ou teste físico inferidos.

<a id="cp-20261103-093-ciclo-emulado-concluido-e-entrega-0111"></a>

## CP 20261103 093 Ciclo emulado concluído e entrega 0.1.11

- **Data:** 03/11/2026, 22h58, America/Sao_Paulo.
- **Resultado do objetivo solicitado:** ciclo dirigido de venda, caixa e offline concluído em Android Emulator/API real de homologação, um operador/loja sintéticos. Cinco vendas/R$60, dinheiro35/Pix manual15/cartão manual10; entrada50/sangria8/retirada2; parcela5 retomada após force-stop; duas vendas concluídas sem rede; reboot normal; fechamento offline175/170/−5 preservado após force-stop; reconexão e sync repetido0/0 sem duplicação. Produto20→14 unidades. Não houve pagamento bancário, acesso a SQLite privado/SecureStore, mudança de relógio, limpeza de filas, produção ou instalação no Samsung.
- **Conferência independente:** painel HTTP confirma o UUID original do turno, três movimentos com autoria/eventos distintos, esperado175/contado170/diferença−5 e recolhido150/troco20. Relatório HTTP03/11 confirma vendas60/recebimentos60/entrada50/sangria8/retirada2/diferença−5. Referências comerciais000001–000005, meios/valores/horários e quantidade idênticos antes/depois da reconexão. Quatorze asserções programáticas sobre snapshots/API/artefatos PASS em builds/pdv-ciclo-resumo.json; não são catorze instalações ou todos os cenários físicos.
- **Correções entregues:** ListaProdutos.tsx desativa removeClippedSubviews na FlatList, corrigindo o crash Fabric/addViewAt observado no CP083 e retestado no CP085; app.json avança0.1.11/12. Correção pública de login do CP081 incluída e retestada nativamente: endereço aleatório example.invalid não cadastrado (solicitação mascarada sem geração/envio de OTP) e código fictício recusados com Código inválido ou expirado. Confira o código ou solicite outro. Perfil anterior ativo/0 pendências preservado e dashboard online60/5 retomada. Evidências builds/pdv-ciclo-{login-codigo-invalido-corrigido,perfil-preservado-apos-401,dashboard-final}-layout.json. Não testa expiração longa/OTP válido de outro usuário nesta rodada.
- **Artefatos verificados:** ARM64/ARM32 builds/pdv-homologacao-0.1.11.apk, SHA256 2df561ee3c7c6717aab82304e1dc4ff2ab5b9858b47aeb7e551e23bf648fe0c3; x86_64 builds/pdv-homologacao-0.1.11-emulador.apk, SHA256 e7fcd26bce85b31e8d1ab83efe77b28ba5679739fd7ce60487237a533baba6f7. Release/R8, mesmo certificado interno da0.1.10, 300 fontes idênticos entre APKs e checkout, bundle Hermes idêntico. SHA do APK efetivamente instalado reconferido. Gates de release/assinatura/manifesto/mapping PASS, builds5m21s/8m1s. ARM não executado em aparelho físico; assinatura não é de distribuição comercial.
- **Regressões locais:**600 casos mobile únicos/73 arquivos PASS no conjunto;578 no lote completo e22 em repetição isolada das duas suítes com timeout inicial PGlite.81 dirigidos são subconjunto, não somados novamente; cinco integrações localhost passaram fora da restrição de rede do sandbox. Tipos mobile/AST Python/diff e inventário de fontes PASS. Logs detalhados e limitações no [relatório do ciclo](ciclo-venda-caixa-offline-emulador.md). Sem novo commit/CI/deploy; API84dd0dc preservada. Alterações anteriores de outros trabalhos mantidas.
- **Persistência final:** depois do401 público, nova abertura fria manteve sessão online/cinco vendas60, caixa fechado/falta5 e Dados confirmados no servidor/0 aguardando/0 revisão. Layouts builds/pdv-ciclo-{resumo-final,sync-final}-layout.json e screenshot pdv-ciclo-resumo-final.png. Emulador permanece aberto, rede restaurada, fixture preservada; nenhuma pendência deixada artificialmente offline. Buffer crash final pós-reboot sem novo FATAL observado; reinício dos buffers não prova ausência geral de falhas.
- **Documentação:** roadmap marca somente os dois itens emulados/artefato correspondentes; novo relatório, README e roteiro físico atualizados. Checagem final de 150 links locais/anchors PASS, diff sem erros e alterações runtime limitadas conferidas. Histórico CP083–092 preserva crash real, falhas de automação e interrupção do processo do AVD/recuperação sem limpeza; causa dessa interrupção continua não comprovada e distinta do crash corrigido. Dados de teste continuam na homologação, sem exclusão implícita.
- **Limites/próximo passo:** atualizar Samsung para0.1.11 sem limpar dados, repetir ciclo físico/scanner e completar multioperador/concorrência/recuperação/restauração/operacional de F01–F19, registrando aceite humano separadamente. Não houve nova reserva concorrente, disco cheio, exportação aberta no destino ou extração de UUIDs internos de todas as vendas; referências visíveis e UUID do turno foram comparados. R5 física continua aberta, R6 não liberada; backup externo/alertas seguem backlog autorizado. Objetivo desta rodada emulada atendido, sem declarar conclusão de todo o roadmap.

<a id="cp-20261104-094-inicio-do-reteste-guiado-no-samsung-0111"></a>

## CP 20261104 094 Início do reteste guiado no Samsung 0.1.11

- **Data:** 04/11/2026, America/Sao_Paulo.
- **Solicitação:** usuário pediu acompanhamento passo a passo do ciclo de venda, caixa e offline na 0.1.11 do Samsung. Consultados roadmap, CP093, relatório emulado e roteiro físico antes da orientação. Resultado emulado permanece evidência separada.
- **Orientação inicial:** atualizar somente PDV Homologação com o APK ARM do CP093, sem desinstalar/limpar dados; manter internet ligada, confirmar versão0.1.11 e identificar tela inicial ou login. Usar conta de teste; se houver pedido de OTP, digitar somente no celular, sem compartilhar código. Nenhuma operação financeira solicitada ainda.
- **Estado físico:** instalação/versão, sessão, caixa e filas do Samsung ainda não confirmados nesta rodada. Nenhum PASS físico, aceite, mudança de banco, instalação remota ou execução no aparelho atribuídos ao pedido de iniciar o reteste.
- **Próximo passo:** receber confirmação da versão/tela; conferir sincronização e caixa existentes antes de definir valores iniciais. Depois conduzir produto/scanner, abertura, pagamentos manuais, movimentos, persistência/offline/reconexão e fechamento, registrando resultados por etapa. Não apagar histórico ou filas para obter estado inicial vazio.

<a id="cp-20261104-095-versao-0111-e-abertura-direta-relatadas-no-samsung"></a>

## CP 20261104 095 Versão 0.1.11 e abertura direta relatadas no Samsung

- **Data:** 04/11/2026, 00h30, America/Sao_Paulo.
- **Evidência física por relato:** usuário confirmou que o app abriu diretamente no início e que a versão exibida é0.1.11. PASS dirigido desses dois pontos, complementando CP094; sem solicitação de novo OTP nesse caminho relatado. Não houve inspeção remota, captura ou conferência do hash do APK instalado nesta resposta.
- **Limites:** não inferir preservação de todos os registros na atualização, cadastro/login novo, caixa fechado, fila vazia, ausência geral de falhas ou aceite físico do ciclo. Nenhuma operação financeira realizada/relatada nesta etapa.
- **Próximo passo guiado:** com internet ligada, Caixa → Sincronização → Sincronizar agora; coletar estado final e contagens Aguardando confirmação/Preservados para revisão. Em Resumo, identificar caixa aberto/fechado, total e número de vendas de hoje e, se aberto, esperado na gaveta. Manter os dados/turno existentes até conferir o estado inicial; não abrir/fechar caixa ainda. Depois definir produto e valores do teste.

<a id="cp-20261104-096-fila-zerada-e-caixa-fechado-relatados-no-samsung"></a>

## CP 20261104 096 Fila zerada e caixa fechado relatados no Samsung

- **Data:** 04/11/2026, 00h33, America/Sao_Paulo.
- **Evidência física por relato:** usuário informou Aguardando confirmação0/Preservados para revisão0, caixa fechado e vendidoR$0,00 na0.1.11. Estado inicial financeiro registrado; nenhuma abertura/venda/fechamento novo relatado. Texto literal da mensagem de sincronização e quantidade de vendas do dia não informados; não inferir confirmação HTTP nova nem histórico vazio a partir de valor zero.
- **Próximo passo guiado:** cadastrar produto novo e dedicado ao teste em Produtos → Novo produto: nome Teste Samsung04/11, sem código de barras, Unidade(un), preçoR$10,00 e estoque inicial20 se o campo estiver disponível. Salvar e conferir retorno à lista, preço/estoque e eventual fechamento/piscada do app. Não alterar estoque/preço de produto existente. Se estoque não estiver disponível, coletar essa informação antes de definir sua validação.
- **Limites:** cadastro acima é manual; não comprova scanner físico ou catálogo. Produto ainda não criado/validado por relato nesta etapa; caixa permanece fechado. Resultado emulado do CP093 separado; sem limpeza, inspeção remota, mudança de banco/API ou aceite global. Após confirmar produto, orientar abertura online com troco conhecido e seguir vendas/movimentos/offline/fechamento.

<a id="cp-20261104-097-produto-manual-salvo-no-samsung-sem-interrupcao"></a>

## CP 20261104 097 Produto manual salvo no Samsung sem interrupção

- **Data:** 04/11/2026, 00h35, America/Sao_Paulo.
- **Evidência física por relato:** usuário confirmou salvamento do produto orientado no CP096, exibido na lista por R$10,00/estoque20 unidades, sem fechar nem piscar, e pediu abertura do caixa. PASS dirigido do cadastro manual/retorno à lista nesse caminho na0.1.11. Sem captura, hash instalado ou confirmação remota de estoque consultados nesta resposta; ausência nesse caminho não comprova estabilidade visual geral.
- **Estado conhecido:** fila0/0, caixa fechado e vendidoR$0,00 eram o estado anterior do CP096; não inferir nova contagem da fila após criar produto. Nenhuma venda/abertura relatada ainda. Scanner/catálogo não executados pelo cadastro manual.
- **Próximo passo guiado:** em PDV Homologação com internet ligada, Início → Abrir caixa (ou Caixa → Resumo → Abrir caixa); informar troco inicial de teste R$100,00, conferir o visor e tocar Abrir caixa uma vez, aguardando conclusão. Verificar estado aberto, troco100 e esperado100; vendido do dia deve permanecer0 na ausência de outras operações. Abertura e esses valores são expectativas ainda não confirmadas.
- **Limites/continuação:** não concluir F01/F05 ou aceite físico amplo; sem operação remota, limpeza ou mudança de código/API. Após relato da abertura, orientar primeira venda de uma unidade/R$10 em dinheiro com recebido20/troco10, acompanhando o mesmo produto/turno.

<a id="cp-20261104-098-caixa-aberto-com-troco100-relatado-no-samsung"></a>

## CP 20261104 098 Caixa aberto com troco100 relatado no Samsung

- **Data:** 04/11/2026, 00h49, America/Sao_Paulo.
- **Evidência física por relato:** usuário confirmou caixa aberto, troco inicialR$100,00, esperado na gavetaR$100,00 e vendido hojeR$0,00, após orientação de abertura online do CP097. PASS dirigido da abertura/valores exibidos na0.1.11 do Samsung; sem inspeção HTTP, UUID do turno, captura ou nova leitura de filas nesta resposta.
- **Próximo passo guiado:** primeira venda de teste no PDV Homologação: Vender → Buscar produto ou código → Teste Samsung04/11; selecionar uma unidade, conferir totalR$10,00; Cobrar → Dinheiro; informar recebidoR$20,00, conferir trocoR$10,00 e tocar Confirmar recebimento uma vez. Aguardar Venda concluída e relatar total/troco. Produto manual sem EAN, sem comprovação de scanner.
- **Expectativas posteriores, ainda não validadas:** primeira vendaR$10 em dinheiro deve acrescentar10 à gaveta (esperado110), não os20 recebidos antes do troco; após sincronização, estoque do produto20→19. Confirmar conclusão antes de orientar nova venda e depois conferir fila/histórico/saldo/estoque.
- **Limites:** nenhuma venda concluída relatada nesta etapa; não encerrar F05/F11 ou aceite geral. Sem alteração de código/API, limpeza ou operação direta no telefone. Manter o mesmo turno/produto de teste e histórico preservado.

<a id="cp-20261104-099-primeira-venda-confirmada-no-reteste-samsung"></a>

## CP 20261104 099 Primeira venda confirmada no reteste Samsung

- **Data:** 04/11/2026, 00h52, America/Sao_Paulo.
- **Evidência física por relato:** usuário respondeu perfeito à pergunta se a venda foi concluída porR$10,00 com trocoR$10,00, após orientação de uma unidade do Teste Samsung04/11, recebido20 em dinheiro. Registrada confirmação contextual desse caminho de venda/troco; sem screenshot, referência/UUID ou consulta independente ao servidor.
- **Ainda não confirmado:** saldo pós-venda, baixa de estoque, unicidade no histórico e ACK/fila depois da venda. Caixa aberto100 e produto20 eram os estados anteriores; esperado110/estoque19 são expectativas, não resultados novos. Sem aprovação global do piloto ou dos cenários F05/F11.
- **Próximo passo guiado:** sair da confirmação por Nova venda e Fechar(X) se necessário; Caixa → Sincronização → Sincronizar agora; conferir Dados confirmados no servidor/0 aguardando/0 revisão. Em Vendas, uma ocorrência da nova venda do produto por10; em Resumo, vendido10/esperado110; em Produtos, estoque19 após sync. Aguardar relato antes de outro recebimento ou movimento; não repetir a venda para tentar corrigir divergência.
- **Limites:** teste físico acompanhado por relato, distinto do emulador/HTTP; nenhum acesso remoto, alteração de código/API, limpeza ou operação financeira adicional executados pelo agente.

<a id="cp-20261104-100-primeira-venda-conferida-e-pix-manual-orientado"></a>

## CP 20261104 100 Primeira venda conferida e Pix manual orientado

- **Data:** 04/11/2026, America/Sao_Paulo.
- **Evidência física por relato:** usuário confirmou sincronização0/0, uma única venda de R$10,00, esperado na gavetaR$110,00 e estoque19 unidades. PASS dirigido da conferência pós-primeira venda, complementando CP099. Sem consulta independente do agente ao servidor/UUID ou captura; não equivale a validação de todo o histórico/isolamento.
- **Próximo passo guiado:** segunda venda de uma unidade do mesmo Teste Samsung04/11/R$10,00; Cobrar → Pix, conferir QR/valor e aviso de confirmação manual. Se pedir chave, usar e-mail fictício teste@example.invalid apenas na homologação e Salvar e gerar QR; se já houver chave, não substituir. Registro de teste sem transferência bancária; tocar Recebi o Pix uma vez e aguardar Venda concluída/Pix.
- **Expectativas posteriores:** total vendido20, dinheiro10/Pix10, gaveta ainda110; estoque18 após sincronização e duas vendas únicas. Ainda não validados: Pix/QR/conclusão/estoque18/total20; aguardar relato antes da próxima operação. Não confundir confirmação manual do operador em teste com confirmação bancária do app.
- **Limites:** scanner, cartão, movimentos, offline/reconexão e fechamento físicos continuam pendentes. Nenhuma alteração de código/API, limpeza, execução remota ou aceite amplo nesta entrega; roadmap/roteiro atualizados sem encerrar F05/F06 integralmente.

<a id="cp-20261110-101-google-play-planos-e-integracoes-definidos"></a>

## CP 20261110 101 Google Play, planos e integrações definidos

- **Data:** 10/11/2026, America/Sao_Paulo.
- **Decisão do usuário:** publicação na Google Play com planos pagos; R7 passa a ser obrigatória para a entrega. Integrações com Stone, InfinitePay e Mercado Pago desejadas, podendo ser simples, desde que automatizadas e com fluxo; o usuário propôs webhook aguardando transação de valor igual. Nenhum provedor foi escolhido, contratado ou testado.
- **Google Play (documentação oficial, 10/11):** Play Billing exigido para assinatura de software em nuvem, produtividade empresarial e gestão financeira; bens físicos ficam fora. A mesma página admite app somente de consumo, sem compra nem link de pagamento dentro dele. Faturamento alternativo não confirmado para o Brasil. Taxa de 15% em assinaturas pela regra de demais mercados, a confirmar no Console. Target API 36 exigida; conta pessoal criada após 13/11/2023 exige 12 testadores por 14 dias. Exigência de forma de pagamento no teste grátis e dispensa de teste fechado para organização não confirmadas.
- **Mercado Pago:** Pix por `POST /v1/orders` com `external_reference` obrigatório e idempotência, conferido na página oficial; OAuth por lojista, webhook assinado e Point por API relatados na documentação. Cartão por aproximação no celular para terceiros, aprovação prévia e estorno de Pix não confirmados.
- **InfinitePay:** Checkout Integrado com `order_nsu`, webhook `paid` e `payment_check`, conferido na página oficial; cartão fica sempre ligado no link, sem opção somente Pix, e o Pix só aparece na tela do comprador. O PDV pode exibir o link como QR, hipótese de fluxo não testada. InfiniteTap por deeplink cobra no app da InfinitePay no mesmo aparelho e retorna somente ao aparelho. Sem sandbox, sem API de estorno; parceria para software house não confirmada.
- **Stone:** SDK Android com pinpad Bluetooth D180C ou POS Smart, Connect com pedido enviado à maquininha e webhook relatados; programa de parceiros com aprovação comercial. Parte da documentação retornou 403 ou página vazia; OAuth por lojista, Pix com identificador e Tap to Pay não confirmados.
- **Webhook por valor igual:** aviso de toda transação da conta, inclusive maquininha sem integração, não confirmado nos três provedores; os avisos documentados são ligados a cobranças criadas pela integração. Ausência na documentação pública não prova inexistência; depende de resposta dos provedores ou teste com conta real.
- **Conferido no repositório:** `apps/api/src/billing.ts` aceita somente `disabled` e `mock`; `scripts/build-android.ps1` executa `assembleRelease`, sem AAB; APK 0.1.11 com compile 37, target 36 e sem permissões `BILLING` ou `NFC`.
- **Evidência:** pesquisa documental por agentes e conferência direta das páginas de pagamentos da Play, Checkout InfinitePay e Pix Mercado Pago. Não houve chamada a API de provedor, compra, build, teste, implantação, alteração de runtime ou mudança em produção.
- **Roadmap:** decisão e novos itens de R7 registrados, nenhum checkbox marcado. R6 continua condicionada a R3 homologada e piloto estável.
- **Próximo passo:** usuário decidir entre compra por Play Billing e venda fora do app; consultar Mercado Pago, InfinitePay e Stone sobre avisos por conta e parceria; retomar o ciclo físico, que depende de segundo celular para o bloco multioperador.

<a id="cp-20261110-102-assinatura-por-play-billing-decidida"></a>

## CP 20261110 102 Assinatura por Play Billing decidida

- **Data:** 10/11/2026, America/Sao_Paulo.
- **Decisão do usuário:** a assinatura será vendida dentro do app por Google Play Billing, resolvendo a escolha aberta no CP 101 e mantendo a decisão de 24/10/2026. A venda fora do app com app somente de consumo fica descartada para o Android.
- **Consequências para R7:** criar `GooglePlayBillingProvider`, validar e confirmar a compra no servidor, tratar notificações e retirar o formulário de cartão da assinatura no build da Play. Teste de 7 dias passa a ser oferta da Play; exigência de forma de pagamento nessa oferta segue não confirmada. Taxa de 15% a confirmar no Console.
- **Validação:** decisão e documentação apenas. Sem implementação, build, teste, compra, configuração no Console, implantação ou alteração de runtime.
- **Roadmap:** item de R7 reescrito como implementação e mantido aberto; nenhum checkbox marcado. Pelo roadmap, R7 depende de piloto estável.
- **Limites:** papel do Asaas em site e Desktop continua a confirmar. Escolha da maquininha pelo lojista discutida, ainda não registrada como decisão.
- **Próximo passo:** retomar o ciclo físico e o bloco multioperador do piloto; confirmar tipo e data da conta de desenvolvedor para saber se o teste fechado se aplica.

<a id="cp-20261110-103-escolha-da-maquininha-pelo-lojista-decidida"></a>

## CP 20261110 103 Escolha da maquininha pelo lojista decidida

- **Data:** 10/11/2026, America/Sao_Paulo.
- **Decisão do usuário:** o lojista escolhe e conecta o próprio provedor de pagamento. O produto mantém um único fluxo de venda, com um conector por provedor. Atualiza o limite registrado no CP 102.
- **Alcance conhecido, somente documental (CP 101):** Mercado Pago com Pix e Point por API; InfinitePay com aproximação no celular por deeplink e link de pagamento, sem integração confirmada com maquininha física; Stone dependente de aprovação no programa de parceiros. Automação varia por provedor e não há paridade prometida. Marca não integrada, falha ou ausência de internet mantém a confirmação manual identificada.
- **Validação:** decisão e documentação apenas. Sem contrato, credencial, chamada a provedor, implementação, teste ou implantação.
- **Roadmap:** novo item aberto em R6; nenhum checkbox marcado. R6 continua condicionada a R3 homologada e piloto estável, começando por uma integração completa.
- **Próximo passo:** consultar Mercado Pago, InfinitePay e Stone sobre aprovação para software house e avisos por conta; retomar o ciclo físico e o bloco multioperador do piloto.

<a id="cp-20261110-104-prompts-por-sessao-ate-a-entrega"></a>

## CP 20261110 104 Prompts por sessão até a entrega

- **Data:** 10/11/2026, America/Sao_Paulo.
- **Construído:** [docs/prompts-sessoes-entrega.md](prompts-sessoes-entrega.md), com 23 blocos sequenciais e dois opcionais, cobrindo os 40 passos combinados com o usuário, com tipo de execução, pré-requisitos e critério de pronto.
- **Achado:** `scripts/limpar-homologacao-piloto.sql` exige o backup de 03/11, anterior aos testes no Samsung dos CPs 094–100; executá-lo apagaria também a conta em uso. O bloco 2 exige backup novo, atualização da guarda e confirmação do usuário. O script não foi alterado nem executado.
- **Validação:** arquivos citados conferidos no repositório e cenários F01–F19 mapeados pelo roteiro físico. Nenhuma sessão foi iniciada e os prompts não foram executados.
- **Roadmap:** apontamento acrescentado, nenhum checkbox marcado.
- **Próximo passo:** usuário iniciar o bloco 1. Bloco 6 depende de segundo celular.

<a id="cp-20261110-105-versao-0111-rastreavel-e-ci-nao-iniciado"></a>

## CP 20261110 105 Versão 0.1.11 rastreável e CI não iniciado por cobrança

- **Data:** 10/11/2026, 00h25, America/Sao_Paulo.
- **Etapa:** R5, bloco 1 de [prompts por sessão](prompts-sessoes-entrega.md). Sem PR, deploy ou alteração de produção/homologação.
- **Commits na branch `codex/pdv-homologacao-real`, enviados:** 44443d2 (lista de produtos), 0d95607 (mensagem de login), 46f7149 (testes de cadastro/CPF), e63cf92 (0.1.11/12), 1a5c34c (variante de emulador e driver), 06579d2 (SQL de limpeza), ed4833e (docs até o CP 104). SHA de referência dos fontes: `ed4833e54062906709da2a28674fee5ff6262d07`. Este checkpoint vem em commit posterior somente de documentação.
- **Revisão:** sem segredos nos arquivos alterados; `builds/` ignorado e sem arquivo versionado. O SQL de limpeza entrou no repositório pela primeira vez (ficara fora no CP 051), não foi executado nem alterado; a guarda continua a ser atualizada no bloco 2.
- **CI: não validou a 0.1.11.** Run [42748951965](https://github.com/romulosutil/prisma-pdv-app/actions/runs/42748951965), `workflow_dispatch` em ed4833e, como no CP 051: `failure` em cerca de 5 s, com o job "Types, tests and container" sem iniciar. Anotação do GitHub: pagamentos recentes da conta falharam ou o limite de gastos precisa ser aumentado. Não é reprovação de código. Deploy pulado.
- **Testes locais, evidência distinta do CI:** no checkout, tipos mobile e 600 casos/73 arquivos PASS. Em clone limpo de ed4833e com Node 24 e `npm ci`, removido ao final: tipos de todos os workspaces, 2 ferramentas, 172 shared e 600 mobile com um worker PASS (`builds/pdv-0111-ci-local.log`). **Não executados:** API com PostgreSQL 17 e imagem Docker, por falta de Docker/PostgreSQL local. `apps/api`, `packages` e manifestos npm não mudaram desde 84dd0dc, aprovado no CI 41688960912.
- **APK:** o `builds/pdv-homologacao-0.1.11.apk` de 03/11 corresponde aos fontes commitados, sem nova versão. 300/300 fontes registrados no build iguais byte a byte ao checkout limpo em ed4833e, sem arquivo novo ou ausente. Bundle extraído do APK com SHA256 `2b0ef95648b5699f3044fb5d9846abb69f57b468da966e3ac3b1d3817b2cad37`, igual à verificação do build; 258/258 módulos próprios do source map iguais aos blobs de ed4833e, e o único item restante é o módulo virtual de rotas do Metro. As duas correções constam no mapa. Manifesto: 0.1.11/12.
- **Valem para os testes físicos:** fontes `ed4833e` e APK ARM `builds/pdv-homologacao-0.1.11.apk`, SHA256 `2df561ee3c7c6717aab82304e1dc4ff2ab5b9858b47aeb7e551e23bf648fe0c3`, atualizando sem desinstalar. API de homologação segue em 84dd0dc, sem mudança de API nestes commits. O APK `-emulador` serve somente ao AVD.
- **Limites:** o hash do APK instalado no Samsung não foi conferido (a versão 0.1.11 é por relato no CP 095). Nenhum teste físico, aceite ou checkbox de roadmap concluído nesta sessão.
- **Próximo passo:** usuário regularizar a cobrança do GitHub Actions; depois disparar o CI na ponta da branch, cuja diferença para ed4833e é só documentação, e registrar o resultado. Com ele aprovado, seguir para o bloco 2.

<a id="cp-20261110-106-ci-da-0111-aprovado"></a>

## CP 20261110 106 CI da 0.1.11 aprovado

- **Data:** 10/11/2026, 06h54, America/Sao_Paulo.
- **Etapa:** R5, conclusão do bloco 1. Continua o [CP 105](#cp-20261110-105-versao-0111-rastreavel-e-ci-nao-iniciado), cujo CI não iniciou. Usuário informou a regularização da cobrança do GitHub Actions.
- **CI:** run [42793943319](https://github.com/romulosutil/prisma-pdv-app/actions/runs/42793943319), `workflow_dispatch`, `completed/success` no SHA `4eb9ec6f3ec07947f8f245c960871ea3eef134f3`. Tipos, 2 ferramentas, 172 shared, 602 API/PostgreSQL 17, 600 mobile (1.374 casos em vitest), imagem e isolamento aprovados. Deploy de main pulado; produção não promovida.
- **Equivalência com o APK:** 4eb9ec6 difere de ed4833e somente em `docs/checkpoints-roadmap.md` e `docs/roadmap-app-completo.md`. A conferência do CP 105 entre APK e fontes continua válida.
- **Valem para os testes físicos:** fontes ed4833e, com CI aprovado em 4eb9ec6, e APK ARM `builds/pdv-homologacao-0.1.11.apk`, SHA256 `2df561ee3c7c6717aab82304e1dc4ff2ab5b9858b47aeb7e551e23bf648fe0c3`. API de homologação segue em 84dd0dc, sem mudança de API desde então.
- **Limites:** CI não comprova Android físico nem aceite. O hash instalado no Samsung segue não conferido. Nenhum checkbox de roadmap marcado, sem deploy ou alteração de dados.
- **Próximo passo:** bloco 2, limpar a homologação, que exige acesso SQL administrativo e confirmação do usuário. Se a limpeza não for feita, o bloco 4 retoma da venda em Pix manual do CP 100.
