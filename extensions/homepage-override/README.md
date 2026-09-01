# Custom Home Button

A toolbar home button whose target URL is fully user-settable. Clicking the
button opens a small box with a text field (prefilled with your saved home
URL) and **OK** / **Cancel**:

- **OK** (or Enter) saves the URL and opens it in the current tab
- **Cancel** closes the box without doing anything

The URL persists (synced browser storage), so next click it's already set —
just hit Enter. Default is DuckDuckGo until you change it. **Alt+Home** opens
the same box (changeable at `chrome://extensions/shortcuts`).

Built for Comet and other Chromium forks that ignore the standard
`chrome_settings_overrides.homepage` manifest key; that key is still declared
for browsers (plain Chrome) that honor it on the native ⌂ button.

## Install (unpacked)

1. Open `chrome://extensions` (works in Comet)
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder (remove any older version first)
4. Click the puzzle-piece icon in the toolbar and **pin** "Custom Home Button"
