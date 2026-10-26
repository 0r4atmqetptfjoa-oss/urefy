param(
  [switch]$SkipCloudflareSecrets
)

$ErrorActionPreference = 'Stop'
$resourceGroup = 'urefy-ai-pilot'
$region = 'westeurope'
$cloudflareProject = 'aetheris-omni-sphere'
$template = Join-Path $PSScriptRoot 'urefy-ai-pilot.bicep'
$azPath = (Get-Command az -ErrorAction SilentlyContinue)?.Source
if (-not $azPath) { $azPath = 'C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd' }
if (-not (Test-Path -LiteralPath $azPath)) { throw 'Azure CLI is not installed. Install it from Microsoft, sign in, and rerun this script.' }

$account = & $azPath account show --query '{name:name,state:state}' --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $account.state -ne 'Enabled') { throw 'Sign in to the intended Azure subscription before running this deployment.' }

$tempParameters = Join-Path $env:TEMP ("urefy-ai-parameters-{0}.json" -f [guid]::NewGuid().ToString('N'))
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$passwordBytes = New-Object byte[] 36
$tokenBytes = New-Object byte[] 48
$rng.GetBytes($passwordBytes)
$rng.GetBytes($tokenBytes)
$pgPassword = ([Convert]::ToBase64String($passwordBytes).TrimEnd('=').Replace('+', 'A').Replace('/', 'b')) + 'A1!'
$sharedToken = [Convert]::ToBase64String($tokenBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

try {
  $parameterContent = @{
    pgAdminPassword = @{ value = $pgPassword }
    sharedToken = @{ value = $sharedToken }
  } | ConvertTo-Json -Depth 5
  Set-Content -LiteralPath $tempParameters -Value $parameterContent -Encoding utf8
  & icacls.exe $tempParameters /inheritance:r /grant:r "$($env:USERNAME):(F)" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restrict access to the temporary deployment parameters.' }

  Write-Host 'Creating the Azure pilot resource group and budgeted resources...'
  & $azPath group create --name $resourceGroup --location $region --output none
  if ($LASTEXITCODE -ne 0) { throw 'Azure could not create the pilot resource group.' }

  $deployment = & $azPath deployment group create `
    --resource-group $resourceGroup `
    --name 'urefy-ai-pilot' `
    --template-file $template `
    --parameters "@$tempParameters" `
    --query properties.outputs `
    --output json | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Azure resource deployment failed. Review the deployment error in Azure before retrying.' }

  $registryName = $deployment.registryName.value
  $appName = $deployment.appName.value
  $appUrl = $deployment.appUrl.value
  $postgresName = $deployment.postgresServerName.value

  Write-Host 'Building the small AI API image in the Azure registry...'
  & $azPath acr build --registry $registryName --image 'urefy-azure-ai-api:stable' --file 'Dockerfile' 'infra/azure/ai-api' --no-logs
  if ($LASTEXITCODE -ne 0) { throw 'The Azure container image build failed.' }

  Write-Host 'Allowing only the App Service outbound addresses to reach the pilot database...'
  $outboundText = & $azPath webapp show --resource-group $resourceGroup --name $appName --query possibleOutboundIpAddresses --output tsv
  if ($LASTEXITCODE -ne 0 -or -not $outboundText) { throw 'Could not read the App Service outbound addresses for the database firewall.' }
  $outboundIps = @($outboundText.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
  for ($index = 0; $index -lt $outboundIps.Count; $index++) {
    $ruleName = 'urefy-app-{0:D2}' -f $index
    & $azPath postgres flexible-server firewall-rule create `
      --resource-group $resourceGroup `
      --name $postgresName `
      --rule-name $ruleName `
      --start-ip-address $outboundIps[$index] `
      --end-ip-address $outboundIps[$index] `
      --output none
    if ($LASTEXITCODE -ne 0) { throw "Could not create the restricted database firewall rule $ruleName." }
  }

  Write-Host 'Restarting the API and checking its health endpoint...'
  & $azPath webapp restart --resource-group $resourceGroup --name $appName
  if ($LASTEXITCODE -ne 0) { throw 'Could not restart the Azure AI API.' }
  $healthy = $false
  for ($attempt = 0; $attempt -lt 18; $attempt++) {
    try {
      $health = Invoke-RestMethod -Uri "$appUrl/readyz" -TimeoutSec 8
      if ($health.ok -eq $true) { $healthy = $true; break }
    } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $healthy) { throw "The Azure AI API did not become ready. Open $appUrl/readyz and inspect App Service logs." }

  if (-not $SkipCloudflareSecrets) {
    Write-Host 'Adding the private Azure endpoint and shared token to the Cloudflare Pages production secrets...'
    $appUrl | npx wrangler pages secret put AZURE_AI_API_URL --project-name $cloudflareProject --env production
    if ($LASTEXITCODE -ne 0) { throw 'Could not save the Azure endpoint in Cloudflare Pages.' }
    $sharedToken | npx wrangler pages secret put UREFY_AI_SHARED_TOKEN --project-name $cloudflareProject --env production
    if ($LASTEXITCODE -ne 0) { throw 'Could not save the private API token in Cloudflare Pages.' }
  }

  Write-Host "Azure pilot is healthy at $appUrl"
  Write-Host 'The Cloudflare secrets are configured. Deploy the client changes from a clean production base to publish the feed action.'
} finally {
  if (Test-Path -LiteralPath $tempParameters) { Remove-Item -LiteralPath $tempParameters -Force }
  [Array]::Clear($passwordBytes, 0, $passwordBytes.Length)
  [Array]::Clear($tokenBytes, 0, $tokenBytes.Length)
  $pgPassword = $null
  $sharedToken = $null
  $rng.Dispose()
}
