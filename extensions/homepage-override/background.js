// The manifest homepage must be a static http(s) URL, so it points at a
// sentinel host that never resolves; this dynamic rule redirects any
// navigation to it (before DNS/network) onto the user's saved URL.
const DEFAULT_HOME = "https://duckduckgo.com/";

async function applyRule() {
  const { homeUrl } = await chrome.storage.sync.get({ homeUrl: DEFAULT_HOME });
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: { type: "redirect", redirect: { url: homeUrl } },
        condition: {
          urlFilter: "||home-button.internal",
          resourceTypes: ["main_frame"]
        }
      }
    ]
  });
}

chrome.runtime.onInstalled.addListener(applyRule);
chrome.runtime.onStartup.addListener(applyRule);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.homeUrl) applyRule();
});
