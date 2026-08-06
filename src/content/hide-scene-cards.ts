import {
  readScenesCache,
  watchScenesCache,
  type SceneCacheKind,
  type ScenesCache,
} from "../shared/scenes-cache";
import { matchFavoriteClipsPage } from "./url-patterns";

const HIDE_ATTR = "data-hotmovies-hide-card";
const FAV_ATTR = "data-hotmovies-fav-card";
const STYLE_ID = "hotmovies-ext-hide-card-style";
const COLUMN_RE = /\bcol(?:-(?:xs|sm|md|lg|xl|xxl))?-\d+\b/;
const SCENE_CLIP_HREF_RE =
  /\/(?:adult-clips\/(\d+)|(\d+)\/[^/?#]+-porn-video\.html)(?:[?#]|$)/i;
const CARD_ROOT_RE =
  /\b(?:grid|product|scene|clip|card|thumb|item|tile|box|result)\b/i;

type FavoriteMode = "off" | "hide" | "highlight";

let favoriteMode: FavoriteMode = "off";
let hideHidden = false;

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

export function setHideCardsConfig(config: {
  favorite: FavoriteMode;
  hidden: boolean;
}): void {
  favoriteMode = config.favorite;
  hideHidden = config.hidden;
  const needFavorite = favoriteMode !== "off";
  if (!needFavorite && !hideHidden) {
    teardown();
    return;
  }
  ensureStarted();
  syncSubscription("favorite", needFavorite);
  syncSubscription("hidden", hideHidden);
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
    .querySelectorAll<HTMLElement>(`[${HIDE_ATTR}],[${FAV_ATTR}]`)
    .forEach(el => {
      el.removeAttribute(HIDE_ATTR);
      el.removeAttribute(FAV_ATTR);
    });
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
  style.textContent = [
    `[${HIDE_ATTR}="true"] { display: none !important; }`,
    `[${FAV_ATTR}="true"] {`,
    "  outline: 3px solid #e11d48 !important;",
    "  outline-offset: 3px !important;",
    "  box-shadow: 0 0 0 6px rgba(225, 29, 72, 0.35), 0 0 18px rgba(225, 29, 72, 0.55) !important;",
    "  border-radius: 6px !important;",
    "  background-color: rgba(225, 29, 72, 0.12) !important;",
    "}",
  ].join("\n");
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

function isFavorited(id: string): boolean {
  return Boolean(favoriteStorage && id in favoriteStorage.scenes);
}

function cardState(id: string): "hide" | "highlight" | "none" {
  if (hideHidden && hiddenStorage && id in hiddenStorage.scenes) return "hide";
  if (
    favoriteMode !== "off" &&
    isFavorited(id) &&
    !matchFavoriteClipsPage(location.href)
  ) {
    return favoriteMode === "hide" ? "hide" : "highlight";
  }
  return "none";
}

function refreshAllCards(): void {
  if (!started) return;
  const seen = new Set<HTMLElement>();
  const apply = (el: HTMLElement, id: string) => {
    if (seen.has(el)) return;
    seen.add(el);
    applyState(el, cardState(id));
  };
  const gridCards = document.querySelectorAll<HTMLElement>("[data-scene-id]");
  for (const el of gridCards) {
    const id = el.dataset.sceneId;
    if (!id) continue;
    apply(closestColumn(el) ?? el, id);
  }
  const movieScenes = document.querySelectorAll<HTMLElement>(".movie__scenes__scene");
  for (const el of movieScenes) {
    const id = sceneIdFromMovieScene(el);
    if (!id) continue;
    apply(el, id);
  }
  const clipLinks = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/adult-clips/"], a[href*="-porn-video.html"]',
  );
  for (const link of clipLinks) {
    const id = sceneIdFromHref(link.getAttribute("href") ?? "");
    if (!id) continue;
    const root = cardRootForLink(link);
    if (!root) continue;
    apply(root, id);
  }
}

function applyState(el: HTMLElement, state: "hide" | "highlight" | "none"): void {
  if (state === "hide") {
    if (el.getAttribute(HIDE_ATTR) !== "true") el.setAttribute(HIDE_ATTR, "true");
    if (el.hasAttribute(FAV_ATTR)) el.removeAttribute(FAV_ATTR);
    return;
  }
  if (el.hasAttribute(HIDE_ATTR)) el.removeAttribute(HIDE_ATTR);
  if (state === "highlight") {
    if (el.getAttribute(FAV_ATTR) !== "true") el.setAttribute(FAV_ATTR, "true");
    return;
  }
  if (el.hasAttribute(FAV_ATTR)) el.removeAttribute(FAV_ATTR);
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
