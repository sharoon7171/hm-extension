import {
  completeSignInWithLink,
  requestSignInLink,
  signOut,
} from "../firebase/auth";
import type {
  AckResponse,
  AuthStateResponse,
  CompleteSignInRequest,
  GetAuthStateRequest,
  RequestSignInLinkMessage,
  SignOutRequest,
} from "../shared/messages";
import { readBackgroundAuthState } from "./scenes-mirror";

function isGetAuthState(value: unknown): value is GetAuthStateRequest {
  if (!value || typeof value !== "object") return false;
  return (value as { type?: unknown }).type === "getAuthState";
}

function isRequestSignInLink(value: unknown): value is RequestSignInLinkMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; email?: unknown };
  return message.type === "requestSignInLink" && typeof message.email === "string";
}

function isSignOut(value: unknown): value is SignOutRequest {
  if (!value || typeof value !== "object") return false;
  return (value as { type?: unknown }).type === "signOut";
}

function isCompleteSignIn(value: unknown): value is CompleteSignInRequest {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; url?: unknown };
  return message.type === "completeSignIn" && typeof message.url === "string";
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
    if (isRequestSignInLink(message)) {
      void requestSignInLink(message.email)
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

  chrome.runtime.onMessageExternal.addListener(
    (message, _sender, sendResponse) => {
      if (!isCompleteSignIn(message)) return false;
      void completeSignInWithLink(message.url)
        .then<AckResponse>(() => ({ ok: true }))
        .catch<AckResponse>(error => ({ ok: false, error: (error as Error).message }))
        .then(sendResponse);
      return true;
    },
  );
}
