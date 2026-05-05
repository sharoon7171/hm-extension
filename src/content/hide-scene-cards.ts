import {
  readScenesCache,
  watchScenesCache,
  type SceneCacheKind,
  type ScenesCache,
} from "../shared/scenes-cache";

const HIDE_ATTR = "data-hotmovies-hide-card";
const STYLE_ID = "hotmovies-ext-hide-card-style";
const COLUMN_RE = /\bcol(?:-(?:xs|sm|md|lg|xl|xxl))?-\d+\b/;
const SCENE_HREF_RE = /\/adult-clips\/(\d+)/;

const ids: Record<SceneCacheKind, Set<string>> = {
  favorite: new Set(),
  hidden: new Set(),
};

const enabled: Record<SceneCacheKind, boolean> = {
  favorite: false,
  hidden: false,
};

const cacheUnsubscribe: Partial<Record<SceneCacheKind, () => void>> = {};
let domObserver: MutationObserver | null = null;
let scheduled = false;
let started = false;

export function setHideCardsConfig(config: { favorite: boolean; hidden: boolean }): void {
  enabled.favorite = config.favorite;
  enabled.hidden = config.hidden;
  if (!enabled.favorite && !enabled.hidden) {
    teardown();
    return;
  }
  ensureStarted();
  syncSubscription("favorite", config.favorite);
  syncSubscription("hidden", config.hidden);
  refreshAllCards();
}

function teardown(): void {
  if (!started) return;
  started = false;
  for (const kind of ["favorite", "hidden"] as const) {
    cacheUnsubscribe[kind]?.();
    cacheUnsubscribe[kind] = undefined;
    ids[kind] = new Set();
  }
  domObserver?.disconnect();
  domObserver = null;
  document.getElementById(STYLE_ID)?.remove();
  document
    .querySelectorAll<HTMLElement>(`[${HIDE_ATTR}="true"]`)
    .forEach(el => el.removeAttribute(HIDE_ATTR));
}

function ensureStarted(): void {
  if (started) return;
  started = true;
  injectStyle();
  attachDomObserver();
}

function syncSubscription(kind: SceneCacheKind, on: boolean): void {
  if (on && !cacheUnsubscribe[kind]) {
    cacheUnsubscribe[kind] = watchScenesCache(kind, cache => applyCache(kind, cache));
    void readScenesCache(kind).then(cache => applyCache(kind, cache));
    return;
  }
  if (!on && cacheUnsubscribe[kind]) {
    cacheUnsubscribe[kind]?.();
    cacheUnsubscribe[kind] = undefined;
    ids[kind] = new Set();
  }
}

function applyCache(kind: SceneCacheKind, cache: ScenesCache): void {
  ids[kind] = new Set(Object.keys(cache.scenes));
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

function shouldHide(id: string): boolean {
  if (enabled.favorite && ids.favorite.has(id)) return true;
  if (enabled.hidden && ids.hidden.has(id)) return true;
  return false;
}

function refreshAllCards(): void {
  if (!started) return;
  const gridCards = document.querySelectorAll<HTMLElement>("[data-scene-id]");
  for (const el of gridCards) {
    const id = el.dataset.sceneId;
    if (!id) continue;
    const root = closestColumn(el) ?? el;
    applyHide(root, shouldHide(id));
  }
  const movieScenes = document.querySelectorAll<HTMLElement>(".movie__scenes__scene");
  for (const el of movieScenes) {
    const id = sceneIdFromMovieScene(el);
    if (!id) continue;
    applyHide(el, shouldHide(id));
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
