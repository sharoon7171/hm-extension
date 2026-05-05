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
    void handleSceneMessage(message).then(sendResponse);
    return true;
  });
}

async function handleSceneMessage(message: SceneMessage): Promise<AckResponse> {
  try {
    if (message.type === "sceneAdd") {
      await addSceneIdempotent(message.kind, {
        sceneId: message.sceneId,
        title: message.title,
        href: message.href,
      });
      return { ok: true };
    }
    if (message.type === "sceneRemove") {
      await removeSceneIdempotent(message.kind, message.sceneId);
      return { ok: true };
    }
    await deleteAllScenesIdempotent(message.kind);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
