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

function parseIframeParams(iframe: HTMLIFrameElement): IframeParams | null {
  if (!iframe.src) return null;
  const url = new URL(iframe.src);
  const apiKey = url.searchParams.get("site");
  const key = url.searchParams.get("key");
  const sig = url.searchParams.get("sig");
  const timestamp = url.searchParams.get("timestamp");
  const type = url.searchParams.get("type") ?? "scene";
  const sceneId = Number(url.searchParams.get("scene_id"));
  const itemId = Number(url.searchParams.get("item_id"));
  if (!apiKey || !key || !sig || !timestamp) return null;
  if (!Number.isFinite(sceneId) || !Number.isFinite(itemId)) return null;
  return {
    apiKey,
    encryptedCustomerId: key,
    signature: sig,
    timestamp,
    streamType: type,
    sceneId,
    itemId,
  };
}

export async function loadSceneSource(
  iframe: HTMLIFrameElement,
  signal: AbortSignal,
): Promise<SceneSource> {
  const params = parseIframeParams(iframe);
  if (!params) throw new Error("Player iframe URL is missing required parameters.");
  const body = {
    item_id: params.itemId,
    encrypted_customer_id: params.encryptedCustomerId,
    signature: params.signature,
    timestamp: params.timestamp,
    stream_type: params.streamType,
    initiate_tracking: false,
    forcehd: false,
    scene_id: params.sceneId,
  };
  const response = await fetch(VERIFY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "api_key": params.apiKey,
    },
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
