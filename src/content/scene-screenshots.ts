import contentStyles from "../content-styles.css?inline";
import {
  getCustomPlayerHostElement,
  getCustomPlayerIframeRef,
} from "./custom-player-mount-state";
import { SCENE_SCREENSHOTS_HOST_ID } from "./dom-markers";
import { EXTENSION_DISPLAY_NAME } from "../shared/extension-brand";
import { requestText } from "../shared/messages";
import { matchScenePage } from "./url-patterns";

const HOST_ID = SCENE_SCREENSHOTS_HOST_ID;
const BODY_CLASS = "hotmovies-screenshots-body";
const PLAYER_IFRAME_SELECTOR = 'iframe[src*="adultempire.com/gw/player"]';
const PREVIEW_WIDTH = 480;
const FULLSIZE_WIDTH = 1280;
const TARGET_FRAME_COUNT = 48;

const OG_IMAGE_RE = /caps\d*cdn\.adultempire\.com\/(?:r\/\d+\/)?\d+\/(\d+)_/;
const WEBVTT_TS =
  /\d{2}:\d{2}:\d{2}(?:[.,]\d{1,3})?|\d{1,2}:\d{2}(?:[.,]\d{1,3})?/;
const WEBVTT_CUE_LINE_RE = new RegExp(
  `^(${WEBVTT_TS.source})\\s*-->\\s*(${WEBVTT_TS.source})(?:\\s+(\\S+.*))?\\s*$`,
);
const THUMB_WIDTH_PATH_RE = /\/(\d+)\/(?=\d+_\d+\.jpg(?:$|\?))/;
const CAPS_N_PATH_THUMB_RE =
  /^(https?:\/\/caps\d*cdn\.adultempire\.com\/n\/\d+)\/(\d+)\/([^/]+)$/i;

const HOTMOVIES_ORIGIN = "https://www.hotmovies.com";

type ItemRefs = { itemId: string; sceneId: string; masterId: string | null };
type ThumbnailCue = { startSeconds: number; endSeconds: number; url: string };

const classes = {
  host: "block w-full px-4 py-6 font-sans text-zinc-100",
  header: "flex items-center justify-between mb-3",
  title: "text-lg font-semibold tracking-tight",
  badge: "text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200",
  grid: "grid grid-cols-8 gap-2",
  cell:
    "relative aspect-video overflow-hidden rounded-md ring-1 ring-zinc-800 bg-zinc-900 group block no-underline",
  image:
    "w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]",
  time:
    "absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/70 text-white",
  empty: "text-sm text-zinc-400 italic",
  error: "text-sm text-red-400",
} as const;

let activeAbort: AbortController | null = null;

function iframeForScreenshots(): HTMLIFrameElement | null {
  return (
    document.querySelector<HTMLIFrameElement>(PLAYER_IFRAME_SELECTOR) ??
    getCustomPlayerIframeRef()
  );
}

function playerScreenshotRow(): HTMLElement | null {
  const live = document.querySelector<HTMLIFrameElement>(PLAYER_IFRAME_SELECTOR);
  if (live) {
    const row = live.closest(".row");
    if (row instanceof HTMLElement) return row;
  }
  const host = getCustomPlayerHostElement();
  const row = host?.parentElement?.closest(".row");
  return row instanceof HTMLElement ? row : null;
}

function extractItemRefs(): ItemRefs | null {
  const iframe = iframeForScreenshots();
  if (!iframe?.src) return null;
  const params = new URL(iframe.src).searchParams;
  const itemId = params.get("item_id");
  const sceneId = params.get("scene_id");
  if (!itemId || !sceneId) return null;
  const og = document.querySelector<HTMLMetaElement>(
    'meta[property="og:image"], meta[name="og:image"]',
  );
  const masterMatch = og?.content.match(OG_IMAGE_RE);
  return {
    itemId,
    sceneId,
    masterId: masterMatch ? masterMatch[1] : null,
  };
}

function normalizeWebVttTiming(value: string): string {
  return value.trim().replace(",", ".");
}

