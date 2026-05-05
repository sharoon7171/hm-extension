import type { Unsubscribe } from "firebase/firestore";
import { getFirebaseAuth } from "../firebase/auth";
import { getBackgroundFirestore } from "../firebase/firestore-background";
import {
  addScene,
  deleteAllScenes,
  removeScene,
  subscribeScenes,
  type AddSceneInput,
  type SceneKind,
} from "../firebase/scenes";
import {
  EMPTY_SCENES_CACHE,
  readScenesCache,
  SCENE_CACHE_KINDS,
  writeScenesCache,
  type CachedScene,
  type SceneCacheKind,
  type ScenesCache,
} from "../shared/scenes-cache";

type Entry = {
  cacheKind: SceneCacheKind;
  collectionKind: SceneKind;
  inMemory: ScenesCache;
  unsubscribe: Unsubscribe | null;
};

const COLLECTION_KIND: Record<SceneCacheKind, SceneKind> = {
  favorite: "favoriteScenes",
  hidden: "hiddenScenes",
};

const entries = new Map<SceneCacheKind, Entry>();
let authUnsubscribe: (() => void) | null = null;

export async function startScenesMirror(): Promise<void> {
  if (authUnsubscribe) return;
  for (const kind of SCENE_CACHE_KINDS) {
    entries.set(kind, {
      cacheKind: kind,
      collectionKind: COLLECTION_KIND[kind],
      inMemory: await readScenesCache(kind),
      unsubscribe: null,
    });
  }
  const auth = getFirebaseAuth();
  authUnsubscribe = auth.onAuthStateChanged(user => {
    if (!user) {
      void resetForSignedOut();
      return;
    }
    void attachToUser(user.uid);
  });
}

async function resetForSignedOut(): Promise<void> {
  for (const entry of entries.values()) {
    detachSnapshot(entry);
    entry.inMemory = { uid: null, scenes: {}, ready: true };
    await writeScenesCache(entry.cacheKind, entry.inMemory);
  }
}

async function attachToUser(uid: string): Promise<void> {
  const db = getBackgroundFirestore();
  for (const entry of entries.values()) {
    if (entry.unsubscribe && entry.inMemory.uid === uid) continue;
    detachSnapshot(entry);
    if (entry.inMemory.uid !== uid) {
      entry.inMemory = { uid, scenes: {}, ready: false };
    } else {
      entry.inMemory = { ...entry.inMemory, ready: false };
    }
    await writeScenesCache(entry.cacheKind, entry.inMemory);
    entry.unsubscribe = subscribeScenes(
      db,
      uid,
      entry.collectionKind,
      async scenes => {
        const next: Record<string, CachedScene> = {};
        for (const scene of scenes) {
          next[scene.sceneId] = {
            sceneId: scene.sceneId,
            title: scene.title,
            href: scene.href,
            addedAt: scene.addedAt ? scene.addedAt.getTime() : null,
          };
        }
        entry.inMemory = { uid, scenes: next, ready: true };
        await writeScenesCache(entry.cacheKind, entry.inMemory);
      },
      error => {
        console.warn(
          `[hotmovies-ext] ${entry.collectionKind} snapshot error`,
          error,
        );
      },
    );
  }
}

function detachSnapshot(entry: Entry): void {
  if (entry.unsubscribe) {
    entry.unsubscribe();
    entry.unsubscribe = null;
  }
}

function entryFor(kind: SceneKind): Entry {
  const cacheKind: SceneCacheKind = kind === "favoriteScenes" ? "favorite" : "hidden";
  const entry = entries.get(cacheKind);
  if (!entry) throw new Error("scenes mirror not started");
  return entry;
}

async function ensureReady(entry: Entry): Promise<void> {
  if (entry.inMemory.ready) return;
  entry.inMemory = await readScenesCache(entry.cacheKind);
}

function requireUid(): string {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  return user.uid;
}

export async function addSceneIdempotent(
  kind: SceneKind,
  scene: AddSceneInput,
): Promise<{ written: boolean }> {
  const uid = requireUid();
  const entry = entryFor(kind);
  const otherKind: SceneKind =
    kind === "favoriteScenes" ? "hiddenScenes" : "favoriteScenes";
  await ensureReady(entry);
  const existing = entry.inMemory.scenes[scene.sceneId];
  const sameDoc =
    existing &&
    existing.title === scene.title &&
    existing.href === scene.href;
  const db = getBackgroundFirestore();
  if (!sameDoc) {
    await addScene(db, uid, kind, scene);
    optimisticallyAdd(entry, uid, scene);
  }
  await removeSceneIdempotent(otherKind, scene.sceneId);
  return { written: !sameDoc };
}

export async function removeSceneIdempotent(
  kind: SceneKind,
  sceneId: string,
): Promise<{ written: boolean }> {
  const uid = requireUid();
  const entry = entryFor(kind);
  await ensureReady(entry);
  if (!entry.inMemory.scenes[sceneId]) {
    return { written: false };
  }
  const db = getBackgroundFirestore();
  await removeScene(db, uid, kind, sceneId);
  optimisticallyRemove(entry, uid, sceneId);
  return { written: true };
}

export async function deleteAllScenesIdempotent(
  kind: SceneKind,
): Promise<{ deleted: number }> {
  const uid = requireUid();
  const entry = entryFor(kind);
  const db = getBackgroundFirestore();
  const deleted = await deleteAllScenes(db, uid, kind);
  entry.inMemory = { uid, scenes: {}, ready: true };
  await writeScenesCache(entry.cacheKind, entry.inMemory);
  return { deleted };
}

function optimisticallyAdd(entry: Entry, uid: string, scene: AddSceneInput): void {
  const next: ScenesCache = {
    uid,
    scenes: {
      ...entry.inMemory.scenes,
      [scene.sceneId]: {
        sceneId: scene.sceneId,
        title: scene.title,
        href: scene.href,
        addedAt: Date.now(),
      },
    },
    ready: entry.inMemory.ready,
  };
  entry.inMemory = next;
  void writeScenesCache(entry.cacheKind, next);
}

function optimisticallyRemove(entry: Entry, uid: string, sceneId: string): void {
  if (!entry.inMemory.scenes[sceneId]) return;
  const { [sceneId]: _omit, ...rest } = entry.inMemory.scenes;
  void _omit;
  const next: ScenesCache = {
    uid,
    scenes: rest,
    ready: entry.inMemory.ready,
  };
  entry.inMemory = next;
  void writeScenesCache(entry.cacheKind, next);
}

export { EMPTY_SCENES_CACHE };
