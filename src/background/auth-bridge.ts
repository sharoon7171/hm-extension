import { signInWithPassword, signOut } from "../firebase/auth";
import type {
  AckResponse,
  AuthStateResponse,
  GetAuthStateRequest,
  SignInRequest,
  SignOutRequest,
} from "../shared/messages";
import { readBackgroundAuthState } from "./scenes-mirror";

function isGetAuthState(value: unknown): value is GetAuthStateRequest {
  if (!value || typeof value !== "object") return false;
  return (value as { type?: unknown }).type === "getAuthState";
}

function isSignIn(value: unknown): value is SignInRequest {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; email?: unknown; password?: unknown };
  return (
    message.type === "signIn" &&
    typeof message.email === "string" &&
    typeof message.password === "string"
  );
}

function isSignOut(value: unknown): value is SignOutRequest {
  if (!value || typeof value !== "object") return false;
  return (value as { type?: unknown }).type === "signOut";
}

export function registerAuthBridge(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (isGetAuthState(message)) {
      void readBackgroundAuthState()
        .then<AuthStateResponse>(snapshot => snapshot)
        .catch<AuthStateResponse>(() => ({
          uid: null,
          email: null,
          ready: true,
        }))
        .then(sendResponse);
      return true;
    }
    if (isSignIn(message)) {
      void signInWithPassword(message.email, message.password)
        .then<AckResponse>(() => ({ ok: true }))
        .catch<AckResponse>(error => ({ ok: false, error: (error as Error).message }))
        .then(sendResponse);
      return true;
    }
    if (isSignOut(message)) {
      void signOut()
        .then<AckResponse>(() => ({ ok: true }))
        .catch<AckResponse>(error => ({ ok: false, error: (error as Error).message }))
        .then(sendResponse);
      return true;
    }
    return false;
  });
}
