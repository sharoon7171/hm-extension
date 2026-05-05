export const optionsClasses = {
  page: "min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-6 py-10 font-sans",
  card: "w-full max-w-xl bg-zinc-900 rounded-2xl ring-1 ring-zinc-800 p-6 shadow-xl",
  title: "text-2xl font-semibold tracking-tight",
  description: "mt-2 text-sm text-zinc-400 leading-relaxed",
  row: "mt-6 flex items-center justify-between gap-4",
  label: "flex flex-col text-sm",
  labelTitle: "font-medium text-zinc-100",
  labelHint: "text-zinc-400 text-xs mt-0.5",
} as const;

export function switchTrack(on: boolean): string {
  const base =
    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500";
  return `${base} ${on ? "bg-emerald-500" : "bg-zinc-700"}`;
}

export function switchKnob(on: boolean): string {
  const base =
    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition mt-0.5";
  return `${base} ${on ? "translate-x-5" : "translate-x-0.5"}`;
}
