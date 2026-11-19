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

<a id="cp-20261110-107-base-de-homologacao-limpa"></a>

## CP 20261110 107 Base de homologação limpa

- **Data:** 10/11/2026, 07h07, America/Sao_Paulo.
- **Etapa:** R5, bloco 2 de [prompts por sessão](prompts-sessoes-entrega.md). Resolve a limpeza pendente desde o [CP 039](#cp-20261103-039-entrega-018-validada-localmente-e-limpeza-pendente). Limpeza confirmada pelo usuário nesta sessão, depois de ver contagens, perda e efeito no aparelho. Produção não foi aberta nem alterada.
- **Acesso verificado:** console Bash do serviço `aladdin/pdv-postgres-homologacao` no painel EasyPanel e `psql` com o usuário configurado no contêiner, sem exibir credenciais. Conexão retornou banco e usuário `pdv_homologacao`, PostgreSQL 17.11, sem réplica, com a sessão em somente leitura nas consultas prévias.
- **Antes da limpeza:** 29 tabelas em `public` mais migrações. 12 contas, 12 usuários, 12 lojas, 12 operadores, 17 aparelhos, 17 sessões, 9 produtos, 6 caixas (4 abertos), 8 vendas (R$ 84,00), 8 itens, 9 pagamentos, 6 movimentos de caixa, 13 de estoque, 12 assinaturas, 12 eventos de cobrança, 15 códigos, 15 entregas, 22 limites de autenticação, 40 mudanças, 25 mutações, 1 EAN e 2 confirmações; zero em auditoria de caixa, clientes, fiado, faturas, recuperações, suporte e testes usados. Contagem repetida antes do TRUNCATE, sem diferença.
- **Backup:** `pdv-pre-limpeza-bloco2-20261110`, arquivo `aladdin/pdv-postgres-homologacao/2026-11-10T10:02:41.046Z.sql.gz`, 30,4 kB, sucesso às 10h02min42s UTC pelo log do painel. **Não restaurado.** Os sete backups anteriores continuam listados.
- **Configuração alterada:** a retenção do agendamento de backup da homologação passou de 7 para 10, autorizada pelo usuário, para que o backup novo não eliminasse o arquivo mais antigo. Valor conferido ao reabrir.
- **Guarda:** `scripts/limpar-homologacao-piloto.sql` passou a exigir o backup novo e manteve a recusa a outro banco. Sem a confirmação, recusou com saída 3; em `template1`, recusou por destino, também com saída 3. O SQL executado foi o do script, sem os comentários e sem o acento em uma mensagem de erro; o arquivo temporário foi removido do contêiner.
- **Execução:** transação concluída com COMMIT e saída 0.
- **Depois da limpeza:** 29 tabelas de `public` com zero linhas e `drizzle.__drizzle_migrations` com 13. API `/saude` 200 com `{"status":"ok"}` por HTTPS. Evidência externa por console e HTTP.
- **Observação:** o log de backups não mostra execução automática entre 03/11 e 10/11, com o agendamento diário ativo às 02h15 UTC. Não foi determinado se o agendamento falha ou se o log omite essas execuções. Continua aberto o item de execução e retenção efetivas.
- **Limites:** o celular não foi tocado e não houve teste físico. A conta com 1 venda de R$ 10,00 e último acesso em 04/11 foi identificada como a do Samsung e a conta com 5 vendas como a do emulador por compatibilidade com os CPs, sem conferência direta. Script e documentos sem commit, pois o bloco não autoriza.
- **Roadmap:** pendência de limpeza removida do resumo de R5; nenhum checkbox marcado.
- **Próximo passo:** antes de usar o app, limpar os dados do PDV Homologação no Samsung, pois a conta local não existe mais no servidor. O bloco 4 começa por cadastro e produto novos, e os resultados físicos dos CPs 094–100 precisam ser refeitos na base nova.

<a id="cp-20261110-108-inventario-e-proposta-de-isolamento-do-email"></a>

## CP 20261110 108 Inventário e proposta de isolamento do e-mail

- **Data:** 10/11/2026, 07h14, America/Sao_Paulo.
- **Etapa:** R0, bloco 3 de [prompts por sessão](prompts-sessoes-entrega.md), avanço parcial. Sem alteração de ambiente, deploy, commit ou código. Aguarda decisão do usuário.
- **Leitura da configuração:** `lerConfiguracaoEntregaCodigo` em `apps/api/src/email/configuracaoEntrega.ts` e `lerConfiguracaoSmtp` em `apps/api/src/email/smtp.ts`, chamadas por `apps/api/src/iniciarApi.ts`. O domínio de `SMTP_FROM` entra em cada entrega da fila, e `validarPendenciasEntrega` recusa a inicialização se houver entrega não expirada de outro domínio.
- **Por ambiente, conforme documentos e código. O painel não foi aberto, para não expor valores:**
  - Desenvolvimento: modo `desenvolvimento` por padrão, sem envio, e recusa variáveis `SMTP_`. Nenhum arquivo `.env*` existe no checkout. O launcher `apps/api/src/homologacaoEmail.ts` exige o remetente `acesso@prumo.services`, portanto depende do domínio de produção se for usado.
  - Homologação (`pdv-api-homologacao`): chave de cifra própria, mas mesmo remetente e mesma credencial Resend do serviço original, segundo `docs/r0-api-apk-conectado.md`.
  - Produção (`pdv-api`): `acesso@prumo.services`, com a credencial transferida do arquivo local em 30/10, segundo `docs/deploy-easypanel.md`.
- **Achado:** na documentação do Resend consultada hoje, cota e limite de requisições são por time, não por chave. Chave nova no mesmo time isola a credencial, mas não a cota. Plano gratuito: 100 e-mails/dia, 3.000/mês e 3 domínios.
- **Não confirmado:** a documentação não diz se um subdomínio pode ser verificado em outro time enquanto o domínio pai está em um time diferente, nem se o segundo time fica no plano gratuito.
- **Proposta enviada ao usuário:** time Resend separado `pdv-homologacao`, chave `pdv-api-homologacao`, remetente `acesso@homologacao.prumo.services`. Produção mantém o remetente e ganha chave nova `pdv-api-producao` restrita ao domínio, com a chave antiga revogada só depois da troca. Desenvolvimento segue sem credencial.
- **Verificações:** `apps/api`, `packages` e Dockerfile sem diferença entre 84dd0dc e 06a2278, então um novo deploy da branch recompila a mesma API. Por DNS público (1.1.1.1), `homologacao.prumo.services`, `send.homologacao` e `resend._domainkey.homologacao` estão sem registro.
- **Limites:** nenhum envio feito e nenhuma credencial criada. Item de R0 continua aberto, sem checkbox marcado.
- **Próximo passo:** usuário decidir a proposta e criar time, domínio e chave. Depois, inserir as variáveis no painel, conferir que a fila está sem entregas ativas, implantar só a homologação e comprovar o envio real por HTTPS.

<a id="cp-20261110-109-resend-mantido-sem-mudanca"></a>

## CP 20261110 109 Resend mantido sem mudança

- **Data:** 10/11/2026, 07h18, America/Sao_Paulo.
- **Etapa:** R0, encerramento do bloco 3 de [prompts por sessão](prompts-sessoes-entrega.md). Continua o [CP 108](#cp-20261110-108-inventario-e-proposta-de-isolamento-do-email), cuja proposta não foi adotada.
- **Decisão do usuário nesta sessão:** não mexer no Resend para fazer a separação e seguir sem colocar o assunto em pauta. Não há time, domínio, chave ou remetente novos, nem ajuste no launcher local.
- **Executado:** somente registro em documentos. Nenhum ambiente, deploy, código, commit, envio de e-mail ou passo de produção.
- **Estado que permanece:** homologação e produção compartilham credencial, remetente e cota do Resend, conforme documentado no CP 108. Os critérios de pronto do bloco 3 não foram cumpridos, por decisão do usuário.
- **Roadmap:** item de isolamento de credenciais de R0 segue sem `[x]`, com a decisão anotada.
- **Próximo passo:** bloco 4, ciclo e acesso no Samsung, começando por cadastro e produto novos.

<a id="cp-20261110-110-bloco-4-iniciado-em-base-limpa"></a>

## CP 20261110 110 Bloco 4 iniciado em base limpa

- **Data:** 10/11/2026, 07h39, America/Sao_Paulo.
- **Etapa:** R0/R5, início do bloco 4 de [prompts por sessão](prompts-sessoes-entrega.md). Como a base foi limpa no [CP 107](#cp-20261110-107-base-de-homologacao-limpa), o ciclo começa por cadastro e produto novos, sem retomar a venda em Pix do [CP 100](#cp-20261104-100-primeira-venda-conferida-e-pix-manual-orientado).
- **Conferido localmente:** `builds/pdv-homologacao-0.1.11.apk` com SHA256 `2df561ee3c7c6717aab82304e1dc4ff2ab5b9858b47aeb7e551e23bf648fe0c3`, igual ao definido no [CP 106](#cp-20261110-106-ci-da-0111-aprovado). Evidência HTTP: `/saude` da homologação 200 com `{"status":"ok"}`. Nenhum aparelho listado pelo ADB, portanto o hash instalado no Samsung segue não conferido.
- **Orientado ao usuário, ainda sem relato:** conferir a versão nas informações do app, limpar os dados do PDV Homologação no Android e reabrir o app. Alvo: somente os dados locais da conta apagada no servidor.
- **Limites:** nenhum teste físico executado nesta entrega, nenhum checkbox marcado, sem alteração de código, API ou dados do servidor.
- **Próximo passo:** receber o relato da limpeza local e seguir para o cadastro novo.

<a id="cp-20261110-111-dados-locais-limpos-e-cadastro-orientado"></a>

## CP 20261110 111 Dados locais limpos e cadastro orientado

- **Data:** 10/11/2026, 08h21, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4. Continua o [CP 110](#cp-20261110-110-bloco-4-iniciado-em-base-limpa).
- **Evidência física por relato:** depois da limpeza orientada, o app abriu na tela com "Começar" e "Já tenho conta", sem entrar na conta antiga. PASS dirigido apenas desse estado inicial. A versão exibida no Android não foi informada no relato e segue a confirmar.
- **Orientado, ainda sem relato:** cadastro novo com e-mail próprio e CPF/CNPJ válido, com o código digitado somente no aparelho.
- **Limites:** sem conferência independente, nenhum cenário de R0 concluído, nenhum checkbox marcado. Sem alteração de código, API ou dados do servidor.
- **Próximo passo:** receber o relato da confirmação do código e concluir a criação da loja.

<a id="cp-20261110-112-email-confirmado-e-achado-na-tela-da-loja"></a>

## CP 20261110 112 E-mail confirmado e achado na tela da loja

- **Data:** 10/11/2026, 08h26, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4. Continua o [CP 111](#cp-20261110-111-dados-locais-limpos-e-cadastro-orientado).
- **Evidência física por relato:** e-mail real recebido, código digitado no aparelho e abertura da tela "Como se chama sua loja?". Usuário informou que a versão do app é a certa, sem citar o número; a versão orientada era 0.1.11. Usuário relatou o toque em Criar minha conta, cujo resultado ainda não foi informado.
- **Achado de usabilidade, relatado pelo usuário:** a tela da loja, já depois do e-mail confirmado, mostra "Seu e-mail foi confirmado na etapa anterior..." e o botão "Já tenho conta", que não faz sentido nesse ponto do cadastro novo. No código, `apps/mobile/app/(onboarding)/loja.tsx:86` chama `cancelarCadastro` e vai para o login, descartando o cadastro em andamento. Não bloqueia o fluxo. Não corrigido nesta rodada, porque mudança de runtime exige nova versão rastreável e invalidaria o APK em teste.
- **Limites:** sem conferência independente no servidor. Nenhum checkbox marcado, sem alteração de código, API ou dados do servidor.
- **Próximo passo:** receber qual tela abriu depois de Criar minha conta e seguir para produto novo.

<a id="cp-20261110-113-cadastro-novo-concluido-no-samsung"></a>

## CP 20261110 113 Cadastro novo concluído no Samsung

- **Data:** 10/11/2026, 08h28, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4. Continua o [CP 112](#cp-20261110-112-email-confirmado-e-achado-na-tela-da-loja).
- **Evidência física por relato:** depois de Criar minha conta, pagamentos e permissão da câmera, o usuário confirmou a abertura do início da loja conforme o resultado orientado: com Abrir caixa e Vender, sem cartão, sem outro código e sem dados antigos. PASS dirigido do cadastro novo na base limpa.
- **Limites:** sem conferência independente no servidor, pois a leitura da conta exige sessão do usuário. Permissão de câmera foi só concedida; negar e conceder depois fica no bloco 5 (F01). Nenhum checkbox marcado.
- **Próximo passo:** cadastrar produto manual novo, abrir o caixa e seguir para as vendas.

<a id="cp-20261110-114-produto-manual-salvo-na-segunda-tentativa"></a>

## CP 20261110 114 Produto manual salvo na segunda tentativa

- **Data:** 10/11/2026, 08h32, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4. Continua o [CP 113](#cp-20261110-113-cadastro-novo-concluido-no-samsung).
- **Evidência física por relato:** na primeira tentativa de salvar o produto manual, o usuário tem "quase certeza" de que a tela foi minimizada. Ele excluiu o produto e o cadastrou de novo; a segunda tentativa funcionou e o app está na tela esperada, com o produto criado. Valores, estoque e contagem na lista não foram relatados.
- **Classificação:** anomalia **não reproduzida e não explicada**. Pode ser o app indo ao fundo ou um encerramento, o que o relato não distingue. Não registrar PASS integral do cadastro de produto nem FAIL comprovado. O defeito corrigido na 0.1.11 era um encerramento ao salvar o primeiro produto e voltar à lista (CP 083), então o caso precisa de repetição e de evidência.
- **Evidência pendente:** nenhum aparelho está listado pelo ADB, então os logs do Android não puderam ser lidos pelo agente. A alternativa sem acesso ao armazenamento privado é o histórico do teste exportado pelo próprio app, que o roteiro descreve sem dados pessoais. Não foi exportado até agora. A exclusão e o novo cadastro deixam rastro no servidor, que não foi conferido.
- **Limites:** sem conferência independente, nenhum checkbox marcado, sem alteração de código, API ou dados do servidor.
- **Próximo passo:** abrir o caixa. Se o produto voltar a sair da tela em outra operação, exportar o histórico logo após a falha.

<a id="cp-20261110-115-crash-nativo-ao-salvar-o-primeiro-produto-no-samsung"></a>

## CP 20261110 115 Crash nativo ao salvar o primeiro produto no Samsung

- **Data:** 10/11/2026, 08h34, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4. **Corrige a classificação do [CP 114](#cp-20261110-114-produto-manual-salvo-na-segunda-tentativa):** a anomalia relatada deixou de ser inexplicada.
- **Aparelho e APK (ADB, depois de o usuário ligar a depuração):** Samsung SM-S938B, Android 17, serial só como hash (`17c81f8d683a`, SHA256 truncado). Pacote `br.com.pdv.mobile.homologacao` 0.1.11/versionCode 12. `base.apk` instalado puxado pelo ADB: SHA256 `2df561ee3c7c6717aab82304e1dc4ff2ab5b9858b47aeb7e551e23bf648fe0c3`, **igual** ao APK ARM do [CP 106](#cp-20261110-106-ci-da-0111-aprovado). Resolve o limite "hash instalado não conferido" dos CPs 105 e 106. Última atualização do pacote registrada às 08h21 (limpeza de dados); sem acesso ao armazenamento privado.
- **Evidência técnica do Android (não é relato):** `dumpsys activity exit-info` registra para o processo 12487 `APP CRASH(EXCEPTION)` às 08h30m40s. O buffer de crash do logcat traz `FATAL EXCEPTION: main`, `IllegalStateException: addViewAt: failed to insert view [2228] into parent [2232] at index 0`, causada por "The specified child already has a parent" em `ReactClippingViewManager.addView`. É a mesma assinatura do [CP 083](#cp-20261103-083-ciclo-emulado-produto-persistido-e-crash-nativo), cuja correção (`removeClippedSubviews={false}` em `ListaProdutos.tsx`) passou no emulador no [CP 085](#cp-20261103-085-atualizacao-e-correcao-nativa-validadas). A hora coincide com a primeira tentativa de salvar o primeiro produto, relatada pelo usuário como "tela minimizada". Excerto sanitizado, sem texto livre, dados do usuário ou stack de JavaScript.
- **Resultado:** **FAIL de cadastro do primeiro produto na 0.1.11 em Android físico**, uma ocorrência. A correção do CP 083 não cobre este caso no Samsung, ainda que tenha passado no AVD. A segunda tentativa funcionou, mas não se sabe se o produto da primeira tentativa chegou a ser gravado antes do crash (o usuário o excluiu e recadastrou). Critério de F01–F18 e de R0 afetados: não marcar nenhum PASS do fluxo de produto.
- **Outras saídas do processo no histórico do Android (contexto, não são defeitos):** encerramento por limpeza de dados às 08h21 (esperado), mortes do sistema por memória em 03, 04 e 08/11, remoção da tarefa e `SIGNALED` em 06/11. Não analisadas aqui.
- **Em investigação:** trabalhador somente leitura mapeando as telas e listas envolvidas e a menor correção. Sem edição de código. Corrigir exige nova versão rastreável, e commit exige autorização que este bloco não dá.
- **Limites:** nenhuma outra operação financeira foi afetada, pois o caixa ainda não foi aberto. Sem conferência no servidor. Nenhum checkbox marcado.
- **Próximo passo:** continuar o ciclo na 0.1.11 com o aparelho ligado ao ADB, conferindo o buffer de crash depois de cada etapa, enquanto a causa é investigada. A decisão sobre gerar a 0.1.12 e repetir os cenários afetados fica com o usuário.

<a id="cp-20261110-116-caixa-aberto-relatado-no-samsung-sem-nova-queda"></a>

## CP 20261110 116 Caixa aberto relatado no Samsung, sem nova queda

- **Data:** 10/11/2026, 08h36, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4. Continua o [CP 115](#cp-20261110-115-crash-nativo-ao-salvar-o-primeiro-produto-no-samsung).
- **Evidência física por relato:** usuário respondeu "Funciona" à abertura do caixa com troco de teste 100. A resposta não trouxe os valores da tela (troco, esperado, vendido hoje), nem o preço e o estoque do produto. Registrado como abertura concluída por relato, sem conferir números.
- **Evidência técnica do Android:** `exit-info` e buffer de crash consultados às 08h36 pelo ADB. O único `FATAL EXCEPTION` do pacote hoje continua sendo o das 08h30m40s do CP 115. Nenhuma queda na abertura do caixa.
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado.
- **Próximo passo:** venda em Pix manual de uma unidade, esperando vendido 10, gaveta 100 e estoque 19 após a sincronização.

<a id="cp-20261110-117-hipoteses-para-o-crash-do-primeiro-produto"></a>

## CP 20261110 117 Hipóteses para o crash do primeiro produto

- **Data:** 10/11/2026, 08h39, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4. Continua o [CP 115](#cp-20261110-115-crash-nativo-ao-salvar-o-primeiro-produto-no-samsung).
- **Método:** leitura do código por trabalhador, sem edição, sem rede e sem reprodução. Nada abaixo está confirmado em execução. A causa **não foi comprovada**.
- **Fatos lidos no código:** ao salvar, `FormularioProduto.tsx` mostra o aviso, volta e libera o botão em poucos quadros, enquanto a lista passa de vazia para um item. `useVoltar.ts` faz `router.replace` e `router.back()` em sequência quando a pilha tem uma rota só. Nenhum `initialRouteName` em `app/`. `removeClippedSubviews={false}` existe só em `ListaProdutos`; `ListaVendas.tsx` e `TelaBusca.tsx` usam FlatList sem o prop. Reteste do emulador no CP 085 usou lista **filtrada** com catálogo já não vazio, enquanto o Samsung teve catálogo realmente vazio, conta nova e câmera recém-autorizada. Em 04/11 o mesmo Samsung salvou o primeiro produto na 0.1.11 sem queda (CP 097), logo o defeito é intermitente.
- **Hipóteses, em ordem, todas inferência:** (1) corrida de montagem do Fabric na transição de saída, com mudança do botão, aviso e lista no mesmo ciclo; (2) lista montada de novo durante a saída, por `useVoltar` e pilha sem `index`; (3) o reteste do emulador mediu outro cenário; (4) outras FlatList expostas; (5) remontagem da pilha por troca de escopo, baixa.
- **Menor correção sugerida, não aplicada:** `return` após o `replace` em `useVoltar.ts`; `initialRouteName: 'index'` no layout de produtos; adiar aviso e `setSalvando(false)` até depois da volta; `removeClippedSubviews={false}` nas outras duas listas. Exige nova versão, validação no Samsung com catálogo vazio e repetição dos cenários afetados.
- **Reprodução proposta no emulador, não executada:** conta nova sem produtos, três rotas de cadastro, 20 a 30 repetições com animações ligadas, lendo `adb logcat -b crash`.
- **Limites:** nenhum código, commit, build ou dado alterado. Nenhum checkbox marcado.
- **Próximo passo:** usuário decidir se corrige agora (0.1.12) ou termina o ciclo na 0.1.11 e corrige depois.

<a id="cp-20261110-118-pix-manual-relatado-e-dois-achados-de-fluxo"></a>

## CP 20261110 118 Pix manual relatado e dois achados de fluxo

- **Data:** 10/11/2026, 08h42, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 1. Continua o [CP 117](#cp-20261110-117-hipoteses-para-o-crash-do-primeiro-produto).
- **Evidência física por relato:** venda em Pix manual de teste, sem transferência bancária, concluída com tela de confirmação; usuário avalia que "parece funcionar". Não foram informados vendido hoje, gaveta, estoque nem contagem de sincronização. Registrado como conclusão por relato, sem valores conferidos. **Sem queda:** `exit-info` e buffer de crash às 08h41 só trazem a queda das 08h30m40s do CP 115.
- **Achado 1, saída da tela de sucesso (confirmado no código):** em `TelaSucesso.tsx` o único botão de saída é "Nova venda" e o botão voltar do Android executa a mesma ação. "Ver recibo" só expande o recibo. Não há atalho para o caixa ou o início, e `GuardaCobranca.tsx` mantém a cobrança fechada até "Nova venda". O usuário só vê o caixa depois de abrir uma nova venda e sair dela. Falha de usabilidade, sem perda de dado. Não corrigido.
- **Achado 2, chave Pix (decisão de produto do usuário, não implementada):** a chave é pedida na primeira cobrança em Pix, no meio da venda, e fica só no aparelho (`PixEstatico`, `chavePix.ts`). A tela de pagamentos do cadastro (`pagamentos.tsx`) apenas lista "Pix · Pela sua chave, com confirmação manual" como sempre ativo, sem coletar a chave. O usuário quer que a chave, ou a escolha de onde o lojista recebe, venha no cadastro, ao menos como confirmação manual, e que o ideal seja integração com o destino do dinheiro, citando Mercado Pago, InfinitePay, Nubank, Stone e PicPay. Alinha-se à escolha de provedor pelo lojista do [CP 103](#cp-20261110-103-escolha-da-maquininha-pelo-lojista-decidida). Mercado Pago, InfinitePay e Stone têm levantamento documental no [CP 101](#cp-20261110-101-google-play-planos-e-integracoes-definidos); Nubank e PicPay **não foram pesquisados** e não há afirmação sobre integração com eles. Fica registrado para R6 e para o desenho do cadastro, sem alterar código.
- **Teste:** a chave fictícia foi digitada apenas na homologação, por exigência do fluxo atual.
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado, sem alteração de código, API ou dados.
- **Próximo passo:** conferir os valores do caixa, sincronizar e fazer a venda em cartão manual.

<a id="cp-20261110-119-pix-manual-com-fila-zerada-e-estoque-19"></a>

## CP 20261110 119 Pix manual com fila zerada e estoque 19

- **Data:** 10/11/2026, 08h45, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 1. Continua o [CP 118](#cp-20261110-118-pix-manual-relatado-e-dois-achados-de-fluxo).
- **Evidência física por relato:** sincronização com 0 aguardando e 0 para revisão, e estoque do produto em 19 unidades depois da venda em Pix manual de uma unidade. Bate com a baixa esperada de 20 para 19. Vendido hoje, esperado na gaveta e quantidade de vendas **não foram conferidos**: o usuário não os encontrou na tela do caixa.
- **Onde ficam esses valores (código lido):** "Vendido hoje" e a quantidade de vendas estão no início (`app/(tabs)/index.tsx:71-75`). Na aba Caixa o total grande vem sem esse rótulo, com "N venda(s) hoje" embaixo, e o "Esperado na gaveta" fica no cartão "Conferir gaveta", abaixo da lista de meios (`ResumoCaixa.tsx:83-120`), exigindo rolagem. Achado menor de usabilidade: o total da aba Caixa não diz "Vendido hoje".
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado, sem alteração de código ou dados. Pix manual segue como PASS por relato, parcial.
- **Próximo passo:** conferir vendido 10, uma venda e gaveta 100 nas duas telas e seguir para o cartão manual.

<a id="cp-20261110-120-pix-manual-conferido-no-samsung"></a>

## CP 20261110 120 Pix manual conferido no Samsung

- **Data:** 10/11/2026, 08h47, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 1. Continua o [CP 119](#cp-20261110-119-pix-manual-com-fila-zerada-e-estoque-19).
- **Evidência física por relato:** venda em Pix manual de uma unidade a R$ 10,00 conferida: vendido hoje R$ 10,00, 1 venda, esperado na gaveta R$ 100,00 (Pix não entra no dinheiro), aba Caixa conferida, fila 0/0 e estoque 19. **PASS por relato do ponto "venda em Pix manual"**, com o limite de que a chave Pix foi fictícia e o recebimento é só um registro de teste. O fluxo do primeiro produto continua com o FAIL do CP 115.
- **Evidência técnica:** sem queda nova no buffer de crash às 08h47.
- **Limites:** sem conferência no servidor (exige sessão do usuário) e sem UUID da venda. Nenhum checkbox marcado.
- **Próximo passo:** venda em cartão manual de uma unidade, esperando vendido 20, cartão 10, gaveta 100 e estoque 18.

<a id="cp-20261110-121-cartao-manual-relatado-no-samsung"></a>

## CP 20261110 121 Cartão manual relatado no Samsung

- **Data:** 10/11/2026, 08h48, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 1. Continua o [CP 120](#cp-20261110-120-pix-manual-conferido-no-samsung).
- **Evidência física por relato:** usuário respondeu "Perfeito, tudo funciona" à venda de uma unidade em cartão de crédito manual, sem discriminar os valores. Os números esperados (vendido 20, 2 vendas, cartão 10, gaveta 100, estoque 18) e o texto do aviso de confirmação manual **não foram relatados um a um**. Registrado como **PASS por relato genérico**, de força menor que o do Pix no CP 120.
- **Evidência técnica:** sem queda nova no buffer de crash às 08h48.
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado.
- **Próximo passo:** pagamento dividido de uma unidade, dinheiro 5 e Pix manual 5, esperando vendido 30, 3 vendas, gaveta 105 e estoque 17.

<a id="cp-20261110-122-pagamento-dividido-relatado-no-samsung"></a>

## CP 20261110 122 Pagamento dividido relatado no Samsung

- **Data:** 10/11/2026, 08h58, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 1. Continua o [CP 121](#cp-20261110-121-cartao-manual-relatado-no-samsung).
- **Evidência física por relato:** usuário respondeu "Tudo correto" à venda dividida em dinheiro 5 e Pix manual 5 e à conferência dos valores previstos: vendido 30, 3 vendas, gaveta 105 e estoque 17. Os números não foram discriminados, então é **PASS por relato genérico**. Com os CPs 120 e 121 fecha o ponto 1 do bloco 4 (Pix manual, cartão manual e dividido) no nível de relato, sem conferência no servidor.
- **Evidência técnica:** sem queda nova no buffer de crash às 08h58. Único `FATAL EXCEPTION` do pacote hoje segue o das 08h30m40s do CP 115.
- **Limites:** sem conferência no servidor nem UUID das vendas. A conferência independente exige sessão do usuário. O defeito do primeiro produto (CP 115) continua aberto. Nenhum checkbox marcado.
- **Próximo passo:** suprimento 50, sangria 8 e retirada 2, esperando gaveta 145 ao final.

<a id="cp-20261110-123-entrada-de-50-relatada-e-achados-de-redacao-e-descoberta"></a>

## CP 20261110 123 Entrada de 50 relatada e achados de redação e descoberta

- **Data:** 10/11/2026, 09h07, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 2. Continua o [CP 122](#cp-20261110-122-pagamento-dividido-relatado-no-samsung).
- **Correção de orientação:** o botão na aba Caixa se chama **Entrada** (`ROTULOS_MOVIMENTO` em `packages/shared/src/caixa.ts:4`), não "Suprimento" como orientado antes. A confirmação, segundo o usuário, diz "Registrar suprimento", e o resumo da gaveta usa "Suprimentos". Os três nomes para a mesma coisa são o achado 1.
- **Evidência física por relato:** entrada de R$ 50 registrada, "entrou caixa", "tudo correto". Valor do esperado na gaveta (previsto 155) não foi discriminado. **PASS por relato do ponto "entrada"**, com força menor que a de uma conferência numérica.
- **Achados de usabilidade do usuário, nenhum corrigido:**
  1. **Redação inconsistente.** "Entrada", "Suprimento", "Suprimentos" e "Registrar suprimento" designam o mesmo movimento. Usuário pediu revisão geral da escrita da interface (UX writing).
  2. **Campo Categoria.** Em `MovimentoDeCaixa.tsx:50,120` é texto livre já preenchido com valores técnicos (`reforco_troco`, `cofre_deposito`, `despesa`). Usuário sugere escondê-lo. A regra de domínio exige categoria preenchida no modo conectado (`dados/caixa.ts:139`), então esconder é viável **desde que o padrão seja mantido**.
  3. **Descoberta.** Os botões Entrada, Sangria e Retirada ficam abaixo do cartão Conferir gaveta e de Fechar caixa (`ResumoCaixa.tsx:123-146`), fora da primeira tela. O usuário só os encontrou após orientação e teme que o operador não perceba que precisa rolar.
- **Lista acumulada de usabilidade para a próxima versão:** estes três, mais o botão "Já tenho conta" na loja ([CP 112](#cp-20261110-112-email-confirmado-e-achado-na-tela-da-loja)), a saída da tela de sucesso e a chave Pix no cadastro ([CP 118](#cp-20261110-118-pix-manual-relatado-e-dois-achados-de-fluxo)) e o rótulo "Vendido hoje" da aba Caixa ([CP 119](#cp-20261110-119-pix-manual-com-fila-zerada-e-estoque-19)).
- **Evidência técnica:** sem queda nova no buffer de crash às 09h07.
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado, sem alteração de código ou dados.
- **Próximo passo:** sangria de R$ 8, esperando gaveta 147.

<a id="cp-20261110-124-erro-na-sangria-e-dois-registros"></a>

## CP 20261110 124 Erro na sangria e dois registros

- **Data:** 10/11/2026, 09h13, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 2. Continua o [CP 123](#cp-20261110-123-entrada-de-50-relatada-e-achados-de-redacao-e-descoberta).
- **Evidência física por relato:** ao registrar a sangria de R$ 8, o app mostrou um erro, mas a sangria constava registrada. O usuário repetiu a operação e a segunda funcionou "corretamente". Agora a aba Caixa mostra **duas sangrias e esperado na gaveta R$ 139,00**, e não as 147,00 previstas para uma só. O texto do erro **não foi guardado**, e o horário de cada sangria não foi informado. O usuário prefere que o texto saia do histórico do teste exportado no final.
- **Classificação:** **achado aberto, causa não determinada.** Hipótese, sem prova: o erro foi exibido depois de a gravação local já ter ocorrido, e o operador repetiu a operação por não saber que ela tinha entrado. Se confirmada, é um aviso de falha para uma operação que gravou, e leva a lançamento financeiro duplicado pelo operador. Não há prova de duplicação feita pelo sistema. Duas hipóteses a separar com o histórico: erro de validação que não gravou, ou erro depois da gravação. O relato diz que a primeira constava registrada.
- **Regra de conduta:** a segunda sangria não será apagada, corrigida nem compensada. O estado real do caixa passa a ser esperado R$ 139,00, e os cenários seguintes usam esse valor. Sem repetir operação financeira para contornar divergência.
- **Evidência técnica:** sem queda nova no buffer de crash às 09h13. Erro de mensagem não é queda e não aparece no log do sistema.
- **Evidência a obter:** exportar o histórico do teste (Diagnóstico do teste ativo, Exportar histórico) ao final, com limite de 500 eventos, e comparar horários e status HTTP/sync das duas sangrias. Conferir também no relatório do servidor se constam uma ou duas sangrias, e se houve reenvio da primeira.
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado, sem alteração de código ou dados.
- **Próximo passo:** retirada de R$ 2, esperando gaveta 137, sem repetir nada em caso de erro.

<a id="cp-20261110-125-retirada-relatada-e-ponto-2-concluido-por-relato"></a>

## CP 20261110 125 Retirada relatada e ponto 2 concluído por relato

- **Data:** 10/11/2026, 09h15, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 2. Continua o [CP 124](#cp-20261110-124-erro-na-sangria-e-dois-registros).
- **Evidência física por relato:** retirada de R$ 2 registrada ("Perfeito funcionou"), sem relato de erro. O esperado na gaveta (previsto 137) e a quantidade de linhas de retirada não foram discriminados, então é **PASS por relato genérico**.
- **Estado esperado do caixa para a próxima etapa:** troco 100, dinheiro vendido 5, entrada 50, sangrias 16 (duas), retirada 2, **esperado 137,00**. Vendido 30,00, 3 vendas, estoque 17. Divergência da sangria duplicada segue aberta no CP 124.
- **Ponto 2 do bloco 4 (entrada, sangria, retirada):** executado. Entrada e retirada passaram por relato; a sangria passou com o achado do CP 124. Sem conferência no servidor.
- **Evidência técnica:** sem queda nova no buffer de crash às 09h15.
- **Limites:** nenhum checkbox marcado, sem alteração de código ou dados.
- **Próximo passo:** sincronizar até 0/0, confirmar esperado 137, e iniciar o ponto 3 (modo avião, venda offline, reinício e reconexão).

<a id="cp-20261110-126-venda-offline-relatada-e-encerramento-forcado"></a>

## CP 20261110 126 Venda offline relatada e encerramento forçado

- **Data:** 10/11/2026, 09h25, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 3. Continua o [CP 125](#cp-20261110-125-retirada-relatada-e-ponto-2-concluido-por-relato).
- **Evidência física por relato:** antes de cortar a rede, o usuário disse "Perfeito, tudo funcionando" para a sincronização (previsto 0/0 e esperado 137), sem discriminar os números: **PASS por relato genérico** do estado inicial. Depois, com o modo avião ligado, uma venda em dinheiro de uma unidade a R$ 10 ficou "Funciona". Previstos vendido 40, 4 vendas, gaveta 147 e aviso "Offline"; **não discriminados**.
- **Evidência técnica (ADB, cabo USB):** `airplane_mode_on=1` lido no Android antes do encerramento. O pacote foi encerrado com `am force-stop` às 09h24m22s do computador; o registro de saída do Android aponta o encerramento às 09h25m02s do aparelho (diferença de relógio e do tempo do comando não analisada). Nenhum processo do pacote ativo em seguida. Equivale ao Forçar parada, sem acesso ao armazenamento privado.
- **Limites:** sem conferência no servidor, que não pode ser alcançado pelo aparelho nesta etapa por desenho. Nenhum checkbox marcado.
- **Próximo passo:** reabrir o app ainda sem rede e conferir que a venda offline, o caixa e a fila foram preservados.

<a id="cp-20261110-127-reabertura-offline-relatada"></a>

## CP 20261110 127 Reabertura offline relatada

- **Data:** 10/11/2026, 09h29, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 3. Continua o [CP 126](#cp-20261110-126-venda-offline-relatada-e-encerramento-forcado).
- **Evidência física por relato:** depois do encerramento forçado e ainda em modo avião, o usuário reabriu o app e respondeu "Perfeito" à conferência de Início, Caixa e contagens de sincronização (previsto: sem pedir login, vendido 40, 4 vendas, gaveta 147, ao menos 1 aguardando e 0 para revisão). **PASS por relato genérico**: números e a contagem de pendências não foram discriminados.
- **Evidência técnica:** `airplane_mode_on=1` ainda ativo às 09h29 e sem queda nova no buffer de crash.
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado.
- **Próximo passo:** reconectar, sincronizar e conferir 0/0 sem duplicação: 4 vendas, vendido 40, gaveta 147, estoque 16.

<a id="cp-20261110-128-reconexao-offline-relatada-e-historico-a-preservar"></a>

## CP 20261110 128 Reconexão offline relatada e histórico a preservar

- **Data:** 10/11/2026, 09h31, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 3. Continua o [CP 127](#cp-20261110-127-reabertura-offline-relatada).
- **Evidência física por relato:** com a rede de volta e duas sincronizações forçadas, o usuário respondeu "Funcionando". Previstos 0/0 nas duas, vendido 40, 4 vendas, gaveta 147 e estoque 16, **sem discriminar os números**. Registrado como **PASS por relato genérico**, de força menor: a ausência de duplicação não foi comprovada por contagem.
- **Evidência técnica:** `airplane_mode_on=0` às 09h31 e sem queda nova no buffer de crash.
- **Ponto 3 do bloco 4 (modo avião, venda offline, reinício e reconexão):** executado, com um fator limitante: a venda foi uma só, em dinheiro. Não houve venda dividida offline, nem parcela interrompida, nem fechamento offline como no ciclo emulado do CP 093.
- **Risco para a evidência:** o histórico do teste guarda só os 500 eventos mais recentes e já houve muitas sincronizações desde a sangria do CP 124. O texto do erro daquela sangria pode ser sobrescrito.
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado.
- **Próximo passo:** exportar o histórico agora, antes do fechamento do caixa, e depois fechar o caixa com diferença.

<a id="cp-20261110-129-historico-do-teste-lido-e-sangria-reclassificada"></a>

## CP 20261110 129 Histórico do teste lido e sangria reclassificada

- **Data:** 10/11/2026, 09h37, America/Sao_Paulo. Horários abaixo são os do aparelho, que ficam cerca de 40 s adiante do relógio do computador (comparação do `exit-info` com o horário do comando, CP 126).
- **Etapa:** R0/R5, bloco 4. **Corrige a hipótese do [CP 124](#cp-20261110-124-erro-na-sangria-e-dois-registros)** e fecha o risco do [CP 128](#cp-20261110-128-reconexao-offline-relatada-e-historico-a-preservar).
- **Evidência:** o usuário exportou o histórico do teste às 09h34 (`pdv-diagnostico-homologacao.json`), versão 0.1.11, Samsung SM-S938B, formato 1. Cópia local em `builds/pdv-bloco4-diagnostico-0934.json` (ignorada pelo git), SHA256 `2252c441c4d27081d83eab15c50c1755a84b15a0da224233f5a826e21a3a403d`. Tem 500 eventos de 09h11m42s a 09h34m15s, de quatro execuções do app. Só traz tipo, rota, ação genérica, endpoint, status, tempo e contagens, sem texto de erro, valores ou IDs. **Não cobre** o produto, a abertura do caixa, as vendas online, a entrada e o início da sangria, que ficaram antes da janela de 500 eventos.
- **Sangria, o que o histórico mostra:** (1) às 09h12m12s há uma ação seguida, 4 ms depois, de um aviso de falha **sem navegação e sem requisição**, o que é típico de recusa imediata no próprio app; (2) às 09h12m17s, outra ação seguida 105 ms depois da volta para o Caixa, o mesmo desenho de uma gravação concluída; (3) às 09h13m12s o formulário de movimento foi aberto de novo e às 09h13m28s houve nova gravação concluída, também com volta ao Caixa; (4) às 09h15m18s, o formulário da retirada, e às 09h15m49s outra gravação concluída. Três gravações concluídas depois do aviso, iguais aos três movimentos conferidos no caixa (duas sangrias e uma retirada).
- **Reclassificação:** a hipótese do CP 124 (erro depois de gravar) **não é sustentada**. O aviso das 09h12m12s parece uma recusa que **não gravou**, e a primeira sangria gravou 5 s depois. A segunda sangria foi uma **nova entrada completa**, aberta e confirmada 55 s depois, e não uma duplicação feita pelo sistema. Isso é inferência do padrão de eventos, não prova: o histórico não guarda o texto do aviso nem a causa. Hipótese plausível, não confirmada: campo obrigatório vazio (o app só exige destino e motivo na confirmação).
- **Pendente:** o usuário confirmar se a segunda sangria foi intencional. Se o objetivo era repetir por achar que a primeira falhou, a lição é de usabilidade: a tela não deixou claro que a primeira entrou. Esperado na gaveta segue R$ 139,00 até a próxima etapa, depois R$ 147,00 com a venda offline.
- **Dois outros avisos de falha sem texto**, às 09h17m53s e 09h23m33s, sem relato do usuário e sem causa. O de 09h17 vem junto de uma troca rápida entre segundo plano e ativo do app. Registrados como não explicados.
- **Ponto 3 (offline e reconexão), o que o histórico acrescenta:** a rede falhou para o app (`status 0`, etapa rede) a partir de 09h23m48s. A sincronização mostrou **1 pendente e 0 rejeitadas** durante todo o período offline, até **um único** envio (`POST /sync/push`, 200) às 09h31m50s, que zerou a fila. Uma segunda sincronização manual às 09h31m57s não enviou nada. Isso sustenta, **sem duplicação**, uma venda pendente enviada uma vez. O histórico não mostra os totais de vendas.
- **Vendas e reinício:** o app teve início de execução às 09h29m59s e às 09h31m49s, ou seja, dois reinícios depois do encerramento forçado, o segundo sem relato do usuário. As duas aberturas preservaram a pendência. Não analisada a causa do segundo reinício, possivelmente encerramento pelo Android em segundo plano.
- **Sem registro de queda nativa:** esse histórico é de JavaScript e não captura crashes nativos. A conferência do buffer de crash do Android segue sendo a fonte.
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado, sem alteração de código ou dados.
- **Próximo passo:** fechamento do caixa com diferença, esperando R$ 147,00.

<a id="cp-20261110-130-fechamento-relatado-e-reinicios-explicados"></a>

## CP 20261110 130 Fechamento relatado e reinícios explicados

- **Data:** 10/11/2026, 09h42, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, pontos 3 e 4. Continua o [CP 129](#cp-20261110-129-historico-do-teste-lido-e-sangria-reclassificada).
- **Resposta do usuário sobre a sangria:** a segunda sangria foi **de propósito**. A primeira deu erro no primeiro toque e funcionou depois, sem que ele lembre a mensagem. Isso confirma a leitura do CP 129: a recusa do primeiro toque não gravou, e **não houve duplicação feita pelo sistema nem engano do operador**. O achado de usabilidade permanece: o texto do erro não foi guardado nem lembrado, e o histórico só marca "falha". A divergência do CP 124 (139 e não 147) fica **resolvida como duas sangrias intencionais**.
- **Reinícios explicados (`exit-info`, evidência do Android):** o processo terminou por `REMOVE TASK` às 09h23m54s e às 09h31m36s (o usuário removeu o app dos recentes) e por `FORCE STOP` às 09h25m02s (encerramento forçado pelo cabo do CP 126). Os dois inícios de execução do histórico às 09h29m59s e 09h31m49s correspondem a aberturas feitas pelo usuário. Não foi encerramento do sistema. Corrige a dúvida do CP 129.
- **Evidência física por relato:** o usuário informou fechamento do caixa com "Tudo funcionando" e convidou a conferência pelo cabo. **Valores não discriminados**: esperado (previsto 147), texto de resultado, diferença (prevista −5), troco e recolhimento, e contagens de sincronização. **PASS por relato genérico**, sem números.
- **Conferência pelo cabo, limitada:** o PDV consta como app em primeiro plano, mas a imagem da tela mostrou apenas a tela apagada do Samsung com o aviso de carregamento ("Carregamento lento: 72%"). Não foi possível ler nenhuma tela do app. Imagem guardada fora do repositório, sem dados do app. Sem queda nativa nova às 09h41 (buffer de crash).
- **Achado de usabilidade relatado:** o campo "Troco que permanece na gaveta" está **sem máscara de valor**, ao contrário de "Valor contado". Não corrigido. Entra na lista acumulada do [CP 123](#cp-20261110-123-entrada-de-50-relatada-e-achados-de-redacao-e-descoberta).
- **Pendente do ponto 4:** a conferência do fechamento no servidor, sem a qual o ponto não está comprovado fora do aparelho. O app tem a tela "Caixas da loja e conferência" (ou "Meus turnos e transferências"), que consulta o servidor.
- **Limites:** sem conferência independente no servidor. Nenhum checkbox marcado, sem alteração de código ou dados.
- **Próximo passo:** o usuário ler, no app, o turno confirmado pelo servidor e a diferença do fechamento.

<a id="cp-20261110-131-fechamento-com-diferenca-conferido-na-tela-do-servidor"></a>

## CP 20261110 131 Fechamento com diferença conferido na tela do servidor

- **Data:** 10/11/2026, 09h51, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 4. Continua o [CP 130](#cp-20261110-130-fechamento-relatado-e-reinicios-explicados).
- **Evidência física, captura de tela enviada pelo usuário** (aba Caixa, tela "Caixas da loja", com o aviso "Valores confirmados no servidor"). Mais forte que relato, mas continua sendo leitura feita na tela do app, e não consulta do agente à API. O nome do operador na captura não é registrado aqui.
- **Valores lidos, turno "Encerrado":** esperado **R$ 147,00**, contado **R$ 142,00**, diferença **−R$ 5,00**, **recolhido R$ 122,00** e **troco preservado R$ 20,00**. Idêntico ao previsto. Turno `01a1c53e-bf5e-771e-9ca4-b2386305c7b2`.
- **Movimentos do turno, quatro linhas:** Entrada R$ 50,00 (reforco_troco, "Teste de entrada"); Sangria R$ 8,00 (cofre_deposito, destino "Cofre, teste", motivo "Teste de sangria"); Sangria R$ 8,00 (cofre_deposito, destino "Teste", motivo começando em "San"); Retirada R$ 2,00 (despesa, "Teste, retirada"). Autor e responsável são o mesmo operador em todas. Uma só entrada, **duas** sangrias e uma retirada, sem linha repetida.
- **Conferência cruzada dos IDs com o histórico do teste:** os eventos são UUID v7, que carregam o horário de criação. Decodificados no horário de Brasília (relógio do app): turno 08h36m26s, entrada 09h06m31s, **sangria 09h12m17,786s**, **sangria 09h13m28,423s** e **retirada 09h15m49,099s**. O histórico do [CP 129](#cp-20261110-129-historico-do-teste-lido-e-sangria-reclassificada) marca as gravações concluídas às 09h12m17,769s, 09h13m28,403s e 09h15m49,095s, com diferença de 4 a 20 ms. Os dois registros independentes concordam. **Nenhum movimento foi criado às 09h12m12s**, hora do aviso de falha, o que **comprova que a recusa do primeiro toque não gravou** e fecha a dúvida do CP 124.
- **Resultado:** **ponto 4 do bloco 4, fechamento com diferença e conferência no servidor, aprovado** no nível de captura de tela do usuário. Fechamento online, sem a variante offline do ciclo emulado (CP 091). Não usei conferência por API, que exige sessão do usuário.
- **Achados de usabilidade da tela:** os identificadores completos de turno e de eventos ocupam muito espaço e não ajudam o lojista; o botão "Registrar conferência" fica em destaque no fim da tela do turno, ao lado de campos de operação sensíveis. Registrado, sem correção.
- **Sem queda nativa nova** no buffer de crash às 09h51. Nenhum checkbox marcado, sem alteração de código ou dados.
- **Próximo passo:** ponto 5, leitura real de código de barras com a câmera, cadastrando um produto físico.

<a id="cp-20261110-132-leitura-de-codigo-de-barras-relatada-e-principio-de-teclado"></a>

## CP 20261110 132 Leitura de código de barras relatada e princípio de teclado

- **Data:** 10/11/2026, 09h55, America/Sao_Paulo.
- **Etapa:** R0/R5, bloco 4, ponto 5. Continua o [CP 131](#cp-20261110-131-fechamento-com-diferenca-conferido-na-tela-do-servidor).
- **Evidência física por relato:** cadastro de um produto físico por leitura da câmera, "Funciona tudo". **Não discriminados:** o código lido, a quantidade de leituras ou apitos, se o catálogo sugeriu nome e se conferia com a embalagem, e o produto na lista. **PASS por relato genérico** da leitura real com a câmera, com a lacuna de que a conferência de duplicação de leitura (F01) e da sugestão de nome não foi detalhada. Não conta como F01 completo, que ainda exige a negação e a concessão de câmera, a lanterna e a digitação manual.
- **Evidência técnica:** nenhuma saída do processo depois das 09h31 no `exit-info` e nenhuma queda nativa nova no buffer de crash às 09h55. O caminho "Cadastrar bipando", salvar e voltar à lista, que a investigação do [CP 117](#cp-20261110-117-hipoteses-para-o-crash-do-primeiro-produto) apontou como o mais exposto (pilha sem a lista por baixo), **não reproduziu o crash** nesta ocorrência. Com o catálogo já não vazio, isso não descarta a hipótese.
- **Princípio de produto registrado pelo usuário:** subir um **teclado numérico em um bottom sheet** é o comportamento excelente do app e **deve se repetir sempre que houver uma ação de teclado**. Hoje há componentes dedicados (`TecladoNumerico.tsx`, `EntradaDeValor.tsx`, `CampoDinheiro.tsx` em `apps/mobile/src/componentes/`), usados no caixa, no pagamento em dinheiro e na venda de avulso e de peso. Já relatado fora do padrão: o campo "Troco que permanece na gaveta" no fechamento, sem máscara ([CP 130](#cp-20261110-130-fechamento-relatado-e-reinicios-explicados)); no código, o formulário de movimentos online em `TurnosCaixa.tsx` usa campos de texto comuns para valor, categoria e destino. Inventário completo dos campos de teclado **não feito**. Entra na lista de usabilidade da próxima versão.
- **Limites:** sem conferência no servidor. Nenhum checkbox marcado, sem alteração de código ou dados.
- **Próximo passo:** ponto 6, login: código expirado, reenvio, limite e recuperação. Exige sair do perfil e usar a caixa de entrada do e-mail do teste.

<a id="cp-20261110-133-saida-do-perfil-e-codigo-enviado-no-samsung"></a>

## CP 20261110 133 Saída do perfil e código enviado no Samsung

- **Data:** 10/11/2026, 10h02, America/Sao_Paulo.
- **Etapa:** R0, bloco 4, ponto 6 (login). Continua o [CP 132](#cp-20261110-132-leitura-de-codigo-de-barras-relatada-e-principio-de-teclado).
- **Evidência física por relato:** depois de "Sair deste perfil", o usuário relatou ter ficado "travado" na tela "Entre novamente". Em seguida informou que tocou em **Enviar código** e que o **e-mail chegou**, sem outro toque. Estado esperado do app nesse ponto, pelo código de `entrar.tsx`: título "Entre novamente", aviso "Seu acesso precisa ser confirmado...", e-mail do perfil já preenchido, campo "Código" e botão secundário "Alterar e-mail ou pedir novo código" acima do botão principal "Entrar" no rodapé.
- **Achado de usabilidade, causa não estabelecida:** a sensação de travamento antes do envio sugere que o botão principal "Enviar código", fixo no rodapé, ou o próprio fluxo de reautenticação não ficou evidente. Depois do envio, o usuário apontou como botão disponível o secundário "Alterar e-mail ou pedir novo código", e não o "Entrar". Não confirmado se a tela estava de fato bloqueada. Sem queda: buffer de crash e `exit-info` sem entrada nova às 10h02.
- **Correção de orientação:** afirmei antes que o e-mail não vinha preenchido. Está preenchido (`useState(perfil?.email ?? '')`).
- **Pendente:** a **hora de chegada do e-mail**, necessária para contar os 10 minutos de validade. Não informada. O teste de reenvio em menos de 60 s também não se aplica mais a este código, pois o intervalo já passou.
- **Limites:** o código não foi digitado nem registrado. Sem conferência no servidor. Nenhum checkbox marcado, sem alteração de código ou dados.
- **Próximo passo:** deixar o código vencer, 10 minutos contados da hora do e-mail, e digitá-lo para ver a mensagem de código expirado.

<a id="cp-20261110-134-codigo-expirado-recusado-no-samsung"></a>

## CP 20261110 134 Código expirado recusado no Samsung

- **Data:** 10/11/2026, 10h16, America/Sao_Paulo.
- **Etapa:** R0, bloco 4, ponto 6. Continua o [CP 133](#cp-20261110-133-saida-do-perfil-e-codigo-enviado-no-samsung).
- **Evidência física por relato:** o e-mail com o código chegou às 10h01. O usuário esperou até depois das 10h13 (instrução dada, a hora exata do toque não foi informada), digitou o código e tocou em Entrar. O app exibiu **"Código inválido ou expirado. Confira o código ou solicite outro."** **PASS por relato, com a mensagem literal informada**, de código fora da validade de 10 minutos. Não informado se a tela manteve os dados do aparelho e a lista de usuários. Confirma no Android físico a correção da mensagem feita no CP 081, antes validada só no emulador (CP 085).
- **Limites do resultado:** o teste prova a recusa de um código vencido, mas não distingue por conta própria vencimento de código já substituído, pois o app devolve a mesma mensagem nos dois casos (comportamento do contrato da API). Neste teste nenhum novo código foi pedido antes da digitação. Sem conferência no servidor. Nenhum checkbox marcado.
- **Evidência técnica:** sem queda nativa nova às 10h15.
- **Próximo passo:** pedir um novo código (reenvio), entrar com ele e conferir a preservação dos dados.

<a id="cp-20261110-135-reenvio-de-codigo-e-reentrada-no-samsung"></a>

## CP 20261110 135 Reenvio de código e reentrada no Samsung

- **Data:** 10/11/2026, 15h12, America/Sao_Paulo (o relato chegou horas depois do CP 134; a hora do envio não foi informada).
- **Etapa:** R0, bloco 4, ponto 6. Continua o [CP 134](#cp-20261110-134-codigo-expirado-recusado-no-samsung).
- **Evidência física por relato:** o usuário pediu um novo código pela opção "Alterar e-mail ou pedir novo código", digitou o código novo no aparelho e entrou. Relato: "Funcionou perfeitamente, sem erros ou atrasos". **PASS por relato genérico**: sem hora de envio, sem mensagem de tela e sem os números pedidos.
- **Não informado:** (a) o app entrou direto sem pedir loja; (b) o turno fechado de hoje (esperado 147,00, contado 142,00, diferença −5,00), a fila 0/0 e os dois produtos continuavam presentes. Não foram inferidos. A preservação dos dados após o reenvio fica sem prova individual; o ponto 7 volta a conferir esses mesmos dados.
- **Limites:** o código não foi digitado no chat nem registrado. Sem conferência no servidor. Não foi testada a invalidação do código anterior (nenhum código anterior ainda válido na hora do reenvio). Nenhum checkbox marcado; sem alteração de código ou dados.
- **Próximo passo:** limite de envios por e-mail (4º envio na janela de 15 minutos deve ser recusado), depois restauração em nova instalação (ponto 7).

<a id="cp-20261110-136-limites-de-codigo-dispensados-no-samsung"></a>

## CP 20261110 136 Limites de código dispensados no Samsung

- **Data:** 10/11/2026, 15h15, America/Sao_Paulo.
- **Etapa:** R0, bloco 4, ponto 6. Continua o [CP 135](#cp-20261110-135-reenvio-de-codigo-e-reentrada-no-samsung).
- **Decisão do usuário:** os passos de limite de envios (4º envio na janela de 15 minutos), invalidação do código anterior e bloqueio por 5 erros foram dispensados, com o relato "não é necessário, toda essa jornada de códigos funciona perfeitamente". Relato geral, sem números, horas ou mensagens.
- **Resultado por item:** código expirado = **PASS por relato com mensagem literal** (CP 134). Reenvio = **PASS por relato genérico** (CP 135). Limite de envios, código substituído e bloqueio por 5 erros = **não executados no aparelho** (dispensados pelo usuário; o relato geral não os prova). Recuperação por código (substituição de aparelho em `limite_aparelhos`) = **não executada, não aplicável agora**: com a cobrança desativada o plano é pro, com 10 aparelhos, e o limite não é atingido sem 10 aparelhos.
- **Limites:** o comportamento desses limites segue provado só por testes automatizados e pelo emulador (CPs anteriores), não no Android físico. Nenhum checkbox marcado. Sem alteração de código.
- **Próximo passo:** ponto 7, restauração da conta em nova instalação autorizada, com os valores de referência anotados antes de limpar os dados.

<a id="cp-20261110-137-restauracao-apos-limpeza-de-dados-no-samsung"></a>

## CP 20261110 137 Restauração após limpeza de dados no Samsung

- **Data:** 10/11/2026, 15h35, America/Sao_Paulo (relógio do aparelho: 12h31 a 12h33).
- **Etapa:** R0, bloco 4, ponto 7. Continua o [CP 136](#cp-20261110-136-limites-de-codigo-dispensados-no-samsung).
- **O que foi feito:** com autorização do usuário ("Opção B"), `adb shell pm clear` no pacote de homologação 0.1.11 (versionCode 12) às 15h26, com o app reaberto em seguida. O usuário fez o login normal por e-mail e código, digitado só no aparelho. **Não foi uma reinstalação do APK**: o pacote e o APK permaneceram; só os dados do app foram apagados (inclui o identificador do aparelho e a sessão).
- **Evidência por captura de tela feita via ADB** (`screencap`, sem acessar armazenamento privado), com navegação por `input tap` e `swipe` nas abas, sem tocar em botões de ação, e **conferida contra valores já registrados nos CPs anteriores, não contra números de antes da limpeza (não informados)**:
  - **Início:** "Online"; Vendido hoje R$ 40,00 em **4 vendas** (Dinheiro 15,00, Pix 15,00, Cartão 10,00); sem caixa aberto ("Abrir caixa"). Últimas vendas #000004 Dinheiro 09:24, #000003 Dinheiro 08:57 e #000002 Cartão 08:48, todas R$ 10,00 e Pago.
  - **Produtos:** 2 produtos, "Creme de leite teste" (código de barras, estoque 5, R$ 1,00) e "Teste Samsung 10/11" (sem código, estoque 16, R$ 10,00).
  - **Caixas da loja** ("Valores confirmados no servidor"): turno **encerrado** com Esperado R$ 147,00, Contado R$ 142,00 e Diferença −R$ 5,00, iguais aos do [CP 131](#cp-20261110-131-fechamento-com-diferenca-conferido-na-tela-do-servidor); **Entrada** R$ 50,00, **2 Sangrias** de R$ 8,00 e **Retirada** R$ 2,00; Recolhido R$ 122,00 e Troco preservado R$ 20,00. Aritmética conferida: 100 de abertura + 15 em dinheiro + 50 − 16 − 2 = 147.
  - **Ajustes:** conta ativa, plano Pro com acesso liberado, Pix, Cartão e Dinheiro ativos.
- **Evidência técnica:** o app seguiu em execução, sem queda nativa nova; o buffer de crash só tem a queda das 08h30 de antes.
- **Resultado:** **PASS por captura de tela e ADB** para a restauração dos dados confirmados após limpeza de dados: produtos, 4 vendas pagas, caixa fechado com diferença, movimentos e totais voltaram do servidor.
- **Limites:** (a) não houve desinstalação nem instalação do APK; (b) não foram informados os números de antes da limpeza, então o estoque e os totais foram conferidos só por consistência interna; (c) não se viu a tela de Sincronização (fila 0/0) após o login nem se o app pediu escolha de loja; (d) sem conferência independente pela API ou pelo servidor (a tela diz que os valores do caixa são confirmados no servidor); (e) pendências exclusivas do aparelho antigo não foram testadas (não havia nenhuma); (f) as vendas #000002 a #000004 foram vistas, a #000001 não apareceu na captura; (g) a captura de Ajustes mostrou dado pessoal, não gravado aqui. Nenhum checkbox marcado.
- **Próximo passo:** decisão do usuário entre fechar o bloco 4 com estes limites, repetir com desinstalação e instalação do APK, e gerar a 0.1.12 para o crash do primeiro produto (CP 115 e CP 117).

<a id="cp-20261110-138-bloco-4-encerrado-no-samsung"></a>

## CP 20261110 138 Bloco 4 encerrado no Samsung

- **Data:** 10/11/2026, 15h37, America/Sao_Paulo.
- **Etapa:** R0, bloco 4 (ciclo completo de um operador no Samsung, APK 0.1.11, versionCode 12, API de homologação). Encerrado por decisão do usuário ("Fechar assim"), com os limites abaixo. Continua o [CP 137](#cp-20261110-137-restauracao-apos-limpeza-de-dados-no-samsung).
- **Resultado por ponto** (evidência: R = relato do usuário, C = captura de tela, A = ADB, H = histórico de diagnóstico exportado pelo app):
  1. Pix manual, cartão manual e pagamento dividido: **aprovado** (R; Pix também por C, CP 120; totais por forma de pagamento confirmados por C no CP 137). CPs 118 a 122.
  2. Entrada, sangria e retirada: **aprovado** (R; movimentos e valores confirmados por C no CP 137). Duas sangrias de R$ 8,00 foram intencionais; o erro no primeiro toque da primeira sangria não gravou nada (H, CP 129). CPs 123 a 125.
  3. Modo avião, venda offline, reinício e reconexão: **aprovado por relato**, com **prova parcial de não duplicação** (um único envio conferido pelo histórico, CPs 126 a 129). Os totais finais por C no CP 137 (4 vendas, R$ 40,00) são consistentes com ausência de duplicação.
  4. Fechamento com diferença e conferência no servidor: **aprovado** (C, tela "Caixas da loja", esperado 147,00, contado 142,00, diferença −5,00; CPs 130, 131 e 137).
  5. Leitura de código de barras com a câmera: **aprovado por relato** (CP 132). Não confirmados F01 completo (câmera negada e concedida, lanterna, digitação manual) nem os detalhes do leitor.
  6. Login: **código expirado aprovado** por relato com a mensagem literal (CP 134); **reenvio aprovado por relato genérico** (CP 135); **limite de envios, código substituído e bloqueio por 5 erros não executados**, dispensados pelo usuário; **recuperação por código não executada, não aplicável** com o plano Pro (CP 136).
  7. Restauração da conta: **aprovada por C e A após limpeza de dados** do app, **sem reinstalação do APK** e sem conferência independente por API (CP 137).
- **Defeitos e dúvidas abertos:** (a) **queda nativa ao salvar o primeiro produto** (CP 115, hipóteses no CP 117), não corrigida; (b) dois avisos de falha sem texto no histórico às 09h17 e 09h23 (CP 129), sem causa; (c) sensação de travamento na tela "Entre novamente" (CP 133), causa não estabelecida; (d) lista de usabilidade acumulada nos CPs 112, 118, 119, 123, 130, 131, 132 e 133.
- **Roadmap:** parágrafo de avanço parcial de R0 atualizado. **Nenhum item físico de R0 foi marcado `[x]`**: faltam a reinstalação do APK, a conferência independente pela API, o limite de envios no aparelho e a correção do defeito (a).
- **Limites gerais:** a maior parte da evidência é relato do usuário; a conferência pela API de homologação não foi possível, pois o agente não tem a sessão do usuário nem deve receber o código de acesso; nenhum commit ou push foi feito; produção intocada; backups locais preservados; dados pessoais e códigos de acesso não foram gravados.
- **Próximo passo:** decidir se gera a 0.1.12 com a correção do crash do primeiro produto (CP 117) e repete o ciclo físico com desinstalação e instalação do APK; priorizar a lista de usabilidade.

<a id="cp-20261110-139-0112-gerada-com-correcao-defensiva-do-crash"></a>

## CP 20261110 139 0.1.12 gerada com correção defensiva do crash

- **Data:** 10/11/2026, 15h51, America/Sao_Paulo.
- **Etapa:** R0/R5, depois do bloco 4. Segue o [CP 138](#cp-20261110-138-bloco-4-encerrado-no-samsung); trata o defeito aberto do [CP 115](#cp-20261110-115-crash-nativo-ao-salvar-o-primeiro-produto-no-samsung) e as hipóteses do [CP 117](#cp-20261110-117-hipoteses-para-o-crash-do-primeiro-produto). Autorizado pelo usuário ("Sim, gerar 0.1.12").
- **Construído (não commitado, branch `codex/pdv-homologacao-real`):** `apps/mobile/app.json` 0.1.11/12 para **0.1.12/13**; `removeClippedSubviews={false}` nas FlatList de `ListaVendas.tsx` e `TelaBusca.tsx` (`ListaProdutos` já tinha); `useVoltar.ts` passou a separar o `replace` do `back()` em quadros diferentes com `requestAnimationFrame`, **mantendo o destino do botão voltar**. Não aplicados por mudarem o destino do voltar: `return` após o `replace` e `initialRouteName` (CP 117), nem alteração em `FormularioProduto.tsx`.
- **Validação local:** `npm run typecheck -w @pdv/mobile` aprovado; `npm run test -w @pdv/mobile -- --maxWorkers=1` aprovado, 73 arquivos e 600 testes. Não há script de lint no projeto. Não há teste novo: nenhum teste cobre `useVoltar` ou essas listas, e o crash não foi reproduzido.
- **APK:** `./scripts/build-android.ps1 -Perfil homologacao`, Gradle BUILD SUCCESSFUL em 8m28s, ARM64 e ARM32, 1892 fontes, API de homologação consultada antes do build. `builds/pdv-homologacao-0.1.12.apk`, 4,29 MB de bundle, **SHA256 `0c9a9377ca7826f97ffcb1ac8917f17d48cd58bd77fb78d4c0db9060b49d1372`**. Assinatura de teste local, a mesma da 0.1.11 (certificado SHA-256 `fac61745…3b9c`), então `adb install -r` atualiza sem limpar dados. Manifesto: `androidFisico` e `aceiteHumano` pendentes. `builds/` é ignorado pelo git.
- **Limites:** a causa do crash **não foi comprovada nem reproduzida**; a correção é defensiva e pode não resolver, pois as duas listas não estão no caminho do cadastro e o ajuste de `useVoltar` é hipótese. Sem teste em Android físico nem no emulador, sem CI desta versão, sem conferência do hash no aparelho. Nenhum checkbox marcado.
- **Próximo passo:** instalar a 0.1.12 no Samsung por atualização (`adb install -r`, com autorização do usuário), conferir o SHA256 instalado e repetir o cadastro do primeiro produto em conta nova (catálogo vazio), lendo o buffer de crash. Depois decidir sobre o CI e sobre repetir os cenários do bloco 4.

<a id="cp-20261110-140-bloco-5-iniciado-apk-0112-conferido-e-f03-nao-aplicavel"></a>

## CP 20261110 140 Bloco 5 iniciado, APK 0.1.12 conferido e F03 não aplicável

- **Data:** 10/11/2026, 12h55, America/Sao_Paulo (máquina em UTC−3, 15h55 UTC).
- **Etapa:** R5, bloco 5 (APK e auditoria no aparelho). Continua o [CP 139](#cp-20261110-139-0112-gerada-com-correcao-defensiva-do-crash).
- **Decisões do usuário nesta sessão:** os testes físicos valem para a **0.1.12**; **ninguém usa a 0.1.4**.
- **F03: NÃO APLICÁVEL**, por declaração do usuário de que ninguém usa a 0.1.4. Não houve teste de migração. No Samsung, o pacote demo `br.com.pdv.mobile` está na versão 0.1.2 (versionCode 3) e foi preservado.
- **APK conferido (validado localmente):** `builds/pdv-homologacao-0.1.12.apk`, 64.628.700 bytes, pacote `br.com.pdv.mobile.homologacao`, 0.1.12/13. **SHA256 recalculado `0c9a9377ca7826f97ffcb1ac8917f17d48cd58bd77fb78d4c0db9060b49d1372`**, igual ao `.sha256` e ao manifesto. Certificado SHA-256 `fac61745…3b9c`, igual ao da 0.1.11. Manifesto do APK sem armazenamento amplo, biometria nem `RECORD_AUDIO`. Inventário de 300 fontes recalculado contra o checkout: **zero divergências**. Essa conferência é anterior à instalação; o hash no aparelho ainda precisa ser lido depois dela.
- **Estado inicial do aparelho (ADB, 12h47):** SM-S938B, Android 17, homologação 0.1.11/12, `base.apk` com SHA256 `2df561ee…e0c3`, igual ao `builds/pdv-homologacao-0.1.11.apk`. Câmera não concedida. O ADB perdeu o aparelho às 12h53, e a leitura de buffer de crash e do modo avião ficou sem resultado.
- **Ordem definida:** F02 (atualizar 0.1.11 para 0.1.12) vem **antes** de F01, porque a instalação limpa apaga os dados locais que F02 precisa preservar. O texto de F02 cita 0.1.5/0.1.6 para 0.1.7, versões históricas; aqui o par é 0.1.11 para 0.1.12, a versão anterior efetivamente instalada.
- **Correção de registro:** os horários dos CPs 137 e 139 estão em UTC, embora rotulados como America/Sao_Paulo. O APK foi concluído às 12h51 locais, e não às 15h51. A sequência entre os CPs não muda.
- **Limites:** 0.1.12 sem commit e sem CI (CP 139), o que fica como limite de rastreabilidade das evidências deste bloco. F01, F02, F18 e as verificações físicas da auditoria continuam pendentes. Nenhum checkbox marcado, sem alteração de código.
- **Próximo passo:** reconectar o Samsung e registrar o estado na 0.1.11 antes de atualizar, com dados sincronizados e uma venda pendente.

<a id="cp-20261115-141-prompts-revisados-para-conducao-pelo-agente-em-qualquer-android"></a>

## CP 20261115 141 Prompts revisados para condução pelo agente em qualquer Android

- **Data:** 15/11/2026, 22h04, America/Sao_Paulo.
- **Etapa:** R0/R5, preparação da retomada do bloco 5. Continua o [CP 140](#cp-20261110-140-bloco-5-iniciado-apk-0112-conferido-e-f03-nao-aplicavel). Pedido do usuário: tirar dele os testes que o agente pode executar e não depender de um modelo de aparelho.
- **Construído (não commitado, branch `codex/pdv-homologacao-real`):**
  - [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md) reescrito: situação dos blocos 1–5, numeração mantida, novo tipo "Agente + aparelho", coluna com o que fica com o usuário, regras do aparelho (11–16: qualquer Android, agente conduz por ADB, só o pacote de homologação, configuração restaurada, emulador como substituto só com aprovação, retomada após queda do ADB). Regra 5 passou a aceitar o código digitado pelo usuário no prompt dos scripts `homologar-*.mts`, nunca na conversa. Bloco 5 retomado com commit e CI da 0.1.12, F02 antes de F01 e reteste do crash do primeiro produto (CP 115).
  - `scripts/pdv-android-ui.py`: driver de UI para qualquer Android, com `--dispositivo`, `--fisico` (opt-in para aparelho real), `--listar`, guarda de primeiro plano genérica no lugar da checagem de launcher, ações `back`, `airplane`, `tap_sistema` e `assert_ausente`, artefatos `builds/pdv-ui-*` e serial gravado só como hash no log.
  - `scripts/pdv-emulador-ui.py` virou shim legado que chama o novo driver no `emulator-5586`, sem `--fisico`.
- **Complemento no mesmo dia, a pedido do usuário:** modelo recomendado por bloco na tabela e no início de cada bloco. Opus 5.5 orquestra os blocos 6, 8, 9, 13–15 e 18–23. Sonnet 5.5 fica com os blocos 5, 7, 10–12, 16 e 17 e com o opcional de backup, e Haiku 5.5 com o opcional de contato. Fallback para Sonnet só nos blocos 6, 8, 13, 15 e 23.
- **Validação local:** `py_compile` dos dois scripts aprovado; `--help` aprovado; `--listar` sem aparelho conectado imprime mensagem clara. **Nenhuma ação de UI foi executada**, nem em emulador nem em aparelho físico. Limites conhecidos: o formato de `dumpsys window` e o suporte a `cmd connectivity airplane-mode` (Android 11+) variam por fabricante; `money` depende dos rótulos em português.
- **Aparelho:** `adb devices` vazio às 22h04; a conexão do aparelho ainda não foi feita.
- **Roadmap:** sem alteração; nenhum checkbox marcado. Sem commit, push, deploy ou mudança em produção.
- **Próximo passo:** conectar um Android com depuração USB ou Wi-Fi autorizada e abrir uma sessão nova com o prompt do bloco 5 (retomada).

<a id="cp-20261115-142-0112-rastreavel-ci-aprovado-e-f02-aprovado-no-samsung-por-adb"></a>

## CP 20261115 142 0.1.12 rastreável, CI aprovado e F02 aprovado no Samsung por ADB

- **Data:** 15/11/2026, 22h25, America/Sao_Paulo. **Etapa:** R5, bloco 5 (retomada). Continua o [CP 140](#cp-20261110-140-bloco-5-iniciado-apk-0112-conferido-e-f03-nao-aplicavel) e o [CP 141](#cp-20261115-141-prompts-revisados-para-conducao-pelo-agente-em-qualquer-android).
- **Rastreabilidade (construído e validado externamente):** commits enviados na branch `codex/pdv-homologacao-real`: `fadad7e` (0.1.12/13: `app.json`, `ListaVendas`, `TelaBusca`, `useVoltar`), `867ecec` (driver `scripts/pdv-android-ui.py`) e `c520224` (docs). CI [43784808846](https://github.com/romulosutil/prisma-pdv-app/actions/runs/43784808846), `workflow_dispatch` em `c520224`: `success` (tipos, ferramentas, shared, API/PostgreSQL 17, mobile, imagem e isolamento; deploy pulado). O inventário de 300 fontes do CP 140 foi conferido contra o checkout antes do commit e os fontes de runtime não mudaram depois dele; o bundle do APK corresponde aos fontes commitados. Sem PR, deploy ou alteração de produção.
- **Aparelho (regra 11):** Samsung SM-S938B, Android 17 (SDK 37), serial não registrado. O ADB perdeu o aparelho uma vez e foi retomado do último passo confirmado.
- **Estado inicial:** `br.com.pdv.mobile.homologacao` 0.1.11/12, `base.apk` instalado com SHA256 `2df561ee…e0c3`, igual ao APK 0.1.11 do CP 106. Valores originais anotados: modo avião 0, `font_scale` 1.0, animações 1.0/1.0/1.0, tela 1440x3120, densidade 600, Wi-Fi ligado, dados móveis ligados.
- **F02, atualização 0.1.11 → 0.1.12 sem perda: PASS (Android físico conduzido pelo agente via ADB).** Antes: abri o caixa (troco R$ 100), fiz uma venda sincronizada (#000005, R$ 10), uma segunda que sincronizou na hora (#000006) e uma terceira realmente pendente (#000007). Esperado pelo app: 7 vendas locais, 1 aguardando confirmação, 0 preservadas, dinheiro vendido R$ 30. `adb install -r builds/pdv-homologacao-0.1.12.apk`: `Success`. Depois: `versionName=0.1.12 versionCode=13`, `firstInstallTime` de 03/11 preservado, `base.apk` instalado com SHA256 `0c9a9377…1372`, igual ao APK, ao manifesto e ao CP 140. Dados preservados: caixa aberto às 22:14 com troco R$ 100, as 3 vendas (#000005 a #000007), 7 vendas locais e a pendência. Reconexão: **um único envio**; fila 1 → 0, 3 vendas e R$ 30 no histórico, sem duplicata. Pacote e certificado iguais (a instalação por cima só é aceita com a mesma assinatura).
- **Achado de método, não de produto:** o modo avião do Samsung (`cmd connectivity airplane-mode`) **mantém o Wi-Fi conectado**; a primeira venda "offline" sincronizou. Para o teste valer foi preciso `svc wifi disable` e `svc data disable`. O driver deve tratar isso (pendência para o `airplane`). O toque do driver passou a usar coordenadas e `layout` ganhou retorno com `--no-idle` (telas com câmera nunca ficam ociosas); alterações locais no driver, ainda não commitadas.
- **Estado do aparelho agora:** rede restaurada (modo avião 0, Wi-Fi e dados ligados; `wifi_on` aparece como 1 e não 2, sem efeito funcional), caixa **aberto**, sem pendências. Câmera concedida ao app. Buffer `logcat -b crash` sem ocorrência do pacote durante o F02.
- **Limites:** não validei o servidor por HTTP, só pela tela do app. F02 original citava 0.1.5/0.1.6 → 0.1.7; aqui o par é 0.1.11 → 0.1.12. IDs de parcela não foram exercitados. Nenhum checkbox de roadmap marcado.
- **Próximo passo:** F01 (instalação limpa), que **apaga os dados locais do app de homologação** e exige confirmação do usuário. Antes, fechar o caixa de teste ou aceitar que ele fique aberto no servidor.

<a id="cp-20261115-143-f01-parcial-e-crash-do-primeiro-produto-nao-reproduzido-na-0112"></a>

## CP 20261115 143 F01 parcial e crash do primeiro produto não reproduzido na 0.1.12

- **Data:** 15/11/2026, 23h02, America/Sao_Paulo. **Etapa:** R5, bloco 5. Continua o [CP 142](#cp-20261115-142-0112-rastreavel-ci-aprovado-e-f02-aprovado-no-samsung-por-adb). Aparelho: Samsung SM-S938B, Android 17, por ADB. Evidência: **Android físico conduzido pelo agente**, salvo o que está marcado como pendente de passo humano.
- **Instalação limpa (F01):** com confirmação do usuário, fechei o caixa de teste (contado R$ 130 = esperado, fila 0) e desinstalei só `br.com.pdv.mobile.homologacao`; o demo `br.com.pdv.mobile` foi preservado. Instalei `builds/pdv-homologacao-0.1.12.apk`: `versionName=0.1.12`, `firstInstallTime` novo, `base.apk` instalado com SHA256 `0c9a9377…1372`, igual ao APK. Manifesto instalado: `CAMERA` pedida; **sem `RECORD_AUDIO`** (só `MODIFY_AUDIO_SETTINGS`, que não grava áudio).
- **Conta de teste:** autorizado pelo usuário, usei e-mail descartável (mail.tm) e CPF sintético válido. Cadastro novo completo: e-mail, código lido da caixa temporária e digitado pelo agente (não registrado), loja "Loja Teste Homologacao", meios de recebimento e permissão de câmera. Nada pessoal do usuário foi usado.
- **Câmera negada:** no passo 6 do onboarding, "Não permitir" no diálogo do sistema; `dumpsys package` confirma `CAMERA granted=false`. O app seguiu para o início sem erro. Em Vender, o painel diz "Permita o uso da câmera para ler os códigos" com "Permitir câmera" e "Digitar código". **Digitação manual PASS:** o EAN `7891234567895` adicionou "Produto Primeiro" (R$ 5,00) ao carrinho com a câmera negada. Observação: o selo diz "Leitor ativo" mesmo sem permissão (texto enganoso, não bloqueia o uso).
- **Câmera concedida:** concedida pelo fluxo "Permitir câmera"; `CAMERA granted=true` (usuário 0) e `dumpsys media.camera` mostra o app com a câmera 0 aberta. O leitor entrou em "pausa para poupar bateria" e voltou a "Leitor ativo" ao tocar.
- **Crash do primeiro produto (CP 115): NÃO REPRODUZIDO na 0.1.12.** Conta nova, catálogo vazio ("0 produtos", "Seu catálogo está vazio"). `adb logcat -b crash` zerado antes: 0 linhas. Preenchi nome, EAN, R$ 5,00 e estoque 10 e salvei: o app voltou à lista com "Produto Primeiro, 7891234567895 · Estoque 10 un" e o buffer de crash continuou com **0 linhas**, sem novo registro de saída do processo e com o mesmo PID. Uma única tentativa, na transição lista vazia → com linha. **Isso não prova a correção:** a 0.1.11 também só caiu na primeira tentativa de um caso, e a causa nunca foi reproduzida. Resultado honesto: sem recorrência em uma tentativa; o CP 115 permanece "não confirmado como resolvido" até repetições (inclusive o fluxo pela câmera/voltar).
- **Pendente (passos humanos de F01):** ler um código de barras real com a câmera, conferir se a lanterna acende e confirmar que não há bip duplicado. O agente não consegue ouvir nem ver a lanterna.
- **Estado do aparelho:** caixa de teste **aberto** (troco R$ 50) na conta nova; câmera concedida; rede normal. Valores de fonte/animação/tela ainda originais.
- **Próximo passo:** passos humanos do F01; depois F18, exportação e a matriz de correções.

<a id="cp-20261115-144-f01-lido-e-f18-percorrido-com-achados-de-layout-e-de-mudanca-de-tela"></a>

## CP 20261115 144 F01 lido pelo usuário e F18 percorrido com achados de layout e de mudança de tela

- **Data:** 15/11/2026, 23h27, America/Sao_Paulo. **Etapa:** R5, bloco 5. Continua o [CP 143](#cp-20261115-143-f01-parcial-e-crash-do-primeiro-produto-nao-reproduzido-na-0112). Samsung SM-S938B, Android 17, 0.1.12 (hash instalado conferido nos CPs 142 e 143). Evidência: **Android físico conduzido pelo agente (ADB)**, exceto onde marcado "relato".
- **F01, leitura real (relato do usuário + tela):** o usuário leu um código de barras real com a câmera concedida. O app exibiu "Produto não encontrado — o código 7896093301871 não está no seu catálogo" (leitura funcionando com R8; ausência no catálogo é outro assunto) e o usuário relatou que a **lanterna acendeu**; a tela mostrou "Lanterna ligada / Desligar lanterna". **Pendente de relato:** bip único (não registrei resposta do usuário sobre o bip). `logcat -b crash` sem o pacote durante a leitura. Resultado: leitura e lanterna **PASS por relato do usuário e tela**; bip **sem resultado**; câmera negada/digitação e manifesto sem áudio já em PASS (CP 143).
- **F18, configuração aplicada e restaurada:** originais anotados: `font_scale` 1.0, animações 1.0/1.0/1.0, tela 1440x3120, densidade 600. Aplicado `font_scale` 2.0, animações 0, `wm size 720x1280` e `wm density 320` (equivale a 360 dp de largura). **Restaurado** com `settings put` e `wm size/density reset`; conferido 1.0, 1.0/1.0/1.0, 1440x3120, 600.
- **Percurso nessas condições (capturas `builds/pdv-ui-f18-*.png`, auditoria de árvore de acessibilidade por tela):** início, abrir caixa (R$ 100), venda (EAN digitado, R$ 5), cobrança em dinheiro, fechamento (contado R$ 105 = esperado) e Ajustes → Suporte e privacidade. **Todos os elementos clicáveis tinham rótulo (0 sem rótulo em todas as telas) e nenhum ficou fora da largura da tela.** Abrir caixa, vender e fechar o caixa foram **possíveis**, com rolagem. Navegação por teclado: TAB percorreu na tela de suporte as abas "Suporte" → "Exclusão" → campo de texto, com anel de foco visível e rolagem acompanhando; a verificação de ENTER foi só visual (sem ação destrutiva).
- **Defeitos de layout achados (fonte 2.0 + 360 dp), todos reproduzíveis na captura:** (1) em **Cobrança em dinheiro**, o teclado numérico fica **por cima** do valor, dos atalhos "Valor exato/R$ 20/R$ 50" e da mensagem "Faltam…"; "Valor exato" ficou inalcançável e o toque caiu numa tecla; o pagamento só se completou digitando o valor pelo teclado. (2) Em **Fechar caixa**, o botão fixo ocupa a área e deixa visível cerca de uma linha de conteúdo; o teclado só é alcançável com rolagem fina, e a tecla zero ficou atrás do botão em alguns pontos. (3) Barra inferior: "Início" e "Produtos" se encostam e **"Ajustes" fica cortado na borda direita**. (4) Rótulos longos quebram dentro da palavra ("Dinh/eiro", "Espera/do na gaveta"). (5) Os três botões "Entrada/Sangria/Retirada" aparecem **cortados** ("ada/gria/ada") em Caixa. (6) Em Vender, a ilustração de leitor em pausa fica por cima do campo de busca. Nenhum impede a venda ou o fechamento com rolagem, mas (1) e (2) degradam a operação. **F18 não é PASS integral:** há defeitos de layout, e o TalkBack ainda não foi testado.
- **Achado fora do roteiro, mudança de tela com o app aberto:** nas **duas** vezes que mudei densidade/tamanho da tela com o app em primeiro plano (aplicar e restaurar), o app abriu "Não foi possível abrir seus dados — o acesso foi interrompido para proteger seus registros", sem queda de processo. "Tentar novamente" restaurou a tela e os dados (1 venda, R$ 5) sem perda. Uma partida a frio nas mesmas condições abriu normalmente. Causa não investigada; candidato a defeito de mudança de configuração, a tratar à parte. O botão "Tentar novamente" ficou cortado na base em 360 dp/fonte 2.0.
- **Correção de leitura do buffer de crash:** `logcat -b crash` acumulou 295 linhas às 23h24, **todas de `uiautomator dump`** (conflito com o serviço de acessibilidade do driver, `UiAutomationService already registered`), não do app. O app não aparece no buffer em nenhum momento desta sessão. Anotar para não confundir: não usar `uiautomator dump` junto com o `android layout`.
- **Motivo do roteiro de e-mail:** a primeira tentativa de modo avião manteve o Wi-Fi ligado (CP 142). O driver ganhou toque por coordenada e retorno `--no-idle`, ainda sem commit.
- **Estado do aparelho:** tela, fonte e animações restauradas; Wi-Fi/dados normais; caixa de teste **fechado**; conta de teste descartável ativa; câmera concedida.
- **Pendências:** TalkBack (passo humano) em abertura e venda, bip único, exportação/compartilhamento, matriz de correções por aparelho e a decisão sobre os defeitos de layout. Nenhum checkbox de roadmap marcado.

<a id="cp-20261115-145-bloco-5-encerrado-com-exportacao-matriz-de-correcoes-e-acessibilidade-no-backlog"></a>

## CP 20261115 145 Bloco 5 encerrado: exportação, matriz de correções e acessibilidade no backlog

- **Data:** 15/11/2026, 23h40, America/Sao_Paulo. **Etapa:** R5, fim do bloco 5. Continua o [CP 144](#cp-20261115-144-f01-lido-e-f18-percorrido-com-achados-de-layout-e-de-mudanca-de-tela). Samsung SM-S938B, Android 17, 0.1.12 (hash instalado `0c9a9377…1372`).
- **Decisão do usuário (15/11/2026):** **acessibilidade (TalkBack, fonte máxima, telas pequenas) fica no backlog**; o foco agora é validar o core para testar. O TalkBack **não foi testado**. F18 **não é aprovado nem reprovado**: fica adiado, com os defeitos de layout do CP 144 registrados como backlog. Não é bloqueio do MVP, mas a evidência não deve ser apagada.
- **Exportação e compartilhamento (CSV de vendas), Android físico por ADB:** "Exportar CSV" abriu o seletor do Android; **cancelar** voltou ao PDV sem erro e sem anunciar envio; **compartilhar de novo** para um destino local (ZArchiver, que gerou um `.zip` com o CSV na memória interna). O arquivo foi baixado e conferido: **1 linha**, `#000001;15/11/2026;23:14;Paga;Dinheiro;Produto Primeiro;1;5,00;5,00`, igual à tela (1 venda, R$ 5,00). **Sem credenciais, e-mail ou token** (busca por token, senha e e-mail negativa). O arquivo permaneceu legível depois do seletor. Apaguei o `.zip` que criei. **Erros de condução, sem envio externo:** o seletor lista contatos e apps pessoais, e não toquei neles; um toque meu caiu no Jira ("Anexar arquivos compartilhados?") e **cancelei** no diálogo, sem upload; forcei o encerramento do ZArchiver ao final. **Limites:** não exportei o JSON de diagnóstico; o **cache temporário do app não é inspecionável** (app não depurável), então a expiração de 1 h e a limpeza local **não foram verificadas**; a indisponibilidade de destino não foi testada.
- **Matriz de correções da auditoria (0.1.9, [matriz](correcoes-auditoria-0.1.9.md)) que dependem de aparelho:**
  - **A01** digitação sem câmera no sheet rolável: **PASS** (câmera negada, EAN digitado, produto adicionado; ADB).
  - **A02** busca no cabeçalho da lista: **PASS** na 0.1.12 (digitar "Prod", resultado "Adicionar Produto Primeiro" tocado, item incluído; ADB).
  - **C01** desmontagem da câmera: **PASS** (`dumpsys media.camera`: cliente ativo 1 com o leitor ativo, **0** com o app em segundo plano e **1** ao voltar; ADB). Lanterna ligada na leitura real, por relato.
  - **S01** R8 e scanner: **PASS** (código real lido com o release R8; relato do usuário e tela).
  - **S02** armazenamento amplo e biometria: **PASS** (manifesto instalado sem armazenamento amplo, biometria nem áudio; `dumpsys package`).
  - **S04** cadastro com prova de e-mail: **PASS** (OTP real enviado a e-mail descartável e exigido antes da loja; cadastro novo completo).
  - **H03** mensagem de e-mail já cadastrado: **PASS parcial** (a tela exibiu "Este e-mail já tem acesso. Entre com seu código pessoal."; a recusa de CPF repetido **não** foi testada).
  - **A03** teclado, fonte e TalkBack: **backlog** (fonte e teclado exercitados no CP 144, TalkBack não testado, defeitos de layout registrados).
  - **C03 e S05** retenção de exportações: **parcial** (arquivo legível após o seletor; expiração e limpeza **não verificadas**).
  - **Não repetidos neste bloco:** H01, H02, C02 (paginação), N01, N02, N03 (kg), N04 e S03. Continuam só com a evidência local e de CI da matriz, sem prova física nesta rodada.
- **Resumo de F01, F02, F17, F18 e CP 115:** F01 **PASS**, exceto o bip duplicado, que **não teve resposta** (câmera negada, digitação, concessão, leitura real, lanterna por relato, manifesto sem áudio). F02 **PASS** ([CP 142](#cp-20261115-142-0112-rastreavel-ci-aprovado-e-f02-aprovado-no-samsung-por-adb)). F17 **parcial** (CSV; sem JSON, sem expiração ou limpeza). F18 **adiado** por decisão. CP 115 **não reproduzido** em 1 tentativa na 0.1.12 ([CP 143](#cp-20261115-143-f01-parcial-e-crash-do-primeiro-produto-nao-reproduzido-na-0112)).
- **Estado final do aparelho:** fonte 1.0, animações 1.0/1.0/1.0, tela 1440x3120 e densidade 600 **restauradas**; Wi-Fi e dados ligados, modo avião 0; a permissão de câmera concedida durante o teste **não foi revertida**; caixa de teste fechado; a conta descartável e o produto "Produto Primeiro" permanecem na homologação. Pacote demo `br.com.pdv.mobile` intacto. O app de homologação segue instalado na 0.1.12.
- **Rastreabilidade:** commits `fadad7e`, `867ecec`, `c520224` e CI [43784808846](https://github.com/romulosutil/prisma-pdv-app/actions/runs/43784808846) aprovado ([CP 142](#cp-20261115-142-0112-rastreavel-ci-aprovado-e-f02-aprovado-no-samsung-por-adb)). Os CPs 142–145, roteiro, roadmap e as mudanças do driver (toque por coordenada, `--no-idle`) entram em um commit somente de documentação e driver.
- **Backlog gerado:** (a) defeitos de layout em fonte 2.0 e 360 dp (cobrança em dinheiro, fechar caixa, barra inferior, botões Entrada/Sangria/Retirada, ilustração sobre a busca); (b) tela "Não foi possível abrir seus dados" ao mudar a densidade com o app aberto; (c) selo "Leitor ativo" sem permissão de câmera; (d) o `airplane` do driver deve também desligar Wi-Fi e dados no Samsung; (e) bip duplicado e expiração do cache de exportação sem prova; (f) TalkBack.
- **Próximo passo:** o bloco 6 (dono e dois operadores) exige dois aparelhos, ou um aparelho e o emulador. Antes, decidir se os defeitos (b) e (c) entram na próxima versão.

<a id="cp-20261116-146-0113-corrige-selo-da-camera-e-reabertura-dos-dados-verificada-no-samsung"></a>

## CP 20261116 146 0.1.13 corrige selo da câmera e reabertura dos dados, verificada no Samsung

- **Data:** 16/11/2026, 10h05, America/Sao_Paulo. **Etapa:** R5, correção dos defeitos (b) e (c) do [CP 145](#cp-20261115-145-bloco-5-encerrado-com-exportacao-matriz-de-correcoes-e-acessibilidade-no-backlog). Samsung SM-S938B, Android 17.
- **Construído (não commitado):** `apps/mobile/app.json` 0.1.13 (versionCode 14); `Scanner.tsx` (selo e painel dependem da permissão: sem câmera mostra "Câmera desligada. Digite o código para continuar.", cinza, e a lanterna ligada só aparece com câmera liberada); `app/_layout.tsx` (abertura dos dados memorizada por processo, `abrirDados()`, para que a recriação da Activity não repita `dados.iniciar()`; só uma falha libera nova tentativa); teste novo em `scannerCiclo.test.ts`.
- **Validado localmente:** typecheck e 601 testes do mobile aprovados. APK `builds/pdv-homologacao-0.1.13.apk`, SHA256 `0bd5620c…554b`; `base.apk` instalado com o mesmo hash, versão 0.1.13/14, dados preservados (`adb install -r`).
- **Verificado no Android físico (ADB, 0.1.13):** (c) com a câmera **negada** a Vender mostra "Câmera desligada" e o campo para digitar; com a câmera **concedida** mostra "Leitor ativo" e o cliente de câmera fica ativo (`dumpsys media.camera`). (b) com o app aberto, densidade 600→480→720→600: **sem** "Não foi possível abrir seus dados", sem crash no `logcat -b crash` do app. O app reabre no Início depois da mudança, o que é esperado na recriação da Activity.
- **Limites:** a causa de (b) é hipótese (a correção removeu a reexecução de `iniciar`, e o sintoma sumiu em 1 rodada de 3 mudanças); sem teste automatizado do remonte. Não testei mudança de tamanho de tela nem de fonte ao vivo. A permissão de câmera ficou concedida, como antes. "Ligar lanterna" ainda aparece com a câmera desligada (não corrigido, baixo risco).
- **Estado do aparelho:** densidade 600 e tamanho 1440x3120 restaurados (`wm reset`), fonte 1.0, tela sem forçar ligada; app encerrado. Nenhum dado de teste novo.
- **Pendências:** commit, push e CI da 0.1.13 aguardam autorização do usuário. Próximo: bloco 6 (dois aparelhos, ou aparelho e emulador).

### Atualização do CP 146 (16/11/2026): rastreabilidade da 0.1.13

- **Validado externamente:** commit `290286c` enviado à branch `codex/pdv-homologacao-real`. CI [43872916974](https://github.com/romulosutil/prisma-pdv-app/actions/runs/43872916974), `workflow_dispatch` nesse commit: `success` (tipos, testes shared/API com PostgreSQL/mobile, imagem e isolamento); o job de deploy foi **pulado**. Sem PR, deploy ou alteração de produção.
- **Pendência:** o APK 0.1.13 instalado foi gerado antes do commit a partir dos mesmos fontes; não foi gerado um novo build depois do CI.

<a id="cp-20261116-147-bloco-6-dono-e-dois-operadores-em-um-android-fisico-com-segundo-aparelho-por-http"></a>

## CP 20261116 147 Bloco 6: dono e dois operadores em um Android físico, com segundo aparelho por HTTP

- **Data:** 16/11/2026, 12h10, America/Sao_Paulo. **Etapa:** R5, bloco 6 (F04–F08, F13), com reflexos em R1, R2 e R3. Continua o [CP 146](#cp-20261116-146-0113-corrige-selo-da-camera-e-reabertura-dos-dados-verificada-no-samsung).
- **Aparelho e artefato:** Samsung SM-S938B, Android 17 (SDK 37), físico, com `br.com.pdv.mobile.homologacao` 0.1.13 (versionCode 14). O `base.apk` instalado tem SHA256 `0bd5620c…554b`, igual a `builds/pdv-homologacao-0.1.13.apk`. A API de homologação foi usada sem alterações; produção não foi tocada.
- **Segundo aparelho, limite da evidência:**
  - Com aprovação do usuário (regra 15), tentei o emulador `pdv-acesso-api35-curto` cinco vezes. Com WHPX, a CPU virtual travou ("hanging thread QEMU2 CPU0") ou o boot passou de 10 minutos, com e sem Vulkan, com 1 a 4 núcleos e com GPU por software. Sem aceleração, o x86_64 encerrou sozinho.
  - O usuário decidiu seguir com **Bruno como terceiro perfil no mesmo Samsung**. F13 e a troca de aparelho usaram um **2º aparelho simulado por HTTP** (um `aparelhoId` próprio, aberto pelo script).
  - Não há evidência com dois aparelhos reais neste CP.
- **Contas de teste, com autorização do usuário:**
  - O usuário não tinha acesso a e-mails e pediu e-mail e CPF temporários. Criei quatro caixas mail.tm descartáveis: dono, Ana, Bruno e empresa B.
  - Cada código de acesso foi lido da caixa temporária por um auxiliar fora do repositório e digitado direto no app ou no prompt do script, sem aparecer na conversa nem nos arquivos. Isso substitui a regra 5 ("o usuário digita"), por decisão do usuário.
  - A conta "Loja Bloco 6 A" foi criada por HTTP, com cadastro e prova de e-mail e CPF sintético válido.
  - Ana e Bruno foram convidados como **operadores** com a permissão adicional **"Fazer sangria no próprio caixa"**. Sem ela, o operador padrão não registra sangria nem retirada, exigidas por F05.
- **F04, PASS (Android físico conduzido pelo agente):**
  - O dono convidou Ana e Bruno pela tela Equipe da loja ("Convite criado por sete dias", "Convite pendente").
  - Cada pessoa entrou com o próprio OTP por "Entrar com outro usuário ou loja" → "Aceitar convite e entrar".
  - **Usuários neste aparelho** chegou a 4 perfis: a conta antiga do CP 143, o dono, Ana e Bruno. Cada perfil mostrava "0 aguardando envio · 0 para revisão".
  - **Alternância:** "Retomar <nome>" funcionou entre os três perfis da loja. Durante uma sincronização, a troca foi barrada com "Aguarde a confirmação em andamento antes de alternar o usuário."
  - **Suspensão:** o dono usou "Suspender Ana" ("Acesso interrompido. O histórico continua preservado."). "Retomar Ana" foi recusado com "Sua sessão não é mais válida. Entre de novo.", e o dono continuou em uso.
  - Depois que o dono usou "Retomar Ana" na equipe, o perfil exigiu "Este perfil precisa de um novo código pessoal". Com o código novo, Ana entrou direto.
  - **Reinício** (force-stop e launch): reabriu o perfil ativo (Ana).
  - **Logout:** "Sair deste perfil" (Bruno) levou a "Entre novamente". Após o reinício, o app continuou em "Entre novamente" e os outros três perfis seguiram pausados e guardados.
  - A pausa é automática na alternância; não há botão próprio.
- **F05, PASS (Android físico por ADB + API):**
  - **Ana:** abertura de R$ 100 às 10:53, venda #000001 de R$ 200 em dinheiro, entrada de R$ 50, sangria de R$ 80 e retirada de R$ 20. O esperado na gaveta foi 300 → 350 → 270 → **250**.
  - **Bruno:** abertura de R$ 60 e venda #000001 de R$ 40 (numeração local por perfil), esperado **R$ 100**.
  - Antes de abrir, o Bruno via "0 reais em 0 vendas", "0 produtos · 0 vendas" e nenhuma venda da Ana.
- **F06, PASS (Android físico por ADB + API):**
  - Ana fez a venda #000002, de R$ 10 em Pix manual: chave aleatória sintética, guardada só no aparelho, e "Recebi o Pix".
  - Ana fez a venda #000003, de R$ 20 no cartão de crédito manual ("Aprovado na maquininha").
  - A tela mostrou "Vendido hoje: 230 reais, em 3 vendas", com a gaveta ainda em 250.
  - Não houve recebimento real fora do app (valores de teste), e nenhuma confirmação integrada foi simulada.
- **F07, PASS (Android físico por ADB + API):**
  - **Ana:** contado 245, com R$ 50 de troco na gaveta. Resultado: "Falta R$ 5,00", recolhido 195 e troco preservado 50.
  - **Bruno:** contado 100, com R$ 60 de troco. Resultado: "Bateu certinho", recolhido 40 e troco 60.
  - Cada fechamento foi sincronizado e confirmado.
  - O dono registrou a conferência dos dois em "Caixas da loja e conferência". O autor gravado foi o dono, `01a1e499…`, diferente da Ana, `01a1e49b…`. A troca de aparelho e as movimentações preservam a autoria da Ana.
  - Caixas da loja: Ana 250/245/−5 e Bruno 100/100/0, portanto **esperado 350 e contado 345**.
  - Relatório do dono (hoje, loja atual), com 15 totais: vendas 270, recebimentos 270, entradas 50, sangrias 80, retiradas 20 e diferenças −5. As linhas aparecem por operador e por turno.
- **F08, PASS:**
  - **UI:** em "Meus turnos", o Bruno vê só o próprio turno `01a1e4c1-f10c-7a3c-8e73-86fa706612e7` (a Ana e seu id não aparecem). O relatório do Bruno diz "Seu relatório inclui somente seus registros." e lista só as linhas dele.
  - **HTTP:** `scripts/homologar-equipe.mts` (novo, ver Construído) teve **38/38 PASS** (`builds/b6-f08-equipe.json`).
    - Ana, como operadora, lista e baixa só o que é dela (pull, relatórios e filtros).
    - Relatório de outro operador e de todas as lojas: 403 `permissao_negada`.
    - Movimento, conferência e troca de aparelho no turno aberto do Bruno: 403 `proibido`.
    - `sync/push` do fechamento do turno alheio foi rejeitado por autorização, e o turno ficou idêntico.
    - Uma **empresa B** nova, também com cadastro por OTP, não vê turnos, pull, lojas, equipe, aparelhos nem relatórios de A. Suas escritas no turno de A deram 404 ou `loja_invalida`.
- **Troca de aparelho, PASS com 2º aparelho HTTP (`builds/b6-f13-troca.json`, 34/34):**
  - O turno aberto da Ana `01a1e4a2-2807-76ab-9d73-8d64ee45470f` foi movido por `POST /caixas/:id/aparelho` para o aparelho HTTP. A auditoria registrou `troca_aparelho`.
  - O Samsung (aparelho antigo) passou a mostrar "Caixa fechado" e o card "Caixas de aparelhos anteriores: 1 turno(s) seus estão vinculados a outro aparelho".
  - A retomada pela UI seguiu: Meus turnos → "Motivo da troca de aparelho" → "Retomar turno neste aparelho" → folha "Transferir o turno para este aparelho?" → "Confirmei a sincronização anterior", com o resultado "Operação confirmada no servidor.".
  - O turno voltou ao Samsung **aberto, com o mesmo id, esperado R$ 250 e sem duplicata**. Revogar o aparelho HTTP não afetou o turno.
- **F13, PARCIAL (2º aparelho por HTTP):**
  - A partir do aparelho HTTP, reservar o turno aberto da Ana deu **403 `proibido`**, não o 409 previsto no código (`caixa.ts:56` nega antes do 409 da linha 57).
  - Reservar um turno novo deu **409 `conflito`** ("Seu turno anterior ainda está aberto…").
  - Duas rodadas concorrentes (`Promise.all`) foram todas recusadas. Ficou um turno aberto, com o titular inalterado e nenhum turno criado por acidente.
  - **Transferência entre operadores (UI, mesmo aparelho):** com turnos novos (Ana R$ 20, Bruno R$ 10), o Bruno autorizou o recebimento de R$ 10 com origem no turno `01a1e4de-0782-7caf-8242-19a6df5ad0cb`, e a Ana confirmou o envio dentro dos 5 minutos.
    - Resultado: "Transferência enviada · R$ 10,00" e "Transferência recebida". Os esperados foram 10 e 20, e os fechamentos 10/10 e 20/20 bateram.
  - **Modo avião (só no Samsung):** "Abrir caixa" do Bruno com R$ 10 não abriu turno. Após reconectar, nenhum turno foi criado sozinho.
  - **Não executado:** disputa entre dois aparelhos reais e modo avião nos dois.
- **Achado (não corrigido):** a tentativa de abertura offline deixou uma **abertura pendente local** com troco de R$ 10, sem nenhum aviso na tela.
  - Nenhuma mensagem de erro ficou visível nas capturas (uma 4 s e outra 20 s depois do toque).
  - Depois da reconexão, o Resumo mostrava "Caixa fechado", sem "Repetir operação online pendente".
  - A abertura seguinte com R$ 0 foi recusada com "Repita o troco da abertura pendente para confirmar o resultado no servidor." Reabrindo com R$ 10, o servidor recebeu o **mesmo id** gerado offline (`01a1e4d6-2bb5-7c4a-ba75-733c9b61315e`, anterior ao turno da Ana `01a1e4de…`), sem duplicata.
  - Não há risco financeiro. O problema é de clareza: o operador não sabe que há uma abertura pendente nem com qual troco.
- **Conciliação de IDs e centavos (tela × API × relatório):** `builds/b6-conciliacao.json`, `--somente-leitura`, 7/7 PASS.

  | Turno | Operador | Abertura | Esperado | Contado | Diferença | Vendas |
  |---|---|---|---|---|---|---|
  | `01a1e4a2-2807-76ab-9d73-8d64ee45470f` | Ana | 10000 | 25000 | 24500 | −500 | 23000 (dinheiro 20000, Pix 1000, crédito 2000) |
  | `01a1e4c1-f10c-7a3c-8e73-86fa706612e7` | Bruno | 6000 | 10000 | 10000 | 0 | 4000 (dinheiro) |
  | `01a1e4de-0782-7caf-8242-19a6df5ad0cb` | Ana | 2000 | 1000 | 1000 | 0 | — |
  | `01a1e4d6-2bb5-7c4a-ba75-733c9b61315e` | Bruno | 1000 | 2000 | 2000 | 0 | — |

  Os dois últimos turnos são da rodada de transferência (1000 enviados da Ana para o Bruno).

  - Totais do relatório da API: venda 27000, entradas 5000, sangria 8000, retirada 2000, transferências 1000/1000 e diferença −500.
  - Os ids de turno exibidos nas telas ("Turno: …", "Caixa …") e nas linhas do relatório do app são os mesmos.
  - As vendas usam número local na tela (#000001…) e UUID no servidor (`01a1e4a3…`, `01a1e4b3…`, `01a1e4b5…`, `01a1e4c2…`). A tela não mostra o UUID da venda.
- **Construído (sem commit):**
  - `scripts/homologar-equipe.mts`: F08 por HTTP (operador contra turno alheio e empresa B), `--f13`, `--troca-aparelho` e `--somente-leitura`.
    - Pede o código com `AGUARDANDO_CODIGO <rótulo>` no stdin e respeita 61 s entre pedidos do mesmo e-mail.
    - O relatório fica sem e-mails nem tokens; os operadores aparecem por hash.
    - Revoga os aparelhos HTTP do dono e do operador ao final.
  - **Validado localmente** (PGlite em modo de desenvolvimento) e **externamente** nas três execuções acima.
  - Os auxiliares de caixa temporária e de toque ficaram fora do repositório.
- **Evidências:**
  - `builds/b6-f08-equipe.json`, `builds/b6-f13-troca.json`, `builds/b6-conciliacao.json`.
  - `builds/pdv-ui-b6-*` (layouts sanitizados e duas capturas de tela).
  - `builds/pdv-ui-execucoes.jsonl`.
- **Privacidade:** uma chamada telefônica e notificações de outros apps apareceram durante o teste.
  - Apaguei as capturas que mostravam a chamada e não interagi com ela; o usuário tratou a chamada.
  - O driver confere o app em primeiro plano antes de tocar, mas uma chamada pode surgir entre a conferência e o toque. Passei a checar se há chamada antes de cada lote. Sugestão: ativar "Não perturbe" nas próximas sessões.
- **Estado do aparelho:**
  - Modo avião, Wi-Fi e dados voltaram ao original (0/1/1, anotado antes de alterar).
  - Perfil em uso: dono. Ana e a conta antiga estão pausadas; Bruno saiu.
  - Todos os turnos estão fechados e não há pendências.
  - A chave Pix sintética ficou salva no perfil da Ana neste aparelho.
- **Dados na homologação:** a conta "Loja Bloco 6 A" (com 4 turnos, 4 vendas e as conferências) e a conta da empresa B criada pelo script. As duas são descartáveis e permanecem para auditoria.
- **Roadmap:**
  - Marcados `[x]`: R1 "dono + dois usuários com OTP… em Android físico" e R5 "ciclo completo com dono e dois operadores" e "entrada/sangria/retirada de Ana não mudam o caixa de Bruno…". O aceite humano continua pendente.
  - Parciais, com nota: R2 "dono + dois operadores… troca de aparelho" e R3 "concorrência… com aparelhos distintos".
  - Roteiro: F04–F08 PASS e F13 PARCIAL.
- **Pendências:**
  - F13 e a troca de aparelho com **dois aparelhos reais**, e o modo avião nos dois.
  - Decidir se o aviso da abertura pendente entra na próxima versão.
  - Commit de `scripts/homologar-equipe.mts` e destes documentos, sujeito à autorização do usuário.
  - Aceite humano dos cenários.
- **Próximo passo:** com um segundo Android físico conectado, repetir F13 (reserva disputada, modo avião nos dois, troca de aparelho real); depois seguir para o bloco 7.

## CP 20261116 148 Bloco 7 gestão F14 no Samsung e na API com segundo aparelho por HTTP

- **Data e etapa:** 16/11/2026 (America/Sao_Paulo). R4, cenário F14, bloco 7 (Agente + aparelho). Segue o [CP 147](#cp-20261116-147-bloco-6-dono-e-dois-operadores-em-um-android-fisico-com-segundo-aparelho-por-http).
- **Verificação dos planos:** a oferta vigente é o Pro único (R$ 49,90, 7 dias grátis), que inclui **estoque, fiado, equipe e até 3 lojas** (`assinatura-unica-e-cupons.md`, decisão de 30/10/2026). Fiado e filiais **fazem parte da promessa**, então foram testados; nada ficou oculto.
- **Decisões do usuário nesta sessão:** (1) códigos de acesso por **caixas descartáveis mail.tm**, como no bloco 6; isso substitui a regra 5 das regras comuns **só neste bloco** (o agente lê o código e o digita, sem imprimi-lo ou registrá-lo); (2) o 2º aparelho é o Samsung mais um **2º aparelho simulado por HTTP** (`aparelhoId` próprio). **Limite da evidência:** a disputa entre dois Androids reais não foi exercida. (3) Durante a execução o usuário pediu escopo **prático e MVP**, e a fase de CSV e lojas foi reduzida ao mínimo.
- **Aparelho e artefato:** Samsung SM-S938B, Android 17, físico, via ADB e `scripts/pdv-android-ui.py`; `br.com.pdv.mobile.homologacao` 0.1.13 (versionCode 14), SHA256 `0bd5620c…554b` (igual ao `builds/pdv-homologacao-0.1.13.apk`). API de homologação sem alterações.
- **Construído (sem commit):** `scripts/homologar-gestao.mts` (F14 por HTTP: estoque, fiado, concorrência, relatório/CSV e lojas; mesmo estilo do `homologar-equipe.mts`; gera `.json`, `.csv` e `.consolidado.csv`). **Validado localmente** (PGlite em desenvolvimento, 162 PASS, sem defeito de API) e **externamente** na homologação.
- **Resultados por item:**
  - **1 Estoque (Android físico, ADB):** baixa única da venda da Ana (saldo 5 → 4, uma baixa); reenvio após encerramento forçado sem duplicar; venda offline em modo avião sobreviveu ao reinício e foi enviada **uma vez**; estoque negativo (venda de 4 un: 3 → −1) com "DIVERGÊNCIA: estoque negativo"; ajuste +1 do gerente com motivo (diferença assinada), mostrado uma só vez depois de reiniciar; devolução de 1 un aceita e devolução acima do vendido recusada ("A devolução excede a quantidade vendida."). **PASS.** O estoque final de "F14 Produto A" é **−3** com divergência: as 4 un dos dois fiados também baixaram e cancelar o fiado não repõe estoque, como diz o R4.
  - **2 Fiado (Android físico, ADB):** FIADO-1 (R$ 30, entrada R$ 10, vencimento 30/11/2026, saldo R$ 20) e FIADO-2 (R$ 10, sem entrada); recebimento parcial de R$ 5 pela Ana (saldo R$ 15; gaveta dela 120 → 125); estorno único por original (o botão some depois do estorno); cancelamento só depois de os recebimentos líquidos zerarem, com entrada e crédito original preservados e gaveta inalterada. **PASS.**
  - **3 Recebimentos concorrentes e turno receptor:** no Samsung, o gerente abriu turno (troco R$ 20) e recebeu R$ 5 no título da Ana: esperado dele 25, o da Ana seguiu em 125 (dinheiro no turno do **receptor**), saldo R$ 10; Bruno não vê o título da Ana. **Concorrência real contra o mesmo saldo** só **por HTTP** (2º aparelho simulado; execução completa com 98 PASS), sem dois Androids reais. **PASS** com esse limite.
  - **4 CSV e compartilhamento (Android físico, ADB):** relatório do dono (Loja Bloco 6 A, 16/11) com 57 registros e 15 totais; exportação pelo chooser do Android para um destino local e `adb pull`: **arquivo byte-idêntico** ao `csvRelatorio` aplicado ao JSON da API (`cmp`), com os mesmos totais da tela (vendas 405, canceladas 50, crédito 47, recebimento na venda 358, recebimento de fiado 23, devolução de fiado 14, entradas 50, sangrias 80, retiradas 20, diferenças −5). O CSV do consolidado também ficou idêntico à API. **PASS.**
  - **5 Lojas e consolidado (Android físico + API):** o dono alternou para "F14 Filial 11161554"; criou "F14 Produto Filial" (R$ 15, 3 un) que **não aparece** na loja A, e "F14 Produto A" não aparece na filial; relatório da filial (5 registros, vendas 9) e **Todas as lojas** (62 registros, vendas 414 = 405 + 9) iguais à API; o relatório do gerente não tem seletor de lojas e mostra só a loja A (57). Pela API (HTTP): gerente e operador não criam loja e só listam a própria; a empresa B não vê nem escreve na empresa A (execução de lojas: 84 PASS, 0 FAIL, 3 SKIP). **PASS.**
- **Execuções HTTP:** `builds/b7-f14-gestao.json` (100 checks: 98 PASS, 1 FAIL do auxiliar de código `dono-filial`, 1 SKIP); `builds/b7-f14-gestao-lojas.json` (mesmo FAIL do auxiliar); `builds/b7-f14-gestao-lojas2.json` (84 PASS, 0 FAIL, 3 SKIP). As duas falhas foram do **auxiliar de código de teste** (reaproveitava um código já usado), não da API; ele foi corrigido (fora do repositório).
- **Achados de UX (sem perda nem duplicação, não corrigidos):**
  - Depois de reiniciar, "Vender" da Ana reabre o carrinho de uma venda já concluída; o app recusa alterá-lo ("Esta venda já foi concluída…").
  - Com Vencimento ou Motivo vazio, a folha de confirmação do fiado ou do ajuste abre e não fecha, e a mensagem de erro (ex.: "Too small: expected string to have >=1 characters") aparece **atrás** da folha. Nada foi gravado.
  - O placeholder do Vencimento ("30/11/2026") parece um valor preenchido.
- **Limites da evidência:**
  - Um único Android físico; Ana, gerente, Bruno e dono no mesmo aparelho; 2º aparelho por HTTP.
  - **Reenvio sem duplicar após falha de rede em comando de gestão** não foi provocado na UI (esses comandos são recusados antes de persistir em modo avião); a idempotência da mesma chave está provada **só por HTTP**.
  - Ana e Bruno **não** foram conferidos no isolamento da filial na tela (corte de escopo MVP pedido pelo usuário); pela API, gerente e operador listam só a loja A.
  - "Sessão da filial não escreve na loja A" e o limite de 3 lojas ficaram em SKIP (a empresa tem 2 lojas e a seção rodou isolada).
  - Os totais "Vendido hoje" do dono incluem as vendas do script HTTP (mesmo operador).
  - Notificações de outros apps cobriram toques duas vezes; antes de repetir qualquer operação financeira, a tela foi conferida.
- **Operações financeiras na homologação (ordem):** 12:42 Ana abre turno (troco R$ 50); venda de 1 un R$ 10; venda offline de 1 un R$ 10; venda de 4 un R$ 40; ajuste +1 e devolução de 1 un pelo gerente; FIADO-1 (R$ 30, entrada R$ 10); recebimento de R$ 5 pela Ana; FIADO-2 (R$ 10); 14:19 o gerente abre turno (troco R$ 20); recebe R$ 5; estorna o próprio recebimento; estorna o recebimento da Ana; cancela FIADO-1 e FIADO-2. Os turnos da Ana (esperado R$ 125) e do gerente (esperado R$ 15) **ficaram abertos** de propósito. A única escrita da fase de CSV e lojas foi o produto da filial.
- **Estado do aparelho:** modo avião 0 (valor original); sem arquivos temporários (o zip do ZArchiver foi removido de `/sdcard`); perfil ativo "Gerente F14"; app, dados e demais apps preservados. Nenhuma outra configuração do sistema foi alterada.
- **Dados na homologação:** produtos, clientes, vendas e fiados "F14 …" e a filial "F14 Filial 11161554" (não há rota para excluir lojas; ela conta no limite de 3 do Pro). São descartáveis e ficam para auditoria. Sem segredos, tokens ou códigos neste registro.
- **Evidências:** `builds/b7-f14-gestao*.json` e `.csv`, `builds/pdv-ui-b7-*` (capturas e layouts sanitizados), `scripts/homologar-gestao.mts`.
- **Roadmap e roteiro:** F14 **PASS** (com os limites acima); os dois itens abertos de R4 marcados `[x]` com ressalva; o **aceite humano continua pendente**.
- **Pendências:** commit de `scripts/homologar-gestao.mts` e destes documentos (precisa de autorização); disputa entre dois Androids reais; corrigir os achados de UX da folha de confirmação e do carrinho reaberto; aceite humano.
- **Próximo passo:** decidir os achados de UX para a próxima versão e seguir para o próximo bloco do roteiro (F15, restauração de backup).

<a id="cp-20261116-149-prompts-simplificados-para-o-mvp-com-testes-automatizados"></a>

## CP 20261116 149 Prompts simplificados para o MVP, com testes automatizados

- **Data:** 16/11/2026, 16h41, America/Sao_Paulo.
- **Etapa:** planejamento do caminho até o piloto, depois do [CP 148](#cp-20261116-148-bloco-7-gestao-f14-no-samsung-e-na-api-com-segundo-aparelho-por-http). Pedido do usuário: simplificar para um MVP e construir testes automatizados para tudo o que for identificado.
- **Construído:** [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md) reescrito.
  - Os blocos 8 a 23 viraram **M1–M5 até o piloto**: testes automatizados e correções; falhas e restauração; pronto para o lojista; piloto no ar pelo teste interno da Play, sem cobrança; piloto e aceite.
  - Depois do piloto ficam **P1–P5**: cobrança na Play; publicação aberta; Mercado Pago; InfinitePay e Stone; encerramento.
  - As regras comuns caíram de 16 para 9. Entraram a regra "teste automatizado primeiro", com os níveis unitário, integração da API, script HTTP e fluxo do driver em `scripts/fluxos/`; o escopo MVP, que só corrige o que bloqueia o piloto; e a autorização de commit e push na branch atual ao fim de cada sessão.
  - Cada sessão traz o modelo recomendado.
- **Roadmap:** o backlog ganhou os itens cortados do MVP: F18 e layout, catálogo por EAN, F10 e relógio, F13 com dois Androids reais, e-mail por ambiente e execução real do F19. Nenhum checkbox foi marcado.
- **Limites:** somente documentação. Sem código, testes, commit, deploy ou ação em aparelho. A passagem do piloto para o teste interno da Play depende de o usuário criar o app no Console (M4).
- **Próximo passo:** sessão M1, em Opus 5.5: matriz de testes automatizados, testes que faltam no CI, fluxos do driver versionados e correção do modo avião do driver.

<a id="cp-20261116-150-m1-testes-automatizados-do-piloto-no-ci-e-0114-sem-aparelho"></a>

## CP 20261116 150 M1: testes automatizados do piloto no CI e 0.1.14 sem aparelho

- **Data e etapa:** 16/11/2026, 21h25 (America/Sao_Paulo). Sessão M1 de [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md). Segue o [CP 149](#cp-20261116-149-prompts-simplificados-para-o-mvp-com-testes-automatizados). Opus 5.5 orquestrou e revisou; a escrita foi feita por subagentes Sonnet 5.5.
- **Matriz:** [testes-automatizados-mvp.md](testes-automatizados-mvp.md). Tem 104 itens, levantados dos CPs 115, 129, 133, 138 e 142–148 e de F01–F17: **69 cobertos** (cada um com `arquivo::teste`), 13 automatizáveis ainda sem teste, 13 somente humanos, 8 no backlog e 1 que não se aplica.
- **Testes novos (validados localmente e no CI):**
  - API com PGlite local e PostgreSQL 17 no CI:
    - `pilotoCaixaValores` (F05–F07, 9 testes): esperado 250/100, total comercial 230, diferenças −5/0, fechamentos inconsistentes recusados;
    - `pilotoIsolamento` (F08, 9 testes): operador contra operador, empresa B contra A, sem token;
    - `pilotoTurnoDisputado` (F13, 10 testes): uma reserva em 4 concorrentes, consentimento, troca atômica, retorno, revogação;
    - `pilotoReenvio` (F09/F11, 14 testes): resposta perdida, reenvio, mesmo ID com conteúdo diferente, lote fora de ordem, autoria;
    - `pilotoGestaoConcorrente` (F14, 14 testes): baixa única, fiado, receptor, 12 recebimentos concorrentes sem saldo negativo, estornos em corrida, idempotência.
  - Mobile com SQLite:
    - `pilotoDurabilidade` (F09/F11, 6 testes);
    - `pilotoAtualizacao` (F12, 3 testes): migração com pendências de 3 perfis, sem envio com identidade de outro perfil;
    - `pilotoUxCp148` (10 testes).
  - CI, passo novo `HTTP homologation scenarios against local API`: `scripts/homologar-local.mjs` sobe uma API descartável (PGlite em memória, relógio de desenvolvimento) e roda `homologar-equipe.mts` (F08, `--f13`, `--troca-aparelho`) e `homologar-gestao.mts` (F14, 5 seções). No CI: F08 37 PASS/1 SKIP, F13 25/1, troca 23/1 e F14 162/4 SKIP, com 0 FAIL e 0 INCONCLUSIVO. Os SKIP são rotas /dev, limite de 3 lojas e relatório de outra loja pelo dono.
  - CI, passo novo `Android driver and flows (offline)`: 32 testes Python.
- **Fluxos do driver (construídos, validados só em `--simular`):**
  - `scripts/fluxos/`: abrir-caixa, vender, entrada, sangria, retirada, venda-offline, fechar-caixa e regressao, com README.
  - O comando `python scripts/regressao-aparelho.py --fisico` para no primeiro erro, sempre restaura a rede e grava o relatório em `builds/` sem número de série.
  - O driver ganhou `fluxo`, `--param`, `--simular`, `tap_inicia` e `tap_ultimo`.
  - **airplane (CP 145, item d):** `on` guarda o estado original e desliga modo avião, Wi-Fi e dados, e confere o offline por ping e `dumpsys connectivity`. `off` restaura exatamente o estado original.
- **Correções do CP 148 (runtime, 0.1.14/versionCode 15):**
  - Ao reabrir, o rascunho de venda já concluída é descartado e "Vender" começa vazio. O carrinho em andamento continua restaurado, e a venda e a fila não mudam.
  - O fiado valida antes de abrir a folha de confirmação e fecha a folha se houver erro.
  - O ajuste de estoque exige motivo, com mensagem em português.
  - O placeholder do vencimento passou a ser "dd/mm/aaaa".
  - Dois testes antigos que fixavam o comportamento anterior foram ajustados: `carrinhoDuravel.test.ts` e `fase1Dominio.test.ts`.
- **Commits e CI (validado externamente):**
  - Commits na branch `codex/pdv-homologacao-real`:
    - `d63a163`: correção do mobile e versão;
    - `728ebf4`: testes, CI, driver, fluxos e matriz;
    - `8a95a79`: ajuste de teste.
  - CI [43957549066](https://github.com/romulosutil/prisma-pdv-app/actions/runs/43957549066) em `728ebf4`: **FAIL**, preservado. No PostgreSQL, o teste "estorno repetido em corrida" supunha um vencedor fixo entre três IDs. A API gravou **um** estorno só, e o defeito era do teste, não financeiro. A asserção passou a aceitar qualquer vencedor único, e a exigência de um efeito só e da gaveta devolvida uma vez foi mantida.
  - CI [43959234268](https://github.com/romulosutil/prisma-pdv-app/actions/runs/43959234268), `workflow_dispatch` em `8a95a79`: **success**. Passaram tipos, ferramentas, driver offline, shared 172, API/PostgreSQL 17, cenários HTTP locais, mobile, imagem e isolamento. Deploy pulado.
- **Validação local:** typecheck dos três workspaces; API 599 em PGlite, em série (no CI com PostgreSQL são 658 casos, porque entram os testes exclusivos de PostgreSQL); o arquivo ajustado foi reexecutado com 14/14; mobile 620; shared 172; HTTP local 0 FAIL. Rodar em paralelo com outros processos causou 12 falhas por contenção no PGlite. Elas não se repetiram em série (`--maxWorkers=1`, como no CI).
- **Artefato:** `builds/pdv-homologacao-0.1.14.apk`, SHA256 `a677d562…fab15`. A verificação estática do build passou, com o host de homologação. **Não instalado:** nenhum aparelho estava conectado ao ADB durante a sessão.
- **Limites:**
  - Regressão no aparelho e efeito real do airplane no Samsung **não executados**. Os rótulos dos fluxos vêm do código e de capturas antigas e ainda não foram vistos ao vivo.
  - A simulação de encerramento forçado no mobile reabre o SQLite do Node; ela não prova `expo-sqlite` nem a morte do processo Android (fica para M2).
  - F13 continua sem dois Androids reais.
  - A concorrência real entre conexões só ocorre no PostgreSQL do CI, não no PGlite local.
- **Backlog gerado:**
  - Depois de reiniciar com uma venda recém-concluída, o carrinho abre vazio sem avisar qual foi a última venda. Mostrar "Última venda concluída" fica no backlog.
  - Criar a 3ª loja no passo HTTP do CI, para cobrir o limite de lojas e a escrita da filial.
  - Lacunas automatizáveis fora do M1, listadas na matriz: manifesto sem permissões (F01-g), lanterna sem câmera, fluxo do primeiro produto (CP 115), abertura offline recusada sem aviso (F11-g), mensagens de sangria e máscara do troco.
- **Pendências:** conectar o Android, instalar a 0.1.14 e rodar `python scripts/regressao-aparelho.py --fisico` (requer caixa fechado e sessão ativa), registrando o resultado. Aceite humano continua pendente.
- **Próximo passo:** regressão da 0.1.14 no aparelho assim que ele for conectado. Depois, sessão M2 (falhas e restauração).

## CP 20261116 151 M1: regressão da 0.1.14 aprovada no Samsung após ajustes dos fluxos

- **Data e etapa:** 16/11/2026, 21h50 (America/Sao_Paulo). Sessão M1, continuação do [CP 150](#cp-20261116-150-m1-testes-automatizados-do-piloto-no-ci-e-0114-sem-aparelho). Execução no aparelho conduzida pelo agente via ADB, sem toque humano.
- **Aparelho:** samsung SM-S938B, Android 17 (SDK 37), físico, 1440x3120. Pacote `br.com.pdv.mobile.homologacao`, loja de homologação "Loja Bloco 6 A", perfil Gerente.
- **Instalação (validado no aparelho):** `adb install -r builds/pdv-homologacao-0.1.14.apk` → `Success`; antes 0.1.13/versionCode 14, depois **0.1.14/versionCode 15**. SHA256 do APK `a677d562…fab15`, igual ao CP 150. Dados preservados (13 vendas locais, fila 0 aguardando/0 em revisão).
- **Caixa deixado aberto pelo CP 148:** aberto às 14:19, troco R$ 20, 1 venda fiado R$ 10, recebimento de fiado R$ 5 e dois estornos de R$ 5; esperado R$ 15. Com autorização do usuário nesta sessão, fechado contando R$ 15 ("Bateu certinho"); venda e fiado mantidos.
- **Regressão completa (validado no aparelho):** `python scripts/regressao-aparelho.py --fisico` → **PASS, 111/111 passos**, 21:38–21:48. Relatório `builds/regressao-regressao-20261116-214819.json` (SHA256 `c7ad2e2c…65a6`, sem número de série). Sequência e valores conferidos na tela:
  - abrir caixa com troco R$ 100;
  - venda avulsa R$ 50 em dinheiro, "Venda concluída", "Pago", dinheiro vendido R$ 50;
  - suprimento R$ 20 (esperado 150 → 170), sangria R$ 15 (170 → 155) e retirada R$ 5 (155 → 150), cada um com origem/destino e motivo;
  - **offline real:** estado original salvo (avião desligado, Wi-Fi e dados ligados); `airplane on` desligou Wi-Fi e dados e confirmou `ping_ok=false` e `rede_ativa=false` para o host de homologação; venda R$ 30 em dinheiro concluída offline; app encerrado e reaberto ainda offline com dinheiro vendido R$ 80 preservado;
  - `airplane off` restaurou o estado original e confirmou `ping_ok=true`; Sincronizar → "Dados confirmados no servidor", sem "aguardando envio" nem "revisão";
  - fechar caixa com esperado **R$ 180** (100 + 50 + 20 − 15 − 5 + 30), contado R$ 180, "Bateu certinho", "Caixa fechado".
- **Estado final do aparelho:** modo avião 0, Wi-Fi 1, dados 1 (iguais ao início); caixa de teste fechado; 0.1.14 instalada. Nenhuma outra configuração alterada.
- **Ajustes nos fluxos e no driver (construídos; validados no aparelho pela regressão acima e por 43 testes offline do driver, 11 novos):** as rodadas anteriores falharam por suposições dos fluxos, não por defeito do app:
  - a aba Caixa reabre na última seção visitada: todo toque em "Caixa" agora é seguido de "Resumo";
  - em tela grande, botões e valores ficam abaixo da dobra: `tap` e `assert` rolam a lista para baixo e de volta ao topo antes de falhar, esperando a rolagem parar antes de tocar;
  - "Nova venda" abre o leitor sem as abas: o fluxo `vender` fecha o leitor ("Fechar");
  - o caixa auditado exige categoria, origem/destino e motivo em suprimento, sangria e retirada: os fluxos preenchem os campos;
  - `text` passou a localizar o campo rolando, tocar o centro e usar `input text` (aceita rótulos acentuados; recusa valores acentuados) e fecha o teclado do sistema só quando ele está aberto;
  - o relatório passa a dizer "nada a restaurar" quando o próprio fluxo já restaurou a rede.
- **Rodadas que falharam (preservadas em `builds/`):**
  - `regressao-fechar-caixa-20261116-211413` e `-211614`: "Fechar caixa" fora da tela (seção Sincronização lembrada). Nenhuma operação feita.
  - `regressao-regressao-20261116-211941`: a tela de dinheiro continuou visível depois de "Confirmar recebimento". **Conferido antes de qualquer repetição:** a venda #000014 (R$ 50, dinheiro, 21:20) foi gravada **uma vez**; dinheiro vendido R$ 50 e 2 vendas no dia (a outra é o fiado de R$ 10). Os toques seguintes, inclusive um toque extra enviado por engano pelo agente durante o diagnóstico, não criaram venda. A tela de sucesso só apareceu 1–3 minutos depois. **Não se repetiu** nas três vendas seguintes (rodadas 2 e 4). Caixa fechado com R$ 150 conferidos.
  - `regressao-regressao-20261116-212820`: "Caixa" ausente na tela do leitor depois de "Nova venda". Caixa fechado com R$ 150.
  - `regressao-regressao-20261116-213451`: suprimento recusado com "Informe categoria, origem/destino e motivo." **Nada gravado** (o fechamento seguinte esperava R$ 150, sem os R$ 20).
- **Achados para o backlog (não bloqueiam o piloto):**
  - Em suprimento, sangria e retirada, os campos obrigatórios ficam abaixo do teclado numérico; no S25 o erro aparece junto do valor sem nenhum campo visível. A categoria aparece como código interno (`reforco_troco`).
  - Observar em M2 a demora de 1–3 min entre a venda gravada e a tela "Venda concluída" vista uma vez (sem duplicidade financeira).
- **Limites:** uma execução completa num único aparelho; o atraso da tela de sucesso não foi reproduzido nem explicado; a regressão não cobre fiado, estoque nem troca de aparelho (cobertos por testes de API/HTTP no CI). Aceite humano continua pendente.
- **Commit e CI (validado externamente):** `b650995` na branch `codex/pdv-homologacao-real`; CI [43990950369](https://github.com/romulosutil/prisma-pdv-app/actions/runs/43990950369) (`workflow_dispatch`): **success**. Passaram tipos, driver offline (43), shared, API/PostgreSQL 17, cenários HTTP locais, mobile, imagem e isolamento; deploy pulado. Item M1 do roadmap marcado como concluído.
- **Pendências:** aceite humano do piloto; itens de backlog acima.
- **Próximo passo:** sessão M2 (falhas e restauração).

<a id="cp-20261116-152-m2-falhas-no-aparelho-restauracao-f15-e-retorno-f19-documentado"></a>

## CP 20261116 152 M2: falhas no aparelho, restauração F15 e retorno F19 documentado

- **Data e etapa:** de 16/11/2026, 22h05, a 17/11/2026, 11h35 (America/Sao_Paulo). Sessão M2 de [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md). Segue o [CP 151](#cp-20261116-151-m1-regressao-da-0114-aprovada-no-samsung-apos-ajustes-dos-fluxos). Opus 5.5 conduziu o aparelho e o servidor; a reprodução, o teste de regressão e a correção do defeito foram escritos por subagentes Sonnet 5.5 e revisados.
- **Aparelho:** samsung SM-S938B, Android 17 (SDK 37), físico, por ADB. Pacote `br.com.pdv.mobile.homologacao`, "Loja Bloco 6 A", perfil Gerente. Estado final: modo avião 0, Wi-Fi 1 e dados 1, iguais ao início; 0.1.16 instalada limpa; caixa de teste fechado; fila 0/0.
- **F09 (validado no aparelho, 0.1.14): PASS.**
  - Venda de R$ 40 em "Dividir pagamento": a primeira parte, de R$ 20 em dinheiro, foi paga e o app encerrado à força em seguida.
  - Ao reabrir, a cobrança mostrou "Já recebido 20 de 40" uma vez.
  - A segunda parte, de R$ 20, concluiu a venda, e o app foi encerrado logo depois.
  - Resultado: uma venda só, #000019 com 2 parcelas, total do dia R$ 280 em 7 vendas e carrinho vazio. Confirmada no servidor.
- **F11 (validado no aparelho): PASS na 0.1.16.**
  - Turno reservado online com troco de R$ 100. Venda offline de R$ 25 sobreviveu ao encerramento forçado e ao **reinício completo do aparelho** (75 s até o boot), ainda offline: R$ 305 em 8 vendas.
  - **Rede intermitente:** três quedas e retornos do avião, Wi-Fi e dados durante a sincronização. Resultado: "Dados confirmados no servidor", 0 aguardando, 0 em revisão, e as vendas #000020 (R$ 25) e #000021 (R$ 5) aparecem uma vez cada.
  - Fechamento offline na 0.1.16 depois de abertura a frio: "Fechamento salvo neste aparelho e pendente de confirmação". Uma nova abertura offline foi recusada com "Sincronize as operações e o fechamento anterior antes de abrir outro turno.". Online, tudo foi confirmado, e um turno novo abriu e fechou (R$ 100/100).
- **Defeito encontrado e corrigido (bloqueava o fluxo principal offline e havia risco de perda local):**
  - **Sintoma na 0.1.14:** fechar o caixa offline depois de reabrir o app falhava sempre com "Não foi possível fechar o caixa. Tente de novo.".
  - **0.1.15 (versionCode 16):** passou a mostrar o motivo e a registrá-lo no diagnóstico (`mensagemDaFalhaAoFechar`). O motivo era "Caixa fechado não pode ser removido.".
  - **Causa:** `CaixaRepo` e `VendasRepo` filtram na memória os itens de outros operadores quando `conferirOutros()` é falso. Em `Dados.iniciar()`, os dados da loja eram carregados antes do acesso offline, então `pode()` retornava falso naquele instante. A gravação seguinte salvava a lista filtrada:
    - nos caixas, a trava do SQLite recusava a gravação;
    - nas vendas, a gravação apaga e reinsere todas e `alterar` enfileira `delete`. Um cancelamento offline apagaria localmente as vendas de outros operadores e mandaria exclusões ao servidor. Isso não ocorreu no aparelho: foi encontrado na análise e reproduzido em teste.
  - **Correção na 0.1.16 (versionCode 17):**
    - `Persistido.paraGravar`: as gravações preservam os itens ocultos;
    - `Dados.iniciar` recarrega vendas e caixas depois do acesso offline.
  - Uma tentativa de reproduzir só no Node, com 8 casos, não reproduziu o defeito. Faltava a partição do Gerente conter caixas de outro operador. Esses casos ficaram como regressão.
- **F12 (validado no aparelho): PASS parcial.**
  - 0.1.14 → 0.1.15 com 2 vendas pendentes offline.
  - 0.1.15 → 0.1.16 com 1 venda pendente.
  - Reinstalação da 0.1.16 (`install -r`, mesmo versionCode) com venda e fechamento pendentes (2 aguardando).
  - Em todas: contagens, valores e caixa preservados, enviados uma vez ao voltar a rede.
  - **Limite:** um perfil só; comando de gestão pendente só no CI (`pilotoAtualizacao`).
- **F15 (validado externamente, servidor de homologação, com confirmação do usuário): PASS.**
  - **Backup:** `pdv-m2-f15-restauracao-20261116`, arquivo `aladdin/pdv-postgres-homologacao/2026-11-17T01:26:57.786Z.sql.gz`, 44,2 kB, Success às 01:26:58 UTC (22h26 BRT), em 1 s. O aparelho estava offline, sem escritas.
  - **Destino:** serviço novo `aladdin/pdv-postgres-restauracao-r5`, PostgreSQL 17.12, banco e usuário `pdv_homologacao`, credencial própria gerada pelo painel, porta exposta 0, sem API apontada e **0 tabelas** antes da restauração. Restaurado só nele, Success às 01:31:27 UTC.
  - **Comparação:** `verificar-restauracao-r5.sql` nos dois bancos (`psql -X -v ON_ERROR_STOP=1`, leitura em transação). `node scripts/comparar-restauracao.mjs` → **PASS, 39 verificações**: 30 tabelas, 592 registros, dataset `a1126073c8cb470d3f34aaae00a2f295`, schema, sequências, financeiro (29 vendas, R$ 759,00; pagamentos R$ 707,00; 18 caixas) e integridade 0. Snapshots `builds/r5-m2-origem.txt` e `builds/r5-m2-restaurado.txt` (SHA-256 iguais, `35dceb6f…8df6`) e `builds/r5-m2-restauracao.json`.
  - **Falso alarme corrigido:** a primeira rodada acusou 2 tabelas diferentes (`drizzle.__drizzle_migrations` e `public.mudancas`) com as mesmas contagens. Causa: a ordenação textual do checksum dependia da collation (origem C, destino `en_US.utf8`). Com `COLLATE "C"` os hashes ficaram iguais aos da origem. O script foi corrigido e coberto por teste, e a origem foi recoletada com o script novo, idêntica ao snapshot do backup.
  - **Encerramento:** serviço temporário parado ("database system is shut down"), volume preservado. Produção, homologação e o volume r0 não foram alterados.
  - **Tempo gasto:** cerca de 19 min entre o backup e o PASS, incluindo a investigação da collation. Sem ela, cerca de 8 min.
  - **Observações:**
    - o agendamento diário de backup continua sem execuções automáticas no log (último automático há 7 dias), mesmo achado do CP 107;
    - um clique fora do alvo levou a aba ao painel do `pdv-api-homologacao`, e o texto digitado caiu no visualizador de logs, que é somente leitura. O histórico de ações do painel mostra só o backup e a restauração, nenhuma ação na API, e `/saude` respondeu 200.
- **Reinstalação limpa (validado no aparelho): PASS.**
  - Com a fila em 0/0, o app foi desinstalado com autorização do usuário e a 0.1.16 instalada limpa. O Play Protect pediu verificação; o usuário respondeu no aparelho.
  - Login autorizado pelo usuário ("Faça você"), com a caixa mail.tm descartável do perfil Gerente (CP 148). O código foi digitado pelo auxiliar, sem aparecer na conversa nem em arquivos.
  - Recuperado: 22 vendas no aparelho, lista de 7 dias com 19 vendas, R$ 670 e 3 canceladas, igual à anterior. As vendas #000019 a #000022 têm o mesmo número, horário, valor, itens, parcelas e caixa vinculado `01a1e70c…71b2` da referência `builds/m2-referencia-antes-reinstalar.json`. Ficaram 0 aguardando e 0 em revisão.
- **F19:** retorno documentado em [f19-retorno-api.md](f19-retorno-api.md), **sem execução**. Atual `84dd0dc`; o código da API não mudou até o HEAD. Alvo `df41823`, com as mesmas 13 migrações: não há migração reversa, mas cadastro novo com a verificação antecipada fica indisponível. Estimativa de 25 a 35 min, ou de 45 a 65 min com ensaio na cópia restaurada.
- **Testes novos (regra 5):**
  - `apps/mobile/test/pilotoFechamentoOffline.test.ts`: 12 casos com `Dados` real sobre SQLite e a API local. (a)–(h) cobrem fechamento offline com variações e (i)–(k) os três defeitos do Gerente com dados de outro operador; esses três falharam antes da correção.
  - `apps/mobile/test/caixaLogica.test.ts::mensagemDaFalhaAoFechar`.
  - `scripts/test/operacao.test.mjs::snapshot de restauração ordena texto com COLLATE "C"`, que falha com o script antigo.
  - `scripts/test/test_pdv_android_ui.py::test_email_de_teste_com_arroba_e_digitado`: o `text` do driver recusava `@`, defeito da ferramenta encontrado no login.
  - Matriz [testes-automatizados-mvp.md](testes-automatizados-mvp.md) com M2-a a M2-e e F15-b/F15-d.
- **Validação local:** typecheck mobile sem erros; suíte mobile completa em série **77 arquivos, 634/634**; ferramentas operacionais 3/3; driver 44 testes OK.
- **Artefatos:**
  - `builds/pdv-homologacao-0.1.15.apk`, SHA256 `f6536389b5667a37d5a26babb0f32b2ffb4f26e560e5059dc16b5d6c89a28696`.
  - `builds/pdv-homologacao-0.1.16.apk`, SHA256 `d07f9a858cc0a392744b3f4a29a0a8a6ff6bce17f1f5a5c4330dac2d07d060f7`.
  - As duas passaram na verificação estática do build com o host de homologação e a mesma assinatura de teste.
- **Achados para o backlog:** texto literal "[nome]" no topo da tela de boas-vindas da instalação nova; o agendamento de backup sem execução automática (já no backlog operacional).
- **Limites:** um aparelho e um perfil; F12 sem comando de gestão pendente no aparelho; F19 não executado; aceite humano pendente.
- **Commit e CI (validado externamente):** `77bff7b` (correção e 0.1.16) e `f50bd4d` (testes, scripts e documentos) na branch `codex/pdv-homologacao-real`; CI [44103845990](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44103845990) (`workflow_dispatch`): **success**. "Types, tests and container" aprovado; deploy pulado. Nenhum deploy ou alteração de produção.
- **Próximo passo:** sessão M3 (pronto para o lojista).

<a id="cp-20261117-153-m3-dependencias-decididas-suporte-privacidade-e-monitoramento"></a>

## CP 20261117 153 M3: dependências decididas, suporte e privacidade com URLs públicas, F16/F17 com testes e monitoramento diário

- **Data e etapa:** 17/11/2026 (America/Sao_Paulo). Sessão M3 de [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md), "Pronto para o lojista". Segue o [CP 152](#cp-20261116-152-m2-falhas-no-aparelho-restauracao-f15-e-retorno-f19-documentado). Subagentes Sonnet 5.5 escreveram código e testes; o orquestrador revisou o diff, conferiu as URLs por HTTP local e gerou o APK.
- **1. Dependências (validado localmente): decidido, sem atualização.**
  - `npm audit` (todas as workspaces): 13 avisos, 0 críticos, **3 altos**, 10 moderados. Só produção (`--omit=dev`): 9 (3 altos, 6 moderados).
  - `scripts/verificar-alcance-audit.mjs` com o mapa do bundle 0.1.16 (1.892 fontes) e 86 pacotes de produção da API/shared: **PASS, zero avisos alcançáveis**.
  - Altos: `node-forge` 1.4.0 e `@expo/cli` 58.1.15 (ferramentas Expo/CLI, fora do bundle e da API) e `zod` 3.25.76 aninhado em `@expo/cli` (a API e o shared usam zod 4.6.7, não afetado). Correção não-major existe (`npm audit fix`), **não aplicada**: não alcançam o runtime e a regra do bloco é corrigir só alto/crítico alcançável.
  - Moderados, todos de ferramentas: `glob`, `minimatch` e pacotes `@expo/*` herdados; `esbuild` e `@esbuild-kit/*` via `drizzle-kit` (CLI de migração; a correção é versão principal 0.18.1, **precisa de confirmação**, não aplicada).
  - Limite: análise do lock e do grafo JS; não cobre imagem base, bibliotecas nativas, Gradle nem SO. Não declara o `npm audit` global limpo. Evidências: `builds/m3-audit-completo.json`, `m3-audit-runtime.json`, `m3-audit-alcance.json` (ignoradas pelo git).
- **2. Responsável pelo suporte (decisão do usuário, registrada sem dados pessoais):** o **dono do produto** atende os protocolos e roda o [monitoramento diário](monitoramento-piloto.md); substituto **a definir**. Canal público: **contato@prumo.services** (contato comercial informado pelo usuário, que pediu o mínimo: "entre em contato por e-mail", sem telas robustas).
- **4. Privacidade e exclusão de conta (Play): construído e validado localmente, não implantado.**
  - Antes: nenhuma URL pública; políticas só dentro do app.
  - API: `GET /privacidade`, `/exclusao-de-conta` e `/termos` em `apps/api/src/rotas/paginasPublicas.ts`, HTML estático sem JS nem recursos externos, sem login, também em produção. Texto vindo de `POLITICAS_PILOTO` (fonte única, escapado), com contato por e-mail e versão `2026-11-02` (não mudou; o schema continua compatível com apps antigos). `/exclusao-de-conta` traz o caminho no app (Ajustes > Suporte e privacidade > aba "Exclusão"), o e-mail a partir do cadastro e o que acontece e o que é retido, sem prazos novos.
  - App: seção "Contato" na tela de Suporte (acessível sem sessão) com o e-mail e dois botões, "Abrir política de privacidade no site" e "Abrir exclusão de conta no site" (usam `extra.apiUrl`; sem URL no modo demo, só o texto).
  - **HTTP real local** (API local descartável, `curl`): as três páginas 200 `text/html; charset=utf-8` com o contato; `/suporte/solicitacoes` continua 401.
  - **Pendência para "URL pública funcionando":** as rotas **ainda não estão no servidor de homologação nem no de produção**. A conferência externa depende de deploy, que exige autorização explícita. `scripts/verificar-operacao.mjs` já confere essas páginas e falha até o deploy.
  - **Para a ficha da Play (M4):** a página de exclusão deve citar o nome do app e do desenvolvedor; o nome do desenvolvedor não está no repositório e precisa ser informado pelo usuário.
- **5. Monitoramento diário (documentado, ainda não executado em produção):** [monitoramento-piloto.md](monitoramento-piloto.md) (API, páginas públicas, e-mail, filas de suporte, backup, registro) e [diario-piloto.md](diario-piloto.md). `verificar-operacao.mjs` virou função testável e confere as páginas públicas; `verificar-operacao.sql` ganhou contagens e idades de e-mail e suporte, só leitura, sem dados pessoais. Sem alertas e sem cópia externa (backlog, decisão de 01/11/2026). Achado conhecido mantido: o log automático de backup não aparece (CPs 107 e 152).
- **3. F16 e F17: testes automatizados escritos e aprovados; aparelho PENDENTE.**
  - Novos: `apps/mobile/test/pilotoSuporteExportacao.test.ts` (11), `pilotoSuporteExportacaoTela.test.ts` (4), `apps/api/test/pilotoSuporteExportacao.test.ts` (4), `apps/api/test/paginasPublicas.test.ts` (6) e 3 casos em `suporteTela.test.ts`. Cobrem destino de compartilhamento indisponível, JSON exportado sem credenciais e sem pendências, nome e mime, arquivo de pendências separado, expiração exata de 1 h (59 min fica, 60 min apaga) e limpeza antes de criar, exclusão sem alterar vendas/estoque/caixa/equipe, protocolo invisível ao dono e a outro operador, resposta manual após atualizar e resumo técnico de schema fechado.
  - Fluxos do driver versionados em `scripts/fluxos/`: `suporte.json`, `suporte-envio.json` e `exportar-json.json` (sob demanda, fora da regressão), com a ação nova `back_sistema` e o passo condicional `"se"`. Validados só offline (`--simular`).
  - Matriz [testes-automatizados-mvp.md](testes-automatizados-mvp.md) atualizada (118 itens recontados).
  - **Execução no aparelho: não feita.** O Samsung deixou de aparecer no ADB (`adb devices` vazio, duas tentativas) depois de gerar o APK. F16 (envio de suporte, políticas sem sessão, exclusão, resposta manual na tela) e F17 (JSON no destino por `adb pull`, expiração real de 1 h no cache, limpeza e seletor real) seguem **PENDENTES**.
- **APK 0.1.17 (versionCode 18), construído, não instalado:** `builds/pdv-homologacao-0.1.17.apk`, SHA256 `bb4c01c1ee6448b77af80a034a368017c1a2a0e4c1f2e066964dfb5bbafd49b3`, API de homologação, 1.892 fontes, verificação estática PASS, assinatura v2 do certificado de teste anterior (atualiza por cima). Manifesto: Android físico e aceite pendentes.
- **Validação local (subagentes, revisada):** typecheck dos 3 workspaces sem erros; API 609 testes (série, 53 arquivos), mobile 652 (79 arquivos), shared 172, ferramentas operacionais 9/9, driver 53. Na rodada paralela padrão a API teve timeouts do PGlite por carga, repetida em série sem falhas.
- **Commit (construído):** `39fdb4f` na branch `codex/pdv-homologacao-real`, enviado ao remoto. **CI não executado:** o disparo manual do workflow foi negado pelo controle de permissões da sessão, então o resultado externo do CI para este commit está pendente. Sem deploy nem alteração de produção.
- **Limites:** nada implantado; URLs públicas só vistas localmente; F16/F17 no aparelho pendentes; dependências de ferramentas e análise nativa continuam sem remediação; aceite humano pendente.
- **Próximo passo:** com autorização do usuário, implantar a API em homologação e conferir `verificar-operacao.mjs`; reconectar o aparelho, instalar a 0.1.17 e rodar `suporte`, `suporte-envio` e `exportar-json` para fechar F16/F17; depois M4.

## CP 154 — M3: CI externo aprovado para o commit do CP 153 (17/11/2026)

- **Referência:** corrige a pendência "CI não executado" do [CP 153](#cp-20261117-153-m3-dependencias-decididas-suporte-privacidade-e-monitoramento).
- **Validado externamente:** CI [44142077737](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44142077737) (`workflow_dispatch`, autorizado pelo usuário nesta sessão) em `59fed5a` (inclui `39fdb4f`): **success**. "Types, tests and container" aprovado (typecheck, ferramentas operacionais, driver Android offline, shared, API com PostgreSQL, cenários HTTP locais, mobile, imagem Docker); job de deploy **pulado** por desenho (só roda em push na `main`).
- **Deploy de homologação: não feito.** O usuário autorizou o deploy da API em homologação, mas esta sessão não tem conector do EasyPanel e o workflow só implanta em push na `main` (alcançaria a produção, fora da autorização). Homologação e produção seguem sem as rotas `/privacidade`, `/exclusao-de-conta` e `/termos`; "URLs públicas funcionando" continua só validado localmente.
- **Pendências:** implantar `pdv-api-homologacao` pelo painel (backup antes, como nos CPs anteriores; a autorização vale para homologação, não para produção) e rodar `node scripts/verificar-operacao.mjs <origem-homologação>`; F16/F17 no aparelho; nome do desenvolvedor para a ficha da Play.
- **Próximo passo:** deploy de homologação pelo painel e conferência externa; depois aparelho e M4.


## CP 155 — M3: homologação implantada, páginas públicas confirmadas e F16/F17 no aparelho (17/11/2026)

- **Referência:** continua o [CP 153](#cp-20261117-153-m3-dependencias-decididas-suporte-privacidade-e-monitoramento) e o CP 154; corrige a pendência "deploy de homologação não feito" do CP 154. O usuário autorizou nesta sessão: CI, deploy da API em **homologação** (EasyPanel no Chrome, login feito pelo usuário) e a execução de F16/F17 no Samsung. Produção não foi tocada.
- **Deploy (validado externamente):** backup `pdv-pre-paginas-publicas-20261117` do `pdv-postgres-homologacao` (Success) e, em seguida, deploy só do `pdv-api-homologacao` (fonte inalterada: `romulosutil/prisma-pdv-app`, ramo `codex/pdv-homologacao-real`, Dockerfile da raiz). Sem migração nem mudança de schema nesta versão (só rotas novas). `node scripts/verificar-operacao.mjs https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host`: **PASS** nos 7 casos (`/saude` 200, `/dev/relogio/avancar` 404, `/suporte/solicitacoes` e `/suporte/exportacao` 401, `/privacidade`, `/exclusao-de-conta` e `/termos` 200, `text/html; charset=utf-8`, `cache-control: public, max-age=300`, `nosniff`). Evidência: `builds/operacao-homologacao-20261117.json` (ignorado pelo git). **As URLs públicas funcionam em homologação; a produção ainda não tem as rotas** (a ficha da Play deve usar o host de produção só depois de implantá-la lá).
- **Aparelho (validado no físico, parcial):** Samsung SM-S938B por depuração sem fio. APK 0.1.17/versionCode 18 instalado por cima da 0.1.16 (`adb install -r`, hash conferido `bb4c01c1…49b3`, dados e sessão preservados). O Play Protect abriu "Enviar o app para uma verificação de segurança?" e travou a instalação até ser fechado com Voltar (equivale a não enviar): numa próxima instalação isso exige uma pessoa.
  - `suporte.json` **PASS** (14 passos); `suporte-envio.json --param incluir_resumo=1` **PASS** (11 passos; protocolo registrado e "Aguardando análise da equipe."; criou **1 protocolo de teste real** na conta de homologação, ainda aberto: aparecerá em `suporte_aberto_mais_24h` do monitoramento até ser respondido); `exportar-json.json` **PASS** (11 passos; repetido depois do ajuste abaixo, também PASS).
  - **F16 parcial:** não exercitados no aparelho: políticas com o app deslogado, resposta manual aparecendo após atualizar e visão de outro perfil (seguem só em teste automatizado).
  - **F17 parcial:** não comprovados no aparelho: conteúdo do JSON no destino (o seletor oferece só contatos e apps de mensagem, sem "Salvar em arquivo"; escolher qualquer um enviaria dados da loja a terceiros) e expiração/limpeza real de 1 h (APK release não depurável, relógio não alterado). Esses itens ficam cobertos por `apps/mobile/test/pilotoSuporteExportacao.test.ts`.
- **Correções de ferramenta (validadas localmente e no aparelho):** (1) `suporte-envio.json` terminava dentro de "Suporte e privacidade" e `exportar-json.json` falhava no primeiro passo ("Ajustes" ausente); agora termina voltando para Ajustes (esse trecho final só foi validado offline, pois repetir o envio criaria outro protocolo). (2) O snapshot do seletor de compartilhamento gravava nomes de contatos do usuário em `builds/`; a nova ação `snapshot_sistema` grava só a contagem de nós (validada no aparelho). O arquivo anterior foi anonimizado e uma captura de tela com notificação pessoal, feita durante a investigação, foi apagada. Testes do driver: 55 passam (`python -B -m unittest discover -s scripts/test -p "test_*.py"`); `--simular` dos três fluxos OK.
- **Achado novo, causa não determinada:** ao voltar o app ao primeiro plano (reproduzido também depois do deploy), aparece o toast "Não foi possível atualizar a licença. Seus registros continuam guardados." O app permanece Online. O toast só dispara quando `AssinaturaServico.sincronizar()` lança um erro que **não** é `ErroBackend` (`apps/mobile/app/_layout.tsx:137`, `apps/mobile/src/servicos/assinatura.ts:75`), por exemplo falha de validação da resposta de `GET /assinatura`; a rota existe e responde 401 sem sessão. Sem logs do app em release, a causa não foi determinada; pendência: ler o diagnóstico do app ou reproduzir com a conta de teste. Não bloqueia F16/F17.
- **Limites:** nada em produção; CI [44150903766](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44150903766) (`workflow_dispatch`) em `d4443a5`: **success** (validação externa; job de deploy pulado por desenho); sem aprovação humana; checkboxes do roadmap não marcados.
- **Próximo passo:** implantar a API em produção só com autorização explícita e rodar `verificar-operacao.mjs` lá; investigar o toast de licença; fechar os itens F16/F17 que exigem pessoa (deslogado, resposta manual, destino do JSON); nome do desenvolvedor para a ficha da Play; M4.


## CP 156 — M4: produção reconciliada e implantada, e AAB com chave de upload (17/11/2026)

- **Referência:** M4 de [prompts por sessão](prompts-sessoes-entrega.md); continua o [CP 155](#cp-155-m3-homologacao-implantada-paginas-publicas-confirmadas-e-f16f17-no-aparelho-17112026) e o [CP 101](#cp-20261110-101-google-play-planos-e-integracoes-definidos).
- **Decisões do usuário (17/11):** piloto na **API de produção**, com 1 a 3 lojistas. Os e-mails dos testadores vão direto para o Play Console e não ficam no repositório. Cobrança desligada. Conta de desenvolvedor Play já existente. AAB assinado com chave de upload local, fora do repositório: criada pelo usuário com `keytool` em pasta pessoal e mantida por ele.
- **Achado (lido na produção por console somente leitura):** o `pdv-postgres` (banco `pdv`, 0 contas) tinha sido migrado pelo `main` (`1cd184f`, ramo `codex/pdv-deploy`), inclusive as migrações de estoque 0008/0009 do `main` (hashes `3385f917edfb…`, `c4e8c2a3333a…`).
  - As migrações 0008–0011 desta branch têm `when` menor. O migrator do drizzle aplica só o que for mais novo que a última linha gravada, então um deploy direto as pularia em silêncio e a API subiria sem `usuarios` nem `auditoria_caixa`.
  - As migrações 0000–0007 são iguais nas duas branches. A diferença de hash vista no Windows vem só do CRLF.
- **Construído:**
  - `scripts/reconciliar-migracoes-producao.sql`: transacional e idempotente, com travas para nome do banco, histórico exato, hashes completos e ausência de dado nas colunas do `main`. Remove as duas linhas do `main` e as três colunas e o índice órfãos.
  - `apps/api/test/reconciliarMigracoesProducao.test.ts`, com fixtures do `main`: reproduz o estado de produção, prova o defeito, verifica que o schema fica igual ao de um banco novo e testa idempotência e travas. Commit `f2fb3bc`.
  - `scripts/build-android.ps1 -Aab`: `bundleRelease` assinado com chave de upload externa. As senhas são pedidas por prompt e só passam pelo ambiente do processo. Confere certificado, pacote, versionCode e targetSdk (bundletool) e o bundle JS do AAB, e deriva um APK universal assinado com debug, só para aparelho de teste. Commit `245fb94`.
- **Validado:**
  - **Local:** teste de reconciliação 6/6 (PGlite) e typecheck da API.
  - **AAB de homologação** com chave descartável: assinatura conferida, targetSdk 36, minSdk 24, versionCode 18; APK universal verificado. Os artefatos ficam em `builds/`, ignorado pelo git.
  - **CI externo** [44189918293](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44189918293) em `f2fb3bc`: **success**. O teste rodou com PostgreSQL real (6 testes).
- **Produção (validado externamente; cada etapa autorizada pelo usuário nesta sessão):**
  1. backup `pdv-pre-m4-reconciliacao-20261117` do `pdv-postgres`: Success;
  2. reconciliação aplicada pelo console (sha256 do arquivo conferido: `0577724cc1404605…`; NOTICE de conclusão; histórico com 8 linhas; colunas do `main` ausentes);
  3. `codex/pdv-deploy` movido de `1cd184f` para `f2fb3bc` (`--force-with-lease`) e deploy do `pdv-api`;
  4. saúde conferida: `verificar-operacao.mjs` **8/8 PASS** (`builds/operacao-producao-20261117.json`), `/auth/cadastro/configuracao` com verificação antecipada e `x-pdv-agora` presente. No banco, 13 migrações aplicadas (0008–0012 desta branch), tabelas `usuarios`, `auditoria_caixa` e `movimentos_estoque` presentes e 0 contas.
- **Procedimento de retorno:** restaurar o backup `pdv-pre-m4-reconciliacao-20261117` pelo painel do `pdv-postgres`, mover `codex/pdv-deploy` de volta para `1cd184f` e implantar o `pdv-api`. Sem dados reais na produção hoje, o retorno não perde nada. Depois que os lojistas cadastrarem dados, o retorno passa a exigir novo backup e decisão do usuário. Não foi executado.
- **Regras da Play (documentação oficial, 17/11):**
  - targetSdk 36 é exigido para apps novos.
  - O teste interno aceita até 100 testadores e não passa pela revisão padrão. O link de opt-in pode levar algumas horas no primeiro envio.
  - A regra de 12 testadores por 14 dias vale só para o acesso à produção.
  - App novo entra automaticamente no Play App Signing.
  - Exclusão de conta exige caminho no app e URL pública.
  - A verificação de desenvolvedor no Brasil vale desde 30/09/2026; para quem publica na Play, o pacote é registrado automaticamente.
- **Pendências:** AAB de produção (exige que o usuário digite as senhas da chave); Samsung conectado ao ADB para o APK universal e os fluxos de M1; ações do usuário no Play Console; confirmação com um testador. O toast de licença do CP 155 continua sem causa determinada.
- **Próximo passo:** gerar o AAB de produção no terminal do usuário, rodar os fluxos de M1 no aparelho, seguir o roteiro do Console e confirmar a instalação pela Play com um lojista.


## CP 157 — M4: versão 0.1.18 de produção conferida no Samsung, pronta para o teste interno (17/11/2026)

- **Referência:** continua o [CP 156](#cp-156-m4-producao-reconciliada-e-implantada-e-aab-com-chave-de-upload-17112026).
- **Pedido do usuário no aparelho (0.1.17):**
  - o teclado escondia o campo focado;
  - o código de confirmação devia ser uma etapa própria;
  - "Já tenho conta" devia sair da tela do nome da loja;
  - a tela de meios de recebimento é só informativa: tudo vem ativo e a conferência é manual.

  Achado nosso: o "[nome]" provisório aparecia na tela de boas-vindas.
- **Construído:** commit `8ab08c3`, versão **0.1.18 / versionCode 19**.
  - `TelaBase` com `KeyboardAvoidingView` em `padding`.
  - Etapa do código em `criar-conta.tsx`: resumo "Código enviado para…", foco automático, "Alterar dados".
  - `loja.tsx` sem "Já tenho conta".
  - "Prisma PDV" na boas-vindas e no nome sob o ícone (`app.json`).
  - 3 testes de tela novos.
  - Driver `--producao`, que exige `--fisico`, para agir em `br.com.pdv.mobile`.
  - Roteiro [play-console-teste-interno.md](play-console-teste-interno.md).
- **Validado:**
  - **Local:** mobile 79 arquivos / 655 testes. Na primeira execução, com a máquina carregada, 2 arquivos falharam de forma intermitente; a repetição passou inteira. Typecheck OK.
  - **CI externo** [44205778279](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44205778279) em `8ab08c3`: **success**.
- **AAB 0.1.18** (`builds/`, ignorado pelo git):
  - `pdv-producao-0.1.18-aab.aab`, sha256 `8dbab22e…d5c9`;
  - pacote `br.com.pdv.mobile`, targetSdk 36, minSdk 24;
  - certificado de upload `8B:86:81:63:…:D9:40`, igual ao da chave do usuário;
  - bundle verificado com a API de produção (PASS).

  O AAB 0.1.17 (sha256 `c0e642cb…`) foi substituído e **não deve ser enviado**.
- **Aparelho** (Samsung SM-S938B, Android 17; pacote de produção contra a API de produção, conta própria "Loja Teste M4" criada pelo usuário com o código recebido por e-mail):
  - **Cadastro real:** concluído pelo usuário. Comprova a entrega de e-mail da produção e o contrato de cadastro (**relato do usuário + aparelho**).
  - **0.1.17, via driver/ADB:**
    - abrir caixa (R$ 100), vender R$ 50 em dinheiro, entrada R$ 20, sangria R$ 15 e retirada R$ 5: **PASS**;
    - fechamento feito pelo usuário na mão;
    - venda offline **não executada pelo driver** (ver achados). O usuário declarou que o modo avião funciona: **relato do usuário**, não teste.
  - **0.1.18:** instalada por cima da 0.1.17 sem perda: conta, venda e caixa preservados. Rótulo "Prisma PDV" conferido no APK. As telas novas do onboarding só têm teste automatizado, sem conferência no aparelho, porque a conta já existia.
  - **API de produção (HTTP pelo console, só leitura):** 1 conta e 1 loja; caixa com troco 10000, esperado 15000 e contado 15000, fechado; movimentos suprimento 2000, sangria 1500 e retirada 500, um de cada; 1 venda concluída de 5000. Valores e IDs únicos batem com o aparelho, **sem duplicação**.
- **Achados de ferramenta (corrigidos ou contornados):**
  - (a) Com a câmera permitida, o leitor ao vivo impede a leitura de tela pelo `uiautomator`. Durante os fluxos a permissão foi retirada e depois restaurada (`granted=true` conferido).
  - (b) Com ADB por Wi-Fi, o modo avião derruba o próprio ADB e deixou o aparelho offline. O driver agora recusa `airplane on` em conexão sem fio (`conexao_sem_fio`, com teste; 57 testes do driver passam).
  - (c) Os fluxos avulsos exigem os saldos esperados por `--param` quando o caixa não está no estado padrão.
- **Versão, SHA e retorno:**
  - App 0.1.18 (19), commit `8ab08c3`.
  - API de produção em `f2fb3bc` (`codex/pdv-deploy`).
  - Retorno da API: restaurar o backup `pdv-pre-m4-reconciliacao-20261117`, mover `codex/pdv-deploy` para `1cd184f` e implantar (CP 156). Agora a produção tem os dados da conta de teste, que o retorno apagaria.
  - Retorno do app: no teste interno, publicar de novo uma versão anterior exige versionCode maior; o caminho é uma correção nova.
- **Pendências (usuário):** seguir [play-console-teste-interno.md](play-console-teste-interno.md):
  1. criar o app "Prisma PDV";
  2. enviar `pdv-producao-0.1.18-aab.aab` ao teste interno;
  3. conferir o certificado de upload;
  4. preencher conteúdo do app e segurança de dados;
  5. montar a lista com os e-mails dos 1–3 lojistas;
  6. mandar o link de opt-in.

  Depois, confirmar com um lojista a instalação pela Play e o cadastro real.
- **Observação:** no Samsung, o app instalado por ADB tem outra assinatura que a da Play. Para instalar pela Play nele, desinstale antes.
- **Próximo passo:** ações do usuário no Console e confirmação com um testador (fecha o M4); depois o M5.

## CP 158 — Escopo do MVP ampliado e aceite parcial do usuário (17/11/2026)

- **Referência:** continua o [CP 157](#cp-157-m4-versao-0118-de-producao-conferida-no-samsung-pronta-para-o-teste-interno-17112026). Reescreve o caminho de [prompts por sessão](prompts-sessoes-entrega.md).
- **Decisões do usuário nesta sessão (17/11/2026), tipo de evidência: relato e aceite do usuário:**
  1. **Venda offline na produção: aceita como comprovada** (era "relato, não teste" no CP 157). Segue sem teste de aparelho pelo driver; E1 a repete por cabo USB.
  2. **Onboarding 0.1.18:** zerar a conta de teste da produção e refazer o cadastro para conferir as telas novas. **Não executado:** apaga dados na produção e exige a confirmação do alvo (1 conta, 1 loja, 1 venda, 1 caixa) e backup; fica na E1.
  3. **Instalação pela Play:** só depois do app pronto (depois da E4). O lojista disponível será testador enquanto o piloto roda sem cobrança.
  4. **Cobertura de dispositivos:** fora do MVP; o usuário testa pessoalmente. F13 com dois Androids segue no backlog.
  5. **F16/F17 sem aparelho** (políticas deslogado, resposta manual, conteúdo do JSON no destino, expiração real de 1 h): **aceitas com a cobertura por teste automatizado** (`pilotoSuporteExportacao.test.ts` e correlatos). O usuário pediu para marcar.
  6. **Toast de licença:** precisa de solução (ver abaixo).
  7. **Aceite humano:** o usuário pediu para registrar. Registrado **somente o aceite dos itens 1, 4 e 5 acima**, nos limites descritos. **Não é aceite do MVP nem da matriz F01–F17 inteira**, que continua para o M5. Itens `[ ]` do roadmap não foram marcados: o toast segue sem confirmação no aparelho.
- **Novo escopo obrigatório do MVP (decisão do usuário):**
  1. **Cobrar o cliente final por Mercado Pago, InfinitePay e Stone** (antigas P3 e P4), agora sessões **E3** e **E4**, antes da Play.
  2. **Leitura completa de produtos por EAN** (antigo bloco 12, que estava no backlog), agora **E2**, com fontes de catálogo incorporadas ao plano pago e o custo calculado.
  3. Reordenação: E1 (toast e conta zerada), E2, E3, E4, fim do M4 (Console e instalação pela Play) e M5.
  - **Riscos registrados:** InfinitePay não tem sandbox e a Stone depende de aprovação de parceiro; a resposta deles pode atrasar o MVP. Se um provedor não liberar acesso, o recurso não é anunciado como integrado e a decisão volta ao usuário. Rascunhos das mensagens em [contato-provedores.md](contato-provedores.md), **nada enviado**.
- **Toast "Não foi possível atualizar a licença" (construído e validado localmente; causa no aparelho NÃO confirmada):**
  - A suspeita de resposta inválida de `GET /assinatura` foi descartada por teste de integração temporário com a API real (cobrança desligada, conta com e sem assinatura): `sincronizar()` resolve sem erro.
  - **Causa provável (reproduzida em teste):** ao voltar ao primeiro plano, `_layout.tsx:137` (licença) e `_layout.tsx:145` (saídas pendentes e sync) rodam juntos. O sync liga `bloquearAlteracoes(true)` por instantes; se a resposta da licença chega nessa janela, `armazenamentoEscopo.gravar` lança um `Error` simples, o `catch` de `assinatura.ts` relança (só `ErroBackend` é tratado) e o toast aparece, com o app Online.
  - **Correção:** `ErroAlteracaoBloqueada` (nova classe, mesma mensagem) em `armazenamentoEscopo.ts`; `AssinaturaServico.sincronizar` registra no diagnóstico (`licença não gravada: troca de conta ou sync em andamento`) e engole só esse erro, pois nada foi gravado e o próximo sync renova. Outros erros inesperados seguem gerando o toast.
  - **Teste novo:** `apps/mobile/test/assinaturaForeground.test.ts` (3 casos; o principal falhava antes). Typecheck mobile sem erros; `assinaturaForeground`, `assinatura` e `assinaturaEscopo` 18/18; suíte mobile completa em série **80 arquivos, 658/658**. Revisado pelo orquestrador. CI externo ainda não executado para este commit.
  - **Hipótese alternativa não corrigida:** `src/release/relogio.ts` guarda em `carregamentoHora ??=` uma promise rejeitada e nunca a reexecuta, então uma falha transitória de leitura envenena o relógio. Não explica sozinha um toast só na licença. A E1 deve ler o diagnóstico do aparelho e, se o toast persistir, tratar esta.
  - **Impacto:** muda o runtime do app, então precisa de versionCode maior (0.1.19, na E1). A API não muda.
- **Pesquisa de catálogo (fontes oficiais e amostra pequena):** [pesquisa-catalogo-ean.md](pesquisa-catalogo-ean.md).
  - **Lista da public-apis:** só o Open Food Facts consta no README. "API de Produtos (Seu Negócio na Nuvem)" foi achada por sondagem de domínio, sem termos nem SLA; "API GTIN (Open Source Community Brasil)" não foi localizada; SI5 Global só em um fork; DotCompany em lista nenhuma.
  - **Amostra de 20 EANs (enviesada para marcas grandes, não substitui a amostra de 100):** DotCompany 19/20; Open Food Facts 8/20 (acertou alimentos e bebidas, 0% em limpeza, higiene e bazar); Seu Negócio na Nuvem 2/20 com nome; SI5 e Cosmos não medidos.
  - **Preços verificados:** DotCompany pré-paga R$ 0,04 por consulta com resultado, recarga mínima R$ 169, cadastro com CNPJ. SI5 Global: grátis 30/dia; Básico R$ 39,90 com cupom (R$ 59,90 de lista); planos acima de R$ 199,99. Cosmos: preço **não verificado**.
  - **Custo (premissas minhas, a validar):** com a DotCompany, 150 consultas externas por loja/mês custam R$ 6,00 (12% de R$ 49,90; 24% com cupom de 50%); 600 consultas custam R$ 24,00, o que inviabiliza a margem com cupom sem compartilhar o catálogo.
  - **Conflito principal:** os termos da DotCompany parecem proibir redistribuir o dado a terceiros e exigem apagar ao encerrar, o que colide com o `catalogo_ean` compartilhado. O Open Food Facts exige atribuição e Share-Alike (ODbL), ponto jurídico em aberto.
  - **Recomendação:** catálogo próprio, Open Food Facts, DotCompany, SI5 grátis. Contratar só a DotCompany, depois de resposta escrita sobre cache compartilhado; enquanto isso, cache por loja.
  - **Decisões do usuário listadas na seção 6 do documento.** Os preços da oferta vigente (R$ 49,90, cupom de 50%) vêm de [assinatura-unica-e-cupons.md](assinatura-unica-e-cupons.md), não da grade de três planos antiga.
- **Arquivos:** `docs/prompts-sessoes-entrega.md` (E1–E4), `docs/roadmap-app-completo.md` (R6, backlog), `docs/contato-provedores.md`, `docs/pesquisa-catalogo-ean.md`, `apps/mobile/src/dados/armazenamentoEscopo.ts`, `apps/mobile/src/servicos/assinatura.ts`, `apps/mobile/test/assinaturaForeground.test.ts`.
- **Limites:** nenhum deploy, nenhum build novo, nenhuma alteração na produção ou no aparelho; nenhum contato enviado a provedores; nenhuma fonte de catálogo contratada; causa do toast não confirmada no Samsung; aceite humano só parcial.
- **Próximo passo:** E1 (confirmar a limpeza da conta de teste, gerar a 0.1.19, refazer o cadastro e ler o diagnóstico do toast). Em paralelo, o usuário decide as fontes de catálogo (seção 6 da pesquisa) e autoriza o envio das mensagens aos provedores.

<a id="cp-159-pacote-escalavel-de-melhorias-de-design-ux-ui-visual-e-branding-17112026"></a>

## CP 159 — Pacote escalável de melhorias de design, UX, UI, visual e branding (17/11/2026)

- **Data e etapa:** 17/11/2026, 22h35 (America/Sao_Paulo). Planejamento transversal de Design System, UX, UI, Visual e Branding; continua o [CP 158](#cp-158-escopo-do-mvp-ampliado-e-aceite-parcial-do-usuario-17112026), sem alterar runtime, API, banco, APK ou a ordem E1–E4 vigente.
- **Estado:** análise completa e pacote arquitetural escalável construídos e validados documentalmente; sem alteração em código de execução; aguarda alinhamento humano sobre as escolhas abertas antes da implementação.
- **Construído:** [pacote-melhorias-design.md](pacote-melhorias-design.md) estruturado de baixo para cima em seis camadas:
  0. **Branding, assets e voz:** identificação de placeholders padrão de fábrica do Expo em `apps/mobile/assets/*` (`icon.png`, `splash-icon.png`, `android-icon-*`), especificação do ícone/marca Prisma PDV em duas direções (Noite & Manga vs Solar), kit Play Store, estilização de `apps/api/src/rotas/paginasPublicas.ts` e glossário canônico ("Entrada de troco", ocultação de `cofre_deposito`/`reforco_troco`, `rotuloPapel`, `<CodigoCurto>` e alinhamento com o Plano Único `Pro` de `assinatura-unica-e-cupons.md`).
  1. **Design tokens em 3 camadas:** arquitetura `primitivos → semânticos → componentes` retrocompatível em `packages/shared/src/tokens.ts`, ajuste de contraste WCAG AA de `ink3` (`#6B6883` → `#5C5973` sobre `surface`/`surface2`), inventário de ~18 valores hex/rgba hardcoded, espaçamentos nomeados, unificação tipográfica (`tema/index.ts` → `@pdv/shared`), novas categorias (`movimento`, `borda`, `opacidade`, `camada`, `janela`) e mapeamento Dark Mode ready.
  2. **Átomos:** auditoria e especificação de `Texto` (hifenização e `maxScale`), `Dinheiro`, `Icone`, `Ilustra` responsiva, `Botao`, unificação triplicada de `BotaoIcone` (`BotaoRedondo`), `Chip` semântico, `StatusPill` estendido, `Interruptor` e novos átomos (`Divisor`, `Skeleton`, `CodigoCurto`).
  3. **Moléculas:** evolução de `Campo` (`fundo`, `multiline`, contador), consolidação de 3 `CampoBusca` duplicados, família monetária unificada (`CampoPreco` no lugar de `decimal-pad` + `TecladoNumerico` compacto adaptativo), `Banner` com `sucesso`, gesto de arrastar + botão fechar em `BottomSheet`, `ListaPaginada` compacta e novas moléculas (`Cartao`, `CartaoSelecao`, `EstadoVazio`, `SeletorData`).
  4. **Espaçamentos, organismos e layout adaptativo:** correção do bug de `gap: 0` em `TelaBase` (observado em `equipe.tsx` e `usuarios.tsx`), correção de `BarraInferior` em `font_scale 2.0` + `360dp`, correção do selo `"Leitor ativo"` em `Scanner` quando permissão é `null`, e base para `NavigationRail` / 2 colunas em `>= 840dp`.
  5. **7 jornadas ponta a ponta e ondas W0–W4:** revisão completa consolidando achados físicos de CPs 112, 118, 119, 123, 130, 131, 143, 144, 151 e ruptura "Duas Gerações" (telas v0.1 vs R1–R5), mais roadmap de execução em ondas `W0–W4`.
- **Arquivos:** `docs/pacote-melhorias-design.md`, `docs/checkpoints-roadmap.md` e `docs/roadmap-app-completo.md`. Alterações anteriores na árvore (`CP 158`) integralmente preservadas.
- **Validações:** inspeção estática direta de `packages/shared/src/{tokens,planos}.ts`, `apps/mobile/src/tema/*`, `apps/mobile/src/componentes/*`, telas/rotas em `apps/mobile/app/*` e `apps/mobile/src/telas/*`, `apps/mobile/assets/*` e `apps/api/src/rotas/paginasPublicas.ts`; scorecards registrados (`Nielsen 25/40` em design review nativo; `Audit Native 12/20`); `git diff --check` e conferência de links em execução na etapa final.
- **Limitações/pendências:** entrega puramente documental e de planejamento; nenhum item `[ ]` do roadmap foi concluído; nenhuma captura nova no Android nem teste de execução de runtime foi rodado nesta análise.
- **Próximo passo:** alinhar com o usuário as três decisões abertas (direção do ícone Prisma PDV na Onda W0, encaixe das ondas W0–W4 frente às sessões E1–E4 e inclusão de Fiado direto no Checkout) antes de iniciar a implementação da onda autorizada.

<a id="cp-160-prototipo-interativo-v2-design-system-marca-e-7-jornadas-17112026"></a>

## CP 160 — Protótipo interativo v2.0 (Design System, marca e 7 jornadas) (17/11/2026)

- **Data e etapa:** 17/11/2026, 22h56 (America/Sao_Paulo). Prototipagem visual e funcional interativa do pacote de design antes de qualquer alteração no código de produção; continua o [CP 159](#cp-159-pacote-escalavel-de-melhorias-de-design-ux-ui-visual-e-branding-17112026).
- **Estado:** protótipo construído e validado localmente (sintaxe JS, renderização das 26 telas/7 sheets/5 vistas, `impeccable detect` e inspeção estática); aguarda revisão e aprovação visual do usuário antes de alterar runtime (`apps/mobile`, `packages/shared`, `apps/api`).
- **Construído:**
  - Studio Workbench modular em [docs/prototipo-v2/index.html](prototipo-v2/index.html) (`estilos.css`, `icones.js`, `telas-core.js`, `telas-gestao.js`, `workbench.js`) compatível com abertura direta via `file://` e zero dependências externas.
  - Artefato HTML autônomo em arquivo único (`prototipo-prisma-pdv-v2.html` na pasta de artefatos da sessão) com o mesmo Studio completo embutido e compatível com CSP estrita.
  - Cinco áreas navegáveis: **0. Marca & Play Store** (Direção A Noite & Manga vs Direção B Solar Balcão, Adaptive Mono Android 13+, banner 1024×500 e prévia de `paginasPublicas.ts`), **1. Tokens (3 Camadas)** (Primitivos → Semânticos Claro/Escuro → Componentes, correção AA `#5C5973` e eliminação de hex hardcoded), **2. Átomos & Moléculas** (catálogo de 53 ícones SVG 24×24, 8 ilustrações e componentes >= 48dp), **3. Protótipo Navegável** (26 telas ponta a ponta nas jornadas J1–J7 + 7 BottomSheets interativas com alternância ao vivo para `390×844`, `F18 · 360×640 + Fonte 2x` e `Tablet 960×660` com `NavigationRail` e 2 colunas no Vender), e **4. Antes × Depois & Ondas W0–W4**.
- **Arquivos:** `docs/prototipo-v2/estilos.css`, `docs/prototipo-v2/icones.js`, `docs/prototipo-v2/telas-core.js`, `docs/prototipo-v2/telas-gestao.js`, `docs/prototipo-v2/workbench.js`, `docs/prototipo-v2/index.html`, `docs/checkpoints-roadmap.md` e `docs/roadmap-app-completo.md`. Protótipo histórico `docs/prototipo/*`, alterações anteriores (`CP 158`) e código de produção integralmente preservados sem modificações.
- **Validações:** `node --check` passou nos 4 módulos JS; smoke-test em Node confirmou renderização de todas as 26 telas, 7 sheets e 5 vistas sem exceções e ausência de trailing whitespace; verificação `new Function` no script embutido do artefato único (`145.895` bytes); `impeccable detect --json` retornou `[]` com código de saída `0` tanto em `docs/prototipo-v2/index.html` quanto no artefato único.
- **Limitações/pendências:** validação realizada em ambiente web/Node sem execução em aparelho Android físico; nenhum item `[ ]` do roadmap foi marcado `[x]`; implementação das ondas W0–W4 em runtime permanece bloqueada até aprovação visual do protótipo e escolha das 3 decisões abertas pelo usuário.
- **Próximo passo:** aguardar feedback visual do usuário sobre o protótipo v2.0 (Direção A vs B da marca, inclusão de Fiado direto no Checkout P3 e ordem de execução W0–W4 junto às sessões E1–E4) para então iniciar a onda autorizada.

## CP 159 — Decisões de 17/11: só fontes gratuitas, sem contato com provedores, plano simplificado (17/11/2026)

- **Referência:** continua o [CP 158](#cp-158-escopo-do-mvp-ampliado-e-aceite-parcial-do-usuario-17112026). O CP 158 foi commitado em `af7866f` e enviado ao remoto (autorizado pelo usuário), sem CI externo ainda.
- **Decisões do usuário (relato do usuário):**
  1. **Catálogo: só fontes gratuitas.** DotCompany, SI5 Global e Cosmos ficam fora.
  2. **Não contatar provedores.** Tudo pela documentação pública; o que a documentação não proíbe nem exige como regra é tratado como permitido. Os rascunhos de [contato-provedores.md](contato-provedores.md) **não serão enviados**.
  3. **Zerar a conta de teste da produção: confirmado.** Alvo: 1 conta, 1 loja, 1 venda, 1 caixa.
  4. **Commit e push autorizados.**
  5. **Foco em validar pagamento e fazer o MVP funcionar, sem escopo complexo.** As sessões E1–E4 e as P1–P5 foram trocadas por quatro prompts (N1–N4) em [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md); P1, P2 e P5 e as fontes pagas ficam depois do MVP.
  6. **Há outro agente trabalhando em design** ([pacote-melhorias-design.md](pacote-melhorias-design.md)). Pagamento e catálogo começam pelo servidor; telas só depois desse pacote.
  7. Trabalho pesado vai para subagentes Opus 5.5; o orquestrador (Sonnet 5.5) revisa.
- **Pagamentos (pesquisa em documentação pública de 17/11, revisada pelo orquestrador; nenhuma API chamada, nenhum provedor contatado):** [pesquisa-pagamentos.md](pesquisa-pagamentos.md).
  - **Mercado Pago:** único caminho completo sem parceria. Pix por `POST /v1/orders`, webhook com assinatura HMAC, consulta da order, estorno por API, OAuth por lojista e **sandbox que aprova Pix sem dinheiro**. Entra primeiro (N2).
  - **InfinitePay:** Checkout com link de Pix e cartão pelo handle ou chave do lojista; o aviso não é assinado, então a confirmação é sempre pela consulta `payment_check`. **Sem sandbox:** testar exige R$ 1,00 real, com autorização. Estorno só no app da InfinitePay (manual identificado). Entra em N3.
  - **Stone:** sem caminho sem parceria (exige programa de parceiros e homologação). Fica como **confirmação manual identificada**. **InfiniteTap:** o resultado volta só ao aparelho; fica como "confirmado no aparelho".
  - **Point do Mercado Pago:** só se o usuário tiver ou quiser um Point Smart ou Pro; teste com terminal virtual.
  - **Lacuna no código:** o pagamento só tem meio, provedor (`infinitepay`, `mercadopago` ou vazio) e valor; faltam identificador externo e estado da cobrança, e a Stone não está no enum.
  - **Não verificado:** taxas do Mercado Pago e do Checkout da InfinitePay; se o app OAuth precisa de revisão antes de produção; se `payer.email` aceita e-mail genérico da loja; se o aviso do nosso app recebe os pedidos de todos os lojistas sem configuração extra; se `payment_check` funciona para transações do InfiniteTap; tolerância de horário na assinatura do aviso. Nenhum dos três documenta aviso de toda transação da conta.
- **Catálogo gratuito (construído e validado localmente, subagente Opus revisado pelo orquestrador):**
  - Cascata: catálogo próprio, Open Food Facts, Open Beauty Facts e Open Products Facts (mesma API v2, sem chave). Orçamento total de 2 s, teto de 1,2 s por fonte, parada na primeira resposta com nome, falha parcial tolerada e cache negativo de 10 min só quando todas respondem "não conheço". O 404 "different product type" vira dica e o servidor pula para a base certa. Só nome, marca e conteúdo nas novas fontes, sem imagem. Limite de 300 consultas/hora por loja mantido.
  - Contrato: `FonteCatalogoSchema` ampliado, `atribuicao` (texto, `ODbL-1.0`, URL) com default `null`, compatível com respostas e caches antigos. Sem migração (coluna `text`).
  - **Licença (documentação das bases):** ODbL para a base, DbCL para o conteúdo e CC BY-SA para imagens; uso comercial permitido com atribuição obrigatória e share-alike; `User-Agent` identificado e 15 leituras por minuto por IP. A atribuição precisa aparecer na tela (N1).
  - **Testes:** `catalogoEan.test.ts` (API e mobile) e `ean.test.ts` (shared). Reexecutados pelo orquestrador: typecheck shared, API e mobile sem erros; API `catalogoEan` e `zerarContaTesteProducao` 52/52; mobile `catalogoEan` 37/37. O subagente relatou API completa 641/641 e shared 173/173 (não reexecutadas).
  - **Impacto:** a API precisa de deploy. O app 0.1.18 recusa as fontes novas e cai no cadastro manual, sem travar; para aproveitá-las é preciso novo AAB (0.1.19).
  - **Não verificado:** cobertura real das bases novas em EANs brasileiros (a única sondagem veio sem nome); amostra de 100 produtos; latência a partir do servidor; se o share-alike alcança o `catalogo_ean` misto; lacuna de atribuição quando duas lojas confirmam um nome sobre um registro externo (a fonte vira `proprio` e a atribuição some, mas marca e conteúdo do OFF permanecem); cache negativo por instância.
- **Script para zerar a conta de teste (construído e validado localmente; nada executado em produção):**
  - `scripts/zerar-conta-teste-producao.sql`, `apps/api/test/zerarContaTesteProducao.test.ts` e o procedimento [zerar-conta-teste-producao.md](zerar-conta-teste-producao.md).
  - Transação única, com travas: banco `pdv`, exatamente 1 conta, nome da loja e contagens de lojas, vendas e caixas iguais aos parâmetros. `DELETE` em 27 tabelas, sem `TRUNCATE`. Preserva `drizzle.__drizzle_migrations`, `catalogo_ean` e `limites_auth`, conferindo a impressão digital das duas primeiras antes e depois. Idempotente (com 0 contas, aborta sem alterar).
  - Testes: 10/10 em PGlite, com recusa por nome errado, contagem divergente, 2 contas e outro banco, sem apagar nada. Reexecutado pelo orquestrador junto com o catálogo (52/52).
  - **Riscos:** sem `psql` nesta máquina, o bloco `\if` do psql só foi testado de forma simulada, e o cenário PostgreSQL real não rodou, então falta ensaiar o script em banco descartável antes da produção; não cancela cliente ou assinatura em gateway externo; dados locais do Android precisam ser limpos pelo usuário; sequências não reiniciam; `limites_auth` preservado pode atrasar tentativas repetidas de cadastro.
- **Limites:** nenhum deploy, build, chamada à produção ou ao aparelho; CI externo pendente para este commit; aceite humano continua parcial.
- **Próximo passo:** N1 (revisar e integrar, ensaiar e rodar o script com backup, gerar a 0.1.19 e conferir no aparelho), depois N2, N3 e N4.

<a id="cp-161-n1-producao-zerada-api-implantada-e-0119-com-atribuicao-18112026"></a>

## CP 161 — N1: produção zerada, API implantada e 0.1.19 com atribuição (18/11/2026)

- **Data e etapa:** 18/11/2026, 00h00 (America/Sao_Paulo). Sessão N1 de [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md); continua o [CP 159](#cp-159-decisoes-de-1711-so-fontes-gratuitas-sem-contato-com-provedores-plano-simplificado-17112026). Numeração: o CP 160 é o protótipo de design do outro agente, ainda sem commit.
- **Estado:** avanço parcial. Base revisada e integrada; produção zerada; API implantada. **Faltam** AAB e APK 0.1.19, instalação no Samsung, onboarding, fluxos USB, diagnóstico do toast e bipagem de 5 produtos.
- **Autorizações do usuário nesta sessão:** backup e limpeza da conta de teste, backup e deploy da API, desinstalar o app no aparelho; atribuição como linha mínima na tela atual, porque o pacote de design não está integrado (só protótipo, sem commit nem CI) e ficou fora da 0.1.19.
- **1. Revisão do CP 159 (subagente Opus revisado pelo orquestrador):** sem defeito que derrube a rota ou vaze entre lojas. Corrigido, cada um com teste que falhava antes:
  - User-Agent padrão sem contato → `PrismaPDV/0.1 (contato público do produto)`; `OFF_USER_AGENT` continua com prioridade;
  - `tipo in FONTE_DO_TIPO` aceitava "constructor" → `Object.hasOwn`;
  - texto de atribuição redundante → "Dados do Open Food Facts, sob a Open Database License" (bases irmãs: "…, um projeto Open Food Facts, …");
  - URL da atribuição aceitava `javascript:`/`intent:` → só https.
  - **Riscos registrados, não corrigidos:** orçamento de 2 s apertado para higiene/limpeza (404 com dica no OFF ~0,95 s + Open Beauty Facts ~1,0 s medidos da máquina local; se estourar, cai no cadastro manual); o app 0.1.18 registra `resposta_invalida` para as fontes novas e trata como "não achou"; antes de um retorno da API para antes de `ff43d05`, apagar de `catalogo_ean` as linhas `open_beauty_facts`/`open_products_facts`. Trava proposta para tabelas novas não previstas no script de limpeza fica no backlog.
- **2. Ensaio do script com psql real (subagente Opus):** PostgreSQL/psql 17.11 oficial (binários EDB) em cluster local descartável, banco `pdv`, 13 migrações aplicadas pelo `migrate()` da API e conta semeada pelo fluxo real da API. Sucesso (código 0, 27 tabelas a 0, migrações, `catalogo_ean` e `limites_auth` com hash igual) e recusas sem apagar nada: já zerado, loja errada, contagem divergente, parâmetro ausente, 2 contas, banco `pdv_outro` (todos código 3). **Defeito do procedimento:** o comando com `-f scripts/...` e `$DATABASE_URL` não roda em nenhum contêiner (o `pdv-api` não tem psql nem `scripts/`); procedimento reescrito para o console do `pdv-postgres` com transferência em base64 e conferência de sha256. Heredoc sem aspas quebra `$zerar$`.
- **3. Produção zerada (validado externamente, console do EasyPanel):**
  - antes (só leitura): PostgreSQL 17.12, banco `pdv`, 1 conta, loja "Loja Teste M4", 1 venda, 1 caixa, 13 migrações, catálogo 0;
  - backup `pdv-pre-n1-zerar-conta-teste-20261118`: Success, 13,6 kB;
  - parar o `pdv-api` foi recusado pela revisão automática de permissões; seguido o caminho alternativo do procedimento (sem tráfego: nenhum aparelho em uso);
  - script transferido com sha256 `77ac44d1…40c8ad` (igual ao do repositório, 261 linhas), executado com os parâmetros confirmados: `NOTICE: Conta de teste removida: loja "Loja Teste M4", 1 loja(s), 1 venda(s), 1 caixa(s)… migrações intactas (13); catalogo_ean intacto (0)`, `COMMIT`, código 0; arquivo temporário removido;
  - depois: 0 contas, lojas vazio, 0 vendas, 0 caixas, 0 usuários, 0 sessões, 13 migrações; `/saude` 200.
- **4. CI:** [44222764792](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44222764792) em `8526cc0` **falhou**: `zerarContaTesteProducao.test.ts` nunca tinha rodado com PostgreSQL real e o pool do cliente recusava o `BEGIN`/`COMMIT` do script (`UNSAFE_TRANSACTION`, 8 falhas). Correção: no modo PostgreSQL, o teste roda o script numa conexão única, como o psql (vermelho sem a correção e verde com ela no PostgreSQL 17.11 local; PGlite 10/10). [44223566539](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44223566539) em `d393e1e`: **success**.
- **5. API implantada (validado externamente):** backup `pdv-pre-n1-deploy-d393e1e-20261118` Success (10,1 kB); `codex/pdv-deploy` avançado de `f2fb3bc` para `d393e1e` por fast-forward; implantação do `pdv-api` concluída no histórico do painel; `verificar-operacao.mjs` 7/7 PASS (`builds/operacao-producao-n1-20261118.json`); `/catalogo/ean/...` sem sessão 401. A cascata do catálogo com sessão ainda não foi exercida na produção (fica para a bipagem no aparelho).
- **6. App 0.1.19 (versionCode 20), construído e validado localmente:** linha de atribuição tocável (abre a página do produto, `accessibilityRole="link"`, área ≥ 44 dp) no formulário pela câmera e no cadastro rápido, só quando a fonte é externa. Texto na tela: "Dados do Open Food Facts, sob a Open Database License (ODbL-1.0)". Teste novo `sugestaoAtribuicao.test.ts` (6 casos, inclusive render). Também inclui a correção do toast do CP 158.
- **Validações locais (em série, um worker):** typecheck shared, API e mobile sem erros; shared 17 arquivos 173/173; API (PGlite) 55 arquivos 641/641; mobile 81 arquivos 665/665.
- **Commits:** `8526cc0` (0.1.19, atribuição, correções do catálogo, procedimento) e `d393e1e` (teste em conexão única), enviados à branch atual.
- **Retorno da API:** restaurar `pdv-pre-n1-deploy-d393e1e-20261118`, mover `codex/pdv-deploy` para `f2fb3bc` e implantar, apagando antes as linhas das fontes novas em `catalogo_ean` (item 1).
- **Próximo passo:** usuário gera o AAB 0.1.19 (senhas da chave); conectar o Samsung por cabo USB; desinstalar, instalar e refazer o cadastro; fluxos, venda offline, diagnóstico do toast e bipagem de 5 produtos.

<a id="cp-162-reconstrucao-visual-do-prototipo-v21-balcao-autentico-17112026"></a>

## CP 162 — Reconstrução visual do Protótipo v2.1 (Balcão autêntico e 14 ilustrações 3D) (17/11/2026)

- **Data e etapa:** 17/11/2026, 23h41 (America/Sao_Paulo). Reconstrução visual completa do protótipo após avaliação do usuário sobre o v2.0 (*"Esse design me parece bem inferior"*); corrige o [CP 160](#cp-160-prototipo-interativo-v2-design-system-marca-e-7-jornadas-17112026) preservando o [CP 161](#cp-161-n1-producao-zerada-api-implantada-e-0119-com-atribuicao-18112026) e sem alterar código de produção.
- **Estado:** protótipo v2.1 construído e validado localmente em web/Node; aguarda revisão e aprovação visual do usuário antes de tocar `apps/mobile`, `packages/shared` ou `apps/api`.
- **Diagnóstico da regressão do CP 160 corrigido neste marco:** o v2.0 havia perdido a tipografia `Bricolage Grotesque` + `Inter`, trocado as superfícies planas `#F4F2EE` (`16/24dp` sem bordas nem sombras) e botões em pílula `#FFC933` por caixas com borda de painel SaaS, omitido a `BarraInferior` de 5 colunas com `Vender` central flutuante, substituído as 14 ilustrações "aquarela 3D" por vetores chapados e desenhado marca e topo escuros desconexos do Design System Balcão.
- **Construído:**
  - `docs/prototipo-v2/ilustracoes.js`: extração fiel das 14 ilustrações originais de `docs/prototipo/Ilustra.dc.html` (`scanner`, `cesta`, `moedas`, `tap`, `pix`, `produto`, `check`, `offline`, `recibo`, `lanterna`, `loja`, `pausa`, `busca`, `grafico`) com prefixação automática de IDs SVG.
  - `docs/prototipo-v2/estilos.css`: restauração exata dos raios (`8/16/24/999`), escala tipográfica (`Bricolage Grotesque 44/32/24px` + `Inter`, referenciando `@expo-google-fonts` locais), superfícies `#F4F2EE` sem borda, pílulas `999px` em `#FFC933`, `BarraInferior` 5 colunas com FAB `Vender` `-22px`, visor `#0D0B1A` com bokeh/cantoneiras/laser, `NavigationRail` no Tablet (`960px`), Modo Noturno e responsividade F18 (`360×640 + fonte ampliada`).
  - `docs/prototipo-v2/icones.js`: 56 ícones SVG `24×24` alinhados aos traços de `AppVender`/`AppInicio`/`Main.dc.html`, wordmark `Prisma.` + ícone 3D aquarela nas direções A (`Noite & Manga`) e B (`Solar Balcão`) e monocromático Android 13+.
  - `docs/prototipo-v2/{telas-core,telas-gestao,workbench}.js` e `index.html`: 26 telas (`J1–J7`), 7 `BottomSheets` (incluindo teclado `Avulso`), tela cheia `#0E7A40` de venda concluída, elevação visual das telas R1–R5 (`Estoque`, `Fiado`, `Relatórios`, `Equipe`) ao padrão Balcão e Studio editorial branco (`#FFFFFF`).
  - Artefato único autônomo `prototipo-prisma-pdv-v2.html` (`480.665` bytes) com `Bricolage Grotesque 700/800` embutida em base64 e zero `<link>` externos (CSP-safe).
- **Arquivos:** `docs/prototipo-v2/{ilustracoes.js,estilos.css,icones.js,telas-core.js,telas-gestao.js,workbench.js,index.html}`, `docs/checkpoints-roadmap.md` e `docs/roadmap-app-completo.md`. Produção (`apps/`, `packages/`, `scripts/`) e protótipo histórico (`docs/prototipo/`) intactos.
- **Validações:** `node --check` nos 5 arquivos JS passou (`0`); smoke-test em Node renderizou todas as 26 telas, 7 sheets, 14 ilustrações sem colisão de ID e 5 vistas sem exceções; trailing whitespace `NONE`; `new Function` validou o JS embutido no artefato único (`ICONS=56`, `ILUSTRAS=14`); `impeccable detect --json` saiu com código `0` em ambos (`[]` em `docs/prototipo-v2/index.html`; `2` avisos apenas informativos `advisory: true` `shape-assembled-illustration` nos SVGs `200×200` do bundle único).
- **Limitações/pendências:** validação web/Node (sem captura física em Android); nenhum `[ ]` do roadmap marcado `[x]`.
- **Próximo passo:** aguardar avaliação visual do usuário no protótipo v2.1 para definir direção da marca (`Dir. A` vs `Dir. B`), inclusão de Fiado direto no Checkout (`P3`) e início das ondas W0–W4 após N1–N4.

<a id="cp-163-aprofundamento-do-prototipo-v22-impeccable-ui-ux-pro-max-32-telas-18112026"></a>

## CP 163 — Aprofundamento do Protótipo v2.2 (/impeccable + /ui-ux-pro-max + 32 telas) (18/11/2026)

- **Data e etapa:** 18/11/2026, 00h01 (America/Sao_Paulo). Aprofundamento do protótipo interativo da v2.1 ([CP 162](#cp-162-reconstrucao-visual-do-prototipo-v21-balcao-autentico-17112026)) para v2.2 com `/impeccable` e `/ui-ux-pro-max`, alinhado às decisões de produto dos [CP 159](#cp-159-pacote-escalavel-de-melhorias-de-design-ux-ui-visual-e-branding-17112026) e [CP 161](#cp-161-n1-producao-zerada-api-implantada-e-0119-com-atribuicao-18112026), sem alterar código de produção.
- **Estado:** construído e validado localmente (web/Node + `impeccable detect`); aguarda avaliação e aprovação visual do usuário antes de tocar `apps/`, `packages/` ou `scripts/`.
- **Construído:**
  - `docs/prototipo-v2/icones.js`: marca esculpida em `<=5` `<path>` contínuos por SVG em 3 direções (`noite`, `solar`, `aquarela`), Adaptive Mono Android 13+ em `fill-rule="evenodd"`, wordmark `Prisma.` e 62 ícones stroke-2 (adicionados `qrCode`, `whatsapp`, `desfazer`, `margem`, `linkExterno`, `maquininha`).
  - `docs/prototipo-v2/estilos.css`: superfície elevada `--surface-elev` (`#FFFFFF` Claro / `#252142` Noturno) para botões/pílulas/chips/inputs em cards noturnos, clamps anti-estouro (`ds-clamp-2`, `ds-truncate`, `is-compact-num`), movimento intencional com `prefers-reduced-motion: reduce`, estilos do gráfico 7d, simulador de máscara Android e `.app-toast-undo-btn`.
  - `docs/prototipo-v2/{telas-core,telas-gestao,workbench}.js` e `index.html`: expansão de 26 para **32 telas** (`J1–J7`) e 7 `BottomSheets`, adicionando `vender-busca`, `pagar-dividir`, `pagar-tap` (recuperação anti-cobrança dupla + Stone manual), `pagar-pix-pago` (`#0E7A40`), recibo completo com QR/WhatsApp em `sucesso`, `caixa-vendas` (acordeão), `produto-novo` (shimmer + atribuição `ODbL-1.0` tocável `>=44dp` + margem Custo/Venda + fardos `+6/+12/+24`), `relatorios` (gráfico 7d interativo + Top 4) e `caixa-sync` com barra progressiva animada; Toast com `Desfazer`, simulador de máscara (`Squircle`, `Circular`, `Gota`), matriz WCAG (12 pares Claro/Noturno >= `4.5:1`), preservador cirúrgico de scroll e modo `Dados Extremos (Harden)`.
  - `docs/pacote-melhorias-design.md`: Seção 10 adicionada documentando o aprofundamento v2.2; Seções 1–9 preservadas.
  - Artefato único autônomo `prototipo-prisma-pdv-v2.html` (`533.598` bytes) com `Bricolage Grotesque 700/800` inline base64 e zero `<link>` ou `<script src>` externos.
- **Arquivos:** `docs/prototipo-v2/{icones.js,estilos.css,telas-core.js,telas-gestao.js,workbench.js,index.html}` (`ilustracoes.js` preservado com as 14 aquarelas 3D originais), `docs/pacote-melhorias-design.md`, `docs/checkpoints-roadmap.md` e `docs/roadmap-app-completo.md`. Produção e `docs/prototipo/` intactos.
- **Validações:** `node --check` nos 5 módulos JS passou (`0`); smoke-test VM + simulação interativa em Node validou todas as 32 telas, 7 sheets, 14 ilustrações (`117` IDs únicos), 62 ícones, 3 direções × 3 máscaras Android, 3 viewports (`padrao`, `f18`, `tablet`), `escuro`, `harden`, e fluxos `Desfazer`, `Dividir`, `Tap recovery`, `Pix pago` e `Novo produto`; `TRAILING_WS=NONE`; `new Function` validou o JS embutido no artefato; `impeccable.cmd detect --json` saiu com código `0` e `[]` (zero achados e zero avisos) tanto em `docs/prototipo-v2/index.html` quanto em `prototipo-prisma-pdv-v2.html`.
- **Limitações/pendências:** validação web/Node (sem captura física em Android); nenhum `[ ]` marcado `[x]` no roadmap.
- **Próximo passo:** aguardar aprovação visual do usuário sobre a direção da marca (`Dir. A`, `Dir. B` ou `Dir. C`), Fiado direto no Checkout (`P3`) e início das ondas `W0–W4` após `N1–N4`.

<a id="cp-164-n2-servidor-do-pix-mercado-pago-construido-e-testado-com-provedor-simulado-18112026"></a>

## CP 164 — N2: servidor do Pix Mercado Pago construído e testado com provedor simulado (18/11/2026)

- **Data e etapa:** 18/11/2026, 18h49 (America/Sao_Paulo). Sessão N2 de [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md); segue a [pesquisa de pagamentos](pesquisa-pagamentos.md), o [CP 101](#cp-20261110-101-google-play-planos-e-integracoes-definidos), o [CP 103](#cp-20261110-103-escolha-da-maquininha-pelo-lojista-decidida) e o R6 do roadmap. Os CPs 162 e 163 são do agente de design, ainda sem commit, e foram preservados.
- **Estado:** avanço parcial. Servidor **construído e validado localmente** com o provedor simulado. **Falta** a validação com a conta de teste do Mercado Pago: a variável `MP_TESTE_ACCESS_TOKEN` não está definida na máquina, e só o usuário pode defini-la. Também faltam as telas (QR e conexão), bloqueadas até o pacote de design ser integrado. Nenhuma chamada real ao Mercado Pago, nenhum deploy, nenhum valor real.
- **Escopo seguido (mínimo da documentação):**
  - **Credencial:** o lojista informa o próprio access token do Mercado Pago, sem OAuth e sem parceria. Opcionalmente informa também a assinatura secreta do webhook da aplicação dele.
  - **Armazenamento:** os dois ficam só no servidor, cifrados com AES-256-GCM, com a chave `PDV_PAGAMENTOS_CHAVE` do ambiente. Nenhuma rota, log ou evento devolve o token.
  - **Sem a chave no ambiente:** as rotas de pagamento respondem 503 `pagamentos_indisponiveis`, e a API sobe normalmente (a produção não tem a chave).
  - **Pix:** `POST /v1/orders`, com `X-Idempotency-Key` fixo por pagamento (`pdv-pix-<uuid>`), `external_reference` igual ao id do pagamento da venda, expiração `PT30M` (mínimo da documentação) e o mesmo corpo salvo e reenviado em toda nova tentativa.
  - **Confirmação:** sempre por `GET /v1/orders/{id}`, nunca pelo corpo do aviso e nunca por valor. Exige `processed`/`accredited`, o mesmo id de pedido, o mesmo `external_reference` e o valor pago exatamente igual ao esperado.
  - **Webhook:** `POST /webhooks/pdv-mercadopago/:conexaoPublicaId`. Valida o HMAC-SHA256 do manifesto `id:<data.id em minúsculas>;request-id:…;ts:…;`, com comparação em tempo constante; assinatura ausente, inválida ou sem segredo cadastrado → 401. Sem janela de `ts`: um aviso repetido só gera outra consulta, sem efeito.
  - **Detalhes da documentação conferidos em 18/11** (fontes em [n2-pix-mercadopago.md](n2-pix-mercadopago.md)): valores como texto com duas casas; cancelamento `POST /v1/orders/{id}/cancel` com 409 `cannot_cancel_order` quando o pedido já foi pago; webhook configurado por aplicação, sem `notification_url` por pedido; `APRO` aprova o Pix no modo de teste; a conta precisa de chave Pix cadastrada.
- **Construído:**
  - **Código:** `apps/api/src/pagamentos/{cifrador,assinaturaWebhook,mercadoPago}.ts`, `apps/api/src/servicos/cobrancasPix.ts`, `apps/api/src/rotas/pagamentos.ts`, `apps/api/src/jobsPagamentos.ts`.
  - **Migração 0013:** tabelas `conexoes_pagamento`, `cobrancas_pagamento` e `eventos_cobranca_pagamento`. As duas primeiras têm índices únicos para conexão ativa por loja, chave de idempotência e id do pedido; a de eventos é a auditoria, sem token, segredo nem QR.
  - **Integração no sync:** o pagamento `pix` + `mercadopago` só é aceito com uma cobrança `paga` da mesma loja e da mesma venda, com o mesmo valor, troco 0, sem alerta de estorno e ainda não vinculada. O vínculo é feito na mesma transação da venda.
  - **Código novo de recusa:** `pagamento_nao_confirmado`.
  - **Sem mudança:** pagamento manual (`provedor: null`), Tap e os demais provedores.
  - **Script de limpeza:** `scripts/zerar-conta-teste-producao.sql` passa a cobrir as três tabelas novas.
  - **Testes:** `apps/api/test/{pagamentosPix,mercadoPagoUnidade}.test.ts`, `apps/api/test/provedorMercadoPagoSimulado.ts` e `packages/shared/test/pagamentosPixContrato.test.ts`.
  - **Homologação:** `scripts/homologar-mercadopago-pix.mts`, fora do CI. Lê só `MP_TESTE_ACCESS_TOKEN`, cria um Pix `APRO`, aguarda `paga` pela nossa API, sincroniza a venda e grava `builds/n2-mercadopago-pix-homologacao.json` sem token nem QR.
  - **Documentação:** [n2-pix-mercadopago.md](n2-pix-mercadopago.md) e `apps/api/README.md`, só com os nomes das variáveis.
- **Estados da cobrança:**
  - `criando` → `aguardando` ou `erro_provedor` (nova tentativa com a mesma chave).
  - `aguardando` → `paga` | `divergente` | `expirada` | `cancelada`.
  - `expirada`/`cancelada` → `paga_tardia` | `divergente`.
  - `paga`, `paga_tardia` e `divergente` são finais, e as gravações são condicionadas ao estado lido, então nunca regridem.
  - Estorno ou contestação vistos depois da confirmação viram alerta para o dono, e a cobrança com alerta não pode ser usada em venda.
- **Casos de falha tratados, todos com teste e provedor simulado:**
  - aviso duplicado e fora de ordem;
  - valor divergente, para mais e para menos;
  - pedido com outro id e a mesma referência;
  - pagamento tardio, após expirar ou após cancelar;
  - venda abandonada (cancelamento, inclusive quando o pedido já foi pago no provedor);
  - aviso perdido, com reconciliação pela consulta do app (no máximo a cada 3 s) e pela tarefa a cada 30 s, com espera crescente após a expiração e após falhas, `Retry-After` no 429 e parada 24 h depois da expiração;
  - isolamento entre lojas e conexão só pelo dono;
  - reconexão sem perder cobranças pendentes;
  - avisos repetidos com limite de consultas;
  - webhook, consulta, tarefa e cancelamento simultâneos;
  - duas sincronizações simultâneas da mesma venda, que geram um único vínculo.
- **Revisão (orquestrador + revisor Opus independente):** nenhum defeito grave em dinheiro, assinatura ou isolamento. Oito achados médios e baixos foram corrigidos, cada um com teste que falhava antes da correção:
  - cobranças presas ao desconectar ou reconectar;
  - consultas sem fim;
  - corrida que apagava o alerta de estorno;
  - cobrança estornada ainda aceita na venda;
  - avisos repetidos sem limite;
  - robustez da tarefa;
  - duas conexões simultâneas resultando em 500;
  - índice do webhook.
  - **Limite:** a corrida de duas conexões simultâneas só ocorre de verdade no PostgreSQL do CI; o PGlite executa uma transação por vez.
- **Validações locais (em série, um worker), sobre o código final:** typecheck shared, API e mobile sem erros; shared 18 arquivos 175/175; API (PGlite) 57 arquivos 704/704; mobile 81 arquivos 665/665. O teste de migrações passa a esperar 14 migrações. **CI** [44374367044](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44374367044) em `6df115b` (PostgreSQL isolado): **success**; deploy não executado (só roda na `main`).
- **NÃO VERIFICADO (depende da conta de teste):**
  - o fluxo completo com credencial de teste;
  - se a credencial de teste é aceita na consulta e no cancelamento (a documentação diverge);
  - o tempo da aprovação `APRO`;
  - a presença de `total_paid_amount` no Pix pago;
  - uma assinatura real do Mercado Pago (não há vetor oficial de teste);
  - `GET /users/me` com o token.
- **Esclarecimento ao usuário (18/11):** a integração é com o Mercado Pago **de cada lojista**. Cada loja conecta a própria conta, e o dinheiro cai na conta dela. A credencial pedida ao usuário serve só para a validação em ambiente de teste, sem dinheiro. O caminho OAuth ("Conectar com Mercado Pago") continua possível como evolução, para o lojista não precisar criar uma aplicação no painel de desenvolvedor.
- **Decisões pendentes do usuário:**
  - o e-mail enviado em `payer.email` (variável `PDV_MP_PAYER_EMAIL`; sem ela, a cobrança responde 503 `pagador_nao_configurado` em vez de inventar um endereço);
  - a chave `PDV_PAGAMENTOS_CHAVE` e o deploy, só com autorização.
- **Limitações:**
  - sem estorno por API;
  - uma cobrança em `erro_provedor` cujo pedido possa ter sido criado durante um timeout não é procurada no provedor, porque a documentação não traz busca;
  - o app precisa aguardar `paga` antes de concluir a venda;
  - telas ainda não feitas.
- **Próximo passo:**
  1. O usuário define `MP_TESTE_ACCESS_TOKEN` no ambiente da máquina (Access Token de teste, conta com chave Pix), sem colar na conversa.
  2. Rodar `scripts/homologar-mercadopago-pix.mts` e registrar a evidência.
  3. Depois da integração do pacote de design: o QR na tela de pagamento e a tela de conexão do lojista.
  4. Deploy só com autorização.

<a id="cp-165-n2-conectar-com-mercado-pago-oauth-no-servidor-e-gateways-do-lojista-18112026"></a>

## CP 165 — N2: "Conectar com Mercado Pago" (OAuth) no servidor e gateways do lojista (18/11/2026)

- **Data e etapa:** 18/11/2026 (America/Sao_Paulo). Sessão N2; continua o [CP 164](#cp-164-n2-servidor-do-pix-mercado-pago-construido-e-testado-com-provedor-simulado-18112026).
- **Decisões do usuário nesta sessão:**
  - **Gateways do lojista:** tudo sobre Mercado Pago, InfinitePay, Stone, PicPay e outros existe para o lojista integrar os próprios gateways de forma simples. O dinheiro cai na conta do lojista, e o produto não recebe nem intermedeia valores. Registrado em [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md) (decisões, tabela e N2) e no R6 do roadmap.
  - **OAuth agora:** "Conectar com Mercado Pago" por OAuth passa a ser o caminho do lojista. O token colado fica como alternativa avançada e caminho de teste.
- **Estado:** servidor do OAuth **construído e validado localmente** com o Mercado Pago simulado. Nada commitado antes deste registro. Sem chamada real ao Mercado Pago, sem deploy e sem tela.
- **Construído:**
  - **Módulos:** `apps/api/src/servicos/{conexoesMercadoPago,oauthMercadoPago}.ts` e `apps/api/src/rotas/oauthMercadoPago.ts`.
  - **Migração 0014:** tabela `estados_oauth_pagamento` e colunas de modo, tokens cifrados, validade, versão e renovação em `conexoes_pagamento`.
  - **Script de limpeza e testes:** a limpeza cobre a tabela nova; testes em `apps/api/test/oauthMercadoPago.test.ts`.
  - **Homologação:** OAuth incluído em `scripts/homologar-mercadopago-pix.mts`.
  - **Documentação:** [n2-pix-mercadopago.md](n2-pix-mercadopago.md), com o fluxo, as variáveis e o que o dono da plataforma configura uma única vez no painel do Mercado Pago.
- **Fluxo:**
  1. O dono inicia em `POST /pagamentos/mercadopago/oauth/inicio`. O `state` tem 32 bytes, é guardado só como hash, é de uso único, ligado à loja e ao dono, e vale 10 min; o PKCE é S256, com o verificador cifrado.
  2. O lojista autoriza na página do Mercado Pago.
  3. O retorno público `GET /pagamentos/mercadopago/oauth/retorno` consome o `state` de forma atômica e troca o código em `POST /oauth/token`. Os tokens do lojista são guardados cifrados.
  4. A página de retorno não reflete nada da URL e tem CSP `default-src 'none'`. O código e o `state` não aparecem nos logs, e há teste para isso.
- **Renovação:**
  - Tarefa por hora, 30 dias antes do vencimento, com espera crescente quando falha.
  - O token de renovação gira a cada uso e é gravado com versão; só uma renovação roda por vez.
  - Só o 401 dispara renovação e nova tentativa, que reutiliza a mesma chave de idempotência; um 403 vira falha comum.
  - `invalid_grant` marca a conexão como "reautorização necessária" sem regredir as cobranças.
  - Desconectar durante uma renovação não grava tokens de volta.
- **Webhook da plataforma:** `POST /webhooks/pdv-mercadopago`, assinado com o segredo da aplicação da plataforma. Acha a cobrança pelo id do pedido e confirma com o token da loja dona da cobrança; o `user_id` do corpo nunca decide. `mp-connect` só agenda uma conferência.
- **Variáveis (só nomes):** `PDV_MP_CLIENT_ID`, `PDV_MP_CLIENT_SECRET`, `PDV_MP_REDIRECT_URI`, `PDV_MP_WEBHOOK_SECRET`, `PDV_MP_OAUTH_PKCE` e `PDV_MP_OAUTH_TEST_TOKEN` (este recusado em produção). Sem elas, o OAuth responde 503 `oauth_indisponivel` e a API sobe normalmente.
- **Revisão (orquestrador + revisor Opus independente):** dois achados médios corrigidos, cada um com teste que falhava antes da correção:
  - tokens regravados após a desconexão;
  - renovação disparada por qualquer 403.

  Também foram corrigidos os achados baixos e as lacunas de teste: `mp-connect` forjável, perda do token girado identificada, tarefa presa, estados antigos sem limpeza, leitura do `invalid_grant`, caso entre lojas, 401 na criação e logs.
- **Risco aceito no MVP:** um dono mal-intencionado pode enviar o próprio link de autorização a outra pessoa e ligar a conta dela à loja dele. O efeito se limita a criar cobranças que pagam para essa pessoa, sem acesso a dados nem a tokens. Mitigação futura: mostrar ao dono a conta conectada.
- **Validações locais (em série) sobre o código final:** typecheck shared, API e mobile sem erros; shared 18 arquivos 175/175; API (PGlite) 58 arquivos 729/729; mobile 81 arquivos 665/665. Migrações: 15. **CI:** [44388565569](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44388565569) em `fdba155` **falhou** no PostgreSQL. Foram 10 testes de renovação: um `Date` passado dentro de `sql` bruto, que o postgres.js recusa e o PGlite aceitava. A correção passou o instante como texto `::timestamptz`, em `20f0490`. [44389654210](https://github.com/romulosutil/prisma-pdv-app/actions/runs/44389654210) em `20f0490`: **success**. Deploy não executado.
- **NÃO VERIFICADO (depende da aplicação real e de contas de teste):**
  - o fluxo OAuth com um vendedor de teste;
  - o `test_token`;
  - se a configuração do PKCE bate com a do painel;
  - se o `APRO` aprova com o token OAuth;
  - se os pedidos criados com o token de cada lojista geram aviso no webhook da plataforma (a reconciliação cobre se não gerarem);
  - o conteúdo do `mp-connect`;
  - os itens que já estavam pendentes no CP 164.
- **Próximo passo:**
  1. **Você cria uma única vez a aplicação da plataforma** no painel de desenvolvedor do Mercado Pago: endereço de retorno https, webhook `/webhooks/pdv-mercadopago` com o evento Order, e PKCE conforme `PDV_MP_OAUTH_PKCE`.
  2. **Você cria um vendedor de teste** e informa as credenciais da aplicação no ambiente, sem colar na conversa.
  3. O OAuth precisa de um endereço https público: um túnel para a API local ou um deploy de homologação, este só com autorização.
  4. Depois disso, rodar a homologação.
  5. As telas esperam o pacote de design.

<a id="cp-166-mvp-redefinido-como-play-aberta-e-prompts-reduzidos-a-tres-19112026"></a>

## CP 166 — MVP redefinido como Play aberta e prompts reduzidos a três (19/11/2026)

- **Data:** 19/11/2026, 00h26, America/Sao_Paulo. Continua o [CP 165](#cp-165-n2-conectar-com-mercado-pago-oauth-no-servidor-e-gateways-do-lojista-18112026).
- **Decisão do usuário:** o MVP é o app **publicado na Google Play e aberto a todos**, com 3 lojistas ajudando a melhorar. Exige as funções de PDV prometidas, os pagamentos integrados do lojista e a **cobrança da assinatura no app**. A cobrança pode estrear em modo gratuito por configuração e ser ligada depois. Execução por um Opus orquestrador com vários subagentes.
- **Construído:** [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md) reescrito com 3 prompts:
  1. **Produto completo:** direção visual, InfinitePay, Play Billing com modo gratuito, manuais identificados, integração do design, telas de pagamento e paywall, versão, deploy e pagamentos de R$ 1,00 no aparelho.
  2. **Publicar na Play:** regra do teste fechado, ficha, assinatura com testador de licença e lançamento gradual.
  3. **Rodada do MVP:** repetível, com monitoramento, correções, ligar a cobrança e aceite.
  As regras caíram para 6. P1 (Play Billing) e P2 (publicação aberta) passam a fazer parte do MVP. A regra "não mexer em telas até o pacote de design estar integrado" vira a ordem das ondas do prompt 1.
- **Atenção:** se a conta da Play for pessoal e criada depois de 13/11/2023, a produção pode exigir teste fechado com 12 testadores por 14 dias. O prompt 2 confere a regra atual antes de orientar.
- **Limites:** somente documentação, sem código, deploy ou ação em aparelho. As alterações sem commit da sessão de design (CPs 162 e 163 e a linha de F18 no roadmap) foram preservadas.
- **Complemento no mesmo dia (Console lido pelo agente no Chrome do usuário e respostas do usuário):** conta da Play **pessoal**, criada em 29/10/2026, sem apps, com perfil para pagamentos sem forma de recebimento; status de comerciante e registro do pacote pendentes. Isso exige **teste fechado com 12 testadores por 14 dias**, e o usuário vai juntar 12 conhecidos. O teste fechado passou para o **início do prompt 1**, com o AAB atual. Decisões: design **B · Solar Balcão**; fiado no checkout (P3) no backlog; comerciante com o CNPJ do usuário, se aceito na conta pessoal, senão só Brasil; cobrança **Free + Pago**, estreando gratuita, com as regras ainda em definição; Mercado Pago e InfinitePay integrados, Point só se for Smart ou Pro, Stone e outras manuais identificadas.
- **Próximo passo:** sessão nova em Opus 5.5 com o prompt 1, começando pelo app e pelo teste fechado no Console.

<a id="cp-167-etapa-0-ativos-da-play-store-roteiro-de-teste-fechado-e-auditoria-de-lacunas-19112026"></a>

## CP 167 — Etapa 0: ativos da Play Store, roteiro de teste fechado e auditoria de lacunas (19/11/2026)

- **Data e etapa:** 19/11/2026, 01h26 (America/Sao_Paulo). Etapa 0 do Prompt 1 (`docs/prompts-sessoes-entrega.md`), continua o [CP 166](#cp-166-mvp-redefinido-como-play-aberta-e-prompts-reduzidos-a-tres-19112026).
- **Decisões confirmadas pelo usuário nesta sessão:**
  1. **Etapa 0 (AAB inicial):** gerar agora o AAB `0.1.19` (`versionCode 20`, com o usuário digitando a senha do keystore no terminal) para enviar ao Teste Fechado, mantendo `packages/shared` e `apps/mobile` limpos na `0.1.19` até a geração desse AAB.
  2. **Etapa 1b (Free + Pago):** deixar limites e preço configuráveis no catálogo `PLANOS` (`packages/shared/src/planos.ts`), com **Free como padrão para todos** e **cobrança desligada por configuração no servidor** (`modo gratuito` como padrão).
  3. **Etapa 1c (Maquininhas e pagamentos):** aceitar cartão, Pix e tudo que for padrão de InfinitePay, Mercado Pago e Stone (Mercado Pago Pix + suporte opcional a Point Smart/Pro; InfinitePay Checkout Integrado com `payment_check` e estorno/InfiniteTap manuais identificados; Stone e outras maquininhas como confirmação manual identificada com o motivo documental).
- **Construído (sem alterar `packages/shared`, `apps/api` nem `apps/mobile` para preservar o build `0.1.19`):**
  - `scripts/gerar-assets-solar-balcao.mjs`: gerador reproduzível dos ativos da marca **B · Solar Balcão** (com flag `--apenas-play-store` para não tocar `apps/mobile/assets/` antes do AAB `0.1.19`).
  - `builds/play-store/` (ignorado pelo git): `icon-play-512.png` (`512×512` RGB opaco), `feature-graphic-1024x500.png` (`1024×500` RGB opaco) e duas capturas de telefone (`captura-01-inicio.png`, `captura-02-vender.png`, `780×1688` RGB).
  - [Roteiro completo de Teste Fechado no Play Console e Auditoria de Lacunas](play-console-teste-fechado.md): guia passo a passo para criação do app (`br.com.pdv.mobile`), verificação de desenvolvedor, ficha mínima, segurança dos dados, classificação, envio do AAB `0.1.19`, lista de testadores fora do repositório, mensagem curta com link de opt-in e inventário das lacunas em cadastro, primeira venda, caixa, estoque, fiado, equipe, lojas, relatórios, suporte e assinatura.
- **Validações:**
  - **Produção externa (`https://aladdin-pdv-api.jicnzg.easypanel.host`):** `node scripts/verificar-operacao.mjs` **7/7 PASS** (`/saude` 200 com `x-pdv-agora`, `/privacidade`, `/exclusao-de-conta` e `/termos` 200 HTML com `contato@prumo.services`, `/suporte/*` 401, `/dev/*` 404); `/auth/cadastro/configuracao` respondeu `{"versaoContrato":1,"verificacaoEmail":true,"verificacaoAntecipada":true}`.
  - **Cópia curta `C:/p`:** sincronizada sem divergência de arquivos contra `apps/mobile/{app,src}` e `packages/shared/src`.
  - **Ativos Play Store:** dimensões e modo RGB (sem transparência) verificados por Python PIL e inspeção visual direta de `icon-play-512.png` e `feature-graphic-1024x500.png`.
- **Pendências da Etapa 0 (dependem da ação do usuário):**
  - Gerar `builds/pdv-producao-0.1.19-aab.aab` (`pwsh scripts/build-android.ps1 -Perfil producao -Aab -Keystore ... -Alias ...`), criar o app no Play Console, publicar na faixa de Teste Fechado, digitar os 12+ e-mails dos testadores no Console e enviar a mensagem de opt-in.
  - Informar a **data em que o 12º testador entrar** para registrar aqui e calcular a data prevista (+14 dias corridos) para pedir acesso à produção.
- **Próximo passo:** usuário gera o AAB `0.1.19` e inicia o Teste Fechado; assim que o AAB estiver gerado (ou liberado pelo usuário para modificar o código), iniciar em paralelo a **Etapa 1** (`1a` InfinitePay + Point/Manual no Sync, `1b` Google Play Billing Free + Pago no servidor e pacotes).

<a id="cp-168-etapa-1-infinitepay-google-play-billing-e-manuais-no-servidor-19112026"></a>

## CP 168 — Etapa 1: InfinitePay Checkout Integrado, Google Play Billing (Free + Pago) e pagamentos manuais identificados no shared e na API (19/11/2026)

- **Data e etapa:** 19/11/2026, 02h10 (America/Sao_Paulo). Etapas 1a, 1b e 1c do Prompt 1 (`docs/prompts-sessoes-entrega.md`), continua o [CP 167](#cp-167-etapa-0-ativos-da-play-store-roteiro-de-teste-fechado-e-auditoria-de-lacunas-19112026) no branch `codex/pdv-homologacao-real` (sem commit ainda).
- **O que foi construído:**
  - **`@pdv/shared` (`packages/shared/src/`):**
    - `rotulos.ts` + exportação em `index.ts`: rótulos legíveis (`rotuloPapel`, `ROTULOS_TIPO_MOVIMENTO_CAIXA`, `rotuloTipoMovimentoCaixa`, `CATEGORIAS_MOVIMENTO_CAIXA`, `rotuloCategoriaMovimento`, `codigoCurto`, `MOTIVOS_CONFIRMACAO_MANUAL`).
    - `tokens.ts`: arquitetura de 3 camadas (**B · Solar Balcão**, `primitivos`, `semanticos` `claro`/`escuro`, `espacoTokens`, `layoutTokens`, `movimentoTokens`, `bordaTokens`, `opacidadeTokens`, `camadaTokens`, `janelaTokens`), `ink3: '#5C5973'`, estilo `codigo` e `maxScale` por estilo mantendo exportações legadas.
    - `planos.ts`, `assinatura.ts`, `licenca.ts`: planos configuráveis **Free + Pago** (`PLANOS_DISPONIVEIS = ['free', 'pro']`, `PLANO_PADRAO = 'free'`, `Free` gratuito 500 produtos / 1 aparelho / 1 operador / 1 loja / 90 dias sem limite de vendas e `Pro` a R$ 49,90 configurável via `configurarPlano`/`restaurarPlanosPadrao`).
    - `capacidades.ts` e `contrato.ts`: `PAGAMENTOS_INTEGRADOS_HABILITADOS = true`, `ProvedorPagamentoSchema` incluindo `'stone'` e `'outro'`, `ConfirmacaoPagamentoSchema` (`'manual' | 'integrado' | 'aparelho'`), metadados opcionais (`confirmacao`, `identificadorExterno`, `maquininha`) em `PagamentoVendaSchema`, schemas da InfinitePay (`ConectarInfinitePayReqSchema`, `ConexaoInfinitePaySchema`, suporte em `CriarCobrancaPixReqSchema`/`CobrancaPixSchema`) e schemas de Play Billing (`ConfirmarCompraPlayReqSchema`, `RestaurarCompraPlayReqSchema`, `ConfiguracaoCobrancaResSchema`).
  - **`@pdv/api` (`apps/api/src/` e `apps/api/drizzle/`):**
    - `db/schema.ts` e migração `drizzle/0015_remarkable_korvac.sql` (+ `scripts/zerar-conta-teste-producao.sql`): tabelas `detalhes_pagamentos_venda` e `assinaturas_play`, além de suporte a `infinitepay`, `stone`, `outro` e campos de link Checkout/NSU/slug.
    - **Etapa 1a (InfinitePay):** `pagamentos/infinitePay.ts`, `servicos/cobrancasInfinitePay.ts` e rotas `GET/PUT/DELETE /pagamentos/infinitepay/conexao`, criação idempotente / polling / cancelamento unificados em `/pagamentos/cobrancas*`, webhook `POST /webhooks/pdv-infinitepay/:conexaoPublicaId` que **nunca confia no payload recebido** e consulta sempre `POST /payment_check` no servidor, além da conciliação em `servicos/cobrancasPix.ts`.
    - **Etapa 1b (Google Play Billing):** `pagamentos/googlePlayBilling.ts`, `servicos/assinaturaPlay.ts`, `configuracao.ts` (`BILLING_PROVIDER` aceitando `'google_play'` inclusive em produção, com `'disabled'` como padrão sem alterar binário), rotas públicas `GET /assinatura/configuracao` e `POST /webhooks/pdv-google-play` (RTDN com ordenação por `eventTimeMillis` e idempotência), rotas privadas `POST /assinatura/google-play/confirmar` (validando e enviando acknowledge dentro de 3 dias), `/restaurar` e `/gratuito`, e criação inicial no plano `Free` quando `BILLING_PROVIDER=google_play` em `rotas/conta.ts`.
    - **Etapa 1c (`servicos/sync.ts`):** aceitação de pagamentos manuais identificados (`null`, `stone`, `outro` ou `confirmacao: 'manual'`, fora Tap), InfiniteTap confirmado no aparelho (`confirmacao: 'aparelho'` com `identificadorExterno`), e cobranças integradas validadas do Mercado Pago e InfinitePay, com persistência e round-trip de metadados em `detalhes_pagamentos_venda`.
- **Validações locais e resultados (todos em simulação/PGlite, sem deploy nem chamadas externas reais):**
  - `npm run typecheck --workspace=@pdv/shared` e `npm test --workspace=@pdv/shared`: **PASS**, 20 arquivos / 184 testes.
  - `npm run db:generate --workspace=@pdv/api`: **PASS**, migração `0015_remarkable_korvac.sql` gerada (35 tabelas no snapshot).
  - `npm run typecheck --workspace=@pdv/api` e `npm test --workspace=@pdv/api` (incluindo novas suítes `test/pagamentosInfinitePay.test.ts`, `test/assinaturaGooglePlay.test.ts` e expansão de `test/syncPagamentosManuais.test.ts`, com `vitest.config.ts` em `testTimeout: 15000` para suportar PGlite com 16 migrações em paralelo): **PASS**, **60/60 arquivos, 735/735 testes aprovados**.
- **Limitações / pendências:**
  - InfinitePay Checkout/`payment_check`, Google Play Developer API (`subscriptionsv2`) e RTDN ainda foram testados apenas contra provedores simulados locais; validação externa com R$ 1,00 real, licenças Google Play e deploy autorizado ficam após a Etapa 2/3.
  - Interface mobile e estilos das páginas públicas (Etapa 2) ainda não integrados.
- **Próximo passo:** executar a **Etapa 2** (`paginasPublicas.ts` + pacote visual **B · Solar Balcão**, correções F18/Etapa 0 e novas telas de maquininhas, Pix/Cartão MP & InfinitePay e assinatura Google Play Billing em `apps/mobile`).

<a id="cp-169-etapa-2-design-solar-balcao-maquininhas-pagamentos-e-play-billing-no-mobile-19112026"></a>

## CP 169 — Etapa 2: Design B · Solar Balcão, correções F18 e telas de maquininhas, pagamentos e Google Play Billing no mobile (19/11/2026)

- **Data e etapa:** 19/11/2026, 02h32 (America/Sao_Paulo). Etapa 2 do Prompt 1 (`docs/prompts-sessoes-entrega.md`), continua o [CP 168](#cp-168-etapa-1-infinitepay-google-play-billing-e-manuais-no-servidor-19112026) no branch `codex/pdv-homologacao-real` (sem commit ainda).
- **O que foi construído:**
  - **Onda W0 (Ativos e páginas públicas):** `scripts/gerar-assets-solar-balcao.mjs` executado gerando os ícones/splash **B · Solar Balcão** em `apps/mobile/assets/*.png`; `apps/api/src/rotas/paginasPublicas.ts` estilizado com a paleta Solar Balcão (`#F4F2EE`, `#FFFFFF`, `#14112B` e `@media (prefers-color-scheme: dark)`).
  - **Onda W1–W2 (Tokens, átomos e F18 `360dp + fontScale 2.0`):** `apps/mobile/src/tema/index.ts`, `Texto.tsx`, `TelaBase.tsx`, `BarraInferior.tsx`, `TecladoNumerico.tsx`, `Scanner.tsx`, `Banner.tsx`, `StatusPill.tsx`, `Campo.tsx`, `LinhaLista.tsx`; novos componentes `Cartao.tsx`, `CartaoSelecao.tsx`, `EstadoVazio.tsx`, `CodigoCurto.tsx` e `Divisor.tsx`; correções de responsividade/contraste/labels nas telas operacionais e onboarding (`criar-conta`, `entrar`, `pagamentos`, `planos`, `(tabs)/index`, `ajustes/index`, `ajustes/equipe`, `MovimentoDeCaixa`, `FecharCaixa`, `TurnosCaixa`, `DetalheVenda`, `Lojas`, `TelaDinheiro`, `TelaSucesso`).
  - **Onda W3–W4 (Maquininhas, pagamentos integrados/manuais e Play Billing UI):**
    - `apps/mobile/app/ajustes/maquininhas.tsx` e integração com `backend.ts`/`backendHttp.ts`: conexão OAuth Mercado Pago, handle InfinitePay e orientação explícita de Stone/Point/manuais.
    - `apps/mobile/src/telas/pagar/{TelaPix,PixDinamico,PixEstatico,TelaPixPago,TelaCartao,rotulos}.tsx` e persistência em `dados/{tipos,vendas,carrinhoDuravel,sqlite/checkoutSqlite}.ts`: Pix dinâmico MP/InfinitePay com QR e polling a cada 3s, checkout integrado InfinitePay para cartão/Pix e confirmação manual identificada (`stone`, `outro`, `InfiniteTap`) com NSU/motivo documental.
    - `apps/mobile/src/servicos/playBilling.ts` e atualização de `servicos/assinatura.ts`, `util/planos.ts`, `app/(onboarding)/planos.tsx`, `app/(tabs)/ajustes/assinatura.tsx` e `app/bloqueio.tsx`: planos Free + Pro com suporte a Google Play Billing, botão "Restaurar compra" e preservação de leitura/exportação em `suspensa`.
- **Validações locais (todos em simulação/testes automatizados, sem Android físico nem chamadas externas reais):**
  - `npx --workspace=@pdv/api vitest run test/paginasPublicas.test.ts`: **PASS**, 6/6 testes.
  - `npm run typecheck --workspaces`: **PASS** nos 3 workspaces (`@pdv/api`, `@pdv/mobile`, `@pdv/shared`).
  - `npm test --workspace=@pdv/mobile` (incluindo nova suíte `test/solarBalcaoEtapa2.test.ts` e atualização de `fase1Interface.test.ts`, `cupons.test.ts`, `util.test.ts`): **PASS**, **82/82 arquivos, 668/668 testes aprovados**.
- **Limitações / pendências:**
  - Falta gerar a versão `0.1.20` (`versionCode 21`), rodar a regressão conjunta nos 3 workspaces, sincronizar `C:/p`, commitar/enviar ao CI (Etapa 3) e validar em aparelho Android físico (F18 real, R$ 1,00 MP/InfinitePay, Play Billing com testador de licença).
- **Próximo passo:** executar a **Etapa 3** (`apps/mobile/app.json` em `0.1.20` / `21`, espelhamento `C:/p`, regressão completa dos 3 workspaces, `CP 170`, commit, `git push` e acompanhamento do CI).

<a id="cp-170-etapa-3-versao-0120-regressao-completa-e-preparo-ci-19112026"></a>

## CP 170 — Etapa 3: versão 0.1.20 (versionCode 21), sincronização de C:/p e regressão completa nos três workspaces (19/11/2026)

- **Data e etapa:** 19/11/2026, 02h39 (America/Sao_Paulo). Etapa 3 do Prompt 1 (`docs/prompts-sessoes-entrega.md`), continua o [CP 169](#cp-169-etapa-2-design-solar-balcao-maquininhas-pagamentos-e-play-billing-no-mobile-19112026) no branch `codex/pdv-homologacao-real`.
- **O que foi construído:**
  - `apps/mobile/app.json`: versão elevada para `"0.1.20"` (`versionCode: 21`).
  - `apps/api/vitest.config.ts`: ajuste de `testTimeout` e `hookTimeout` para `30_000` para suportar PGlite com 16 migrações abrindo/fechando banco em disco durante a execução paralela (`test/limitesAuth.test.ts`).
  - Cópia curta `C:/p`: sincronizada e conferida por SHA256 contra o repositório (`303` arquivos em `apps/mobile/{app,src,assets,config}` e `packages/shared/src` + `6` arquivos de configuração, sem obsoletos ou divergências).
- **Validações locais completas executadas após a edição final (ambiente local simulado/SQLite/PGlite, sem deploy, AAB ou dispositivo físico):**
  - `npm run typecheck --workspaces`: **PASS** nos 3 workspaces (`@pdv/api`, `@pdv/mobile`, `@pdv/shared`).
  - `npm test --workspace=@pdv/shared`: **PASS**, **20/20 arquivos, 184/184 testes**.
  - `npm test --workspace=@pdv/api`: **PASS**, **60/60 arquivos, 735/735 testes**.
  - `npm test --workspace=@pdv/mobile`: **PASS**, **82/82 arquivos, 668/668 testes**.
  - `node --test scripts/test/*.test.mjs`: **PASS**, **9/9 testes** (`0` falhos, `0` ignorados).
  - `python -B -m unittest discover -s scripts/test -p "test_*.py"`: **PASS**, **57/57 testes**.
  - `node scripts/homologar-local.mjs`: **OK** contra API local descartável (`Equipe F08` 37 PASS/1 SKIP, `Equipe F13` 25 PASS/1 SKIP, `Equipe troca de aparelho` 23 PASS/1 SKIP, `Gestão F14` 162 PASS/4 SKIP; `0` FAIL / `0` INCONCLUSIVO; SKIPs referentes aos limites conhecidos já registrados).
  - `git diff --check`: **PASS**.
- **Limitações / pendências (dependem de ação/autorização do usuário ou execução externa):**
  - CI remoto no GitHub Actions (`PDV CI and Deploy` em PostgreSQL 17 e container Docker) será disparado logo após o commit/push deste lote.
  - Deploy da API com a migração `0015_remarkable_korvac.sql` em homologação e produção (exige autorização do usuário e conferência de backup prévio).
  - Geração do AAB de produção `0.1.20` (`versionCode 21`) com a senha do keystore digitada pelo usuário no terminal (`scripts/build-android.ps1 -Perfil producao -Aab`).
  - Conexão do aparelho Android via USB e autorização para testes reais de R$ 1,00 (Mercado Pago OAuth + Pix, InfinitePay Checkout/InfiniteTap, Stone manual identificado) e conferência visual Solar Balcão / F18 no aparelho.
  - Registro da data de entrada do 12º testador no Teste Fechado no Play Console (para contabilizar os 14 dias antes do Prompt 2).
- **Próximo passo:** gravar commit no branch `codex/pdv-homologacao-real`, executar `git push`, rodar e acompanhar o CI no GitHub Actions (`PDV CI and Deploy`) e aguardar autorizações/ações do usuário para deploy, AAB `0.1.20` e testes reais no aparelho.
