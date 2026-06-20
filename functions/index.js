/**
 * Firebase Cloud Functions for Share Vibe
 * Deploy with: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GENERATED_ACCESS_POLICY } = require('./accessPolicy.generated');

// Initialize Firebase Admin SDK (auto-initialized in Cloud Functions)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Ensure all admin.firestore() calls default to the custom database ID
const { getFirestore } = require('firebase-admin/firestore');
const originalFirestore = admin.firestore;
const customDbInstance = getFirestore('ai-studio-0179b1de-f24b-4cc2-aaaa-4e4738a7589a');
const wrappedFirestore = function() {
  return customDbInstance;
};
Object.setPrototypeOf(wrappedFirestore, originalFirestore);
Object.defineProperty(admin, 'firestore', {
  get: () => wrappedFirestore,
  configurable: true
});

const auth = admin.auth();

const getStorageFileFromDownloadUrl = (downloadUrl) => {
  const url = new URL(downloadUrl);
  const bucketMatch = url.pathname.match(/\/b\/([^/]+)\/o\//);
  const encodedPath = url.pathname.split('/o/')[1]?.split('?')[0];

  if (!bucketMatch || !encodedPath) {
    throw new Error('Invalid Firebase Storage download URL');
  }

  const bucketName = decodeURIComponent(bucketMatch[1]);
  const filePath = decodeURIComponent(encodedPath);

  return admin.storage().bucket(bucketName).file(filePath);
};

const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const getLegacyAdminEmails = () =>
  String(process.env.LEGACY_ADMIN_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

const normalizeSlug = (value) =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';

const createEmailSet = (emails) =>
  new Set((Array.isArray(emails) ? emails : []).map(normalizeEmail).filter(Boolean));

const superOwnerEmailSet = createEmailSet([
  ...(GENERATED_ACCESS_POLICY.superOwnerEmails || []),
  ...String(process.env.FIREBASE_SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean),
]);

const cafeAccessRules = (GENERATED_ACCESS_POLICY.cafeAccess || [])
  .map((rule) => ({
    cafeSlug: normalizeSlug(rule.cafeSlug),
    ownerEmails: createEmailSet(rule.ownerEmails),
    managerEmails: createEmailSet(rule.managerEmails),
  }))
  .filter((rule) => rule.cafeSlug);

const getAccessClaimsForEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const isSuperOwner = superOwnerEmailSet.has(normalizedEmail);
  const ownerCafes = [];
  const managerCafes = [];

  if (!isSuperOwner) {
    for (const rule of cafeAccessRules) {
      if (rule.ownerEmails.has(normalizedEmail)) {
        ownerCafes.push(rule.cafeSlug);
      }
      if (rule.managerEmails.has(normalizedEmail)) {
        managerCafes.push(rule.cafeSlug);
      }
    }
  }

  const cafeIds = [...new Set([...ownerCafes, ...managerCafes])];
  const role = isSuperOwner
    ? 'super_owner'
    : ownerCafes.length > 0
      ? 'owner'
      : managerCafes.length > 0
        ? 'manager'
        : 'none';

  return {
    admin: isSuperOwner,
    role,
    cafeIds,
    sharevibeSuperOwner: isSuperOwner,
    sharevibeOwnerCafes: ownerCafes,
    sharevibeManagerCafes: managerCafes,
  };
};

const hasAnyAccessClaim = (claims) =>
  claims.role === 'super_owner' ||
  claims.role === 'owner' ||
  claims.role === 'manager' ||
  claims.sharevibeSuperOwner === true ||
  (Array.isArray(claims.sharevibeOwnerCafes) && claims.sharevibeOwnerCafes.length > 0) ||
  (Array.isArray(claims.sharevibeManagerCafes) && claims.sharevibeManagerCafes.length > 0);

const setPolicyClaimsForUser = async (user) => {
  const accessClaims = getAccessClaimsForEmail(user.email);
  const existingClaims = user.customClaims || {};
  const nextClaims = { ...existingClaims };

  delete nextClaims.admin;
  delete nextClaims.role;
  delete nextClaims.cafeIds;
  delete nextClaims.sharevibeSuperOwner;
  delete nextClaims.sharevibeOwnerCafes;
  delete nextClaims.sharevibeManagerCafes;

  if (hasAnyAccessClaim(accessClaims)) {
    Object.assign(nextClaims, accessClaims);
  }

  await auth.setCustomUserClaims(user.uid, Object.keys(nextClaims).length > 0 ? nextClaims : null);
  return accessClaims;
};

const clearShareVibeClaimsForUser = async (user) => {
  const existingClaims = user.customClaims || {};
  const nextClaims = { ...existingClaims };

  delete nextClaims.admin;
  delete nextClaims.role;
  delete nextClaims.cafeIds;
  delete nextClaims.sharevibeSuperOwner;
  delete nextClaims.sharevibeOwnerCafes;
  delete nextClaims.sharevibeManagerCafes;

  await auth.setCustomUserClaims(user.uid, Object.keys(nextClaims).length > 0 ? nextClaims : null);
};

const handleFunctionError = (error, fallbackMessage) => {
  if (error instanceof functions.https.HttpsError) {
    return error;
  }
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const isProduction = process.env.NODE_ENV === 'production';
  
  const message = error?.message || String(error);
  const stack = error?.stack || '';
  const code = error?.code || 'unknown';
  
  // Log to Firestore error_logs
  const db = admin.firestore();
  db.collection('error_logs').doc(errorId).set({
    message,
    stack,
    code,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    isInternal: true,
    statusCode: 500
  }).catch(err => {
    console.error('Failed to log error to Firestore:', err);
  });

  // Log failure to security_events
  db.collection('security_events').add({
    type: 'http_500_alert',
    errorId,
    message: isProduction ? 'Sanitized error' : message,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(err => {
    console.error('Failed to log alert to security_events:', err);
  });

  const publicMessage = isProduction 
    ? `${fallbackMessage} Reference: ${errorId}`
    : `${fallbackMessage} Error: ${message}. Stack: ${stack}. Reference: ${errorId}`;

  return new functions.https.HttpsError('internal', publicMessage);
};

const throwIfInternal = (error, fallbackMessage) => {
  throw handleFunctionError(error, fallbackMessage);
};

/**
 * [SV-08] Transactional Rate Limiter Helper
 * Limits actions per minute and stores history in Firestore rate_limits collection.
 */
