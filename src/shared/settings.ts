export type Settings = {
  screenshotsEnabled: boolean;
};

const DEFAULTS: Settings = {
  screenshotsEnabled: true,
};

const KEYS = Object.keys(DEFAULTS) as (keyof Settings)[];

export async function getSettings(): Promise<Settings> {
  return (await chrome.storage.sync.get(DEFAULTS)) as Settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

export function onSettingsChanged(listener: (next: Settings) => void): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: chrome.storage.AreaName,
  ) => {
    if (area !== "sync") return;
    if (!KEYS.some(key => key in changes)) return;
    void getSettings().then(listener);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
