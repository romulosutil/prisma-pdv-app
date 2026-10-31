# Validação independente — acesso sem cobrança e EasyPanel

## Validation: PASS — AC1–11, com limites explícitos das evidências externas

Data: 2026-10-30, America/Sao_Paulo. Verifier independente, autor diferente do implementador.
Escopo local original: commits dc52172, 76ded23 e 2e223dc; base 4c152f2. A correção paralela de fixture de8fc6f integra o checkout, mas não foi atribuída à feature. Fechamento remoto independente em2026-10-31T02:58:08Z: SHA publicado bc786bc86abac934754ee1dd35d8524f9c04c9c1. `git diff --name-only 2e223dc..bc786bc` nas fontes API/shared/mobile/app, workflow, Dockerfile e .dockerignore retornou vazio; não se repetiram suítes ou sensor.

**CI e implantação concluídos dentro do escopo da feature.** O Verifier confirmou diretamente o CI, as refs remotas e a saúde/guardas públicas por HTTPS. Persistência/privacidade PostgreSQL e preservação dos serviços anteriores são sustentadas pelas observações administrativas do gestor; capturas de runtime/publicação/backup foram inspecionadas pelo Verifier e são identificadas abaixo como evidência de autoria do gestor. Este parecer não equivale a UAT Android, entrega SMTP externa, restauração de backup ou cópia offsite.

## Conclusão e limites

Nenhum defeito bloqueante de implementação identificado. A gratuidade é um estado persistido distinto de pagamento, o provider rejeita operações financeiras, e as cinco mutações comerciais ficam atrás de sessão, dono e bloqueio de cobrança. A troca futura da configuração não converte uma assinatura liberada para paga.

Os três passos do Execution Plan estão concluídos no escopo aprovado, incluindo CI remoto e implantação. Não existe tasks.md: o plano e os gates estão no spec.md.

## Evidências por critério

