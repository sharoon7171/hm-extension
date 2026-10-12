import {
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirebaseApp } from "./app";

let cached: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (cached) return cached;
  const app = getFirebaseApp();
  try {
    cached = initializeAuth(app, { persistence: indexedDBLocalPersistence });
  } catch {
    cached = getAuth(app);
  }
  return cached;
}

export function watchAuthState(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );
  return credential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}
