import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
} from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  config.apiKey && config.databaseURL && config.projectId,
);

// Only initialize when configured — getDatabase()/getAuth() throw on an empty
// config, which would white-screen the app before the setup notice can render.
const app = firebaseConfigured ? initializeApp(config) : null;
export const auth: Auth = app ? getAuth(app) : ({} as Auth);
export const db: Database = app ? getDatabase(app) : ({} as Database);

let uidResolve: (uid: string) => void;
export const uidReady = new Promise<string>((res) => (uidResolve = res));

// Sign in anonymously on load; resolve uidReady once we have a uid.
export function startAuth() {
  if (!firebaseConfigured) return;
  onAuthStateChanged(auth, (user) => {
    if (user) uidResolve(user.uid);
  });
  signInAnonymously(auth).catch((err) => {
    console.error("Anonymous sign-in failed", err);
  });
}

export function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}
