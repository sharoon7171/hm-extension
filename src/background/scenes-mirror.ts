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
  applyOptimisticAdd,
  applyOptimisticRemove,
  readScenesCache,
  SCENE_CACHE_KINDS,
  SCENES_CACHE_BROADCAST_TYPE,
  watchScenesCache,
  writeScenesCache,
  type CachedScene,
  type SceneCacheKind,
  type ScenesCache,
  type ScenesCacheBroadcast,
} from "../shared/scenes-cache";

const HOTMOVIES_TAB_FILTER = "https://www.hotmovies.com/*";

type Entry = {
  cacheKind: SceneCacheKind;
  collectionKind: SceneKind;
  inMemory: ScenesCache;
  unsubscribeSnapshot: Unsubscribe | null;
  unsubscribeCache: (() => void) | null;
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
    const entry: Entry = {
      cacheKind: kind,
      collectionKind: COLLECTION_KIND[kind],
      inMemory: await readScenesCache(kind),
      unsubscribeSnapshot: null,
      unsubscribeCache: null,
    };
    entry.unsubscribeCache = watchScenesCache(kind, cache => {
      entry.inMemory = cache;
      void broadcastCacheUpdate(kind, cache);
    });
    entries.set(kind, entry);
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
    const next: ScenesCache = { uid: null, scenes: {}, ready: true };
    entry.inMemory = next;
    await writeScenesCache(entry.cacheKind, next);
  }
}

async function attachToUser(uid: string): Promise<void> {
  const db = getBackgroundFirestore();
  for (const entry of entries.values()) {
    if (entry.unsubscribeSnapshot && entry.inMemory.uid === uid) continue;
    detachSnapshot(entry);
    if (entry.inMemory.uid !== uid) {
      entry.inMemory = { uid, scenes: {}, ready: false };
      await writeScenesCache(entry.cacheKind, entry.inMemory);
    } else if (entry.inMemory.ready) {
      entry.inMemory = { ...entry.inMemory, ready: false };
      await writeScenesCache(entry.cacheKind, entry.inMemory);
    }
    entry.unsubscribeSnapshot = subscribeScenes(
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
        const merged: ScenesCache = { uid, scenes: next, ready: true };
        entry.inMemory = merged;
        await writeScenesCache(entry.cacheKind, merged);
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
  if (entry.unsubscribeSnapshot) {
    entry.unsubscribeSnapshot();
    entry.unsubscribeSnapshot = null;
  }
}

async function broadcastCacheUpdate(
  kind: SceneCacheKind,
  cache: ScenesCache,
): Promise<void> {
  const tabs = await chrome.tabs.query({ url: HOTMOVIES_TAB_FILTER });
  const message: ScenesCacheBroadcast = {
    type: SCENES_CACHE_BROADCAST_TYPE,
    kind,
    cache,
  };
  await Promise.all(
    tabs.map(tab =>
      tab.id === undefined
        ? Promise.resolve()
        : chrome.tabs.sendMessage(tab.id, message).catch(error => void error),
    ),
  );
}

function entryFor(kind: SceneKind): Entry {
  const cacheKind: SceneCacheKind = kind === "favoriteScenes" ? "favorite" : "hidden";
  const entry = entries.get(cacheKind);
  if (!entry) throw new Error("scenes mirror not started");
  return entry;
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
  const otherCacheKind: SceneCacheKind =
    otherKind === "favoriteScenes" ? "favorite" : "hidden";
  const existing = entry.inMemory.scenes[scene.sceneId];
  const sameDoc =
    existing &&
    existing.title === scene.title &&
    existing.href === scene.href;
  const otherEntry = entries.get(otherCacheKind);
  const otherHasIt = !!otherEntry?.inMemory.scenes[scene.sceneId];
  await applyOptimisticAdd(entry.cacheKind, scene);
  await applyOptimisticRemove(otherCacheKind, scene.sceneId);
  const db = getBackgroundFirestore();
  const writes: Promise<unknown>[] = [];
  if (!sameDoc) writes.push(addScene(db, uid, kind, scene));
  if (otherHasIt) writes.push(removeScene(db, uid, otherKind, scene.sceneId));
  await Promise.all(writes);
  return { written: !sameDoc };
}

export async function removeSceneIdempotent(
  kind: SceneKind,
  sceneId: string,
): Promise<{ written: boolean }> {
  const uid = requireUid();
  const entry = entryFor(kind);
  const present = sceneId in entry.inMemory.scenes;
  await applyOptimisticRemove(entry.cacheKind, sceneId);
  if (!present) return { written: false };
  const db = getBackgroundFirestore();
  await removeScene(db, uid, kind, sceneId);
  return { written: true };
}

export async function deleteAllScenesIdempotent(
  kind: SceneKind,
): Promise<{ deleted: number }> {
  const uid = requireUid();
  const entry = entryFor(kind);
  const next: ScenesCache = { uid, scenes: {}, ready: true };
  entry.inMemory = next;
  await writeScenesCache(entry.cacheKind, next);
  const db = getBackgroundFirestore();
  return { deleted: await deleteAllScenes(db, uid, kind) };
}
