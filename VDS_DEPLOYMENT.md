# ShareVibe VDS Deployment Guide

## Overview
Deploy ShareVibe React app to your VDS (Virtual Dedicated Server) at 185.34.101.235 with SSL/TLS and Nginx.

## Prerequisites
- VDS with root access (185.34.101.235)
- SSH access configured
- Nginx installed on server
- Node.js 18+ and npm installed locally

## Quick Start

### 1. Build the app locally
```bash
cd "C:\Users\seid2\Desktop\Share Vibe"
npm run build
```
This creates the `dist/` folder with optimized production files.

### 2. Run deployment script

**Option A: Using PowerShell (Windows)**
```powershell
.\deploy.ps1
```

**Option B: Using Bash (macOS/Linux or Git Bash)**
```bash
bash deploy.sh
```

### 3. When prompted
- Enter your VDS **root password** (for SSH authentication)
- Script will handle the rest automatically

## Manual Deployment Steps

If you prefer manual deployment:

### Step 1: Create archive locally
```bash
tar -czf sharevibe-dist.tar.gz dist/
```

### Step 2: Upload to server
```bash
scp sharevibe-dist.tar.gz root@185.34.101.235:/tmp/
```

### Step 3: Extract on server
```bash
ssh root@185.34.101.235 << 'EOF'
mkdir -p /var/www/sharevibe/html
cd /tmp
tar -xzf sharevibe-dist.tar.gz
cp -r dist/* /var/www/sharevibe/html/
chown -R www-data:www-data /var/www/sharevibe/html
chmod -R 755 /var/www/sharevibe/html
rm -rf dist sharevibe-dist.tar.gz
EOF
```

### Step 4: Configure Nginx
```bash
scp nginx-sharevibe.conf root@185.34.101.235:/etc/nginx/sites-available/sharevibe.conf

ssh root@185.34.101.235 << 'EOF'
ln -sf /etc/nginx/sites-available/sharevibe.conf /etc/nginx/sites-enabled/sharevibe.conf
nginx -t
systemctl reload nginx
EOF
```

## Nginx Configuration

The `nginx-sharevibe.conf` file includes:
- ✅ SSL/TLS (HTTPS)
- ✅ HTTP to HTTPS redirect
- ✅ Gzip compression
- ✅ Cache headers for static assets
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ Proper SPA routing (rewrites to index.html)

## Verification

### Check deployment
```bash
ssh root@185.34.101.235 "ls -lah /var/www/sharevibe/html/"
```

### Test website
- Visit: https://sharevibe.co
- Should show your React app

### Check Nginx status
```bash
ssh root@185.34.101.235 "systemctl status nginx"
```

### View Nginx logs
```bash
ssh root@185.34.101.235 "tail -f /var/log/nginx/sharevibe-error.log"
```

## Troubleshooting

### "Connection refused"
- Ensure SSH access is configured with key-based auth
- Check firewall rules on VDS

### "Permission denied"
- Check web root permissions: `chmod -R 755 /var/www/sharevibe/html`
- Ensure www-data user owns the directory

### "Nginx: [emerg] open() failed"
- Check certificate paths in nginx config
- Verify Let's Encrypt certificates are installed

### "Static files not loading"
- Verify correct MIME types in Nginx
- Check browser cache (Ctrl+Shift+Delete)

## Updates

To deploy updates:
1. Make code changes
2. Run `npm run build`
3. Run `.\deploy.ps1` or `bash deploy.sh`
4. Changes are live within seconds

## Performance Tips

- Monitor server resources: `ssh root@185.34.101.235 "top"`
- Check Nginx access logs for traffic patterns
- Use CDN for static assets if needed
- Enable gzip compression (already configured)

## SSL/TLS

The configuration assumes Let's Encrypt certificates at:
- `/etc/letsencrypt/live/sharevibe.co/fullchain.pem`
- `/etc/letsencrypt/live/sharevibe.co/privkey.pem`

If not installed:
```bash
ssh root@185.34.101.235
apt-get update && apt-get install certbot python3-certbot-nginx
certbot certonly --nginx -d sharevibe.co -d www.sharevibe.co
```

## Support

For issues:
1. Check error logs: `systemctl logs nginx`
2. Verify Nginx syntax: `nginx -t`
3. Check file permissions: `ls -lah /var/www/sharevibe/html/`
