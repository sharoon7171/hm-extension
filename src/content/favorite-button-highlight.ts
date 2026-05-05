const STYLE_ID = "hotmovies-favorite-button-highlight-style";
const STYLE_RULES = `
a[data-ta="favorite"] i {
  display: inline-block;
  transition: color 0.15s ease, transform 0.15s ease;
  transform-origin: center;
}
a[data-ta="favorite"]:not(.active) i.fa-heart-o {
  color: #94a3b8 !important;
  opacity: 0.85;
}
a[data-ta="favorite"]:not(.active):hover i.fa-heart-o {
  color: #e11d48 !important;
  opacity: 1;
}
a[data-ta="favorite"].active i.fa-heart {
  color: #e11d48 !important;
  transform: scale(1.2);
  filter: drop-shadow(0 0 1.5px rgba(225, 29, 72, 0.55));
}
`;

export function showFavoriteButtonHighlight(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE_RULES;
  (document.head || document.documentElement).appendChild(style);
}

export function hideFavoriteButtonHighlight(): void {
  document.getElementById(STYLE_ID)?.remove();
}
