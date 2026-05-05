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

function tryFire(starId: string): boolean {
  if (fired) return true;
  const selector = `a[data-ta="favorite"][data-tl="performer"][data-tid="${CSS.escape(starId)}"]`;
  const btn = document.querySelector<HTMLElement>(selector);
  if (!btn) return false;
  if (!isFavorited(btn)) clickFavoriteButton(btn);
  fired = true;
  return true;
}

export function enableAutoFavoriteStar(starId: string): void {
  if (tryFire(starId)) {
    observer?.disconnect();
    observer = null;
    return;
  }
  if (observer) return;
  observer = new MutationObserver(() => {
    if (tryFire(starId)) {
      observer?.disconnect();
      observer = null;
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function disableAutoFavoriteStar(): void {
  observer?.disconnect();
  observer = null;
}
