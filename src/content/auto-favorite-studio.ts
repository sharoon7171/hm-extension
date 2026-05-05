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

function tryFire(studioId: string): boolean {
  if (fired) return true;
  const selector = `a[data-ta="favorite"][data-tl="studio"][data-tid="${CSS.escape(studioId)}"]`;
  const btn = document.querySelector<HTMLElement>(selector);
  if (!btn) return false;
  if (!isFavorited(btn)) clickFavoriteButton(btn);
  fired = true;
  return true;
}

export function enableAutoFavoriteStudio(studioId: string): void {
  if (tryFire(studioId)) {
    observer?.disconnect();
    observer = null;
    return;
  }
  if (observer) return;
  observer = new MutationObserver(() => {
    if (tryFire(studioId)) {
      observer?.disconnect();
      observer = null;
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function disableAutoFavoriteStudio(): void {
  observer?.disconnect();
  observer = null;
}
