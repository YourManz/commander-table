import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase } from "firebase/database";

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

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getDatabase(app);

let uidResolve: (uid: string) => void;
export const uidReady = new Promise<string>((res) => (uidResolve = res));

// Sign in anonymously on load; resolve uidReady once we have a uid.
export function startAuth() {
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
