const COOKIE_URL = "https://www.hotmovies.com/";
const COOKIE_NAME = "ageConfirmed";
const COOKIE_VALUE = "true";
const COOKIE_DOMAIN = "www.hotmovies.com";
const COOKIE_PATH = "/";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

async function ensureAgeConfirmedCookie(): Promise<void> {
  const expirationDate = Math.floor(Date.now() / 1000) + ONE_YEAR_SECONDS;
  await chrome.cookies.set({
    url: COOKIE_URL,
    name: COOKIE_NAME,
    value: COOKIE_VALUE,
    domain: COOKIE_DOMAIN,
    path: COOKIE_PATH,
    secure: true,
    httpOnly: false,
    sameSite: "lax",
    expirationDate,
  });
}

export function registerAgeGateBypass(): void {
  chrome.runtime.onInstalled.addListener(() => {
    void ensureAgeConfirmedCookie();
  });

  chrome.runtime.onStartup.addListener(() => {
    void ensureAgeConfirmedCookie();
  });

  void ensureAgeConfirmedCookie();
}
