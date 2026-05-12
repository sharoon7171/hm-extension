import type { Level } from "hls.js";
import { playerClasses as cls } from "../../ui-classes/player";
import { buildIcon } from "./icons";

type Entry = { index: number; label: string };

export type QualityMenu = {
  render: (levels: Level[], pinnedIndex: number) => void;
  toggle: () => void;
  close: () => void;
  isOpen: () => boolean;
};

export function createQualityMenu(
  panel: HTMLDivElement,
  onPick: (height: number) => void,
): QualityMenu {
  let open = false;

  const setOpen = (value: boolean): void => {
    open = value;
    panel.dataset.show = String(open);
  };

  const render = (levels: Level[], pinnedIndex: number): void => {
    panel.replaceChildren();
    const heading = document.createElement("div");
    heading.className = cls.menuLabel;
    heading.textContent = "Quality";
    panel.appendChild(heading);

    const sorted = [...levels.entries()].sort(
      ([, a], [, b]) => (a.height || 0) - (b.height || 0),
    );

    const entries: Entry[] = sorted.map(([idx, level]) => ({
      index: idx,
      label: labelFor(level),
    }));

    for (const entry of entries) {
      panel.appendChild(buildItem(entry, pinnedIndex, levels, onPick, setOpen));
    }
  };

  return {
    render,
    toggle: () => setOpen(!open),
    close: () => setOpen(false),
    isOpen: () => open,
  };
}

export function clampLevelIndex(levels: Level[], index: number): number {
  if (levels.length === 0) return 0;
  return Math.max(0, Math.min(index, levels.length - 1));
}

export function findLevelIndexByHeight(
  levels: Level[],
  targetHeight: number,
): number {
  let exactMatch = -1;
  let bestBelow = -1;
  for (let i = 0; i < levels.length; i += 1) {
    const hRaw = levels[i].height;
    const h = hRaw ?? 0;
    if (h === targetHeight) exactMatch = i;
    if (h <= targetHeight && hRaw != null && hRaw > 0) {
      if (bestBelow < 0 || h > (levels[bestBelow]?.height ?? 0)) {
        bestBelow = i;
      }
    }
  }
  if (exactMatch >= 0) return exactMatch;
  if (bestBelow >= 0) return bestBelow;
  return findHighestLevelIndex(levels);
}

export function findHighestLevelIndex(levels: Level[]): number {
  let best = 0;
  let maxH = -1;
  let maxBitrate = -1;
  for (let i = 0; i < levels.length; i += 1) {
    const h = levels[i].height ?? 0;
    const bw = levels[i].bitrate;
    if (h > maxH || (h === maxH && bw > maxBitrate)) {
      maxH = h;
      maxBitrate = bw;
      best = i;
    }
  }
  return best;
}

function labelFor(level: Level): string {
  const h = level.height ?? 0;
  const w = level.width ?? 0;
  if (h > 0) return w > 0 ? `${h}p · ${w}×${h}` : `${h}p`;
  return `${Math.round(level.bitrate / 1000)}k`;
}

function buildItem(
  entry: Entry,
  pinnedIndex: number,
  levels: Level[],
  onPick: (height: number) => void,
  setOpen: (open: boolean) => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = cls.menuItem;
  const active = entry.index === pinnedIndex;
  if (active) btn.classList.add(...cls.menuItemActive.split(" "));

  const labelGroup = document.createElement("span");
  labelGroup.textContent = entry.label;

  const check = buildIcon("check", cls.menuCheck);
  check.dataset.show = String(active);

  btn.appendChild(labelGroup);
  btn.appendChild(check);
  btn.addEventListener("click", event => {
    event.stopPropagation();
    const lvl = levels[entry.index];
    onPick(lvl?.height ?? levels[findHighestLevelIndex(levels)].height);
    setOpen(false);
  });
  return btn;
}
