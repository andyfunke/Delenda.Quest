#!/usr/bin/env bash
set -euo pipefail

BUNDLE="$(mktemp /tmp/delenda-game-rules.XXXXXX.mjs)"
trap 'rm -f "$BUNDLE"' EXIT

node_modules/.bin/esbuild app/game.ts --bundle --platform=node --format=esm --outfile="$BUNDLE" >/dev/null
DELENDA_GAME_BUNDLE="file://$BUNDLE" node --test tests/campaign-substrate.test.mjs
