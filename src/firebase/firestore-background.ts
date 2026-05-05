import {
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseApp } from "./app";

let cached: Firestore | null = null;

export function getBackgroundFirestore(): Firestore {
  if (cached) return cached;
  cached = initializeFirestore(getFirebaseApp(), {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true,
  });
  return cached;
}
