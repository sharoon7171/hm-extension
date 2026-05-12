type Entry = { bytes: number; start: number; end: number };

const THROUGHPUT_WINDOW_MS = 9000;
const PRUNE_WINDOW_MS = 20000;

export class SpeedTracker {
  private buffer: Entry[] = [];
  private last: Entry | null = null;
  private readonly windowMs: number;
  private totalBytes = 0;
  private totalFragments = 0;
  private smoothedBps = 0;

  constructor(windowMs = PRUNE_WINDOW_MS) {
    this.windowMs = windowMs;
  }

  update(bytes: number, startMs: number, endMs: number): void {
    if (this.last && this.last.start === startMs) {
      this.last.bytes = bytes;
      this.last.end = endMs;
    } else {
      const entry: Entry = { bytes, start: sanitizeStartMs(startMs), end: endMs };
      this.buffer.push(entry);
      this.last = entry;
    }
    this.prune();
  }

  recordFragment(bytes: number): void {
    this.totalBytes += bytes;
    this.totalFragments += 1;
  }

  getSmoothedBytesPerSecond(): number {
    const raw = windowedThroughputBps(this.buffer, THROUGHPUT_WINDOW_MS);
    if (raw <= 0) {
      this.smoothedBps *= 0.94;
      if (this.smoothedBps < 2048) this.smoothedBps = 0;
      return this.smoothedBps;
    }
    const alpha = 0.22;
    this.smoothedBps =
      this.smoothedBps <= 0 ? raw : raw * alpha + this.smoothedBps * (1 - alpha);
    return this.smoothedBps;
  }

  getTotalBytes(): number {
    return this.totalBytes;
  }

  getTotalFragments(): number {
    return this.totalFragments;
  }

  private prune(): void {
    const cutoff = performance.now() - this.windowMs;
    while (this.buffer.length > 2 && this.buffer[0].end < cutoff) {
      this.buffer.shift();
    }
  }
}

function sanitizeStartMs(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return performance.now();
  return ms;
}

function windowedThroughputBps(entries: Entry[], windowMs: number): number {
  if (entries.length === 0) return 0;
  const now = performance.now();
  const cutoff = now - windowMs;
  let bytes = 0;
  for (const e of entries) {
    if (e.end < cutoff) continue;
    bytes += e.bytes;
  }
  if (bytes <= 0) return 0;
  return (bytes * 1000) / windowMs;
}
