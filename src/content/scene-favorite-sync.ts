import { clickFavoriteButton } from "./favorite-button-click";
import type { SceneAddRequest, SceneRemoveRequest } from "../shared/messages";
import {
  applyOptimisticAdd,
  applyOptimisticRemove,
  readScenesCache,
  watchScenesCache,
  type ScenesCache,
} from "../shared/scenes-cache";

let waitObserver: MutationObserver | null = null;
let buttonObserver: MutationObserver | null = null;
let cacheUnsubscribe: (() => void) | null = null;
let favoriteSyncAbort: AbortController | null = null;
let activeSceneId: string | null = null;
let mirroredFavorite: boolean | null = null;
let syncingFromCache = false;
let domFavoritePushRafId: number | null = null;
let lifecycleInstalled = false;

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

function applyFavoriteCache(cache: ScenesCache): void {
  if (!activeSceneId) return;
  const sceneId = activeSceneId;
  const inCache = sceneId in cache.scenes;
  const btn = findButton(sceneId);
  if (!btn) {
    if (mirroredFavorite === null) mirroredFavorite = inCache;
    return;
  }
  const dom = isFavorited(btn);
  if (dom === inCache) {
    mirroredFavorite = dom;
    return;
  }
  if (mirroredFavorite === null) {
    if (inCache && !dom) {
      syncingFromCache = true;
      try {
        btn.click();
        mirroredFavorite = true;
      } finally {
        syncingFromCache = false;
      }
      return;
    }
    if (!inCache && dom) {
      mirroredFavorite = true;
      sendAdd(sceneId);
      return;
    }
    mirroredFavorite = inCache;
    return;
  }
  syncingFromCache = true;
  try {
    if (inCache && !dom) btn.click();
    else if (!inCache && dom) clickFavoriteButton(btn);
    mirroredFavorite = inCache;
  } finally {
    syncingFromCache = false;
  }
}

async function reconcileFavoriteAgainstCache(sceneId: string): Promise<void> {
  if (activeSceneId !== sceneId || syncingFromCache) return;
  const btn = findButton(sceneId);
  if (!btn) return;
  const dom = isFavorited(btn);
  const cache = await readScenesCache("favorite");
  const inCache = sceneId in cache.scenes;
  if (dom === inCache) {
    mirroredFavorite = dom;
    return;
  }
  if (dom && !inCache) {
    mirroredFavorite = true;
    sendAdd(sceneId);
  }
}

function scheduleFavoriteAgainstCachePasses(sceneId: string): void {
  if (activeSceneId !== sceneId) return;
  void reconcileFavoriteAgainstCache(sceneId);
  queueMicrotask(() => {
    void reconcileFavoriteAgainstCache(sceneId);
  });
}

function enqueueFavoriteDomPush(sceneId: string): void {
  if (syncingFromCache || domFavoritePushRafId !== null) return;
  domFavoritePushRafId = window.requestAnimationFrame(() => {
    domFavoritePushRafId = null;
    pushFavoriteFromDom(sceneId);
  });
}

function pushFavoriteFromDom(sceneId: string): void {
  if (syncingFromCache) return;
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

function flushFavoriteMirrorFromPage(): void {
  if (!activeSceneId || syncingFromCache) return;
  const sceneId = activeSceneId;
  if (mirroredFavorite === null) {
    pushFavoriteFromDom(sceneId);
    return;
  }
  if (mirroredFavorite) sendAdd(sceneId);
  else sendRemove(sceneId);
}

function onFavoriteLifecycleFlush(): void {
  flushFavoriteMirrorFromPage();
}

function ensureLifecycleListeners(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  window.addEventListener("pagehide", onFavoriteLifecycleFlush, true);
  document.addEventListener("visibilitychange", onFavoriteVisibility, true);
}

function removeLifecycleListeners(): void {
  if (!lifecycleInstalled) return;
  lifecycleInstalled = false;
  window.removeEventListener("pagehide", onFavoriteLifecycleFlush, true);
  document.removeEventListener("visibilitychange", onFavoriteVisibility, true);
}

function onFavoriteVisibility(): void {
  if (document.visibilityState !== "hidden") return;
  onFavoriteLifecycleFlush();
}

function onSceneHeartToggleCapture(event: Event): void {
  if (syncingFromCache) return;
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
  syncingFromCache = false;
  installFavoriteListeners(sceneId);
  ensureLifecycleListeners();
  void readScenesCache("favorite").then(applyFavoriteCache);
  cacheUnsubscribe = watchScenesCache("favorite", applyFavoriteCache);
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
  cacheUnsubscribe?.();
  cacheUnsubscribe = null;
  activeSceneId = null;
  mirroredFavorite = null;
  syncingFromCache = false;
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
  removeLifecycleListeners();
}
