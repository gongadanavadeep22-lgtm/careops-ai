import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

function trimEnv(name) {
  const v = import.meta.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Raw web config from Vite env (build-time for production).
 */
export function getFirebaseWebConfig() {
  return {
    apiKey: trimEnv('VITE_FIREBASE_API_KEY'),
    authDomain: trimEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: trimEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: trimEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: trimEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: trimEnv('VITE_FIREBASE_APP_ID'),
    databaseURL: trimEnv('VITE_FIREBASE_DATABASE_URL'),
  };
}

function looksUnsetOrTemplate(value) {
  if (value == null || value === '') return true;
  const t = String(value).trim();
  if (!t) return true;
  const u = t.toUpperCase();
  if (u.includes('YOUR_API_KEY')) return true;
  if (u.includes('YOUR_PROJECT_ID')) return true;
  if (u.includes('YOUR_APP_ID')) return true;
  if (u.includes('YOUR_SENDER_ID')) return true;
  if (/^YOUR_/i.test(t)) return true;
  return false;
}

/**
 * Missing or template placeholder env var names (for UI / logs).
 */
export function getMissingFirebaseEnvVars() {
  const c = getFirebaseWebConfig();
  const missing = [];
  if (looksUnsetOrTemplate(c.apiKey)) missing.push('VITE_FIREBASE_API_KEY');
  if (looksUnsetOrTemplate(c.authDomain)) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (looksUnsetOrTemplate(c.projectId)) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (looksUnsetOrTemplate(c.storageBucket)) missing.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (looksUnsetOrTemplate(c.messagingSenderId)) missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (looksUnsetOrTemplate(c.appId)) missing.push('VITE_FIREBASE_APP_ID');
  return missing;
}

export function isFirebaseConfigured() {
  return getMissingFirebaseEnvVars().length === 0;
}

let app;
let authInstance;
let dbInstance;
let rtdbInstance;

function buildInitConfig() {
  const c = getFirebaseWebConfig();
  const firebaseConfig = {
    apiKey: c.apiKey,
    authDomain: c.authDomain,
    projectId: c.projectId,
    storageBucket: c.storageBucket,
    messagingSenderId: c.messagingSenderId,
    appId: c.appId,
  };
  if (c.databaseURL) {
    firebaseConfig.databaseURL = c.databaseURL;
  }
  return firebaseConfig;
}

/**
 * Single Firebase app instance; throws if env is incomplete.
 */
function ensureFirebaseApp() {
  if (app) return app;
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Set all VITE_FIREBASE_* variables (see frontend/.env.example).'
    );
  }
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp(buildInitConfig());
  }
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  const c = getFirebaseWebConfig();
  rtdbInstance = c.databaseURL ? getDatabase(app) : null;
  return app;
}

export function getFirebaseAuth() {
  ensureFirebaseApp();
  return authInstance;
}

export function getFirestoreDb() {
  ensureFirebaseApp();
  return dbInstance;
}

/** Realtime Database instance, or null if VITE_FIREBASE_DATABASE_URL is unset. */
export function getRtdb() {
  if (!isFirebaseConfigured()) return null;
  ensureFirebaseApp();
  return rtdbInstance;
}
