# 🚀 DEPLOY NOW - ShareVibe to VDS

## Quick Start

Your deployment is **ready to execute**. Follow these exact steps:

### Step 1: Open PowerShell
```powershell
cd "C:\Users\seid2\Desktop\Share Vibe"
```

### Step 2: Build Production
```powershell
npm run build
```

Expected output:
```
✓ 2112 modules transformed
✓ built in X.XXs
```

### Step 3: Deploy to Server
```powershell
.\deploy.ps1
```

### Step 4: Enter Server Password
When prompted:
```
root@185.34.101.235's password: [ENTER YOUR SERVER ROOT PASSWORD HERE]
```

---

## What Happens Next

The script will automatically:

1. **Upload Files** → Compress dist folder and upload to `/tmp/` on server
2. **Extract** → Extract to `/var/www/sharevibe/html/`
3. **Permissions** → Set `www-data:www-data` ownership
4. **Configure Nginx** → Deploy nginx-sharevibe.conf
5. **Reload** → Restart Nginx service
6. **Live** → Website goes live at https://sharevibe.co

---

## Timeline

- Build: ~8 seconds
- Upload: ~10-30 seconds (depends on connection)
- Deploy: ~5 seconds
- **Total: ~1 minute**

---

## Verification

After deployment, verify at:
- https://sharevibe.co
- Check admin: https://sharevibe.co/?screen=owner&cafe=ava-coffee

---

## Files Deployed

- ✅ dist/ (17 files) - Production build
- ✅ deploy.ps1 - Deployment script
- ✅ nginx-sharevibe.conf - Web server config
- ✅ VDS_DEPLOYMENT.md - Full guide
- ✅ GitHub - All code backed up

---

## If Something Goes Wrong

1. **"Permission denied"** → Check server root password
2. **"Connection timeout"** → Check network connection to VDS
3. **"Nginx failed"** → Check nginx-sharevibe.conf syntax

For detailed troubleshooting: See VDS_DEPLOYMENT.md

---

## Done!

```powershell
npm run build && .\deploy.ps1
```

That's all you need. Deployment is 100% automated.

Your site will be live at **https://sharevibe.co** 🎉
