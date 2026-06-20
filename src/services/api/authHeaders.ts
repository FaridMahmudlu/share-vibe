import { auth } from '../../lib/firebase/client';
import { hasSuperAdminAccess } from '../../config/access';

export const getFirebaseApiHeaders = async (role = 'cafe_admin', cafeName?: string) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Authentication is required');
  }

  const authProvider = currentUser.providerData?.find((provider) => provider?.providerId)?.providerId;
  const effectiveRole = hasSuperAdminAccess(currentUser.email) ? 'super_admin' : role;
  const idToken = await currentUser.getIdToken();

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
    'X-Firebase-Id': currentUser.uid,
    ...(cafeName?.trim() ? { 'X-Cafe-Name': cafeName.trim() } : {}),
    ...(currentUser.email ? { 'X-Firebase-Email': currentUser.email } : {}),
    ...(currentUser.displayName ? { 'X-Firebase-Name': currentUser.displayName } : {}),
    ...(typeof currentUser.emailVerified === 'boolean'
      ? { 'X-Firebase-Verified': String(currentUser.emailVerified) }
      : {}),
    ...(authProvider ? { 'X-Auth-Provider': authProvider } : {}),
    'X-User-Role': effectiveRole,
  };
};
