export type SceneCacheKind = "favorite" | "hidden";

export const SCENE_CACHE_KINDS: readonly SceneCacheKind[] = [
  "favorite",
  "hidden",
] as const;

export type CachedScene = {
  sceneId: string;
  title: string;
  href: string;
  addedAt: number | null;
};

export type ScenesCache = {
  uid: string | null;
  scenes: Record<string, CachedScene>;
  ready: boolean;
};

const STORAGE_KEYS: Record<SceneCacheKind, string> = {
  favorite: "favoriteScenesCache",
  hidden: "hiddenScenesCache",
};

export const EMPTY_SCENES_CACHE: ScenesCache = {
  uid: null,
  scenes: {},
  ready: false,
};

export function storageKey(kind: SceneCacheKind): string {
  return STORAGE_KEYS[kind];
}

export function isSceneCacheKey(key: string): key is string {
  return key === STORAGE_KEYS.favorite || key === STORAGE_KEYS.hidden;
}

export function kindFromStorageKey(key: string): SceneCacheKind | null {
  if (key === STORAGE_KEYS.favorite) return "favorite";
  if (key === STORAGE_KEYS.hidden) return "hidden";
  return null;
}

function normalize(value: unknown): ScenesCache {
  if (!value || typeof value !== "object") return EMPTY_SCENES_CACHE;
  const raw = value as Partial<ScenesCache>;
  const scenes =
    raw.scenes && typeof raw.scenes === "object" && !Array.isArray(raw.scenes)
      ? (raw.scenes as Record<string, CachedScene>)
      : {};
  return {
    uid: typeof raw.uid === "string" ? raw.uid : null,
    scenes,
    ready: raw.ready === true,
  };
}

export async function readScenesCache(kind: SceneCacheKind): Promise<ScenesCache> {
  const key = storageKey(kind);
  const got = await chrome.storage.local.get(key);
  return normalize(got[key]);
}

export async function writeScenesCache(
  kind: SceneCacheKind,
  next: ScenesCache,
): Promise<void> {
  const key = storageKey(kind);
  await chrome.storage.local.set({ [key]: next });
}

export function watchScenesCache(
  kind: SceneCacheKind,
  onChange: (cache: ScenesCache) => void,
): () => void {
  const key = storageKey(kind);
  const listener = (
    changes: { [k: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName,
  ) => {
    if (area !== "local") return;
    if (!(key in changes)) return;
    onChange(normalize(changes[key].newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function sortedScenes(cache: ScenesCache): CachedScene[] {
  return Object.values(cache.scenes).sort((a, b) => {
    const ax = a.addedAt ?? 0;
    const bx = b.addedAt ?? 0;
    if (ax === bx) return a.sceneId.localeCompare(b.sceneId);
    return bx - ax;
  });
}
