import type { Settings } from "../../shared/settings";
import { SectionCard } from "../components/section-card";
import { ToggleRow } from "../components/toggle-row";

export type NavigationSectionProps = {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
};

export function NavigationSection({
  settings,
  update,
}: NavigationSectionProps) {
  return (
    <SectionCard
      title="Navigation shortcuts"
      subtitle="Add links HotMovies never wires up itself."
    >
      <ToggleRow
        title="Browse Scenes button on studio pages"
        hint='Add a "Browse {Studio} Scenes" button next to the studio name. HotMovies supports filtering clips by studio but never links to it.'
        checked={settings.studioBrowseOnStudioPage}
        onToggle={() =>
          update({
            studioBrowseOnStudioPage: !settings.studioBrowseOnStudioPage,
          })
        }
        ariaLabel="Toggle browse scenes on studio pages"
      />
      <ToggleRow
        title="Browse Scenes link on scene pages"
        hint='Append a "· Browse Scenes" link after the studio name on every clip page so you can jump to all scenes from that studio.'
        checked={settings.studioBrowseOnScenePage}
        onToggle={() =>
          update({ studioBrowseOnScenePage: !settings.studioBrowseOnScenePage })
        }
        ariaLabel="Toggle browse scenes on scene pages"
      />
    </SectionCard>
  );
}