function parseCueTimestamp(raw: string): number | null {
  const normalized = normalizeWebVttTiming(raw);
  const parts = normalized.split(":").map(p => parseFloat(p.trim()));
  if (parts.some(p => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function isLikelyThumbnailUrl(candidate: string): boolean {
  const u = candidate.trim();
  return (
    u.startsWith("https://") ||
    u.startsWith("http://") ||
    u.startsWith("//") ||
    /\.(jpe?g|webp|png)(?:[#?]|$)/i.test(u)
  );
}

async function fetchSceneThumbVtt(
  itemKey: string,
  sceneKey: string,
  signal: AbortSignal,
): Promise<string> {
  return requestText(`https://video.adultempire.com/thumbs/${itemKey}/${sceneKey}.vtt`, signal);
}

async function fetchSceneThumbnails(refs: ItemRefs, signal: AbortSignal): Promise<ThumbnailCue[]> {
  const uniquePairs = new Map<string, [string, string]>();
  const add = (a: string, b: string): void => {
    if (!a || !b) return;
    const key = `${a}:${b}`;
    if (!uniquePairs.has(key)) uniquePairs.set(key, [a, b]);
  };
  add(refs.itemId, refs.sceneId);
  if (
    refs.masterId &&
    refs.masterId !== refs.sceneId &&
    refs.masterId !== refs.itemId
  ) {
    add(refs.itemId, refs.masterId);
  }
  const pathScene = matchScenePage(location.href)?.sceneId;
  if (
    pathScene &&
    pathScene !== refs.sceneId &&
    pathScene !== refs.itemId
  ) {
    add(refs.itemId, pathScene);
    add(pathScene, pathScene);
  }
  add(refs.itemId, refs.itemId);
  for (const [, pair] of uniquePairs) {
    const cues = parseVtt(await fetchSceneThumbVtt(pair[0], pair[1], signal));
    if (cues.length > 0) return cues;
  }
  return [];
}

function escapeRegexSource(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractRetailTitleUrl(itemId: string): string | null {
  const { pathname } = location;
  const slugSeg = pathname.match(/^\/adult-clips\/\d+\/([^/]+)\/?$/i)?.[1];
  if (slugSeg && /^[\w.-]+$/i.test(slugSeg)) {
    return `${HOTMOVIES_ORIGIN}/${itemId}/${slugSeg}-porn-video.html`;
  }
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="porn-video.html"]',
  );
  for (const a of anchors) {
    try {
      const u = new URL(a.href, location.href);
      const m = u.pathname.match(/^\/(\d+)\/([^/]+)-porn-video\.html$/i);
      if (!m || m[1] !== itemId) continue;
      return `${HOTMOVIES_ORIGIN}/${itemId}/${m[2]}-porn-video.html`;
    } catch {
      continue;
    }
  }
  const blob = document.documentElement.innerHTML.slice(0, 2_500_000);
  const hm = blob.match(
    new RegExp(
      `href="https:\\/\\/www\\.hotmovies\\.com\\/${escapeRegexSource(
        itemId,
      )}\\/([^"<>\\s]+)-porn-video\\.html`,
      "i",
    ),
  );
  const slugHtml = hm?.[1]?.replace(/&amp;/g, "&").replace(/[^\w.-]/g, "") ?? "";
  if (slugHtml && /^[\w.-]+$/i.test(slugHtml)) {
    return `${HOTMOVIES_ORIGIN}/${itemId}/${slugHtml}-porn-video.html`;
  }
  return null;
}

function cuesFromRetailDom(root: ParentNode): ThumbnailCue[] {
  type Draft = { url: string; tc: number | null };
  const imgs = [...root.querySelectorAll<HTMLImageElement>(
    '.scene-screenshot-container img[src*="caps"]',
  )];
  const seenUrl = new Set<string>();
  const drafts: Draft[] = [];
  for (const img of imgs) {
    let url = img.getAttribute("src") ?? "";
    url = url.trim();
    if (!url) continue;
    if (url.startsWith("//")) url = `https:${url}`;
    if (!/^https?:\/\//i.test(url)) url = new URL(url, HOTMOVIES_ORIGIN).href;
    if (seenUrl.has(url)) continue;
    seenUrl.add(url);
    const anchor = img.closest("a");
    let tc: number | null = null;
    if (anchor?.href) {
      try {
        const p = new URL(anchor.href, HOTMOVIES_ORIGIN).searchParams.get("tc");
        if (p != null && p !== "") {
          const n = Number(p);
          if (Number.isFinite(n)) tc = n;
        }
      } catch {}
    }
    drafts.push({ url, tc });
  }
  drafts.sort((a, b) => {
    const ax = typeof a.tc === "number" ? a.tc : Number.POSITIVE_INFINITY;
    const bx = typeof b.tc === "number" ? b.tc : Number.POSITIVE_INFINITY;
    if (ax !== bx) return ax - bx;
    return a.url.localeCompare(b.url);
  });
  const cues: ThumbnailCue[] = [];
  for (let i = 0; i < drafts.length; i += 1) {
    const { url, tc } = drafts[i];
    const nextTc = drafts[i + 1]?.tc;
    const startSeconds =
      typeof tc === "number"
        ? tc
        : i * 260;
    const endSeconds =
      typeof nextTc === "number"
        ? Math.max(startSeconds + 0.5, nextTc - 0.5)
        : startSeconds + 5;
    cues.push({ startSeconds, endSeconds, url });
  }
  return cues;
}

async function fetchRetailScreenshotCues(
  itemId: string,
  signal: AbortSignal,
): Promise<ThumbnailCue[]> {
  const local = cuesFromRetailDom(document);
  if (local.length > 0) return local;
  const retailUrl = extractRetailTitleUrl(itemId);
  if (!retailUrl) return [];
  let res: Response;
  try {
    res = await fetch(retailUrl, { credentials: "include", signal, cache: "no-store" });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  let html: string;
  try {
    html = await res.text();
  } catch {
    return [];
  }
  try {
    return cuesFromRetailDom(new DOMParser().parseFromString(html, "text/html"));
  } catch {
    return [];
  }
}

async function resolveSceneScreenshots(
  refs: ItemRefs,
  signal: AbortSignal,
): Promise<ThumbnailCue[]> {
  const fromVtt = await fetchSceneThumbnails(refs, signal);
  if (fromVtt.length > 0) return fromVtt;
  return fetchRetailScreenshotCues(refs.itemId, signal);
}

function parseVtt(text: string): ThumbnailCue[] {
  const lines = text.replace(/^\ufeff/, "").split(/\r?\n/);
  const cues: ThumbnailCue[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const lineRaw = lines[i];
    const line = lineRaw.trim();
    if (!line) continue;
    if (line === "WEBVTT") continue;
    if (/^NOTE(\s|$)/i.test(line)) continue;
    if (!line.includes("-->")) continue;
    const m = line.match(WEBVTT_CUE_LINE_RE);
    if (!m) continue;
    const startSeconds = parseCueTimestamp(m[1]);
    const endSeconds = parseCueTimestamp(m[2]);
    if (
      startSeconds === null ||
      endSeconds === null ||
      Number.isNaN(startSeconds) ||
      Number.isNaN(endSeconds)
    ) {
      continue;
    }
    let thumbUrl = (m[3] || "").trim();
    let urlFromNext = false;
    if (!thumbUrl && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (next && !next.includes("-->")) {
        thumbUrl = next;
        urlFromNext = true;
      }
    }
    if (!thumbUrl || !isLikelyThumbnailUrl(thumbUrl)) continue;
    cues.push({
      startSeconds,
      endSeconds,
      url: thumbUrl.startsWith("//") ? `https:${thumbUrl}` : thumbUrl,
    });
    if (urlFromNext) i += 1;
  }
  return cues;
}

function upgradeThumbWidth(url: string, width: number): string {
  const nm = url.match(CAPS_N_PATH_THUMB_RE);
  if (nm) {
    const [, prefix, szRaw, basename] = nm;
    const sz = escapeRegexSource(szRaw);
    const newBase = basename.replace(new RegExp(`_${sz}(\\.jpe?g)$`, "i"), `_${width}$1`);
    return `${prefix}/${width}/${newBase}`;
  }
  return url.replace(THUMB_WIDTH_PATH_RE, `/${width}/`);
}

function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function sampleCues(cues: ThumbnailCue[], targetCount: number): ThumbnailCue[] {
  if (cues.length <= targetCount) return cues;
  const out: ThumbnailCue[] = new Array(targetCount);
  const lastIndex = cues.length - 1;
  for (let i = 0; i < targetCount; i += 1) {
    const idx = Math.round((i * lastIndex) / (targetCount - 1));
    out[i] = cues[idx];
  }
  return out;
}

let resizeListener: (() => void) | null = null;

function mountHost(): ShadowRoot | null {
  const playerRow = playerScreenshotRow();
  if (!playerRow) return null;
  const existing = document.getElementById(HOST_ID);
  if (existing && existing.shadowRoot) return existing.shadowRoot;
  const host = document.createElement("section");
  host.id = HOST_ID;
  host.style.display = "block";
  host.style.boxSizing = "border-box";
  playerRow.insertAdjacentElement("afterend", host);
  applyFullBleed(host);
  resizeListener = () => applyFullBleed(host);
  window.addEventListener("resize", resizeListener, { passive: true });
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = contentStyles;
  shadow.appendChild(style);
  return shadow;
}

function applyFullBleed(host: HTMLElement): void {
  host.style.width = "";
  host.style.marginLeft = "";
  const rect = host.getBoundingClientRect();
  const docWidth = document.documentElement.clientWidth;
  host.style.width = `${docWidth}px`;
  host.style.marginLeft = `${-rect.left}px`;
}

function unmountHost(): void {
  if (resizeListener) {
    window.removeEventListener("resize", resizeListener);
    resizeListener = null;
  }
  document.getElementById(HOST_ID)?.remove();
}

function setBody(shadow: ShadowRoot, body: HTMLElement): void {
  shadow.querySelector(`.${BODY_CLASS}`)?.remove();
  body.classList.add(BODY_CLASS);
  shadow.appendChild(body);
}

function withHeader(child: HTMLElement, badge?: string): HTMLElement {
  const root = document.createElement("section");
  root.className = classes.host;
  const header = document.createElement("div");
  header.className = classes.header;
  const title = document.createElement("h2");
  title.className = classes.title;
  title.textContent = `${EXTENSION_DISPLAY_NAME} — Scene Screenshots`;
  header.appendChild(title);
  if (badge) {
    const span = document.createElement("span");
    span.className = classes.badge;
    span.textContent = badge;
    header.appendChild(span);
  }
  root.appendChild(header);
  root.appendChild(child);
  return root;
}

function buildText(className: string, text: string): HTMLElement {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

function buildCell(cue: ThumbnailCue): HTMLElement {
  const cell = document.createElement("a");
  cell.className = classes.cell;
  cell.href = upgradeThumbWidth(cue.url, FULLSIZE_WIDTH);
  cell.target = "_blank";
  cell.rel = "noopener noreferrer";
  const time = formatTimecode(cue.startSeconds);
  cell.title = `Frame at ${time}`;
  const img = document.createElement("img");
  img.className = classes.image;
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = `Frame at ${time}`;
  img.src = upgradeThumbWidth(cue.url, PREVIEW_WIDTH);
  const label = document.createElement("span");
  label.className = classes.time;
  label.textContent = time;
  cell.appendChild(img);
  cell.appendChild(label);
  return cell;
}

function renderLoading(shadow: ShadowRoot): void {
  setBody(shadow, withHeader(buildText(classes.empty, "Loading screenshots…")));
}

function renderError(shadow: ShadowRoot, message: string): void {
  setBody(shadow, withHeader(buildText(classes.error, message)));
}

function renderGrid(shadow: ShadowRoot, cues: ThumbnailCue[]): void {
  const sampled = sampleCues(cues, TARGET_FRAME_COUNT);
  const grid = document.createElement("div");
  grid.className = classes.grid;
  for (const cue of sampled) grid.appendChild(buildCell(cue));
  setBody(shadow, withHeader(grid, `${sampled.length} of ${cues.length} frames`));
}

export async function showSceneScreenshots(): Promise<void> {
  const refs = extractItemRefs();
  if (!refs) return;
  const shadow = mountHost();
  if (!shadow) return;
  activeAbort?.abort();
  const controller = new AbortController();
  activeAbort = controller;
  renderLoading(shadow);
  try {
    const cues = await resolveSceneScreenshots(refs, controller.signal);
    if (cues.length === 0) {
      renderError(shadow, "No screenshots are available for this scene.");
      return;
    }
    renderGrid(shadow, cues);
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    renderError(shadow, `Failed to load screenshots: ${(error as Error).message}`);
  }
}

export function hideSceneScreenshots(): void {
  activeAbort?.abort();
  activeAbort = null;
  unmountHost();
}
