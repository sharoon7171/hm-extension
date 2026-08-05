export const playerClasses = {
  root: "absolute inset-0 overflow-hidden bg-black text-[#eaeaea] font-sans select-none text-[14px] [-webkit-tap-highlight-color:transparent]",
  stage: "absolute inset-0",
  video: "absolute inset-0 h-full w-full object-contain",
  loadingPrepChip:
    "pointer-events-none absolute left-1/2 top-1/2 z-30 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-md bg-black/70 px-3 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.65)] ring-1 ring-white/20 backdrop-blur-sm data-[show=true]:flex",
  loadingPrepSpinner:
    "h-[18px] w-[18px] shrink-0 rounded-full border-2 border-white/22 border-t-[#e02020] animate-spin",
  loadingPrepText:
    "text-[13px] font-semibold leading-snug tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
  error:
    "absolute inset-0 z-[60] flex items-center justify-center bg-black/90 px-4 text-center text-[13px] font-medium text-[#ff6b6b]",
  centerHit: "absolute inset-0 z-10",
  bigPlay:
    "absolute left-1/2 top-1/2 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/55 opacity-0 shadow-[0_2px_12px_rgba(0,0,0,0.65)] ring-1 ring-white/25 backdrop-blur-sm transition-opacity data-[show=true]:opacity-100",
  bigPlayIcon: "h-8 w-8 fill-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]",
  chrome:
    "pointer-events-auto absolute bottom-0 left-0 right-0 z-40 flex flex-col gap-1 bg-gradient-to-t from-black/88 via-black/55 to-transparent px-2.5 pb-[max(6px,env(safe-area-inset-bottom))] pt-8",
  seekRow: "flex flex-col px-0.5",
  seekTrack:
    "relative h-1.5 w-full cursor-pointer rounded-full bg-black/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_1px_4px_rgba(0,0,0,0.5)] ring-offset-0 transition-[height] data-[waiting=true]:shadow-[inset_0_0_0_1px_rgba(224,32,32,0.8),0_0_8px_rgba(224,32,32,0.35)] hover:h-2",
  seekBuffered: "pointer-events-none absolute inset-y-0 left-0 rounded-full bg-white/28",
  seekProgress: "pointer-events-none absolute inset-y-0 left-0 rounded-full bg-[#e02020] shadow-[0_0_6px_rgba(224,32,32,0.55)]",
  seekHover:
    "pointer-events-none absolute bottom-full mb-1.5 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.6)] ring-1 ring-white/20 backdrop-blur-sm data-[show=true]:opacity-100",
  controlsRow: "flex min-h-[36px] w-full items-center gap-1.5",
  controlsLeft: "flex shrink-0 items-center gap-0.5",
  controlsRight: "ml-auto flex shrink-0 items-center gap-0.5",
  iconBtn:
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-black/45 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.55)] backdrop-blur-[2px] hover:bg-black/65 hover:text-white",
  icon: "h-[18px] w-[18px] fill-current drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
  time: "shrink-0 tabular-nums text-[12px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
  timeSep: "shrink-0 px-0.5 text-[12px] font-bold text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
  telemetryRow:
    "flex min-w-0 flex-1 items-center justify-center gap-x-1.5 overflow-hidden whitespace-nowrap rounded-md bg-black/35 px-2 py-0.5 text-[10px] tabular-nums text-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_1px_4px_rgba(0,0,0,0.45)] backdrop-blur-[2px]",
  telemetrySpeed: "shrink-0 font-semibold text-emerald-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
  telemetrySep: "shrink-0 text-white/40",
  telemetryValue: "shrink-0 font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
  volumeGroup: "group/volume flex shrink-0 flex-row-reverse items-center",
  volumeSlider:
    "h-1.5 w-0 max-w-[72px] cursor-pointer overflow-hidden rounded-full bg-black/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] transition-[width] duration-150 group-hover/volume:w-[4.5rem]",
  volumeFill: "h-full rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.45)]",
  menuWrap: "relative shrink-0",
  menu:
    "absolute bottom-full right-0 z-50 mb-1.5 hidden w-[188px] rounded-md bg-[#1a1a1a]/97 py-0.5 text-[13px] shadow-[0_4px_20px_rgba(0,0,0,0.7)] ring-1 ring-white/18 backdrop-blur-md data-[show=true]:block",
  menuLabel:
    "px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45",
  menuItem:
    "flex w-full items-center justify-between gap-2 px-2.5 py-2.5 text-left font-medium text-white/90 hover:bg-white/10",
  menuItemActive: "bg-white/10 text-[#ff6b6b]",
  menuCheck: "h-4 w-4 shrink-0 fill-current text-[#ff6b6b] opacity-0 data-[show=true]:opacity-100",
} as const;
