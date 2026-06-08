import type { SceneKind } from "../firebase/scenes";

export type FetchTextRequest = { type: "fetchText"; url: string };

export type FetchTextResponse =
  | { ok: true; text: string }
  | { ok: false; error: string };

export type SceneAddRequest = {
  type: "sceneAdd";
  kind: SceneKind;
  sceneId: string;
  title: string;
  href: string;
};

export type SceneRemoveRequest = {
  type: "sceneRemove";
  kind: SceneKind;
  sceneId: string;
};

export type SceneDeleteAllRequest = {
  type: "sceneDeleteAll";
  kind: SceneKind;
};

export type CompleteSignInRequest = {
  type: "completeSignIn";
  url: string;
};

export type GetAuthStateRequest = { type: "getAuthState" };

export type RequestSignInLinkMessage = {
  type: "requestSignInLink";
  email: string;
};

export type SignOutRequest = { type: "signOut" };

export type AuthStateResponse = {
  uid: string | null;
  email: string | null;
  ready: boolean;
};

export type AckResponse = { ok: true } | { ok: false; error: string };

export async function requestText(url: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException("aborted", "AbortError"));
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    const request: FetchTextRequest = { type: "fetchText", url };
    chrome.runtime.sendMessage(request, (response: FetchTextResponse | undefined) => {
      signal.removeEventListener("abort", onAbort);
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response) return reject(new Error("background unavailable"));
      if (!response.ok) return reject(new Error(response.error));
      resolve(response.text);
    });
  });
}
