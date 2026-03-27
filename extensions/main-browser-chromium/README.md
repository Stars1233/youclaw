# YouClaw Main Browser Bridge Extension

Load this directory as an unpacked Chromium extension during development.

Current capabilities:

1. Accept a backend URL and pairing code from the YouClaw app
2. Read the current active tab
3. Send current tab metadata to `POST /api/browser/main-bridge/extension-attach`

This is a bridge skeleton. It does not yet proxy browser actions from YouClaw back into the extension runtime.
