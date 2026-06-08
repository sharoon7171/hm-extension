import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";

const SCENES_BATCH_SIZE = 400;

export type SceneKind = "favoriteScenes" | "hiddenScenes";

type SavedScene = {
  sceneId: string;
  title: string;
  href: string;
  addedAt: Date | null;
};

export type AddSceneInput = {
  sceneId: string;
  title: string;
  href: string;
};

function scenesCollection(db: Firestore, uid: string, kind: SceneKind) {
  return collection(db, "users", uid, kind);
}

function sceneDoc(db: Firestore, uid: string, kind: SceneKind, sceneId: string) {
  return doc(db, "users", uid, kind, sceneId);
}

export function sameSceneInput(a: AddSceneInput, b: AddSceneInput): boolean {
  return a.sceneId === b.sceneId && a.title === b.title && a.href === b.href;
}

export async function readSceneDoc(
  db: Firestore,
  uid: string,
  kind: SceneKind,
  sceneId: string,
): Promise<AddSceneInput | null> {
  const snap = await getDoc(sceneDoc(db, uid, kind, sceneId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    sceneId: typeof data.sceneId === "string" ? data.sceneId : sceneId,
    title: typeof data.title === "string" ? data.title : "",
    href: typeof data.href === "string" ? data.href : "",
  };
}

export async function sceneDocExists(
  db: Firestore,
  uid: string,
  kind: SceneKind,
  sceneId: string,
): Promise<boolean> {
  const snap = await getDoc(sceneDoc(db, uid, kind, sceneId));
  return snap.exists();
}

export async function addScene(
  db: Firestore,
  uid: string,
  kind: SceneKind,
  scene: AddSceneInput,
): Promise<void> {
  await setDoc(
    sceneDoc(db, uid, kind, scene.sceneId),
    {
      sceneId: scene.sceneId,
      title: scene.title,
      href: scene.href,
      addedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function removeScene(
  db: Firestore,
  uid: string,
  kind: SceneKind,
  sceneId: string,
): Promise<void> {
  await deleteDoc(sceneDoc(db, uid, kind, sceneId));
}

export function subscribeScenes(
  db: Firestore,
  uid: string,
  kind: SceneKind,
  onChange: (scenes: SavedScene[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(scenesCollection(db, uid, kind), orderBy("addedAt", "desc"));
  return onSnapshot(
    q,
    snapshot => {
      const scenes: SavedScene[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const addedAt = data.addedAt instanceof Timestamp ? data.addedAt.toDate() : null;
        return {
          sceneId: typeof data.sceneId === "string" ? data.sceneId : docSnap.id,
          title: typeof data.title === "string" ? data.title : "",
          href: typeof data.href === "string" ? data.href : "",
          addedAt,
        };
      });
      onChange(scenes);
    },
    error => onError(error as Error),
  );
}

export async function deleteAllScenes(
  db: Firestore,
  uid: string,
  kind: SceneKind,
): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await getDocs(scenesCollection(db, uid, kind));
    if (snap.empty) break;
    const docs = snap.docs.slice(0, SCENES_BATCH_SIZE);
    const batch = writeBatch(db);
    for (const d of docs) batch.delete(d.ref);
    await batch.commit();
    deleted += docs.length;
    if (snap.docs.length <= SCENES_BATCH_SIZE) break;
  }
  return deleted;
}
