import { EXTENSION_DISPLAY_NAME } from "../../shared/extension-brand";
import type { Settings } from "../../shared/settings";
import { SectionCard } from "../components/section-card";
import { ToggleRow } from "../components/toggle-row";

type GridFiltersSectionProps = {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
};

export function GridFiltersSection({
  settings,
  update,
}: GridFiltersSectionProps) {
  const toggleHideFavorited = () => {
    const next = !settings.hideFavoritedScenes;
    const patch: Partial<Settings> = { hideFavoritedScenes: next };
    if (next) patch.highlightFavoritedScenes = false;
    return update(patch);
  };

  const toggleHighlightFavorited = () => {
    const next = !settings.highlightFavoritedScenes;
    const patch: Partial<Settings> = { highlightFavoritedScenes: next };
    if (next) patch.hideFavoritedScenes = false;
    return update(patch);
  };

  return (
    <SectionCard
      title="Scene cards in grids"
      subtitle={`Filter or mark scene cards site-wide using ${EXTENSION_DISPLAY_NAME} cloud-synced lists. Sign in below to populate them.`}
    >
      <ToggleRow
        title="Hide already-favorited scenes"
        hint={`${EXTENSION_DISPLAY_NAME} removes every clip card whose scene ID is in your cloud-synced favorites. Mutually exclusive with highlight favorited scenes.`}
        checked={settings.hideFavoritedScenes}
        onToggle={toggleHideFavorited}
        ariaLabel="Toggle hide already-favorited scenes"
      />
      <ToggleRow
        title="Highlight favorited scenes"
        hint={`${EXTENSION_DISPLAY_NAME} keeps favorited clip cards visible and draws a red border around them so they stand out in grids. Mutually exclusive with hide already-favorited scenes.`}
        checked={settings.highlightFavoritedScenes}
        onToggle={toggleHighlightFavorited}
        ariaLabel="Toggle highlight favorited scenes"
      />
      <ToggleRow
        title="Hide custom-hidden scenes"
        hint={`${EXTENSION_DISPLAY_NAME} removes every clip card whose scene ID is in your cloud-synced hidden list. The Hide / Unhide button on every clip page writes to this list.`}
        checked={settings.hideCustomScenes}
        onToggle={() =>
          update({ hideCustomScenes: !settings.hideCustomScenes })
        }
        ariaLabel="Toggle hide custom-hidden scenes"
      />
    </SectionCard>
  );
}
