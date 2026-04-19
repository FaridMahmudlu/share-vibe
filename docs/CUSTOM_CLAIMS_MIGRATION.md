# Firestore Security - Custom Claims Migration Guide

## 🔴 Critical Issue: Email-Based Admin Authentication

**Current State:** Admin access is controlled by hardcoded email addresses in Firestore rules.

```firestore
// ❌ INSECURE
function hasSuperAdminEmail() {
  return normalizeEmail(request.auth.token.email) == "fariddmahmudlu2008@gmail.com";
}
```

**Problems:**
1. ❌ Emails visible in source code (security risk)
2. ❌ Email can change; access breaks
3. ❌ Every new admin requires code + deploy
4. ❌ No audit trail
5. ❌ Hard to revoke access

---

## ✅ Solution: Firebase Custom Claims

```firestore
// ✅ SECURE
function isSuperAdmin() {
  return request.auth.token.admin == true;
}
```

**Benefits:**
- ✅ Admin status stored in Auth token (not code)
- ✅ Can grant/revoke instantly via Cloud Function
- ✅ Email independent (safe if email changes)
- ✅ Scalable to unlimited admins
- ✅ Audit trail possible via Cloud Logging

---

## 🔧 Migration Steps

### Step 1: Deploy Cloud Functions

```bash
# Install Firebase CLI (if not already)
npm install -g firebase-tools

# Initialize functions (one-time, if not done)
firebase init functions --project=your-project-id

# Deploy the custom claims functions
firebase deploy --only functions --project=your-project-id
```

This deploys these functions:
- `setAdminClaim(uid, admin)` - Set/revoke admin status
- `getUserAdminStatus(uid)` - Check user's admin status
- `listAdmins()` - List all admin users
- `migrateLegacyAdmins()` - Migrate existing admin emails

### Step 2: Set Admin Claims for Current Admins

**Option A: Auto-migrate legacy admins**
```javascript
// From Firebase Console → Functions → Callable Functions
// Or programmatically:
import { functions } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';

const migrateLegacyAdmins = httpsCallable(functions, 'migrateLegacyAdmins');
const result = await migrateLegacyAdmins({});
console.log(result.data);  // { migrated: [...], message: "Migrated 2 legacy admins" }
```

**Option B: Manually set admin claims**
```javascript
import { httpsCallable } from 'firebase/functions';

const setAdminClaim = httpsCallable(functions, 'setAdminClaim');

// Grant admin to user
await setAdminClaim({ uid: 'user-uid-here', admin: true });

// Revoke admin from user
await setAdminClaim({ uid: 'user-uid-here', admin: false });
```

**Option C: Firebase CLI**
```bash
# Get user UID
firebase auth:list --project=your-project-id | grep email@example.com

# Set custom claims directly
firebase auth:modify <UID> --custom-claims='{"admin":true}' --project=your-project-id

# Remove custom claims
firebase auth:modify <UID> --custom-claims='{}' --project=your-project-id
```

### Step 3: Verify Admin Claims Were Set

```javascript
const { data } = await httpsCallable(functions, 'getUserAdminStatus')({
  uid: 'user-uid-here'
});

console.log(data);  // { uid: '...', email: '...', isAdmin: true }
```

### Step 4: Update Firestore Rules

✅ **Already Done** - Updated `firestore.rules` to:
1. Primary method: Check `request.auth.token.admin == true`
2. Fallback: Legacy email verification (backward compatible)

```firestore
function isSuperAdmin() {
  return isAuthenticated() && request.auth.token.admin == true;
}

function isAdmin() {
  return isAuthenticated() && (
    isSuperAdmin() ||                    // ✅ Primary: Custom Claims
    /* ... other checks ... */ ||
    hasSuperAdminEmailLegacy()           // ⚠️ Fallback: Legacy email
  );
}
```

### Step 5: Deploy Updated Firestore Rules

```bash
npm run generate:rules   # Generate rules from template (if needed)
npm run deploy:rules --project=your-project-id
```

Or manually in Firebase Console:
- Firestore Database → Rules → Paste updated rules → Publish

---

## 📋 Verification Checklist

After migration, verify:

- [ ] Cloud Functions deployed successfully
- [ ] Admin claims set for all required users
- [ ] Admin users can still access Admin Panel
- [ ] Admin users can still perform admin operations (delete media, etc.)
- [ ] Non-admin users cannot access admin features
- [ ] Firestore rules deployed with Custom Claims checks
- [ ] Fallback email checks still working (for grace period)