| AC | Resultado definido no spec | Evidência e assertion | Parecer |
| --- | --- | --- | --- |
| 1 | Produção aceita disabled explícito; rejeita mock/omitido e banco ausente | apps/api/test/acessoLiberado.test.ts:40 — `expect(validarConfiguracao(...)).toEqual({ ambiente: 'production', porta: 3333, databaseUrl: e.DATABASE_URL, billingProvider: 'disabled' })`; linhas41–42 — `toThrow('Nenhum provedor')` e `toThrow('DATABASE_URL é obrigatória')`. Matriz adicional em apps/api/test/configuracao.test.ts:9 verifica URLs/porta/ambiente inválidos. | PASS |
| 2 | Cadastro transacional persiste pro/liberada, sem cartão/gateway/fatura/verificação | apps/api/src/rotas/conta.ts:37 abre a transação; linha67 salva acesso e evento usando tx. apps/api/test/acessoLiberado.test.ts:53 — `toMatchObject({ assinatura: { planoId: 'pro', status: 'liberada', cartao: null }, ... })`; linha54 exige `clienteRef: null, cartaoFingerprint: null`; linhas55–56 exigem faturas vazias e somente `acesso_liberado_sem_cobranca`. Cadastro não chama billing; a fábrica é verificada separadamente. | PASS |
| 3 | Acesso após90dias, cobrança nula e janela offline7dias renovável | packages/shared/test/acessoLiberado.test.ts:10 — `expect(avaliar(a, depois)).toEqual(a)`; linhas11–12 — acesso true e cobrança null. Linhas18–22 exigem validade emissão+7, emissão correta, venda na fronteira7dias, recusa em8dias e nova licença válida. apps/api/test/acessoLiberado.test.ts:88 exige `resumo.cobrancas` e `resumo.erros` iguais0; linhas89–90 exigem faturas vazias e status liberada. | PASS |
| 4 | Cinco mutações retornam409/cobranca_desativada após autenticação/dono, sem efeitos | apps/api/test/acessoLiberado.test.ts:58 parametriza as cinco rotas; linha63 exige status409/código exato; linhas64–66 exigem zero chamadas de verificar/cobrar, assinatura idêntica e zero faturas. Linhas72–73 cobrem configuração alterada. apps/api/test/rotasDono.test.ts:84 exige403 antes de efeitos; linhas133–136 exigem401 e snapshot/provider intactos. Ordem explícita em apps/api/src/rotas/assinatura.ts:49 e apps/api/src/servidor.ts:90. | PASS |
| 5 | Venda manual aceita/persistida,401 sem sessão e404/dev em produção | apps/api/test/acessoLiberado.test.ts:78 — status200, `aceitas` exatamente `[m.id]`, `rejeitadas` vazias; linha79 exige id persistido; linha80 exige401; linha81 exige404 nas duas rotas/dev. Linha83 exige204/corpo vazio para código de conta inexistente. apps/api/src/servicos/sync.ts:50 inclui liberada na janela permitida. | PASS |
| 6 | Relógio real, e-mail ativo, cobrança não agendada e provider fechado | apps/api/test/bootstrapSemCobranca.test.ts:20 exige identidade `relogioSistema`, `cobrancaDesativada: true`, emissor email; linha21 verifica listen; linha22 exige email1vez/cobrança0vezes; linha23 verifica fechamento HTTP/banco. apps/api/test/acessoLiberado.test.ts:45 exige rejeição409/cobranca_desativada; linhas46–47 rejeitam cobrar/estornar. apps/api/test/emailSmtp.test.ts:105 exige validação TLS e TLSv1.2; linhas144–145 comprovam autenticação TLS local real e zero DATA na rejeição. | PASS |
| 7 | Cadastro aguarda sincronização; PDV/recebimentos/câmera sem paywall | apps/mobile/test/cadastroLiberado.test.ts:20 exige cadastro ainda pendente; linhas23–25 exigem busca única, assinatura/liberada/cartão null e licença liberada. apps/mobile/test/fluxoLiberado.test.ts:11–12 exigem rota null para PDV, pagamentos e câmera. apps/mobile/app/(onboarding)/loja.tsx:43 direciona liberada a pagamentos após criarConta. | PASS |
| 8 | Ajustes informa gratuidade e oculta ações comerciais; cartão redireciona | apps/mobile/test/acessoLiberadoTela.test.ts:32–34 exigem as mensagens de gratuidade e consentimento futuro; linha35 proíbe R$/próxima cobrança; linha36 exige zero botões comerciais. apps/mobile/test/fluxoLiberado.test.ts:15–18 exige redirecionamento de planos/cartão/bloqueio e banner null; linhas21–22 preservam conta e reautenticação. | PASS |
| 9 | Imagem pelo lockfile, API/shared/tsx/migrações, node e exclusões | Dockerfile:5–9 usa manifests/lockfile e npm ci; Dockerfile:19 seleciona node. .dockerignore:23–37 exclui .git, mobile, testes, dados e .env ao final. Inspeção executada na imagem sha256:30754f0ce8bf3e6b2e35dc473d57128fde9e64668117465b20311c43f972a13d: `assert.notEqual(process.getuid(), 0)` e uid1000; `assert.ok(fs.existsSync(p))` para tsx/drizzle/shared; `assert.ok(!fs.existsSync(p))` para .git/mobile/.env canário/.data/vitest/typescript/test. | PASS local |
| 10 | CI de PR/main, tipos/suítes seriais1worker/build, deploy somente push main após sucesso, secretHTTPS | .github/workflows/pdv.yml:3 define PR/main e push/main. Linhas44–64 executam npm ci, tipos, shared/API/mobile com maxWorkers1, build e assertions de isolamento. Linhas68–69 exigem `needs: validate` e push/refs/heads/main. Linhas80–88 exigem secret não vazio e HTTPS; linha91 promove exatamente GITHUB_SHA para codex/pdv-deploy sem force; linha95 chama curl com fail/timeouts/output descartado. Run41161659608 consultado independentemente: push/main, completed/success, ambos jobs/steps aprovados, SHA bc786bc86abac934754ee1dd35d8524f9c04c9c1; refs main e codex/pdv-deploy iguais a esse SHA. | PASS remoto |
| 11 | Serviço HTTPS saudável, PostgreSQL privado persistente e serviços anteriores preservados | Verifier executou `assert.equal(status,200)` e `assert.deepEqual(body,{status:'ok'})` em https://aladdin-pdv-api.jicnzg.easypanel.host/saude, com TLS validado e sem redirecionamento, em2026-10-31T02:58:08Z. Código de saúde em apps/api/src/servidor.ts:79 executa select1 no banco. Captura easypanel-pdv-publicado.jpg mostra pdv-api/pdv-postgres e serviços anteriores verdes. Gestor registrou PostgreSQL17alpine gerenciado, volume padrão persistente e ExposedPort0; relatou preservação da configuração dos serviços anteriores. Verifier não repetiu inspeção administrativa nem comparação integral de configurações; essa parte do critério usa evidência do gestor, discriminada abaixo. | PASS com evidência mista |

