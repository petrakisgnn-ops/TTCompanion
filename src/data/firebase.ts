import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

/**
 * Firebase project config. These values are PUBLIC identifiers (safe to ship in client code) — the
 * app is secured by Realtime Database rules + Anonymous Auth, not by hiding this. Env overrides are
 * honoured so the values can move to Actions secrets later without a code change.
 */
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'AIzaSyBKRg_foouRfohfL0YLSf_-n7IwywtQpSY',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'ttcompanion-fefc6.firebaseapp.com',
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL       ?? 'https://ttcompanion-fefc6-default-rtdb.europe-west1.firebasedatabase.app',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'ttcompanion-fefc6',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'ttcompanion-fefc6.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '633101282837',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:633101282837:web:fad17a5a5d3100c8fa281c',
};

const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Database = getDatabase(app);

// Anonymous sign-in kicks off once; every repo call awaits this before touching the database.
let authReadyPromise: Promise<string> | null = null;

export function ensureAuth(): Promise<string> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
  if (!authReadyPromise) {
    authReadyPromise = signInAnonymously(auth).then(cred => cred.user.uid);
  }
  return authReadyPromise;
}
