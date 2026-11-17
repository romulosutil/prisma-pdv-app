<#
Gera APK interno (padrão) ou AAB para a Google Play (-Aab).

Uso normal do AAB (as senhas são pedidas no prompt, nunca vão para arquivo nem para o repositório):
  pwsh scripts/build-android.ps1 -Perfil producao -Aab -Keystore <caminho-fora-do-repo>.jks -Alias <alias-da-chave-de-upload>
O keystore deve ficar FORA do repositório e fora de C:/p. As senhas viajam ao Gradle só por variáveis de ambiente
do processo (ORG_GRADLE_PROJECT_pdvUpload*), removidas no finally.
Alternativa não interativa (CI/testes): se PDV_UPLOAD_STORE_PASSWORD / PDV_UPLOAD_KEY_PASSWORD já estiverem definidas,
são usadas no lugar do prompt. -Keystore/-Alias também podem vir de PDV_UPLOAD_KEYSTORE / PDV_UPLOAD_ALIAS.
O APK universal derivado do AAB usa a keystore de debug do prebuild: serve só para instalar em aparelho de teste.
#>
param(
  [ValidateSet('demo', 'homologacao', 'producao')][string]$Perfil = 'homologacao',
  [switch]$Emulador,
  [switch]$Aab,
  [string]$Keystore = $env:PDV_UPLOAD_KEYSTORE,
  [string]$Alias = $env:PDV_UPLOAD_ALIAS
)
$ErrorActionPreference = 'Stop'
if ($Perfil -eq 'producao' -and !$Aab) { throw 'Distribuição de produção exige assinatura própria. Use -Aab (chave de upload) ou o perfil EAS producao; sem -Aab este script gera somente APK interno assinado para testes.' }
if ($Aab -and $Emulador) { throw '-Aab não pode ser combinado com -Emulador.' }
$repoPdv = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$copiaPdv = [IO.Path]::GetFullPath('C:/p')
if ($copiaPdv -ne 'C:\p' -or $repoPdv -eq $copiaPdv) { throw 'Caminho de compilação inválido.' }
if (!(Test-Path -LiteralPath "$copiaPdv/node_modules/expo/package.json")) { throw 'Prepare a cópia curta C:/p e suas dependências conforme README.md.' }
$perfisPdv = Get-Content -LiteralPath "$repoPdv/apps/mobile/eas.json" -Raw | ConvertFrom-Json
$perfilPdv = $perfisPdv.build.$Perfil
$apiCompativelPdv = $false
$env:EXPO_PUBLIC_AMBIENTE = $perfilPdv.env.EXPO_PUBLIC_AMBIENTE
$env:EXPO_PUBLIC_FERRAMENTAS_TESTE = $perfilPdv.env.EXPO_PUBLIC_FERRAMENTAS_TESTE
Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
if ($perfilPdv.env.EXPO_PUBLIC_API_URL) {
  $env:EXPO_PUBLIC_API_URL = $perfilPdv.env.EXPO_PUBLIC_API_URL
  $respostaSaudePdv = Invoke-WebRequest "$env:EXPO_PUBLIC_API_URL/saude" -TimeoutSec 20
  $saudePdv = $respostaSaudePdv.Content | ConvertFrom-Json
  if ($saudePdv.status -ne 'ok') { throw 'API indisponível. Build conectado interrompido.' }
  if (!$respostaSaudePdv.Headers['x-pdv-agora']) { throw 'API sem referência precisa de hora. Implante a versão compatível antes de gerar o APK.' }
  $suportePdv = Invoke-WebRequest "$env:EXPO_PUBLIC_API_URL/suporte/solicitacoes" -SkipHttpErrorCheck -TimeoutSec 20
  $apiCompativelPdv = [int]$suportePdv.StatusCode -eq 401
  if (!$apiCompativelPdv) { throw 'API incompatível com o piloto: suporte deve responder 401 sem sessão. Implante a versão compatível antes de gerar o APK para o celular.' }
  $cadastroPdv = Invoke-RestMethod "$env:EXPO_PUBLIC_API_URL/auth/cadastro/configuracao" -TimeoutSec 20
  if ($cadastroPdv.versaoContrato -ne 1 -or $cadastroPdv.verificacaoEmail -ne $true -or $cadastroPdv.verificacaoAntecipada -ne $true) { throw 'API sem verificação antecipada do cadastro. Implante a API compatível antes de gerar o APK.' }
}
$env:NODE_ENV = 'production'
$senhasAabPdv = @('ORG_GRADLE_PROJECT_pdvUploadStorePassword', 'ORG_GRADLE_PROJECT_pdvUploadKeyPassword', 'ORG_GRADLE_PROJECT_pdvUploadStoreFile', 'ORG_GRADLE_PROJECT_pdvUploadKeyAlias')
if ($Aab) {
  if (!$Keystore -or !$Alias) { throw '-Aab exige -Keystore e -Alias (chave de upload fora do repositório).' }
  if (!(Test-Path -LiteralPath $Keystore -PathType Leaf)) { throw 'Keystore de upload não encontrado.' }
  $keystorePdv = (Resolve-Path -LiteralPath $Keystore).ProviderPath
  foreach ($proibidoPdv in @($repoPdv, $copiaPdv)) {
    $baseProibidaPdv = [IO.Path]::GetFullPath($proibidoPdv).TrimEnd([char[]]@([char]92, [char]47)) + [IO.Path]::DirectorySeparatorChar
    if ($keystorePdv.StartsWith($baseProibidaPdv, [StringComparison]::OrdinalIgnoreCase)) { throw 'Keystore de upload não pode ficar dentro do repositório nem de C:/p.' }
  }
  function ConverterSenhaPdv([Security.SecureString]$segura) { [Net.NetworkCredential]::new('', $segura).Password }
  $senhaStorePdv = $env:PDV_UPLOAD_STORE_PASSWORD
  if (!$senhaStorePdv) { $senhaStorePdv = ConverterSenhaPdv (Read-Host 'Senha do keystore de upload' -AsSecureString) }
  $senhaChavePdv = $env:PDV_UPLOAD_KEY_PASSWORD
  if (!$senhaChavePdv) { $senhaChavePdv = ConverterSenhaPdv (Read-Host 'Senha da chave de upload (Enter = igual à do keystore)' -AsSecureString) }
  if (!$senhaStorePdv) { throw 'Senha do keystore vazia.' }
  if (!$senhaChavePdv) { $senhaChavePdv = $senhaStorePdv }
}
$env:JAVA_HOME = 'C:/Program Files/Microsoft/jdk-17.0.20.101-hotspot'
$env:ANDROID_HOME = "$env:LOCALAPPDATA/Android/Sdk"
$env:CI = '1'
$env:EXPO_NO_TELEMETRY = '1'
$destinoPdv = Join-Path $repoPdv 'builds'
New-Item -ItemType Directory -Force -Path $destinoPdv | Out-Null
# Copia somente fontes; não remove nada nem muda os junctions existentes.
$fontesPdv = @()
foreach ($pastaPdv in @('apps/mobile/app', 'apps/mobile/src', 'apps/mobile/assets', 'apps/mobile/config', 'packages/shared/src')) {
  & robocopy "$repoPdv/$pastaPdv" "$copiaPdv/$pastaPdv" /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) { throw "Falha ao copiar $pastaPdv." }
}
foreach ($arquivoPdv in @('apps/mobile/app.json', 'apps/mobile/app.config.js', 'apps/mobile/metro.config.js', 'apps/mobile/package.json', 'apps/mobile/eas.json', 'packages/shared/package.json')) {
  Copy-Item -LiteralPath "$repoPdv/$arquivoPdv" -Destination "$copiaPdv/$arquivoPdv" -Force
  $hashFontePdv = (Get-FileHash -LiteralPath "$repoPdv/$arquivoPdv" -Algorithm SHA256).Hash
  if ($hashFontePdv -ne (Get-FileHash -LiteralPath "$copiaPdv/$arquivoPdv" -Algorithm SHA256).Hash) { throw "Configuração divergente: $arquivoPdv" }
  $fontesPdv += [PSCustomObject]@{ arquivo = $arquivoPdv; sha256 = $hashFontePdv.ToLowerInvariant() }
}
# /E não apaga arquivos. Detectar fonte obsoleta em vez de levar rota antiga ao APK.
foreach ($pastaPdv in @('apps/mobile/app', 'apps/mobile/src', 'apps/mobile/assets', 'apps/mobile/config', 'packages/shared/src')) {
  $origemPdv = [IO.Path]::GetFullPath("$repoPdv/$pastaPdv")
  $copiaPastaPdv = [IO.Path]::GetFullPath("$copiaPdv/$pastaPdv")
  foreach ($itemPdv in Get-ChildItem -LiteralPath $copiaPastaPdv -File -Recurse) {
    $relativoPdv = [IO.Path]::GetRelativePath($copiaPastaPdv, $itemPdv.FullName)
    $arquivoOrigemPdv = Join-Path $origemPdv $relativoPdv
    if (!(Test-Path -LiteralPath $arquivoOrigemPdv -PathType Leaf)) { throw "Fonte obsoleta na cópia de build: $pastaPdv/$relativoPdv. Revise a cópia antes de compilar." }
    $hashOrigemPdv = (Get-FileHash -LiteralPath $arquivoOrigemPdv -Algorithm SHA256).Hash
    if ($hashOrigemPdv -ne (Get-FileHash -LiteralPath $itemPdv.FullName -Algorithm SHA256).Hash) { throw "Cópia divergente: $pastaPdv/$relativoPdv" }
    $fontesPdv += [PSCustomObject]@{ arquivo = "$pastaPdv/$relativoPdv"; sha256 = $hashOrigemPdv.ToLowerInvariant() }
  }
}
$configPdv = Get-Content -LiteralPath "$repoPdv/apps/mobile/app.json" -Raw | ConvertFrom-Json
$versaoPdv = $configPdv.expo.version
$baseNomePdv = "pdv-$Perfil-$versaoPdv"
$arquiteturasPdv = 'arm64-v8a,armeabi-v7a'
if ($Emulador) {
  $baseNomePdv += '-emulador'
  $arquiteturasPdv = 'x86_64'
}
if ($Aab) {
  $baseNomePdv += '-aab'
  $bundletoolPdv = $null
  if (Get-Command bundletool -ErrorAction SilentlyContinue) { $bundletoolPdv = @('bundletool') }
  else {
    $versaoBundletoolPdv = '1.18.3'
    $shaBundletoolPdv = 'a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29'
    $pastaFerramentasPdv = Join-Path $env:LOCALAPPDATA 'pdv-tools'
    $jarBundletoolPdv = Join-Path $pastaFerramentasPdv "bundletool-all-$versaoBundletoolPdv.jar"
    if (!(Test-Path -LiteralPath $jarBundletoolPdv)) {
      New-Item -ItemType Directory -Force -Path $pastaFerramentasPdv | Out-Null
      Invoke-WebRequest "https://github.com/google/bundletool/releases/download/$versaoBundletoolPdv/bundletool-all-$versaoBundletoolPdv.jar" -OutFile "$jarBundletoolPdv.tmp" -TimeoutSec 300
      if ((Get-FileHash -LiteralPath "$jarBundletoolPdv.tmp" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $shaBundletoolPdv) { Remove-Item -LiteralPath "$jarBundletoolPdv.tmp" -Force; throw 'sha256 do bundletool diverge do publicado.' }
      Move-Item -LiteralPath "$jarBundletoolPdv.tmp" -Destination $jarBundletoolPdv
    } elseif ((Get-FileHash -LiteralPath $jarBundletoolPdv -Algorithm SHA256).Hash.ToLowerInvariant() -ne $shaBundletoolPdv) { throw 'bundletool local com sha256 inesperado.' }
    $bundletoolPdv = @("$env:JAVA_HOME/bin/java.exe", '-jar', $jarBundletoolPdv)
  }
  function Invoke-BundletoolPdv { $resto = @($bundletoolPdv | Select-Object -Skip 1); & $bundletoolPdv[0] @resto @args }
}
$fontesPdv | ConvertTo-Json -Depth 3 | Set-Content "$destinoPdv/$baseNomePdv-fontes.json"
Push-Location "$copiaPdv/apps/mobile"
try {
  & npx.cmd expo prebuild --platform android --no-install *>&1 | Tee-Object "$destinoPdv/$baseNomePdv-prebuild.log"
  if ($LASTEXITCODE -ne 0) { throw 'Prebuild falhou.' }
  $gradlePdv = Get-Content -LiteralPath android/gradle.properties -Raw
  $gradlePdv = $gradlePdv -replace '(?m)^org.gradle.jvmargs=.*', 'org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g'
  Set-Content -LiteralPath android/gradle.properties -Value $gradlePdv -NoNewline
  $appGradlePdv = Get-Content -LiteralPath android/app/build.gradle -Raw
  if ($appGradlePdv -notmatch 'buildStagingDirectory') {
    $appGradlePdv = $appGradlePdv -replace '(?m)^android \{', "android {`n    externalNativeBuild { cmake { buildStagingDirectory file('C:/x') } }"
  }
  # Remove injeção anterior (o prebuild não usa --clean) e reaplica só quando -Aab.
  $appGradlePdv = [regex]::Replace($appGradlePdv, '(?s)\s*// pdv-upload-begin.*?// pdv-upload-end', '')
  $appGradlePdv = [regex]::Replace($appGradlePdv, '(?s)(release \{.*?)signingConfig signingConfigs\.upload', '$1signingConfig signingConfigs.debug')
  if ($Aab) {
    $blocoUploadPdv = @'

        // pdv-upload-begin
        upload {
            storeFile file(findProperty('pdvUploadStoreFile'))
            storePassword findProperty('pdvUploadStorePassword')
            keyAlias findProperty('pdvUploadKeyAlias')
            keyPassword findProperty('pdvUploadKeyPassword')
        }
        // pdv-upload-end
'@
    if ($appGradlePdv -notmatch '(?m)^    signingConfigs \{') { throw 'build.gradle gerado sem signingConfigs.' }
    $appGradlePdv = $appGradlePdv -replace '(?m)^(    signingConfigs \{)', ('$1' + $blocoUploadPdv.Replace('$', '$$'))
    if ($appGradlePdv -notmatch '(?s)release \{.*?signingConfig signingConfigs\.debug') { throw 'buildTypes.release sem signingConfig esperado.' }
    $appGradlePdv = [regex]::Replace($appGradlePdv, '(?s)(release \{.*?)signingConfig signingConfigs\.debug', '$1signingConfig signingConfigs.upload')
  }
  Set-Content -LiteralPath android/app/build.gradle -Value $appGradlePdv -NoNewline
  Push-Location android
  try {
    $tarefaGradlePdv = if ($Aab) { 'bundleRelease' } else { 'assembleRelease' }
    if ($Aab) {
      $env:ORG_GRADLE_PROJECT_pdvUploadStoreFile = $keystorePdv
      $env:ORG_GRADLE_PROJECT_pdvUploadKeyAlias = $Alias
      $env:ORG_GRADLE_PROJECT_pdvUploadStorePassword = $senhaStorePdv
      $env:ORG_GRADLE_PROJECT_pdvUploadKeyPassword = $senhaChavePdv
    }
    try { & ./gradlew.bat $tarefaGradlePdv "-PreactNativeArchitectures=$arquiteturasPdv" *>&1 | Tee-Object "$destinoPdv/$baseNomePdv-build.log" }
    finally { foreach ($nomeEnvPdv in $senhasAabPdv) { Remove-Item "Env:$nomeEnvPdv" -ErrorAction SilentlyContinue } }
    if ($LASTEXITCODE -ne 0) { throw 'Gradle falhou.' }
    $mappingPdv = 'app/build/outputs/mapping/release/mapping.txt'
    if (!(Test-Path -LiteralPath $mappingPdv)) { throw 'Mapping R8 ausente; o candidato deve exercitar ofuscação.' }
    Copy-Item -LiteralPath $mappingPdv -Destination "$destinoPdv/$baseNomePdv-r8-mapping.txt" -Force
    if ($Aab) { Copy-Item -LiteralPath app/build/outputs/bundle/release/app-release.aab -Destination "$destinoPdv/$baseNomePdv.aab" -Force }
    else { Copy-Item -LiteralPath app/build/outputs/apk/release/app-release.apk -Destination "$destinoPdv/$baseNomePdv.apk" -Force }
  } finally { Pop-Location }
} finally { Pop-Location }
$pacoteEsperadoPdv = if ($Perfil -eq 'homologacao') { 'br.com.pdv.mobile.homologacao' } else { $configPdv.expo.android.package }
if ($Aab) {
  $artefatoPdv = "$destinoPdv/$baseNomePdv.aab"
  $entradaBundleNomePdv = 'base/assets/index.android.bundle'
  $jdkBinPdv = "$env:JAVA_HOME/bin"
  # Assinatura: jarsigner confere a integridade e o certificado precisa ser o da chave informada.
  $env:PDV_VERIF_STORE = $senhaStorePdv
  try {
    $verificacaoJarPdv = & "$jdkBinPdv/jarsigner.exe" -verify $artefatoPdv 2>&1
    if ($LASTEXITCODE -ne 0 -or ($verificacaoJarPdv -join "`n") -notmatch 'jar verified') { throw 'jarsigner não verificou o AAB.' }
    $certAabPdv = (& "$jdkBinPdv/keytool.exe" -printcert -jarfile $artefatoPdv 2>&1) -join "`n"
    $certChavePdv = (& "$jdkBinPdv/keytool.exe" -list -v -keystore $keystorePdv -alias $Alias -storepass:env PDV_VERIF_STORE 2>&1) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível ler a chave de upload para conferir o certificado.' }
  } finally { Remove-Item Env:PDV_VERIF_STORE -ErrorAction SilentlyContinue }
  $shaAabCertPdv = [regex]::Match($certAabPdv, 'SHA256:\s*([0-9A-F:]{95})').Groups[1].Value
  $shaChavePdv = [regex]::Match($certChavePdv, 'SHA256:\s*([0-9A-F:]{95})').Groups[1].Value
  if (!$shaAabCertPdv -or $shaAabCertPdv -ne $shaChavePdv) { throw 'Certificado do AAB não é o da chave de upload informada.' }
  $certificadoSha256Pdv = $shaChavePdv
  $manifestoAabPdv = (Invoke-BundletoolPdv dump manifest "--bundle=$artefatoPdv" 2>&1) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw 'bundletool dump manifest falhou.' }
  $pacoteAabPdv = [regex]::Match($manifestoAabPdv, '<manifest[^>]*\spackage="([^"]+)"').Groups[1].Value
  $versionCodeAabPdv = [regex]::Match($manifestoAabPdv, 'android:versionCode="(\d+)"').Groups[1].Value
  $minSdkPdv = [regex]::Match($manifestoAabPdv, 'android:minSdkVersion="(\d+)"').Groups[1].Value
  $targetSdkPdv = [regex]::Match($manifestoAabPdv, 'android:targetSdkVersion="(\d+)"').Groups[1].Value
  if (!$pacoteAabPdv -or !$versionCodeAabPdv -or !$minSdkPdv -or !$targetSdkPdv) { throw 'Não foi possível extrair pacote/versionCode/SDKs do AAB.' }
  if ($pacoteAabPdv -ne $pacoteEsperadoPdv) { throw "Pacote do AAB ($pacoteAabPdv) diverge do perfil ($pacoteEsperadoPdv)." }
  if ([int]$versionCodeAabPdv -ne [int]$configPdv.expo.android.versionCode) { throw 'versionCode do AAB diverge do app.json.' }
  @("pacote=$pacoteAabPdv", "versionCode=$versionCodeAabPdv", "minSdkVersion=$minSdkPdv", "targetSdkVersion=$targetSdkPdv", "certificadoSha256=$certificadoSha256Pdv", 'jarsigner=jar verified', '', $manifestoAabPdv) | Set-Content "$destinoPdv/$baseNomePdv-metadados.txt"
  $hashPdv = (Get-FileHash -LiteralPath $artefatoPdv -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hashPdv  $baseNomePdv.aab" | Set-Content "$artefatoPdv.sha256"
} else {
  $apkPdv = "$destinoPdv/$baseNomePdv.apk"
  $artefatoPdv = $apkPdv
  $entradaBundleNomePdv = 'assets/index.android.bundle'
  & "$env:ANDROID_HOME/build-tools/37.0.0/apksigner.bat" verify --verbose --print-certs $apkPdv | Set-Content "$destinoPdv/$baseNomePdv-assinatura.txt"
  if ($LASTEXITCODE -ne 0) { throw 'Assinatura inválida.' }
  & "$env:ANDROID_HOME/build-tools/37.0.0/aapt.exe" dump badging $apkPdv | Set-Content "$destinoPdv/$baseNomePdv-metadados.txt"
  if ($LASTEXITCODE -ne 0) { throw 'Metadados APK inválidos.' }
  $hashPdv = (Get-FileHash -LiteralPath $apkPdv -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hashPdv  $baseNomePdv.apk" | Set-Content "$apkPdv.sha256"
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPdv = [IO.Compression.ZipFile]::OpenRead($artefatoPdv)
try {
  $entradaPdv = $zipPdv.GetEntry($entradaBundleNomePdv)
  if (!$entradaPdv) { throw 'Bundle ausente.' }
  $memoriaPdv = New-Object IO.MemoryStream
  $streamPdv = $entradaPdv.Open()
  try { $streamPdv.CopyTo($memoriaPdv) } finally { $streamPdv.Dispose() }
  $bytesBundlePdv = $memoriaPdv.ToArray()
  $textoPdv = [Text.Encoding]::UTF8.GetString($bytesBundlePdv)
  $memoriaPdv.Dispose()
  if ($Perfil -ne 'demo') {
    if (!$textoPdv.Contains(([Uri]$env:EXPO_PUBLIC_API_URL).Host)) { throw 'URL conectada ausente no bundle final.' }
    foreach ($marcaPdv in @('Copiar diagn', 'Compartilhar arquivo', 'Limpar diagn')) {
      if ($textoPdv.Contains($marcaPdv)) { throw "Ferramenta de teste no bundle: $marcaPdv" }
    }
    $bundleVerificacaoPdv = "$destinoPdv/$baseNomePdv-bundle.hbc"
    [IO.File]::WriteAllBytes($bundleVerificacaoPdv, $bytesBundlePdv)
    $mapaOrigemPdv = "$copiaPdv/apps/mobile/android/app/build/generated/sourcemaps/react/release/index.android.bundle.map"
    if (!(Test-Path -LiteralPath $mapaOrigemPdv)) { throw 'Source map do build ausente; não é possível validar o grafo do release.' }
    $mapaVerificacaoPdv = "$bundleVerificacaoPdv.map"
    Copy-Item -LiteralPath $mapaOrigemPdv -Destination $mapaVerificacaoPdv -Force
    & node "$repoPdv/scripts/verificar-release-mobile.mjs" $bundleVerificacaoPdv ([Uri]$env:EXPO_PUBLIC_API_URL).Host $mapaVerificacaoPdv "$destinoPdv/$baseNomePdv-verificacao.json"
    if ($LASTEXITCODE -ne 0) { throw 'Verificação do release conectado falhou.' }
  }
} finally { $zipPdv.Dispose() }
if ($Aab) {
  # APK universal derivado do AAB, assinado com a keystore de debug do prebuild: somente para aparelho de teste.
  $debugKeystorePdv = "$copiaPdv/apps/mobile/android/app/debug.keystore"
  if (!(Test-Path -LiteralPath $debugKeystorePdv)) { throw 'debug.keystore do prebuild ausente.' }
  $apksPdv = "$destinoPdv/$baseNomePdv-universal.apks"
  $apkUniversalPdv = "$destinoPdv/$baseNomePdv-universal.apk"
  Remove-Item -LiteralPath $apksPdv, $apkUniversalPdv -Force -ErrorAction SilentlyContinue
  Invoke-BundletoolPdv build-apks "--bundle=$artefatoPdv" "--output=$apksPdv" --mode=universal "--ks=$debugKeystorePdv" --ks-key-alias=androiddebugkey --ks-pass=pass:android --key-pass=pass:android
  if ($LASTEXITCODE -ne 0) { throw 'bundletool build-apks falhou.' }
  $zipApksPdv = [IO.Compression.ZipFile]::OpenRead($apksPdv)
  try {
    $entradaApkPdv = $zipApksPdv.GetEntry('universal.apk')
    if (!$entradaApkPdv) { throw 'universal.apk ausente no .apks.' }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entradaApkPdv, $apkUniversalPdv, $true)
  } finally { $zipApksPdv.Dispose() }
  Remove-Item -LiteralPath $apksPdv -Force
  $badgingPdv = (& "$env:ANDROID_HOME/build-tools/37.0.0/aapt.exe" dump badging $apkUniversalPdv) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw 'Metadados do APK universal inválidos.' }
  $badgingPdv | Set-Content "$destinoPdv/$baseNomePdv-universal-metadados.txt"
  if ($badgingPdv -notmatch "package: name='$([regex]::Escape($pacoteEsperadoPdv))'") { throw 'Pacote do APK universal diverge do perfil.' }
  & "$env:ANDROID_HOME/build-tools/37.0.0/apksigner.bat" verify --verbose --print-certs $apkUniversalPdv | Set-Content "$destinoPdv/$baseNomePdv-universal-assinatura.txt"
  if ($LASTEXITCODE -ne 0) { throw 'Assinatura do APK universal inválida.' }
  $hashUniversalPdv = (Get-FileHash -LiteralPath $apkUniversalPdv -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hashUniversalPdv  $baseNomePdv-universal.apk" | Set-Content "$apkUniversalPdv.sha256"
  Write-Output "AAB verificado: $artefatoPdv"
  Write-Output "SHA256 AAB: $hashPdv"
  Write-Output "APK universal (somente aparelho de teste): $apkUniversalPdv"
  Write-Output "SHA256 APK universal: $hashUniversalPdv"
  [ordered]@{ versao = $versaoPdv; versionCode = [int]$versionCodeAabPdv; pacote = $pacoteAabPdv; perfil = $Perfil; arquiteturas = $arquiteturasPdv; targetSdk = [int]$targetSdkPdv; minSdk = [int]$minSdkPdv; aab = "$baseNomePdv.aab"; sha256 = $hashPdv; apkUniversal = "$baseNomePdv-universal.apk"; sha256ApkUniversal = $hashUniversalPdv; api = $env:EXPO_PUBLIC_API_URL; rotaSuportePresente = $apiCompativelPdv; assinatura = 'chave de upload'; certificadoSha256 = $certificadoSha256Pdv; assinaturaApkUniversal = 'debug do prebuild; somente aparelho de teste'; androidFisico = 'pendente'; aceiteHumano = 'pendente' } | ConvertTo-Json | Set-Content "$destinoPdv/$baseNomePdv-manifesto.json"
  return
}
Write-Output "APK verificado: $apkPdv"
Write-Output "SHA256: $hashPdv"
[ordered]@{ versao = $versaoPdv; versionCode = $configPdv.expo.android.versionCode; perfil = $Perfil; arquiteturas = $arquiteturasPdv; emulador = [bool]$Emulador; sha256 = $hashPdv; api = $env:EXPO_PUBLIC_API_URL; rotaSuportePresente = $apiCompativelPdv; assinatura = 'teste local; não é assinatura de distribuição'; androidFisico = 'pendente'; aceiteHumano = 'pendente' } | ConvertTo-Json | Set-Content "$destinoPdv/$baseNomePdv-manifesto.json"
if ($Perfil -ne 'demo' -and !$apiCompativelPdv) { Write-Warning 'APK preparado, mas a API ainda não expõe o suporte R5. Não iniciar operação comercial antes do deploy e da homologação completa.' }
