import { completeSignInWithLink } from "../firebase/auth";
import type { AckResponse, CompleteSignInRequest } from "../shared/messages";

function isCompleteSignIn(value: unknown): value is CompleteSignInRequest {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; url?: unknown };
  return message.type === "completeSignIn" && typeof message.url === "string";
}

export function registerAuthBridge(): void {
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
