const STYLE_ID = "hotmovies-hide-attributes-style";
const HIDE_CLASS = "hotmovies-redundant-attributes-hidden";
const ATTRIBUTES_LABEL_RE = /^\s*Attributes\s*:/;

const STYLE_RULES = `
.${HIDE_CLASS} { display: none !important; }
`;

function findAttributesBlock(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>("div.m-b-1");
  for (const el of candidates) {
    const first = el.firstElementChild;
    if (!first || first.tagName !== "STRONG") continue;
    if (!ATTRIBUTES_LABEL_RE.test(first.textContent || "")) continue;
    return el;
  }
  return null;
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE_RULES;
  document.head.appendChild(style);
}

export function hideRedundantAttributes(): void {
  const block = findAttributesBlock();
  if (!block) return;
  ensureStyle();
  block.classList.add(HIDE_CLASS);
}

export function showRedundantAttributes(): void {
  document.getElementById(STYLE_ID)?.remove();
  document
    .querySelectorAll(`.${HIDE_CLASS}`)
    .forEach(el => el.classList.remove(HIDE_CLASS));
}
