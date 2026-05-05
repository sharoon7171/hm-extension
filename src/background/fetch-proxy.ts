import type { FetchTextRequest, FetchTextResponse } from "../shared/messages";

const ALLOWED_HOSTS = new Set(["video.adultempire.com"]);

export function registerFetchProxy(): void {
  chrome.runtime.onMessage.addListener(
    (message: FetchTextRequest, _sender, sendResponse) => {
      if (!message || message.type !== "fetchText") return false;
      void respondWithText(message.url, sendResponse);
      return true;
    },
  );
}

async function respondWithText(
  url: string,
  sendResponse: (response: FetchTextResponse) => void,
): Promise<void> {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.has(parsed.host)) throw new Error(`host not allowed: ${parsed.host}`);
    const response = await fetch(parsed.toString(), { credentials: "omit" });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const text = await response.text();
    sendResponse({ ok: true, text });
  } catch (error) {
    sendResponse({ ok: false, error: (error as Error).message });
  }
}
