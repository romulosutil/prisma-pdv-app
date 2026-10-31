# Build Android local no Windows

Procedimento validado em30–31/10/2026. Gera APK de homologação sem EAS, publicação ou Metro em execução. O roteiro de uso do APK está em [checkpoint-apk.md](checkpoint-apk.md).

Para o aplicativo conectado com chave definitiva e incremento simples de versões, usar [build de produção](build-producao.md). Este documento continua sendo o fluxo de PDV Teste. Os dois runners compartilham a trava Android; a alternância segura de caches está explicada no guia de produção.

## Ferramentas validadas

| Ferramenta | Versão/local |
| --- | --- |
| JDK Microsoft | 17.0.21.0.2+1, `C:/Users/Ronal/AppData/Local/pdv-build/jdk/jdk-17.0.21.0.2+1` |
| Android command-line tools | 22.0, pacote15859902 |
| SDK | `C:/Users/Ronal/AppData/Local/pdv-build/android-sdk` |
| Plataforma | `platforms;android-37.0`, revisão2; contém API37.0 |
| Build-tools | 37.0.0; Gradle também instalou36.0.0 para dependências |
| Platform-tools | 37.0.1 |
| NDK | 27.1.12297006 |
| CMake / Ninja | **3.31.6 / 1.12.1** |
| Gradle | **Wrapper9.4.1** do Android gerado; não instalar Gradle global |
| TypeScript mobile | **6.0.3**, instalado no workspace mobile |

JDK e SDK ficam isolados, com variáveis de ambiente apenas nos processos do build. Não alterar PATH global nem reinstalar ferramentas a cada geração.

## Preparar uma máquina sem ferramentas

