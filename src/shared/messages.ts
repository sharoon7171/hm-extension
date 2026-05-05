export type FetchTextRequest = { type: "fetchText"; url: string };

export type FetchTextResponse =
  | { ok: true; text: string }
  | { ok: false; error: string };

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
