import type {
  FavoriteSceneAddRequest,
  FavoriteSceneRemoveRequest,
} from "../shared/messages";

let waitObserver: MutationObserver | null = null;
let buttonObserver: MutationObserver | null = null;
let lastObserved: boolean | null = null;
let initialResolved = false;

function buttonSelector(sceneId: string): string {
  return `a[data-ta="favorite"][data-tl="scene"][data-tid="${CSS.escape(sceneId)}"]`;
}

function findButton(sceneId: string): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>(buttonSelector(sceneId));
}

function isFavorited(btn: HTMLAnchorElement): boolean {
  if (btn.classList.contains("active")) return true;
  const icon = btn.querySelector("i");
  if (!icon) return false;
  if (icon.classList.contains("fa-heart-o")) return false;
  return icon.classList.contains("fa-heart");
}

function readSceneTitle(): string {
  const heading = document.querySelector("h1.clip-title, h1#clip-title, h1.clip-name");
  const fromHeading = heading?.textContent?.trim();
  if (fromHeading) return fromHeading;
  const raw = document.title || "";
  return raw.replace(/\s*-\s*HotMovies\s*$/i, "").trim() || raw.trim();
}

function readCanonicalHref(): string {
  return `${location.origin}${location.pathname}`;
}

function sendAdd(sceneId: string): void {
  const message: FavoriteSceneAddRequest = {
    type: "favoriteSceneAdd",
    sceneId,
    title: readSceneTitle(),
    href: readCanonicalHref(),
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function sendRemove(sceneId: string): void {
  const message: FavoriteSceneRemoveRequest = {
    type: "favoriteSceneRemove",
    sceneId,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function reactToState(sceneId: string, btn: HTMLAnchorElement): void {
  const current = isFavorited(btn);
  if (current === lastObserved) return;
  const wasInitial = !initialResolved;
  lastObserved = current;
  initialResolved = true;
  if (wasInitial) {
    if (current) sendAdd(sceneId);
    return;
  }
  if (current) sendAdd(sceneId);
  else sendRemove(sceneId);
}

function attachToButton(sceneId: string, btn: HTMLAnchorElement): void {
  reactToState(sceneId, btn);
  buttonObserver = new MutationObserver(() => reactToState(sceneId, btn));
  buttonObserver.observe(btn, { attributes: true, attributeFilter: ["class"] });
}

export function startSceneFavoriteSync(sceneId: string): void {
  stopSceneFavoriteSync();
  const existing = findButton(sceneId);
  if (existing) {
    attachToButton(sceneId, existing);
    return;
  }
  waitObserver = new MutationObserver(() => {
    const btn = findButton(sceneId);
    if (!btn) return;
    waitObserver?.disconnect();
    waitObserver = null;
    attachToButton(sceneId, btn);
  });
  waitObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function stopSceneFavoriteSync(): void {
  buttonObserver?.disconnect();
  buttonObserver = null;
  waitObserver?.disconnect();
  waitObserver = null;
  lastObserved = null;
  initialResolved = false;
}
