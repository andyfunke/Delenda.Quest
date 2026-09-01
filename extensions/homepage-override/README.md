# Home Button: DuckDuckGo

Adds a **toolbar home button** that opens a URL of your choice — DuckDuckGo by
default. Built because Comet (and most Chromium forks) ignore the standard
`chrome_settings_overrides.homepage` manifest key and pin their native home
button to their own page.

- Click the extension's toolbar icon → current tab goes to DuckDuckGo
- Keyboard shortcut: **Alt+Home** (changeable at `chrome://extensions/shortcuts`)
- Right-click the icon → **Options** to change the target URL
- The standard homepage override is still declared, so in browsers that honor
  it (plain Chrome), the native ⌂ button also points at DuckDuckGo

## Install (unpacked)

1. Open `chrome://extensions` (works in Comet)
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder
4. Click the puzzle-piece icon in the toolbar and **pin** "Home Button:
   DuckDuckGo" so its button is always visible
