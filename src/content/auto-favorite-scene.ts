import { readScenesCache } from "../shared/scenes-cache";
import { clickFavoriteButton } from "./favorite-button-click";

let observer: MutationObserver | null = null;
let fired = false;

function isFavorited(btn: HTMLElement): boolean {
  if (btn.classList.contains("active")) return true;
  const icon = btn.querySelector("i");
  if (!icon) return false;
  if (icon.classList.contains("fa-heart-o")) return false;
  return icon.classList.contains("fa-heart");
}

async function favoriteOnce(sceneId: string, btn: HTMLElement): Promise<void> {
  const cache = await readScenesCache("favorite");
  if (sceneId in cache.scenes) return;
  if (!isFavorited(btn)) clickFavoriteButton(btn);
}

function tryFire(sceneId: string): boolean {
  if (fired) return true;
  const selector = `a[data-ta="favorite"][data-tl="scene"][data-tid="${CSS.escape(sceneId)}"]`;
  const btn = document.querySelector<HTMLElement>(selector);
  if (!btn) return false;
  fired = true;
  void favoriteOnce(sceneId, btn);
  return true;
}

export function enableAutoFavoriteScene(sceneId: string): void {
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
}
