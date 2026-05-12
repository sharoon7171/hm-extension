import type { SceneAddRequest, SceneRemoveRequest } from "../shared/messages";
import {
  applyOptimisticAdd,
  applyOptimisticRemove,
  readScenesCache,
} from "../shared/scenes-cache";

let waitObserver: MutationObserver | null = null;
let buttonObserver: MutationObserver | null = null;
let favoriteSyncAbort: AbortController | null = null;
let activeSceneId: string | null = null;
let mirroredFavorite: boolean | null = null;
let domFavoritePushRafId: number | null = null;

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
  const scene = {
    sceneId,
    title: readSceneTitle(),
    href: readCanonicalHref(),
  };
  void applyOptimisticAdd("favorite", scene);
  void applyOptimisticRemove("hidden", sceneId);
  const message: SceneAddRequest = {
    type: "sceneAdd",
    kind: "favoriteScenes",
    ...scene,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function sendRemove(sceneId: string): void {
  void applyOptimisticRemove("favorite", sceneId);
  const message: SceneRemoveRequest = {
    type: "sceneRemove",
    kind: "favoriteScenes",
    sceneId,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

async function reconcileFavoriteAgainstCache(sceneId: string): Promise<void> {
  if (activeSceneId !== sceneId) return;
  const btn = findButton(sceneId);
  if (!btn) return;
  const dom = isFavorited(btn);
  const cache = await readScenesCache("favorite");
  const inCache = sceneId in cache.scenes;
  if (dom === inCache && mirroredFavorite === dom) return;
  if (dom === inCache) {
    mirroredFavorite = dom;
    return;
  }
  mirroredFavorite = dom;
  if (dom) sendAdd(sceneId);
  else sendRemove(sceneId);
}

function scheduleFavoriteAgainstCachePasses(sceneId: string): void {
  if (activeSceneId !== sceneId) return;
  void reconcileFavoriteAgainstCache(sceneId);
  queueMicrotask(() => {
    void reconcileFavoriteAgainstCache(sceneId);
  });
}

function enqueueFavoriteDomPush(sceneId: string): void {
  if (domFavoritePushRafId !== null) return;
  domFavoritePushRafId = window.requestAnimationFrame(() => {
    domFavoritePushRafId = null;
    pushFavoriteFromDom(sceneId);
  });
}

function pushFavoriteFromDom(sceneId: string): void {
  const btn = findButton(sceneId);
  if (!btn) return;
  const dom = isFavorited(btn);
  if (mirroredFavorite === null) {
    mirroredFavorite = dom;
    if (dom) sendAdd(sceneId);
    return;
  }
  if (mirroredFavorite === dom) return;
  mirroredFavorite = dom;
  if (dom) sendAdd(sceneId);
  else sendRemove(sceneId);
}

function onSceneHeartToggleCapture(event: Event): void {
  const sceneId = activeSceneId;
  if (!sceneId) return;
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest(
    "a[data-ta='favorite'][data-tl='scene'][data-tid]",
  );
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.dataset.tid !== sceneId) return;
  const wasFavorited = isFavorited(anchor);
  const intentFavorited = !wasFavorited;
  mirroredFavorite = intentFavorited;
  if (intentFavorited) sendAdd(sceneId);
  else sendRemove(sceneId);
}

function installFavoriteListeners(sceneId: string): void {
  favoriteSyncAbort?.abort();
  favoriteSyncAbort = new AbortController();
  const signal = favoriteSyncAbort.signal;
  document.addEventListener("click", onSceneHeartToggleCapture, { capture: true, signal });
  if (document.readyState !== "complete") {
    window.addEventListener(
      "load",
      () => scheduleFavoriteAgainstCachePasses(sceneId),
      { capture: true, once: true, signal },
    );
  }
}

function attachToButton(sceneId: string, btn: HTMLAnchorElement): void {
  scheduleFavoriteAgainstCachePasses(sceneId);
  buttonObserver = new MutationObserver(() => enqueueFavoriteDomPush(sceneId));
  buttonObserver.observe(btn, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  });
}

export function startSceneFavoriteSync(sceneId: string): void {
  stopSceneFavoriteSync();
  activeSceneId = sceneId;
  mirroredFavorite = null;
  installFavoriteListeners(sceneId);
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
    mirroredFavorite = null;
    attachToButton(sceneId, btn);
  });
  waitObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function stopSceneFavoriteSync(): void {
  activeSceneId = null;
  mirroredFavorite = null;
  favoriteSyncAbort?.abort();
  favoriteSyncAbort = null;
  if (domFavoritePushRafId !== null) {
    window.cancelAnimationFrame(domFavoritePushRafId);
    domFavoritePushRafId = null;
  }
  buttonObserver?.disconnect();
  buttonObserver = null;
  waitObserver?.disconnect();
  waitObserver = null;
}
