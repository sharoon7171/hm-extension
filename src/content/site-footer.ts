const MAIN_STYLE_ID = "hotmovies-hide-footer-main-style";
const SECONDARY_STYLE_ID = "hotmovies-hide-footer-secondary-style";

const MAIN_RULES = `footer.site_footer > section.p-a-2 { display: none !important; }`;
const SECONDARY_RULES = `footer.site_footer > section.secondary { display: none !important; }`;

function injectStyle(id: string, rules: string): void {
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = rules;
  (document.head || document.documentElement).appendChild(style);
}

function removeStyle(id: string): void {
  document.getElementById(id)?.remove();
}

export function hideFooterMain(): void {
  injectStyle(MAIN_STYLE_ID, MAIN_RULES);
}

export function showFooterMain(): void {
  removeStyle(MAIN_STYLE_ID);
}

export function hideFooterSecondary(): void {
  injectStyle(SECONDARY_STYLE_ID, SECONDARY_RULES);
}

export function showFooterSecondary(): void {
  removeStyle(SECONDARY_STYLE_ID);
}
