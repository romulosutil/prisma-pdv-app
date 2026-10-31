# Validação independente — acesso sem cobrança e EasyPanel

## Validation: PASS local (AC1–10)

Data: 2026-10-30, America/Sao_Paulo. Verifier independente, autor diferente do implementador.
Escopo: commits dc52172, 76ded23 e 2e223dc; base 4c152f2. HEAD verificado: 2e223dc. A correção paralela de fixture de8fc6f integra o checkout, mas não foi atribuída à feature.

**A entrega global permanece incompleta.** AC11 e execução remota do CI/deploy estão pendentes. Este parecer aprova a revisão local e o avanço para publicação já autorizada; não comprova funcionamento da VPS, entrega SMTP externa, backup ou homologação Android.

## Conclusão e limites

Nenhum defeito bloqueante de implementação identificado. A gratuidade é um estado persistido distinto de pagamento, o provider rejeita operações financeiras, e as cinco mutações comerciais ficam atrás de sessão, dono e bloqueio de cobrança. A troca futura da configuração não converte uma assinatura liberada para paga.

Os três passos locais do Execution Plan estão implementados. O terceiro continua parcial quanto ao CI remoto e à implantação. Não existe tasks.md: o plano e os gates estão no spec.md.

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
| 10 | CI de PR/main, tipos/suítes seriais1worker/build, deploy somente push main após sucesso, secretHTTPS | .github/workflows/pdv.yml:3 define PR/main e push/main. Linhas44–64 executam npm ci, tipos, shared/API/mobile com maxWorkers1, build e assertions de isolamento. Linhas68–69 exigem `needs: validate` e push/refs/heads/main. Linhas80–88 exigem secret não vazio e HTTPS; linha91 promove exatamente GITHUB_SHA para codex/pdv-deploy sem force; linha95 chama curl com fail/timeouts/output descartado. Revisão do fluxo confirma ausência de impressão do segredo e falha propagada de push/curl. | PASS da configuração; execução remota pendente |
| 11 | Serviço HTTPS saudável, PostgreSQL privado persistente e serviços anteriores preservados | Não existe evidência externa produzida por esta verificação. Somente `GET http://127.0.0.1:53339/saude` retornou200 e `{"status":"ok"}` no smoke local já existente. Não equivale a HTTPS/VPS/persistência externa. | PENDENTE |

As assertions verificam resultados definidos no spec; não foram encontradas lacunas de precisão. A cobertura de autorização usa a suíte existente mais a ordem dos hooks da implementação; não se atribui uma nova matriz específica de operador/liberada que o teste não executa.

## Gates executados

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

Pendências de entrega, sem defeito local classificado: executar CI remoto no SHA publicado e comprovar AC11 com HTTPS, banco persistente privado e preservação dos serviços anteriores. UAT Android, SMTP externo e backup permanecem fora das evidências desta revisão. O gate validate_state verifica estrutura/veredicto/citações do relatório; eventual exit0 não substitui essas pendências externas. Não foi registrada lesson nem modificada a rastreabilidade, pois o único arquivo persistente autorizado a este Verifier é validation.md; não houve falha funcional, mutante sobrevivente ou desvio de precisão para destilar.
