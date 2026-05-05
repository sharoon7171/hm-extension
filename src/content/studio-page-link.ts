import { matchStudioPage } from "./url-patterns";

const LINK_ID = "hotmovies-studio-page-browse-link";
const TITLE_ROW_SELECTOR = ".list__page-header__title-row";
const TITLE_SELECTOR = ".list__page-header__title";

let observer: MutationObserver | null = null;

function buildLink(studioId: string, studioName: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.id = LINK_ID;
  link.className = "btn btn-secondary m-l-1";
  link.href = `/adult-clips/list?studio=${studioId}`;
  link.textContent = `Browse ${studioName} Scenes`;
  return link;
}

function tryInject(studioId: string): boolean {
  if (document.getElementById(LINK_ID)) return true;
  const titleRow = document.querySelector<HTMLElement>(TITLE_ROW_SELECTOR);
  if (!titleRow) return false;
  const title = titleRow.querySelector<HTMLElement>(TITLE_SELECTOR);
  const studioName = title?.textContent?.trim() || "Studio";
  titleRow.appendChild(buildLink(studioId, studioName));
  return true;
}

export function showStudioPageLink(): void {
  const match = matchStudioPage(location.href);
  if (!match) return;
  if (tryInject(match.studioId)) return;
  if (observer) return;
  observer = new MutationObserver(() => {
    if (tryInject(match.studioId)) {
      observer?.disconnect();
      observer = null;
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function hideStudioPageLink(): void {
  observer?.disconnect();
  observer = null;
  document.getElementById(LINK_ID)?.remove();
}
