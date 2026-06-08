import type {
  AckResponse,
  SceneAddRequest,
  SceneDeleteAllRequest,
  SceneRemoveRequest,
} from "../shared/messages";
import {
  addSceneIdempotent,
  deleteAllScenesIdempotent,
  removeSceneIdempotent,
} from "./scenes-mirror";
import {
  clearPendingForKind,
  dequeuePending,
  enqueuePending,
  flushPendingSync,
  type PendingSceneOp,
} from "./scenes-pending-sync";

type SceneMessage = SceneAddRequest | SceneRemoveRequest | SceneDeleteAllRequest;

function isSceneMessage(value: unknown): value is SceneMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; kind?: unknown };
  if (message.kind !== "favoriteScenes" && message.kind !== "hiddenScenes") {
    return false;
  }
  return (
    message.type === "sceneAdd" ||
    message.type === "sceneRemove" ||
    message.type === "sceneDeleteAll"
  );
}

async function applyPendingOp(op: PendingSceneOp): Promise<void> {
  if (op.op === "add") {
    await addSceneIdempotent(op.kind, {
      sceneId: op.sceneId,
      title: op.title,
      href: op.href,
    });
    return;
  }
  await removeSceneIdempotent(op.kind, op.sceneId);
}

export function flushPendingScenes(): Promise<void> {
  return flushPendingSync(applyPendingOp);
}

export function registerFirestoreSync(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isSceneMessage(message)) return false;
    if (message.type === "sceneAdd") {
      sendResponse({ ok: true } satisfies AckResponse);
      void runAdd(message);
      return false;
    }
    if (message.type === "sceneRemove") {
      sendResponse({ ok: true } satisfies AckResponse);
      void runRemove(message);
      return false;
    }
    void runDeleteAll(message).then(sendResponse);
    return true;
  });
}

async function runAdd(message: SceneAddRequest): Promise<void> {
  await flushPendingScenes();
  try {
    await addSceneIdempotent(message.kind, {
      sceneId: message.sceneId,
      title: message.title,
      href: message.href,
    });
    await dequeuePending(message.kind, message.sceneId);
  } catch (error) {
    console.warn(
      `[hotmovies-ext] sceneAdd ${message.kind}/${message.sceneId} failed`,
      error,
    );
    await enqueuePending({
      op: "add",
      kind: message.kind,
      sceneId: message.sceneId,
      title: message.title,
      href: message.href,
    });
  }
}

async function runRemove(message: SceneRemoveRequest): Promise<void> {
  await flushPendingScenes();
  try {
    await removeSceneIdempotent(message.kind, message.sceneId);
    await dequeuePending(message.kind, message.sceneId);
  } catch (error) {
    console.warn(
      `[hotmovies-ext] sceneRemove ${message.kind}/${message.sceneId} failed`,
      error,
    );
    await enqueuePending({
      op: "remove",
      kind: message.kind,
      sceneId: message.sceneId,
    });
  }
}

async function runDeleteAll(message: SceneDeleteAllRequest): Promise<AckResponse> {
  await flushPendingScenes();
  try {
    await deleteAllScenesIdempotent(message.kind);
    await clearPendingForKind(message.kind);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
