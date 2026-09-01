# Homepage Override

A tiny Chromium extension that points the **homepage button (⌂)** at
[DuckDuckGo](https://duckduckgo.com/) while leaving the browser's native
new tab page untouched.

Built for [Comet](https://www.perplexity.ai/comet) (Perplexity's browser),
where the new tab is already Perplexity search — so only the homepage needs
overriding. Works in any Chromium-based browser (Comet, Chrome, Brave, Edge,
Vivaldi, Arc).

Chromium's built-in settings only let you pick startup pages; the homepage
button target isn't separately configurable without an extension. This uses
`chrome_settings_overrides.homepage`.

## Install (unpacked)

1. Open `chrome://extensions` (works in Comet too)
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder (`extensions/homepage-override`)
4. If the browser asks whether to keep the changed homepage, choose **Keep changes**

To show the homepage button if it's hidden: `chrome://settings/appearance` →
enable **Show home button** (it should now point at DuckDuckGo).

## Notes

- Only one extension can override the homepage at a time; if another extension
  does, disable it first.
- If you also want to override the new tab page (e.g. in a browser whose new
  tab isn't Perplexity), add a `chrome_url_overrides.newtab` entry pointing at
  a local redirect page.
