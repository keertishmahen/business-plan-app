# Azure Symetra MIA Deployment Script
# Requires: Azure CLI logged in (az login), Node.js, npm
#
# Usage:
#   .\scripts\deploy-azure.ps1
#   .\scripts\deploy-azure.ps1 -GeminiApiKey "your-key" -SkipInfrastructure
#
# Note: Azure for Students subscriptions may block Static Web Apps in all SWA regions.
# This script hosts the React build on Azure Storage static website (swedencentral).

param(
  [string]$ResourceGroup = "rg-symetra-mia",
  [string]$Location = "swedencentral",
  [string]$PlanName = "plan-symetra-mia",
  [string]$ApiAppName = "symetra-mia-api",
  [string]$StorageAccount = "symetramiaweb",
  [string]$GeminiApiKey = "",
  [switch]$SkipInfrastructure,
  [switch]$BackendOnly,
  [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"
$env:AZURE_CORE_ONLY_SHOW_ERRORS = "true"
$AzPython = "C:\Program Files\Microsoft SDKs\Azure\CLI2\python.exe"
$AzBaseArgs = @("-m", "azure.cli")
if (-not (Test-Path $AzPython)) {
  $AzPython = "az"
  $AzBaseArgs = @()
}
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ServerDir = Join-Path $Root "server"
$ApiUrl = "https://$ApiAppName.azurewebsites.net"

function Get-GeminiKey {
  if ($GeminiApiKey) { return $GeminiApiKey }
  $envFile = Join-Path $ServerDir ".env"
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Where-Object { $_ -match "^GEMINI_API_KEY=(.+)$" } | Select-Object -First 1
    if ($line -match "^GEMINI_API_KEY=(.+)$") {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  $secure = Read-Host "Enter GEMINI_API_KEY (server-side only, not stored in repo)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Test-AzCli {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & $AzPython @AzBaseArgs @Args *> $null
  $ok = $LASTEXITCODE -eq 0
  $ErrorActionPreference = $prev
  return $ok
}

function Invoke-AzCli {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  $result = & $AzPython @AzBaseArgs @Args 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI failed: az $($Args -join ' ')"
  }
  return $result
}

function Ensure-ResourceGroup {
  $existing = az group show --name $ResourceGroup --query location -o tsv 2>$null
  if ($existing -and $existing -ne $Location) {
    Write-Host "Resource group '$ResourceGroup' is in $existing; recreating in $Location..." -ForegroundColor DarkYellow
    Invoke-AzCli group delete --name $ResourceGroup --yes --no-wait --output none
    for ($i = 0; $i -lt 30; $i++) {
      Start-Sleep -Seconds 5
      $gone = az group exists --name $ResourceGroup -o tsv 2>$null
      if ($gone -eq "false") { break }
    }
  }
  Invoke-AzCli group create --name $ResourceGroup --location $Location --output none
}

Write-Host "`n=== Symetra MIA Azure Deploy ===" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl"
Write-Host "Region:  $Location"

if (-not $FrontendOnly) {
  if (-not $SkipInfrastructure) {
    Write-Host "`n[1/4] Creating Azure resources..." -ForegroundColor Yellow
    Ensure-ResourceGroup
    $planExists = Test-AzCli appservice plan show --name $PlanName --resource-group $ResourceGroup
    if (-not $planExists) {
      try {
        Invoke-AzCli appservice plan create --name $PlanName --resource-group $ResourceGroup --sku B1 --is-linux --output none
      } catch {
        Write-Host "B1 unavailable, trying F1..." -ForegroundColor DarkYellow
        Invoke-AzCli appservice plan create --name $PlanName --resource-group $ResourceGroup --sku F1 --is-linux --output none
      }
    }
    $apiExists = Test-AzCli webapp show --name $ApiAppName --resource-group $ResourceGroup
    if (-not $apiExists) {
      Invoke-AzCli webapp create --name $ApiAppName --resource-group $ResourceGroup --plan $PlanName --runtime "NODE|22-lts" --output none
    }
    $storageInRg = Test-AzCli storage account show --name $StorageAccount --resource-group $ResourceGroup
    if (-not $storageInRg) {
      $storageExists = az storage account check-name --name $StorageAccount --query nameAvailable -o tsv 2>$null
      if ($storageExists -eq "false") {
        throw "Storage account name '$StorageAccount' is taken globally. Pass -StorageAccount with a unique name."
      }
      Invoke-AzCli storage account create --name $StorageAccount --resource-group $ResourceGroup --location $Location --sku Standard_LRS --kind StorageV2 --output none
    }
    Invoke-AzCli storage blob service-properties update --account-name $StorageAccount --static-website --index-document index.html --404-document index.html --auth-mode key --output none
  }

  $key = Get-GeminiKey
  if (-not $key) { throw "GEMINI_API_KEY is required" }

  Write-Host "`n[2/4] Configuring App Service settings..." -ForegroundColor Yellow
  Invoke-AzCli webapp config appsettings set --name $ApiAppName --resource-group $ResourceGroup --settings `
    GEMINI_API_KEY="$key" `
    SCM_DO_BUILD_DURING_DEPLOYMENT=true `
    WEBSITE_NODE_DEFAULT_VERSION="~22" `
    --output none

  Invoke-AzCli webapp config set --name $ApiAppName --resource-group $ResourceGroup --startup-file "node index.js" --output none

  Write-Host "`n[3/4] Packaging and deploying backend..." -ForegroundColor Yellow
  Push-Location $ServerDir
  $zipPath = Join-Path $env:TEMP "symetra-mia-api.zip"
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  $zipScript = Join-Path $Root "scripts\make-linux-zip.py"
  python $zipScript $ServerDir $zipPath | Out-Null
  Pop-Location

  Invoke-AzCli webapp deployment source config-zip --resource-group $ResourceGroup --name $ApiAppName --src $zipPath --timeout 900
  Write-Host "Backend deploy initiated. Waiting for health check..."
  $healthy = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 10
    try {
      $r = Invoke-WebRequest -Uri "$ApiUrl/api/health" -UseBasicParsing -TimeoutSec 15
      if ($r.StatusCode -eq 200) { $healthy = $true; break }
    } catch { Write-Host "." -NoNewline }
  }
  Write-Host ""
  if (-not $healthy) { Write-Warning "Health check not yet OK — first boot may still be seeding KB (~60s)" }
  else { Write-Host "Backend healthy." -ForegroundColor Green }
}

if (-not $BackendOnly) {
  Write-Host "`n[4/4] Building and deploying frontend..." -ForegroundColor Yellow
  Push-Location $Root
  $env:REACT_APP_RAG_URL = $ApiUrl
  $env:CI = ''
  npm run build

  if (-not $SkipInfrastructure) {
    Invoke-AzCli storage blob service-properties update --account-name $StorageAccount --static-website --index-document index.html --404-document index.html --auth-mode key --output none
  }

  Invoke-AzCli storage blob upload-batch --account-name $StorageAccount --destination '$web' --source ./build --overwrite --auth-mode key --output none

  $webEndpoint = (Invoke-AzCli storage account show --name $StorageAccount --resource-group $ResourceGroup --query "primaryEndpoints.web" -o tsv).Trim().TrimEnd("/")
  Write-Host "`nUpdating CORS to $webEndpoint" -ForegroundColor Yellow
  Invoke-AzCli webapp config appsettings set --name $ApiAppName --resource-group $ResourceGroup --settings CORS_ORIGIN="$webEndpoint" --output none
  Pop-Location

  Write-Host "`n=== Deployment complete ===" -ForegroundColor Green
  Write-Host "Frontend: $webEndpoint"
  Write-Host "API:      $ApiUrl"
  Write-Host "Health:   $ApiUrl/api/health"
}
