import type {
  AckResponse,
  FavoriteSceneAddRequest,
  FavoriteSceneDeleteAllRequest,
  FavoriteSceneRemoveRequest,
} from "../shared/messages";
import {
  addFavoriteSceneIdempotent,
  deleteAllFavoriteScenesIdempotent,
  removeFavoriteSceneIdempotent,
} from "./scenes-mirror";

type FavoriteMessage =
  | FavoriteSceneAddRequest
  | FavoriteSceneRemoveRequest
  | FavoriteSceneDeleteAllRequest;

function isFavoriteMessage(value: unknown): value is FavoriteMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "favoriteSceneAdd" ||
    type === "favoriteSceneRemove" ||
    type === "favoriteSceneDeleteAll"
  );
}

export function registerFirestoreSync(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isFavoriteMessage(message)) return false;
    void handleFavoriteMessage(message).then(sendResponse);
    return true;
  });
}

async function handleFavoriteMessage(
  message: FavoriteMessage,
): Promise<AckResponse> {
  try {
    if (message.type === "favoriteSceneAdd") {
      await addFavoriteSceneIdempotent({
        sceneId: message.sceneId,
        title: message.title,
        href: message.href,
      });
      return { ok: true };
    }
    if (message.type === "favoriteSceneRemove") {
      await removeFavoriteSceneIdempotent(message.sceneId);
      return { ok: true };
    }
    await deleteAllFavoriteScenesIdempotent();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
