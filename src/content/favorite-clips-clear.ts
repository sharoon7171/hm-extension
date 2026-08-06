import type { AckResponse, SceneDeleteAllRequest } from "../shared/messages";

const BUTTON_ID = "hotmovies-ext-clear-favorites";
const FAV_TYPE_CLIP = 1;
const CONCURRENCY = 8;
const CONFIRM_MS = 4000;

const boundButtons = new WeakSet<HTMLButtonElement>();

let waitObserver: MutationObserver | null = null;
let busy = false;
let armToken = 0;

export function enableFavoriteClipsClear(): void {
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

export function disableFavoriteClipsClear(): void {
  waitObserver?.disconnect();
  waitObserver = null;
  busy = false;
  armToken = 0;
  document.getElementById(BUTTON_ID)?.remove();
}

function ensureButton(): boolean {
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
  if (busy) return;
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
  try {
    const ids = await collectAllFavoriteIds(button);
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
        await toggleFavoriteOff(id);
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
    setStatus(button, "Delete all…");
    const deleted = await extensionDeleteAllFavorites();
    if (!deleted.ok) throw new Error(deleted.error);
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

function readMaxPage(): number {
  const form = document.querySelector<HTMLFormElement>(
    'form[onsubmit*="GoToPageNonAjax"]',
  );
  const match = form?.getAttribute("onsubmit")?.match(/,\s*(\d+)\s*\)/);
  const max = match ? Number(match[1]) : 1;
  return Number.isFinite(max) && max > 0 ? max : 1;
}

async function collectAllFavoriteIds(
  button: HTMLButtonElement,
): Promise<string[]> {
  const maxPage = readMaxPage();
  const ids = new Set<string>();
  for (let page = 1; page <= maxPage; page += 1) {
    setStatus(button, `Scan ${page}/${maxPage} · ${ids.size}`);
    const url = page === 1 ? "/favorite-clips" : `/favorite-clips?page=${page}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`scan page ${page} failed`);
    const html = await res.text();
    for (const match of html.matchAll(
      /data-ta="view"\s+data-tl="scene"\s+data-tid="(\d+)"/g,
    )) {
      ids.add(match[1]);
    }
    setStatus(button, `Scan ${page}/${maxPage} · ${ids.size}`);
  }
  return [...ids];
}

async function toggleFavoriteOff(sceneId: string): Promise<void> {
  const url = `/Favorites/Toggle?favID=${encodeURIComponent(sceneId)}&favType=${FAV_TYPE_CLIP}&salt=${Date.now()}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`toggle ${sceneId} failed`);
}

async function mapPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}
