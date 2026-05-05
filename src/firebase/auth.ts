import {
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirebaseApp, HOSTING_DOMAIN } from "./app";

const PENDING_EMAIL_KEY = "hotmovies-extension:pending-signin-email";

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

export async function requestSignInLink(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  const url = `https://${HOSTING_DOMAIN}/finish-signin?ext=${chrome.runtime.id}`;
  await sendSignInLinkToEmail(auth, email, {
    url,
    handleCodeInApp: true,
  });
  await chrome.storage.local.set({ [PENDING_EMAIL_KEY]: email });
}

export async function readPendingEmail(): Promise<string | null> {
  const stored = await chrome.storage.local.get(PENDING_EMAIL_KEY);
  const value = stored[PENDING_EMAIL_KEY];
  return typeof value === "string" ? value : null;
}

export async function clearPendingEmail(): Promise<void> {
  await chrome.storage.local.remove(PENDING_EMAIL_KEY);
}

export async function completeSignInWithLink(url: string): Promise<User> {
  const email = await readPendingEmail();
  if (!email) throw new Error("No pending sign-in email found. Request a new link.");
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailLink(auth, email, url);
  await clearPendingEmail();
  return credential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}
