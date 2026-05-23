import { clickFavoriteButton } from "./favorite-button-click";
import type { SceneAddRequest, SceneRemoveRequest } from "../shared/messages";
import {
  applyOptimisticAdd,
  applyOptimisticRemove,
  readScenesCache,
  watchScenesCache,
  type ScenesCache,
} from "../shared/scenes-cache";

const WRAPPER_ID = "hotmovies-ext-scene-hide-button";
const ICON_ID = "hotmovies-ext-scene-hide-icon";
const LABEL_ID = "hotmovies-ext-scene-hide-label";
const STYLE_ID = "hotmovies-ext-scene-hide-style";

const STYLE_RULES = `
  #${WRAPPER_ID} {
    cursor: pointer;
    user-select: none;
  }
  #${WRAPPER_ID} #${ICON_ID} {
    transition: color 120ms ease;
  }
  #${WRAPPER_ID}[data-state="hidden"] #${ICON_ID} {
    color: #d73727;
  }
`;

let waitObserver: MutationObserver | null = null;
let cacheUnsubscribe: (() => void) | null = null;
let activeSceneId: string | null = null;
let favoriteAnchor: HTMLElement | null = null;
let isHidden = false;
let mirroredHidden: boolean | null = null;
let lifecycleInstalled = false;

export function startSceneHideButton(sceneId: string): void {
  stopSceneHideButton();
  activeSceneId = sceneId;
  mirroredHidden = null;
  injectStyle();
  void readScenesCache("hidden").then(applyCache);
  cacheUnsubscribe = watchScenesCache("hidden", applyCache);
  ensureLifecycleListeners();
  ensureButton();
}

export function stopSceneHideButton(): void {
  cacheUnsubscribe?.();
  cacheUnsubscribe = null;
  waitObserver?.disconnect();
  waitObserver = null;
  document.getElementById(WRAPPER_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
  activeSceneId = null;
  favoriteAnchor = null;
  isHidden = false;
  mirroredHidden = null;
  removeLifecycleListeners();
}

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE_RULES;
  (document.head ?? document.documentElement).appendChild(style);
}

function applyCache(cache: ScenesCache): void {
  if (!activeSceneId) return;
  const wasHidden = isHidden;
  isHidden = activeSceneId in cache.scenes;
  refreshButton();
  if (isHidden && !wasHidden) unfavoriteOnSiteIfActive();
  flushHiddenMirrorFromPage();
}

