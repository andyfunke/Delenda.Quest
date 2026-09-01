# Custom Home Button

Makes the browser's homepage **user-settable**:

- **Native home button (⌂)** → opens whatever URL you've saved (DuckDuckGo
  until you change it).
- **Toolbar icon** → opens a box with a text field and **OK** / **Cancel**.
  OK saves the URL (and opens it); Cancel closes.

How it works: the homepage override must be a static http(s) URL in the
manifest, so it points at the sentinel `https://home-button.internal/`. A
declarativeNetRequest dynamic rule redirects any navigation to that sentinel
onto your saved URL — before DNS or any network request, so the sentinel
never loads. Saving a new URL in the popup rewrites the rule.

## Install (unpacked)

1. Open `chrome://extensions` (works in Comet)
2. Enable **Developer mode**, remove any older version
3. **Load unpacked** → select this folder
4. If prompted about the changed homepage, choose **Keep changes**
5. Pin "Custom Home Button" from the puzzle-piece menu to set your URL
