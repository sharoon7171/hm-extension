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

function favoriteButtonSelector(sceneId: string): string {
  return `a[data-ta="favorite"][data-tl="scene"][data-tid="${CSS.escape(sceneId)}"]`;
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

function sendHiddenAdd(sceneId: string): void {
  const scene = {
    sceneId,
    title: readSceneTitle(),
    href: readCanonicalHref(),
  };
  void applyOptimisticAdd("hidden", scene);
  void applyOptimisticRemove("favorite", sceneId);
  const message: SceneAddRequest = {
    type: "sceneAdd",
    kind: "hiddenScenes",
    ...scene,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function flushPendingHide(): void {
  if (!pendingSceneId) return;
  sendHiddenAdd(pendingSceneId);
}

function onAutoHideVisibility(): void {
  if (document.visibilityState !== "hidden") return;
  flushPendingHide();
}

function ensureLifecycleListeners(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  window.addEventListener("pagehide", flushPendingHide, true);
  document.addEventListener("visibilitychange", onAutoHideVisibility, true);
}

function removeLifecycleListeners(): void {
  if (!lifecycleInstalled) return;
  lifecycleInstalled = false;
  window.removeEventListener("pagehide", flushPendingHide, true);
  document.removeEventListener("visibilitychange", onAutoHideVisibility, true);
}

async function hideOnce(sceneId: string): Promise<void> {
  pendingSceneId = sceneId;
  const cache = await readScenesCache("hidden");
  if (sceneId in cache.scenes) {
    pendingSceneId = null;
    return;
  }
  sendHiddenAdd(sceneId);
  pendingSceneId = null;
}

function tryFire(sceneId: string): boolean {
  if (fired) return true;
  const btn = document.querySelector<HTMLElement>(favoriteButtonSelector(sceneId));
  if (!btn) return false;
  fired = true;
  void hideOnce(sceneId);
  return true;
}

export function enableAutoHideScene(sceneId: string): void {
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

export function disableAutoHideScene(): void {
  observer?.disconnect();
  observer = null;
  fired = false;
  pendingSceneId = null;
  removeLifecycleListeners();
}
