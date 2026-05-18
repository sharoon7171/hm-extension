export function bufferAheadSec(media: HTMLMediaElement, time = media.currentTime): number {
  const ranges = media.buffered;
  for (let i = 0; i < ranges.length; i += 1) {
    if (time >= ranges.start(i) && time <= ranges.end(i)) {
      return ranges.end(i) - time;
    }
  }
  return 0;
}

export function isPlaybackBuffered(
  media: HTMLMediaElement,
  time: number,
  minAheadSec = 0.5,
): boolean {
  return bufferAheadSec(media, time) >= minAheadSec;
}