1. Instalar dependências Node pelo lockfile, se ainda não existirem: `rtk proxy npm.cmd ci --no-audit --no-fund` na raiz. Não executar durante outro build ou teste.
2. Obter JDK17 ZIP nas [fontes oficiais Microsoft](https://learn.microsoft.com/en-us/java/openjdk/download) e Android command-line tools na [página oficial Android](https://developer.android.com/studio#command-line-tools-only). Extrair em diretório isolado. A estrutura do SDK deve conter `cmdline-tools/latest/bin/sdkmanager.bat`; evitar a pasta `cmdline-tools` duplicada dentro de `latest`.
3. Conferir SHA256 com o valor oficial **antes** de executar os downloads. Arquivos usados nesta preparação:

| Arquivo | SHA256 conferido |
| --- | --- |
| Microsoft JDK17 ZIP recebido em30/10/2026 | 49154292866386b2f4f09a3ecf3be07ab80a419149c84ec1d4419b9eec9e4b64 |
| commandlinetools-win-15859902_latest.zip | 90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a |

Links de versão principal do JDK podem mudar o arquivo servido. Esses hashes descrevem os arquivos instalados nesta data; uma versão nova exige nova conferência oficial, sem ignorar divergência de hash.

4. No SDK Manager, com JAVA_HOME apontando para o JDK apenas no processo, instalar: `platform-tools`, `platforms;android-37.0`, `build-tools;37.0.0`, `ndk;27.1.12297006`, `cmake;3.31.6`. Instalar36.0.0 se a resolução Gradle pedir, como nesta execução. Usar o sdkmanager oficial e concluir as licenças necessárias. Não instalar emulador para apenas gerar APK.
5. Conferir `source.properties`, `cmake --version` e `ninja --version` nos executáveis instalados. O pacote de plataforma é **android-37.0**, não android-37. No Windows usado, `LongPathsEnabled` já era1; nenhuma alteração do registro foi feita.

## Validar e gerar

Na raiz do repositório, executar uma suíte por vez:

```powershell
rtk proxy npm.cmd run typecheck
rtk proxy npm.cmd run test -w @pdv/mobile -- test/configuracaoApk.test.ts --maxWorkers=1
rtk proxy python -X utf8 apps/mobile/scripts/test_build_apk_local.py
rtk proxy python -X utf8 apps/mobile/scripts/build-apk-local.py --offline --java-home C:/Users/Ronal/AppData/Local/pdv-build/jdk/jdk-17.0.21.0.2+1 --android-home C:/Users/Ronal/AppData/Local/pdv-build/android-sdk
```

O script valida as ferramentas e a identidade antes de compilar. Android existente com outro applicationId é recusado; não apagar a pasta para contornar o erro. O prebuild usa `--no-clean --no-install --skip-dependency-update`; alterações conhecidas nos scripts do package.json são restauradas pontualmente, preservando o conteúdo anterior. Conferir `git status` após executar.

O modo offline usa nome **PDV Teste**, pacote `br.com.pdv.homologacao`, esquema `pdv-teste`, versão0.1.4 e código5 por padrão. Tem ferramentas/cartões simulados habilitados; não usar dados ou cartão reais. Não instala por cima de `br.com.pdv.mobile`.

Saídas em `builds/pdv-teste-5.apk` e `.json`, ignoradas pelo Git. O JSON registra hash, versão, modo, URL, commit-base, estado dirty e fingerprints delimitados. Não substituir o commit-base por um commit posterior no relatório nem afirmar árvore limpa se dirty=true.

Para uma atualização sobre o APK5, executar o mesmo comando com `PDV_APK_VERSION_CODE=6` **no ambiente do processo**. Exemplo sem alterar o ambiente global:

```powershell
rtk proxy python -X utf8 -c "import os,subprocess; e=dict(os.environ,PDV_APK_VERSION_CODE='6'); raise SystemExit(subprocess.call(['python','-X','utf8','apps/mobile/scripts/build-apk-local.py','--offline','--java-home','C:/Users/Ronal/AppData/Local/pdv-build/jdk/jdk-17.0.21.0.2+1','--android-home','C:/Users/Ronal/AppData/Local/pdv-build/android-sdk'],env=e))"
```

API conectada ainda não homologada. A opção `--api-url` exige HTTPS público sem credenciais, query ou fragmento e desliga ferramentas de teste; só usar com destino de homologação autorizado e disponível. Configurar a URL não comprova integração.

## Problemas encontrados e prevenção

| Sintoma | Causa observada | Correção adotada |
| --- | --- | --- |
| Ninja falha em `mkdir(CMakeFiles/.../NativeModules)` | CMake3.22.1/Ninja antigo não lidou com os caminhos longos deste checkout | SDK CMake3.31.6/Ninja1.12.1; `-Pandroid.cmakeVersion=3.31.6` e `-Pexpo.android.cmakeObjectPathMax=2048`. Build passou sem mover o projeto ou editar dependências. |
| Memória pressionada por compiladores/Metro | Gradle e daemons Kotlin separados, mais workers de transformação | Gradle1worker, JVM2GB/metaspace512MB, Kotlinin-process, paralelismo Gradle desligado e Metro1worker na homologação. Não iniciar suítes amplas junto. |
| Build monta AARs desnecessários de todas as bibliotecas | Seleção global `assembleRelease` | Selecionar **`:app:assembleRelease`**, como no script corrigido. |
| Bundle aparece UP-TO-DATE ao trocar configuração | Entradas Gradle não incluem EXPO_PUBLIC nem todos os fontes shared | Forçar **`:app:createBundleReleaseJsAndAssets --rerun`** antes de empacotar. Não usar `--rerun-tasks` global nem limpar todo o cache. |
| Erros de URL apenas numa invocação de tipos | Compilador5.9.3 transitivo da raiz foi invocado diretamente | Usar `npm run typecheck` dos workspaces; mobile declara6.0.3. Não corrigir fontes para acomodar o compilador errado. |
| Expo avisa falta de expo-system-ui | Dependência preexistente ausente para userInterfaceStyle | Aviso registrado; não impediu build. Aparência do sistema precisa de teste no aparelho. |

O rerun de uma tarefa é suportado pelo [Gradle](https://docs.gradle.org/7.6/release-notes.html). Não criar junctions/worktrees de dependências, usar git clean/restore ou limpar diretórios recursivamente para resolver build. Não remover bancos, volumes Docker, arquivos.env ou dados do aplicativo. Investigar a tarefa que falhou e preservar cache e evidências.

## Conferir o APK antes de entregar

Usar `apksigner.bat verify --verbose --print-certs` e `aapt2.exe dump badging`, nos build-tools37.0.0, com JAVA_HOME do processo. Confirmar hashSHA256, assinatura, pacote, código, minSdk24, target36, ARM64 e ausência de debuggable. Inspecionar ZIP/DEX para bundle `assets/index.android.bundle`, módulos SQLite/SecureStore/câmera e ausência de arquivos.env/keystore; conferir permissões finais. Não expor chave privada ou credenciais nessa inspeção.

Na atualização, conferir mesmo certificado e código de versão maior. A assinatura debug é apenas de teste. Registrar os resultados públicos no manifesto de evidências e entregar roteiro físico. Instalação, abertura sem Metro, câmera, retomada, atualização conservando dados, cofre/logs e sincronização exigem observação própria; inspeção estática não os conclui.

Referência do processo nativo: [build local Expo](https://docs.expo.dev/guides/local-app-production/). Evidência desta execução: [checkpoint](checkpoint-apk.md) e `.specs/features/checkpoint-apk/artefatos.json`. A primeira tentativa falhou em9m12s, a primeira compilação corrigida levou16m14s, e a execução final com cache e bundle forçado levou57s. Tempos desta máquina, sem garantia para outras.
