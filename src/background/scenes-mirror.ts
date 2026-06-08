import { getFirebaseAuth } from "../firebase/auth";
import { getBackgroundFirestore } from "../firebase/firestore-background";
import {
  addScene,
  deleteAllScenes,
  fetchScenes,
  removeScene,
  type AddSceneInput,
  type SceneKind,
} from "../firebase/scenes";
import { writeAuthSnapshot } from "../shared/auth-snapshot";
import {
  mergePulledScenes,
  readScenesCache,
  SCENE_CACHE_KINDS,
  writeScenesCache,
  type CachedScene,
  type SceneCacheKind,
  type ScenesCache,
} from "../shared/scenes-cache";
import { clearAllPending } from "./scenes-pending-sync";

const COLLECTION_KIND: Record<SceneCacheKind, SceneKind> = {
  favorite: "favoriteScenes",
  hidden: "hiddenScenes",
};

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
  const auth = getFirebaseAuth();
  authUnsubscribe = auth.onAuthStateChanged(user => {
    persistAuthSnapshot(user);
    if (!user) {
      void resetForSignedOut();
      return;
    }
    void syncPendingThenPull(user.uid);
  });
  void auth.authStateReady().then(() => {
    persistAuthSnapshot(auth.currentUser);
  });
}

async function resetForSignedOut(): Promise<void> {
  await clearAllPending();
  for (const kind of SCENE_CACHE_KINDS) {
    await writeScenesCache(kind, {
      uid: null,
      scenes: {},
      ready: true,
    });
  }
}

async function pullRemoteScenes(uid: string): Promise<void> {
  const db = getBackgroundFirestore();
  for (const kind of SCENE_CACHE_KINDS) {
    const local = await readScenesCache(kind);
    if (local.uid !== uid) {
      await writeScenesCache(kind, { uid, scenes: {}, ready: false });
    }
    try {
      const remoteRows = await fetchScenes(db, uid, COLLECTION_KIND[kind]);
      const remote = scenesCacheFromFirestore(uid, remoteRows);
      const current = await readScenesCache(kind);
      const merged = mergePulledScenes(current, remote, uid);
      await writeScenesCache(kind, merged);
    } catch (error) {
      console.warn(`[hotmovies-ext] pull ${COLLECTION_KIND[kind]} failed`, error);
      const current = await readScenesCache(kind);
      if (!current.ready) {
        await writeScenesCache(kind, { uid: current.uid ?? uid, scenes: current.scenes, ready: true });
      }
    }
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

async function requireUid(): Promise<string> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  return user.uid;
}

async function syncPendingThenPull(uid: string): Promise<void> {
  const { flushPendingScenes } = await import("./firestore-sync");
  await flushPendingScenes();
  await pullRemoteScenes(uid);
}

export async function addSceneIdempotent(
  kind: SceneKind,
  scene: AddSceneInput,
): Promise<void> {
  const uid = await requireUid();
  const otherKind: SceneKind =
    kind === "favoriteScenes" ? "hiddenScenes" : "favoriteScenes";
  const db = getBackgroundFirestore();
  await addScene(db, uid, kind, scene);
  await removeScene(db, uid, otherKind, scene.sceneId);
}

export async function removeSceneIdempotent(
  kind: SceneKind,
  sceneId: string,
): Promise<void> {
  const uid = await requireUid();
  const db = getBackgroundFirestore();
  await removeScene(db, uid, kind, sceneId);
}

export async function deleteAllScenesIdempotent(
  kind: SceneKind,
): Promise<{ deleted: number }> {
  const uid = await requireUid();
  const cacheKind: SceneCacheKind = kind === "favoriteScenes" ? "favorite" : "hidden";
  await writeScenesCache(cacheKind, {
    uid,
    scenes: {},
    ready: true,
  });
  const db = getBackgroundFirestore();
  return { deleted: await deleteAllScenes(db, uid, kind) };
}
