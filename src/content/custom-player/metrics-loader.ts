import type {
  HlsConfig,
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
  LoaderResponse,
  LoaderStats,
} from "hls.js";
import Hls from "hls.js";
import { SpeedTracker } from "./speed-tracker";

const SEGMENT_RESPONSE_TYPE = "arraybuffer";
const EXTRA_RETRIES = 4;
const RETRY_BASE_MS = 700;

function isRetriableHttp(code: number): boolean {
  return code === 0 || code === 408 || code === 429 || code >= 500;
}

export function createMetricsLoader(
  tracker: SpeedTracker,
): new (config: HlsConfig) => Loader<LoaderContext> {
  const BaseLoader = Hls.DefaultConfig.loader;
  return class MetricsLoader implements Loader<LoaderContext> {
    private inner: Loader<LoaderContext>;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private aborted = false;
    private retrying = false;

    constructor(config: HlsConfig) {
      this.inner = new BaseLoader(config);
    }

    get context(): LoaderContext | null {
      return this.inner.context;
    }

    get stats(): LoaderStats {
      return this.inner.stats;
    }

    destroy(): void {
      this.clearRetry();
      this.aborted = true;
      this.retrying = false;
      this.inner.destroy();
    }

    abort(): void {
      this.clearRetry();
      this.aborted = true;
      this.retrying = false;
      this.inner.abort();
    }

    load(
      context: LoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<LoaderContext>,
    ): void {
      this.aborted = false;
      this.retrying = false;
      this.clearRetry();
      this.loadAttempt(context, config, callbacks, 0);
    }

    private clearRetry(): void {
      if (this.retryTimer === null) return;
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    private loadAttempt(
      context: LoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<LoaderContext>,
      attempt: number,
    ): void {
      if (this.aborted) return;
      this.retrying = false;
      const isSegment = context.responseType === SEGMENT_RESPONSE_TYPE;
      const url = context.url;
      if (isSegment && attempt === 0) tracker.beginTransfer(url);

      const finishSegment = (): void => {
        if (!isSegment) return;
        tracker.noteResourceFinished(url);
        tracker.untrackUrl(url);
      };

      const retryOr = (fail: () => void): void => {
        if (this.aborted || attempt >= EXTRA_RETRIES) {
          this.retrying = false;
          finishSegment();
          fail();
          return;
        }
        this.retrying = true;
        this.inner.abort();
        const delay = RETRY_BASE_MS * 2 ** attempt;
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          if (this.aborted) return;
          this.loadAttempt(context, config, callbacks, attempt + 1);
        }, delay);
      };

      const wrapped: LoaderCallbacks<LoaderContext> = {
        onSuccess: (
          response: LoaderResponse,
          stats: LoaderStats,
          ctx: LoaderContext,
          networkDetails,
        ) => {
          if (isSegment) {
            tracker.syncTransfer(url, stats);
            const bytes = stats.loaded || (response.data as ArrayBuffer)?.byteLength || 0;
            if (bytes > 0) tracker.recordFragment(bytes);
            finishSegment();
          }
          callbacks.onSuccess(response, stats, ctx, networkDetails);
        },
        onError: (error, ctx, networkDetails, stats) => {
          if (isRetriableHttp(error.code)) {
            retryOr(() => callbacks.onError?.(error, ctx, networkDetails, stats));
            return;
          }
          finishSegment();
          callbacks.onError?.(error, ctx, networkDetails, stats);
        },
        onTimeout: (stats, ctx, networkDetails) => {
          retryOr(() => callbacks.onTimeout?.(stats, ctx, networkDetails));
        },
        onAbort: (stats, ctx, networkDetails) => {
          if (this.retrying) return;
          finishSegment();
          callbacks.onAbort?.(stats, ctx, networkDetails);
        },
        onProgress: (stats, ctx, data, networkDetails) => {
          if (isSegment) tracker.syncTransfer(url, stats);
          callbacks.onProgress?.(stats, ctx, data, networkDetails);
        },
      };
      this.inner.load(context, config, wrapped);
    }

    getCacheAge(): number | null {
      return this.inner.getCacheAge?.() ?? null;
    }

    getResponseHeader(name: string): string | null {
      return this.inner.getResponseHeader?.(name) ?? null;
    }
  };
}
