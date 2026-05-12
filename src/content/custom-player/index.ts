import contentStyles from "../../content-styles.css?inline";
import { setCustomPlayerDomRefs } from "../custom-player-mount-state";
import { CUSTOM_PLAYER_HOST_ID } from "../dom-markers";
import { findPlayerIframe } from "../player-iframe";
import { createPlayerController, type PlayerController } from "./controller";

export { getCustomPlayerHostElement, getCustomPlayerIframeRef, isCustomPlayerMounted } from "../custom-player-mount-state";

type Mounted = {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  controller: PlayerController;
  iframe: HTMLIFrameElement;
  parent: HTMLElement;
  nextSibling: Node | null;
};

let mounted: Mounted | null = null;

export function showCustomPlayer(): void {
  if (mounted) return;
  const iframe = findPlayerIframe();
  if (!iframe) return;
  const parent = iframe.parentElement;
  if (!parent) return;
  const nextSibling = iframe.nextSibling;

  const host = document.createElement("div");
  host.id = CUSTOM_PLAYER_HOST_ID;
  host.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = contentStyles;
  shadow.appendChild(style);

  const controller = createPlayerController();
  shadow.appendChild(controller.element);

  parent.replaceChild(host, iframe);

  mounted = {
    host,
    shadow,
    controller,
    iframe,
    parent,
    nextSibling,
  };
  setCustomPlayerDomRefs({ host, iframe });

  void controller.start(iframe);
}

export function hideCustomPlayer(): void {
  if (!mounted) return;
  const { host, controller, iframe, parent, nextSibling } = mounted;
  mounted = null;
  setCustomPlayerDomRefs(null);
  controller.destroy();
  host.remove();
  if (parent.isConnected) {
    if (nextSibling && nextSibling.parentNode === parent) {
      parent.insertBefore(iframe, nextSibling);
    } else {
      parent.appendChild(iframe);
    }
  }
}
