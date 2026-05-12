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

function storageKey(kind: SceneCacheKind): string {
  return STORAGE_KEYS[kind];
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

type OptimisticAddInput = {
  sceneId: string;
  title: string;
  href: string;
};

export async function applyOptimisticAdd(
  kind: SceneCacheKind,
  scene: OptimisticAddInput,
): Promise<void> {
  const current = await readScenesCache(kind);
  const existing = current.scenes[scene.sceneId];
  if (
    existing &&
    existing.title === scene.title &&
    existing.href === scene.href
  ) {
    return;
  }
  const next: ScenesCache = {
    uid: current.uid,
    scenes: {
      ...current.scenes,
      [scene.sceneId]: {
        sceneId: scene.sceneId,
        title: scene.title,
        href: scene.href,
        addedAt: existing?.addedAt ?? Date.now(),
      },
    },
    ready: current.ready,
  };
  await writeScenesCache(kind, next);
}

export async function applyOptimisticRemove(
  kind: SceneCacheKind,
  sceneId: string,
): Promise<void> {
  const current = await readScenesCache(kind);
  if (!(sceneId in current.scenes)) return;
  const { [sceneId]: _omit, ...rest } = current.scenes;
  void _omit;
  await writeScenesCache(kind, {
    uid: current.uid,
    scenes: rest,
    ready: current.ready,
  });
}

export const SCENES_CACHE_BROADCAST_TYPE = "scenesCacheUpdated" as const;

export type ScenesCacheBroadcast = {
  type: typeof SCENES_CACHE_BROADCAST_TYPE;
  kind: SceneCacheKind;
  cache: ScenesCache;
};

function isScenesCacheBroadcast(value: unknown): value is ScenesCacheBroadcast {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.type === SCENES_CACHE_BROADCAST_TYPE &&
    (v.kind === "favorite" || v.kind === "hidden")
  );
}

export function watchScenesCache(
  kind: SceneCacheKind,
  onChange: (cache: ScenesCache) => void,
): () => void {
  const key = storageKey(kind);
  const fromStorage = (
    changes: { [k: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName,
  ) => {
    if (area !== "local") return;
    if (!(key in changes)) return;
    onChange(normalize(changes[key].newValue));
  };
  const fromMessage = (message: unknown) => {
    if (!isScenesCacheBroadcast(message)) return;
    if (message.kind !== kind) return;
    onChange(normalize(message.cache));
  };
  chrome.storage.onChanged.addListener(fromStorage);
  chrome.runtime.onMessage.addListener(fromMessage);
  return () => {
    chrome.storage.onChanged.removeListener(fromStorage);
    chrome.runtime.onMessage.removeListener(fromMessage);
  };
}

export function sortedScenes(cache: ScenesCache): CachedScene[] {
  return Object.values(cache.scenes).sort((a, b) => {
    const ax = a.addedAt ?? 0;
    const bx = b.addedAt ?? 0;
    if (ax === bx) return a.sceneId.localeCompare(b.sceneId);
    return bx - ax;
  });
}
