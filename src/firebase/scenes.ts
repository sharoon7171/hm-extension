import {
  collection,
  deleteDoc,
  doc,
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

export type FavoriteScene = {
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

function scenesCollection(db: Firestore, uid: string) {
  return collection(db, "users", uid, "favoriteScenes");
}

function sceneDoc(db: Firestore, uid: string, sceneId: string) {
  return doc(db, "users", uid, "favoriteScenes", sceneId);
}

export async function addFavoriteScene(
  db: Firestore,
  uid: string,
  scene: AddSceneInput,
): Promise<void> {
  await setDoc(
    sceneDoc(db, uid, scene.sceneId),
    {
      sceneId: scene.sceneId,
      title: scene.title,
      href: scene.href,
      addedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function removeFavoriteScene(
  db: Firestore,
  uid: string,
  sceneId: string,
): Promise<void> {
  await deleteDoc(sceneDoc(db, uid, sceneId));
}

export function subscribeFavoriteScenes(
  db: Firestore,
  uid: string,
  onChange: (scenes: FavoriteScene[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(scenesCollection(db, uid), orderBy("addedAt", "desc"));
  return onSnapshot(
    q,
    snapshot => {
      const scenes: FavoriteScene[] = snapshot.docs.map(docSnap => {
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

export async function deleteAllFavoriteScenes(
  db: Firestore,
  uid: string,
): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await getDocs(scenesCollection(db, uid));
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
