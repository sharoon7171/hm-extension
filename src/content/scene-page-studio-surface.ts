const SURFACED_ID = "hotmovies-scene-heading-studio";
const ORIGINAL_ANCHOR_SELECTOR = 'a[data-tl="studio"][data-tid]';
const HEADING_LEFT_SELECTOR = ".clip-meta__heading > div:first-child";

let observer: MutationObserver | null = null;

function buildSurfacedRow(name: string, href: string): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.id = SURFACED_ID;
  const strong = document.createElement("strong");
  strong.textContent = "Studio: ";
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.textContent = name;
  wrap.appendChild(strong);
  wrap.appendChild(document.createTextNode(" "));
  wrap.appendChild(anchor);
  return wrap;
}

function tryApply(): boolean {
  if (document.getElementById(SURFACED_ID)) return true;
  const original = document.querySelector<HTMLAnchorElement>(ORIGINAL_ANCHOR_SELECTOR);
  const headingLeft = document.querySelector<HTMLElement>(HEADING_LEFT_SELECTOR);
  if (!original || !headingLeft) return false;
  const name = original.textContent?.trim() || "Studio";
  const href = original.getAttribute("href") || "";
  headingLeft.appendChild(buildSurfacedRow(name, href));
  const li = original.closest<HTMLLIElement>("li");
  if (li) li.style.display = "none";
  return true;
}

export function showScenePageStudioSurface(): void {
  if (tryApply()) {
    observer?.disconnect();
    observer = null;
    return;
  }
  if (observer) return;
  observer = new MutationObserver(() => {
    if (tryApply()) {
      observer?.disconnect();
      observer = null;
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function hideScenePageStudioSurface(): void {
  observer?.disconnect();
  observer = null;
  document.getElementById(SURFACED_ID)?.remove();
  const original = document.querySelector<HTMLAnchorElement>(ORIGINAL_ANCHOR_SELECTOR);
  const li = original?.closest<HTMLLIElement>("li");
  if (li) li.style.display = "";
}
