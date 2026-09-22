# ──────────────────────────────────────────────────────────────────
#  Deploy the Symetra dashboard to Azure
#
#  Backend : FastAPI + Chroma  -> Azure Container Apps
#  Frontend: React build       -> Azure Storage static website
#
#  Static Web Apps is NOT used: it is blocked by subscription policy on the
#  Azure for Students subscription ("RequestDisallowedByAzure"), which is why
#  the frontend is served from storage static-website hosting instead.
#
#  Chroma runs on the container's own disk rather than an Azure Files mount:
#  Container Apps "express" environments reject storage mounts
#  ("ExpressEnvironmentResourceNotSupported"). The backend compensates by
#  self-seeding its knowledge base from a vector snapshot baked into the image
#  on every cold start (see app/services/chroma_store.ensure_knowledge_seeded),
#  so a restart never leaves it serving ungrounded answers. Per-session
#  `user_context` is rebuilt naturally as the user works through the 9 steps.
#
#  Prerequisites:
#    az login --tenant cranfield.ac.uk
#    az account set --subscription <Azure for Students id>
#
#  Usage:
#    ./scripts/deploy-azure.ps1                 # full deploy
#    ./scripts/deploy-azure.ps1 -BackendOnly
#    ./scripts/deploy-azure.ps1 -FrontendOnly
# ──────────────────────────────────────────────────────────────────

[CmdletBinding()]
param(
    [string]$ResourceGroup = "rg-symetra-v2",
    [string]$Location      = "swedencentral",
    [string]$EnvName       = "cae-symetra",
    [string]$AppName       = "ca-symetra-api",
    [string]$Registry      = "acrsymetrav228317",
    [string]$StorageAccount= "stsymetrav228637",
    [string]$ImageTag      = "v3",
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

function Write-Step($message) { Write-Host "`n=== $message ===" -ForegroundColor Cyan }

# ── Guard: make sure we are not deploying into the wrong tenant ───
Write-Step "Verifying Azure context"
$account = az account show --query "{user:user.name,sub:name,id:id}" -o json | ConvertFrom-Json
if (-not $account) { throw "Not logged in. Run: az login --tenant cranfield.ac.uk" }
Write-Host "  Account : $($account.user)"
Write-Host "  Subscription: $($account.sub)"
if ($account.user -notlike "*cranfield.ac.uk") {
    throw "Logged in as $($account.user). Expected a cranfield.ac.uk account — refusing to deploy."
}

# ── Backend ───────────────────────────────────────────────────────
if (-not $FrontendOnly) {
    Write-Step "Building backend image in ACR ($Registry)"
    # Built in the cloud so a local Docker daemon is not required.
    az acr build -r $Registry -t "symetra-api:$ImageTag" -f "$repoRoot/server_py/Dockerfile" "$repoRoot/server_py"
    if ($LASTEXITCODE -ne 0) { throw "ACR build failed" }

    Write-Step "Deploying container app ($AppName)"
    $acrPassword = az acr credential show -n $Registry --query "passwords[0].value" -o tsv
    $webUrl = az storage account show -n $StorageAccount -g $ResourceGroup --query "primaryEndpoints.web" -o tsv
    $webOrigin = $webUrl.TrimEnd('/')

    az containerapp update `
        --name $AppName `
        --resource-group $ResourceGroup `
        --image "$Registry.azurecr.io/symetra-api:$ImageTag" `
        --set-env-vars "CHROMA_PATH=/data/chroma" "CORS_ORIGIN=$webOrigin" `
        -o none
    if ($LASTEXITCODE -ne 0) { throw "Container app update failed" }

    $fqdn = az containerapp show -n $AppName -g $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
    Write-Host "  Backend: https://$fqdn"
}

# ── Frontend ──────────────────────────────────────────────────────
if (-not $BackendOnly) {
    Write-Step "Building frontend"
    $fqdn = az containerapp show -n $AppName -g $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
    if (-not $fqdn) { throw "Could not resolve backend FQDN" }

    # Bake the live API URL into the bundle. No secrets here — the Gemini key
    # stays server-side as a Container App secret.
    @"
# Production frontend -> Azure Container Apps API (no Gemini key here — server-managed)
REACT_APP_RAG_URL=https://$fqdn
"@ | Out-File -FilePath "$repoRoot/.env.production" -Encoding utf8

    Push-Location $repoRoot
    try {
        $env:CI = "true"
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    } finally { Pop-Location }

    Write-Step "Uploading to static website ($StorageAccount)"
    $key = az storage account keys list -n $StorageAccount -g $ResourceGroup --query "[0].value" -o tsv
    az storage blob upload-batch `
        --account-name $StorageAccount --account-key $key `
        -s "$repoRoot/build" -d '$web' --overwrite -o none
    if ($LASTEXITCODE -ne 0) { throw "Upload failed" }

    $webUrl = az storage account show -n $StorageAccount -g $ResourceGroup --query "primaryEndpoints.web" -o tsv
    Write-Host "  Frontend: $webUrl"
}

# ── Verify ────────────────────────────────────────────────────────
Write-Step "Verifying"
$fqdn = az containerapp show -n $AppName -g $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
$health = curl.exe -s --max-time 120 "https://$fqdn/api/health" | ConvertFrom-Json
Write-Host "  API status : $($health.status)"
Write-Host "  Documents  : $($health.documentCounts | ConvertTo-Json -Compress)"
if ($health.status -ne "healthy") { throw "Backend is not healthy" }

$webUrl = az storage account show -n $StorageAccount -g $ResourceGroup --query "primaryEndpoints.web" -o tsv
Write-Host "`nDeployed:" -ForegroundColor Green
Write-Host "  Dashboard: $webUrl"
Write-Host "  API      : https://$fqdn"
