const PLAYER_IFRAME_SELECTOR = 'iframe[src*="adultempire.com/gw/player"]';

export function findPlayerIframe(): HTMLIFrameElement | null {
  return document.querySelector<HTMLIFrameElement>(PLAYER_IFRAME_SELECTOR);
}
