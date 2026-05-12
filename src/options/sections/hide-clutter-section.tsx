import { EXTENSION_DISPLAY_NAME } from "../../shared/extension-brand";
import type { Settings } from "../../shared/settings";
import { SectionCard } from "../components/section-card";
import { ToggleRow } from "../components/toggle-row";

type HideClutterSectionProps = {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
};

export function HideClutterSection({
  settings,
  update,
}: HideClutterSectionProps) {
  return (
    <SectionCard
      title="Hide clutter"
      subtitle={`${EXTENSION_DISPLAY_NAME} hides promotional blocks and extra chrome HotMovies adds around its content.`}
    >
      <ToggleRow
        title="Hide promotional banners"
        hint={`${EXTENSION_DISPLAY_NAME} removes every promo block on HotMovies: the top "Select Unlimited" strip, hero sale banners, mid-page cross-promos, the "Save Money" tower, and the "On Sale!" links on movie and clip titles.`}
        checked={settings.hidePromoBanners}
        onToggle={() => update({ hidePromoBanners: !settings.hidePromoBanners })}
        ariaLabel="Toggle hide promotional banners"
      />
      <ToggleRow
        title="Hide footer links"
        hint={`${EXTENSION_DISPLAY_NAME} removes the main footer block (Join Our List, Find Videos, Customer Service, Top Lists).`}
        checked={settings.hideFooterMain}
        onToggle={() => update({ hideFooterMain: !settings.hideFooterMain })}
        ariaLabel="Toggle hide footer links"
      />
      <ToggleRow
        title="Hide footer legal strip"
        hint={`${EXTENSION_DISPLAY_NAME} removes the secondary footer (Twitter, Terms, Privacy, Copyright, etc.).`}
        checked={settings.hideFooterSecondary}
        onToggle={() =>
          update({ hideFooterSecondary: !settings.hideFooterSecondary })
        }
        ariaLabel="Toggle hide footer legal strip"
      />
      <ToggleRow
        title="Hide redundant attributes"
        hint={`${EXTENSION_DISPLAY_NAME} removes the flat "Attributes:" line above the player. The same tags are shown grouped (Acts / Setting / Theme) below.`}
        checked={settings.hideRedundantAttributes}
        onToggle={() =>
          update({ hideRedundantAttributes: !settings.hideRedundantAttributes })
        }
        ariaLabel="Toggle hide redundant attributes"
      />
      <ToggleRow
        title="Hide star biography"
        hint={`${EXTENSION_DISPLAY_NAME} removes the long bio block on pornstar profiles so the page focuses on scenes, movies, and stats.`}
        checked={settings.hideStarBio}
        onToggle={() => update({ hideStarBio: !settings.hideStarBio })}
        ariaLabel="Toggle hide star biography"
      />
    </SectionCard>
  );
}
