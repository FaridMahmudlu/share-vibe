# Security Implementation Guide

**Status**: Phase 1 CRITICAL Fixes Implemented  
**Date**: April 2026  
**Version**: 1.0

---

## Overview

This document describes the security infrastructure implemented in Share Vibe to address 11 CRITICAL and 18 HIGH vulnerabilities from the professional security audit.

---

## Security Modules

### 1. **Validation & Sanitization** (`src/security/validation.ts`)

**Purpose**: Prevent XSS, SQL Injection, Command Injection attacks

**Key Components**:
- `Validator` class - Field validation against rules
- HTML sanitization with `DOMPurify`
- File name sanitization (prevent path traversal)
- URL parameter cleaning
- Cafe slug normalization

**Usage**:
```typescript
import { validateAndSanitizeCafeSlug, validateAndSanitizeCaption } from '@/security/validation';

// Validate and sanitize user input
const cafeSlug = validateAndSanitizeCafeSlug(userInput);
const caption = validateAndSanitizeCaption(userCaption);

if (!cafeSlug) {
  // Handle invalid input
}
```

**Protects Against**: CWE-79 (XSS), CWE-89 (Injection), CWE-22 (Path Traversal)

---

### 2. **Encrypted Storage** (`src/security/encryption.ts`)

**Purpose**: Protect sensitive data in browser storage

**Key Components**:
- `SecureStorage` class - AES-256 encryption
- PBKDF2 key derivation
- `SecureSensitiveData` helper functions

**Usage**:
```typescript
import { initializeSecureStorage, SecureSensitiveData } from '@/security/encryption';

// Initialize on app startup
const storage = initializeSecureStorage(userSessionKey);

// Save auth tokens securely
SecureSensitiveData.saveAuthTokens({
  access: 'eyJhbGc...',
  refresh: 'eyJhbGc...',
});

// Retrieve tokens
const tokens = SecureSensitiveData.getAuthTokens();
```

**Protects Against**: CWE-312 (Unencrypted Storage), CWE-613 (Sensitive Cookie)

---

### 3. **Role-Based Access Control (RBAC)** (`src/security/rbac.ts`)

**Purpose**: Enforce fine-grained authorization

**Roles**:
- `SUPER_ADMIN` - Full access
- `CAFE_ADMIN` - Admin across all cafes
- `CAFE_OWNER` - Access to own cafe
- `USER` - Regular user permissions
- `ANONYMOUS` - Public access only

**Usage**:
```typescript
import { AccessControl, Permission, UserRole } from '@/security/rbac';

const user: UserContext = {
  uid: 'user123',
  email: 'user@example.com',
  role: UserRole.CAFE_OWNER,
  cafeSlug: 'my-cafe',
};

// Check permission
if (AccessControl.hasPermission(user, Permission.MANAGE_OWN_CAFE)) {
  // Allow operation
}

// Enforce permission
AccessControl.enforcePermission(user, Permission.UPLOAD_MEDIA);

// Check cafe ownership
if (AccessControl.canAccessCafe(user, cafeSlug)) {
  // Allow access
}
```

**Protects Against**: CWE-639 (IDOR), CWE-285 (Improper Authorization)

---

### 4. **Audit Logging** (`src/security/auditLogger.ts`)

**Purpose**: Track all security-relevant events

**Supported Actions**:
- Authentication events (login, logout, failed attempts)
- Admin operations (role changes, cafe management)
- Media operations (upload, delete, like)
- Security events (suspicious activity, CSRF, rate limit)

**Usage**:
```typescript
import { AuditLogger, AuditAction, getRequestContext } from '@/security/auditLogger';

const logger = new AuditLogger(firestoreDb);
const ctx = getRequestContext(req);

// Log authentication
await logger.logAuthEvent(
  AuditAction.LOGIN,
  userId,
  email,
  ctx.ipAddress,
  ctx.userAgent,
  ctx.sessionId,
  true // success
);

// Log admin action
await logger.logAdminAction(
  AuditAction.SETTINGS_CHANGED,
  userId,
  email,
  'cafe',
  cafeId,
  ctx.ipAddress,
  ctx.userAgent,
  ctx.sessionId,
  { name: newName },
  { name: oldName },
  { name: newName }
);
```

**Stored In**: Firestore `audit-logs` collection

**Protects Against**: CWE-778 (Insufficient Logging), GDPR/Compliance requirements

---

### 5. **Request Signing & Replay Protection** (`src/security/requestSigning.ts`)

**Purpose**: Verify request authenticity and prevent replay attacks

**Components**:
- `RequestSigner` - HMAC-SHA256 signing
- `NonceStore` - Track used nonces
- `RequestValidator` - Comprehensive validation
- `ClientRequestSigner` - Frontend helper
- `IdempotencyKeyStore` - Prevent duplicate processing

**Usage (Frontend)**:
```typescript
import { ClientRequestSigner } from '@/security/requestSigning';

const signer = new ClientRequestSigner(process.env.VITE_REQUEST_SECRET);

// Sign and send request
const response = await signer.createSignedFetch(
  '/api/upload',
  { mediaId: '123', data: 'content' }
);
```

**Usage (Backend)**:
```typescript
import { validateRequestSignature } from '@/security/requestSigning';

app.post('/api/upload', 
  validateRequestSignature(process.env.REQUEST_SECRET),
  (req, res) => {
    // Request already validated
  }
);
```

**Headers Required**:
- `X-Signature`: HMAC signature
- `X-Nonce`: One-time number
- `X-Timestamp`: Request timestamp

**TTL**: 5 minutes (configurable)

