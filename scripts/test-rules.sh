#!/usr/bin/env bash
set -euo pipefail

BUNDLE="$(mktemp /tmp/delenda-game-rules.XXXXXX.mjs)"
CONVERGENCE_BUNDLE="$(mktemp /tmp/delenda-convergence.XXXXXX.mjs)"
trap 'rm -f "$BUNDLE" "$CONVERGENCE_BUNDLE"' EXIT

node_modules/.bin/esbuild app/game.ts --bundle --platform=node --format=esm --outfile="$BUNDLE" >/dev/null
node_modules/.bin/esbuild app/convergence.ts --bundle --platform=node --format=esm --outfile="$CONVERGENCE_BUNDLE" >/dev/null
DELENDA_GAME_BUNDLE="file://$BUNDLE" node --test tests/campaign-substrate.test.mjs
DELENDA_CONVERGENCE_BUNDLE="file://$CONVERGENCE_BUNDLE" node --test tests/convergence.test.mjs
