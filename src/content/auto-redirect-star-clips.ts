import { matchStarBioPage } from "./url-patterns";

export function autoRedirectStarToClips(): boolean {
  if (!matchStarBioPage(location.href)) return false;
  const url = new URL(location.href);
  url.pathname = url.pathname.replace(/\.html$/i, "/scenes");
  location.replace(url.toString());
  return true;
}
