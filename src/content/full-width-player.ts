import { CUSTOM_PLAYER_HOST_ID } from "./dom-markers";

const STYLE_ID = "hotmovies-full-width-player-style";
const PLAYER_CLASS = "hotmovies-full-width-player";
const SIDEBAR_CLASS = "hotmovies-full-width-player-sidebar-hidden";
const PLAYER_SELECTOR = `iframe[src*="adultempire.com/gw/player"], #${CUSTOM_PLAYER_HOST_ID}`;
const ASPECT_W = 16;
const ASPECT_H = 9;
const BOTTOM_BUFFER_PX = 30;

const STYLE_RULES = `
.${SIDEBAR_CLASS} {
  display: none !important;
}
`;

type Targets = { playerCol: HTMLElement; sidebarCol: HTMLElement; iframe: HTMLElement };

let resizeHandler: (() => void) | null = null;

function findTargets(): Targets | null {
  const iframe = document.querySelector<HTMLElement>(PLAYER_SELECTOR);
  if (!iframe) return null;
  const playerCol = iframe.closest<HTMLElement>('[class*="col-"]');
  if (!playerCol) return null;
  const row = playerCol.parentElement;
  if (!row || !row.classList.contains("row")) return null;
  const sidebarCol = Array.from(row.children).find(
    el => el !== playerCol && el instanceof HTMLElement,
  ) as HTMLElement | undefined;
  if (!sidebarCol) return null;
  return { playerCol, sidebarCol, iframe };
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE_RULES;
  document.head.appendChild(style);
}

function measurePostIframeHeight(playerCol: HTMLElement, iframe: HTMLElement): number {
  let total = 0;
  for (const child of Array.from(playerCol.children) as HTMLElement[]) {
    if (child.contains(iframe)) continue;
    const rect = child.getBoundingClientRect();
    if (rect.height === 0) continue;
    total += rect.height;
  }
  return total;
}

function applySizing(targets: Targets): void {
  const { playerCol, iframe } = targets;
  playerCol.classList.add(PLAYER_CLASS);
  playerCol.style.flex = "0 0 auto";
  playerCol.style.width = "100%";
  playerCol.style.marginLeft = "auto";
  playerCol.style.marginRight = "auto";
  playerCol.style.maxWidth = "";

  const postHeight = measurePostIframeHeight(playerCol, iframe);
  const colTop = playerCol.getBoundingClientRect().top + window.scrollY;
  const available = window.innerHeight - colTop - postHeight - BOTTOM_BUFFER_PX;
  if (available <= 0) {
    playerCol.style.maxWidth = "";
    return;
  }
  const maxWidth = (available * ASPECT_W) / ASPECT_H;
  playerCol.style.maxWidth = `${Math.floor(maxWidth)}px`;
}

export function showFullWidthPlayer(): void {
  const targets = findTargets();
  if (!targets) return;
  ensureStyle();
  targets.sidebarCol.classList.add(SIDEBAR_CLASS);
  applySizing(targets);

  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
  resizeHandler = () => {
    const fresh = findTargets();
    if (!fresh) return;
    applySizing(fresh);
  };
  window.addEventListener("resize", resizeHandler, { passive: true });
}

export function hideFullWidthPlayer(): void {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  document.getElementById(STYLE_ID)?.remove();
  document.querySelectorAll<HTMLElement>(`.${PLAYER_CLASS}`).forEach(el => {
    el.classList.remove(PLAYER_CLASS);
    el.style.flex = "";
    el.style.width = "";
    el.style.marginLeft = "";
    el.style.marginRight = "";
    el.style.maxWidth = "";
  });
  document
    .querySelectorAll(`.${SIDEBAR_CLASS}`)
    .forEach(el => el.classList.remove(SIDEBAR_CLASS));
}
