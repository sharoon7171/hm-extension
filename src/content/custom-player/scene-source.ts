const VERIFY_ENDPOINT = "https://player.digiflix.video/verify";

type SceneSourceStream = {
  streamId: string;
  rate: number;
  height: number;
  width: number;
  label: string;
  videoBitrate: number;
  audioBitrate: number;
};

export type SceneSource = {
  itemId: number;
  sceneId: number;
  title: string;
  durationSeconds: number;
  playlistUrl: string;
  posterUrl: string | null;
  streams: SceneSourceStream[];
  isAuthorized: boolean;
};

type IframeParams = {
  apiKey: string;
  encryptedCustomerId: string;
  signature: string;
  timestamp: string;
  streamType: string;
  sceneId: number;
  itemId: number;
  signed: boolean;
};

type VerifyStream = {
  stream_id: string;
  rate: number;
  rate_text: string;
  source_height: number;
  source_width: number;
  video_bitrate: number;
  audio_bitrate: number;
};

type VerifyResponse = {
  vod_item_id: number;
  scene_length: number;
  vod_title: string;
  is_authorized: boolean;
  playlist_url: string;
  streams: VerifyStream[];
  item_detail?: { front_cover?: string };
};

function normalizeStreamType(type: string | null): string {
  const lower = (type ?? "scene").toLowerCase();
  if (lower === "previewscene") return "preview";
  if (lower === "movie") return "VOD";
  return type ?? "scene";
}

function isUnsignedStreamType(type: string): boolean {
  const lower = type.toLowerCase();
  return lower === "preview" || lower === "trailer";
}

function parseIframeParams(iframe: HTMLIFrameElement): IframeParams | null {
  if (!iframe.src) return null;
  const url = new URL(iframe.src);
  const sceneId = Number(url.searchParams.get("scene_id"));
  const itemId = Number(url.searchParams.get("item_id"));
  if (!Number.isFinite(sceneId) || !Number.isFinite(itemId)) return null;
  const streamType = normalizeStreamType(url.searchParams.get("type"));
  const apiKey = url.searchParams.get("site") ?? "";
  const key = url.searchParams.get("key") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  const timestamp = url.searchParams.get("timestamp") ?? "";
  if (isUnsignedStreamType(streamType)) {
    return {
      apiKey,
      encryptedCustomerId: "",
      signature: "",
      timestamp: "",
      streamType,
      sceneId,
      itemId,
      signed: false,
    };
  }
  if (!apiKey || !key || !sig || !timestamp) return null;
  return {
    apiKey,
    encryptedCustomerId: key,
    signature: sig,
    timestamp,
    streamType,
    sceneId,
    itemId,
    signed: true,
  };
}

export async function loadSceneSource(
  iframe: HTMLIFrameElement,
  signal: AbortSignal,
): Promise<SceneSource> {
  const params = parseIframeParams(iframe);
  if (!params) throw new Error("Player iframe URL is missing required parameters.");
  const body: Record<string, unknown> = {
    item_id: params.itemId,
    stream_type: params.streamType,
    initiate_tracking: false,
    forcehd: false,
    scene_id: params.sceneId,
  };
  if (params.signed) {
    body.encrypted_customer_id = params.encryptedCustomerId;
    body.signature = params.signature;
    body.timestamp = params.timestamp;
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (params.apiKey) headers.api_key = params.apiKey;
  const response = await fetch(VERIFY_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Verify request failed: ${response.status}`);
  }
  const data = (await response.json()) as VerifyResponse;
  if (!data.playlist_url) throw new Error("Verify response missing playlist URL.");
  return {
    itemId: data.vod_item_id,
    sceneId: params.sceneId,
    title: data.vod_title,
    durationSeconds: data.scene_length,
    playlistUrl: data.playlist_url,
    posterUrl: data.item_detail?.front_cover ?? null,
    streams: data.streams.map(toSceneStream),
    isAuthorized: data.is_authorized,
  };
}

function toSceneStream(stream: VerifyStream): SceneSourceStream {
  return {
    streamId: stream.stream_id,
    rate: stream.rate,
    height: stream.source_height,
    width: stream.source_width,
    label: stream.rate_text,
    videoBitrate: stream.video_bitrate,
    audioBitrate: stream.audio_bitrate,
  };
}
