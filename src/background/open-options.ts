export function registerOpenOptions(): void {
  chrome.runtime.onInstalled.addListener(details => {
    if (details.reason !== "install" && details.reason !== "update") return;
    void chrome.runtime.openOptionsPage();
  });

  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage();
  });
}
