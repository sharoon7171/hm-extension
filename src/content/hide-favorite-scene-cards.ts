import {
  readFavoriteScenesCache,
  watchFavoriteScenesCache,
  type FavoriteScenesCache,
} from "../shared/scenes-cache";

const HIDE_ATTR = "data-hotmovies-hide-favorited";
const STYLE_ID = "hotmovies-ext-hide-favorited-style";
const COLUMN_RE = /\bcol(?:-(?:xs|sm|md|lg|xl|xxl))?-\d+\b/;
const SCENE_HREF_RE = /\/adult-clips\/(\d+)/;

let hiddenIds: Set<string> = new Set();
let storageUnsubscribe: (() => void) | null = null;
let domObserver: MutationObserver | null = null;
let scheduled = false;

export function startHideFavoritedScenes(): void {
  if (storageUnsubscribe) return;
  injectStyle();
  storageUnsubscribe = watchFavoriteScenesCache(applyCache);
  void readFavoriteScenesCache().then(applyCache);
  attachDomObserver();
}

export function stopHideFavoritedScenes(): void {
  storageUnsubscribe?.();
  storageUnsubscribe = null;
  domObserver?.disconnect();
  domObserver = null;
  hiddenIds = new Set();
  document.getElementById(STYLE_ID)?.remove();
  document
    .querySelectorAll<HTMLElement>(`[${HIDE_ATTR}="true"]`)
    .forEach(el => el.removeAttribute(HIDE_ATTR));
}

function applyCache(cache: FavoriteScenesCache): void {
  hiddenIds = new Set(Object.keys(cache.scenes));
  refreshAllCards();
}

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `[${HIDE_ATTR}="true"] { display: none !important; }`;
  (document.head ?? document.documentElement).appendChild(style);
}

function attachDomObserver(): void {
  if (domObserver) return;
  domObserver = new MutationObserver(scheduleRefresh);
  const target = document.body ?? document.documentElement;
  domObserver.observe(target, { childList: true, subtree: true });
}

function scheduleRefresh(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    refreshAllCards();
  });
}

function refreshAllCards(): void {
  const gridCards = document.querySelectorAll<HTMLElement>("[data-scene-id]");
  for (const el of gridCards) {
    const id = el.dataset.sceneId;
    if (!id) continue;
    const root = closestColumn(el) ?? el;
    applyHide(root, hiddenIds.has(id));
  }
  const movieScenes = document.querySelectorAll<HTMLElement>(".movie__scenes__scene");
  for (const el of movieScenes) {
    const id = sceneIdFromMovieScene(el);
    if (!id) continue;
    applyHide(el, hiddenIds.has(id));
  }
}

function applyHide(el: HTMLElement, hide: boolean): void {
  if (hide) {
    if (el.getAttribute(HIDE_ATTR) !== "true") el.setAttribute(HIDE_ATTR, "true");
    return;
  }
  if (el.hasAttribute(HIDE_ATTR)) el.removeAttribute(HIDE_ATTR);
}

function closestColumn(el: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el.parentElement;
  while (cur) {
    const cls = typeof cur.className === "string" ? cur.className : "";
    if (cls && COLUMN_RE.test(cls)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function sceneIdFromMovieScene(el: HTMLElement): string | null {
  const link = el.querySelector<HTMLAnchorElement>("a[href*='/adult-clips/']");
  if (link) {
    const href = link.getAttribute("href") ?? "";
    const match = href.match(SCENE_HREF_RE);
    if (match) return match[1];
  }
  const carousel = el.querySelector<HTMLElement>("[id^='carousel_scene_']");
  if (carousel) return carousel.id.slice("carousel_scene_".length);
  const toggle = el.querySelector<HTMLElement>("[id^='sceneToggle']");
  if (toggle) return toggle.id.slice("sceneToggle".length);
  const details = el.querySelector<HTMLElement>("[id^='sceneDetails']");
  if (details) return details.id.slice("sceneDetails".length);
  return null;
}
