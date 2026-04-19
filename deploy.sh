#!/bin/bash

# ShareVibe Deployment Script for VDS
# Usage: bash deploy.sh

set -e  # Exit on error

echo "🚀 ShareVibe Deployment Starting..."

# Variables
DEPLOY_USER="root"
DEPLOY_HOST="185.34.101.235"
WEB_ROOT="/var/www/sharevibe/html"
DIST_PATH="dist"
NGINX_CONFIG="/etc/nginx/sites-available/sharevibe.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/sharevibe.conf"

# Check if dist folder exists
if [ ! -d "$DIST_PATH" ]; then
    echo "❌ ERROR: dist folder not found. Run 'npm run build' first."
    exit 1
fi

echo "📦 Step 1: Creating deployment archive..."
tar -czf sharevibe-dist.tar.gz dist/

echo "🌐 Step 2: Uploading files to server..."
scp sharevibe-dist.tar.gz ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/

echo "⚙️  Step 3: Extracting files on server..."
ssh ${DEPLOY_USER}@${DEPLOY_HOST} << 'EOF'
    # Create web root if doesn't exist
    mkdir -p /var/www/sharevibe/html
    
    # Extract dist files
    cd /tmp && tar -xzf sharevibe-dist.tar.gz
    
    # Copy dist contents to web root
    cp -r dist/* /var/www/sharevibe/html/
    
    # Set proper permissions
    chown -R www-data:www-data /var/www/sharevibe/html
    chmod -R 755 /var/www/sharevibe/html
    
    # Cleanup
    rm -rf /tmp/dist /tmp/sharevibe-dist.tar.gz
    
    echo "✅ Files deployed successfully"
EOF

echo "🔒 Step 4: Configuring Nginx..."
scp nginx-sharevibe.conf ${DEPLOY_USER}@${DEPLOY_HOST}:${NGINX_CONFIG}

ssh ${DEPLOY_USER}@${DEPLOY_HOST} << 'EOF'
    # Enable nginx config
    ln -sf /etc/nginx/sites-available/sharevibe.conf /etc/nginx/sites-enabled/sharevibe.conf || true
    
    # Test nginx config
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
    
    echo "✅ Nginx configured and reloaded"
EOF

echo "🧹 Step 5: Cleanup..."
rm -f sharevibe-dist.tar.gz

echo "✅ Deployment Complete!"
echo "🌍 Your site is live at: https://sharevibe.co"
