const PLAYER_IFRAME_SELECTOR = 'iframe[src*="adultempire.com/gw/player"]';
const PLAYER_CONTAINER_IFRAME = "#previewContainer iframe, .evp-video-container iframe";

type IframeSrcKind = "invalid" | "unsigned" | "signed";

function iframeSrcKind(src: string): IframeSrcKind {
  try {
    const url = new URL(src);
    const itemId = url.searchParams.get("item_id");
    const sceneId = url.searchParams.get("scene_id");
    if (!itemId || !sceneId) return "invalid";
    const type = (url.searchParams.get("type") ?? "scene").toLowerCase();
    if (type === "preview" || type === "previewscene" || type === "trailer") {
      return "unsigned";
    }
    const apiKey = url.searchParams.get("site");
    const key = url.searchParams.get("key");
    const sig = url.searchParams.get("sig");
    const timestamp = url.searchParams.get("timestamp");
    if (apiKey && key && sig && timestamp) return "signed";
    return "invalid";
  } catch {
    return "invalid";
  }
}

function isPreviewOnlyPage(): boolean {
  return document.querySelector(".sticker-preview") !== null;
}

function locatePlayerIframe(): HTMLIFrameElement | null {
  const matched = document.querySelector<HTMLIFrameElement>(PLAYER_IFRAME_SELECTOR);
  if (matched) return matched;
  const pending = document.querySelector(PLAYER_CONTAINER_IFRAME);
  return pending instanceof HTMLIFrameElement ? pending : null;
}

function iframeReady(iframe: HTMLIFrameElement): boolean {
  if (!iframe.src) return false;
  const kind = iframeSrcKind(iframe.src);
  if (kind === "signed") return true;
  if (kind === "unsigned") return isPreviewOnlyPage();
  return false;
}

export function findPlayerIframe(): HTMLIFrameElement | null {
  return document.querySelector<HTMLIFrameElement>(PLAYER_IFRAME_SELECTOR);
}

export function waitForPlayerIframe(signal?: AbortSignal): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    let observer: MutationObserver | null = null;

    const cleanup = (): void => {
      observer?.disconnect();
      observer = null;
      signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = (): void => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const scan = (): void => {
      const iframe = locatePlayerIframe();
      if (iframe && iframeReady(iframe)) {
        cleanup();
        resolve(iframe);
      }
    };

    scan();
    if (signal?.aborted) {
      onAbort();
      return;
    }

    observer = new MutationObserver(scan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
