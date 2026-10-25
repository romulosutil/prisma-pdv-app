# PDV mobile (pt-BR)

Monorepo com npm workspaces. Documentação em `docs/`.

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
npm run web -w @pdv/mobile     mesma coisa no navegador (sem câmera: digite o código ou use "Simular bip")
npm run dev -w @pdv/api        API em http://localhost:3333 (opcional)
```

Sem `EXPO_PUBLIC_API_URL` o app roda em **modo de testes**, 100% no aparelho, com cobrança simulada.
Cartões de teste: `4242 4242 4242 4242` aprova; `4000 0000 0000 0002` recusa no cadastro; `4000 0000 0000 0341` recusa as cobranças.
Em Ajustes → Assinatura, o "Relógio de teste" avança os dias para ver o fim do teste, a cobrança e a falha de pagamento.

`@pdv/shared` é consumido como TypeScript fonte (sem build): `import { formatarBRL } from '@pdv/shared'`.

## APK de testes

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

**Minificação (R8):** o `apps/mobile/app.json` usa o plugin `expo-build-properties` com `enableMinifyInReleaseBuilds: false` e `enableShrinkResourcesInReleaseBuilds: false`. Com R8 ligado o ML Kit do `expo-camera` não inicializava (`Failed to initialize BarcodeAnalyzer`, scanner sem ler nada). O mesmo plugin já injeta em `android/app/proguard-rules.pro` as regras `-keep` de `com.google.mlkit.**`, `mlkit_vision_barcode`, `mlkit_vision_common`, `com.google.firebase.components.**` e `expo.modules.camera.**`, para o dia em que a minificação for religada em produção (testar o scanner num APK release antes de publicar). Depois do prebuild, confira em `android/gradle.properties` que `android.enableMinifyInReleaseBuilds=false`.

### Diagnóstico da versão de testes

Em Ajustes → "Diagnóstico (versão de testes)" (e com toque longo de 1 s no status de conexão da tela Início) o testador copia um JSON com
o aparelho, a versão, a rota atual, contagens (produtos, vendas de hoje, plano e status da assinatura) e os últimos 500 eventos (erros e
avisos do console, erros JS não tratados, rotas, câmera, leituras, vendas, pagamentos, assinatura, app em primeiro/segundo plano). O registro
sobrevive a travamentos e a "Zerar dados". Nunca entram número de cartão, CVV, código de login, token nem nome de cliente; CPF/CNPJ e e-mail
saem mascarados (`***.***.*47-25`, `a***@bompreco.com.br`). Código: `apps/mobile/src/diagnostico/`.

### Antes de publicar em produção

Checklist (a captura e os botões só existem com `EXPO_PUBLIC_FERRAMENTAS_TESTE=1`; o gate em tempo de execução é `FERRAMENTAS_TESTE`):

- [ ] Build SEM `EXPO_PUBLIC_FERRAMENTAS_TESTE` (não definida no ambiente do `gradlew`/EAS; o perfil `teste` do `eas.json` é o único que a define).
- [ ] Verificar no bundle que a string "Copiar diagnóstico" não aparece. No Metro o texto é emitido com escape (`diagn\xf3stico`), então
  busque o prefixo `Copiar diagn` e também `Compartilhar arquivo`:

  ```powershell
  Remove-Item Env:EXPO_PUBLIC_FERRAMENTAS_TESTE -ErrorAction SilentlyContinue
  cd apps\mobile
  npx expo export --platform android --no-bytecode --output-dir dist
  Select-String -Path dist\_expo\static\js\android\*.js -Pattern 'Copiar diagn','Compartilhar arquivo','Limpar diagn' -SimpleMatch   # não pode retornar nada
  Remove-Item dist -Recurse -Force
  ```

  Para conferir o APK final (bundle Hermes), extraia `assets/index.android.bundle` do `.apk` (é um zip) e procure `Compartilhar arquivo`
  (ASCII puro, aparece como texto no bytecode): não pode existir. Com `EXPO_PUBLIC_FERRAMENTAS_TESTE=1` o mesmo comando acha as strings.
- [ ] Em Ajustes do app de produção não há as seções "Diagnóstico (versão de testes)" nem "Desenvolvimento".
