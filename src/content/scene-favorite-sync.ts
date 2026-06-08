import type { SceneAddRequest, SceneRemoveRequest } from "../shared/messages";
import {
  applyOptimisticAdd,
  applyOptimisticRemove,
  readScenesCache,
} from "../shared/scenes-cache";
import {
  findFavoriteButton,
  isFavoriteButtonActive,
  readSceneCanonicalHref,
  readSceneTitle,
} from "./scene-favorite-dom";

let waitObserver: MutationObserver | null = null;
let buttonObserver: MutationObserver | null = null;
let activeSceneId: string | null = null;
let observedButton: HTMLAnchorElement | null = null;
let lastObservedFavorite: boolean | null = null;

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

function syncFavoriteToStorage(favorited: boolean): void {
  if (!activeSceneId) return;
  if (favorited) sendAdd(activeSceneId);
  else sendRemove(activeSceneId);
}

function reportFavoriteState(): void {
  if (!activeSceneId || !observedButton?.isConnected) return;
  const favorited = isFavoriteButtonActive(observedButton);
  if (lastObservedFavorite === favorited) return;
  lastObservedFavorite = favorited;
  syncFavoriteToStorage(favorited);
}

async function reconcileFavoriteOnLoad(btn: HTMLAnchorElement): Promise<void> {
  if (!activeSceneId) return;
  const favorited = isFavoriteButtonActive(btn);
  lastObservedFavorite = favorited;
  const cache = await readScenesCache("favorite");
  const inCache = activeSceneId in cache.scenes;
  if (favorited === inCache) return;
  syncFavoriteToStorage(favorited);
}

function attachToButton(btn: HTMLAnchorElement): void {
  observedButton = btn;
  buttonObserver?.disconnect();
  buttonObserver = new MutationObserver(reportFavoriteState);
  buttonObserver.observe(btn, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  });
  void reconcileFavoriteOnLoad(btn);
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
  activeSceneId = null;
  observedButton = null;
  lastObservedFavorite = null;
  buttonObserver?.disconnect();
  buttonObserver = null;
  waitObserver?.disconnect();
  waitObserver = null;
}
