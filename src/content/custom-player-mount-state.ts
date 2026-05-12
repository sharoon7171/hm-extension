let host: HTMLDivElement | null = null;
let iframe: HTMLIFrameElement | null = null;

export function setCustomPlayerDomRefs(
  next: { host: HTMLDivElement; iframe: HTMLIFrameElement } | null,
): void {
  if (!next) {
    host = null;
    iframe = null;
    return;
  }
  host = next.host;
  iframe = next.iframe;
}

export function getCustomPlayerHostElement(): HTMLElement | null {
  return host;
}

export function getCustomPlayerIframeRef(): HTMLIFrameElement | null {
  return iframe;
}

export function isCustomPlayerMounted(): boolean {
  return host !== null;
}
