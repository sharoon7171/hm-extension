import { getSettings, onSettingsChanged } from "../shared/settings";
import { hideSceneScreenshots, showSceneScreenshots } from "./scene-screenshots";
import { matchScenePage } from "./url-patterns";

const PLAYER_SELECTOR = 'iframe[src*="adultempire.com/gw/player"]';

let observer: MutationObserver | null = null;
let mounted = false;

void run();
onSettingsChanged(() => {
  void run();
});

async function run(): Promise<void> {
  if (!matchScenePage(location.href)) {
    teardown();
    return;
  }
  const { screenshotsEnabled } = await getSettings();
  if (!screenshotsEnabled) {
    teardown();
    return;
  }
  if (document.querySelector(PLAYER_SELECTOR)) {
    void mount();
    return;
  }
  watchForPlayer();
}

function watchForPlayer(): void {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (document.querySelector(PLAYER_SELECTOR)) void mount();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

async function mount(): Promise<void> {
  if (mounted) return;
  mounted = true;
  observer?.disconnect();
  observer = null;
  await showSceneScreenshots();
}

function teardown(): void {
  observer?.disconnect();
  observer = null;
  mounted = false;
  hideSceneScreenshots();
}
