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
  return (
    <SectionCard
      title="Hide scene cards from grids"
      subtitle={`Remove scene cards site-wide using ${EXTENSION_DISPLAY_NAME} cloud-synced lists. Sign in below to populate them.`}
    >
      <ToggleRow
        title="Hide already-favorited scenes"
        hint={`${EXTENSION_DISPLAY_NAME} removes every clip card whose scene ID is in your cloud-synced favorites. Updates instantly when you favorite or unfavorite anywhere on any device.`}
        checked={settings.hideFavoritedScenes}
        onToggle={() =>
          update({ hideFavoritedScenes: !settings.hideFavoritedScenes })
        }
        ariaLabel="Toggle hide already-favorited scenes"
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
