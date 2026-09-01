const DEFAULT_HOME = "https://duckduckgo.com/";
const input = document.getElementById("url");
const status = document.getElementById("status");

chrome.storage.sync.get({ homeUrl: DEFAULT_HOME }).then(({ homeUrl }) => {
  input.value = homeUrl;
});

document.getElementById("save").addEventListener("click", async () => {
  let url = input.value.trim() || DEFAULT_HOME;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  await chrome.storage.sync.set({ homeUrl: url });
  status.textContent = "Saved";
  setTimeout(() => (status.textContent = ""), 1500);
});
