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
      </div>
    </div>
  );
}