const checkRateLimit = async (uid, action, maxPerMin) => {
  const firestore = admin.firestore();
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const limitRef = firestore.collection('rate_limits').doc(`${uid}_${action}`);
  
  let allowed = true;
  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(limitRef);
    let timestamps = [];
    
    if (doc.exists) {
      timestamps = (doc.data().timestamps || []).filter(t => t > oneMinuteAgo);
    }
    
    if (timestamps.length >= maxPerMin) {
      allowed = false;
      return;
    }
    
    timestamps.push(now);
    transaction.set(limitRef, {
      timestamps,
      lastUpdated: now
    }, { merge: true });
  });
  
  if (!allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Rate limit exceeded for action: ${action}. Please try again later.`
    );
  }
};

/**
 * [SV-07] Admin Audit Logging & Claim Guard
 * verifyAdmin(context) middleware: validates context, checks custom claims/role, and logs to /audit_logs.
 */
const verifyAdmin = async (context, action, targetId = null, targetType = null) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated'
    );
  }

  const uid = context.auth.uid;
  const callerUser = await auth.getUser(uid);
  const callerClaims = getAccessClaimsForEmail(callerUser.email);
  
  let isAdmin = callerClaims.sharevibeSuperOwner === true;
  if (!isAdmin) {
    // Fallback: check Firestore users collection
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (userDoc.exists && userDoc.data().role === 'admin') {
      isAdmin = true;
    }
  }

  if (!isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can perform this action'
    );
  }

  // Audit log
  const ip = context.rawRequest.headers['x-forwarded-for'] || context.rawRequest.socket.remoteAddress || 'unknown';
  await admin.firestore().collection('audit_logs').add({
    action: action || 'unknown',
    targetId: targetId || null,
    targetType: targetType || null,
    adminUid: uid,
    adminEmail: callerUser.email || 'unknown',
    ip,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  return callerUser;
};

// Export middleware module
module.exports.verifyAdmin = verifyAdmin;

const requireAdminCaller = async (context, action = 'admin_action', targetId = null, targetType = null) => {
  return await verifyAdmin(context, action, targetId, targetType);
};

/**
 * Set or revoke admin custom claims for a user
 */
exports.setAdminClaim = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (context.auth) {
      await checkRateLimit(context.auth.uid, 'admin_action', 30);
    }
    await requireAdminCaller(context, 'setAdminClaim', data?.uid, 'user');

    const { uid, admin: isAdmin } = data;

    if (!uid || typeof uid !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'uid must be a non-empty string'
      );
    }

    if (typeof isAdmin !== 'boolean') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'admin must be a boolean'
      );
    }

    try {
      const targetUser = await auth.getUser(uid);
      const accessClaims = getAccessClaimsForEmail(targetUser.email);

      if (isAdmin && accessClaims.sharevibeSuperOwner !== true) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Target user is not listed as a Super Owner in the central access policy'
        );
      }

      if (isAdmin) {
        await setPolicyClaimsForUser(targetUser);
      } else {
        await clearShareVibeClaimsForUser(targetUser);
      }

      return {
        success: true,
        message: `Access claims synced for user ${uid}`,
      };
    } catch (error) {
      throwIfInternal(error, 'Failed to set admin claim');
    }
  });

/**
 * Get user's admin status
 */
exports.getUserAdminStatus = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }
    await checkRateLimit(context.auth.uid, 'api_call', 30);

    const { uid } = data;

    if (!uid || typeof uid !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'uid must be a non-empty string'
      );
    }

    try {
      const isSelf = context.auth.uid === uid;
      if (!isSelf) {
        await requireAdminCaller(context, 'getUserAdminStatus', uid, 'user');
      }

      const user = await auth.getUser(uid);
      return {
        uid: user.uid,
        email: user.email || null,
        isAdmin: getAccessClaimsForEmail(user.email).sharevibeSuperOwner === true,
        access: getAccessClaimsForEmail(user.email),
      };
    } catch (error) {
      throwIfInternal(error, 'Failed to get user status');
    }
  });

/**
 * List all admin users
 */
exports.listAdmins = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (context.auth) {
      await checkRateLimit(context.auth.uid, 'admin_action', 30);
    }
    try {
      await requireAdminCaller(context, 'listAdmins');

      const listUsersResult = await auth.listUsers(1000);
      const admins = listUsersResult.users
        .filter((user) => getAccessClaimsForEmail(user.email).sharevibeSuperOwner === true)
        .map((user) => ({
          uid: user.uid,
          email: user.email || null,
        }));

      return { admins, count: admins.length };
    } catch (error) {
      throwIfInternal(error, 'Failed to list admins');
    }
  });

/**
 * Migration helper: Create users collection documents for email-based admins
 */
exports.migrateLegacyAdmins = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (context.auth) {
      await checkRateLimit(context.auth.uid, 'admin_action', 30);
    }
    try {
      await requireAdminCaller(context, 'migrateLegacyAdmins');
      const legacyAdminEmails = getLegacyAdminEmails();

      const migratedUsers = [];

      for (const email of legacyAdminEmails) {
        try {
          const user = await auth.getUserByEmail(email);
          const access = await setPolicyClaimsForUser(user);
          migratedUsers.push({
            uid: user.uid,
            email: user.email,
            status: hasAnyAccessClaim(access) ? 'synced' : 'no-policy-access',
          });
          console.log('Migrated legacy admin claim');
        } catch (error) {
          const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
          console.warn('Could not migrate legacy admin', { code });
        }
      }

      return {
        success: true,
        migrated: migratedUsers,
        message: `Migrated ${migratedUsers.length} legacy admins to Custom Claims`,
      };
    } catch (error) {
      throwIfInternal(error, 'Migration failed');
    }
  });

exports.syncMyAccessClaims = functions
  .region('us-central1')
  .https
  .onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    await checkRateLimit(context.auth.uid, 'api_call', 30);

    try {
      const user = await auth.getUser(context.auth.uid);
      const access = await setPolicyClaimsForUser(user);

      return {
        success: true,
        access,
      };
    } catch (error) {
      throwIfInternal(error, 'Failed to sync access claims');
    }
  });

exports.syncUserAccessClaims = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (context.auth) {
      await checkRateLimit(context.auth.uid, 'admin_action', 30);
    }
    await requireAdminCaller(context, 'syncUserAccessClaims', data?.uid || data?.email, 'user');

    const uid = typeof data?.uid === 'string' ? data.uid.trim() : '';
    const email = normalizeEmail(data?.email);

    if (!uid && !email) {
      throw new functions.https.HttpsError('invalid-argument', 'uid or email is required');
    }

    try {
      const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
      const access = await setPolicyClaimsForUser(user);

      return {
        success: true,
        uid: user.uid,
        email: user.email || null,
        access,
      };
    } catch (error) {
      throwIfInternal(error, 'Failed to sync user access claims');
    }
  });

/**
 * [SV-03] Failed Login Rate Limiter (Brute-force protection)
 */
exports.reportLoginFailure = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    const { email, uid } = data;
    const ip = context.rawRequest.headers['x-forwarded-for'] || context.rawRequest.socket.remoteAddress || 'unknown';
    const key = uid || email || ip;
    
    if (!key) {
      throw new functions.https.HttpsError('invalid-argument', 'email, uid or ip required');
    }
    
    await checkRateLimit(ip, 'login_attempt', 10);
    
    const lockRef = admin.firestore().collection('login_locks').doc(encodeURIComponent(key));
    const now = Date.now();
    
    try {
      await admin.firestore().runTransaction(async (transaction) => {
        const doc = await transaction.get(lockRef);
        let attempts = 0;
        let lockUntil = 0;
        
        if (doc.exists) {
          const docData = doc.data();
          attempts = docData.attempts || 0;
          lockUntil = docData.lockUntil || 0;
        }
        
        attempts += 1;
        if (attempts >= 5) {
          lockUntil = now + 15 * 60 * 1000; // 15 mins lock
        }
        
        transaction.set(lockRef, {
          attempts,
          lockUntil,
          lastAttempt: now
        }, { merge: true });
      });
      return { success: true };
    } catch (error) {
      throwIfInternal(error, 'Failed to log login failure');
    }
  });

exports.checkLoginLock = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    const { email, uid } = data;
    const ip = context.rawRequest.headers['x-forwarded-for'] || context.rawRequest.socket.remoteAddress || 'unknown';
    const key = uid || email || ip;
    
    if (!key) {
      return { locked: false };
    }
    
    await checkRateLimit(ip, 'login_attempt_check', 30);
    
    try {
      const lockRef = admin.firestore().collection('login_locks').doc(encodeURIComponent(key));
      const doc = await lockRef.get();
      
      if (doc.exists) {
        const { lockUntil, attempts } = doc.data();
        const now = Date.now();
        if (lockUntil && now < lockUntil) {
          return { locked: true, remainingTime: Math.ceil((lockUntil - now) / 1000) };
        }
        if (lockUntil && now >= lockUntil) {
          // Reset attempts if the lock time has passed
          await lockRef.set({ attempts: 0, lockUntil: 0 }, { merge: true });
        }
      }
      return { locked: false };
    } catch (error) {
      throwIfInternal(error, 'Failed to check login lock status');
    }
  });

/**
 * [SV-12] Password Reset Session Revocation
 */
exports.revokeUserSessions = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    await checkRateLimit(context.auth.uid, 'api_call', 30);
    
    const uid = context.auth.uid;
    const ip = context.rawRequest.headers['x-forwarded-for'] || context.rawRequest.socket.remoteAddress || 'unknown';
    const userAgent = context.rawRequest.headers['user-agent'] || 'unknown';
    
    try {
      await auth.revokeRefreshTokens(uid);
      
      await admin.firestore().collection('security_events').add({
        type: 'password_reset_revocation',
        uid,
        ip,
        userAgent,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      throwIfInternal(error, 'Failed to revoke user sessions');
    }
  });

/**
 * [SV-06] Validate QR Code Callable Function
 * Enforces: existence, Cafe ID matching, expiration checks, and maximum usage validation.
 */
exports.validateQR = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    const { token, cafeId } = data;
    if (!token) {
      throw new functions.https.HttpsError('invalid-argument', 'Token is required.');
    }

    const ip = context.rawRequest.headers['x-forwarded-for'] || context.rawRequest.socket.remoteAddress || 'unknown';
    const rateLimitKey = context.auth ? context.auth.uid : ip;
    await checkRateLimit(rateLimitKey, 'validate_qr', 30);

    const qrRef = admin.firestore().collection('qr_codes').doc(token);
    const doc = await qrRef.get();

    if (!doc.exists) {
      throw new functions.https.HttpsError('not-found', 'QR code does not exist.');
    }

    const qrData = doc.data();
    if (cafeId && qrData.cafeId !== cafeId) {
      throw new functions.https.HttpsError('permission-denied', 'QR code does not match this cafe.');
    }

    if (qrData.status === 'expired') {
      throw new functions.https.HttpsError('failed-precondition', 'QR code has expired.');
    }

    const now = Date.now();
    if (qrData.expiresAt && now > qrData.expiresAt.toMillis()) {
      await qrRef.update({ status: 'expired' });
      throw new functions.https.HttpsError('failed-precondition', 'QR code has expired.');
    }

    if (qrData.maxUsage && qrData.usageCount >= qrData.maxUsage) {
      await qrRef.update({ status: 'expired' });
      throw new functions.https.HttpsError('failed-precondition', 'QR code has reached maximum usage.');
    }

    // Increment usage count safely
    await qrRef.update({
      usageCount: admin.firestore.FieldValue.increment(1)
    });

    return { success: true, cafeId: qrData.cafeId };
  });

/**
 * [SV-06] Scheduled Campaign & QR Expiry Function
 * Runs hourly to scan and auto-expire items whose expiration date is in the past.
 */
exports.expireCampaigns = functions
  .region('us-central1')
  .pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    
    // 1. Expire QR codes
    const qrSnapshot = await db.collection('qr_codes')
      .where('status', '==', 'active')
      .where('expiresAt', '<', now)
      .get();
      
    const batch = db.batch();
    qrSnapshot.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });
    
    // 2. Expire cafe campaigns
    const campaignsSnapshot = await db.collectionGroup('campaigns')
      .where('status', '==', 'active')
      .where('endDate', '<', now)
      .get();
      
    campaignsSnapshot.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });
    
    await batch.commit();
    console.log(`Expired ${qrSnapshot.size} QR codes and ${campaignsSnapshot.size} campaigns.`);
    return null;
  });

/**
 * [SV-08] Scheduled Rate Limit Cleanups
 * Automatically purges expired rate limits documents older than 24 hours.
 */
exports.cleanupRateLimits = functions
  .region('us-central1')
  .pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const snapshot = await db.collection('rate_limits')
      .where('lastUpdated', '<', oneDayAgo)
      .get();
      
    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} rate limit logs.`);
    return null;
  });

