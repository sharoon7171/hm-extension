import type { SceneAddRequest } from "../shared/messages";
import {
  applyOptimisticAdd,
  applyOptimisticRemove,
  readScenesCache,
} from "../shared/scenes-cache";
import { clickFavoriteButton } from "./favorite-button-click";

let observer: MutationObserver | null = null;
let fired = false;

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

async function hideOnce(sceneId: string, btn: HTMLElement): Promise<void> {
  const cache = await readScenesCache("hidden");
  if (sceneId in cache.scenes) return;
  if (btn.classList.contains("active")) clickFavoriteButton(btn);
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

function tryFire(sceneId: string): boolean {
  if (fired) return true;
  const btn = document.querySelector<HTMLElement>(favoriteButtonSelector(sceneId));
  if (!btn) return false;
  fired = true;
  void hideOnce(sceneId, btn);
  return true;
}

export function enableAutoHideScene(sceneId: string): void {
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
}
