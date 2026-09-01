const DEFAULT_HOME = "https://duckduckgo.com/";
const input = document.getElementById("url");

chrome.storage.sync.get({ homeUrl: DEFAULT_HOME }).then(({ homeUrl }) => {
  input.value = homeUrl;
  input.select();
});

async function go() {
  let url = input.value.trim() || DEFAULT_HOME;
  if (!/^[a-z]+:\/\//i.test(url)) url = "https://" + url;
  await chrome.storage.sync.set({ homeUrl: url });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id !== chrome.tabs.TAB_ID_NONE) {
    chrome.tabs.update(tab.id, { url });
  } else {
    chrome.tabs.create({ url });
  }
  window.close();
}

document.getElementById("ok").addEventListener("click", go);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") go();
});
document.getElementById("cancel").addEventListener("click", () => window.close());
