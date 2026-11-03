# PDV mobile (pt-BR)

Monorepo com npm workspaces. Documentação em `docs/`.

Roadmap atual: [app completo com caixa por usuário](docs/roadmap-app-completo.md), incluindo vários usuários, entrada, sangria, retirada, sincronização e integrações reais.

```
apps/        mobile (Expo), api (Fastify) e, no futuro, desktop
packages/
  shared/    @pdv/shared: domínio puro em TypeScript (dinheiro, planos,
             assinatura, licença, cartão, billing mock, tokens, contrato zod)
docs/        arquitetura, produto e design system
```

## Comandos

```
npm install        instala todos os workspaces
npm run test       roda os testes de todos os workspaces
npm run typecheck  checa os tipos de todos os workspaces
```

## Rodar a versão de testes

```
npm run start -w @pdv/mobile   abre o Expo; leia o QR com o app Expo Go no Android
npm run web -w @pdv/mobile     mesma coisa no navegador (sem câmera: digite o código)
npm run dev -w @pdv/api        API em http://localhost:3333 (opcional)
```

Todo início exige `EXPO_PUBLIC_AMBIENTE` explícito, inclusive no desenvolvimento. Para testar os serviços reais no PowerShell:

```powershell
$env:EXPO_PUBLIC_AMBIENTE = 'homologacao'
$env:EXPO_PUBLIC_API_URL = 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host'
$env:EXPO_PUBLIC_FERRAMENTAS_TESTE = '0'
npm run start -w @pdv/mobile
```

Os perfis conectados exigem URL HTTPS, recusam ferramentas de teste e nunca recorrem à demo quando a rede falha. A API assume cobrança desativada sem `BILLING_PROVIDER`; o simulador exige configuração explícita de desenvolvimento/teste e é recusado em produção. O scanner usa apenas câmera real ou digitação, sem imagem ou leitura simulada. A demo legada e os mocks dos testes continuam separados do APK conectado; para a demo, escolher explicitamente `EXPO_PUBLIC_AMBIENTE=demo` e remover `EXPO_PUBLIC_API_URL`.
Cartões de teste: `4242 4242 4242 4242` aprova; `4000 0000 0000 0002` recusa no cadastro; `4000 0000 0000 0341` recusa as cobranças.
Em Ajustes → Assinatura, o "Relógio de teste" avança os dias para ver o fim do teste, a cobrança e a falha de pagamento.

`@pdv/shared` é consumido como TypeScript fonte (sem build): `import { formatarBRL } from '@pdv/shared'`.

## APK de testes

### APK conectado (R0–R5)

O perfil `homologacao` usa a API e o PostgreSQL isolados no EasyPanel, login por e-mail real e acesso sem cartão/cobrança. Instala como **PDV Homologação** (`br.com.pdv.mobile.homologacao`), separado da demo 0.1.4. Não leva produtos ou vendas fictícios. Pagamentos de vendas continuam sendo registros manuais.

