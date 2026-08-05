import type Hls from "hls.js";

type HlsConfigInput = NonNullable<ConstructorParameters<typeof Hls>[0]>;

export const FORWARD_BUFFER_TARGET_SEC = 30;
export const FORWARD_BUFFER_CAP_SEC = 120;
export const BACK_BUFFER_SEC = 90;
export const MAX_BUFFER_BYTES = 600 * 1000 * 1000;

export const CUSTOM_PLAYER_HLS_CONFIG: Partial<HlsConfigInput> = {
  autoStartLoad: false,
  startPosition: -1,
  debug: false,
  capLevelOnFPSDrop: false,
  capLevelToPlayerSize: false,
  initialLiveManifestSize: 1,
  maxBufferLength: FORWARD_BUFFER_TARGET_SEC,
  maxMaxBufferLength: FORWARD_BUFFER_CAP_SEC,
  frontBufferFlushThreshold: Number.POSITIVE_INFINITY,
  backBufferLength: BACK_BUFFER_SEC,
  maxBufferSize: MAX_BUFFER_BYTES,
  maxBufferHole: 0.5,
  highBufferWatchdogPeriod: 0.5,
  nudgeOffset: 0.1,
  nudgeMaxRetry: 3,
  maxFragLookUpTolerance: 0.25,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: Number.POSITIVE_INFINITY,
  liveDurationInfinity: false,
  enableWorker: true,
  enableSoftwareAES: true,
  startFragPrefetch: true,
  testBandwidth: false,
  progressive: true,
  lowLatencyMode: false,
  fpsDroppedMonitoringPeriod: 5000,
  fpsDroppedMonitoringThreshold: 0.2,
  appendErrorMaxRetry: 3,
  stretchShortVideoTrack: false,
  maxAudioFramesDrift: 1,
  forceKeyFrameOnDiscontinuity: true,
  abrEwmaFastLive: 3.0,
  abrEwmaSlowLive: 9.0,
  abrEwmaFastVoD: 3.0,
  abrEwmaSlowVoD: 9.0,
  abrEwmaDefaultEstimate: 5000000,
  abrBandWidthFactor: 0.95,
  abrBandWidthUpFactor: 0.7,
  abrMaxWithRealBitrate: false,
  minAutoBitrate: 0,
  fragLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 15000,
      maxLoadTimeMs: 120000,
      timeoutRetry: { maxNumRetry: 4, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
      errorRetry: { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
    },
  },
  manifestLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10000,
      maxLoadTimeMs: 20000,
      timeoutRetry: { maxNumRetry: 4, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
      errorRetry: { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
    },
  },
  playlistLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10000,
      maxLoadTimeMs: 20000,
      timeoutRetry: { maxNumRetry: 4, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
      errorRetry: { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
    },
  },
};
