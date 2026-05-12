const NS = "http://www.w3.org/2000/svg";

type IconBuilder = (svg: SVGSVGElement) => void;

const ICONS: Record<string, IconBuilder> = {
  play: svg => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M8 5v14l11-7z");
    svg.appendChild(p);
  },
  pause: svg => {
    const a = document.createElementNS(NS, "path");
    a.setAttribute("d", "M6 5h4v14H6zM14 5h4v14h-4z");
    svg.appendChild(a);
  },
  volumeFull: svg => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute(
      "d",
      "M3 10v4h4l5 4V6L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 4v2.06A7 7 0 0 1 19 12a7 7 0 0 1-5 6.94V21a9 9 0 0 0 0-17z",
    );
    svg.appendChild(p);
  },
  volumeMid: svg => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute(
      "d",
      "M3 10v4h4l5 4V6L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z",
    );
    svg.appendChild(p);
  },
  volumeMute: svg => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute(
      "d",
      "M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45A4.5 4.5 0 0 0 16.5 12zM19 12c0 .94-.2 1.82-.54 2.64l1.52 1.52A8.96 8.96 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.51-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73 12 10.73 4.27 3zM12 4 9.91 6.09 12 8.18V4z",
    );
    svg.appendChild(p);
  },
  fullscreen: svg => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z");
    svg.appendChild(p);
  },
  fullscreenExit: svg => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z");
    svg.appendChild(p);
  },
  settings: svg => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute(
      "d",
      "M19.43 12.98c.04-.32.07-.65.07-.98 0-.33-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.5.5 0 0 0 13 2h-4a.5.5 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.58-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98L1.46 14.63a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.69.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65a7.3 7.3 0 0 0 1.69-.98l2.49 1c.26.12.55.02.69-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z",
    );
    svg.appendChild(p);
  },
  check: svg => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M9 16.17 4.83 12l-1.42 1.41L9 19l12-12-1.41-1.41z");
    svg.appendChild(p);
  },
  skipBackward: svg => {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("transform", "translate(24 0) scale(-1 1)");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z");
    g.appendChild(p);
    svg.appendChild(g);
  },
  skipForward: svg => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z");
    svg.appendChild(p);
  },
};

export function buildIcon(name: keyof typeof ICONS, className?: string): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);
  ICONS[name](svg);
  return svg;
}
