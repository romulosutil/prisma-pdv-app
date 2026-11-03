param(
  [Parameter(Mandatory=$true)][string]$Apk,
  [string]$Adb = "$env:LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe",
  [string]$Serial,
  [string]$Saida = 'builds/r5-android-inventario.json'
)
$ErrorActionPreference = 'Stop'
$apkPdv = (Resolve-Path -LiteralPath $Apk).Path
$hashPdv = (Get-FileHash -LiteralPath $apkPdv -Algorithm SHA256).Hash.ToLowerInvariant()
$linhasPdv = & $Adb devices
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o ADB.' }
$aparelhosPdv = @($linhasPdv | Where-Object { $_ -match '^\S+\s+device$' } | ForEach-Object { ($_ -split '\s+')[0] })
if (!$Serial) { if ($aparelhosPdv.Count -ne 1) { throw 'Conecte um Android autorizado ou informe -Serial para selecionar entre aparelhos.' }; $Serial = $aparelhosPdv[0] }
if ($Serial -notin $aparelhosPdv) { throw 'Aparelho ausente ou ainda não autorizado no ADB.' }
function PropriedadePdv([string]$Nome) {
  $valorPdv = & $Adb -s $Serial shell getprop $Nome
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao consultar propriedade do Android.' }
  return ($valorPdv -join '').Trim()
}
if ((PropriedadePdv 'ro.kernel.qemu') -eq '1' -or $Serial.StartsWith('emulator-')) { throw 'Este inventário exige aparelho físico; emulador é outra evidência.' }
$serialHashPdv = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Serial))).ToLowerInvariant()
$resultadoPdv = [ordered]@{
  coletadoEm = [DateTimeOffset]::Now.ToString('o'); apk = [IO.Path]::GetFileName($apkPdv); sha256 = $hashPdv
  aparelho = @{ referencia = $serialHashPdv; modelo = (PropriedadePdv 'ro.product.model'); android = (PropriedadePdv 'ro.build.version.release'); sdk = (PropriedadePdv 'ro.build.version.sdk') }
  resultado = 'inventario'; cenariosFisicos = 'pendentes'; aceiteHumano = 'pendente'
  limite = 'Inventário não instala o APK nem comprova qualquer cenário funcional. Conferir pacote/assinatura/versão e hash do APK efetivamente instalado antes dos testes.'
}
$resultadoPdv | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $Saida
Write-Output "Inventário gravado em $Saida; cenários físicos continuam pendentes."
