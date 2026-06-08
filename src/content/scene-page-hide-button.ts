import type { SceneAddRequest, SceneRemoveRequest } from "../shared/messages";
import {
  addSceneToCache,
  readScenesCache,
  removeSceneFromCache,
  watchScenesCache,
  type ScenesCache,
} from "../shared/scenes-cache";
import {
  findFavoriteButton,
  isFavoriteButtonActive,
  readSceneCanonicalHref,
  readSceneTitle,
} from "./scene-favorite-dom";
import { clickFavoriteButton } from "./favorite-button-click";

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
let hideObserver: MutationObserver | null = null;
let cacheUnsubscribe: (() => void) | null = null;
let activeSceneId: string | null = null;
let favoriteAnchor: HTMLElement | null = null;
let isHidden = false;
let lastSyncedHidden: boolean | null = null;

export function startSceneHideButton(sceneId: string): void {
  stopSceneHideButton();
  activeSceneId = sceneId;
  lastSyncedHidden = null;
  injectStyle();
  cacheUnsubscribe = watchScenesCache("hidden", applyCache);
  ensureButton();
}

export function stopSceneHideButton(): void {
  cacheUnsubscribe?.();
  cacheUnsubscribe = null;
  hideObserver?.disconnect();
  hideObserver = null;
  waitObserver?.disconnect();
  waitObserver = null;
  document.getElementById(WRAPPER_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
  activeSceneId = null;
  favoriteAnchor = null;
  isHidden = false;
  lastSyncedHidden = null;
}

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE_RULES;
  (document.head ?? document.documentElement).appendChild(style);
}

function readHideFromButton(): boolean {
  const wrapper = document.getElementById(WRAPPER_ID);
  if (!wrapper) return false;
  return wrapper.dataset.state === "hidden";
}

function applyCache(cache: ScenesCache): void {
  if (!activeSceneId) return;
  const inCache = activeSceneId in cache.scenes;
  if (isHidden === inCache) {
    lastSyncedHidden = inCache;
    return;
  }
  const wasHidden = isHidden;
  lastSyncedHidden = inCache;
  isHidden = inCache;
  refreshButton();
  if (isHidden && !wasHidden) unfavoriteSiteIfActive();
}

function unfavoriteSiteIfActive(): void {
  const anchor = activeSceneId ? findFavoriteButton(activeSceneId) : null;
  if (!anchor?.isConnected) return;
  if (!isFavoriteButtonActive(anchor)) return;
  clickFavoriteButton(anchor);
}

function sendHiddenAdd(sceneId: string): void {
  const scene = {
    sceneId,
    title: readSceneTitle(),
    href: readSceneCanonicalHref(),
  };
  void addSceneToCache("hidden", scene);
  void removeSceneFromCache("favorite", sceneId);
  const message: SceneAddRequest = {
    type: "sceneAdd",
    kind: "hiddenScenes",
    ...scene,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function sendHiddenRemove(sceneId: string): void {
  void removeSceneFromCache("hidden", sceneId);
  const message: SceneRemoveRequest = {
    type: "sceneRemove",
    kind: "hiddenScenes",
    sceneId,
  };
  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function syncHideToStorage(hidden: boolean): void {
  if (!activeSceneId) return;
  if (hidden) {
    unfavoriteSiteIfActive();
    sendHiddenAdd(activeSceneId);
    return;
  }
  sendHiddenRemove(activeSceneId);
}

function reportHideState(): void {
  if (!activeSceneId) return;
  const hidden = readHideFromButton();
  isHidden = hidden;
  if (lastSyncedHidden === hidden) return;
  lastSyncedHidden = hidden;
  syncHideToStorage(hidden);
}

function attachHideObserver(wrapper: HTMLElement): void {
  hideObserver?.disconnect();
  hideObserver = new MutationObserver(reportHideState);
  hideObserver.observe(wrapper, {
    attributes: true,
    attributeFilter: ["data-state", "aria-pressed"],
  });
}

async function reconcileHideWithCache(): Promise<void> {
  if (!activeSceneId) return;
  const hidden = readHideFromButton();
  isHidden = hidden;
  const cache = await readScenesCache("hidden");
  const inCache = activeSceneId in cache.scenes;
  if (hidden === inCache) {
    lastSyncedHidden = hidden;
    return;
  }
  lastSyncedHidden = hidden;
  syncHideToStorage(hidden);
}

async function finishMount(): Promise<void> {
  const wrapper = document.getElementById(WRAPPER_ID);
  if (!wrapper) return;
  attachHideObserver(wrapper);
  applyCache(await readScenesCache("hidden"));
  await reconcileHideWithCache();
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
  void finishMount();
  return true;
}

function findFavoriteAnchor(sceneId: string): HTMLElement | null {
  return findFavoriteButton(sceneId);
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
  isHidden = !isHidden;
  refreshButton();
}
