const CHANNEL_NAME = "hotmovies-custom-player-bandwidth";

type Message = {
  type: "claim";
  playerId: string;
};

export type BandwidthLock = {
  claim: () => void;
  release: () => void;
  isOwner: () => boolean;
  destroy: () => void;
};

export function createBandwidthLock(): BandwidthLock {
  const playerId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let owner = false;
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = event => {
      const data = event.data as Message | null;
      if (!data || data.type !== "claim") return;
      if (data.playerId === playerId) return;
      if (!owner) return;
      owner = false;
    };
  } catch {
    channel = null;
  }

  const claim = (): void => {
    if (owner) return;
    owner = true;
    channel?.postMessage({ type: "claim", playerId } satisfies Message);
  };

  const release = (): void => {
    owner = false;
  };

  const destroy = (): void => {
    owner = false;
    channel?.close();
    channel = null;
  };

  return {
    claim,
    release,
    isOwner: () => owner,
    destroy,
  };
}
