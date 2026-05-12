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
  try {
    await addSceneIdempotent(message.kind, {
      sceneId: message.sceneId,
      title: message.title,
      href: message.href,
    });
  } catch (error) {
    console.warn(
      `[hotmovies-ext] sceneAdd ${message.kind}/${message.sceneId} failed`,
      error,
    );
  }
}

async function runRemove(message: SceneRemoveRequest): Promise<void> {
  try {
    await removeSceneIdempotent(message.kind, message.sceneId);
  } catch (error) {
    console.warn(
      `[hotmovies-ext] sceneRemove ${message.kind}/${message.sceneId} failed`,
      error,
    );
  }
}

async function runDeleteAll(message: SceneDeleteAllRequest): Promise<AckResponse> {
  try {
    await deleteAllScenesIdempotent(message.kind);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
