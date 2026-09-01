// The manifest homepage must be a static URL, so it points here; this page
// forwards the home button to whatever URL the user saved in the popup.
chrome.storage.sync
  .get({ homeUrl: "https://duckduckgo.com/" })
  .then(({ homeUrl }) => location.replace(homeUrl));
