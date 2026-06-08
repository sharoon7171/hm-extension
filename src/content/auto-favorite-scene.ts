import { findFavoriteButton, isFavoriteButtonActive } from "./scene-favorite-dom";

let observer: MutationObserver | null = null;
let fired = false;

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

function tryFire(sceneId: string): boolean {
  if (fired) return true;
  const btn = findFavoriteButton(sceneId);
  if (!btn) return false;
  fired = true;
  if (!isFavoriteButtonActive(btn)) btn.click();
  return true;
}
