export type Settings = {
  screenshotsEnabled: boolean;
  fullWidthPlayer: boolean;
  hideRedundantAttributes: boolean;
  hideSiteBeacon: boolean;
  hideFooterMain: boolean;
  hideFooterSecondary: boolean;
  studioBrowseOnStudioPage: boolean;
  studioBrowseOnScenePage: boolean;
  moveStudioWithStarring: boolean;
  autoFavoriteScene: boolean;
  autoFavoriteStar: boolean;
  autoFavoriteStudio: boolean;
  hideStarBio: boolean;
  autoRedirectStarToClips: boolean;
  favoriteButtonHighlight: boolean;
  hideFavoritedScenes: boolean;
};

const DEFAULTS: Settings = {
  screenshotsEnabled: true,
  fullWidthPlayer: true,
  hideRedundantAttributes: true,
  hideSiteBeacon: true,
  hideFooterMain: true,
  hideFooterSecondary: true,
  studioBrowseOnStudioPage: true,
  studioBrowseOnScenePage: true,
  moveStudioWithStarring: true,
  autoFavoriteScene: false,
  autoFavoriteStar: false,
  autoFavoriteStudio: false,
  hideStarBio: true,
  autoRedirectStarToClips: false,
  favoriteButtonHighlight: true,
  hideFavoritedScenes: false,
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
