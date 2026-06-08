import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type Firestore,
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

function sceneDocRef(db: Firestore, uid: string, kind: SceneKind, sceneId: string) {
  return doc(db, "users", uid, kind, sceneId);
}

export async function addScene(
  db: Firestore,
  uid: string,
  kind: SceneKind,
  scene: AddSceneInput,
): Promise<void> {
  await setDoc(
    sceneDocRef(db, uid, kind, scene.sceneId),
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
  await deleteDoc(sceneDocRef(db, uid, kind, sceneId));
}

export async function fetchScenes(
  db: Firestore,
  uid: string,
  kind: SceneKind,
): Promise<SavedScene[]> {
  const q = query(scenesCollection(db, uid, kind), orderBy("addedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const addedAt = data.addedAt instanceof Timestamp ? data.addedAt.toDate() : null;
    return {
      sceneId: typeof data.sceneId === "string" ? data.sceneId : docSnap.id,
      title: typeof data.title === "string" ? data.title : "",
      href: typeof data.href === "string" ? data.href : "",
      addedAt,
    };
  });
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
