import type { SceneAddRequest, SceneRemoveRequest } from "../shared/messages";
import {
  addSceneToCache,
  readScenesCache,
  removeSceneFromCache,
} from "../shared/scenes-cache";
import {
  findFavoriteButton,
  readFavoriteButtonActive,
  readSceneCanonicalHref,
  readSceneTitle,
} from "./scene-favorite-dom";

const SETTLE_MS = 400;

let waitObserver: MutationObserver | null = null;
let buttonObserver: MutationObserver | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let activeSceneId: string | null = null;
let observedButton: HTMLAnchorElement | null = null;
let lastObservedFavorite: boolean | null = null;
let onFavoriteClick: ((event: Event) => void) | null = null;
let onVisibilityChange: (() => void) | null = null;

function scenePayload(sceneId: string) {
  return {
    sceneId,
    title: readSceneTitle(),
    href: readSceneCanonicalHref(),
  };
}

function sendAdd(scene: { sceneId: string; title: string; href: string }): void {
  const message: SceneAddRequest = {
    type: "sceneAdd",
    kind: "favoriteScenes",
    ...scene,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function sendRemove(sceneId: string): void {
  const message: SceneRemoveRequest = {
    type: "sceneRemove",
    kind: "favoriteScenes",
    sceneId,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function syncFavoriteToCache(favorited: boolean): void {
  if (!activeSceneId) return;
  const scene = scenePayload(activeSceneId);
  if (favorited) {
    void addSceneToCache("favorite", scene);
    void removeSceneFromCache("hidden", activeSceneId);
    sendAdd(scene);
    return;
  }
  void removeSceneFromCache("favorite", activeSceneId);
  sendRemove(activeSceneId);
}

function readFavorite(): boolean | null {
  if (!observedButton?.isConnected) return null;
  return readFavoriteButtonActive(observedButton);
}

async function pushFavoriteIfNeeded(favorited: boolean): Promise<void> {
  if (!activeSceneId) return;
  const favoriteCache = await readScenesCache("favorite");
  const inFavorite = activeSceneId in favoriteCache.scenes;
  if (favorited === inFavorite) return;
  syncFavoriteToCache(favorited);
}

async function reconcileFavoriteDom(): Promise<void> {
  const favorited = readFavorite();
  if (favorited === null) return;
  await pushFavoriteIfNeeded(favorited);
}

function settleFavoriteState(): void {
  if (!activeSceneId) return;
  const favorited = readFavorite();
  if (favorited === null) return;
  if (lastObservedFavorite === favorited) return;
  lastObservedFavorite = favorited;
  void reconcileFavoriteDom();
}

function onButtonUpdated(): void {
  const favorited = readFavorite();
  if (favorited !== null && lastObservedFavorite === null) {
    lastObservedFavorite = favorited;
    void reconcileFavoriteDom();
    return;
  }
  scheduleSettle();
}

function scheduleSettle(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    settleFavoriteState();
  }, SETTLE_MS);
}

function detachButton(): void {
  if (observedButton && onFavoriteClick) {
    observedButton.removeEventListener("click", onFavoriteClick, true);
  }
  onFavoriteClick = null;
  buttonObserver?.disconnect();
  buttonObserver = null;
  observedButton = null;
  if (onVisibilityChange) {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    onVisibilityChange = null;
  }
}

function attachToButton(btn: HTMLAnchorElement): void {
  detachButton();
  observedButton = btn;
  lastObservedFavorite = null;
  onFavoriteClick = () => scheduleSettle();
  btn.addEventListener("click", onFavoriteClick, true);
  buttonObserver = new MutationObserver(onButtonUpdated);
  buttonObserver.observe(btn, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  });
  onVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    lastObservedFavorite = null;
    onButtonUpdated();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  onButtonUpdated();
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
  ensureButtonObserver(sceneId);
}

export function stopSceneFavoriteSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = null;
  detachButton();
  activeSceneId = null;
  lastObservedFavorite = null;
  waitObserver?.disconnect();
  waitObserver = null;
}
