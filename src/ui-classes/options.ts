export const POPPINS_STYLE = { fontFamily: "Poppins" } as const;

const INHERIT_FONT = "font-[inherit]";

export const optionsClasses = {
  page: "min-h-screen w-full bg-neutral-100 text-neutral-900 antialiased",
  shell: "mx-auto w-full max-w-6xl px-6 py-8 flex flex-col gap-6",
  banner:
    "rounded-2xl bg-neutral-900 text-white px-6 py-5 flex items-baseline gap-3",
  bannerTitle: "text-xl font-bold tracking-tight",
  bannerSubtitle: "text-sm font-medium text-neutral-400",
  grid: "grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch",
  gridFull: "lg:col-span-2",
} as const;

export const cardClasses = {
  root: "h-full rounded-2xl bg-white ring-1 ring-neutral-200 px-5 py-4 flex flex-col",
  header: "flex flex-col pb-3 border-b border-neutral-200",
  title: "text-[15px] font-semibold text-neutral-900 leading-tight",
  subtitle: "text-[12px] font-medium text-neutral-500 mt-1",
  body: "flex flex-col divide-y divide-neutral-100",
} as const;

export const rowClasses = {
  root: "flex items-start justify-between gap-4 py-3 first:pt-3 last:pb-1",
  rootIndented: "pl-4 border-l-2 border-neutral-200 ml-1",
  label: "flex flex-col min-w-0",
  title: "text-[13px] font-semibold text-neutral-900 leading-snug",
  hint: "text-[12px] font-normal text-neutral-500 leading-relaxed mt-0.5",
} as const;

export function switchTrack(on: boolean): string {
  const base = `${INHERIT_FONT} relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white`;
  const color = on ? "bg-neutral-900" : "bg-neutral-300";
  return `${base} ${color}`;
}

export function switchKnob(on: boolean): string {
  const base =
    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-150 mt-0.5";
  const pos = on ? "translate-x-[18px]" : "translate-x-0.5";
  return `${base} ${pos}`;
}

export const buttonClasses = {
  primary: `${INHERIT_FONT} inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors`,
  secondary: `${INHERIT_FONT} inline-flex items-center justify-center rounded-lg bg-white ring-1 ring-neutral-300 px-4 py-2 text-[13px] font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors`,
  danger: `${INHERIT_FONT} inline-flex items-center justify-center rounded-lg bg-white ring-1 ring-red-300 px-3 py-1.5 text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors`,
  link: "text-[12px] font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-700",
} as const;

export const inputClasses = {
  root: `${INHERIT_FONT} w-full rounded-lg bg-white ring-1 ring-neutral-300 px-3 py-2 text-[13px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900`,
  label: "text-[12px] font-semibold text-neutral-700 mb-1",
} as const;

export const noticeClasses = {
  info: "rounded-lg bg-neutral-50 ring-1 ring-neutral-200 px-3 py-2 text-[12px] font-medium text-neutral-700",
  success:
    "rounded-lg bg-neutral-50 ring-1 ring-neutral-200 px-3 py-2 text-[12px] font-medium text-neutral-900",
  error:
    "rounded-lg bg-red-50 ring-1 ring-red-200 px-3 py-2 text-[12px] font-medium text-red-800",
} as const;

export const listClasses = {
  empty: "text-[12px] font-medium text-neutral-500 py-3",
  row: "flex items-center gap-3 py-2 border-b border-neutral-100 last:border-b-0",
  title: "min-w-0 flex-1 text-[13px] font-semibold text-neutral-900 truncate",
  meta: "shrink-0 whitespace-nowrap text-[11px] font-medium text-neutral-500 tabular-nums",
  link: "min-w-0 flex-1 text-[13px] font-semibold text-neutral-900 hover:underline truncate",
  count: "text-[12px] font-semibold text-neutral-500",
} as const;
