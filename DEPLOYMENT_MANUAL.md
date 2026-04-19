# ShareVibe Manual Deployment Guide

## Status
✅ **Ready to Deploy** - All code changes, builds, and scripts are prepared
⏸️ **Needs VDS Password** - Requires root password for 185.34.101.235

## What's Been Done
1. ✅ Fixed Google login bug in AdminPanel.tsx (auth verification reordered)
2. ✅ Built production bundle (npm run build)
3. ✅ Created deployment archive (sharevibe-dist.zip - 0.77 MB)
4. ✅ Fixed deploy.ps1 script with WSL/sshpass support
5. ✅ Committed all changes to GitHub

## ONE-COMMAND DEPLOYMENT

Open PowerShell in `C:\Users\seid2\Desktop\Share Vibe` and run:

```powershell
# Option A: Provide password as parameter
.\deploy.ps1 -Password "your-vds-root-password"

# Option B: Set environment variable
$env:VDS_PASSWORD = "your-vds-root-password"
.\deploy.ps1

# Option C: Script will prompt for password
.\deploy.ps1
# (You'll be prompted to enter the password securely)
```

**Replace `your-vds-root-password` with the actual VDS root password for 185.34.101.235**

## What the Script Does
1. ✅ Verifies dist/ folder exists
2. ✅ Creates deployment archive (zip or tar.gz)
3. ✅ Uploads to server via scp with sshpass
4. ✅ Extracts files to /var/www/sharevibe/html
5. ✅ Sets correct permissions (www-data:www-data)
6. ✅ Uploads Nginx configuration
7. ✅ Tests and reloads Nginx
8. ✅ Cleans up local archives
9. ✅ Verifies deployment succeeded

## After Deployment

Verify the site is live:
- **Browser:** https://sharevibe.co
- **Test Login:** Click "Google ile kafe sahibi girişi yap" button
- **Expected Behavior:** Google login popup → select account → admin panel access (NOT login screen loop)

## Troubleshooting

### "Permission denied (publickey,password)"
- Wrong password provided
- User doesn't have SSH access to 185.34.101.235
- Solution: Verify VDS password is correct

### "Archive not found"
- dist/ folder missing (run `npm run build` first)
- Solution: `cd C:\Users\seid2\Desktop\Share Vibe && npm run build && .\deploy.ps1 -Password "..."`

### Nginx errors after deployment
- Configuration syntax error in nginx-sharevibe.conf
- Solution: Verify nginx-sharevibe.conf exists in current directory before running script

### SSL certificate issues
- Let's Encrypt certificate already configured on server
- If expired: Manual renewal via `certbot renew` on server

## Files Changed in This Session

1. **src/AdminPanel.tsx** - Fixed Google login auth flow
2. **deploy.ps1** - Updated to use WSL + sshpass for password-based auth
3. **Committed to GitHub** - All changes pushed to main branch

## Current Deployment Architecture

```
Local Development (Windows)
         ↓
    npm run build → dist/
         ↓
    Create archive (zip/tar.gz)
         ↓
    WSL + sshpass → Upload to VDS
         ↓
    VDS Server (185.34.101.235)
         ↓
    /var/www/sharevibe/html
         ↓
    Nginx (SSL/TLS)
         ↓
    sharevibe.co (Cloudflare DNS)
```

## Production URL
- **Site:** https://sharevibe.co
- **Server:** 185.34.101.235
- **SSL:** Let's Encrypt (auto-renewed)
- **DNS:** Cloudflare
- **Backend:** Firebase (Auth, Firestore, Storage)