/**
 * [SV-13] GDPR / KVKK Export User Data Function
 */
exports.exportUserData = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    await checkRateLimit(context.auth.uid, 'api_call', 10);

    const uid = context.auth.uid;
    const db = admin.firestore();

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const mediaSnapshot = await db.collection('media').where('authorUid', '==', uid).get();
    const photos = mediaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const cafeOwnerQuery = await db.collection('cafeOwnerAccess').where('email', '==', context.auth.token.email || '').get();
    const cafeAccess = cafeOwnerQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      profile: userData,
      photos,
      cafeAccess,
      exportTimestamp: new Date().toISOString()
    };
  });

/**
 * [SV-13] GDPR / KVKK Delete User Data Function (Right to Be Forgotten)
 */
exports.deleteUserData = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    await checkRateLimit(context.auth.uid, 'api_call', 5);

    const uid = context.auth.uid;
    const db = admin.firestore();
    // 1. Delete all user photos from Storage and Firestore
    const mediaSnapshot = await db.collection('media').where('authorUid', '==', uid).get();
    const batch = db.batch();
    for (const doc of mediaSnapshot.docs) {
      const mediaData = doc.data();
      if (mediaData.url) {
        try {
          await getStorageFileFromDownloadUrl(mediaData.url).delete();
        } catch (err) {
          console.error(`Failed to delete storage file for media ${doc.id} during deletion:`, err);
        }
      }
      batch.delete(doc.ref);
    }

    // 2. Delete user profile document
    const userDocRef = db.collection('users').doc(uid);
    batch.delete(userDocRef);

    // 3. Clear cafe owner associations
    const cafeOwnerQuery = await db.collection('cafeOwnerAccess').where('email', '==', context.auth.token.email || '').get();
    cafeOwnerQuery.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // 4. Delete Auth user account
    await admin.auth().deleteUser(uid);

    return { success: true };
  });