Entrega 03/11/2026: APK **0.1.9/versionCode 10**, pronto para reteste supervisionado, com diagnóstico local de homologação, R8/shrink, permissões revistas e tratamento dos 18 achados. CI `df41823`: 597 API/PostgreSQL 17, 578 mobile, 172 shared (1.347 casos), tipos/ferramentas/imagem aprovados. API compatível de cadastro verificado implantada somente em homologação; 299 fontes do APK sem divergência. Testes físicos, limpeza da base e aceite continuam pendentes. [Matriz e artefato](docs/correcoes-auditoria-0.1.9.md) · [reteste](docs/roteiro-piloto-android.md#reteste-das-correções-da-auditoria-na-019).

```powershell
./scripts/build-android.ps1 -Perfil homologacao
# Resultado: builds/pdv-homologacao-0.1.9.apk + SHA256, assinatura e metadados
```

O script usa a cópia curta `C:/p` já preparada, configura o ambiente pelo `eas.json`, confere saúde/hora/suporte e contrato de cadastro verificado, compila, exige mapping R8 e verifica o bundle dentro do APK. Os diretórios `C:/p` e `C:/x`, o SDK e suas dependências devem estar preparados conforme as instruções Windows abaixo. Não inclua arquivos `.env` na cópia.

| Perfil EAS | Backend | Ferramentas | Pacote Android |
|---|---|---|---|
| `demo` / `teste` | Local, simulado | Ligadas | `br.com.pdv.mobile` |
| `homologacao` | API de homologação HTTPS | Desligadas | `br.com.pdv.mobile.homologacao` |
| `producao` | API de produção HTTPS | Desligadas | `br.com.pdv.mobile` |

Para EAS, use `eas build --profile homologacao --platform android`. O perfil EAS `producao` gera AAB; a assinatura de distribuição e a validação física ainda precisam ser homologadas. O script local gera APK para testes e usa o certificado debug; isso não comprova prontidão para a Play Store. Evidências e pendências de R0: [homologação conectada](docs/r0-api-apk-conectado.md).

O APK de testes é um build de release (`__DEV__` falso) gerado com `EXPO_PUBLIC_FERRAMENTAS_TESTE=1`, definida no perfil `teste` do `apps/mobile/eas.json`:

```
eas build --profile teste --platform android
```

Essa variável liga as ferramentas de teste mesmo fora de desenvolvimento (código em `apps/mobile/src/util/ferramentasTeste.ts`). Aparecem no APK:
- cartões de teste no cadastro de cartão (botão "Usar");
- "Relógio de teste" em Ajustes → Assinatura (no modo de testes);
- "Simular bip" no leitor de código de barras;
- "Simular pagamento recebido" na cobrança Pix e "Simular falha" na tela do Tap;
- "Zerar dados do app" em Ajustes.
- "Diagnóstico (versão de testes)" em Ajustes: copia o JSON de eventos para colar na conversa (ver "Diagnóstico da versão de testes" abaixo).

O cadastro não vem pré-preenchido no APK: o testador digita os dados de verdade. O preenchimento automático com dados de teste continua só em desenvolvimento.

### Gerar localmente (Windows)

Sem EAS/nuvem. Testado no Windows 11 com JDK 17 (Microsoft OpenJDK 17.0.20), Android SDK (cmdline-tools `latest`, platform-tools 37.0.1, platform android-37.0, build-tools 37.0.0, NDK 27.1.12297006, CMake 3.22.1) e Gradle 9.4.1 (wrapper). O Gradle baixa NDK/CMake/plataforma sozinho se as licenças estiverem aceitas (`yes | sdkmanager --licenses`).

Variáveis (usuário): `JAVA_HOME` (pasta do JDK 17), `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`, `platform-tools` no `PATH`.

**Por que copiar para um caminho curto:** o caminho do repositório tem espaços e o CMake/ninja do NDK estoura o limite de 260 caracteres do Windows (`subst` não resolve: o Gradle/Node resolvem o caminho real `C:\...` e misturam com `P:\`, quebrando o codegen). Por isso o build é feito numa cópia em `C:\p` com o cache do CMake em `C:\x`. As pastas `android/` e `ios/` são geradas pelo prebuild (estão no `.gitignore`).

```powershell
# 1) copia o monorepo (node_modules incluso) para um caminho curto, sem espaços
$r = "C:\Users\sutil\dev\Pessoal\prisma pdv app"
robocopy $r C:\p /E /XD "$r\apps\mobile\android" "$r\apps\mobile\ios" "$r\apps\mobile\.expo" /NFL /NDL /NP /MT:16
# (não use /XD android: exclui também as pastas android de dentro do node_modules)
# o robocopy copia os junctions de node_modules\@pdv como pastas; recrie-os apontando para a cópia:
Remove-Item C:\p\node_modules\@pdv\* -Recurse -Force
cmd /c mklink /J C:\p\node_modules\@pdv\api C:\p\apps\api
cmd /c mklink /J C:\p\node_modules\@pdv\mobile C:\p\apps\mobile
cmd /c mklink /J C:\p\node_modules\@pdv\shared C:\p\packages\shared

# 2) prebuild + ajustes no projeto nativo gerado
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:EXPO_PUBLIC_FERRAMENTAS_TESTE = '1'   # liga as ferramentas de teste no bundle JS
$env:EXPO_PUBLIC_AMBIENTE = 'demo'       # este exemplo histórico gera a demo local
$env:NODE_ENV = 'production'
cd C:\p\apps\mobile
npx expo prebuild --platform android --clean
# build incremental (só código JS/TS mudou): atualize C:\p com robocopy /MIR de apps\mobile\{app,src,assets} e
# packages\shared\src, copie app.json/package.json e rode o prebuild SEM --clean (~5 min no Gradle).
# O prebuild regenera o build.gradle: reaplique SEMPRE o ajuste do CMake abaixo, senão o build falha em buildCMakeRelWithDebInfo.
# memória do Gradle
(Get-Content android\gradle.properties) -replace 'org.gradle.jvmargs=.*','org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g' | Set-Content android\gradle.properties
# cache do CMake em caminho curto (dentro do bloco `android {` de android\app\build.gradle)
$g = Get-Content android\app\build.gradle -Raw
$g = $g -replace '(?m)^android \{', "android {`n    externalNativeBuild { cmake { buildStagingDirectory file('C:/x') } }"
Set-Content android\app\build.gradle $g -NoNewline

# 3) build (só ABIs arm64-v8a e armeabi-v7a; ~20 min na primeira vez)
cd android
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
.\gradlew.bat --stop

# 4) APK: C:\p\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
New-Item -ItemType Directory -Force "$r\builds" | Out-Null
Copy-Item C:\p\apps\mobile\android\app\build\outputs\apk\release\app-release.apk "$r\builds\pdv-teste-0.1.1.apk"
```

O release é assinado com o keystore de debug do template Expo (aceitável para APK de testes, não para a loja). O APK final fica em `builds/pdv-teste-0.1.1.apk` (pasta ignorada pelo git). Instalar: `adb install -r builds\pdv-teste-0.1.1.apk` ou enviar o arquivo ao aparelho.

**Minificação (R8):** o candidato 0.1.9 religa `enableMinifyInReleaseBuilds` e `enableShrinkResourcesInReleaseBuilds`, mantendo regras de proteção de ML Kit/Firebase/câmera. O build exige e guarda o mapping R8 junto às evidências. O histórico da 0.1.0 contém falha de inicialização do BarcodeAnalyzer com minificação; por isso a leitura de código real no APK otimizado é um cenário obrigatório do reteste no celular, sem presumir aprovação física pelo build/CI. Não usar as instruções históricas de desligar R8 como configuração deste candidato.

### Diagnóstico da versão de testes

Em Ajustes → "Diagnóstico (versão de testes)" (e com toque longo de 1 s no status de conexão da tela Início) o testador copia um JSON com
o aparelho, a versão, a rota atual, contagens (produtos, vendas de hoje, plano e status da assinatura) e os últimos 500 eventos (erros e
avisos do console, erros JS não tratados, rotas, câmera, leituras, vendas, pagamentos, assinatura, app em primeiro/segundo plano). O registro
sobrevive a travamentos e a "Zerar dados". Nunca entram número de cartão, CVV, código de login, token nem nome de cliente; CPF/CNPJ e e-mail
saem mascarados (`***.***.*47-25`, `a***@bompreco.com.br`). Código: `apps/mobile/src/diagnostico/`.

### Antes de publicar em produção

Checklist (a captura e os botões só existem com `EXPO_PUBLIC_FERRAMENTAS_TESTE=1`; o gate em tempo de execução é `FERRAMENTAS_TESTE`):

- [ ] Build com `EXPO_PUBLIC_AMBIENTE=producao`, URL HTTPS correta e ferramentas desligadas. `demo`/`teste` são os únicos perfis que habilitam ferramentas no `eas.json`.
- [ ] Verificar no bundle que a string "Copiar diagnóstico" não aparece. No Metro o texto é emitido com escape (`diagn\xf3stico`), então
  busque o prefixo `Copiar diagn` e também `Compartilhar arquivo`:

  ```powershell
  Remove-Item Env:EXPO_PUBLIC_FERRAMENTAS_TESTE -ErrorAction SilentlyContinue
  $env:EXPO_PUBLIC_AMBIENTE = 'producao'
  $env:EXPO_PUBLIC_API_URL = 'https://aladdin-pdv-api.jicnzg.easypanel.host'
  cd apps\mobile
  npx expo export --platform android --no-bytecode --output-dir dist
  Select-String -Path dist\_expo\static\js\android\*.js -Pattern 'Copiar diagn','Compartilhar arquivo','Limpar diagn' -SimpleMatch   # não pode retornar nada
  Remove-Item dist -Recurse -Force
  ```

  Para conferir o APK final (bundle Hermes), extraia `assets/index.android.bundle` do `.apk` (é um zip) e procure `Compartilhar arquivo`
  (ASCII puro, aparece como texto no bytecode): não pode existir. Com `EXPO_PUBLIC_FERRAMENTAS_TESTE=1` o mesmo comando acha as strings.
- [ ] Em Ajustes do app de produção não há as seções "Diagnóstico (versão de testes)" nem "Desenvolvimento".


### Quinta entrega: gestão, estoque e lojas (R4)

No modo conectado, **Ajustes → Gestão** reúne estoque/movimentos, clientes/fiado, relatórios/CSV e lojas/vínculos. Estoque é movimentado por eventos; dinheiro de fiado pertence ao turno que recebeu. Operador consulta suas finanças e o dono pode consolidar a empresa. Pagamentos seguem manuais; recebimentos de fiado e ajustes de estoque exigem conexão. [Política, evidências e pendências de homologação R4](docs/r4-gestao-catalogo-fiado-lojas.md).

### Sexta entrega: piloto, backup e suporte (R5)

**Suporte e privacidade** reúne políticas do piloto, protocolos pessoais, exportação de dados autorizados e pedido de análise de exclusão. O acesso fica disponível também na entrada e durante bloqueio comercial. O resumo técnico é opcional; solicitações preservam seu identificador após resposta perdida. Atendimento manual e implantação da API compatível precisam ser comprovados antes do piloto.

Builds conectados excluem semente, tokenização/gateway simulados, relógio artificial e diagnóstico legado da demo. A partir da 0.1.8, homologação inclui diagnóstico próprio em `src/telemetria`: 500 eventos com lista fechada de campos, persistidos localmente, com cópia/exportação manual. Produção exclui esse diagnóstico; o gate verifica marcador e grafo em ambos os perfis. `scripts/verificar-release-mobile.mjs` inspeciona bundle/source map; a configuração `metro.config.js` é obrigatória na compilação. O script local gera APK interno de homologação; distribuição de produção exige assinatura própria. [Evidências R5](docs/r5-piloto-backup-suporte.md), [roteiro físico](docs/roteiro-piloto-android.md) e [operação/restauração/atendimento](docs/operacao-backup-suporte.md). Testes HTTP e bundle não equivalem à execução em Android real.
