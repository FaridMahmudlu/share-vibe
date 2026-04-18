import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

const persistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Kimlik doğrulama kalıcılığı ayarlanamadı:', error);
});

const authReadyPromise = new Promise<void>((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, () => {
    unsubscribe();
    resolve();
  });
});

export const waitForAuthInitialization = async () => {
  await persistencePromise;
  await authReadyPromise;
  return auth.currentUser;
};