/**
 * [SV-13] Scheduled Expired Photo Cleanups
 * Auto-deletes rejected or expired photos 90 days after creation.
 */
exports.cleanupExpiredPhotos = functions
  .region('us-central1')
  .pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const snapshot = await db.collection('media')
      .where('status', 'in', ['expired', 'rejected'])
      .where('createdAt', '<', ninetyDaysAgo)
      .get();
      
    const batch = db.batch();
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.url) {
        try {
          await getStorageFileFromDownloadUrl(data.url).delete();
        } catch (err) {
          console.error(`Failed to delete storage file for media ${doc.id}:`, err);
        }
      }
      batch.delete(doc.ref);
    }
    
    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} expired / rejected photos.`);
    return null;
  });

/**
 * [SV-02 & SV-09] Image Processing & NSFW Moderation Storage Trigger
 * - Normalizes upload using Sharp: resizes, strips metadata/EXIF.
 * - Moderates content via Cloud Vision API SafeSearch.
 * - Automatically deletes and rejects NSFW uploads, queuing POSSIBLE ones for review.
 * - Triggers notification emails on rejection.
 */
exports.moderateAndProcessImage = functions
  .region('us-central1')
  .storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name; // e.g. "media/my-cafe/filename.jpg"
    
    if (!filePath.startsWith('media/')) {
      return null;
    }
    
    const fileParts = filePath.split('/');
    if (fileParts.length < 3) {
      return null;
    }
    
    const cafeSlug = fileParts[1];
    const fileName = fileParts[2];
    
    // Prevent infinite cycles
    if (object.metadata && object.metadata.processed === 'true') {
      console.log('File already processed:', filePath);
      return null;
    }
    
    const bucketName = object.bucket;
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(filePath);
    
    const os = require('os');
    const path = require('path');
    const fs = require('fs');
    const tempFilePath = path.join(os.tmpdir(), fileName);
    
    try {
      await file.download({ destination: tempFilePath });
    } catch (err) {
      console.error('Failed to download file:', err);
      return null;
    }
    
    // 1. SafeSearch NSFW Moderation
    const vision = require('@google-cloud/vision');
    const visionClient = new vision.ImageAnnotatorClient();
    
    let safeSearch;
    try {
      const [result] = await visionClient.safeSearchDetection(tempFilePath);
      safeSearch = result.safeSearchAnnotation;
    } catch (err) {
      console.error('Vision API safeSearch failed:', err);
      safeSearch = { adult: 'UNKNOWN', violence: 'UNKNOWN', racy: 'UNKNOWN' };
    }
    
    const isLikely = (val) => val === 'LIKELY' || val === 'VERY_LIKELY';
    const isPossible = (val) => val === 'POSSIBLE';
    
    const isNSFW = isLikely(safeSearch.adult) || isLikely(safeSearch.violence) || isLikely(safeSearch.racy);
    const isSuspect = isPossible(safeSearch.adult) || isPossible(safeSearch.violence) || isPossible(safeSearch.racy);
    
    // Find associated media document in Firestore (uploaded in the last 5 minutes)
    const firestore = admin.firestore();
    const minutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const mediaQuery = await firestore.collection('media')
      .where('cafeSlug', '==', cafeSlug)
      .where('createdAt', '>=', minutesAgo)
      .get();
      
    let mediaDoc = null;
    for (const doc of mediaQuery.docs) {
      if (doc.data().url.includes(fileName) || doc.data().url.includes(encodeURIComponent(fileName))) {
        mediaDoc = doc;
        break;
      }
    }
    
    if (isNSFW) {
      console.warn('NSFW content detected. Rejecting and deleting:', filePath);
      
      try {
        await file.delete();
      } catch (err) {
        console.error('Failed to delete NSFW file:', err);
      }
      
      if (mediaDoc) {
        await mediaDoc.ref.update({ status: 'rejected' });
        
        // Audit log
        await firestore.collection('security_events').add({
          type: 'nsfw_auto_reject',
          mediaId: mediaDoc.id,
          cafeSlug,
          uploaderUid: object.metadata ? object.metadata.uploaderUid : 'unknown',
          safeSearch,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Mail notification trigger
        const uploaderUid = object.metadata ? object.metadata.uploaderUid : null;
        if (uploaderUid) {
          try {
            const userRecord = await auth.getUser(uploaderUid);
            if (userRecord.email) {
              await firestore.collection('mail').add({
                to: userRecord.email,
                message: {
                  subject: 'Paylaşımınız Kurallara Uygun Bulunmadı',
                  text: 'Yüklediğiniz görsel platform kurallarına (uygunsuz içerik) aykırı olduğu için reddedilmiştir.',
                  html: '<p>Yüklediğiniz görsel platform kurallarımıza uygun bulunmadığı için otomatik olarak reddedilmiştir.</p>'
                }
              });
            }
          } catch (err) {
            console.error('Failed to trigger notification email:', err);
          }
        }
      }
      
      try {
        fs.unlinkSync(tempFilePath);
      } catch (_) {}
      return null;
    }
    
    // 2. Normalization & EXIF metadata stripping via Sharp
    const sharp = require('sharp');
    const outputFilePath = path.join(os.tmpdir(), `processed_${fileName}`);
    
    try {
      await sharp(tempFilePath)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, chromaSubsampling: '4:4:4' })
        .rotate() // orient according to EXIF, then strip
        .toFile(outputFilePath);
        
      await bucket.upload(outputFilePath, {
        destination: filePath,
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            processed: 'true',
            uploaderUid: object.metadata ? object.metadata.uploaderUid : '',
            cafeSlug,
            uploadedAt: object.metadata ? object.metadata.uploadedAt : ''
          }
        }
      });
      console.log('Image processed and stripped of EXIF metadata successfully.');
    } catch (err) {
      console.error('Sharp compression failed:', err);
    }
    
    // 3. Update Firestore status
    if (mediaDoc) {
      const finalStatus = isSuspect ? 'pending_review' : 'approved';
      await mediaDoc.ref.update({
        status: finalStatus,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Cleanup
    try {
      fs.unlinkSync(tempFilePath);
      if (fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath);
      }
    } catch (_) {}
    
    return null;
  });

/**
 * [NV-01] signup Callable Cloud Function
 */
exports.signup = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    const ip = context.rawRequest.headers['x-forwarded-for'] || context.rawRequest.socket.remoteAddress || 'unknown';
    await checkRateLimit(ip, 'signup_attempt', 5);

    const email = normalizeEmail(data?.email);
    const password = data?.password;

    if (!email || !password || typeof password !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Email ve şifre gereklidir.');
    }

    if (password.length < 8) {
      throw new functions.https.HttpsError('invalid-argument', 'Şifre en az 8 karakter olmalıdır.');
    }

    try {
      const userRecord = await auth.createUser({
        email,
        password,
        emailVerified: false,
      });

      // Synchronize access claims
      await setPolicyClaimsForUser(userRecord);

      return {
        success: true,
        uid: userRecord.uid,
      };
    } catch (error) {
      throw handleFunctionError(error, 'Kayıt işlemi başarısız oldu.');
    }
  });

/**
 * [NV-01] alertAdminOn500 Firestore trigger
 */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
exports.alertAdminOn500 = onDocumentCreated({
  database: 'ai-studio-0179b1de-f24b-4cc2-aaaa-4e4738a7589a',
  document: 'error_logs/{errorId}',
  region: 'us-central1'
}, async (event) => {
  const snap = event.data;
  const errorData = snap ? snap.data() : null;
  if (!errorData) return null;

  if (errorData.statusCode === 500 || errorData.isInternal === true) {
    const db = admin.firestore();
    
    const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email).filter(Boolean);
    
    const superOwners = Array.from(superOwnerEmailSet);
    const recipientEmails = [...new Set([...adminEmails, ...superOwners])];
    
    for (const email of recipientEmails) {
      await db.collection('mail').add({
        to: email,
        message: {
          subject: 'ALERT: ShareVibe HTTP 500 Hatası',
          text: `Bir HTTP 500 hatası tespit edildi. Olay ID: ${event.params.errorId}. Hata: ${errorData.message || 'Hata detayları yok'}. Tam stack trace için admin paneli inceleyin.`,
          html: `<p>Bir HTTP 500 hatası tespit edildi.</p><p><strong>Olay ID:</strong> ${event.params.errorId}</p><p><strong>Mesaj:</strong> ${errorData.message || 'Hata detayları yok'}</p><p>Tam stack trace için admin paneline bakın.</p>`
        }
      });
    }
  }
  return null;
});

/**
 * [NV-03] getPhotoUrl Cloud Function
 * Generates a 1-hour signed storage URL after verifying access permissions.
 */
exports.getPhotoUrl = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    const { photoId } = data;
    if (!photoId || typeof photoId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'photoId must be a non-empty string');
    }

    const ip = context.rawRequest.headers['x-forwarded-for'] || context.rawRequest.socket.remoteAddress || 'unknown';
    const rateLimitKey = context.auth ? context.auth.uid : ip;
    await checkRateLimit(rateLimitKey, 'get_photo_url', 60);

    try {
      const db = admin.firestore();
      const mediaDoc = await db.collection('media').doc(photoId).get();

      if (!mediaDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Photo record not found in database.');
      }

      const mediaData = mediaDoc.data();
      const callerUid = context.auth ? context.auth.uid : null;
      const callerEmail = context.auth ? context.auth.token.email : '';

      // Access checks
      let hasAccess = false;
      if (mediaData.status === 'approved') {
        hasAccess = true;
      } else if (callerUid) {
        if (mediaData.authorUid === callerUid) {
          hasAccess = true;
        } else {
          const accessClaims = getAccessClaimsForEmail(callerEmail);
          const isSuperAdmin = accessClaims.sharevibeSuperOwner === true;
          const isCafeManager = (accessClaims.sharevibeOwnerCafes || []).includes(mediaData.cafeSlug) || 
                                (accessClaims.sharevibeManagerCafes || []).includes(mediaData.cafeSlug);
          if (isSuperAdmin || isCafeManager) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        throw new functions.https.HttpsError('permission-denied', 'You do not have access to view this photo.');
      }

      const file = getStorageFileFromDownloadUrl(mediaData.url);
      
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour expiry
      });

      return { signedUrl };
    } catch (error) {
      throw handleFunctionError(error, 'Failed to generate signed URL.');
    }
  });

/**
 * [NV-06] onUserCredentialsChanged Cloud Function
 * Revokes refresh tokens and logs credentials change to audit_logs.
 */
exports.onUserCredentialsChanged = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { action, oldEmail, newEmail } = data;
    const uid = context.auth.uid;
    const ip = context.rawRequest.headers['x-forwarded-for'] || context.rawRequest.socket.remoteAddress || 'unknown';

    try {
      // Revoke all current tokens/sessions
      await auth.revokeRefreshTokens(uid);

      // Log to audit_logs
      const db = admin.firestore();
      await db.collection('audit_logs').add({
        action: action || 'email_changed',
        oldEmail: oldEmail || null,
        newEmail: newEmail || null,
        uid,
        ip,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      throw handleFunctionError(error, 'Credentials update log failed.');
    }
  });

// Global rejection and exception handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  const db = admin.firestore();
  const errorId = `unhandled_rejection_${Date.now()}`;
  db.collection('error_logs').doc(errorId).set({
    message: String(reason),
    stack: reason?.stack || '',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    isInternal: true,
    statusCode: 500
  }).catch(() => {});
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  const db = admin.firestore();
  const errorId = `uncaught_exception_${Date.now()}`;
  db.collection('error_logs').doc(errorId).set({
    message: error?.message || String(error),
    stack: error?.stack || '',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    isInternal: true,
    statusCode: 500
  }).then(() => {
    process.exit(1);
  }).catch(() => {
    process.exit(1);
  });
});
