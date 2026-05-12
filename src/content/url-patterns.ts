const SCENE_URL_RE =
  /^https?:\/\/(?:www\.)?hotmovies\.com\/adult-clips\/(\d+)(?:[/?#]|$)/i;

const PORN_VIDEO_URL_RE =
  /^https?:\/\/(?:www\.)?hotmovies\.com\/(\d+)\/[^\s]+\-porn-video\.html(?:[?#]|$)/i;

const STUDIO_URL_RE =
  /^https?:\/\/(?:www\.)?hotmovies\.com\/studios\/(\d+)(?:[/?#]|$)/i;

const STAR_URL_RE =
  /^https?:\/\/(?:www\.)?hotmovies\.com\/(\d+)\/[^/]+-pornstar(?:\.html|\/[^/]+)(?:[?#]|$)/i;

const STAR_BIO_URL_RE =
  /^https?:\/\/(?:www\.)?hotmovies\.com\/(\d+)\/[^/]+-pornstar\.html(?:[?#]|$)/i;

export function matchScenePage(url: string): { sceneId: string } | null {
  const clip = url.match(SCENE_URL_RE);
  if (clip) return { sceneId: clip[1] };
  const movie = url.match(PORN_VIDEO_URL_RE);
  if (movie) return { sceneId: movie[1] };
  return null;
}

export function matchStudioPage(url: string): { studioId: string } | null {
  const match = url.match(STUDIO_URL_RE);
  return match ? { studioId: match[1] } : null;
}

export function matchStarPage(url: string): { starId: string } | null {
  const match = url.match(STAR_URL_RE);
  return match ? { starId: match[1] } : null;
}

export function matchStarBioPage(url: string): { starId: string } | null {
  const match = url.match(STAR_BIO_URL_RE);
  return match ? { starId: match[1] } : null;
}
