#!/usr/bin/env powershell
# ShareVibe Deployment Script for Windows PowerShell
# Clean, working deployment script

param(
    [string]$Server = $env:SHAREVIBE_DEPLOY_HOST,
    [string]$Port = $(if ($env:SHAREVIBE_DEPLOY_PORT) { $env:SHAREVIBE_DEPLOY_PORT } else { "22" }),
    [string]$User = $env:SHAREVIBE_DEPLOY_USER,
    [string]$WebRoot = $env:SHAREVIBE_DEPLOY_PATH,
    [string]$SshKeyPath = $env:SHAREVIBE_DEPLOY_SSH_KEY_PATH
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$DistPath = Join-Path $ProjectRoot "dist"
$LocalDeployDir = Join-Path $ProjectRoot "ops/_local/deploy"
$ArchivePath = Join-Path $LocalDeployDir "sharevibe-dist.zip"

Write-Host "=== ShareVibe Deployment Script ===" -ForegroundColor Cyan

if (-not $Server -or -not $User -or -not $WebRoot) {
    Write-Host "[ERROR] Missing SHAREVIBE_DEPLOY_HOST, SHAREVIBE_DEPLOY_USER, or SHAREVIBE_DEPLOY_PATH." -ForegroundColor Red
    Write-Host "Use npm run deploy:discover if SHAREVIBE_DEPLOY_PATH is not known." -ForegroundColor Yellow
    exit 1
}

if ($User -eq "root") {
    Write-Host "[ERROR] Root SSH deployment is blocked. Use a non-root deploy user." -ForegroundColor Red
    exit 1
}

$SshArgs = @("-p", $Port)
$ScpArgs = @("-P", $Port)
if ($SshKeyPath) {
    $SshArgs += @("-i", $SshKeyPath)
    $ScpArgs += @("-i", $SshKeyPath)
}

Write-Host "Target: ${User}@${Server}:${WebRoot}" -ForegroundColor Gray

# Check dist folder
if (-not (Test-Path $DistPath)) {
    Write-Host "[ERROR] dist folder not found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}

Write-Host "[+] dist folder found" -ForegroundColor Green

# Create archive
Write-Host "[+] Creating deployment archive..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $LocalDeployDir | Out-Null
Compress-Archive -Path $DistPath -DestinationPath $ArchivePath -Force
Write-Host "[OK] Archive created: $ArchivePath" -ForegroundColor Green

# Upload archive
Write-Host "[+] Uploading to server..." -ForegroundColor Yellow
scp @ScpArgs $ArchivePath "${User}@${Server}:/tmp/"
Write-Host "[OK] Upload complete" -ForegroundColor Green

# Deploy on server
Write-Host "[+] Deploying on server..." -ForegroundColor Yellow
$deployScript = @"
cd /tmp
unzip -o sharevibe-dist.zip
mkdir -p $WebRoot
cp -r dist/* $WebRoot/
chmod -R 755 $WebRoot
rm -rf dist sharevibe-dist.zip
echo "Deployment complete"
"@

ssh @SshArgs "${User}@${Server}" $deployScript
Write-Host "[OK] Deployment complete" -ForegroundColor Green

Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
Write-Host "ShareVibe deployed to: https://sharevibe.co" -ForegroundColor Cyan