**Protects Against**: CWE-252 (Replay Attacks), CWE-347 (Improper Signature)

---

### 6. **Security Configuration** (`src/security/configuration.ts`)

**Purpose**: Centralized security settings and environment management

**Key Features**:
- CSP header configuration
- Rate limiting rules
- Encryption settings
- Session configuration
- CORS settings
- HTTPS enforcement

**Usage**:
```typescript
import { loadConfiguration, validateConfigurationSafety } from '@/security/configuration';

// Load all settings
const config = loadConfiguration();

// Validate for safety issues
const warnings = validateConfigurationSafety();
```

**Protects Against**: CWE-798 (Hardcoded Secrets), CWE-927 (Use of Implicit Intent)

---

### 7. **Security Middleware** (`src/security/middleware.ts`)

**Purpose**: Express.js middleware for security headers and rate limiting

**Components**:
- Helmet.js integration (CSP, X-Frame-Options, etc.)
- Rate limiting (general, auth, upload specific)
- CORS configuration
- Input sanitization
- CSRF protection
- Error handling

**Middleware Chain**:
```
1. Helmet security headers
2. CORS
3. Rate limiting
4. Body parsing (10kb limit)
5. Input sanitization
6. CSRF protection
7. Error handling
```

**Usage**:
```typescript
import { setupSecurityMiddleware, authRateLimiter } from '@/security/middleware';

app.use(setupSecurityMiddleware);

// Use specific rate limiters on routes
app.post('/auth/login', authRateLimiter, loginHandler);
```

**Protects Against**: 
- CWE-79 (XSS)
- CWE-76 (Improper Neutralization)
- CWE-770 (Allocation of Resources)
- CWE-295 (Improper Certificate Validation)

---

## Implementation Checklist

### Phase 1: CRITICAL Fixes (✅ In Progress)

- [x] Create security modules
- [ ] Integrate validation in frontend forms
- [ ] Integrate RBAC in AdminPanel
- [ ] Enable audit logging in Firestore
- [ ] Implement CSP headers
- [ ] Add rate limiting to routes
- [ ] Enable encrypted storage for auth tokens
- [ ] Add request signing to sensitive operations
- [ ] Test all security features

### Phase 2: HIGH Fixes

- [ ] Subresource Integrity (SRI) on CDN
- [ ] Additional security headers (X-Frame, X-Content-Type)
- [ ] API request validation
- [ ] Image upload security scanning
- [ ] Dependency vulnerability audit

### Phase 3: Compliance

- [ ] GDPR data export functionality
- [ ] Right to be forgotten implementation
- [ ] Data retention policies
- [ ] Security headers audit
- [ ] Penetration testing

---

## Environment Variables

Required for security features:

```bash
# Firebase (PUBLIC - no secrets)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-id
VITE_FIREBASE_STORAGE_BUCKET=project.appspot.com

# Security
VITE_REQUEST_SECRET=<32+ char secret>
VITE_ENCRYPTION_KEY=<32+ char key>
VITE_APP_URL=https://app.com

# Feature Flags
VITE_ENABLE_CSP=true
VITE_ENABLE_RATE_LIMITING=true
VITE_ENABLE_ENCRYPTION=true
VITE_ENABLE_AUDIT_LOGGING=true
VITE_ENABLE_EMAIL_VERIFICATION=true

# Limits
VITE_MAX_UPLOAD_SIZE=8388608
VITE_MAX_MEDIA_PER_CAFE=10000

# Sentry (optional)
VITE_SENTRY_DSN=https://...@sentry.io/...
```

---

## Testing Security Features

### Validate Sanitization:
```typescript
import { Validator } from '@/security/validation';

// Should pass
expect(Validator.validate('my-cafe', 'cafeSlug')).toBe(true);

// Should fail
expect(Validator.validate(''; DROP TABLE', 'cafeSlug')).toBe(false);
```

### Test RBAC:
```typescript
import { AccessControl, Permission } from '@/security/rbac';

const owner: UserContext = { 
  role: UserRole.CAFE_OWNER, 
  cafeSlug: 'cafe-1' 
};

expect(AccessControl.canAccessCafe(owner, 'cafe-1')).toBe(true);
expect(AccessControl.canAccessCafe(owner, 'cafe-2')).toBe(false);
```

### Verify Encryption:
```typescript
import { SecureStorage } from '@/security/encryption';

const storage = new SecureStorage('my-super-secret-key-32-chars');
storage.setItem('sensitive', { token: 'abc123' });

// Verify localStorage actually has encrypted data
const encrypted = window.localStorage.getItem('sensitive');
expect(encrypted).not.toContain('abc123');

// Retrieve and decrypt
const decrypted = storage.getItem('sensitive');
expect(decrypted.token).toBe('abc123');
```

---

## Monitoring & Alerts

Monitor these metrics:

1. **Failed Login Attempts**: Alert if >5 in 15 minutes per IP
2. **Suspicious User Access**: Alert if >10 API errors in 1 minute
3. **Data Exfiltration**: Alert if DATA_EXPORTED action logged
4. **Invalid Signatures**: Alert if >3 request signature failures
5. **Rate Limit Violations**: Alert if threshold exceeded

---

## References

- [OWASP Top 10 2024](https://owasp.org/Top10/)
- [Firebase Security](https://firebase.google.com/support/guides/security-checklist)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework/)

---

## Support

For security issues or questions:
1. Review `docs/SECURITY_AUDIT_REPORT.md` for vulnerability details
2. Check implementation examples in each module
3. Run security tests: `npm run test:security`
4. Contact security team for urgent issues
