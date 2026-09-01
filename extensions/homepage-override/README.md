# Custom Home Button

Makes the browser's homepage **user-settable**:

- **Native home button (⌂)** → opens whatever URL you've saved. The manifest
  points the homepage override at the extension's own `home.html`, which
  redirects to your saved URL — so the native button is dynamic, not
  hardcoded.
- **Toolbar icon** → opens a box with a text field and **OK** / **Cancel**.
  OK saves the URL (and opens it); Cancel closes. Default is DuckDuckGo
  until you set something.

The `key` in the manifest pins the extension ID
(`ipempehokbkpndbkmcephojgcjfjakke`) so the homepage URL in the manifest
stays valid on any machine.

## Install (unpacked)

1. Open `chrome://extensions` (works in Comet)
2. Enable **Developer mode**, remove any older version
3. **Load unpacked** → select this folder
4. If prompted about the changed homepage, choose **Keep changes**
5. Pin "Custom Home Button" from the puzzle-piece menu to set your URL
