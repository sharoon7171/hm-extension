import type { SceneKind } from "../firebase/scenes";

const STORAGE_KEY = "scenesPendingSync";

export type PendingSceneOp =
  | {
      op: "add";
      kind: SceneKind;
      sceneId: string;
      title: string;
      href: string;
    }
  | {
      op: "remove";
      kind: SceneKind;
      sceneId: string;
    };

type PendingStore = Record<string, PendingSceneOp>;

function pendingKey(kind: SceneKind, sceneId: string): string {
  return `${kind}:${sceneId}`;
}

function normalizeOp(value: unknown): PendingSceneOp | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as {
    op?: unknown;
    kind?: unknown;
    sceneId?: unknown;
    title?: unknown;
    href?: unknown;
  };
  if (raw.kind !== "favoriteScenes" && raw.kind !== "hiddenScenes") return null;
  if (typeof raw.sceneId !== "string") return null;
  if (raw.op === "remove") {
    return { op: "remove", kind: raw.kind, sceneId: raw.sceneId };
  }
  if (raw.op === "add") {
    if (typeof raw.title !== "string" || typeof raw.href !== "string") return null;
    return {
      op: "add",
      kind: raw.kind,
      sceneId: raw.sceneId,
      title: raw.title,
      href: raw.href,
    };
  }
  return null;
}

function normalize(value: unknown): PendingStore {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const next: PendingStore = {};
  for (const [key, entry] of Object.entries(raw)) {
    const op = normalizeOp(entry);
    if (op) next[key] = op;
  }
  return next;
}

async function readPending(): Promise<PendingStore> {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  return normalize(got[STORAGE_KEY]);
}

async function writePending(next: PendingStore): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

export async function enqueuePending(op: PendingSceneOp): Promise<void> {
  const current = await readPending();
  current[pendingKey(op.kind, op.sceneId)] = op;
  await writePending(current);
}

export async function dequeuePending(kind: SceneKind, sceneId: string): Promise<void> {
  const current = await readPending();
  const key = pendingKey(kind, sceneId);
  if (!(key in current)) return;
  const { [key]: _omit, ...rest } = current;
  void _omit;
  await writePending(rest);
}

export async function clearPendingForKind(kind: SceneKind): Promise<void> {
  const current = await readPending();
  const rest: PendingStore = {};
  for (const [key, op] of Object.entries(current)) {
    if (op.kind !== kind) rest[key] = op;
  }
  await writePending(rest);
}

export async function clearAllPending(): Promise<void> {
  await writePending({});
}

let flushChain: Promise<void> = Promise.resolve();

export function flushPendingSync(
  apply: (op: PendingSceneOp) => Promise<void>,
): Promise<void> {
  flushChain = flushChain.then(() => flushPendingSyncInner(apply));
  return flushChain;
}

async function flushPendingSyncInner(
  apply: (op: PendingSceneOp) => Promise<void>,
): Promise<void> {
  const pending = await readPending();
  for (const op of Object.values(pending)) {
    try {
      await apply(op);
      await dequeuePending(op.kind, op.sceneId);
    } catch (error) {
      console.warn(
        `[hotmovies-ext] pending ${op.op} ${op.kind}/${op.sceneId} failed`,
        error,
      );
    }
  }
}
