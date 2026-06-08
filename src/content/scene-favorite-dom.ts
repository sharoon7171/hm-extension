export function favoriteButtonSelector(sceneId: string): string {
  return `a[data-ta="favorite"][data-tl="scene"][data-tid="${CSS.escape(sceneId)}"]`;
}

export function findFavoriteButton(sceneId: string): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>(favoriteButtonSelector(sceneId));
}

export function readFavoriteButtonActive(
  btn: HTMLAnchorElement,
): boolean | null {
  if (btn.classList.contains("active")) return true;
  const icon = btn.querySelector("i");
  if (!icon) return null;
  if (icon.classList.contains("fa-heart-o")) return false;
  if (icon.classList.contains("fa-heart")) return true;
  return null;
}

export function isFavoriteButtonActive(btn: HTMLAnchorElement): boolean {
  return readFavoriteButtonActive(btn) === true;
}

export function readSceneTitle(): string {
  const heading = document.querySelector("h1.clip-title, h1#clip-title, h1.clip-name");
  const fromHeading = heading?.textContent?.trim();
  if (fromHeading) return fromHeading;
  const raw = document.title || "";
  return raw.replace(/\s*-\s*HotMovies\s*$/i, "").trim() || raw.trim();
}

export function readSceneCanonicalHref(): string {
  return `${location.origin}${location.pathname}`;
}
