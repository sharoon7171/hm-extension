import type { FetchTextRequest, FetchTextResponse } from "../shared/messages";

const ALLOWED_HOSTS = new Set(["video.adultempire.com"]);
const MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 500;

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
    const text = await fetchTextWithRetry(parsed.toString());
    sendResponse({ ok: true, text });
  } catch (error) {
    sendResponse({ ok: false, error: (error as Error).message });
  }
}

async function fetchTextWithRetry(url: string): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        credentials: "omit",
        cache: "no-store",
      });
      if (response.ok) return response.text();
      lastError = new Error(`status ${response.status}`);
      if (!isRetriableStatus(response.status)) throw lastError;
    } catch (error) {
      lastError = error as Error;
      if (lastError.message.startsWith("status ") && !isRetriableStatus(Number(lastError.message.slice(7)))) {
        throw lastError;
      }
    }
    if (attempt + 1 < MAX_ATTEMPTS) {
      await sleep(RETRY_BASE_MS * 2 ** attempt);
    }
  }
  throw lastError ?? new Error("fetch failed");
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
