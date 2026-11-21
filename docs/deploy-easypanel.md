# PDV no EasyPanel

Destino autorizado: projeto existente `aladdin`, serviços próprios `pdv-api` e `pdv-postgres`. O modo inicial é uso real sem cobrança de assinatura, autorizado em30/10/2026. Não copiar bancos/dados das demos locais.

## Aplicação e banco

- PostgreSQL17 com volume persistente, banco/usuário próprios e porta5432 somente na rede interna. Copiar a URL interna gerada para DATABASE_URL do serviço API, sem expor senha em logs ou commits.
- Fonte da API: repositório `romulosutil/prisma-pdv-app`, branch `codex/pdv-deploy`, contexto `/`, builder Dockerfile da raiz. Desativar o auto deploy nativo para evitar pular o CI ou disparar implantação duplicada.
- Runtime Node24, usuário node e porta interna3333. A imagem instala somente dependências de produção da API/shared; tsx é dependência de runtime, e shared continua como fonte TypeScript. Drizzle aplica migrações no início, antes de servir tráfego.
- Configurar domínio HTTPS do serviço para HTTP interno3333. /saude executa SELECT1 no banco; o healthcheck da imagem usa essa rota. Não publicar porta do PostgreSQL.
- Iniciar com uma réplica. Fazer backup antes de mudanças de schema e manter cópia fora da VPS com restauração testada. Backup não é considerado configurado apenas pela existência do volume.

## Ambiente da API

Preencher segredos diretamente no ambiente do serviço. Os marcadores abaixo não são valores executáveis.

```dotenv
NODE_ENV=production
PORT=3333
BILLING_PROVIDER=disabled
JOBS=on
DATABASE_URL=<CONEXAO_INTERNA_POSTGRES>
EMAIL_CODIGO_MODE=smtp
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_MODE=tls
SMTP_USER=resend
SMTP_PASSWORD=<API_KEY_RESEND>
SMTP_FROM=acesso@prumo.services
EMAIL_CODIGO_KEY_ID=producao-v1
EMAIL_CODIGO_KEYS={"producao-v1":"<32_BYTES_ALEATORIOS_EM_BASE64>"}
# Pagamentos integrados (migrações 0013–0015; sem elas, rotas de pagamento respondem 503 sem impedir a partida)
PDV_API_PUBLIC_URL=https://aladdin-pdv-api.jicnzg.easypanel.host
PDV_PAGAMENTOS_CHAVE=<32_BYTES_ALEATORIOS_EM_BASE64>
PDV_MP_PAYER_EMAIL=<EMAIL_PADRAO_PAGADOR_PIX>
PDV_MP_CLIENT_ID=<CLIENT_ID_APP_MERCADO_PAGO>
PDV_MP_CLIENT_SECRET=<CLIENT_SECRET_APP_MERCADO_PAGO>
PDV_MP_REDIRECT_URI=https://aladdin-pdv-api.jicnzg.easypanel.host/pagamentos/mercadopago/oauth/retorno
PDV_MP_WEBHOOK_SECRET=<SEGREDO_WEBHOOK_APP_MERCADO_PAGO>
PDV_MP_OAUTH_PKCE=true
# Google Play Billing (trocar BILLING_PROVIDER=google_play quando ativar a assinatura sem novo binário)
PDV_PLAY_PACKAGE_NAME=br.com.pdv.mobile
PDV_PLAY_SKU_PRO=prisma_pro_mensal
PDV_PLAY_WEBHOOK_TOKEN=<TOKEN_PUBSUB_RTDN_GOOGLE_PLAY>
PDV_PLAY_SERVICE_ACCOUNT_JSON=<JSON_CONTA_SERVICO_ANDROID_PUBLISHER>
# Revisão Google Play (opcionais e definidas juntas; PIN reutilizável fora do repositório)
PDV_PLAY_REVIEW_EMAIL=<EMAIL_CONTA_REVISAO_PLAY>
PDV_PLAY_REVIEW_CODE=<PIN_6_DIGITOS_REVISAO_PLAY>
```

Não definir JOBS=off: isso também desliga envio de códigos. Com `BILLING_PROVIDER=disabled`, só o worker de e-mail e a conciliação de pagamentos são agendados (quando configurados); trocar `BILLING_PROVIDER` para `google_play` ativa o modo Free + Pro pela Play Store sem novo binário. Preservar a chave de cifra entre deploys; ela é independente da API key e necessária para mensagens pendentes e credenciais de pagamento cifradas. O ambiente production exige PostgreSQL e SMTP válidos e não publica /dev, não usa relógio controlável e não devolve OTP em respostas.

**Migrações `0013`–`0015` (pagamentos integrados e Play Billing):** antes de ligar pagamentos reais dos lojistas ou assinatura paga em produção, configurar `PDV_PAGAMENTOS_CHAVE`, `PDV_MP_PAYER_EMAIL`, as credenciais OAuth/Webhook do Mercado Pago e, para Play Billing, `PDV_PLAY_WEBHOOK_TOKEN` e `PDV_PLAY_SERVICE_ACCOUNT_JSON` (ou `PDV_PLAY_SERVICE_ACCOUNT_EMAIL` + `PDV_PLAY_PRIVATE_KEY`) diretamente no painel do EasyPanel. Sem essas variáveis opcionais, a API sobe normalmente: `GET /assinatura/configuracao` responde `200` com `canal: "disabled"` / `modoGratuito: true`, enquanto as rotas protegidas de pagamento respondem `503`.

