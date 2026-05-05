const SCENE_URL_RE = /^https?:\/\/(?:www\.)?hotmovies\.com\/adult-clips\/(\d+)\//i;

export function matchScenePage(url: string): { sceneId: string } | null {
  const match = url.match(SCENE_URL_RE);
  return match ? { sceneId: match[1] } : null;
}
