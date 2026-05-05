export type CachedFavoriteScene = {
  sceneId: string;
  title: string;
  href: string;
  addedAt: number | null;
};

export type FavoriteScenesCache = {
  uid: string | null;
  scenes: Record<string, CachedFavoriteScene>;
  ready: boolean;
};

export const FAVORITE_SCENES_CACHE_KEY = "favoriteScenesCache";

export const EMPTY_FAVORITE_SCENES_CACHE: FavoriteScenesCache = {
  uid: null,
  scenes: {},
  ready: false,
};

function normalize(value: unknown): FavoriteScenesCache {
  if (!value || typeof value !== "object") return EMPTY_FAVORITE_SCENES_CACHE;
  const raw = value as Partial<FavoriteScenesCache>;
  const scenes =
    raw.scenes && typeof raw.scenes === "object" && !Array.isArray(raw.scenes)
      ? (raw.scenes as Record<string, CachedFavoriteScene>)
      : {};
  return {
    uid: typeof raw.uid === "string" ? raw.uid : null,
    scenes,
    ready: raw.ready === true,
  };
}

export async function readFavoriteScenesCache(): Promise<FavoriteScenesCache> {
  const got = await chrome.storage.local.get(FAVORITE_SCENES_CACHE_KEY);
  return normalize(got[FAVORITE_SCENES_CACHE_KEY]);
}

export async function writeFavoriteScenesCache(
  next: FavoriteScenesCache,
): Promise<void> {
  await chrome.storage.local.set({ [FAVORITE_SCENES_CACHE_KEY]: next });
}

export function watchFavoriteScenesCache(
  onChange: (cache: FavoriteScenesCache) => void,
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName,
  ) => {
    if (area !== "local") return;
    if (!(FAVORITE_SCENES_CACHE_KEY in changes)) return;
    onChange(normalize(changes[FAVORITE_SCENES_CACHE_KEY].newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function sortedScenes(cache: FavoriteScenesCache): CachedFavoriteScene[] {
  return Object.values(cache.scenes).sort((a, b) => {
    const ax = a.addedAt ?? 0;
    const bx = b.addedAt ?? 0;
    if (ax === bx) return a.sceneId.localeCompare(b.sceneId);
    return bx - ax;
  });
}
