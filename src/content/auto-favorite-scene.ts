import type { SceneAddRequest } from "../shared/messages";
import {
  applyOptimisticAdd,
  applyOptimisticRemove,
  readScenesCache,
} from "../shared/scenes-cache";

let observer: MutationObserver | null = null;
let fired = false;
let pendingSceneId: string | null = null;
let lifecycleInstalled = false;

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

function sendFavoriteAdd(sceneId: string): void {
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

function flushPendingFavorite(): void {
  if (!pendingSceneId) return;
  sendFavoriteAdd(pendingSceneId);
}

function onAutoFavoriteVisibility(): void {
  if (document.visibilityState !== "hidden") return;
  flushPendingFavorite();
}

function ensureLifecycleListeners(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  window.addEventListener("pagehide", flushPendingFavorite, true);
  document.addEventListener("visibilitychange", onAutoFavoriteVisibility, true);
}

function removeLifecycleListeners(): void {
  if (!lifecycleInstalled) return;
  lifecycleInstalled = false;
  window.removeEventListener("pagehide", flushPendingFavorite, true);
  document.removeEventListener("visibilitychange", onAutoFavoriteVisibility, true);
}

async function favoriteOnce(sceneId: string): Promise<void> {
  pendingSceneId = sceneId;
  const cache = await readScenesCache("favorite");
  if (sceneId in cache.scenes) {
    pendingSceneId = null;
    return;
  }
  sendFavoriteAdd(sceneId);
  pendingSceneId = null;
}

function tryFire(sceneId: string): boolean {
  if (fired) return true;
  const selector = `a[data-ta="favorite"][data-tl="scene"][data-tid="${CSS.escape(sceneId)}"]`;
  const btn = document.querySelector<HTMLElement>(selector);
  if (!btn) return false;
  fired = true;
  void favoriteOnce(sceneId);
  return true;
}

export function enableAutoFavoriteScene(sceneId: string): void {
  ensureLifecycleListeners();
  if (tryFire(sceneId)) {
    observer?.disconnect();
    observer = null;
    return;
  }
  if (observer) return;
  observer = new MutationObserver(() => {
    if (tryFire(sceneId)) {
      observer?.disconnect();
      observer = null;
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function disableAutoFavoriteScene(): void {
  observer?.disconnect();
  observer = null;
  fired = false;
  pendingSceneId = null;
  removeLifecycleListeners();
}
