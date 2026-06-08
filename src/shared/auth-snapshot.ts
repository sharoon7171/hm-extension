export type AuthSnapshot = {
  uid: string | null;
  email: string | null;
  ready: boolean;
};

const STORAGE_KEY = "authSnapshot";

export const EMPTY_AUTH_SNAPSHOT: AuthSnapshot = {
  uid: null,
  email: null,
  ready: false,
};

function normalize(value: unknown): AuthSnapshot {
  if (!value || typeof value !== "object") return EMPTY_AUTH_SNAPSHOT;
  const raw = value as Partial<AuthSnapshot>;
  return {
    uid: typeof raw.uid === "string" ? raw.uid : null,
    email: typeof raw.email === "string" ? raw.email : null,
    ready: raw.ready === true,
  };
}

export async function readAuthSnapshot(): Promise<AuthSnapshot> {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  return normalize(got[STORAGE_KEY]);
}

export async function writeAuthSnapshot(next: AuthSnapshot): Promise<void> {
  const normalized = normalize(next);
  const current = await readAuthSnapshot();
  if (
    current.uid === normalized.uid &&
    current.email === normalized.email &&
    current.ready === normalized.ready
  ) {
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
}

export function watchAuthSnapshot(onChange: (snapshot: AuthSnapshot) => void): () => void {
  const fromStorage = (
    changes: { [k: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName,
  ) => {
    if (area !== "local") return;
    if (!(STORAGE_KEY in changes)) return;
    onChange(normalize(changes[STORAGE_KEY].newValue));
  };
  chrome.storage.onChanged.addListener(fromStorage);
  return () => chrome.storage.onChanged.removeListener(fromStorage);
}
