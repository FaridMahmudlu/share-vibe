import { initializeApp } from 'firebase/app';
import {
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithCustomToken,
} from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../../config/firebase/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const appCheckSiteKey =
  import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ||
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  '';
const hasConfiguredAppCheck =
  appCheckSiteKey &&
  !appCheckSiteKey.toLowerCase().includes('placeholder') &&
  !appCheckSiteKey.toLowerCase().includes('your-');

if (import.meta.env.DEV && hasConfiguredAppCheck) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
}

export const appCheck = hasConfiguredAppCheck
  ? initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

const persistencePromise = setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error('Kimlik dogrulama kaliciligi ayarlanamadi:', error);
});

const authReadyPromise = new Promise<void>((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, () => {
    unsubscribe();
    resolve();
  });
});

const buildSessionCheckUrl = () => {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');

  if (configuredApiUrl) {
    return `${configuredApiUrl}/api/session/check`;
  }

  return '/api/session/check';
};

export const waitForAuthInitialization = async () => {
  await persistencePromise;
  await authReadyPromise;

  if (!auth.currentUser) {
    try {
      const checkRes = await fetch(buildSessionCheckUrl(), { credentials: 'include' });
      if (checkRes.ok) {
        const { customToken } = await checkRes.json();
        if (customToken) {
          await signInWithCustomToken(auth, customToken);
        }
      }
    } catch (error) {
      console.warn('Oturum kontrolu basarisiz:', error);
    }
  }

  return auth.currentUser;
};
