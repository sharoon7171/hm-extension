import { clickFavoriteButton } from "./favorite-button-click";
import type { SceneAddRequest, SceneRemoveRequest } from "../shared/messages";
import {
  applyOptimisticAdd,
  applyOptimisticRemove,
  readScenesCache,
  watchScenesCache,
  type ScenesCache,
} from "../shared/scenes-cache";
import {
  findFavoriteButton,
  isFavoriteButtonActive,
  readSceneCanonicalHref,
  readSceneTitle,
} from "./scene-favorite-dom";

let waitObserver: MutationObserver | null = null;
let buttonObserver: MutationObserver | null = null;
let cacheUnsubscribe: (() => void) | null = null;
let activeSceneId: string | null = null;
let observedButton: HTMLAnchorElement | null = null;
let lastObservedFavorite: boolean | null = null;
let applyingCache = false;

function sendAdd(sceneId: string): void {
  const scene = {
    sceneId,
    title: readSceneTitle(),
    href: readSceneCanonicalHref(),
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

function syncDomToStorage(favorited: boolean): void {
  if (!activeSceneId) return;
  if (favorited) sendAdd(activeSceneId);
  else sendRemove(activeSceneId);
}

function reportDomState(): void {
  if (applyingCache || !activeSceneId || !observedButton?.isConnected) return;
  const favorited = isFavoriteButtonActive(observedButton);
  if (lastObservedFavorite === favorited) return;
  lastObservedFavorite = favorited;
  syncDomToStorage(favorited);
}

function applyFavoriteCache(cache: ScenesCache): void {
  if (!activeSceneId) return;
  const inCache = activeSceneId in cache.scenes;
  const btn = findFavoriteButton(activeSceneId);
  if (!btn) return;
  const dom = isFavoriteButtonActive(btn);
  if (dom === inCache) {
    lastObservedFavorite = dom;
    return;
  }
  applyingCache = true;
  try {
    if (inCache && !dom) btn.click();
    else if (!inCache && dom) clickFavoriteButton(btn);
    lastObservedFavorite = inCache;
  } finally {
    applyingCache = false;
  }
}

function attachToButton(btn: HTMLAnchorElement): void {
  observedButton = btn;
  buttonObserver?.disconnect();
  buttonObserver = new MutationObserver(reportDomState);
  buttonObserver.observe(btn, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  });
  reportDomState();
}

function ensureButtonObserver(sceneId: string): void {
  const existing = findFavoriteButton(sceneId);
  if (existing) {
    attachToButton(existing);
    return;
  }
  if (waitObserver) return;
  waitObserver = new MutationObserver(() => {
    const btn = findFavoriteButton(sceneId);
    if (!btn) return;
    waitObserver?.disconnect();
    waitObserver = null;
    attachToButton(btn);
  });
  waitObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function startSceneFavoriteSync(sceneId: string): void {
  stopSceneFavoriteSync();
  activeSceneId = sceneId;
  lastObservedFavorite = null;
  applyingCache = false;
  void readScenesCache("favorite").then(cache => {
    applyFavoriteCache(cache);
    ensureButtonObserver(sceneId);
  });
  cacheUnsubscribe = watchScenesCache("favorite", cache => {
    applyFavoriteCache(cache);
  });
}

export function stopSceneFavoriteSync(): void {
  cacheUnsubscribe?.();
  cacheUnsubscribe = null;
  activeSceneId = null;
  observedButton = null;
  lastObservedFavorite = null;
  applyingCache = false;
  buttonObserver?.disconnect();
  buttonObserver = null;
  waitObserver?.disconnect();
  waitObserver = null;
}