---

## 🔐 Firestore Rules Security Reference

### Email-Based (❌ Deprecated)
```firestore
// Old: Hardcoded emails
if (email == "admin@example.com") {
  // Allow access
}
```

**Removed in new rules** - Only kept as fallback for backward compatibility.

### Custom Claims (✅ Recommended)
```firestore
// New: Dynamic Custom Claims
if (request.auth.token.admin == true) {
  // Allow access
}
```

**Applied to:** `isSuperAdmin()`, `isAdmin()`, `isOwnerPortalAccount()`

---

## 🛠 Troubleshooting

### "Permission denied" when calling setAdminClaim

**Issue:** Caller is not admin
**Solution:** First admin must be set manually via CLI:
```bash
firebase auth:modify <UID> --custom-claims='{"admin":true}'
```

### Admin claims not taking effect

**Issue:** Old ID tokens still cached
**Solution:**
1. Restart browser or clear Firebase cache
2. Force token refresh:
   ```javascript
   import { getAuth } from 'firebase/auth';
   await getAuth().currentUser?.getIdToken(true);
   ```

### Can't log in after migration

**Issue:** Email verification may be required
**Solution:** Check Firebase Authentication in Console:
- Verify user's email is email-verified
- Resend verification email if needed

---

## 📚 API Reference

### setAdminClaim(data)

```typescript
interface SetAdminClaimRequest {
  uid: string;      // Firebase Auth UID
  admin: boolean;   // true to grant, false to revoke
}

interface SetAdminClaimResponse {
  success: boolean;
  message: string;
}

// Usage
const result = await setAdminClaim({ uid: 'user-123', admin: true });
```

### getUserAdminStatus(data)

```typescript
interface GetAdminStatusRequest {
  uid: string;  // Firebase Auth UID
}

interface GetAdminStatusResponse {
  uid: string;
  email: string;
  isAdmin: boolean;
}

// Usage
const result = await getUserAdminStatus({ uid: 'user-123' });
```

### listAdmins()

```typescript
interface ListAdminsResponse {
  admins: Array<{ uid: string; email: string }>;
  count: number;
}

// Usage
const result = await listAdmins({});
```

### migrateLegacyAdmins()

```typescript
interface MigrationResponse {
  success: boolean;
  migrated: Array<{ uid: string; email: string; status: string }>;
  message: string;
}

// Usage (one-time)
const result = await migrateLegacyAdmins({});
```

---

## ⏱ Timeline

| Phase | Action | Timeline |
|-------|--------|----------|
| **1. Deploy** | Deploy Cloud Functions | Week 1 |
| **2. Migrate** | Set Custom Claims for admins | Week 1 |
| **3. Verify** | Test admin access | Week 1 |
| **4. Monitor** | Watch for issues | Week 1-2 |
| **5. Deprecate** | Remove email fallback | Week 3+ |

---

## 🔒 Security Recommendations

1. ✅ **Use Custom Claims instead of email checks**
2. ✅ **Audit admin actions via Cloud Logging**
3. ✅ **Rotate admins periodically**
4. ✅ **Use strong OAuth providers (Google)**
5. ✅ **Enable 2FA for admin accounts**
6. ✅ **Monitor failed auth attempts**

---

## ❓ FAQ

**Q: Can users set their own admin claims?**
A: No. Only existing admins can call `setAdminClaim()`. Function checks: `if (callerUser.customClaims?.admin !== true)` then error.

**Q: What if I forget to set a new admin?**
A: The fallback email check still works temporarily. Deploy new rules first before removing email checks.

**Q: How long does it take for claims to apply?**
A: Instantly to new auth tokens. Existing tokens valid until refresh (usually < 1 hour).

**Q: Can I batch-set multiple admins?**
A: Yes, call `setAdminClaim()` multiple times or use Admin SDK:
```javascript
await Promise.all([
  auth.setCustomUserClaims('uid1', { admin: true }),
  auth.setCustomUserClaims('uid2', { admin: true }),
]);
```

---

## 📞 Support

For issues:
1. Check Cloud Functions logs: Firebase Console → Functions → Logs
2. Check Firestore rules violations: Firebase Console → Firestore → Rules
3. Check Auth tokens: Firebase Console → Authentication → Sign-in method
