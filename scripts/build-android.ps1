param(
  [ValidateSet('demo', 'homologacao', 'producao')][string]$Perfil = 'homologacao',
  [switch]$Emulador
)
$ErrorActionPreference = 'Stop'
if ($Perfil -eq 'producao') { throw 'Distribuição de produção exige assinatura própria. Use o perfil EAS producao; este script local gera somente APK interno assinado para testes.' }
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
  Set-Content -LiteralPath android/app/build.gradle -Value $appGradlePdv -NoNewline
  Push-Location android
  try {
    & ./gradlew.bat assembleRelease "-PreactNativeArchitectures=$arquiteturasPdv" *>&1 | Tee-Object "$destinoPdv/$baseNomePdv-build.log"
    if ($LASTEXITCODE -ne 0) { throw 'Gradle falhou.' }
    $mappingPdv = 'app/build/outputs/mapping/release/mapping.txt'
    if (!(Test-Path -LiteralPath $mappingPdv)) { throw 'Mapping R8 ausente; o candidato deve exercitar ofuscação.' }
    Copy-Item -LiteralPath $mappingPdv -Destination "$destinoPdv/$baseNomePdv-r8-mapping.txt" -Force
    Copy-Item -LiteralPath app/build/outputs/apk/release/app-release.apk -Destination "$destinoPdv/$baseNomePdv.apk" -Force
  } finally { Pop-Location }
} finally { Pop-Location }
$apkPdv = "$destinoPdv/$baseNomePdv.apk"
& "$env:ANDROID_HOME/build-tools/37.0.0/apksigner.bat" verify --verbose --print-certs $apkPdv | Set-Content "$destinoPdv/$baseNomePdv-assinatura.txt"
if ($LASTEXITCODE -ne 0) { throw 'Assinatura inválida.' }
& "$env:ANDROID_HOME/build-tools/37.0.0/aapt.exe" dump badging $apkPdv | Set-Content "$destinoPdv/$baseNomePdv-metadados.txt"
if ($LASTEXITCODE -ne 0) { throw 'Metadados APK inválidos.' }
$hashPdv = (Get-FileHash -LiteralPath $apkPdv -Algorithm SHA256).Hash.ToLowerInvariant()
"$hashPdv  $baseNomePdv.apk" | Set-Content "$apkPdv.sha256"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPdv = [IO.Compression.ZipFile]::OpenRead($apkPdv)
try {
  $entradaPdv = $zipPdv.GetEntry('assets/index.android.bundle')
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
Write-Output "APK verificado: $apkPdv"
Write-Output "SHA256: $hashPdv"
[ordered]@{ versao = $versaoPdv; versionCode = $configPdv.expo.android.versionCode; perfil = $Perfil; arquiteturas = $arquiteturasPdv; emulador = [bool]$Emulador; sha256 = $hashPdv; api = $env:EXPO_PUBLIC_API_URL; rotaSuportePresente = $apiCompativelPdv; assinatura = 'teste local; não é assinatura de distribuição'; androidFisico = 'pendente'; aceiteHumano = 'pendente' } | ConvertTo-Json | Set-Content "$destinoPdv/$baseNomePdv-manifesto.json"
if ($Perfil -ne 'demo' -and !$apiCompativelPdv) { Write-Warning 'APK preparado, mas a API ainda não expõe o suporte R5. Não iniciar operação comercial antes do deploy e da homologação completa.' }
