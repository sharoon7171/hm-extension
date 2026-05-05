import type { Unsubscribe } from "firebase/firestore";
import { getFirebaseAuth } from "../firebase/auth";
import { getBackgroundFirestore } from "../firebase/firestore-background";
import {
  addFavoriteScene,
  deleteAllFavoriteScenes,
  removeFavoriteScene,
  subscribeFavoriteScenes,
  type AddSceneInput,
} from "../firebase/scenes";
import {
  EMPTY_FAVORITE_SCENES_CACHE,
  readFavoriteScenesCache,
  writeFavoriteScenesCache,
  type CachedFavoriteScene,
  type FavoriteScenesCache,
} from "../shared/scenes-cache";

let snapshotUnsubscribe: Unsubscribe | null = null;
let authUnsubscribe: (() => void) | null = null;
let activeUid: string | null = null;
let inMemory: FavoriteScenesCache = { ...EMPTY_FAVORITE_SCENES_CACHE };

export async function startScenesMirror(): Promise<void> {
  if (authUnsubscribe) return;
  inMemory = await readFavoriteScenesCache();
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
  detachSnapshot();
  activeUid = null;
  inMemory = { uid: null, scenes: {}, ready: true };
  await writeFavoriteScenesCache(inMemory);
}

async function attachToUser(uid: string): Promise<void> {
  if (activeUid === uid && snapshotUnsubscribe) return;
  detachSnapshot();
  activeUid = uid;
  if (inMemory.uid !== uid) {
    inMemory = { uid, scenes: {}, ready: false };
    await writeFavoriteScenesCache(inMemory);
  } else {
    inMemory = { ...inMemory, ready: false };
    await writeFavoriteScenesCache(inMemory);
  }
  const db = getBackgroundFirestore();
  snapshotUnsubscribe = subscribeFavoriteScenes(
    db,
    uid,
    async scenes => {
      const next: Record<string, CachedFavoriteScene> = {};
      for (const scene of scenes) {
        next[scene.sceneId] = {
          sceneId: scene.sceneId,
          title: scene.title,
          href: scene.href,
          addedAt: scene.addedAt ? scene.addedAt.getTime() : null,
        };
      }
      inMemory = { uid, scenes: next, ready: true };
      await writeFavoriteScenesCache(inMemory);
    },
    error => {
      console.warn("[hotmovies-ext] favorite scenes snapshot error", error);
    },
  );
}

function detachSnapshot(): void {
  if (snapshotUnsubscribe) {
    snapshotUnsubscribe();
    snapshotUnsubscribe = null;
  }
}

export async function ensureMirrorReady(): Promise<FavoriteScenesCache> {
  if (inMemory.ready) return inMemory;
  inMemory = await readFavoriteScenesCache();
  return inMemory;
}

export async function addFavoriteSceneIdempotent(
  scene: AddSceneInput,
): Promise<{ written: boolean }> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  await ensureMirrorReady();
  const existing = inMemory.scenes[scene.sceneId];
  if (
    existing &&
    existing.title === scene.title &&
    existing.href === scene.href
  ) {
    return { written: false };
  }
  const db = getBackgroundFirestore();
  await addFavoriteScene(db, user.uid, scene);
  optimisticallyAdd(user.uid, scene);
  return { written: true };
}

export async function removeFavoriteSceneIdempotent(
  sceneId: string,
): Promise<{ written: boolean }> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  await ensureMirrorReady();
  if (!inMemory.scenes[sceneId]) {
    return { written: false };
  }
  const db = getBackgroundFirestore();
  await removeFavoriteScene(db, user.uid, sceneId);
  optimisticallyRemove(user.uid, sceneId);
  return { written: true };
}

export async function deleteAllFavoriteScenesIdempotent(): Promise<{
  deleted: number;
}> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  const db = getBackgroundFirestore();
  const deleted = await deleteAllFavoriteScenes(db, user.uid);
  inMemory = { uid: user.uid, scenes: {}, ready: true };
  await writeFavoriteScenesCache(inMemory);
  return { deleted };
}

function optimisticallyAdd(uid: string, scene: AddSceneInput): void {
  const next: FavoriteScenesCache = {
    uid,
    scenes: {
      ...inMemory.scenes,
      [scene.sceneId]: {
        sceneId: scene.sceneId,
        title: scene.title,
        href: scene.href,
        addedAt: Date.now(),
      },
    },
    ready: inMemory.ready,
  };
  inMemory = next;
  void writeFavoriteScenesCache(next);
}

function optimisticallyRemove(uid: string, sceneId: string): void {
  if (!inMemory.scenes[sceneId]) return;
  const { [sceneId]: _omit, ...rest } = inMemory.scenes;
  void _omit;
  const next: FavoriteScenesCache = {
    uid,
    scenes: rest,
    ready: inMemory.ready,
  };
  inMemory = next;
  void writeFavoriteScenesCache(next);
}
