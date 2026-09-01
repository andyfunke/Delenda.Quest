const DEFAULT_HOME = "https://duckduckgo.com/";

chrome.action.onClicked.addListener(async (tab) => {
  const { homeUrl } = await chrome.storage.sync.get({ homeUrl: DEFAULT_HOME });
  if (tab && tab.id !== chrome.tabs.TAB_ID_NONE) {
    chrome.tabs.update(tab.id, { url: homeUrl });
  } else {
    chrome.tabs.create({ url: homeUrl });
  }
});
