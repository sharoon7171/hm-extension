import type { Unsubscribe } from "firebase/firestore";
import { getFirebaseAuth } from "../firebase/auth";
import { getBackgroundFirestore } from "../firebase/firestore-background";
import {
  addScene,
  deleteAllScenes,
  readSceneDoc,
  removeScene,
  sameSceneInput,
  sceneDocExists,
  subscribeScenes,
  type AddSceneInput,
  type SceneKind,
} from "../firebase/scenes";
import { writeAuthSnapshot } from "../shared/auth-snapshot";
import {
  cachesEqual,
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
  unsubscribeSnapshot: Unsubscribe | null;
  activeUid: string | null;
};

const COLLECTION_KIND: Record<SceneCacheKind, SceneKind> = {
  favorite: "favoriteScenes",
  hidden: "hiddenScenes",
};

const entries = new Map<SceneCacheKind, Entry>();
let authUnsubscribe: (() => void) | null = null;

function persistAuthSnapshot(user: { uid: string; email: string | null } | null): void {
  void writeAuthSnapshot({
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    ready: true,
  });
}

export async function readBackgroundAuthState(): Promise<{
  uid: string | null;
  email: string | null;
  ready: boolean;
}> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  const snapshot = {
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    ready: true,
  };
  await writeAuthSnapshot(snapshot);
  return snapshot;
}

export async function startScenesMirror(): Promise<void> {
  if (authUnsubscribe) return;
  for (const kind of SCENE_CACHE_KINDS) {
    entries.set(kind, {
      cacheKind: kind,
      collectionKind: COLLECTION_KIND[kind],
      unsubscribeSnapshot: null,
      activeUid: null,
    });
  }
  const auth = getFirebaseAuth();
  authUnsubscribe = auth.onAuthStateChanged(user => {
    persistAuthSnapshot(user);
    if (!user) {
      void resetForSignedOut();
      return;
    }
    void attachToUser(user.uid);
  });
  void auth.authStateReady().then(() => {
    persistAuthSnapshot(auth.currentUser);
  });
}

async function resetForSignedOut(): Promise<void> {
  for (const entry of entries.values()) {
    detachSnapshot(entry);
    entry.activeUid = null;
    await writeScenesCacheIfChanged(entry.cacheKind, {
      uid: null,
      scenes: {},
      ready: true,
    });
  }
}

async function attachToUser(uid: string): Promise<void> {
  const db = getBackgroundFirestore();
  for (const entry of entries.values()) {
    if (entry.unsubscribeSnapshot && entry.activeUid === uid) continue;
    detachSnapshot(entry);
    entry.activeUid = uid;
    const current = await readScenesCache(entry.cacheKind);
    if (current.uid !== uid) {
      await writeScenesCacheIfChanged(entry.cacheKind, {
        uid,
        scenes: {},
        ready: false,
      });
    }
    entry.unsubscribeSnapshot = subscribeScenes(
      db,
      uid,
      entry.collectionKind,
      async scenes => {
        const next = scenesCacheFromFirestore(uid, scenes);
        await writeScenesCacheIfChanged(entry.cacheKind, next);
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

function scenesCacheFromFirestore(
  uid: string,
  scenes: {
    sceneId: string;
    title: string;
    href: string;
    addedAt: Date | null;
  }[],
): ScenesCache {
  const next: Record<string, CachedScene> = {};
  for (const scene of scenes) {
    next[scene.sceneId] = {
      sceneId: scene.sceneId,
      title: scene.title,
      href: scene.href,
      addedAt: scene.addedAt ? scene.addedAt.getTime() : null,
    };
  }
  return { uid, scenes: next, ready: true };
}

async function writeScenesCacheIfChanged(
  kind: SceneCacheKind,
  next: ScenesCache,
): Promise<void> {
  const current = await readScenesCache(kind);
  if (cachesEqual(current, next)) return;
  await writeScenesCache(kind, next);
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
  const otherKind: SceneKind =
    kind === "favoriteScenes" ? "hiddenScenes" : "favoriteScenes";
  const db = getBackgroundFirestore();
  const writes: Promise<unknown>[] = [];
  const existing = await readSceneDoc(db, uid, kind, scene.sceneId);
  if (!existing || !sameSceneInput(existing, scene)) {
    writes.push(addScene(db, uid, kind, scene));
  }
  if (await sceneDocExists(db, uid, otherKind, scene.sceneId)) {
    writes.push(removeScene(db, uid, otherKind, scene.sceneId));
  }
  if (writes.length === 0) return { written: false };
  await Promise.all(writes);
  return { written: true };
}

export async function removeSceneIdempotent(
  kind: SceneKind,
  sceneId: string,
): Promise<{ written: boolean }> {
  const uid = requireUid();
  const db = getBackgroundFirestore();
  if (!(await sceneDocExists(db, uid, kind, sceneId))) {
    return { written: false };
  }
  await removeScene(db, uid, kind, sceneId);
  return { written: true };
}

export async function deleteAllScenesIdempotent(
  kind: SceneKind,
): Promise<{ deleted: number }> {
  const uid = requireUid();
  const entry = entryFor(kind);
  await writeScenesCacheIfChanged(entry.cacheKind, {
    uid,
    scenes: {},
    ready: true,
  });
  const db = getBackgroundFirestore();
  return { deleted: await deleteAllScenes(db, uid, kind) };
}
