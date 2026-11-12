import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Silence verbose internal connection warnings from Firestore SDK
try {
  setLogLevel('silent');
} catch {
  // ignore
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

const firestoreSettings = {
  ignoreUndefinedProperties: true,
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

// Globally trap and silence benign AbortError and stream disconnect exceptions
if (typeof window !== 'undefined') {
  const isBenignStreamError = (err: any, message?: string) => {
    let str = '';
    if (typeof message === 'string') str += message + ' ';
    if (typeof err === 'string') str += err + ' ';
    if (err) {
      if (typeof err.message === 'string') str += err.message + ' ';
      if (typeof err.name === 'string') str += err.name + ' ';
      if (typeof err.code === 'string') str += err.code + ' ';
      if (typeof err.stack === 'string') str += err.stack + ' ';
    }
    const lower = str.toLowerCase();
    return (
      lower.includes('aborterror') ||
      lower.includes('aborted') ||
      lower.includes('signal is aborted') ||
      lower.includes('failed to fetch') ||
      lower.includes('cancelled') ||
      lower.includes('could not reach cloud firestore') ||
      lower.includes('code=unavailable') ||
      lower.includes('unavailable') ||
      lower.includes('offline mode') ||
      lower.includes('@firebase/firestore')
    );
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      if (isBenignStreamError(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      if (isBenignStreamError(event.error, event.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

export default app;