As assertions verificam resultados definidos no spec; não foram encontradas lacunas de precisão. A cobertura de autorização usa a suíte existente mais a ordem dos hooks da implementação; não se atribui uma nova matriz específica de operador/liberada que o teste não executa.

## Fechamento remoto: evidência independente e evidência do gestor

Evidência produzida diretamente pelo Verifier, sem alteração remota:

- [GitHub Actions run41161659608](https://github.com/romulosutil/prisma-pdv-app/actions/runs/41161659608): `gh run view --json` retornou completed/success, event push, headBranch main e headSha bc786bc86abac934754ee1dd35d8524f9c04c9c1. O job Types, tests and container terminou às02:53:31Z; Deploy validated main iniciou às02:53:33Z e terminou às02:53:38Z, ambos success. Tipos, três suítes, imagem, isolamento, checagem do segredo, promoção e trigger tiveram conclusion success. Logs do job de validação confirmam shared167/167 em14arquivos, API556/556 em37arquivos e mobile499/499 em52arquivos. São as contagens do commit publicado; não se confundem com a suíte local que incluía trabalho paralelo.
- `git ls-remote origin refs/heads/main refs/heads/codex/pdv-deploy`: ambas retornaram exatamente bc786bc86abac934754ee1dd35d8524f9c04c9c1.
- Quatro requisições HTTPS com fetch do Node, verificação TLS padrão habilitada, redirects proibidos e timeout20s: GET/saude200 com `{status:'ok'}`; GET/assinatura401/nao_autenticado; POST/dev/relogio/avancar404/rota_nao_encontrada; POST/dev/jobs/cobranca404/rota_nao_encontrada. Todas confirmadas entre02:58:08.392Z e02:58:08.523Z. Não foram criadas contas, solicitados códigos ou enviados e-mails. O navegador de pesquisa não conseguiu abrir o endpoint; a prova positiva é a conexão HTTPS direta do Node, sem desabilitar validação de certificado.
- SHA256 dos bytes do Gitblob `bc786bc:apps/api/src/configuracao.ts`:366647cc8acfa1d2d670701dc3bd94068afad17316fea3cdf07d47839dbaac5d. Coincide exatamente com o hash visível no runtime capturado. Este é o hash do blob com terminações de linha do Git; o hash do arquivo local na seção histórica abaixo difere por representação de checkout e não indica alteração do código publicado.

Evidência de autoria do gestor, inspecionada pelo Verifier:

- [Runtime VPS](C:/Users/Ronal/.codex/visualizations/2026/10/31/01a18faf-50cd-7f22-9e49-be640beb0122/easypanel-pdv-runtime.jpg): console do serviço aladdin/pdv-api exibe Nodev24.22.2, uid1000, environment production, billing disabled, jobs on, configSha256 igual ao Gitblob acima e SMTP_TLS=true. O comando visível faz handshake TLS com rejectUnauthorized=true; não transmite mensagem nem comprova autenticação SMTP/entrega de OTP. A execução foi feita pelo gestor, não pelo Verifier.
- [Serviço publicado](C:/Users/Ronal/.codex/visualizations/2026/10/31/01a18faf-50cd-7f22-9e49-be640beb0122/easypanel-pdv-publicado.jpg): pdv-api e pdv-postgres verdes em aladdin; prumo-automacoes e squadone-app também verdes. Logs mostram o trabalhador de e-mail ativo e resumos sem envios. Estar verde não é uma comparação integral de configurações; a preservação dessas configurações é observação administrativa relatada pelo gestor.
- [Backup manual](C:/Users/Ronal/.codex/visualizations/2026/10/31/01a18faf-50cd-7f22-9e49-be640beb0122/easypanel-pdv-backup.jpg): ação exibe Success às2026-10-31T02:57:05GMT, arquivo `aladdin/pdv-postgres/2026-10-31T02:57:04.835Z.sql.gz`, tamanho7.64kB. Prova criação do dump conforme a ação capturada; não prova restauração nem disponibilidade fora do disco da VPS.

Observações administrativas fornecidas pelo gestor, sem nova inspeção do painel por este Verifier: fonte codex/pdv-deploy persistiu após reload, auto deploy nativo está desligado; PostgreSQL17alpine gerenciado com volume padrão do EasyPanel e ExposedPort0; serviços anteriores preservados; backup Enabled1, cron `0 2 * * *`, retenção7, banco pdv e destino LocalDisk. A cópia local e o tamanho do dump não são garantia de recuperabilidade. A transferência autorizada de segredos por HTTPS foi realizada pelo gestor; o Verifier não leu seus valores.

## Gates locais históricos executados

- `rtk npm run typecheck`: PASS nos três workspaces.
- `rtk npm run test -w @pdv/shared -- --maxWorkers=1`:14arquivos,167testes aprovados,0falhas,0skips.
- API inteira, PostgreSQL dedicado local pdv_test, um worker:37arquivos,556testes. A primeira execução em cwd raiz com `--root apps/api` aprovou554 e falhou2 por ENOENT de `test/fixtures/email/key.pem` em emailSmtp.test.ts:122. Reexecução somente de emailSmtp.test.ts em cwd apps/api:36/36 aprovados. Assim, todos os556cenários foram aprovados no código inalterado, em execução ampla mais correção do comando afetado; não houve nova execução ampla redundante.
- A tentativa anterior de regressão API/PGlite foi interrompida após timeout5s em `emailFilaCodigo > persiste cifrado e limpa material ao aceitar`; não foi contabilizada como gate aprovado. API/PostgreSQL posterior cobre esse cenário e passou. Nenhuma alteração de assertion/timeout/código foi feita.
- Baseline direcionado do sensor: API12/12, shared2/2, mobile5/5; mesma cobertura repetida após o sensor:19/19 aprovados,0skips. A suíte mobile completa foi executada pelo implementador anteriormente; não foi repetida pelo Verifier.
- Imagem local inspecionada e assertions de isolamento executadas com sucesso. O build foi executado pelo implementador; o Verifier reutilizou a imagem local identificada acima. Health local retornou200.
- Não foram apagados testes. Diff mostra somente acréscimos de casos e ajustes explícitos de fixtures/snapshot; não há assertions removidas para fazer a feature passar. Contagens históricas exatas de toda a suíte antes da feature não foram reexecutadas, pois não se criou checkout/cópia. A suíte shared tinha2casos novos; os casos diretamente novos da feature somam19.

## Sensor de discriminação

Profundidade: caminho financeiro/autenticação, sete falhas comportamentais manuais. Configuração Vite/Vitest individual em TEMP importa os arquivos reais e retorna texto alterado pelo hook transform; nenhuma fonte ou teste foi editado, copiado ou restaurado. Não houve worktree, symlink/junction, stash ou alteração de infraestrutura.

| Mutante | Alvo | Falha injetada em memória | Evidência da morte |
| --- | --- | --- | --- |
| config | apps/api/src/configuracao.ts:38 | Remove recusa de produção com mock/omitido | acessoLiberado.test.ts:41 — `expected [Function] to throw an error`;1falha/12 |
| provider | apps/api/src/billing.ts:7 | Operação financeira resolve undefined em vez de rejeitar | acessoLiberado.test.ts:45 — `promise resolved undefined instead of rejecting`;1falha/12 |
| account | apps/api/src/rotas/conta.ts:65 | Desliga criação da assinatura liberada | Persistência/licença, preservação, venda e90dias falham;4falhas/12 |
| guard | apps/api/src/rotas/assinatura.ts:51 | Remove bloqueio de mutações financeiras | Status400/200 em vez de409 e código assinatura_existente em vez de cobranca_desativada;6falhas/12 |
| job | apps/api/src/iniciarApi.ts:55 | Agenda cobrança também em disabled | bootstrapSemCobranca.test.ts:22 — mock chamado1vez em vez de0;1falha/12 |
| offline | packages/shared/src/licenca.ts:32 | Estende licença de7para8dias | shared/test/acessoLiberado.test.ts:18 — data recebida1dia além da esperada;1falha/2 |
| route | apps/mobile/src/nucleo/fluxo.ts:34 | Remove desvio de navegação da assinatura liberada | fluxoLiberado.test.ts:15 — null em vez de `/`;1falha/5 |

**Resultado:7aplicados,7killed,0survived.** Cada execução válida registrou SENSOR_APPLIED para o arquivo esperado e erro de assertion comportamental, não erro de compilação/setup.

Uma tentativa inicial do harness foi invalidada porque o Vitest5 reutilizou cache persistente de transformação: um mutante não chegou a ser aplicado e uma baseline posterior leu transformação anterior. Esses resultados foram descartados. O cache foi limpo pelo comando oficial `vitest --clearCache`; a execução válida definiu `test.fsModuleCache=false`, `test.cache=false` e cacheDir em TEMP. A baseline final19/19 confirma ausência de efeito residual. Essa ocorrência é uma limitação operacional do harness, sem defeito identificado no produto.

## Integridade e alterações concorrentes

Baseline antes do sensor:

```text
 M .gitignore
 M .specs/STATE.md
 M .specs/features/checkpoint-apk/spec.md
 M README.md
 M apps/mobile/test/cupomTela.test.ts
?? apps/mobile/app.config.ts
?? apps/mobile/metro.config.cjs
?? apps/mobile/scripts/
?? apps/mobile/test/configuracaoApk.test.ts
?? docs/checkpoint-apk.md
```

Antes de escrever este relatório, o porcelain preservava todos esses itens e acrescentava alterações em docs/fases-e-checkpoints.md e docs/plano-implementacao-producao.md. A comparação SHA256 de todos os arquivos rastreados indicou mudança concorrente apenas nesses dois documentos e .specs/STATE.md. O Verifier não escreveu esses arquivos; não restaurou trabalho paralelo. O porcelain global não é idêntico por essa concorrência, portanto não se apresenta uma igualdade global fictícia. O sensor permanece isolado: seu conjunto de escritas é TEMP/cache descartável, e todos os hashes de fontes/testes da feature permaneceram iguais.

Hashes SHA256 de referência, idênticos antes/depois:

```text
apps/api/src/billing.ts e84ff82ec48d8e4aad04bcc77bc8a0620efb6e93637a70c00430bbc59de957d3
apps/api/src/configuracao.ts 082a30a95875895a4cb105f02833a6a52d14945f1a1bf59dfc20d80dee5964ab
apps/api/src/iniciarApi.ts 24f86cc64017b61226dda6eb28a17d599c7c7dc8597022ad63bfb9d728bb03b4
apps/api/src/rotas/assinatura.ts 5c04df883aea10779c265cfbd472769bd51a73b0e9b5bf3301f05492f617028c
apps/api/src/rotas/conta.ts b0a2b8910425584d05deb4c4c7f6ace71a73ffcebffb4802297aa2ef7132f45b
packages/shared/src/assinatura.ts 2df6de7325fc3523580f427c399a0e22a5fee7e4f550e7709df2725c7a5b9c8e
packages/shared/src/licenca.ts 414ed389f05d5541ce962962f2f0a53a99f82c699b7650f3a3d16e9d78ef4d81
apps/mobile/src/nucleo/fluxo.ts f4076a3e9da275ae2044a1709a6f6356c6a6554f452965ede4e69baf100b27b9
apps/api/test/acessoLiberado.test.ts 2aa96f363d9deb6b4902190b6314e23867fa1001fda2ad3da0feaa07f5a6c156
packages/shared/test/acessoLiberado.test.ts 6274eb4b136f56c5ad83efdad8e372c7a761e98124e715a064a16c6cbe9f338a
apps/mobile/test/acessoLiberadoTela.test.ts 01b7bca1b2258016bfcb8d0d674e4c30461a97cf70215163903980ed2caf071c
```

## Qualidade e pendências

Mudanças restritas ao fluxo solicitado, reutilizando padrões de domínio, licença, provider e autorização existentes. Não há migração automática para plano pago, simulação de pagamento nem desbloqueio das ferramentas dev em produção. SMTP é revalidado, exige TLS autenticado em produção e usa o trabalhador existente; encerramento drena e-mail antes de fechar HTTP/banco. Nenhum segredo real foi lido ou enviado, e o container local de smoke não foi parado nem alterado.

CI remoto e saúde pública comprovados, AC10/11 fechados com as origens e limitações de evidência discriminadas acima. Não há defeito funcional pendente identificado nesta revisão. Permanecem sem execução UAT Android, autenticação/entrega SMTP externa, restauração de backup e cópia offsite; não são declarados aprovados. O gate validate_state verifica estrutura/veredicto/citações do relatório e não amplia essas evidências. Não foi registrada lesson nem modificada a rastreabilidade, pois o único arquivo persistente autorizado a este Verifier é validation.md; não houve falha funcional, mutante sobrevivente ou desvio de precisão para destilar. No fechamento remoto, somente este relatório foi escrito; suítes/sensor não foram repetidos e fontes, testes, commits, bancos e infraestrutura permaneceram sem alteração pelo Verifier.
