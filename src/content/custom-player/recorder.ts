const TIMESLICE_MS = 1000;
const MAX_VIDEO_BPS = 50_000_000;
const MIN_VIDEO_BPS = 8_000_000;
const AUDIO_BPS = 320_000;

type CaptureVideo = HTMLVideoElement & {
  captureStream(): MediaStream;
};

export type RecorderStartOptions = {
  video: HTMLVideoElement;
  includeAudio: boolean;
  sourceVideoBitrate: number;
};

export type VideoRecorder = {
  isRecording(): boolean;
  isPaused(): boolean;
  start(options: RecorderStartOptions): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): Promise<void>;
  destroy(): void;
};

export function createVideoRecorder(): VideoRecorder {
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let mimeType = "";
  let stopResolve: (() => void) | null = null;
  let stopPromise: Promise<void> | null = null;

  const isRecording = (): boolean =>
    mediaRecorder !== null && mediaRecorder.state !== "inactive";

  const isPaused = (): boolean => mediaRecorder?.state === "paused";

  const start = async (options: RecorderStartOptions): Promise<void> => {
    if (isRecording()) return;
    const video = options.video as CaptureVideo;
    if (typeof video.captureStream !== "function") {
      throw new Error("This browser cannot capture the playing video.");
    }
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      throw new Error("Wait for the video to load before recording.");
    }
    if (video.paused) await video.play();

    const raw = video.captureStream();
    const stream = new MediaStream(raw.getVideoTracks());
    if (options.includeAudio) {
      for (const track of raw.getAudioTracks()) stream.addTrack(track);
    }
    if (stream.getVideoTracks().length === 0) {
      throw new Error("No video track available to record.");
    }

    const picked = pickMimeType(options.includeAudio && stream.getAudioTracks().length > 0);
    mimeType = picked;
    chunks = [];

    const videoBitsPerSecond = pickVideoBitsPerSecond(
      video,
      options.sourceVideoBitrate,
    );
    const recorderOptions: MediaRecorderOptions = {
      mimeType: picked || undefined,
      videoBitsPerSecond,
    };
    if (options.includeAudio && stream.getAudioTracks().length > 0) {
      recorderOptions.audioBitsPerSecond = AUDIO_BPS;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, recorderOptions);
    } catch {
      recorder = new MediaRecorder(stream);
      mimeType = recorder.mimeType || picked;
    }

    mediaRecorder = recorder;
    stopPromise = new Promise<void>(resolve => {
      stopResolve = resolve;
    });

    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      finishStop(stream);
    };
    recorder.onstop = () => {
      const type = mimeType || recorder.mimeType || "video/mp4";
      const blob = new Blob(chunks, { type });
      chunks = [];
      finishStop(stream);
      if (blob.size > 0) downloadBlob(blob, `download.${extensionFor(type)}`);
    };

    try {
      recorder.start(TIMESLICE_MS);
    } catch (error) {
      finishStop(stream);
      throw error instanceof Error
        ? error
        : new Error("Failed to start recording.");
    }
  };

  const pause = (): void => {
    const recorder = mediaRecorder;
    if (!recorder || recorder.state !== "recording") return;
    try {
      recorder.requestData();
      recorder.pause();
    } catch {
    }
  };

  const resume = (): void => {
    const recorder = mediaRecorder;
    if (!recorder || recorder.state !== "paused") return;
    try {
      recorder.resume();
    } catch {
    }
  };

  const stop = async (): Promise<void> => {
    const recorder = mediaRecorder;
    if (!recorder || recorder.state === "inactive") {
      mediaRecorder = null;
      return;
    }
    const pending = stopPromise;
    try {
      if (recorder.state === "recording") recorder.requestData();
      recorder.stop();
    } catch {
      mediaRecorder = null;
      stopResolve?.();
      stopResolve = null;
      stopPromise = null;
      return;
    }
    await pending;
  };

  const destroy = (): void => {
    void stop();
  };

  const finishStop = (stream: MediaStream): void => {
    for (const track of stream.getTracks()) track.stop();
    mediaRecorder = null;
    stopResolve?.();
    stopResolve = null;
    stopPromise = null;
  };

  return { isRecording, isPaused, start, pause, resume, stop, destroy };
}

function pickMimeType(withAudio: boolean): string {
  const candidates = withAudio
    ? [
        "video/mp4;codecs=avc1.640028,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm",
      ]
    : [
        "video/mp4;codecs=avc1.640028",
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm",
      ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function pickVideoBitsPerSecond(
  video: HTMLVideoElement,
  sourceVideoBitrate: number,
): number {
  const width = video.videoWidth || 1920;
  const height = video.videoHeight || 1080;
  const fromPixels = Math.round(width * height * 30 * 0.2);
  const fromSource =
    sourceVideoBitrate > 0 ? Math.round(sourceVideoBitrate * 1.35) : 0;
  return Math.min(
    Math.max(fromPixels, fromSource, MIN_VIDEO_BPS),
    MAX_VIDEO_BPS,
  );
}

function extensionFor(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes("webm")) return "webm";
  return "mp4";
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.documentElement.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
