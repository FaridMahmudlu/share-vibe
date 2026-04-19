#!/usr/bin/env powershell

# ShareVibe Deployment Script for Windows PowerShell
# Usage: .\deploy.ps1 -Password "your-vds-password"
# Or set environment: $env:VDS_PASSWORD="your-password"; .\deploy.ps1

param(
    [Parameter(ValueFromPipelineByPropertyName)]
    [Alias('p')]
    [string]$Password
)

$ErrorActionPreference = "Stop"

Write-Host "[*] ShareVibe Deployment Starting..." -ForegroundColor Cyan

# Variables
$DEPLOY_USER = "root"
$DEPLOY_HOST = "185.34.101.235"
$WEB_ROOT = "/var/www/sharevibe/html"
$DIST_PATH = "dist"
$NGINX_CONFIG = "/etc/nginx/sites-available/sharevibe.conf"
$SCRIPT_DIR = Get-Location

# Get password from parameter, environment, or prompt
if (-not $Password) {
    $Password = $env:VDS_PASSWORD
}

if (-not $Password) {
    Write-Host "[!] VDS password required for deployment" -ForegroundColor Yellow
    $secPassword = Read-Host "Enter VDS root password" -AsSecureString
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($secPassword))
}

if (-not $Password) {
    Write-Host "[ERROR] No password provided. Cannot continue." -ForegroundColor Red
    exit 1
}

# Check if dist folder exists
if (-not (Test-Path $DIST_PATH)) {
    Write-Host "[ERROR] dist folder not found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# Step 1: Create archive
Write-Host "[+] Step 1: Creating deployment archive..." -ForegroundColor Yellow
if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -czf sharevibe-dist.tar.gz dist
    $archiveName = "sharevibe-dist.tar.gz"
    Write-Host "Created tar.gz archive" -ForegroundColor Gray
} else {
    # Fallback to PowerShell compression
    Write-Host "Using PowerShell compression..." -ForegroundColor Gray
    Compress-Archive -Path dist -DestinationPath sharevibe-dist.zip -Force
    $archiveName = "sharevibe-dist.zip"
    Write-Host "Created zip archive" -ForegroundColor Gray
}

# Verify archive exists
if (-not (Test-Path $archiveName)) {
    Write-Host "[ERROR] Archive creation failed." -ForegroundColor Red
    exit 1
}

$archiveSize = (Get-Item $archiveName).Length / 1MB
Write-Host "[OK] Archive ready ($([math]::Round($archiveSize, 2)) MB)" -ForegroundColor Green

# Step 2: Upload to server using WSL + sshpass
Write-Host "[+] Step 2: Uploading files to server..." -ForegroundColor Yellow

$wslCommand = "wsl sshpass -p '$Password' scp -o StrictHostKeyChecking=no '$archiveName' ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/"
Write-Host "Uploading via WSL/sshpass..." -ForegroundColor Gray

try {
    Invoke-Expression $wslCommand | Out-Null
    Write-Host "[OK] Archive uploaded successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Upload failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Extract and deploy on server
Write-Host "[+] Step 3: Deploying on server..." -ForegroundColor Yellow

$deployScript = @"
mkdir -p /var/www/sharevibe/html
cd /tmp
if test -f sharevibe-dist.tar.gz; then
    tar -xzf sharevibe-dist.tar.gz
    cp -r dist/* /var/www/sharevibe/html/
    rm -rf dist sharevibe-dist.tar.gz
elif test -f sharevibe-dist.zip; then
    unzip -q sharevibe-dist.zip
    cp -r dist/* /var/www/sharevibe/html/
    rm -rf dist sharevibe-dist.zip
else
    echo "ERROR: Archive not found in /tmp"
    exit 1
fi
chown -R www-data:www-data /var/www/sharevibe/html
chmod -R 755 /var/www/sharevibe/html
echo "Files deployed successfully to $WEB_ROOT"
ls -lah /var/www/sharevibe/html/ | head -5
"@

$wslDeployCommand = "wsl sshpass -p '$Password' ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} `"$deployScript`""

try {
    Invoke-Expression $wslDeployCommand | Out-Null
    Write-Host "[OK] Files deployed to server" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Deployment failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Configure Nginx
Write-Host "[+] Step 4: Configuring Nginx..." -ForegroundColor Yellow

if (Test-Path "nginx-sharevibe.conf") {
    $wslNginxUpload = "wsl sshpass -p '$Password' scp -o StrictHostKeyChecking=no 'nginx-sharevibe.conf' ${DEPLOY_USER}@${DEPLOY_HOST}:/etc/nginx/sites-available/sharevibe.conf"
    
    try {
        Invoke-Expression $wslNginxUpload | Out-Null
        Write-Host "Nginx config uploaded" -ForegroundColor Gray
    } catch {
        Write-Host "[WARNING] Failed to upload Nginx config: $_" -ForegroundColor Yellow
    }

    $nginxScript = @"
ln -sf /etc/nginx/sites-available/sharevibe.conf /etc/nginx/sites-enabled/sharevibe.conf
nginx -t
systemctl reload nginx || systemctl restart nginx
echo "Nginx configured successfully"
"@

    $wslNginxCommand = "wsl sshpass -p '$Password' ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} `"$nginxScript`""

    try {
        Invoke-Expression $wslNginxCommand | Out-Null
        Write-Host "[OK] Nginx configured and reloaded" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Nginx configuration may have issues: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] nginx-sharevibe.conf not found. Skipping Nginx setup." -ForegroundColor Yellow
}

# Step 5: Cleanup local files
Write-Host "[+] Step 5: Cleanup..." -ForegroundColor Yellow
if (Test-Path "sharevibe-dist.tar.gz") { Remove-Item "sharevibe-dist.tar.gz" -Force }
if (Test-Path "sharevibe-dist.zip") { Remove-Item "sharevibe-dist.zip" -Force }
Write-Host "[OK] Local archives cleaned up" -ForegroundColor Green

# Step 6: Verify deployment
Write-Host "[+] Step 6: Verifying deployment..." -ForegroundColor Yellow

$verifyScript = @"
echo "=== Deployment Verification ==="
echo "Files in /var/www/sharevibe/html:"
ls -lah /var/www/sharevibe/html/ | head -8
echo ""
echo "Nginx status:"
nginx -t 2>&1
echo ""
echo "Web root permissions:"
stat -c '%a %u:%g' /var/www/sharevibe/html
"@

$wslVerifyCommand = "wsl sshpass -p '$Password' ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} `"$verifyScript`""

try {
    Write-Host "" -ForegroundColor Gray
    Invoke-Expression $wslVerifyCommand
    Write-Host "" -ForegroundColor Gray
    Write-Host "[OK] Verification complete" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Verification had issues but deployment may still be complete" -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor Gray
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  DEPLOYMENT COMPLETED SUCCESSFULLY!        ║" -ForegroundColor Green
Write-Host "║  Site: https://sharevibe.co                ║" -ForegroundColor Green
Write-Host "║  Server: 185.34.101.235                    ║" -ForegroundColor Green
Write-Host "║  Path: /var/www/sharevibe/html             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Visit https://sharevibe.co to verify the site is live" -ForegroundColor Cyan
