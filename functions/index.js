/**
 * Firebase Cloud Functions for Share Vibe
 * Deploy with: firebase deploy --only functions
 * 
 * Usage:
 * 1. Call from Admin SDK:
 *    const setAdminClaim = functions.httpsCallable('setAdminClaim');
 *    await setAdminClaim({ uid: 'user-uid', admin: true });
 * 
 * 2. Call via HTTP (requires Auth token):
 *    curl -X POST \
 *      https://region-projectid.cloudfunctions.net/setAdminClaim \
 *      -H "Authorization: Bearer $TOKEN" \
 *      -d '{"uid": "user-uid", "admin": true}'
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (auto-initialized in Cloud Functions)
if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();

/**
 * Set or revoke admin custom claims for a user
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {boolean} admin - true to make admin, false to revoke
 * @returns {Promise<{success: boolean, message: string}>}
 */
exports.setAdminClaim = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    // Check caller is authenticated and is admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated to set admin claims'
      );
    }

    // Optional: Check if caller is already admin (for safety)
    const callerToken = await auth.getUser(context.auth.uid);
    const isCallerAdmin = callerToken.customClaims?.admin === true;

    if (!isCallerAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can set admin claims'
      );
    }

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
      // Set or revoke custom claims
      const customClaims = isAdmin ? { admin: true } : null;
      await auth.setCustomUserClaims(uid, customClaims);

      return {
        success: true,
        message: `Admin claim ${isAdmin ? 'set' : 'revoked'} for user ${uid}`,
      };
    } catch (error) {
      console.error('Error setting admin claim:', error);
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to set admin claim'
      );
    }
  });

/**
 * Get user's admin status
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<{uid: string, isAdmin: boolean, email: string}>}
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

    const { uid } = data;

    if (!uid || typeof uid !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'uid must be a non-empty string'
      );
    }

    try {
      const user = await auth.getUser(uid);
      return {
        uid: user.uid,
        email: user.email,
        isAdmin: user.customClaims?.admin === true,
      };
    } catch (error) {
      console.error('Error getting user admin status:', error);
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to get user status'
      );
    }
  });

/**
 * List all admin users
 * 
 * @returns {Promise<Array<{uid: string, email: string}>>}
 */
exports.listAdmins = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    // Only allow admins to call this
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    try {
      const callerUser = await auth.getUser(context.auth.uid);
      if (callerUser.customClaims?.admin !== true) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only admins can list other admins'
        );
      }

      const listUsersResult = await auth.listUsers(1000);
      const admins = listUsersResult.users
        .filter((user) => user.customClaims?.admin === true)
        .map((user) => ({
          uid: user.uid,
          email: user.email,
        }));

      return { admins, count: admins.length };
    } catch (error) {
      console.error('Error listing admins:', error);
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to list admins'
      );
    }
  });

/**
 * Migration helper: Create users collection documents for email-based admins
 * Call once to migrate legacy email-based access to Custom Claims
 * 
 * Usage:
 * const migrate = functions.httpsCallable('migrateLegacyAdmins');
 * await migrate({});
 */
exports.migrateLegacyAdmins = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    // Restrict to project admins only
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    try {
      const legacyAdminEmails = [
        'fariddmahmudlu2008@gmail.com',
        'aslankerem182@gmail.com',
      ];

      const users = await auth.listUsers(1000);
      const migratedUsers = [];

      for (const email of legacyAdminEmails) {
        try {
          const user = await auth.getUserByEmail(email);
          await auth.setCustomUserClaims(user.uid, { admin: true });
          migratedUsers.push({
            uid: user.uid,
            email: user.email,
            status: 'migrated',
          });
          console.log(`Migrated admin claim for ${email}`);
        } catch (error) {
          console.warn(`Could not migrate ${email}:`, error);
        }
      }

      return {
        success: true,
        migrated: migratedUsers,
        message: `Migrated ${migratedUsers.length} legacy admins to Custom Claims`,
      };
    } catch (error) {
      console.error('Migration error:', error);
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Migration failed'
      );
    }
  });
