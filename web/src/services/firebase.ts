import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

/** Sessão/aba única — distingue duas janelas logadas na mesma conta ao ecoar saves. */
export const SESSION_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

/** true quando o projectId aponta para um projeto Firebase real, não o placeholder do template. */
export function isValidProjectId(projectId: string | undefined): boolean {
  return Boolean(projectId) && !projectId!.includes('COLE_');
}

export function firebaseConfigured(): boolean {
  return isValidProjectId(getFirebaseConfig().projectId);
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function boot(): void {
  if (app) return;
  app = initializeApp(getFirebaseConfig());
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

export function getFirebaseAuth(): Auth {
  boot();
  return authInstance!;
}

export function getDb(): Firestore {
  boot();
  return dbInstance!;
}
