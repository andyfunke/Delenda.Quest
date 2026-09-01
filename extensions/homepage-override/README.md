# Homepage & New Tab Override

A tiny Chrome extension that decouples the homepage button from the new tab page:

- **New tab** → opens [Perplexity](https://www.perplexity.ai/)
- **Homepage button (⌂)** → opens [DuckDuckGo](https://duckduckgo.com/)

Chrome's built-in settings only let you pick a startup page; the new tab page and
homepage aren't separately configurable without an extension. This uses
`chrome_url_overrides.newtab` for the new tab redirect and
`chrome_settings_overrides.homepage` for the homepage button.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder (`extensions/homepage-override`)
4. If Chrome asks whether to keep the changed homepage/new tab, choose **Keep changes**

To show the homepage button if it's hidden: `chrome://settings/appearance` →
enable **Show home button** (it should now point at DuckDuckGo).

## Notes

- Only one extension can override the new tab page or homepage at a time; if
  another extension does, disable it first.
- Works in Chromium-based browsers (Chrome, Edge, Brave). Edge/Brave may label
  the settings-override prompt slightly differently.
