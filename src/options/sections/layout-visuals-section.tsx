import { EXTENSION_DISPLAY_NAME } from "../../shared/extension-brand";
import type { Settings } from "../../shared/settings";
import { SectionCard } from "../components/section-card";
import { ToggleRow } from "../components/toggle-row";

type LayoutVisualsSectionProps = {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
};

export function LayoutVisualsSection({
  settings,
  update,
}: LayoutVisualsSectionProps) {
  return (
    <SectionCard
      title="Layout & visuals"
      subtitle={`${EXTENSION_DISPLAY_NAME} can reshape the player area and improve at-a-glance visual cues.`}
    >
      <ToggleRow
        title="Full-width player"
        hint={`${EXTENSION_DISPLAY_NAME} hides the side purchase / PPM panel and stretches the video to the full row width while keeping the title and actions in view.`}
        checked={settings.fullWidthPlayer}
        onToggle={() =>
          update({ fullWidthPlayer: !settings.fullWidthPlayer })
        }
        ariaLabel="Toggle full-width player"
      />
      <ToggleRow
        title="Custom HLS player"
        hint={`${EXTENSION_DISPLAY_NAME} replaces the embedded site player with a custom HLS player tuned for aggressive pre-buffering, with live download speed, quality selector, and keyboard shortcuts.`}
        checked={settings.customPlayer}
        onToggle={() => update({ customPlayer: !settings.customPlayer })}
        ariaLabel="Toggle custom HLS player"
      />
      <ToggleRow
        title="Scene screenshots"
        hint={`${EXTENSION_DISPLAY_NAME} embeds the per-scene timeline screenshot grid below the player so you can skim a scene without opening the carousel.`}
        checked={settings.screenshotsEnabled}
        onToggle={() =>
          update({ screenshotsEnabled: !settings.screenshotsEnabled })
        }
        ariaLabel="Toggle scene screenshots"
      />
      <ToggleRow
        title="Move studio next to starring"
        hint={`${EXTENSION_DISPLAY_NAME} promotes the "Studio" line out of the collapsed "More" details so it sits inline with "Starring" and is always visible.`}
        checked={settings.moveStudioWithStarring}
        onToggle={() =>
          update({ moveStudioWithStarring: !settings.moveStudioWithStarring })
        }
        ariaLabel="Toggle move studio next to starring"
      />
      <ToggleRow
        title="Highlight favorited hearts"
        hint={`${EXTENSION_DISPLAY_NAME} restyles every favorite button so the active state is unmistakable: a clear red active heart and a muted gray inactive one. Applies to scenes, stars, studios, everywhere.`}
        checked={settings.favoriteButtonHighlight}
        onToggle={() =>
          update({ favoriteButtonHighlight: !settings.favoriteButtonHighlight })
        }
        ariaLabel="Toggle highlight favorited hearts"
      />
    </SectionCard>
  );
}