Novas contas ganham assinatura `liberada`, sem cartão, gateway ou faturas. Não é pagamento aprovado nem teste grátis. A sincronização renova a licença offline por sete dias. A gratuidade não se converte em assinatura paga ao mudar a configuração; contas liberadas não podem ser cobradas pelos endpoints atuais. Futura migração exige implementação específica e consentimento. O catálogo e recursos preexistentes não representam homologação de integrações de pagamento.

## CI e deploy automático

`.github/workflows/pdv.yml` roda em PR para main e push main: npmci, tipos, testes shared/API/mobile em série com um worker, API com PostgreSQL descartável `pdv_test`, e build da imagem.

Após sucesso de um push main, ou quando `workflow_dispatch` é disparado explicitamente com `deploy_producao=true`, o job de deploy promove o SHA testado para `codex/pdv-deploy` sem force push e chama o webhook secreto do EasyPanel. Isso impede o serviço de buscar código que ainda não passou na validação em PostgreSQL 17. PRs e `workflow_dispatch` com padrão `deploy_producao=false` somente validam. Falta de segredo, URL sem HTTPS, promoção recusada ou resposta HTTP de erro falham o job.

Configurar `EASYPANEL_DEPLOY_URL` em GitHub → Settings → Secrets and variables → Actions, com o Deployment Trigger URL do serviço pdv-api por HTTPS. O token desse endereço autoriza deploy: não compartilhar nem versionar. O GITHUB_TOKEN recebe contents:write apenas no job de promoção. A Actions precisa ter permissão para atualizar a branch de entrega; caso a política da organização negue, um administrador deve ajustar essa permissão.

O job confirma que o painel aceitou o pedido de implantação. A disponibilidade final deve ser conferida em /saude e nos logs do serviço; aceitação do webhook não comprova container saudável. Rollback requer escolher um commit validado anterior; nunca executar force push ou reverter dados automaticamente.

## Aplicativo

Gerar o aplicativo com EXPO_PUBLIC_API_URL no endereço HTTPS da API e ferramentas de teste desativadas. Nenhum segredo SMTP/banco/chave de cifra entra no app. Confirmar cadastro, sessão por e-mail, venda manual, sync, fechamento, logout e recuperação no dispositivo antes de ampliar a operação. O deploy de API não gera nem homologa um APK automaticamente.

## Evidências

Atualização 03/11/2026: somente `pdv-api-homologacao` passou à branch exclusiva `codex/pdv-homologacao-real`, auto deploy desativado, candidato `a987c31`. CI 41574379311 aprovado em PostgreSQL 17/SQLite, tipos e imagem/isolamento. Saúde, hora precisa, suporte e sete grupos de smoke financeiro HTTP passaram após implantação. Backups pré-deploy e schema R5 confirmados no Local Disk. Produção e variáveis sensíveis preservadas; atualização opcional de identificação do catálogo foi recusada pela revisão automática por exigir substituição do ambiente completo. Essa rodada não conclui restauração R5, Android físico nem aceite humano. Ver [CP 032](checkpoints-roadmap.md#cp-20261103-032-ci-da-hora-real-e-backup-r5-aprovados) e [CP 033](checkpoints-roadmap.md#cp-20261103-033-fluxo-financeiro-externo-aprovado).

Decisão de escopo de 01/11/2026: cópia externa e alertas de falha de backup/saúde ficam no backlog após a validação do produto. Os backups locais e healthchecks existentes são preservados; essas melhorias deixam de bloquear o MVP. Nenhum novo serviço, destino ou canal foi criado na inspeção desta rodada. Serviços do PDV usam o prefixo `pdv-`. Ver [CP 003](checkpoints-roadmap.md#cp-20261101-003-foco-no-mvp-e-backlog-operacional).

Atualização 01/11/2026 — R0: ambos os domínios responderam `/saude` 200 com HTTPS válido. Produção e homologação executam `bc786bc86abac934754ee1dd35d8524f9c04c9c1`, aprovado no CI. Foram criados `pdv-api-homologacao` e `pdv-postgres-homologacao`, com banco e chave de cifra próprios e sem cópia das demos. O APK 0.1.5 aponta para homologação e instala em pacote separado. Backup diário configurado e **restauração aprovada em banco isolado**: 24 tabelas e 38 registros iguais à origem; destino temporário desativado após a conferência. O armazenamento é Local Disk; cópia externa e alertas continuam pendentes. Ver [teste de restauração](r0-restauracao-backup.md) e [R0 — API e APK conectado](r0-api-apk-conectado.md).

Estado de implantação, CI, backup e smoke externo será registrado após execução. A existência deste roteiro não comprova essas etapas.

Preparação local revisada em30/10/2026: parecer independente PASS para AC1–10, sensor7/7 e relatório em `.specs/features/easypanel-sem-cobranca/validation.md`. Usuário confirmou login HTTPS e autorizou transferir somente a credencial SMTP e chaves de cifra locais para pdv-api e conectar o banco exclusivo. Ambiente foi salvo por HTTPS, com billingdisabled e JOBSon, sem exposição dos valores. Segredo EASYPANEL_DEPLOY_URL foi gravado no GitHub Actions e o arquivo temporário de transferência removido. Isso ainda não comprova implantação ativa nem novo envio Resend.
