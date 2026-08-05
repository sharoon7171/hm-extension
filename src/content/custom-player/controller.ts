import Hls from "hls.js";
import type { Level } from "hls.js";
import { createBandwidthLock, type BandwidthLock } from "./bandwidth-lock";
import { buildIcon } from "./icons";
import { formatBytes, formatBytesPerSecond, formatTimecode } from "./format";
import { CUSTOM_PLAYER_HLS_CONFIG } from "./hls-config";
import { createMetricsLoader } from "./metrics-loader";
import { isPlaybackBuffered } from "./buffer-range";
import { buildPlayerElement, type PlayerElement } from "./player-element";
import {
  clampLevelIndex,
  createQualityMenu,
  findHighestLevelIndex,
  findLevelIndexByHeight,
  type QualityMenu,
} from "./quality-menu";
import { loadSceneSource, type SceneSource } from "./scene-source";
import { SpeedTracker } from "./speed-tracker";
import { playerClasses as cls } from "../../ui-classes/player";

const STATS_INTERVAL_MS = 500;
const QUALITY_PREF_KEY = "hm-custom-player-quality";
const SKIP_SECONDS = 10;

function getDocumentFullscreenEl(doc: Document): Element | null {
  const d = doc as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return doc.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

function requestFullscreenPreferred(el: HTMLElement): void {
  const h = el as HTMLElement & {
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void>;
  };
  void (h.requestFullscreen?.() ?? h.webkitRequestFullscreen?.());
}

function exitDocumentFullscreen(doc: Document): void {
  const d = doc as Document & {
    exitFullscreen?: () => Promise<void>;
    webkitExitFullscreen?: () => Promise<void>;
  };
  void (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
}

function fullscreenRequestTarget(ui: PlayerElement): HTMLElement {
  const rn = ui.root.getRootNode();
  if (rn instanceof ShadowRoot && rn.mode === "open") return rn.host as HTMLElement;
  return ui.root;
}

function isPlayerFullscreen(ui: PlayerElement): boolean {
  const docEl = getDocumentFullscreenEl(document);
  if (!docEl) return false;
  if (docEl === ui.root || docEl === fullscreenRequestTarget(ui)) return true;
  const rn = ui.root.getRootNode();
  if (rn instanceof ShadowRoot && rn.fullscreenElement === ui.root) return true;
  return false;
}

export type PlayerController = {
  element: HTMLDivElement;
  destroy(): void;
  start(iframe: HTMLIFrameElement): Promise<void>;
};

export function createPlayerController(): PlayerController {
  const ui = buildPlayerElement();
  const tracker = new SpeedTracker();
  tracker.setOnChange(bps => {
    ui.stats.speed.textContent = formatBytesPerSecond(bps);
  });
  const abort = new AbortController();
  let hls: Hls | null = null;
  let menu: QualityMenu | null = null;
  let statsTimer: number | null = null;
  let source: SceneSource | null = null;
  let lastVolume = 1;
  let destroyed = false;
  let playbackEverStarted = false;
  let pinnedHeight: number | null = null;
  let manifestParsed = false;
  let pendingPlayStart = false;
  let chipBufferingActive = false;
  let lock: BandwidthLock | null = null;
  let fullscreenUiListener: (() => void) | null = null;
  const syncPrepChip = (): void => {
    const preparing = !manifestParsed;
    const buffering = playbackEverStarted && chipBufferingActive;
    ui.prepStatus.dataset.show = preparing || buffering ? "true" : "false";
    if (buffering) ui.prepLabel.textContent = "Buffering…";
    else if (preparing) ui.prepLabel.textContent = "Opening stream…";
  };

  const start = async (iframe: HTMLIFrameElement): Promise<void> => {
    try {
      source = await loadSceneSource(iframe, abort.signal);
    } catch (error) {
      if (destroyed) return;
      showError(ui, formatLoadError(error));
      return;
    }
    if (destroyed) return;
    ui.video.poster = source.posterUrl ?? "";
    ui.time.total.textContent = formatTimecode(source.durationSeconds);
    ui.bigPlay.dataset.show = "true";
    playbackEverStarted = false;
    chipBufferingActive = false;
    ui.prepLabel.textContent = "Opening stream…";
    lock = createBandwidthLock();
    syncPrepChip();
    initHls(source.playlistUrl);
    wireControls();
    statsTimer = window.setInterval(updateStats, STATS_INTERVAL_MS);
  };

  const destroy = (): void => {
    destroyed = true;
    if (isPlayerFullscreen(ui)) exitDocumentFullscreen(document);
    abort.abort();
    if (statsTimer !== null) window.clearInterval(statsTimer);
    statsTimer = null;
    if (fullscreenUiListener) {
      document.removeEventListener("fullscreenchange", fullscreenUiListener);
      document.removeEventListener("webkitfullscreenchange", fullscreenUiListener);
      fullscreenUiListener = null;
    }
    lock?.destroy();
    lock = null;
    tracker.destroy();
    if (hls) {
      hls.destroy();
      hls = null;
    }
    ui.root.remove();
  };

  const initHls = (playlistUrl: string): void => {
    if (!Hls.isSupported()) {
      ui.video.src = playlistUrl;
      ui.video.addEventListener(
        "loadedmetadata",
        () => {
          if (destroyed) return;
          manifestParsed = true;
          syncPrepChip();
          if (pendingPlayStart) {
            pendingPlayStart = false;
            ensurePlaybackPipeline();
          }
        },
        { once: true },
      );
      return;
    }
    hls = new Hls({
      ...CUSTOM_PLAYER_HLS_CONFIG,
      loader: createMetricsLoader(tracker),
    });
    hls.attachMedia(ui.video);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      hls?.loadSource(playlistUrl);
    });
    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      if (destroyed) return;
      manifestParsed = true;
      const levels = data.levels;
      const stored = readStoredQualityHeightPx();
      if (stored !== null) {
        const idx = findLevelIndexByHeight(levels, stored);
        const row = levels[idx];
        pinnedHeight = row?.height ?? stored;
      } else {
        const row = levels[findHighestLevelIndex(levels)];
        pinnedHeight = row?.height ?? null;
        if (pinnedHeight !== null) persistQualityHeight(pinnedHeight);
      }
      applyLockedLevel();
      buildMenu(levels);
      if (pendingPlayStart) {
        pendingPlayStart = false;
        ensurePlaybackPipeline();
      }
      syncPrepChip();
    });
    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      if (!hls || pinnedHeight === null || hls.levels.length === 0) return;
      const want = clampLevelIndex(
        hls.levels,
        findLevelIndexByHeight(hls.levels, pinnedHeight),
      );
      if (data.level !== want) applyLockedLevel();
      refreshMenu();
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (playbackEverStarted) {
            hls?.startLoad(ui.video.currentTime);
          } else {
            showError(ui, `Playback error: ${data.details}`);
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR && playbackEverStarted) {
            resumeLoadingAtPlayhead();
          } else {
            hls?.recoverMediaError();
          }
        } else {
          showError(ui, `Playback error: ${data.details}`);
        }
      } else if (
        data.details === Hls.ErrorDetails.BUFFER_FULL_ERROR &&
        playbackEverStarted
      ) {
        resumeLoadingAtPlayhead();
      }
    });
  };

  const applyLockedLevel = (): void => {
    if (!hls || pinnedHeight === null || hls.levels.length === 0) return;
    const index = clampLevelIndex(
      hls.levels,
      findLevelIndexByHeight(hls.levels, pinnedHeight),
    );
    hls.loadLevel = index;
    hls.startLevel = index;
    hls.nextLevel = index;
  };

  const buildMenu = (levels: Level[]): void => {
    if (!hls || pinnedHeight === null) return;
    const pinnedIndex = findLevelIndexByHeight(levels, pinnedHeight);
    menu = createQualityMenu(ui.menu.panel, height => {
      if (!hls) return;
      pinnedHeight = height;
      persistQualityHeight(height);
      applyLockedLevel();
      const hi = clampLevelIndex(
        hls.levels,
        findLevelIndexByHeight(hls.levels, height),
      );
      try {
        hls.currentLevel = hi;
      } catch {
      }
      refreshMenu();
    });
    menu.render(levels, pinnedIndex);
  };

  const refreshMenu = (): void => {
    if (!hls || !menu || pinnedHeight === null) return;
    menu.render(hls.levels, findLevelIndexByHeight(hls.levels, pinnedHeight));
  };

  const nudgeSeek = (deltaSec: number): void => {
    const duration = ui.video.duration || source?.durationSeconds || 0;
    if (duration <= 0) return;
    ui.video.currentTime = clamp(ui.video.currentTime + deltaSec, 0, duration);
  };

  const wireControls = (): void => {
    ui.buttons.play.addEventListener("click", togglePlay);
    ui.centerHit.addEventListener("click", togglePlay);
    ui.bigPlay.addEventListener("click", event => {
      event.stopPropagation();
      togglePlay();
    });
    ui.video.addEventListener("play", () => {
      setPlayIcon(true);
      ui.bigPlay.dataset.show = "false";
      if (!manifestParsed) {
        pendingPlayStart = true;
        return;
      }
      ensurePlaybackPipeline();
    });
    ui.video.addEventListener("pause", () => {
      setPlayIcon(false);
      if (!ui.video.ended) ui.bigPlay.dataset.show = "true";
    });
    ui.video.addEventListener("timeupdate", updatePlayhead);
    ui.video.addEventListener("progress", updateBuffered);
    ui.video.addEventListener("durationchange", () => {
      if (!source) return;
      const duration = ui.video.duration || source.durationSeconds;
      ui.time.total.textContent = formatTimecode(duration);
    });
    ui.video.addEventListener("seeking", () => {
      if (!playbackEverStarted || !hls) return;
      const t = ui.video.currentTime;
      if (!isPlaybackBuffered(ui.video, t)) syncAfterSeek();
    });
    ui.video.addEventListener("waiting", () => {
      ui.seek.track.dataset.waiting = "true";
      if (!playbackEverStarted) return;
      chipBufferingActive = true;
      syncPrepChip();
      if (!isPlaybackBuffered(ui.video, ui.video.currentTime, 2)) resumeLoadingAtPlayhead();
    });
    ui.video.addEventListener("playing", () => {
      ui.seek.track.dataset.waiting = "false";
      chipBufferingActive = false;
      syncPrepChip();
    });
    ui.video.addEventListener("canplay", () => {
      ui.seek.track.dataset.waiting = "false";
    });
    ui.video.addEventListener("ended", () => {
      setPlayIcon(false);
      ui.bigPlay.dataset.show = "true";
    });

    ui.buttons.skipBackward.addEventListener("click", event => {
      event.stopPropagation();
      nudgeSeek(-SKIP_SECONDS);
    });
    ui.buttons.skipForward.addEventListener("click", event => {
      event.stopPropagation();
      nudgeSeek(SKIP_SECONDS);
    });

    wireSeek();
    wireVolume();

    ui.buttons.settings.addEventListener("click", event => {
      event.stopPropagation();
      menu?.toggle();
    });
    document.addEventListener("click", outsideClick, true);

    ui.buttons.fullscreen.addEventListener("click", event => {
      event.stopPropagation();
      toggleFullscreen();
    });
    const onFullscreenEvent = (): void => {
      if (destroyed) return;
      updateFullscreenIcon();
    };
    fullscreenUiListener = onFullscreenEvent;
    document.addEventListener("fullscreenchange", onFullscreenEvent);
    document.addEventListener("webkitfullscreenchange", onFullscreenEvent);
    ui.video.addEventListener("dblclick", event => {
      event.preventDefault();
      toggleFullscreen();
    });
    ui.centerHit.addEventListener("dblclick", event => {
      event.preventDefault();
      toggleFullscreen();
    });

    ui.root.addEventListener("mousemove", () => {
      ui.root.style.cursor = "";
    });
    ui.root.addEventListener("keydown", onKey);
  };

  const resumeLoadingAtPlayhead = (): void => {
    if (!manifestParsed || destroyed || !hls || !lock) return;
    if (!lock.isOwner()) lock.claim();
    applyLockedLevel();
    hls.startLoad(ui.video.currentTime);
  };

  const ensurePlaybackPipeline = (): void => {
    if (!manifestParsed || !lock || destroyed || !hls) return;
    if (!playbackEverStarted) {
      playbackEverStarted = true;
      resumeLoadingAtPlayhead();
      return;
    }
    if (!lock.isOwner()) resumeLoadingAtPlayhead();
  };

  const syncAfterSeek = (): void => {
    if (!manifestParsed || destroyed || !playbackEverStarted) return;
    if (isPlaybackBuffered(ui.video, ui.video.currentTime)) return;
    resumeLoadingAtPlayhead();
  };

  const togglePlay = (): void => {
    if (ui.video.paused) void ui.video.play();
    else ui.video.pause();
  };

  const setPlayIcon = (playing: boolean): void => {
    ui.buttons.playIcon.replaceWith(buildIcon(playing ? "pause" : "play", cls.icon));
    const next = ui.buttons.play.querySelector("svg");
    if (next) ui.buttons.playIcon = next as SVGSVGElement;
    ui.buttons.play.setAttribute("aria-label", playing ? "Pause" : "Play");
  };

  const updatePlayhead = (): void => {
    const duration = ui.video.duration || source?.durationSeconds || 0;
    const current = ui.video.currentTime;
    ui.time.current.textContent = formatTimecode(current);
    const pct = duration > 0 ? (current / duration) * 100 : 0;
    ui.seek.progress.style.width = `${pct}%`;
  };

  const updateBuffered = (): void => {
    const duration = ui.video.duration || source?.durationSeconds || 0;
    if (duration <= 0) return;
    const ranges = ui.video.buffered;
    let end = 0;
    for (let i = 0; i < ranges.length; i += 1) {
      end = Math.max(end, ranges.end(i));
    }
    const pct = (end / duration) * 100;
    ui.seek.buffered.style.width = `${pct}%`;
  };

  const wireSeek = (): void => {
    const seekToSeconds = (seconds: number): void => {
      const duration = ui.video.duration || source?.durationSeconds || 0;
      if (duration <= 0) return;
      ui.video.currentTime = clamp(seconds, 0, duration);
    };
    const seekAt = (clientX: number): void => {
      const duration = ui.video.duration || source?.durationSeconds || 0;
      if (duration <= 0) return;
      const rect = ui.seek.track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      seekToSeconds(ratio * duration);
    };
    const updateHover = (clientX: number): void => {
      const duration = ui.video.duration || source?.durationSeconds || 0;
      if (duration <= 0) return;
      const rect = ui.seek.track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      ui.seek.hover.dataset.show = "true";
      ui.seek.hover.style.left = `${ratio * 100}%`;
      ui.seek.hover.textContent = formatTimecode(ratio * duration);
    };
    ui.seek.track.addEventListener("click", event => seekAt(event.clientX));
    ui.seek.track.addEventListener("mousemove", event => updateHover(event.clientX));
    ui.seek.track.addEventListener("mouseleave", () => {
      ui.seek.hover.dataset.show = "false";
    });
    let dragging = false;
    ui.seek.track.addEventListener("mousedown", event => {
      dragging = true;
      seekAt(event.clientX);
    });
    window.addEventListener("mousemove", event => {
      if (!dragging) return;
      seekAt(event.clientX);
      updateHover(event.clientX);
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
    });
  };

  const wireVolume = (): void => {
    ui.buttons.volume.addEventListener("click", () => {
      if (ui.video.muted || ui.video.volume === 0) {
        ui.video.muted = false;
        ui.video.volume = lastVolume || 1;
      } else {
        lastVolume = ui.video.volume;
        ui.video.muted = true;
      }
    });
    ui.video.addEventListener("volumechange", () => {
      const effective = ui.video.muted ? 0 : ui.video.volume;
      ui.volume.fill.style.width = `${Math.round(effective * 100)}%`;
      setVolumeIcon(effective);
    });
    ui.volume.slider.addEventListener("click", event => {
      const rect = ui.volume.slider.getBoundingClientRect();
      const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      ui.video.muted = false;
      ui.video.volume = ratio;
      lastVolume = ratio;
    });
  };

  const setVolumeIcon = (effective: number): void => {
    const name = effective === 0 ? "volumeMute" : effective < 0.5 ? "volumeMid" : "volumeFull";
    ui.buttons.volumeIcon.replaceWith(buildIcon(name, cls.icon));
    const next = ui.buttons.volume.querySelector("svg");
    if (next) ui.buttons.volumeIcon = next as SVGSVGElement;
  };

  const toggleFullscreen = (): void => {
    if (isPlayerFullscreen(ui)) exitDocumentFullscreen(document);
    else requestFullscreenPreferred(fullscreenRequestTarget(ui));
  };

  const updateFullscreenIcon = (): void => {
    const active = isPlayerFullscreen(ui);
    ui.buttons.fullscreenIcon.replaceWith(
      buildIcon(active ? "fullscreenExit" : "fullscreen", cls.icon),
    );
    const next = ui.buttons.fullscreen.querySelector("svg");
    if (next) ui.buttons.fullscreenIcon = next as SVGSVGElement;
    ui.buttons.fullscreen.setAttribute(
      "aria-label",
      active ? "Exit fullscreen" : "Fullscreen",
    );
  };

  const outsideClick = (event: MouseEvent): void => {
    if (!menu?.isOpen()) return;
    const target = event.target as Node | null;
    if (target && ui.menu.wrapper.contains(target)) return;
    menu.close();
  };

  const onKey = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === " " || event.key === "k") {
      event.preventDefault();
      togglePlay();
    } else if (event.key === "ArrowRight") {
      nudgeSeek(SKIP_SECONDS);
    } else if (event.key === "ArrowLeft") {
      nudgeSeek(-SKIP_SECONDS);
    } else if (event.key === "f") {
      toggleFullscreen();
    } else if (event.key === "m") {
      ui.video.muted = !ui.video.muted;
    }
  };

  const updateStats = (): void => {
    const bps = tracker.getBytesPerSecond();
    ui.stats.speed.textContent = formatBytesPerSecond(bps);
    const ranges = ui.video.buffered;
    let ahead = 0;
    for (let i = 0; i < ranges.length; i += 1) {
      if (
        ui.video.currentTime >= ranges.start(i) &&
        ui.video.currentTime <= ranges.end(i)
      ) {
        ahead = ranges.end(i) - ui.video.currentTime;
        break;
      }
    }
    ui.stats.buffer.textContent = `${ahead.toFixed(1)}s`;
    if (hls && pinnedHeight !== null) {
      const levelIndex =
        hls.currentLevel >= 0 ? hls.currentLevel : hls.loadLevel;
      const level = levelIndex >= 0 ? hls.levels[levelIndex] : null;
      ui.stats.level.textContent = level ? `${level.height}p` : `${pinnedHeight}p`;
    }
    ui.stats.fragments.textContent = `${tracker.getTotalFragments()} (${formatBytes(tracker.getTotalBytes())})`;
  };

  return {
    element: ui.root,
    destroy,
    start,
  };
}

function showError(ui: PlayerElement, message: string): void {
  ui.seek.track.dataset.waiting = "false";
  ui.prepStatus.dataset.show = "false";
  ui.errorNote.hidden = false;
  ui.errorNote.textContent = message;
  ui.bigPlay.dataset.show = "false";
}

function formatLoadError(error: unknown): string {
  if (error instanceof Error) return `Failed to load video: ${error.message}`;
  return "Failed to load video.";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readStoredQualityHeightPx(): number | null {
  try {
    const raw = window.localStorage.getItem(QUALITY_PREF_KEY);
    if (raw === null || raw === "auto") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

function persistQualityHeight(px: number): void {
  try {
    window.localStorage.setItem(QUALITY_PREF_KEY, String(px));
  } catch {
  }
}
