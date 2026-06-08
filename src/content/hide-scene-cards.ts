import {
  readScenesCache,
  watchScenesCache,
  type SceneCacheKind,
  type ScenesCache,
} from "../shared/scenes-cache";
import { matchFavoriteClipsPage } from "./url-patterns";

const HIDE_ATTR = "data-hotmovies-hide-card";
const STYLE_ID = "hotmovies-ext-hide-card-style";
const COLUMN_RE = /\bcol(?:-(?:xs|sm|md|lg|xl|xxl))?-\d+\b/;
const SCENE_CLIP_HREF_RE =
  /\/(?:adult-clips\/(\d+)|(\d+)\/[^/?#]+-porn-video\.html)(?:[?#]|$)/i;
const CARD_ROOT_RE =
  /\b(?:grid|product|scene|clip|card|thumb|item|tile|box|result)\b/i;

const enabled: Record<SceneCacheKind, boolean> = {
  favorite: false,
  hidden: false,
};

const subscribed: Record<SceneCacheKind, boolean> = {
  favorite: false,
  hidden: false,
};

const cacheUnsubscribe: Partial<Record<SceneCacheKind, () => void>> = {};
let favoriteStorage: ScenesCache | null = null;
let hiddenStorage: ScenesCache | null = null;
let domObserver: MutationObserver | null = null;
let scheduled = false;
let started = false;
let lifecycleInstalled = false;

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
  removeLifecycleListeners();
  for (const kind of ["favorite", "hidden"] as const) {
    cacheUnsubscribe[kind]?.();
    cacheUnsubscribe[kind] = undefined;
    subscribed[kind] = false;
  }
  favoriteStorage = null;
  hiddenStorage = null;
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
  ensureLifecycleListeners();
}

function syncSubscription(kind: SceneCacheKind, on: boolean): void {
  if (on && !cacheUnsubscribe[kind]) {
    subscribed[kind] = true;
    cacheUnsubscribe[kind] = watchScenesCache(kind, cache => {
      applyStorage(kind, cache);
    });
    void readScenesCache(kind).then(cache => {
      applyStorage(kind, cache);
    });
    return;
  }
  if (!on && cacheUnsubscribe[kind]) {
    cacheUnsubscribe[kind]?.();
    cacheUnsubscribe[kind] = undefined;
    subscribed[kind] = false;
    if (kind === "favorite") favoriteStorage = null;
    else hiddenStorage = null;
    refreshAllCards();
  }
}

function applyStorage(kind: SceneCacheKind, cache: ScenesCache): void {
  if (!subscribed[kind]) return;
  if (kind === "favorite") favoriteStorage = cache;
  else hiddenStorage = cache;
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

function ensureLifecycleListeners(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  window.addEventListener("pageshow", onPageShow, true);
  document.addEventListener("visibilitychange", onVisibilityChange, true);
}

function removeLifecycleListeners(): void {
  if (!lifecycleInstalled) return;
  lifecycleInstalled = false;
  window.removeEventListener("pageshow", onPageShow, true);
  document.removeEventListener("visibilitychange", onVisibilityChange, true);
}

function onPageShow(): void {
  refreshAllCards();
}

function onVisibilityChange(): void {
  if (document.visibilityState !== "visible") return;
  refreshAllCards();
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
  if (
    enabled.favorite &&
    favoriteStorage &&
    id in favoriteStorage.scenes &&
    !matchFavoriteClipsPage(location.href)
  ) {
    return true;
  }
  if (enabled.hidden && hiddenStorage && id in hiddenStorage.scenes) return true;
  return false;
}

function refreshAllCards(): void {
  if (!started) return;
  const seen = new Set<HTMLElement>();
  const hideFor = (id: string) => shouldHide(id);
  const gridCards = document.querySelectorAll<HTMLElement>("[data-scene-id]");
  for (const el of gridCards) {
    const id = el.dataset.sceneId;
    if (!id) continue;
    const root = closestColumn(el) ?? el;
    if (seen.has(root)) continue;
    seen.add(root);
    applyHide(root, hideFor(id));
  }
  const movieScenes = document.querySelectorAll<HTMLElement>(".movie__scenes__scene");
  for (const el of movieScenes) {
    const id = sceneIdFromMovieScene(el);
    if (!id) continue;
    if (seen.has(el)) continue;
    seen.add(el);
    applyHide(el, hideFor(id));
  }
  const clipLinks = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/adult-clips/"], a[href*="-porn-video.html"]',
  );
  for (const link of clipLinks) {
    const id = sceneIdFromHref(link.getAttribute("href") ?? "");
    if (!id) continue;
    const root = cardRootForLink(link);
    if (!root || seen.has(root)) continue;
    seen.add(root);
    applyHide(root, hideFor(id));
  }
}

function applyHide(el: HTMLElement, hide: boolean): void {
  if (hide) {
    if (el.getAttribute(HIDE_ATTR) !== "true") el.setAttribute(HIDE_ATTR, "true");
    return;
  }
  if (el.hasAttribute(HIDE_ATTR)) el.removeAttribute(HIDE_ATTR);
}

function sceneIdFromHref(href: string): string | null {
  const match = href.match(SCENE_CLIP_HREF_RE);
  if (!match) return null;
  return match[1] ?? match[2] ?? null;
}

function cardRootForLink(link: HTMLAnchorElement): HTMLElement | null {
  const column = closestColumn(link);
  if (column) return column;
  let cur: HTMLElement | null = link.parentElement;
  for (let depth = 0; depth < 6 && cur; depth += 1) {
    const cls = typeof cur.className === "string" ? cur.className : "";
    if (cls && CARD_ROOT_RE.test(cls)) return cur;
    cur = cur.parentElement;
  }
  return link.parentElement;
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
  const link = el.querySelector<HTMLAnchorElement>("a[href*='/adult-clips/'], a[href*='-porn-video.html']");
  if (link) {
    const id = sceneIdFromHref(link.getAttribute("href") ?? "");
    if (id) return id;
  }
  const carousel = el.querySelector<HTMLElement>("[id^='carousel_scene_']");
  if (carousel) return carousel.id.slice("carousel_scene_".length);
  const toggle = el.querySelector<HTMLElement>("[id^='sceneToggle']");
  if (toggle) return toggle.id.slice("sceneToggle".length);
  const details = el.querySelector<HTMLElement>("[id^='sceneDetails']");
  if (details) return details.id.slice("sceneDetails".length);
  return null;
}
