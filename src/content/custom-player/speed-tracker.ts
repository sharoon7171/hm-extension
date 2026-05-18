import type { LoaderStats } from "hls.js";

const DISPLAY_HOLD_MS = 2000;

export class SpeedTracker {
  private readonly watched = new Set<string>();
  private readonly live = new Map<string, number>();
  private observer: PerformanceObserver | null = null;
  private onChange: ((bps: number) => void) | null = null;
  private bps = 0;
  private displayedBps = 0;
  private lastMeasuredAt = 0;
  private totalBytes = 0;
  private totalFragments = 0;

  constructor() {
    if (typeof PerformanceObserver === "undefined") return;
    this.observer = new PerformanceObserver(() => {
      this.refresh();
      this.recomputePeak();
      this.emit();
    });
    this.observer.observe({ type: "resource", buffered: true });
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.onChange = null;
    this.watched.clear();
    this.live.clear();
    this.bps = 0;
    this.displayedBps = 0;
    this.lastMeasuredAt = 0;
  }

  setOnChange(listener: (bps: number) => void): void {
    this.onChange = listener;
  }

  trackUrl(url: string): void {
    if (!url) return;
    this.watched.add(url);
  }

  untrackUrl(url: string): void {
    this.watched.delete(url);
    this.live.delete(url);
    this.recomputePeak();
    this.emit();
  }

  syncTransfer(url: string, stats: LoaderStats): void {
    const start = stats.loading.first || stats.loading.start;
    if (!start || stats.loaded <= 0) return;
    const elapsedMs = performance.now() - start;
    if (elapsedMs <= 0) return;
    this.live.set(url, (stats.loaded * 1000) / elapsedMs);
    this.recomputePeak();
    this.emit();
  }

  noteResourceFinished(url: string): void {
    if (!url) return;
    this.refresh();
    this.live.delete(url);
    this.recomputePeak();
    this.emit();
  }

  recordFragment(bytes: number): void {
    this.totalBytes += bytes;
    this.totalFragments += 1;
  }

  getBytesPerSecond(): number {
    this.refresh();
    this.recomputePeak();
    return this.displayBps();
  }

  getTotalBytes(): number {
    return this.totalBytes;
  }

  getTotalFragments(): number {
    return this.totalFragments;
  }

  private refresh(): void {
    for (const url of this.watched) {
      const entries = performance.getEntriesByName(
        url,
        "resource",
      ) as PerformanceResourceTiming[];
      const entry = entries[entries.length - 1];
      if (!entry) continue;
      const rate = browserThroughput(entry);
      if (rate > 0) this.live.set(url, rate);
    }
  }

  private recomputePeak(): void {
    let peak = 0;
    for (const rate of this.live.values()) {
      if (rate > peak) peak = rate;
    }
    this.bps = peak;
    if (peak > 0) {
      this.displayedBps = peak;
      this.lastMeasuredAt = performance.now();
    }
  }

  private displayBps(): number {
    if (this.bps > 0) return this.bps;
    if (this.displayedBps <= 0) return 0;
    if (performance.now() - this.lastMeasuredAt <= DISPLAY_HOLD_MS) return this.displayedBps;
    return 0;
  }

  private emit(): void {
    this.onChange?.(this.displayBps());
  }
}

function browserThroughput(entry: PerformanceResourceTiming): number {
  const bytes = resourceBytes(entry);
  if (bytes <= 0) return 0;
  if (entry.responseEnd > 0 && entry.duration > 0) {
    return (bytes * 1000) / entry.duration;
  }
  if (entry.responseStart <= 0) return 0;
  const elapsedMs = performance.now() - entry.startTime;
  if (elapsedMs <= 0) return 0;
  return (bytes * 1000) / elapsedMs;
}

function resourceBytes(entry: PerformanceResourceTiming): number {
  if (entry.transferSize > 0) return entry.transferSize;
  if (entry.encodedBodySize > 0) return entry.encodedBodySize;
  return entry.decodedBodySize;
}
