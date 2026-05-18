import type { Fragment } from "hls.js";
import Hls from "hls.js";
import type {
  HlsConfig,
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
  LoaderStats,
} from "hls.js";
import { bufferAheadSec } from "./buffer-range";
import { PREFETCH_WHEN_AHEAD_BELOW_SEC } from "./hls-config";
import type { SpeedTracker } from "./speed-tracker";

const PREFETCH_AHEAD = 1;
const SEEK_PREFETCH_COUNT = 2;
const MAX_CACHE_ENTRIES = 128;

type CachedSegment = {
  data: ArrayBuffer;
  stats: LoaderStats;
  networkDetails: unknown;
};

type Inflight = {
  promise: Promise<CachedSegment>;
  controller: AbortController;
};

function isFragmentContext(
  context: LoaderContext,
): context is LoaderContext & { frag: Fragment } {
  return "frag" in context;
}

function isMediaFrag(frag: Fragment): frag is Fragment & { sn: number } {
  return frag.sn !== "initSegment";
}

export type PrefetchLoaderBundle = {
  Loader: new (config: HlsConfig) => Loader<LoaderContext>;
  primeAtSeek: (hls: Hls, seconds: number) => void;
};

export function createPrefetchLoader(
  getHls: () => Hls | null,
  tracker: SpeedTracker,
  MetricsLoader: new (config: HlsConfig) => Loader<LoaderContext>,
): PrefetchLoaderBundle {
  let active: PrefetchLoader | null = null;

  class PrefetchLoader implements Loader<LoaderContext> {
    private inner: Loader<LoaderContext>;
    private readonly cache = new Map<string, CachedSegment>();
    private readonly inflight = new Map<string, Inflight>();

    constructor(config: HlsConfig) {
      this.inner = new MetricsLoader(config);
      active = this;
    }

    get context(): LoaderContext | null {
      return this.inner.context;
    }

    get stats(): LoaderStats {
      return this.inner.stats;
    }

    destroy(): void {
      if (active === this) active = null;
      this.clearAll();
      this.inner.destroy();
    }

    primeAtSeek(hls: Hls, seconds: number): void {
      const levelIndex = hls.loadLevel >= 0 ? hls.loadLevel : hls.currentLevel;
      if (levelIndex < 0) return;
      const frags = hls.levels[levelIndex]?.details?.fragments;
      if (!frags?.length) return;
      const idx = fragmentIndexAtTime(frags, seconds);
      const keep = new Set<string>();
      for (let i = idx; i < frags.length && i < idx + SEEK_PREFETCH_COUNT; i += 1) {
        const url = frags[i].url;
        if (url) keep.add(url);
      }
      this.abortInflightExcept(keep);
      for (const url of keep) {
        if (this.cache.has(url) || this.inflight.has(url)) continue;
        this.startPrefetch(url, undefined);
      }
    }

    abort(): void {
      this.inner.abort();
    }

    load(
      context: LoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<LoaderContext>,
    ): void {
      const url = context.url;
      const cached = this.cache.get(url);
      if (cached) {
        queueMicrotask(() => {
          callbacks.onSuccess(
            { url, data: cached.data, code: 200 },
            cached.stats,
            context,
            cached.networkDetails,
          );
        });
        this.schedulePrefetch(context);
        return;
      }

      const pending = this.inflight.get(url);
      if (pending) {
        void pending.promise
          .then(entry => {
            if (this.inflight.get(url) !== pending) return;
            this.inflight.delete(url);
            this.cache.set(url, entry);
            callbacks.onSuccess(
              { url, data: entry.data, code: 200 },
              entry.stats,
              context,
              entry.networkDetails,
            );
            this.schedulePrefetch(context);
          })
          .catch(() => {
            this.inner.load(context, config, callbacks);
          });
        return;
      }

      this.inner.load(context, config, {
        onSuccess: (response, stats, ctx, networkDetails) => {
          const bytes = stats.loaded || (response.data as ArrayBuffer)?.byteLength || 0;
          if (bytes > 0 && ctx.url) {
            this.cache.set(ctx.url, {
              data: response.data as ArrayBuffer,
              stats,
              networkDetails,
            });
            this.trimCache();
          }
          callbacks.onSuccess(response, stats, ctx, networkDetails);
          this.schedulePrefetch(ctx);
        },
        onError: callbacks.onError,
        onTimeout: callbacks.onTimeout,
        onAbort: callbacks.onAbort,
        onProgress: callbacks.onProgress,
      });
    }

    getCacheAge(): number | null {
      return this.inner.getCacheAge?.() ?? null;
    }

    getResponseHeader(name: string): string | null {
      return this.inner.getResponseHeader?.(name) ?? null;
    }

    private schedulePrefetch(context: LoaderContext): void {
      if (!isFragmentContext(context)) return;
      const frag = context.frag;
      if (!isMediaFrag(frag)) return;
      if (!shouldPrefetchAhead(getHls())) return;
      const urls = upcomingUrls(getHls(), frag, PREFETCH_AHEAD);
      for (const url of urls) {
        if (this.cache.has(url) || this.inflight.has(url)) continue;
        this.startPrefetch(url, context.headers);
      }
      this.trimCache();
    }

    private startPrefetch(
      url: string,
      headers: Record<string, string> | undefined,
    ): void {
      tracker.trackUrl(url);
      const controller = new AbortController();
      const promise = fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "same-origin",
        signal: controller.signal,
        headers: headers ? new Headers(headers) : undefined,
      }).then(async response => {
        if (!response.ok) throw new Error(String(response.status));
        const start = performance.now();
        const stats: LoaderStats = {
          aborted: false,
          loaded: 0,
          retry: 0,
          total: 0,
          chunkCount: 0,
          bwEstimate: 0,
          loading: { start, first: 0, end: 0 },
          parsing: { start: 0, end: 0 },
          buffering: { start: 0, first: 0, end: 0 },
        };
        const reader = response.body?.getReader();
        if (!reader) {
          const data = await response.arrayBuffer();
          stats.loaded = data.byteLength;
          stats.total = data.byteLength;
          stats.loading.first = performance.now();
          stats.loading.end = performance.now();
          tracker.syncTransfer(url, stats);
          return { data, stats, networkDetails: response };
        }
        const parts: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value.byteLength) continue;
          if (stats.loading.first === 0) stats.loading.first = performance.now();
          stats.loaded += value.byteLength;
          stats.chunkCount += 1;
          tracker.syncTransfer(url, stats);
          parts.push(value);
        }
        const data = new Uint8Array(stats.loaded);
        let offset = 0;
        for (const part of parts) {
          data.set(part, offset);
          offset += part.byteLength;
        }
        stats.total = stats.loaded;
        stats.loading.end = performance.now();
        return { data: data.buffer, stats, networkDetails: response };
      });
      const inflight: Inflight = { promise, controller };
      this.inflight.set(url, inflight);
      void promise
        .then(entry => {
          if (this.inflight.get(url) !== inflight) return;
          this.inflight.delete(url);
          this.cache.set(url, entry);
          this.trimCache();
          tracker.noteResourceFinished(url);
        })
        .catch(() => {
          this.inflight.delete(url);
          tracker.noteResourceFinished(url);
          tracker.untrackUrl(url);
        });
    }

    private trimCache(): void {
      while (this.cache.size > MAX_CACHE_ENTRIES) {
        const first = this.cache.keys().next().value;
        if (first === undefined) break;
        this.cache.delete(first);
      }
    }

    private abortInflightExcept(keep: Set<string>): void {
      for (const [url, row] of this.inflight) {
        if (keep.has(url)) continue;
        row.controller.abort();
        this.inflight.delete(url);
      }
    }

    private clearAll(): void {
      for (const { controller } of this.inflight.values()) controller.abort();
      this.inflight.clear();
      this.cache.clear();
    }
  }

  return {
    Loader: PrefetchLoader,
    primeAtSeek: (hls, seconds) => active?.primeAtSeek(hls, seconds),
  };
}

function shouldPrefetchAhead(hls: Hls | null): boolean {
  const media = hls?.media;
  if (!media) return true;
  return bufferAheadSec(media) < PREFETCH_WHEN_AHEAD_BELOW_SEC;
}

function fragmentIndexAtTime(
  frags: Array<{ start: number; duration: number }>,
  seconds: number,
): number {
  for (let i = 0; i < frags.length; i += 1) {
    const end = frags[i].start + frags[i].duration;
    if (seconds < end) return i;
  }
  return Math.max(0, frags.length - 1);
}

function upcomingUrls(hls: Hls | null, frag: Fragment, count: number): string[] {
  if (!hls || !isMediaFrag(frag)) return [];
  const levelIndex = frag.level >= 0 ? frag.level : hls.loadLevel;
  if (levelIndex < 0) return [];
  const level = hls.levels[levelIndex];
  const frags = level?.details?.fragments;
  if (!frags?.length) return [];
  const idx = frags.findIndex(row => row.sn === frag.sn);
  if (idx < 0) return [];
  const urls: string[] = [];
  for (let i = idx + 1; i < frags.length && urls.length < count; i += 1) {
    const nextUrl = frags[i].url;
    if (nextUrl) urls.push(nextUrl);
  }
  return urls;
}
