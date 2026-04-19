# Share Vibe - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### Security
- [ ] Custom Claims migration completed (see [CUSTOM_CLAIMS_MIGRATION.md](./CUSTOM_CLAIMS_MIGRATION.md))
- [ ] Firestore rules reviewed and security validated
- [ ] Firebase Storage rules configured
- [ ] API keys rotated and secrets secured
- [ ] Environment variables properly set

### Quality
- [ ] All tests passing (`npm run test`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Error tracking (Sentry) configured
- [ ] Analytics monitoring set up

### Documentation
- [ ] Deployment runbook complete
- [ ] Team trained on deployment process
- [ ] Incident response procedures documented
- [ ] Rollback procedures tested

---

## 🚀 Deployment Steps

### 1. Pre-Deployment Validation

```bash
# Install dependencies
npm install

# Type check
npm run lint

# Build frontend
npm run build

# Verify build output
ls -la dist/

# (Optional) Run tests
npm run test
```

### 2. Deploy Cloud Functions

```bash
# Navigate to functions directory
cd functions

# Install function dependencies
npm install

# Deploy functions
firebase deploy --only functions --project=your-project-id

# Verify deployment
firebase functions:log --project=your-project-id
```

**Functions deployed:**
- `setAdminClaim(uid, admin)` - Set/revoke admin claims
- `getUserAdminStatus(uid)` - Check user admin status
- `listAdmins()` - List all admins
- `migrateLegacyAdmins()` - Migrate legacy email admins

### 3. Setup Admin Claims (First Time Only)

**If this is first deployment with Custom Claims:**

```bash
# Option 1: Auto-migrate legacy admins
firebase functions:call migrateLegacyAdmins \
  --project=your-project-id

# Option 2: Manually set admins
firebase auth:modify <UID> \
  --custom-claims='{"admin":true}' \
  --project=your-project-id
```

### 4. Deploy Firestore Rules

```bash
# Generate rules (if using template)
npm run generate:rules

# Deploy rules
npm run deploy:rules --project=your-project-id

# Verify rules
firebase firestore:describe --project=your-project-id
```

### 5. Deploy Frontend to Firebase Hosting

```bash
# Build frontend
npm run build

# Deploy hosting
npm run deploy:hosting --project=your-project-id

# Or deploy everything at once
npm run deploy:prod --project=your-project-id
```

### 6. Configure Environment Variables

Set in Firebase Console → Project Settings → Environment:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
VITE_ENABLE_ERROR_TRACKING=true
```

### 7. Configure Error Tracking (Production)

**Setup Sentry:**

```bash
npm install @sentry/react

# In src/App.tsx or main.tsx:
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

### 8. Configure Analytics (Optional)

```javascript
// Enable Firebase Analytics
import { analytics } from './firebase';
import { logEvent } from 'firebase/analytics';

// Track important events
logEvent(analytics, 'upload_completed', {
  cafeSlug: activeCafeSlug,
  size: uploadSize,
});
```

---

## 🔄 Deployment Sequence

**First Time Deployment (New Project):**
```
1. Create Firebase Project
2. Deploy Cloud Functions
3. Setup Admin Claims
4. Deploy Firestore Rules
5. Configure Storage Rules
6. Deploy Frontend
7. Configure Monitoring
```

**Regular Updates:**
```
1. Code Review + Testing
2. Run builds locally
3. Deploy Functions (if changed)
4. Deploy Rules (if changed)
5. Deploy Frontend
6. Verify in production
```

---

## 🔍 Verification

After deployment, verify everything works:

```bash
# Check Cloud Functions
firebase functions:log --lines 50

# Check Firestore
firebase firestore:indexes

# Check Hosting
firebase hosting:channel:list

# Check Auth
firebase auth:list --limit 10

# Test app locally with prod config
npm run build
npm run preview
```

**Manual Testing:**
1. ✅ Load landing page
2. ✅ Sign in with Google
3. ✅ Upload a photo
4. ✅ Like/unlike photo
5. ✅ Admin can delete photos
6. ✅ Gallery loads correctly

---

## ⚙️ Configuration Files

### `.env.local` (Production)
```env
VITE_FIREBASE_API_KEY=prod-key
VITE_FIREBASE_AUTH_DOMAIN=share-vibe-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=share-vibe-prod
VITE_FIREBASE_STORAGE_BUCKET=share-vibe-prod.appspot.com
VITE_ENABLE_ERROR_TRACKING=true
VITE_SENTRY_DSN=https://your-sentry-dsn
```

### `firebase.json`
```json
{
  "hosting": {
    "site": "share-vibe-prod",
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "cleanUrls": true,
    "headers": [
      {
        "source": "/index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=3600"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "predeploy": ["npm --prefix functions install"]
  }
}
```

---

## 📊 Monitoring & Logging

### Cloud Functions Logs
```bash
firebase functions:log --project=your-project-id
firebase functions:log --lines 100  # Last 100 lines
```

### Firestore Metrics
- Firebase Console → Firestore → Indexes
- Monitor index usage, latency

### Frontend Errors
- Sentry Dashboard → Issues
- Error grouping, stack traces, user context

### Authentication
- Firebase Console → Authentication
- Monitor sign-in methods, user count

---

## 🚨 Rollback Procedure

If issues occur after deployment:

### Rollback Frontend
```bash
# Revert to previous version
firebase hosting:channel:deploy previous

# Or manually rollback
firebase deploy --only hosting \
  --project=your-project-id \
  --message="Rollback: version X"
```

### Rollback Cloud Functions
```bash
# List deployment history
firebase functions:describe --project=your-project-id

# Firebase doesn't auto-rollback functions
# Must re-deploy previous version from git
git checkout previous-commit
firebase deploy --only functions --project=your-project-id
```

### Rollback Firestore Rules
```bash
# Firebase keeps rule history
# In Firebase Console:
# Firestore → Rules → Versions → Select previous → Publish

# Or via CLI:
firebase firestore:indexes --project=your-project-id
```

---

## 🔐 Security Considerations

1. **Firestore Rules**
   - [ ] Public read access verified
   - [ ] Write permissions restricted
   - [ ] Delete permissions admin-only
   - [ ] Rate limits enforced

2. **Firebase Storage**
   - [ ] Files private by default
   - [ ] Download URLs time-limited
   - [ ] CORS configured
   - [ ] Max file size enforced

3. **Cloud Functions**
   - [ ] Auth checks in place
   - [ ] Input validation
   - [ ] No sensitive logs
   - [ ] Rate limiting configured

4. **Secrets Management**
   - [ ] API keys not in source code
   - [ ] Environment variables used
   - [ ] Secrets rotated regularly
   - [ ] Access logged

---

## 📈 Post-Deployment Monitoring

**First 24 Hours:**
- Monitor error tracking (Sentry)
- Check Firebase logs
- Test all user workflows
- Monitor performance metrics

**Ongoing:**
- Daily: Check error count
- Weekly: Review analytics
- Monthly: Performance review
- Quarterly: Security audit

---

## 🆘 Troubleshooting

### Functions won't deploy
```bash
# Check Node version
node --version  # Should be 18+

# Clear cache
rm -rf node_modules functions/node_modules
npm install
firebase deploy --only functions --verbose
```

### Rules deployment fails
```bash
# Validate rules syntax
firebase firestore:indexes

# Check for errors in firestore.rules
firebase deploy --only firestore:rules --verbose
```

### Frontend not loading
```bash
# Check hosting deployment
firebase hosting:channel:list

# Check build output
npm run build
du -sh dist/

# Verify index.html exists
ls -la dist/index.html
```

### Auth not working
```bash
# Check Firebase config
cat firebase-applet-config.json | jq .

# Test auth in console
firebase auth:list --project=your-project-id
```

---

## 📞 Getting Help

1. **Check logs:**
   - `firebase functions:log`
   - Firebase Console
   - Sentry Dashboard

2. **Common issues:**
   - See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

3. **Documentation:**
   - [Setup Guide](./SETUP.md)
   - [API Reference](./API.md)
   - [Custom Claims Migration](./CUSTOM_CLAIMS_MIGRATION.md)
