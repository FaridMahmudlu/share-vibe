#!/usr/bin/env powershell
# ShareVibe Deployment Script for Windows PowerShell
# Clean, working deployment script

param(
    [string]$Server = "185.34.101.235",
    [string]$User = "root",
    [string]$WebRoot = "/var/www/sharevibe/html",
    [string]$Password
)

$ErrorActionPreference = "Stop"

Write-Host "=== ShareVibe Deployment Script ===" -ForegroundColor Cyan
Write-Host "Target: ${User}@${Server}:${WebRoot}" -ForegroundColor Gray

# Check dist folder
if (-not (Test-Path "dist")) {
    Write-Host "[ERROR] dist folder not found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}

Write-Host "[+] dist folder found" -ForegroundColor Green

# Create archive
Write-Host "[+] Creating deployment archive..." -ForegroundColor Yellow
$archivePath = "sharevibe-dist.zip"
Compress-Archive -Path dist -DestinationPath $archivePath -Force
Write-Host "[OK] Archive created: $archivePath" -ForegroundColor Green

# Upload archive
Write-Host "[+] Uploading to server..." -ForegroundColor Yellow
scp $archivePath "${User}@${Server}:/tmp/"
Write-Host "[OK] Upload complete" -ForegroundColor Green

# Deploy on server
Write-Host "[+] Deploying on server..." -ForegroundColor Yellow
$deployScript = @"
cd /tmp
unzip -o sharevibe-dist.zip
mkdir -p $WebRoot
cp -r dist/* $WebRoot/
chown -R www-data:www-data $WebRoot
chmod -R 755 $WebRoot
rm -rf dist sharevibe-dist.zip
echo "Deployment complete"
"@

ssh "${User}@${Server}" $deployScript
Write-Host "[OK] Deployment complete" -ForegroundColor Green

Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
Write-Host "ShareVibe deployed to: https://sharevibe.web.app" -ForegroundColor Cyan
