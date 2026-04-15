import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

const getErrorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

const getCurrentDomain = () =>
  typeof window !== 'undefined' ? window.location.hostname : 'mevcut alan adı';

const isLocalDevelopmentHost = (domain: string) =>
  domain === '0.0.0.0' ||
  domain === '127.0.0.1' ||
  /^\d{1,3}(\.\d{1,3}){3}$/.test(domain);

const createGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
};

const finalizeSignIn = async (credential: UserCredential) => {
  await credential.user.getIdToken(true);
  return credential;
};

type GoogleSignInOptions = {
  beforeRedirect?: () => Promise<void> | void;
};

export const resolveGoogleSignInRedirect = async (): Promise<UserCredential | null> => {
  const result = await getRedirectResult(auth);

  if (!result) {
    return null;
  }

  return finalizeSignIn(result);
};

export const signInWithGoogle = async (
  options: GoogleSignInOptions = {}
): Promise<UserCredential | null> => {
  const { beforeRedirect } = options;
  const provider = createGoogleProvider();
  try {
    return await finalizeSignIn(await signInWithPopup(auth, provider));
  } catch (error) {
    if (REDIRECT_FALLBACK_CODES.has(getErrorCode(error))) {
      await beforeRedirect?.();
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw error;
  }
};

export const getGoogleSignInErrorMessage = (error: unknown) => {
  const currentDomain = getCurrentDomain();

  switch (getErrorCode(error)) {
    case 'auth/popup-closed-by-user':
      return 'Google giriş penceresi kapatıldı. Lütfen tekrar deneyin.';
    case 'auth/popup-blocked':
      return 'Tarayıcı giriş penceresini engelledi. Lütfen pop-up iznini açıp tekrar deneyin.';
    case 'auth/operation-not-allowed':
      return 'Firebase Authentication içinde Google ile giriş etkin değil.';
    case 'auth/unauthorized-domain':
      if (isLocalDevelopmentHost(currentDomain)) {
        return `Google ile giriş bu adres üzerinden çalışmaz: ${currentDomain}. Yerelde test için uygulamayı http://localhost:3000 adresinden açın.`;
      }

      return `Bu alan adı Firebase Authentication için yetkilendirilmemiş: ${currentDomain}. Firebase Console > Authentication > Settings > Authorized domains bölümüne bu alan adını ekleyin.`;
    case 'auth/operation-not-supported-in-this-environment':
      return 'Bu tarayıcı açılır pencere ile girişi desteklemiyor. Google girişine yönlendirileceksiniz.';
    default:
      return 'Google ile giriş başlatılamadı. Lütfen tekrar deneyin.';
  }
};
