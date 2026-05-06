import { getSettings, onSettingsChanged, type Settings } from "../shared/settings";
import {
  disableAutoFavoriteScene,
  enableAutoFavoriteScene,
} from "./auto-favorite-scene";
import {
  disableAutoHideScene,
  enableAutoHideScene,
} from "./auto-hide-scene";
import {
  disableAutoFavoriteStar,
  enableAutoFavoriteStar,
} from "./auto-favorite-star";
import {
  disableAutoFavoriteStudio,
  enableAutoFavoriteStudio,
} from "./auto-favorite-studio";
import { autoRedirectStarToClips } from "./auto-redirect-star-clips";
import {
  hideFavoriteButtonHighlight,
  showFavoriteButtonHighlight,
} from "./favorite-button-highlight";
import { hideFullWidthPlayer, showFullWidthPlayer } from "./full-width-player";
import { hidePromoBanners, showPromoBanners } from "./hide-promo-banners";
import { setHideCardsConfig } from "./hide-scene-cards";
import { hideRedundantAttributes, showRedundantAttributes } from "./redundant-attributes";
import { hideSceneScreenshots, showSceneScreenshots } from "./scene-screenshots";
import {
  hideScenePageStudioLink,
  showScenePageStudioLink,
} from "./scene-page-studio-link";
import {
  hideScenePageStudioSurface,
  showScenePageStudioSurface,
} from "./scene-page-studio-surface";
import {
  startSceneFavoriteSync,
  stopSceneFavoriteSync,
} from "./scene-favorite-sync";
import {
  startSceneHideButton,
  stopSceneHideButton,
} from "./scene-page-hide-button";
import {
  hideFooterMain,
  hideFooterSecondary,
  showFooterMain,
  showFooterSecondary,
} from "./site-footer";
import { hideStarBio, showStarBio } from "./star-page-bio";
import { hideStudioPageLink, showStudioPageLink } from "./studio-page-link";
import { matchScenePage, matchStarPage, matchStudioPage } from "./url-patterns";

const PLAYER_SELECTOR = 'iframe[src*="adultempire.com/gw/player"]';

let observer: MutationObserver | null = null;

void run();
onSettingsChanged(() => {
  void run();
});

async function run(): Promise<void> {
  const settings = await getSettings();
  applyGlobal(settings);
  applyStudio(settings);
  applyStar(settings);
  applyAutoFavoriteScene(settings);
  applyAutoHideScene(settings);
  applySceneFavoriteSync();
  applySceneHideButton();
  if (!matchScenePage(location.href)) {
    teardownScene();
    return;
  }
  if (document.querySelector(PLAYER_SELECTOR)) {
    observer?.disconnect();
    observer = null;
    applyScene(settings);
    return;
  }
  watchForPlayer();
}

function watchForPlayer(): void {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (!document.querySelector(PLAYER_SELECTOR)) return;
    observer?.disconnect();
    observer = null;
    void getSettings().then(applyScene);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function applyGlobal(settings: Settings): void {
  if (settings.hidePromoBanners) hidePromoBanners();
  else showPromoBanners();
  if (settings.hideFooterMain) hideFooterMain();
  else showFooterMain();
  if (settings.hideFooterSecondary) hideFooterSecondary();
  else showFooterSecondary();
  if (settings.favoriteButtonHighlight) showFavoriteButtonHighlight();
  else hideFavoriteButtonHighlight();
  setHideCardsConfig({
    favorite: settings.hideFavoritedScenes,
    hidden: settings.hideCustomScenes,
  });
}

function applyStudio(settings: Settings): void {
  const studio = matchStudioPage(location.href);
  if (!studio) {
    hideStudioPageLink();
    disableAutoFavoriteStudio();
    return;
  }
  if (settings.studioBrowseOnStudioPage) showStudioPageLink();
  else hideStudioPageLink();
  if (settings.autoFavoriteStudio) enableAutoFavoriteStudio(studio.studioId);
  else disableAutoFavoriteStudio();
}

function applyStar(settings: Settings): void {
  const star = matchStarPage(location.href);
  if (!star) {
    disableAutoFavoriteStar();
    showStarBio();
    return;
  }
  if (settings.autoRedirectStarToClips && autoRedirectStarToClips()) return;
  if (settings.autoFavoriteStar) enableAutoFavoriteStar(star.starId);
  else disableAutoFavoriteStar();
  if (settings.hideStarBio) hideStarBio();
  else showStarBio();
}

function applyAutoFavoriteScene(settings: Settings): void {
  const scene = matchScenePage(location.href);
  if (!scene) {
    disableAutoFavoriteScene();
    return;
  }
  if (settings.autoFavoriteScene) enableAutoFavoriteScene(scene.sceneId);
  else disableAutoFavoriteScene();
}

function applyAutoHideScene(settings: Settings): void {
  const scene = matchScenePage(location.href);
  if (!scene) {
    disableAutoHideScene();
    return;
  }
  if (settings.autoHideScene) enableAutoHideScene(scene.sceneId);
  else disableAutoHideScene();
}

function applySceneFavoriteSync(): void {
  const scene = matchScenePage(location.href);
  if (!scene) {
    stopSceneFavoriteSync();
    return;
  }
  startSceneFavoriteSync(scene.sceneId);
}

function applySceneHideButton(): void {
  const scene = matchScenePage(location.href);
  if (!scene) {
    stopSceneHideButton();
    return;
  }
  startSceneHideButton(scene.sceneId);
}

function applyScene(settings: Settings): void {
  if (settings.hideRedundantAttributes) hideRedundantAttributes();
  else showRedundantAttributes();
  if (settings.fullWidthPlayer) showFullWidthPlayer();
  else hideFullWidthPlayer();
  if (settings.screenshotsEnabled) void showSceneScreenshots();
  else hideSceneScreenshots();
  if (settings.moveStudioWithStarring) showScenePageStudioSurface();
  else hideScenePageStudioSurface();
  if (settings.studioBrowseOnScenePage) showScenePageStudioLink();
  else hideScenePageStudioLink();
}

function teardownScene(): void {
  observer?.disconnect();
  observer = null;
  hideSceneScreenshots();
  hideFullWidthPlayer();
  showRedundantAttributes();
  hideScenePageStudioSurface();
  hideScenePageStudioLink();
  stopSceneFavoriteSync();
  stopSceneHideButton();
}
