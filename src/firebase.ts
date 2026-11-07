import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

const firestoreSettings = {
  experimentalAutoDetectLongPolling: true,
};

let firestoreDb;
try {
  firestoreDb = dbId
    ? initializeFirestore(app, firestoreSettings, dbId)
    : initializeFirestore(app, firestoreSettings);
} catch (e) {
  firestoreDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);

// Globally trap and silence benign AbortError exceptions from Firestore fetch streams
if (typeof window !== 'undefined') {
  const isAbortError = (err: any) => {
    if (!err) return false;
    const name = err.name || err.constructor?.name;
    const msg = typeof err.message === 'string' ? err.message.toLowerCase() : '';
    const code = err.code;
    return (
      name === 'AbortError' ||
      code === 'cancelled' ||
      msg.includes('aborted') ||
      msg.includes('signal is aborted')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isAbortError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener(
    'error',
    (event) => {
      if (isAbortError(event.error) || (event.message && isAbortError({ message: event.message }))) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );
}

export default app;
