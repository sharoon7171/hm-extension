import { EXTENSION_DISPLAY_NAME } from "../../shared/extension-brand";
import type { Settings } from "../../shared/settings";
import { SectionCard } from "../components/section-card";
import { ToggleRow } from "../components/toggle-row";

type FavoritesClearSectionProps = {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
};

export function FavoritesClearSection({
  settings,
  update,
}: FavoritesClearSectionProps) {
  return (
    <SectionCard
      title="Favorites Cleanup"
      subtitle={`${EXTENSION_DISPLAY_NAME} adds a Remove all control on each favorites list. It scans every page, then unfavorites each item on HotMovies.`}
    >
      <ToggleRow
        title="Remove all on favorite clips"
        hint="Shows Remove all on /favorite-clips. Also clears cloud-synced favorited scenes."
        checked={settings.favoriteClipsClear}
        onToggle={() =>
          update({ favoriteClipsClear: !settings.favoriteClipsClear })
        }
        ariaLabel="Toggle remove all on favorite clips"
      />
      <ToggleRow
        title="Remove all on favorite performers"
        hint="Shows Remove all on /favorite-performers."
        checked={settings.favoritePerformersClear}
        onToggle={() =>
          update({
            favoritePerformersClear: !settings.favoritePerformersClear,
          })
        }
        ariaLabel="Toggle remove all on favorite performers"
      />
      <ToggleRow
        title="Remove all on favorite studios"
        hint="Shows Remove all on /favorite-studios."
        checked={settings.favoriteStudiosClear}
        onToggle={() =>
          update({ favoriteStudiosClear: !settings.favoriteStudiosClear })
        }
        ariaLabel="Toggle remove all on favorite studios"
      />
    </SectionCard>
  );
}
