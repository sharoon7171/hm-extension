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

export function createMetricsLoader(
  tracker: SpeedTracker,
): new (config: HlsConfig) => Loader<LoaderContext> {
  const BaseLoader = Hls.DefaultConfig.loader;
  return class MetricsLoader implements Loader<LoaderContext> {
    private inner: Loader<LoaderContext>;

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
      this.inner.destroy();
    }

    abort(): void {
      this.inner.abort();
    }

    load(
      context: LoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<LoaderContext>,
    ): void {
      const isSegment = context.responseType === SEGMENT_RESPONSE_TYPE;
      const wrapped: LoaderCallbacks<LoaderContext> = {
        onSuccess: (
          response: LoaderResponse,
          stats: LoaderStats,
          ctx: LoaderContext,
          networkDetails,
        ) => {
          if (isSegment) {
            const bytes = stats.loaded || (response.data as ArrayBuffer)?.byteLength || 0;
            const start = stats.loading.first || stats.loading.start;
            const end = stats.loading.end || performance.now();
            if (bytes > 0 && Number.isFinite(start) && Number.isFinite(end) && end > start) {
              tracker.update(bytes, start, end);
              tracker.recordFragment(bytes);
            }
          }
          callbacks.onSuccess(response, stats, ctx, networkDetails);
        },
        onError: callbacks.onError,
        onTimeout: callbacks.onTimeout,
        onAbort: callbacks.onAbort,
        onProgress: callbacks.onProgress,
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
