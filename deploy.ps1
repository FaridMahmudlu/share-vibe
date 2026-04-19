#!/usr/bin/env powershell

# ShareVibe Deployment Script for Windows PowerShell
# Usage: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 ShareVibe Deployment Starting..." -ForegroundColor Cyan

# Variables
$DEPLOY_USER = "root"
$DEPLOY_HOST = "185.34.101.235"
$WEB_ROOT = "/var/www/sharevibe/html"
$DIST_PATH = "dist"
$NGINX_CONFIG = "/etc/nginx/sites-available/sharevibe.conf"
$SCRIPT_DIR = Get-Location

# Check if dist folder exists
if (-not (Test-Path $DIST_PATH)) {
    Write-Host "❌ ERROR: dist folder not found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# Step 1: Create archive
Write-Host "📦 Step 1: Creating deployment archive..." -ForegroundColor Yellow
if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -czf sharevibe-dist.tar.gz dist
} else {
    # Fallback to PowerShell compression
    Write-Host "Using PowerShell compression..." -ForegroundColor Gray
    Compress-Archive -Path dist -DestinationPath sharevibe-dist.zip -Force
}

# Step 2: Upload to server
Write-Host "🌐 Step 2: Uploading files to server..." -ForegroundColor Yellow
if (Get-Command scp -ErrorAction SilentlyContinue) {
    $archiveName = if (Test-Path sharevibe-dist.tar.gz) { "sharevibe-dist.tar.gz" } else { "sharevibe-dist.zip" }
    scp $archiveName "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/"
    Write-Host "✅ Archive uploaded" -ForegroundColor Green
} else {
    Write-Host "⚠️  SCP not found. Please ensure OpenSSH is installed." -ForegroundColor Red
    exit 1
}

# Step 3: Extract and deploy on server
Write-Host "⚙️  Step 3: Deploying on server..." -ForegroundColor Yellow
$deployCommands = @"
# Create web root
mkdir -p /var/www/sharevibe/html || true

# Extract files
cd /tmp
if [ -f sharevibe-dist.tar.gz ]; then
    tar -xzf sharevibe-dist.tar.gz
    cp -r dist/* /var/www/sharevibe/html/
    rm -rf dist sharevibe-dist.tar.gz
fi

# Set permissions
chown -R www-data:www-data /var/www/sharevibe/html 2>/dev/null || true
chmod -R 755 /var/www/sharevibe/html

echo "✅ Files deployed successfully"
"@

ssh "${DEPLOY_USER}@${DEPLOY_HOST}" $deployCommands
Write-Host "✅ Files deployed" -ForegroundColor Green

# Step 4: Configure Nginx
Write-Host "🔒 Step 4: Configuring Nginx..." -ForegroundColor Yellow
scp "nginx-sharevibe.conf" "${DEPLOY_USER}@${DEPLOY_HOST}:/etc/nginx/sites-available/sharevibe.conf"

$nginxCommands = @"
# Enable nginx config
ln -sf /etc/nginx/sites-available/sharevibe.conf /etc/nginx/sites-enabled/sharevibe.conf || true

# Test nginx config
nginx -t || echo "⚠️  Nginx config test warning"

# Reload nginx
systemctl reload nginx || systemctl restart nginx || echo "⚠️  Manual nginx restart may be needed"

echo "✅ Nginx configured and reloaded"
"@

ssh "${DEPLOY_USER}@${DEPLOY_HOST}" $nginxCommands
Write-Host "✅ Nginx configured" -ForegroundColor Green

# Step 5: Cleanup
Write-Host "🧹 Step 5: Cleanup..." -ForegroundColor Yellow
if (Test-Path sharevibe-dist.tar.gz) { Remove-Item sharevibe-dist.tar.gz }
if (Test-Path sharevibe-dist.zip) { Remove-Item sharevibe-dist.zip }

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌍 Your site is live at: https://sharevibe.co" -ForegroundColor Cyan
