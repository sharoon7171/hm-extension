import { EXTENSION_DISPLAY_NAME } from "../../shared/extension-brand";
import type { Settings } from "../../shared/settings";
import { SectionCard } from "../components/section-card";
import { ToggleRow } from "../components/toggle-row";

type AutoActionsSectionProps = {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
};

export function AutoActionsSection({
  settings,
  update,
}: AutoActionsSectionProps) {
  const toggleAutoFavoriteScene = () => {
    const next = !settings.autoFavoriteScene;
    const patch: Partial<Settings> = { autoFavoriteScene: next };
    if (next) patch.autoHideScene = false;
    return update(patch);
  };

  const toggleAutoHideScene = () => {
    const next = !settings.autoHideScene;
    const patch: Partial<Settings> = { autoHideScene: next };
    if (next) patch.autoFavoriteScene = false;
    return update(patch);
  };

  return (
    <SectionCard
      title="Auto actions"
      subtitle={`${EXTENSION_DISPLAY_NAME} does these for you the moment you open the matching page. Off by default — modifies your account or cloud library.`}
    >
      <ToggleRow
        title="Auto-favorite scenes"
        hint={`${EXTENSION_DISPLAY_NAME} clicks the heart on every clip page. Mutually exclusive with auto-hide scenes.`}
        checked={settings.autoFavoriteScene}
        onToggle={toggleAutoFavoriteScene}
        ariaLabel="Toggle auto-favorite scenes"
      />
      <ToggleRow
        title="Auto-hide scenes"
        hint={`${EXTENSION_DISPLAY_NAME} adds every opened clip to your cloud-synced hidden list. Mutually exclusive with auto-favorite scenes.`}
        checked={settings.autoHideScene}
        onToggle={toggleAutoHideScene}
        ariaLabel="Toggle auto-hide scenes"
      />
      <ToggleRow
        title="Auto-favorite stars"
        hint={`${EXTENSION_DISPLAY_NAME} clicks the heart on every pornstar profile.`}
        checked={settings.autoFavoriteStar}
        onToggle={() =>
          update({ autoFavoriteStar: !settings.autoFavoriteStar })
        }
        ariaLabel="Toggle auto-favorite stars"
      />
      <ToggleRow
        title="Auto-favorite studios"
        hint={`${EXTENSION_DISPLAY_NAME} clicks the heart on every studio page.`}
        checked={settings.autoFavoriteStudio}
        onToggle={() =>
          update({ autoFavoriteStudio: !settings.autoFavoriteStudio })
        }
        ariaLabel="Toggle auto-favorite studios"
      />
      <ToggleRow
        title="Skip star bio page"
        hint={`${EXTENSION_DISPLAY_NAME} lands on a pornstar profile and jumps straight to the Clips tab. Movies, Reviews, and Galleries tabs are left alone.`}
        checked={settings.autoRedirectStarToClips}
        onToggle={() =>
          update({
            autoRedirectStarToClips: !settings.autoRedirectStarToClips,
          })
        }
        ariaLabel="Toggle skip star bio page"
      />
    </SectionCard>
  );
}
