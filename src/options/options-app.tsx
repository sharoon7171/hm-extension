import { useEffect, useState } from "react";
import {
  getSettings,
  onSettingsChanged,
  updateSettings,
  type Settings,
} from "../shared/settings";
import {
  optionsClasses as cls,
  switchKnob,
  switchTrack,
} from "../ui-classes/options";
import { FirebaseSection } from "./firebase-section";

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
    return onSettingsChanged(setSettings);
  }, []);

  if (!settings) return null;

  const toggleScreenshots = async () => {
    const next = !settings.screenshotsEnabled;
    setSettings({ ...settings, screenshotsEnabled: next });
    await updateSettings({ screenshotsEnabled: next });
  };

  const toggleFullWidthPlayer = async () => {
    const next = !settings.fullWidthPlayer;
    setSettings({ ...settings, fullWidthPlayer: next });
    await updateSettings({ fullWidthPlayer: next });
  };

  const toggleHideRedundantAttributes = async () => {
    const next = !settings.hideRedundantAttributes;
    setSettings({ ...settings, hideRedundantAttributes: next });
    await updateSettings({ hideRedundantAttributes: next });
  };

  const toggleHideSiteBeacon = async () => {
    const next = !settings.hideSiteBeacon;
    setSettings({ ...settings, hideSiteBeacon: next });
    await updateSettings({ hideSiteBeacon: next });
  };

  const toggleHideFooterMain = async () => {
    const next = !settings.hideFooterMain;
    setSettings({ ...settings, hideFooterMain: next });
    await updateSettings({ hideFooterMain: next });
  };

  const toggleHideFooterSecondary = async () => {
    const next = !settings.hideFooterSecondary;
    setSettings({ ...settings, hideFooterSecondary: next });
    await updateSettings({ hideFooterSecondary: next });
  };

  const toggleStudioBrowseOnStudioPage = async () => {
    const next = !settings.studioBrowseOnStudioPage;
    setSettings({ ...settings, studioBrowseOnStudioPage: next });
    await updateSettings({ studioBrowseOnStudioPage: next });
  };

  const toggleStudioBrowseOnScenePage = async () => {
    const next = !settings.studioBrowseOnScenePage;
    setSettings({ ...settings, studioBrowseOnScenePage: next });
    await updateSettings({ studioBrowseOnScenePage: next });
  };

  const toggleMoveStudioWithStarring = async () => {
    const next = !settings.moveStudioWithStarring;
    setSettings({ ...settings, moveStudioWithStarring: next });
    await updateSettings({ moveStudioWithStarring: next });
  };

  const toggleAutoFavoriteScene = async () => {
    const next = !settings.autoFavoriteScene;
    setSettings({ ...settings, autoFavoriteScene: next });
    await updateSettings({ autoFavoriteScene: next });
  };

  const toggleAutoFavoriteStar = async () => {
    const next = !settings.autoFavoriteStar;
    setSettings({ ...settings, autoFavoriteStar: next });
    await updateSettings({ autoFavoriteStar: next });
  };

  const toggleAutoFavoriteStudio = async () => {
    const next = !settings.autoFavoriteStudio;
    setSettings({ ...settings, autoFavoriteStudio: next });
    await updateSettings({ autoFavoriteStudio: next });
  };

  const toggleHideStarBio = async () => {
    const next = !settings.hideStarBio;
    setSettings({ ...settings, hideStarBio: next });
    await updateSettings({ hideStarBio: next });
  };

  const toggleAutoRedirectStarToClips = async () => {
    const next = !settings.autoRedirectStarToClips;
    setSettings({ ...settings, autoRedirectStarToClips: next });
    await updateSettings({ autoRedirectStarToClips: next });
  };

  const toggleFavoriteButtonHighlight = async () => {
    const next = !settings.favoriteButtonHighlight;
    setSettings({ ...settings, favoriteButtonHighlight: next });
    await updateSettings({ favoriteButtonHighlight: next });
  };

  const toggleHideFavoritedScenes = async () => {
    const next = !settings.hideFavoritedScenes;
    setSettings({ ...settings, hideFavoritedScenes: next });
    await updateSettings({ hideFavoritedScenes: next });
  };

  return (
    <div className={cls.page}>
      <div className={cls.card}>
        <h1 className={cls.title}>HotMovies Extension</h1>
        <p className={cls.description}>
          Adds quality-of-life features to hotmovies.com. Toggle each feature
          below; changes apply to every open tab without a reload.
        </p>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Scene screenshots</span>
            <span className={cls.labelHint}>
              Embed the per-scene timeline screenshot grid below the player.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.screenshotsEnabled}
            aria-label="Toggle scene screenshots"
            onClick={toggleScreenshots}
            className={switchTrack(settings.screenshotsEnabled)}
          >
            <span className={switchKnob(settings.screenshotsEnabled)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Full-width player</span>
            <span className={cls.labelHint}>
              Hide the right-side purchase / PPM panel and stretch the video
              player to the full row width.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.fullWidthPlayer}
            aria-label="Toggle full-width player"
            onClick={toggleFullWidthPlayer}
            className={switchTrack(settings.fullWidthPlayer)}
          >
            <span className={switchKnob(settings.fullWidthPlayer)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Hide redundant attributes</span>
            <span className={cls.labelHint}>
              Remove the flat &ldquo;Attributes:&rdquo; line above the player.
              The same tags are shown grouped (Acts / Setting / Theme) below.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.hideRedundantAttributes}
            aria-label="Toggle hide redundant attributes"
            onClick={toggleHideRedundantAttributes}
            className={switchTrack(settings.hideRedundantAttributes)}
          >
            <span className={switchKnob(settings.hideRedundantAttributes)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Hide promo banner</span>
            <span className={cls.labelHint}>
              Remove the &ldquo;Select Unlimited Members…&rdquo; promo strip
              that appears on every page.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.hideSiteBeacon}
            aria-label="Toggle hide promo banner"
            onClick={toggleHideSiteBeacon}
            className={switchTrack(settings.hideSiteBeacon)}
          >
            <span className={switchKnob(settings.hideSiteBeacon)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Hide footer links</span>
            <span className={cls.labelHint}>
              Remove the main footer block (Join Our List, Find Videos,
              Customer Service, Top Lists).
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.hideFooterMain}
            aria-label="Toggle hide footer links"
            onClick={toggleHideFooterMain}
            className={switchTrack(settings.hideFooterMain)}
          >
            <span className={switchKnob(settings.hideFooterMain)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Hide footer legal strip</span>
            <span className={cls.labelHint}>
              Remove the secondary footer (Twitter, Terms, Privacy, Copyright,
              etc.).
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.hideFooterSecondary}
            aria-label="Toggle hide footer legal strip"
            onClick={toggleHideFooterSecondary}
            className={switchTrack(settings.hideFooterSecondary)}
          >
            <span className={switchKnob(settings.hideFooterSecondary)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>
              Browse Scenes button on studio pages
            </span>
            <span className={cls.labelHint}>
              Add a &ldquo;Browse {"{Studio}"} Scenes&rdquo; button next to the
              studio name. HotMovies supports filtering clips by studio but
              never links to it.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.studioBrowseOnStudioPage}
            aria-label="Toggle browse scenes on studio pages"
            onClick={toggleStudioBrowseOnStudioPage}
            className={switchTrack(settings.studioBrowseOnStudioPage)}
          >
            <span className={switchKnob(settings.studioBrowseOnStudioPage)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>
              Browse Scenes link on scene pages
            </span>
            <span className={cls.labelHint}>
              Append a small &ldquo;· Browse Scenes&rdquo; link after the
              studio name on every clip page so you can jump directly to all
              scenes from that studio.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.studioBrowseOnScenePage}
            aria-label="Toggle browse scenes on scene pages"
            onClick={toggleStudioBrowseOnScenePage}
            className={switchTrack(settings.studioBrowseOnScenePage)}
          >
            <span className={switchKnob(settings.studioBrowseOnScenePage)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>
              Move Studio next to Starring
            </span>
            <span className={cls.labelHint}>
              Promote the &ldquo;Studio: …&rdquo; line out of the collapsed
              &ldquo;More&rdquo; details so it sits inline with the
              &ldquo;Starring: …&rdquo; row and is always visible.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.moveStudioWithStarring}
            aria-label="Toggle move studio next to starring"
            onClick={toggleMoveStudioWithStarring}
            className={switchTrack(settings.moveStudioWithStarring)}
          >
            <span className={switchKnob(settings.moveStudioWithStarring)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Auto-favorite scenes</span>
            <span className={cls.labelHint}>
              When you open any clip page, click the heart for you (only if
              not already favorited). Off by default — modifies your account.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoFavoriteScene}
            aria-label="Toggle auto-favorite scenes"
            onClick={toggleAutoFavoriteScene}
            className={switchTrack(settings.autoFavoriteScene)}
          >
            <span className={switchKnob(settings.autoFavoriteScene)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Auto-favorite stars</span>
            <span className={cls.labelHint}>
              When you open any pornstar page, click the heart for you (only
              if not already favorited). Off by default — modifies your
              account.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoFavoriteStar}
            aria-label="Toggle auto-favorite stars"
            onClick={toggleAutoFavoriteStar}
            className={switchTrack(settings.autoFavoriteStar)}
          >
            <span className={switchKnob(settings.autoFavoriteStar)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Auto-favorite studios</span>
            <span className={cls.labelHint}>
              When you open any studio page, click the heart for you (only if
              not already favorited). Off by default — modifies your account.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoFavoriteStudio}
            aria-label="Toggle auto-favorite studios"
            onClick={toggleAutoFavoriteStudio}
            className={switchTrack(settings.autoFavoriteStudio)}
          >
            <span className={switchKnob(settings.autoFavoriteStudio)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>Hide star biography</span>
            <span className={cls.labelHint}>
              Remove the long &ldquo;Porn Star Biography&rdquo; block on
              pornstar profile pages so the page focuses on the scenes,
              movies, and stats.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.hideStarBio}
            aria-label="Toggle hide star biography"
            onClick={toggleHideStarBio}
            className={switchTrack(settings.hideStarBio)}
          >
            <span className={switchKnob(settings.hideStarBio)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>
              Auto-redirect star pages to clips
            </span>
            <span className={cls.labelHint}>
              When you land on the &ldquo;…-pornstar.html&rdquo; profile,
              jump straight to the star&rsquo;s Clips tab so you skip the
              movies-only landing. Only fires on the bio URL — Movies, Reviews,
              Galleries, and other tabs are left alone. Off by default.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoRedirectStarToClips}
            aria-label="Toggle auto-redirect star pages to clips"
            onClick={toggleAutoRedirectStarToClips}
            className={switchTrack(settings.autoRedirectStarToClips)}
          >
            <span className={switchKnob(settings.autoRedirectStarToClips)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>
              Highlight favorited heart buttons
            </span>
            <span className={cls.labelHint}>
              Restyle every favorite button so the favorited state is
              unmistakable: a bright red, slightly enlarged heart with a soft
              glow when active, and a muted gray heart when not. Applies to
              scenes, stars, studios, and anywhere else the heart appears.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.favoriteButtonHighlight}
            aria-label="Toggle highlight favorited heart buttons"
            onClick={toggleFavoriteButtonHighlight}
            className={switchTrack(settings.favoriteButtonHighlight)}
          >
            <span className={switchKnob(settings.favoriteButtonHighlight)} />
          </button>
        </div>
        <div className={cls.row}>
          <span className={cls.label}>
            <span className={cls.labelTitle}>
              Hide already-favorited scene cards
            </span>
            <span className={cls.labelHint}>
              Remove every clip card whose scene ID is in your cloud-synced
              favorites &mdash; from the homepage, search, category, star,
              studio, recently-added, and movie pages alike. Updates instantly
              when you favorite or unfavorite anywhere on any device. Off by
              default; sign in below to use it.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.hideFavoritedScenes}
            aria-label="Toggle hide already-favorited scene cards"
            onClick={toggleHideFavoritedScenes}
            className={switchTrack(settings.hideFavoritedScenes)}
          >
            <span className={switchKnob(settings.hideFavoritedScenes)} />
          </button>
        </div>
      </div>
      <FirebaseSection />
    </div>
  );
}