function sendHiddenAdd(sceneId: string): void {
  const scene = {
    sceneId,
    title: readSceneTitle(),
    href: readCanonicalHref(),
  };
  void applyOptimisticAdd("hidden", scene);
  void applyOptimisticRemove("favorite", sceneId);
  const message: SceneAddRequest = {
    type: "sceneAdd",
    kind: "hiddenScenes",
    ...scene,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function sendHiddenRemove(sceneId: string): void {
  void applyOptimisticRemove("hidden", sceneId);
  const message: SceneRemoveRequest = {
    type: "sceneRemove",
    kind: "hiddenScenes",
    sceneId,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function flushHiddenMirrorFromPage(): void {
  if (!activeSceneId) return;
  const sceneId = activeSceneId;
  const want = isHidden;
  if (mirroredHidden === null) {
    mirroredHidden = want;
    return;
  }
  if (mirroredHidden === want) return;
  mirroredHidden = want;
  if (want) sendHiddenAdd(sceneId);
  else sendHiddenRemove(sceneId);
}

function onHiddenLifecycleFlush(): void {
  flushHiddenMirrorFromPage();
}

function ensureLifecycleListeners(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  window.addEventListener("pagehide", onHiddenLifecycleFlush, true);
  document.addEventListener("visibilitychange", onHiddenVisibility, true);
}

function removeLifecycleListeners(): void {
  if (!lifecycleInstalled) return;
  lifecycleInstalled = false;
  window.removeEventListener("pagehide", onHiddenLifecycleFlush, true);
  document.removeEventListener("visibilitychange", onHiddenVisibility, true);
}

function onHiddenVisibility(): void {
  if (document.visibilityState !== "hidden") return;
  onHiddenLifecycleFlush();
}

function ensureButton(): void {
  if (tryMount()) return;
  if (waitObserver) return;
  waitObserver = new MutationObserver(() => {
    if (!tryMount()) return;
    waitObserver?.disconnect();
    waitObserver = null;
  });
  waitObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function tryMount(): boolean {
  if (!activeSceneId) return false;
  if (document.getElementById(WRAPPER_ID)) return true;
  if (!favoriteAnchor || !favoriteAnchor.isConnected) {
    favoriteAnchor = findFavoriteAnchor(activeSceneId);
    if (!favoriteAnchor) return false;
  }
  const placement = findActionRow(favoriteAnchor);
  if (!placement) return false;
  const column = buildColumn(placement.favoriteColumn);
  placement.favoriteColumn.insertAdjacentElement("afterend", column);
  refreshButton();
  return true;
}

function findFavoriteAnchor(sceneId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `a[data-ta="favorite"][data-tl="scene"][data-tid="${CSS.escape(sceneId)}"]`,
  );
}

function isActionColumn(el: Element): boolean {
  return el.querySelector("i.fa, i[class*='fa-']") !== null;
}

function findActionRow(
  anchor: HTMLElement,
): { row: HTMLElement; favoriteColumn: HTMLElement } | null {
  let current: HTMLElement = anchor;
  for (let depth = 0; depth < 8; depth += 1) {
    const parent = current.parentElement;
    if (!parent) return null;
    for (const sibling of parent.children) {
      if (sibling === current) continue;
      if (isActionColumn(sibling)) {
        return { row: parent, favoriteColumn: current };
      }
    }
    current = parent;
  }
  return null;
}

function buildColumn(favoriteColumn: HTMLElement): HTMLElement {
  const tag = favoriteColumn.tagName.toLowerCase();
  const safeTag = tag === "button" || tag === "a" ? "div" : tag;
  const column = document.createElement(safeTag);
  column.id = WRAPPER_ID;
  column.setAttribute("role", "button");
  column.setAttribute("tabindex", "0");
  column.setAttribute("aria-pressed", "false");
  if (favoriteColumn.className) {
    column.className = favoriteColumn.className;
  }

  const icon = document.createElement("i");
  icon.id = ICON_ID;
  icon.className = "fa fa-eye-slash";
  icon.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.id = LABEL_ID;
  label.textContent = "Hide";

  column.appendChild(icon);
  column.appendChild(label);
  column.addEventListener("click", onClick);
  column.addEventListener("keydown", onKeyDown);
  return column;
}

function refreshButton(): void {
  const wrapper = document.getElementById(WRAPPER_ID);
  const icon = document.getElementById(ICON_ID);
  const label = document.getElementById(LABEL_ID);
  if (!wrapper || !icon || !label) return;
  wrapper.dataset.state = isHidden ? "hidden" : "visible";
  wrapper.setAttribute("aria-pressed", isHidden ? "true" : "false");
  icon.className = `fa ${isHidden ? "fa-eye" : "fa-eye-slash"}`;
  label.textContent = isHidden ? "Unhide" : "Hide";
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  void onClick(event);
}

function onClick(event: Event): void {
  event.preventDefault();
  if (!activeSceneId) return;
  const willHide = !isHidden;
  isHidden = willHide;
  refreshButton();
  if (willHide) unfavoriteOnSiteIfActive();
  flushHiddenMirrorFromPage();
}

function unfavoriteOnSiteIfActive(): void {
  if (!favoriteAnchor || !favoriteAnchor.isConnected) return;
  if (!favoriteAnchor.classList.contains("active")) return;
  clickFavoriteButton(favoriteAnchor);
}

function readSceneTitle(): string {
  const heading = document.querySelector("h1.clip-title, h1#clip-title, h1.clip-name");
  const fromHeading = heading?.textContent?.trim();
  if (fromHeading) return fromHeading;
  const raw = document.title || "";
  return raw.replace(/\s*-\s*HotMovies\s*$/i, "").trim() || raw.trim();
}

function readCanonicalHref(): string {
  return `${location.origin}${location.pathname}`;
}
