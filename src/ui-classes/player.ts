export const playerClasses = {
  root: "absolute inset-0 flex bg-black text-[#eaeaea] overflow-hidden font-sans select-none text-[14px] [-webkit-tap-highlight-color:transparent]",
  video: "absolute inset-0 h-full w-full bg-black object-contain",
  loadingPrepChip:
    "mb-1 hidden w-full shrink-0 items-center justify-center gap-2.5 rounded-md bg-black/[0.48] px-3 py-1.5 ring-1 ring-white/[0.1] backdrop-blur-sm data-[show=true]:flex",
  loadingPrepSpinner:
    "h-[18px] w-[18px] shrink-0 rounded-full border-2 border-white/22 border-t-[#e02020] animate-spin",
  loadingPrepText:
    "text-center text-[13px] font-medium leading-snug tracking-tight text-white/[0.9]",
  error:
    "absolute inset-0 z-[60] flex items-center justify-center bg-black/90 px-4 text-center text-[13px] font-medium text-[#ff6b6b]",
  centerHit: "absolute inset-0 z-10",
  bigPlay:
    "absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#2a2a2a] opacity-0 shadow-md ring-1 ring-white/15 transition-opacity data-[show=true]:opacity-100",
  bigPlayIcon: "h-9 w-9 fill-white",
  bottomBar:
    "absolute bottom-0 left-0 right-0 z-30 flex max-h-[42%] min-h-0 flex-col bg-gradient-to-t from-black/88 via-black/55 to-transparent px-2.5 pb-[env(safe-area-inset-bottom,4px)] pt-1.5",
  seekRow: "mb-1 flex flex-col",
  seekTrack:
    "relative h-1.5 w-full cursor-pointer bg-white/22 ring-offset-0 transition-[height] data-[waiting=true]:shadow-[inset_0_0_0_1px_rgba(224,32,32,0.55)] hover:h-2",
  seekBuffered: "pointer-events-none absolute inset-y-0 left-0 bg-white/15",
  seekProgress: "pointer-events-none absolute inset-y-0 left-0 bg-[#e02020]",
  seekHover:
    "pointer-events-none absolute bottom-full mb-1 -translate-x-1/2 rounded bg-[#1f1f1f] px-2 py-1 text-[11px] font-semibold tabular-nums text-white/90 opacity-0 ring-1 ring-white/12 data-[show=true]:opacity-100",
  controlsRow: "flex min-h-[44px] items-center gap-1",
  iconBtn:
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white/88 hover:bg-white/10 hover:text-white",
  icon: "h-[22px] w-[22px] fill-current",
  time: "shrink-0 tabular-nums text-[13px] font-semibold text-white/78",
  timeSep: "shrink-0 px-0.5 text-[13px] text-white/35",
  telemetryRow:
    "ml-1.5 flex min-w-0 max-w-[min(48vw,18rem)] flex-1 items-center gap-x-2 overflow-hidden whitespace-nowrap text-[12px] tabular-nums text-white/48",
  telemetrySpeed: "shrink-0 text-emerald-400/85",
  telemetrySep: "shrink-0 text-white/25",
  telemetryValue: "shrink-0 text-white/55",
  volumeGroup: "group/volume flex shrink-0 items-center",
  volumeSlider:
    "h-1.5 w-0 max-w-[72px] cursor-pointer rounded-full bg-white/30 transition-[width] duration-150 group-hover/volume:w-[4.5rem] overflow-hidden",
  volumeFill: "h-full rounded-full bg-white",
  menuWrap: "relative shrink-0",
  menu:
    "absolute bottom-full right-0 z-50 mb-1.5 hidden w-[188px] rounded-md bg-[#3a3a3a]/96 py-0.5 text-[13px] shadow-lg ring-1 ring-white/12 backdrop-blur-sm data-[show=true]:block",
  menuLabel:
    "px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/38",
  menuItem:
    "flex w-full items-center justify-between gap-2 px-2.5 py-2.5 text-left font-medium text-white/85 hover:bg-black/25",
  menuItemActive: "bg-black/20 text-[#ff5a5a]",
  menuCheck: "h-4 w-4 shrink-0 fill-current text-[#ff5a5a] opacity-0 data-[show=true]:opacity-100",
} as const;
