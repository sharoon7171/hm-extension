const ENTRY_ID = "hotmovies-scene-page-studio-browse";
const SEPARATOR = "\u00a0\u00b7\u00a0";
const SURFACED_ANCHOR_SELECTOR = "#hotmovies-scene-heading-studio a[href^='/studios/']";
const ORIGINAL_ANCHOR_SELECTOR = 'a[data-tl="studio"][data-tid]';

let observer: MutationObserver | null = null;

function buildEntry(studioId: string): HTMLSpanElement {
  const wrap = document.createElement("span");
  wrap.id = ENTRY_ID;
  wrap.appendChild(document.createTextNode(SEPARATOR));
  const link = document.createElement("a");
  link.href = `/adult-clips/list?studio=${studioId}`;
  link.textContent = "Browse Scenes";
  wrap.appendChild(link);
  return wrap;
}

function findVisibleAnchor(): HTMLAnchorElement | null {
  return (
    document.querySelector<HTMLAnchorElement>(SURFACED_ANCHOR_SELECTOR) ||
    document.querySelector<HTMLAnchorElement>(ORIGINAL_ANCHOR_SELECTOR)
  );
}

function findStudioId(): string | null {
  const original = document.querySelector<HTMLAnchorElement>(ORIGINAL_ANCHOR_SELECTOR);
  return original?.getAttribute("data-tid") || null;
}

function tryInject(): boolean {
  document.getElementById(ENTRY_ID)?.remove();
  const studioId = findStudioId();
  const anchor = findVisibleAnchor();
  if (!studioId || !anchor) return false;
  anchor.insertAdjacentElement("afterend", buildEntry(studioId));
  return true;
}

export function showScenePageStudioLink(): void {
  if (tryInject()) {
    observer?.disconnect();
    observer = null;
    return;
  }
  if (observer) return;
  observer = new MutationObserver(() => {
    if (tryInject()) {
      observer?.disconnect();
      observer = null;
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function hideScenePageStudioLink(): void {
  observer?.disconnect();
  observer = null;
  document.getElementById(ENTRY_ID)?.remove();
}
