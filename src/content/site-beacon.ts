const STYLE_ID = "hotmovies-hide-site-beacon-style";
const STYLE_RULES = `.site-beacon { display: none !important; }`;

export function hideSiteBeacon(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE_RULES;
  (document.head || document.documentElement).appendChild(style);
}

export function showSiteBeacon(): void {
  document.getElementById(STYLE_ID)?.remove();
}
