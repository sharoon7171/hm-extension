const STYLE_ID = "hotmovies-hide-star-bio-style";
const STYLE_RULES = `.star__profile__bio { display: none !important; }`;

export function hideStarBio(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE_RULES;
  (document.head || document.documentElement).appendChild(style);
}

export function showStarBio(): void {
  document.getElementById(STYLE_ID)?.remove();
}
