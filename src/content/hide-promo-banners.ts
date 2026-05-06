const STYLE_ID = "hotmovies-hide-promo-banners-style";

const STYLE_RULES = `
.site-beacon,
a[label*="CTA" i],
.col-sm-6:has(> a[label*="CTA" i]),
.col-xs-6:has(> a[label*="CTA" i]),
.col-md-6:has(> a[label*="CTA" i]),
.m-b-1:has(> a[label*="CTA" i]),
.row.m-b-1:has(> div > a[label*="CTA" i]),
section:has(> div > a[label="Primary CTA"]),
section:has(> h2 > a[label="CTA Towers Title"]),
a:has(> picture source[srcset*="adultempire.com/bn/"]),
.movie-page__heading__title__sale-indicator,
.clip__title > .badge {
  display: none !important;
}
`;

export function hidePromoBanners(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE_RULES;
  (document.head || document.documentElement).appendChild(style);
}

export function showPromoBanners(): void {
  document.getElementById(STYLE_ID)?.remove();
}
