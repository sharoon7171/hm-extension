import type { AckResponse, SceneDeleteAllRequest } from "../shared/messages";

const BUTTON_ID = "hotmovies-ext-clear-favorites";
const CONCURRENCY = 8;
const CONFIRM_MS = 4000;

export type FavoritesClearKind = "clips" | "performers" | "studios";

type FavoritesClearSpec = {
  path: string;
  favType: number;
  idRe: RegExp;
  clearCloud: boolean;
};

const SPECS: Record<FavoritesClearKind, FavoritesClearSpec> = {
  clips: {
    path: "/favorite-clips",
    favType: 1,
    idRe: /data-ta="view"\s+data-tl="scene"\s+data-tid="(\d+)"/g,
    clearCloud: true,
  },
  performers: {
    path: "/favorite-performers",
    favType: 3,
    idRe: /:data_tl="'performer'"\s*:data_tid="(\d+)"/g,
    clearCloud: false,
  },
  studios: {
    path: "/favorite-studios",
    favType: 5,
    idRe: /:data_tl="'studio'"\s*:data_tid="(\d+)"/g,
    clearCloud: false,
  },
};

const boundButtons = new WeakSet<HTMLButtonElement>();

let waitObserver: MutationObserver | null = null;
let activeKind: FavoritesClearKind | null = null;
let busy = false;
let armToken = 0;

export function enableFavoritesClear(kind: FavoritesClearKind): void {
  if (activeKind && activeKind !== kind) disableFavoritesClear();
  activeKind = kind;
  ensureButton();
  if (waitObserver) return;
  waitObserver = new MutationObserver(() => {
    ensureButton();
  });
  waitObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function disableFavoritesClear(): void {
  waitObserver?.disconnect();
  waitObserver = null;
  activeKind = null;
  busy = false;
  armToken = 0;
  document.getElementById(BUTTON_ID)?.remove();
}

function ensureButton(): boolean {
  if (!activeKind) return false;
  const sort = document.querySelector(".list__header__controls__sort");
  if (!sort) return false;
  let button = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  if (button && boundButtons.has(button)) return true;
  button?.remove();
  button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.className = "btn btn-secondary btn-sm m-r-1";
  button.textContent = "Remove all";
  button.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      void onClearClick(button!);
    },
    true,
  );
  boundButtons.add(button);
  sort.insertBefore(button, sort.firstChild);
  return true;
}

async function onClearClick(button: HTMLButtonElement): Promise<void> {
  if (busy || !activeKind) return;
  if (button.dataset.armed !== "1") {
    const token = ++armToken;
    button.dataset.armed = "1";
    setStatus(button, "Confirm remove?");
    button.classList.add("btn-danger");
    button.classList.remove("btn-secondary");
    window.setTimeout(() => {
      if (busy || token !== armToken) return;
      button.dataset.armed = "0";
      resetButton(button);
    }, CONFIRM_MS);
    return;
  }
  armToken += 1;
  button.dataset.armed = "0";
  busy = true;
  button.disabled = true;
  const spec = SPECS[activeKind];
  try {
    const ids = await collectAllFavoriteIds(button, spec);
    if (ids.length === 0) {
      setStatus(button, "None found");
      await wait(900);
      busy = false;
      resetButton(button);
      return;
    }
    let done = 0;
    let failed = 0;
    setStatus(button, `Site 0/${ids.length}`);
    await mapPool(ids, CONCURRENCY, async id => {
      try {
        await toggleFavoriteOff(id, spec.favType);
      } catch {
        failed += 1;
      }
      done += 1;
      setStatus(
        button,
        failed > 0
          ? `Site ${done}/${ids.length} (${failed} failed)`
          : `Site ${done}/${ids.length}`,
      );
    });
    if (spec.clearCloud) {
      setStatus(button, "Delete all…");
      const deleted = await extensionDeleteAllFavorites();
      if (!deleted.ok) throw new Error(deleted.error);
    }
    setStatus(
      button,
      failed > 0 ? `Done · ${failed} site failed` : `Done · ${ids.length}`,
    );
    await wait(700);
    location.reload();
  } catch (error) {
    setStatus(button, `Failed · ${shortError(error)}`);
    await wait(1800);
    busy = false;
    resetButton(button);
  }
}

function setStatus(button: HTMLButtonElement, text: string): void {
  button.textContent = text;
  button.title = text;
}

function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 28 ? `${message.slice(0, 28)}…` : message;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function resetButton(button: HTMLButtonElement): void {
  button.disabled = false;
  button.dataset.armed = "0";
  button.title = "";
  setStatus(button, "Remove all");
  button.classList.add("btn-secondary");
  button.classList.remove("btn-danger");
}

function extensionDeleteAllFavorites(): Promise<AckResponse> {
  const message: SceneDeleteAllRequest = {
    type: "sceneDeleteAll",
    kind: "favoriteScenes",
  };
  return new Promise(resolve => {
    chrome.runtime.sendMessage(message, (response: AckResponse | undefined) => {
      if (chrome.runtime.lastError) {
        resolve({
          ok: false,
          error: chrome.runtime.lastError.message ?? "background unavailable",
        });
        return;
      }
      if (!response) {
        resolve({ ok: false, error: "background unavailable" });
        return;
      }
      resolve(response);
    });
  });
}

function readMaxPage(html?: string): number {
  const source =
    html ??
    document.querySelector<HTMLFormElement>(
      'form[onsubmit*="GoToPageNonAjax"]',
    )?.getAttribute("onsubmit") ??
    "";
  const match = source.match(/GoToPageNonAjax\([^,]+,[^,]+,\s*(\d+)\s*\)/);
  if (match) {
    const max = Number(match[1]);
    if (Number.isFinite(max) && max > 0) return max;
  }
  let max = 1;
  const linkSource = html ?? document.documentElement.innerHTML;
  for (const page of linkSource.matchAll(/[?&]page=(\d+)/gi)) {
    const value = Number(page[1]);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max;
}

async function collectAllFavoriteIds(
  button: HTMLButtonElement,
  spec: FavoritesClearSpec,
): Promise<string[]> {
  let maxPage = readMaxPage();
  const ids = new Set<string>();
  for (let page = 1; page <= maxPage; page += 1) {
    setStatus(button, `Scan ${page}/${maxPage} · ${ids.size}`);
    const url = page === 1 ? spec.path : `${spec.path}?page=${page}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`scan page ${page} failed`);
    const html = await res.text();
    if (page === 1) maxPage = Math.max(maxPage, readMaxPage(html));
    for (const match of html.matchAll(spec.idRe)) {
      ids.add(match[1]);
    }
    setStatus(button, `Scan ${page}/${maxPage} · ${ids.size}`);
  }
  return [...ids];
}

async function toggleFavoriteOff(
  favId: string,
  favType: number,
): Promise<void> {
  const url = `/Favorites/Toggle?favID=${encodeURIComponent(favId)}&favType=${favType}&salt=${Date.now()}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`toggle ${favId} failed`);
}

async function mapPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        await worker(items[index]);
      }
    },
  );
  await Promise.all(runners);
}
