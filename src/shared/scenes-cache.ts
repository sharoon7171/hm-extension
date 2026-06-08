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

export function cachesEqual(a: ScenesCache, b: ScenesCache): boolean {
  if (a.uid !== b.uid || a.ready !== b.ready) return false;
  const aKeys = Object.keys(a.scenes).sort();
  const bKeys = Object.keys(b.scenes).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    if (aKeys[i] !== bKeys[i]) return false;
    const left = a.scenes[aKeys[i]];
    const right = b.scenes[bKeys[i]];
    if (
      left.sceneId !== right.sceneId ||
      left.title !== right.title ||
      left.href !== right.href
    ) {
      return false;
    }
  }
  return true;
}

export async function writeScenesCache(
  kind: SceneCacheKind,
  next: ScenesCache,
): Promise<void> {
  const key = storageKey(kind);
  const normalized = normalize(next);
  const current = await readScenesCache(kind);
  if (cachesEqual(current, normalized)) return;
  await chrome.storage.local.set({ [key]: normalized });
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
  chrome.storage.onChanged.addListener(fromStorage);
  return () => {
    chrome.storage.onChanged.removeListener(fromStorage);
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
