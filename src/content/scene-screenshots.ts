import contentStyles from "../content-styles.css?inline";
import { requestText } from "../shared/messages";

const HOST_ID = "hotmovies-screenshots-host";
const BODY_CLASS = "hotmovies-screenshots-body";
const PREVIEW_WIDTH = 480;
const FULLSIZE_WIDTH = 1280;
const TARGET_FRAME_COUNT = 48;

const OG_IMAGE_RE = /caps\d*cdn\.adultempire\.com\/(?:r\/\d+\/)?\d+\/(\d+)_/;
const TIMECODE_RE =
  /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?\s*-->\s*(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?/;
const THUMB_WIDTH_PATH_RE = /\/(\d+)\/(?=\d+_\d+\.jpg(?:$|\?))/;

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

function extractItemRefs(): ItemRefs | null {
  const iframe = document.querySelector<HTMLIFrameElement>(
    'iframe[src*="adultempire.com/gw/player"]',
  );
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

async function fetchSceneThumbnails(
  itemId: string,
  sceneId: string,
  signal: AbortSignal,
): Promise<ThumbnailCue[]> {
  const url = `https://video.adultempire.com/thumbs/${itemId}/${sceneId}.vtt`;
  const text = await requestText(url, signal);
  return parseVtt(text);
}

function parseVtt(text: string): ThumbnailCue[] {
  const lines = text.split(/\r?\n/);
  const cues: ThumbnailCue[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(TIMECODE_RE);
    if (!match) continue;
    const start = toSeconds(match[1], match[2], match[3], match[4]);
    const end = toSeconds(match[5], match[6], match[7], match[8]);
    let url = (lines[i + 1] || "").trim();
    if (!url) continue;
    if (url.startsWith("//")) url = `https:${url}`;
    cues.push({ startSeconds: start, endSeconds: end, url });
  }
  return cues;
}

function toSeconds(h: string, m: string, s: string, ms?: string): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + (ms ? Number(ms) / 1000 : 0);
}

function upgradeThumbWidth(url: string, width: number): string {
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
  const iframe = document.querySelector('iframe[src*="adultempire.com/gw/player"]');
  const playerRow = iframe?.closest(".row");
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
  title.textContent = "Scene Screenshots";
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
    const cues = await fetchSceneThumbnails(refs.itemId, refs.sceneId, controller.signal);
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
