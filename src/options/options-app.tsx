import { useEffect, useState } from "react";
import { EXTENSION_DISPLAY_NAME } from "../shared/extension-brand";
import {
  getSettings,
  onSettingsChanged,
  updateSettings,
  type Settings,
} from "../shared/settings";
import { optionsClasses as cls, POPPINS_STYLE } from "../ui-classes/options";
import { FirebaseSection } from "./firebase-section";
import { AutoActionsSection } from "./sections/auto-actions-section";
import { GridFiltersSection } from "./sections/grid-filters-section";
import { HideClutterSection } from "./sections/hide-clutter-section";
import { LayoutVisualsSection } from "./sections/layout-visuals-section";
import { NavigationSection } from "./sections/navigation-section";

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
    return onSettingsChanged(setSettings);
  }, []);

  if (!settings) return null;

  const update = async (patch: Partial<Settings>) => {
    setSettings({ ...settings, ...patch });
    await updateSettings(patch);
  };

  return (
    <div className={cls.page} style={POPPINS_STYLE}>
      <div className={cls.shell}>
        <header className={cls.banner}>
          <h1 className={cls.bannerTitle}>{EXTENSION_DISPLAY_NAME}</h1>
          <p className={cls.bannerSubtitle}>
            Settings sync across every open tab and every signed-in device.
          </p>
        </header>
        <div className={cls.grid}>
          <AutoActionsSection settings={settings} update={update} />
          <GridFiltersSection settings={settings} update={update} />
          <LayoutVisualsSection settings={settings} update={update} />
          <HideClutterSection settings={settings} update={update} />
          <NavigationSection settings={settings} update={update} />
          <div className={cls.gridFull}>
            <FirebaseSection />
          </div>
        </div>
      </div>
    </div>
  );
}
